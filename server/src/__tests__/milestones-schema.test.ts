import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import {
  milestones,
  milestoneStatusEnum,
} from "../db/schema/milestones";
import type { Milestone, NewMilestone } from "../db/schema/milestones";

/**
 * Unit tests for the milestones table schema definition.
 * Validates column names, types, constraints, enums, and exported types.
 */
describe("milestones schema", () => {
  it('table name is "milestones"', () => {
    expect(getTableName(milestones)).toBe("milestones");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(milestones);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "projectId",
      "name",
      "description",
      "status",
      "dueDate",
      "sortOrder",
      "completedAt",
      "createdAt",
      "updatedAt",
    ];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(milestones);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("projectId is not null uuid", () => {
    const columns = getTableColumns(milestones);
    expect(columns.projectId.columnType).toBe("PgUUID");
    expect(columns.projectId.notNull).toBe(true);
  });

  it("name is varchar(255) and not null", () => {
    const columns = getTableColumns(milestones);
    expect(columns.name.notNull).toBe(true);
    expect(columns.name.columnType).toBe("PgVarchar");
  });

  it("status enum has correct values", () => {
    expect(milestoneStatusEnum.enumValues).toEqual([
      "pending",
      "in_progress",
      "completed",
    ]);
  });

  it("status defaults to pending and is not null", () => {
    const columns = getTableColumns(milestones);
    expect(columns.status.notNull).toBe(true);
    expect(columns.status.hasDefault).toBe(true);
  });

  it("sortOrder defaults to 0 and is not null", () => {
    const columns = getTableColumns(milestones);
    expect(columns.sortOrder.notNull).toBe(true);
    expect(columns.sortOrder.hasDefault).toBe(true);
    expect(columns.sortOrder.columnType).toBe("PgInteger");
  });

  it("dueDate is nullable date", () => {
    const columns = getTableColumns(milestones);
    expect(columns.dueDate.notNull).toBe(false);
    expect(columns.dueDate.columnType).toBe("PgDateString");
  });

  it("completedAt is nullable timestamp", () => {
    const columns = getTableColumns(milestones);
    expect(columns.completedAt.notNull).toBe(false);
    expect(columns.completedAt.columnType).toBe("PgTimestamp");
  });

  it("description is nullable", () => {
    const columns = getTableColumns(milestones);
    expect(columns.description.notNull).toBe(false);
  });

  it("timestamp columns have defaults and correct nullability", () => {
    const columns = getTableColumns(milestones);
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
    expect(columns.updatedAt.notNull).toBe(true);
    expect(columns.updatedAt.hasDefault).toBe(true);
  });

  it("exports Milestone and NewMilestone types", () => {
    const milestone: Milestone = {} as Milestone;
    const newMilestone: NewMilestone = {} as NewMilestone;
    expect(milestone).toBeDefined();
    expect(newMilestone).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.milestones).toBeDefined();
    expect(schema.milestones).toBe(milestones);
    expect(schema.milestoneStatusEnum).toBeDefined();
  });
});
