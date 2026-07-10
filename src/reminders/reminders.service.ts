import { Injectable, Logger } from '@nestjs/common';
import { config } from '../config';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import type { User } from '../db/schema';

// Escape user-supplied text for parse_mode: 'HTML' (mirrors TODO_bot/src/format.ts).
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatReminder(tasks: { text: string }[]): string {
  if (tasks.length === 0) {
    return 'Все задачи выполнены 👍';
  }
  const lines = tasks
    .map((t, i) => `${i + 1}. ${esc(t.text)}`)
    .join('\n');
  return `📋 Твои невыполненные задачи (${tasks.length}):\n\n${lines}`;
}

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
}

// Reminder composition and delivery, triggered by a Vercel Cron Job
// (see reminders.controller.ts) instead of the bot's own process — this is
// the always-on piece of the architecture, so scheduling doesn't depend on
// TODO_bot's long-polling process being up.
//
// Mirrors TODO_bot/src/services/reminders.ts, but talks to the Telegram Bot
// API directly over HTTP instead of through grammY (no running bot instance
// is needed here).
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tasksService: TasksService,
  ) {}

  private async sendToUser(user: User): Promise<void> {
    const tasks = await this.tasksService.listOpenForOwner(user.telegramId);
    const text = formatReminder(tasks);

    const res = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.telegramId,
          text,
          parse_mode: 'HTML',
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Telegram API ${res.status}: ${body}`);
    }
  }

  // Broadcast to every whitelisted user. A delivery failure for one user
  // (e.g. they blocked the bot) is logged and counted in `failed`, and does
  // not stop delivery to the rest.
  async sendToAll(): Promise<BroadcastResult> {
    const users = await this.usersService.listAll();

    const results = await Promise.allSettled(
      users.map((user) => this.sendToUser(user)),
    );

    let sent = 0;
    let failed = 0;
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        this.logger.error(
          `Не удалось отправить напоминание пользователю ${users[i].telegramId} (${users[i].name}): ${result.reason}`,
        );
      }
    });

    return { total: users.length, sent, failed };
  }
}
