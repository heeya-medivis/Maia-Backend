ALTER TABLE "users" RENAME COLUMN "last_login_date_time" TO "last_login_web";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_app" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_confirmed";