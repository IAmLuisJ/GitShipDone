import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import {
  timelineEvents,
  timelineEventTypeEnum,
} from "../db/schema/timelineEvents";
import type {
  TimelineEvent,
  NewTimelineEvent,
} from "../db/schema/timelineEvents";

/**
 * Unit tests for the timeline_events table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe("timelineEvents schema", () => {
  it('table name is "timeline_events"', () => {
    expect(getTableName(timelineEvents)).toBe("timeline_events");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(timelineEvents);
    const columnNames = Object.keys(columns);

    const expected = ["id", "projectId", "type", "refId", "payload", "createdAt"];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(timelineEvents);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("projectId is not null uuid", () => {
    const columns = getTableColumns(timelineEvents);
    expect(columns.projectId.columnType).toBe("PgUUID");
    expect(columns.projectId.notNull).toBe(true);
  });

  it("type is not null enum", () => {
    const columns = getTableColumns(timelineEvents);
    expect(columns.type.notNull).toBe(true);
    expect(columns.type.columnType).toBe("PgEnumColumn");
  });

  it("timelineEventTypeEnum has all 8 event types", () => {
    expect(timelineEventTypeEnum.enumValues).toEqual([
      "journal",
      "milestone_completed",
      "todo_batch",
      "github_commit",
      "github_release",
      "progress_change",
      "points_change",
      "status_change",
    ]);
    expect(timelineEventTypeEnum.enumValues).toHaveLength(8);
  });

  it("refId is nullable uuid", () => {
    const columns = getTableColumns(timelineEvents);
    expect(columns.refId.columnType).toBe("PgUUID");
    expect(columns.refId.notNull).toBe(false);
  });

  it("payload is jsonb, not null, with default", () => {
    const columns = getTableColumns(timelineEvents);
    expect(columns.payload.columnType).toBe("PgJsonb");
    expect(columns.payload.notNull).toBe(true);
    expect(columns.payload.hasDefault).toBe(true);
  });

  it("createdAt is not null timestamp with default", () => {
    const columns = getTableColumns(timelineEvents);
    expect(columns.createdAt.columnType).toBe("PgTimestamp");
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
  });

  it("exports TimelineEvent and NewTimelineEvent types", () => {
    const event: TimelineEvent = {} as TimelineEvent;
    const newEvent: NewTimelineEvent = {} as NewTimelineEvent;
    expect(event).toBeDefined();
    expect(newEvent).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.timelineEvents).toBeDefined();
    expect(schema.timelineEvents).toBe(timelineEvents);
    expect(schema.timelineEventTypeEnum).toBeDefined();
  });
});
