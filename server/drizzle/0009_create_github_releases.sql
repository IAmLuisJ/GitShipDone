CREATE TABLE IF NOT EXISTS "github_releases" (
  "id" uuid PRIMARY KEY NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "tag_name" varchar(255) NOT NULL,
  "name" varchar(255),
  "body" text,
  "ai_summary" text,
  "published_at" timestamp NOT NULL,
  "url" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "github_releases_project_id_published_at_idx" ON "github_releases" ("project_id", "published_at" DESC);
