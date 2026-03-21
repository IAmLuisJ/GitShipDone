import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { pointsLog, pointSourceEnum } from "../db/schema/pointsLog";
import type { PointsLog, NewPointsLog } from "../db/schema/pointsLog";

/**
 * Unit tests for the points_log table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe("pointsLog schema", () => {
  it('table name is "points_log"', () => {
    expect(getTableName(pointsLog)).toBe("points_log");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(pointsLog);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "projectId",
      "delta",
      "reason",
      "source",
      "createdAt",
    ];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(pointsLog);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("projectId is not null uuid", () => {
    const columns = getTableColumns(pointsLog);
    expect(columns.projectId.columnType).toBe("PgUUID");
    expect(columns.projectId.notNull).toBe(true);
  });

  it("delta is not null integer", () => {
    const columns = getTableColumns(pointsLog);
    expect(columns.delta.columnType).toBe("PgInteger");
    expect(columns.delta.notNull).toBe(true);
  });

  it("reason is not null varchar(255)", () => {
    const columns = getTableColumns(pointsLog);
    expect(columns.reason.columnType).toBe("PgVarchar");
    expect(columns.reason.notNull).toBe(true);
  });

  it("source is not null enum", () => {
    const columns = getTableColumns(pointsLog);
    expect(columns.source.notNull).toBe(true);
    expect(columns.source.columnType).toBe("PgEnumColumn");
  });

  it("pointSourceEnum has all 6 sources", () => {
    expect(pointSourceEnum.enumValues).toEqual([
      "todo",
      "milestone",
      "journal",
      "github_commit",
      "github_release",
      "manual",
    ]);
    expect(pointSourceEnum.enumValues).toHaveLength(6);
  });

  it("createdAt is not null timestamp with default", () => {
    const columns = getTableColumns(pointsLog);
    expect(columns.createdAt.columnType).toBe("PgTimestamp");
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
  });

  it("exports PointsLog and NewPointsLog types", () => {
    const entry: PointsLog = {} as PointsLog;
    const newEntry: NewPointsLog = {} as NewPointsLog;
    expect(entry).toBeDefined();
    expect(newEntry).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.pointsLog).toBeDefined();
    expect(schema.pointsLog).toBe(pointsLog);
    expect(schema.pointSourceEnum).toBeDefined();
  });
});
