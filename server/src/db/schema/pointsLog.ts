import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const pointSourceEnum = pgEnum("point_source", [
  "todo",
  "milestone",
  "journal",
  "github_commit",
  "github_release",
  "manual",
]);

/**
 * Points log table — tracks every points transaction on a project.
 * Delta can be positive (award) or negative (deduct).
 * The running total is the sum of all deltas for a given project.
 */
export const pointsLog = pgTable(
  "points_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    source: pointSourceEnum("source").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("points_log_project_id_idx").on(table.projectId)],
);

export type PointsLog = typeof pointsLog.$inferSelect;
export type NewPointsLog = typeof pointsLog.$inferInsert;
