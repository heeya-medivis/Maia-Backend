CREATE TYPE "public"."audit_action" AS ENUM('user.login', 'user.logout', 'user.created', 'user.updated', 'user.deleted', 'device.registered', 'device.revoked', 'ai.request', 'admin.action');--> statement-breakpoint
CREATE TYPE "public"."auth_protocol" AS ENUM('workos_sso', 'workos_oidc_google', 'workos_oidc_microsoft', 'workos_oidc_apple', 'workos_magic_link');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('windows', 'macos', 'linux', 'ios', 'android', 'quest', 'visionpro', 'web');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('desktop', 'xr', 'mobile', 'web');--> statement-breakpoint
CREATE TYPE "public"."identity_provider" AS ENUM('workos_sso', 'workos_oidc_google', 'workos_oidc_microsoft', 'workos_oidc_apple', 'workos_magic_link');--> statement-breakpoint
CREATE TYPE "public"."model_category" AS ENUM('balanced', 'thinking', 'live');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('invalid', 'gcloud', 'openai', 'self');--> statement-breakpoint
CREATE TYPE "public"."host_provider" AS ENUM('invalid', 'aws_ec2');--> statement-breakpoint
CREATE TYPE "public"."prompt_type" AS ENUM('invalid', 'system_prompt', 'analysis_prompt');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"action" "audit_action" NOT NULL,
	"user_id" text,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_date_time" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"user_id" text,
	"device_id" text,
	"session_id" text,
	"metadata" jsonb,
	"created_date_time" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"workos_connection_id" text,
	"protocol" "auth_protocol" NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"device_type" "device_type" DEFAULT 'desktop',
	"platform" "device_platform",
	"app_version" text,
	"os_version" text,
	"metadata" jsonb,
	"last_active_at" timestamp with time zone DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_date_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "identity_provider" NOT NULL,
	"provider_subject" text NOT NULL,
	"email" text,
	"raw_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_confirmed" boolean DEFAULT false NOT NULL,
	"normalized_email" text,
	"password_hash" text,
	"phone_number" text,
	"phone_number_confirmed" boolean DEFAULT false,
	"two_factor_enabled" boolean DEFAULT false,
	"lockout_end" timestamp with time zone,
	"lockout_enabled" boolean DEFAULT true,
	"access_failed_count" text DEFAULT '0',
	"security_stamp" text,
	"concurrency_stamp" text,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"image_url" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"last_login_date_time" timestamp with time zone,
	"last_verification_email_sent_date_time" timestamp with time zone,
	"created_by_id" text,
	"created_date_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sso_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"connection_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"organization_name" text,
	"auto_verify_email" boolean DEFAULT true NOT NULL,
	"email_pattern" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text,
	"refresh_token_hash" text NOT NULL,
	"refresh_token_family_id" text NOT NULL,
	"auth_method" "auth_protocol" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_authorization_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"client_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"code_challenge_method" text DEFAULT 'S256' NOT NULL,
	"scopes" text DEFAULT 'openid email profile' NOT NULL,
	"auth_method" "auth_protocol",
	"device_id" text,
	"device_platform" text,
	"device_app_version" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maia_models" (
	"id" text PRIMARY KEY NOT NULL,
	"model_name" text NOT NULL,
	"model_display_name" text NOT NULL,
	"model_category" "model_category" NOT NULL,
	"provider" "provider" NOT NULL,
	"model_priority" integer,
	"pricing" real DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_by_id" text,
	"created_date_time" timestamp with time zone DEFAULT now() NOT NULL,
	"modified_by_id" text,
	"modified_date_time" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_date_time" timestamp with time zone,
	"deleted_by_id" text
);
--> statement-breakpoint
CREATE TABLE "maia_hosts" (
	"id" text PRIMARY KEY NOT NULL,
	"host_provider" "host_provider" NOT NULL,
	"server_ip" text NOT NULL,
	"maia_model_id" text NOT NULL,
	"created_by_id" text,
	"created_date_time" timestamp with time zone DEFAULT now() NOT NULL,
	"modified_by_id" text,
	"modified_date_time" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_date_time" timestamp with time zone,
	"deleted_by_id" text
);
--> statement-breakpoint
CREATE TABLE "maia_prompts" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "prompt_type" NOT NULL,
	"content" text NOT NULL,
	"maia_model_id" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_by_id" text,
	"created_date_time" timestamp with time zone DEFAULT now() NOT NULL,
	"modified_by_id" text,
	"modified_date_time" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_date_time" timestamp with time zone,
	"deleted_by_id" text
);
--> statement-breakpoint
CREATE TABLE "user_maia_access" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"maia_model_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_date_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" text,
	"update_date_time" timestamp with time zone,
	CONSTRAINT "user_maia_access_user_model_unique" UNIQUE("user_id","maia_model_id")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_domains" ADD CONSTRAINT "sso_domains_connection_id_auth_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."auth_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_models" ADD CONSTRAINT "maia_models_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_models" ADD CONSTRAINT "maia_models_modified_by_id_users_id_fk" FOREIGN KEY ("modified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_models" ADD CONSTRAINT "maia_models_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_hosts" ADD CONSTRAINT "maia_hosts_maia_model_id_maia_models_id_fk" FOREIGN KEY ("maia_model_id") REFERENCES "public"."maia_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_hosts" ADD CONSTRAINT "maia_hosts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_hosts" ADD CONSTRAINT "maia_hosts_modified_by_id_users_id_fk" FOREIGN KEY ("modified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_hosts" ADD CONSTRAINT "maia_hosts_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_prompts" ADD CONSTRAINT "maia_prompts_maia_model_id_maia_models_id_fk" FOREIGN KEY ("maia_model_id") REFERENCES "public"."maia_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_prompts" ADD CONSTRAINT "maia_prompts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_prompts" ADD CONSTRAINT "maia_prompts_modified_by_id_users_id_fk" FOREIGN KEY ("modified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maia_prompts" ADD CONSTRAINT "maia_prompts_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_maia_access" ADD CONSTRAINT "user_maia_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_maia_access" ADD CONSTRAINT "user_maia_access_maia_model_id_maia_models_id_fk" FOREIGN KEY ("maia_model_id") REFERENCES "public"."maia_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_maia_access" ADD CONSTRAINT "user_maia_access_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_maia_access" ADD CONSTRAINT "user_maia_access_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_date_time");--> statement-breakpoint
CREATE INDEX "usage_events_type_idx" ON "usage_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "usage_events_user_idx" ON "usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_events_created_idx" ON "usage_events" USING btree ("created_date_time");--> statement-breakpoint
CREATE INDEX "auth_connections_workos_conn_idx" ON "auth_connections" USING btree ("workos_connection_id");--> statement-breakpoint
CREATE INDEX "auth_connections_protocol_idx" ON "auth_connections" USING btree ("protocol");--> statement-breakpoint
CREATE INDEX "devices_user_idx" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "devices_active_idx" ON "devices" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "identities_user_id_idx" ON "identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identities_provider_subject_uniq" ON "identities" USING btree ("provider","provider_subject");--> statement-breakpoint
CREATE INDEX "identities_email_idx" ON "identities" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_normalized_email_idx" ON "users" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "users_created_by_idx" ON "users" USING btree ("created_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sso_domains_domain_unique_idx" ON "sso_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "sso_domains_connection_idx" ON "sso_domains" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "sso_domains_enabled_idx" ON "sso_domains" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_device_idx" ON "sessions" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "sessions_refresh_token_hash_idx" ON "sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_family_id_idx" ON "sessions" USING btree ("refresh_token_family_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oauth_codes_user_idx" ON "oauth_authorization_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_codes_expires_idx" ON "oauth_authorization_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "maia_models_provider_idx" ON "maia_models" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "maia_models_category_idx" ON "maia_models" USING btree ("model_category");--> statement-breakpoint
CREATE INDEX "maia_models_active_idx" ON "maia_models" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "maia_models_priority_idx" ON "maia_models" USING btree ("model_priority");--> statement-breakpoint
CREATE INDEX "maia_hosts_provider_idx" ON "maia_hosts" USING btree ("host_provider");--> statement-breakpoint
CREATE INDEX "maia_hosts_model_idx" ON "maia_hosts" USING btree ("maia_model_id");--> statement-breakpoint
CREATE INDEX "maia_prompts_model_idx" ON "maia_prompts" USING btree ("maia_model_id");--> statement-breakpoint
CREATE INDEX "maia_prompts_type_idx" ON "maia_prompts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "maia_prompts_active_idx" ON "maia_prompts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_maia_access_user_idx" ON "user_maia_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_maia_access_model_idx" ON "user_maia_access" USING btree ("maia_model_id");--> statement-breakpoint
CREATE INDEX "user_maia_access_active_idx" ON "user_maia_access" USING btree ("is_active");