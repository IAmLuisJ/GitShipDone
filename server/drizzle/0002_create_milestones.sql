DO $$ BEGIN
  CREATE TYPE "milestone_status" AS ENUM('pending', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "milestone_status" DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "milestones_project_id_idx" ON "milestones" USING btree ("project_id");
