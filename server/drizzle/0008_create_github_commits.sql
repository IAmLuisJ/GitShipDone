CREATE TABLE IF NOT EXISTS "github_commits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "sha" varchar(40) NOT NULL UNIQUE,
  "message" text NOT NULL,
  "author_name" varchar(255) NOT NULL,
  "author_email" varchar(255),
  "committed_at" timestamp NOT NULL,
  "url" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "github_commits_project_id_idx" ON "github_commits" ("project_id");
CREATE INDEX IF NOT EXISTS "github_commits_committed_at_idx" ON "github_commits" ("committed_at");
