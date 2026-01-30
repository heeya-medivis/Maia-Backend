-- Create enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "public"."organization_role" AS ENUM('manager', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Drop maia_deep_analysis_images if it exists
DROP TABLE IF EXISTS "maia_deep_analysis_images" CASCADE;--> statement-breakpoint

-- Alter users.role to use enum (handle existing data)
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
UPDATE "users" SET "role" = NULL WHERE "role" IS NOT NULL AND "role" NOT IN ('manager', 'member');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" TYPE "organization_role" USING "role"::"organization_role";--> statement-breakpoint

-- Drop columns from maia_deep_analysis if they exist
ALTER TABLE "maia_deep_analysis" DROP COLUMN IF EXISTS "provider_request_id";--> statement-breakpoint
ALTER TABLE "maia_deep_analysis" DROP COLUMN IF EXISTS "response_time";--> statement-breakpoint
ALTER TABLE "maia_deep_analysis" DROP COLUMN IF EXISTS "cached_tokens";--> statement-breakpoint
ALTER TABLE "maia_deep_analysis" DROP COLUMN IF EXISTS "reasoning_tokens";--> statement-breakpoint
ALTER TABLE "maia_deep_analysis" DROP COLUMN IF EXISTS "system_message";--> statement-breakpoint
ALTER TABLE "maia_deep_analysis" DROP COLUMN IF EXISTS "analysis_message";--> statement-breakpoint
ALTER TABLE "maia_deep_analysis" DROP COLUMN IF EXISTS "analysis_response";--> statement-breakpoint
ALTER TABLE "maia_deep_analysis" DROP COLUMN IF EXISTS "thought_process";