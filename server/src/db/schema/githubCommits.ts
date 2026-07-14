import { randomUUID } from "node:crypto";
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
 * GitHub commits table — stores commit records imported from GitHub.
 * SHA is globally unique to prevent duplicate imports during polling cycles.
 */
export const githubCommits = pgTable(
  "github_commits",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sha: varchar("sha", { length: 40 }).notNull().unique(),
    message: text("message").notNull(),
    authorName: varchar("author_name", { length: 255 }).notNull(),
    authorEmail: varchar("author_email", { length: 255 }),
    committedAt: timestamp("committed_at").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("github_commits_project_id_idx").on(table.projectId),
    index("github_commits_committed_at_idx").on(table.committedAt),
  ],
);

export type GithubCommit = typeof githubCommits.$inferSelect;
export type NewGithubCommit = typeof githubCommits.$inferInsert;
