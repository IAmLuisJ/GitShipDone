CREATE TYPE "public"."journal_mood" AS ENUM('excited', 'blocked', 'steady', 'win', 'learning');

CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" uuid PRIMARY KEY NOT NULL,
  "project_id" uuid NOT NULL,
  "title" varchar(500) NOT NULL,
  "body" text NOT NULL,
  "mood" "journal_mood",
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  CONSTRAINT "journal_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "journal_entries_project_id_idx" ON "journal_entries" USING btree ("project_id");
