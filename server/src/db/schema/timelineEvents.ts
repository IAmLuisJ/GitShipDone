import { randomUUID } from "node:crypto";
import {
  pgTable,
  pgEnum,
  uuid,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const timelineEventTypeEnum = pgEnum("timeline_event_type", [
  "journal",
  "milestone_completed",
  "todo_batch",
  "github_commit",
  "github_release",
  "progress_change",
  "points_change",
  "status_change",
]);

/**
 * Timeline events table — stores all project history events.
 * Every significant action is logged here for the timeline view.
 * Payload is JSONB to allow different shapes per event type.
 */
export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: timelineEventTypeEnum("type").notNull(),
    refId: uuid("ref_id"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("timeline_events_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("timeline_events_type_idx").on(table.type),
  ],
);

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;
