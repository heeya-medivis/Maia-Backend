ALTER TABLE "maia_deep_analysis" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "maia_deep_analysis" CASCADE;--> statement-breakpoint
ALTER TABLE "maia_chat_turns" RENAME TO "maia_session_turns";--> statement-breakpoint
ALTER TABLE "maia_chat_sessions" RENAME TO "maia_sessions";--> statement-breakpoint
ALTER TABLE "maia_sessions" DROP CONSTRAINT "maia_chat_sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "maia_session_turns" DROP CONSTRAINT "maia_chat_turns_session_id_maia_chat_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "maia_sessions" ADD COLUMN "total_input_text_cached_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_sessions" ADD COLUMN "total_input_image_cached_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_sessions" ADD COLUMN "total_input_audio_cached_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_sessions" ADD COLUMN "total_output_image_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_sessions" ADD COLUMN "total_output_reasoning_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_session_turns" ADD COLUMN "input_text_cached_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_session_turns" ADD COLUMN "input_image_cached_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_session_turns" ADD COLUMN "input_audio_cached_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_session_turns" ADD COLUMN "output_image_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_session_turns" ADD COLUMN "output_reasoning_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "maia_sessions" ADD CONSTRAINT "maia_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_session_turns" ADD CONSTRAINT "maia_session_turns_session_id_maia_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."maia_sessions"("id") ON DELETE cascade ON UPDATE no action;