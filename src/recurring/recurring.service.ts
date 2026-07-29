import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { config } from '../config';
import { DRIZZLE, type Database } from '../db/drizzle.module';
import { tasks } from '../db/schema';

// Offset (in minutes) of `tz` relative to UTC at `date`.
function timezoneOffsetMinutes(tz: string, date: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60_000;
}

// The instant of local midnight (start of the calendar day containing
// `date`, in `tz`).
function startOfDayInTz(tz: string, date: Date): Date {
  const offsetMin = timezoneOffsetMinutes(tz, date);
  const local = new Date(date.getTime() + offsetMin * 60_000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offsetMin * 60_000);
}

// The instant of local Monday 00:00 of the week containing `date`, in `tz`.
function startOfWeekInTz(tz: string, date: Date): Date {
  const offsetMin = timezoneOffsetMinutes(tz, date);
  const local = new Date(date.getTime() + offsetMin * 60_000);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0, ...
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - daysSinceMonday);
  return new Date(local.getTime() - offsetMin * 60_000);
}

export interface RecurringResetResult {
  dailyReset: number;
  weeklyReset: number;
}

// Unconditional schedule-based reset for recurring tasks (see
// TODO_bot/src/db/schema.ts and this repo's db/schema.ts for the
// recurrence/lastResetAt columns): isDone flips back to false at each cycle
// boundary regardless of its current value, independently of the regular
// reminders broadcast (reminders.service.ts only ever looks at
// recurrence='none' tasks — recurring tasks are a fully separate concept,
// checked by the user themselves via /list).
@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async resetDue(): Promise<RecurringResetResult> {
    const now = new Date();
    const startOfToday = startOfDayInTz(config.timezone, now);
    const startOfWeek = startOfWeekInTz(config.timezone, now);

    const dailyReset = await this.db
      .update(tasks)
      .set({ isDone: false, lastResetAt: now })
      .where(
        and(
          eq(tasks.recurrence, 'daily'),
          or(isNull(tasks.lastResetAt), lt(tasks.lastResetAt, startOfToday)),
        ),
      )
      .returning({ id: tasks.id });

    const weeklyReset = await this.db
      .update(tasks)
      .set({ isDone: false, lastResetAt: now })
      .where(
        and(
          eq(tasks.recurrence, 'weekly'),
          or(isNull(tasks.lastResetAt), lt(tasks.lastResetAt, startOfWeek)),
        ),
      )
      .returning({ id: tasks.id });

    this.logger.log(
      `Сброс повторяющихся задач: daily=${dailyReset.length}, weekly=${weeklyReset.length}.`,
    );

    return { dailyReset: dailyReset.length, weeklyReset: weeklyReset.length };
  }
}
