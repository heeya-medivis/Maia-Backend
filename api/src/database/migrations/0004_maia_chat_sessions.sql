CREATE TABLE "maia_chat_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_session_id" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_input_text_tokens" integer DEFAULT 0 NOT NULL,
	"total_input_image_tokens" integer DEFAULT 0 NOT NULL,
	"total_input_audio_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_text_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_audio_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "maia_chat_turns" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"request_time" timestamp with time zone NOT NULL,
	"response_time" timestamp with time zone NOT NULL,
	"input_text_tokens" integer DEFAULT 0 NOT NULL,
	"input_image_tokens" integer DEFAULT 0 NOT NULL,
	"input_audio_tokens" integer DEFAULT 0 NOT NULL,
	"output_text_tokens" integer DEFAULT 0 NOT NULL,
	"output_audio_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maia_chat_sessions" ADD CONSTRAINT "maia_chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "maia_chat_turns" ADD CONSTRAINT "maia_chat_turns_session_id_maia_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."maia_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;
