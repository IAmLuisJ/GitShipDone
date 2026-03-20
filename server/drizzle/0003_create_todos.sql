CREATE TABLE IF NOT EXISTS "todos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "milestone_id" uuid,
  "title" varchar(500) NOT NULL,
  "is_completed" boolean NOT NULL DEFAULT false,
  "is_urgent" boolean NOT NULL DEFAULT false,
  "due_date" date,
  "sort_order" integer NOT NULL DEFAULT 0,
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "todos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade,
  CONSTRAINT "todos_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE set null
);

CREATE INDEX IF NOT EXISTS "todos_project_id_idx" ON "todos" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "todos_project_id_is_completed_idx" ON "todos" USING btree ("project_id", "is_completed");
