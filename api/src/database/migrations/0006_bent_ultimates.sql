CREATE TABLE "maia_deep_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_request_id" text,
	"request_time" timestamp with time zone NOT NULL,
	"response_time" timestamp with time zone,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"reasoning_tokens" integer DEFAULT 0 NOT NULL,
	"system_message" text,
	"analysis_message" text,
	"analysis_response" text,
	"thought_process" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maia_deep_analysis_images" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"image_url" text NOT NULL,
	"mime_type" text DEFAULT 'image/jpeg' NOT NULL,
	"short_description" text,
	"detailed_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maia_deep_analysis" ADD CONSTRAINT "maia_deep_analysis_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_deep_analysis_images" ADD CONSTRAINT "maia_deep_analysis_images_analysis_id_maia_deep_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."maia_deep_analysis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_chat_turns" DROP COLUMN "turn_type";