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
 * Parking lot items table — captures project ideas not yet prioritized.
 * Items can be soft-archived via archived_at and may have an AI-generated pathway.
 */
export const parkingLotItems = pgTable(
  "parking_lot_items",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    aiPathway: text("ai_pathway"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("parking_lot_items_project_id_idx").on(table.projectId)],
);

export type ParkingLotItem = typeof parkingLotItems.$inferSelect;
export type NewParkingLotItem = typeof parkingLotItems.$inferInsert;
