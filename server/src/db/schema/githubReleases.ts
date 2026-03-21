import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * GitHub releases table — stores release records imported from GitHub.
 * ai_summary is populated later via the AI summarize endpoint.
 */
export const githubReleases = pgTable(
  "github_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagName: varchar("tag_name", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    body: text("body"),
    aiSummary: text("ai_summary"),
    publishedAt: timestamp("published_at").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("github_releases_project_id_published_at_idx").on(
      table.projectId,
      table.publishedAt,
    ),
  ],
);

export type GithubRelease = typeof githubReleases.$inferSelect;
export type NewGithubRelease = typeof githubReleases.$inferInsert;
