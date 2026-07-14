CREATE TYPE "public"."timeline_event_type" AS ENUM('journal', 'milestone_completed', 'todo_batch', 'github_commit', 'github_release', 'progress_change', 'points_change', 'status_change');

CREATE TABLE IF NOT EXISTS "timeline_events" (
  "id" uuid PRIMARY KEY NOT NULL,
  "project_id" uuid NOT NULL,
  "type" "timeline_event_type" NOT NULL,
  "ref_id" uuid,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "timeline_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "timeline_events_project_id_created_at_idx" ON "timeline_events" USING btree ("project_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "timeline_events_type_idx" ON "timeline_events" USING btree ("type");
