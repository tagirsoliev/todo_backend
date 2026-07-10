import {
  bigint,
  boolean,
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Types used across services.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
