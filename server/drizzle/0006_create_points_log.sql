CREATE TYPE "point_source" AS ENUM ('todo', 'milestone', 'journal', 'github_commit', 'github_release', 'manual');

CREATE TABLE "points_log" (
  "id" uuid PRIMARY KEY NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "delta" integer NOT NULL,
  "reason" varchar(255) NOT NULL,
  "source" "point_source" NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "points_log_project_id_idx" ON "points_log" USING btree ("project_id");
