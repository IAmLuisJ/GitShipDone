import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const projectTypeEnum = pgEnum("project_type", [
  "software",
  "design",
  "physical",
  "content",
  "learning",
  "other",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "on_hold",
  "completed",
  "archived",
]);

/**
 * Projects table — tracks user projects with type, status, progress,
 * gamification (points/level), sharing, and GitHub integration fields.
 * Soft deletion via deleted_at.
 */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: projectTypeEnum("type").notNull().default("other"),
    status: projectStatusEnum("status").notNull().default("active"),
    progressAuto: integer("progress_auto").notNull().default(0),
    progressManual: integer("progress_manual"),
    pointsTotal: integer("points_total").notNull().default(0),
    level: varchar("level", { length: 50 }).notNull().default("Seed"),
    shareToken: uuid("share_token").unique(),
    isPublic: boolean("is_public").notNull().default(false),
    githubRepoId: varchar("github_repo_id", { length: 255 }),
    githubRepoName: varchar("github_repo_name", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
    index("projects_share_token_idx").on(table.shareToken),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
