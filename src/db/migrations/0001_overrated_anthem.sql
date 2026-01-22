ALTER TABLE "users" ADD COLUMN "personal_org_id" text;--> statement-breakpoint
CREATE INDEX "users_personal_org_idx" ON "users" USING btree ("personal_org_id");