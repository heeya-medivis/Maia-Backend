-- Create MAIA Deep Analysis table
CREATE TABLE IF NOT EXISTS "maia_deep_analysis" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "request_time" timestamp with time zone NOT NULL,
  "input_tokens" integer DEFAULT 0 NOT NULL,
  "output_tokens" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "maia_deep_analysis_user_id_idx" ON "maia_deep_analysis"("user_id");
CREATE INDEX IF NOT EXISTS "maia_deep_analysis_created_at_idx" ON "maia_deep_analysis"("created_at");
