import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, eq, or } from 'drizzle-orm';
import { config } from '../config';
import { DRIZZLE, type Database } from '../db/drizzle.module';
import { tasks, type Recurrence, type Task } from '../db/schema';
import { UsersService } from '../users/users.service';

// Escape user-supplied text for parse_mode: 'HTML' (mirrors TODO_bot/src/format.ts).
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Mirrors TODO_bot/src/services/tasks.ts — same schema, same permission
// rules (owner marks done, author edits/deletes; owner-or-author toggles
// recurrence), enforced at the SQL level so a forged id cannot affect
// another user's task.
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly usersService: UsersService,
  ) {}

  async create(params: {
    text: string;
    ownerId: number;
    authorId: number;
  }): Promise<Task> {
    const [created] = await this.db
      .insert(tasks)
      .values({
        text: params.text,
        ownerId: params.ownerId,
        authorId: params.authorId,
      })
      .returning();
    return created;
  }

  // Open regular (non-recurring) tasks only — recurring tasks are a
  // separate concept, excluded from this list and from the reminders cron.
  listOpenForOwner(ownerId: number): Promise<Task[]> {
    return this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.ownerId, ownerId),
          eq(tasks.isDone, false),
          eq(tasks.recurrence, 'none'),
        ),
      )
      .orderBy(asc(tasks.createdAt));
  }

  async markDone(
    id: number,
    ownerTelegramId: number,
  ): Promise<Task | undefined> {
    const [updated] = await this.db
      .update(tasks)
      .set({ isDone: true })
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.ownerId, ownerTelegramId),
          eq(tasks.isDone, false),
        ),
      )
      .returning();

    if (updated && updated.authorId !== updated.ownerId) {
      await this.notifyAuthorOfCompletion(updated);
    }

    return updated;
  }

  // Notify the author when someone else's task is completed. A delivery
  // failure (e.g. the author blocked the bot) is logged, not thrown — it
  // must not fail the "mark done" request itself.
  private async notifyAuthorOfCompletion(task: Task): Promise<void> {
    try {
      const owner = await this.usersService.getByTelegramId(task.ownerId);
      const ownerName = owner?.name ?? 'Кто-то';
      const res = await fetch(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: task.authorId,
            text: `✅ <b>${esc(ownerName)}</b> выполнил(а) задачу:\n\n📌 ${esc(task.text)}`,
            parse_mode: 'HTML',
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`Telegram API ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      this.logger.error(
        `Не удалось уведомить автора ${task.authorId} о выполнении задачи ${task.id}: ${err}`,
      );
    }
  }

  // Set a task's recurrence. Owner or author — either role may toggle it,
  // at any time (not just at creation).
  async setRecurrence(
    id: number,
    requesterTelegramId: number,
    recurrence: Recurrence,
  ): Promise<Task | undefined> {
    const [updated] = await this.db
      .update(tasks)
      .set({ recurrence, lastResetAt: null })
      .where(
        and(
          eq(tasks.id, id),
          or(
            eq(tasks.ownerId, requesterTelegramId),
            eq(tasks.authorId, requesterTelegramId),
          ),
        ),
      )
      .returning();
    return updated;
  }

  async updateText(
    id: number,
    authorTelegramId: number,
    text: string,
  ): Promise<Task | undefined> {
    const [updated] = await this.db
      .update(tasks)
      .set({ text })
      .where(and(eq(tasks.id, id), eq(tasks.authorId, authorTelegramId)))
      .returning();
    return updated;
  }

  async delete(id: number, authorTelegramId: number): Promise<boolean> {
    const deleted = await this.db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.authorId, authorTelegramId)))
      .returning({ id: tasks.id });
    return deleted.length > 0;
  }
}
