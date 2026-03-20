import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const journalMoodEnum = pgEnum("journal_mood", [
  "excited",
  "blocked",
  "steady",
  "win",
  "learning",
]);

/**
 * Journal entries table — rich-text project updates with mood tracking
 * and soft deletion. Body stores Tiptap JSON serialized as string.
 */
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body").notNull(),
    mood: journalMoodEnum("mood"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("journal_entries_project_id_idx").on(table.projectId)],
);

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
