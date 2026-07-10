import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/drizzle.module';
import { tasks, type Task } from '../db/schema';

// Mirrors TODO_bot/src/services/tasks.ts — same schema, same permission
// rules (owner marks done, author edits/deletes), enforced at the SQL level
// so a forged id cannot affect another user's task.
@Injectable()
export class TasksService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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

  listOpenForOwner(ownerId: number): Promise<Task[]> {
    return this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.ownerId, ownerId), eq(tasks.isDone, false)))
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
