import { randomUUID } from "node:crypto";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "in_progress",
  "completed",
]);

/**
 * Milestones table — tracks project milestones with status, due dates,
 * sort order for drag-and-drop, and completion tracking.
 */
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: milestoneStatusEnum("status").notNull().default("pending"),
    dueDate: date("due_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("milestones_project_id_idx").on(table.projectId)],
);

export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
