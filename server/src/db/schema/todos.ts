import { randomUUID } from "node:crypto";
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { milestones } from "./milestones";

/**
 * Todos table — tracks project to-do items with completion state,
 * urgency, optional milestone grouping, and sort order for drag-and-drop.
 */
export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id").references(() => milestones.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 500 }).notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    isUrgent: boolean("is_urgent").notNull().default(false),
    dueDate: date("due_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("todos_project_id_idx").on(table.projectId),
    index("todos_project_id_is_completed_idx").on(
      table.projectId,
      table.isCompleted,
    ),
  ],
);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
