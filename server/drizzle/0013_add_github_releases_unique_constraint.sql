CREATE UNIQUE INDEX IF NOT EXISTS "github_releases_tag_project_unique" ON "github_releases" ("tag_name", "project_id");
