ALTER TABLE "tasks" ADD COLUMN "recurrence" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "last_reset_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reminder_hour" integer DEFAULT 9 NOT NULL;