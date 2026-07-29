ALTER TABLE "users" ADD COLUMN "reminder_hours" integer[] DEFAULT '{9}' NOT NULL;--> statement-breakpoint
UPDATE "users" SET "reminder_hours" = ARRAY["reminder_hour"];