import {
  bigint,
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// User whitelist. Only users in this table may use the bot (enforced by middleware).
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  // Telegram user id. bigint in DB, mode:'number' since Telegram ids fit the
  // safe JS number range (< 2^53).
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
  name: text('name').notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  // Hour (0–23, in config.timezone) at which the reminders cron sends this
  // user their daily reminder. Set via TODO_bot's /remindtime.
  reminderHour: integer('reminder_hour').notNull().default(9),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const recurrenceValues = ['none', 'daily', 'weekly'] as const;
export type Recurrence = (typeof recurrenceValues)[number];

// Tasks. Two roles per task:
//   - owner (ownerId)   — recipient: sees the task in their list, taps "Done".
//   - author (authorId) — creator: may edit/delete.
// For a self-assigned task ownerId === authorId.
// ownerId/authorId store telegram_id (to compare directly with ctx.from.id).
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  ownerId: bigint('owner_id', { mode: 'number' }).notNull(),
  authorId: bigint('author_id', { mode: 'number' }).notNull(),
  isDone: boolean('is_done').notNull().default(false),
  // 'none' = regular one-off task. 'daily'/'weekly' = recurring task, kept
  // out of the reminders broadcast and reset unconditionally on schedule by
  // the recurring-reset cron, regardless of its current isDone.
  recurrence: text('recurrence', { enum: recurrenceValues })
    .notNull()
    .default('none'),
  lastResetAt: timestamp('last_reset_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Types used across services.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
