DO $$ BEGIN
  CREATE TYPE "project_type" AS ENUM('software', 'design', 'physical', 'content', 'learning', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "project_status" AS ENUM('active', 'on_hold', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "project_type" DEFAULT 'other' NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"progress_auto" integer DEFAULT 0 NOT NULL,
	"progress_manual" integer,
	"points_total" integer DEFAULT 0 NOT NULL,
	"level" varchar(50) DEFAULT 'Seed' NOT NULL,
	"share_token" uuid,
	"is_public" boolean DEFAULT false NOT NULL,
	"github_repo_id" varchar(255),
	"github_repo_name" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "projects_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "projects_share_token_idx" ON "projects" USING btree ("share_token");
