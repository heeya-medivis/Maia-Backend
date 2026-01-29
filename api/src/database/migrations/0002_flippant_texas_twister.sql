DROP INDEX IF EXISTS "users_normalized_email_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "users_created_by_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_confirmed" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "normalized_email";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_number";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_number_confirmed";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "two_factor_enabled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "lockout_end";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "lockout_enabled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "access_failed_count";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "security_stamp";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "concurrency_stamp";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "middle_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "image_url";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_verification_email_sent_date_time";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "created_by_id";
