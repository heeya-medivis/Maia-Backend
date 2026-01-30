-- Migration 0006: Add extra columns to maia_deep_analysis (these will be removed in 0007)
-- This migration is now a no-op since the columns are immediately removed in the next migration

-- Add columns to maia_deep_analysis if they don't exist (will be dropped in 0007)
DO $$ BEGIN
    ALTER TABLE "maia_deep_analysis" ADD COLUMN "provider_request_id" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "maia_deep_analysis" ADD COLUMN "response_time" timestamp with time zone;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "maia_deep_analysis" ADD COLUMN "cached_tokens" integer DEFAULT 0 NOT NULL;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "maia_deep_analysis" ADD COLUMN "reasoning_tokens" integer DEFAULT 0 NOT NULL;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "maia_deep_analysis" ADD COLUMN "system_message" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "maia_deep_analysis" ADD COLUMN "analysis_message" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "maia_deep_analysis" ADD COLUMN "analysis_response" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "maia_deep_analysis" ADD COLUMN "thought_process" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint

-- Create maia_deep_analysis_images table if it doesn't exist (will be dropped in next migration)
CREATE TABLE IF NOT EXISTS "maia_deep_analysis_images" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"image_url" text NOT NULL,
	"mime_type" text DEFAULT 'image/jpeg' NOT NULL,
	"short_description" text,
	"detailed_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Add foreign key constraint if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "maia_deep_analysis_images" ADD CONSTRAINT "maia_deep_analysis_images_analysis_id_maia_deep_analysis_id_fk"
    FOREIGN KEY ("analysis_id") REFERENCES "public"."maia_deep_analysis"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Drop turn_type column if it exists
ALTER TABLE "maia_chat_turns" DROP COLUMN IF EXISTS "turn_type";