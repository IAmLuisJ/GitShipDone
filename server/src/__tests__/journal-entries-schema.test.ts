import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { journalEntries, journalMoodEnum } from "../db/schema/journalEntries";
import type {
  JournalEntry,
  NewJournalEntry,
} from "../db/schema/journalEntries";

/**
 * Unit tests for the journal_entries table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe("journalEntries schema", () => {
  it('table name is "journal_entries"', () => {
    expect(getTableName(journalEntries)).toBe("journal_entries");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(journalEntries);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "projectId",
      "title",
      "body",
      "mood",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(journalEntries);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("projectId is not null uuid", () => {
    const columns = getTableColumns(journalEntries);
    expect(columns.projectId.columnType).toBe("PgUUID");
    expect(columns.projectId.notNull).toBe(true);
  });

  it("title is varchar(500) and not null", () => {
    const columns = getTableColumns(journalEntries);
    expect(columns.title.notNull).toBe(true);
    expect(columns.title.columnType).toBe("PgVarchar");
  });

  it("body is text and not null", () => {
    const columns = getTableColumns(journalEntries);
    expect(columns.body.notNull).toBe(true);
    expect(columns.body.columnType).toBe("PgText");
  });

  it("mood is nullable enum", () => {
    const columns = getTableColumns(journalEntries);
    expect(columns.mood.notNull).toBe(false);
    expect(columns.mood.columnType).toBe("PgEnumColumn");
  });

  it("journalMoodEnum has correct values", () => {
    expect(journalMoodEnum.enumValues).toEqual([
      "excited",
      "blocked",
      "steady",
      "win",
      "learning",
    ]);
  });

  it("deletedAt is nullable timestamp for soft delete", () => {
    const columns = getTableColumns(journalEntries);
    expect(columns.deletedAt.notNull).toBe(false);
    expect(columns.deletedAt.columnType).toBe("PgTimestamp");
    expect(columns.deletedAt.hasDefault).toBe(false);
  });

  it("timestamp columns have defaults and correct nullability", () => {
    const columns = getTableColumns(journalEntries);
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
    expect(columns.updatedAt.notNull).toBe(true);
    expect(columns.updatedAt.hasDefault).toBe(true);
  });

  it("exports JournalEntry and NewJournalEntry types", () => {
    const entry: JournalEntry = {} as JournalEntry;
    const newEntry: NewJournalEntry = {} as NewJournalEntry;
    expect(entry).toBeDefined();
    expect(newEntry).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.journalEntries).toBeDefined();
    expect(schema.journalEntries).toBe(journalEntries);
    expect(schema.journalMoodEnum).toBeDefined();
  });
});
