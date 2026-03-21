import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import {
  notifications,
  notificationTypeEnum,
} from "../db/schema/notifications";
import type {
  Notification,
  NewNotification,
} from "../db/schema/notifications";

/**
 * Unit tests for the notifications table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe("notifications schema", () => {
  it('table name is "notifications"', () => {
    expect(getTableName(notifications)).toBe("notifications");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(notifications);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "userId",
      "projectId",
      "type",
      "message",
      "isRead",
      "snoozedUntil",
      "createdAt",
    ];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(notifications);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("userId is not null uuid (FK to users)", () => {
    const columns = getTableColumns(notifications);
    expect(columns.userId.columnType).toBe("PgUUID");
    expect(columns.userId.notNull).toBe(true);
  });

  it("projectId is nullable uuid (FK to projects)", () => {
    const columns = getTableColumns(notifications);
    expect(columns.projectId.columnType).toBe("PgUUID");
    expect(columns.projectId.notNull).toBe(false);
  });

  it("type is not null enum", () => {
    const columns = getTableColumns(notifications);
    expect(columns.type.notNull).toBe(true);
    expect(columns.type.columnType).toBe("PgEnumColumn");
  });

  it("notificationTypeEnum has all 4 types", () => {
    expect(notificationTypeEnum.enumValues).toEqual([
      "milestone_due",
      "todo_due",
      "milestone_completed",
      "system",
    ]);
    expect(notificationTypeEnum.enumValues).toHaveLength(4);
  });

  it("message is not null text", () => {
    const columns = getTableColumns(notifications);
    expect(columns.message.columnType).toBe("PgText");
    expect(columns.message.notNull).toBe(true);
  });

  it("isRead is not null boolean with default false", () => {
    const columns = getTableColumns(notifications);
    expect(columns.isRead.columnType).toBe("PgBoolean");
    expect(columns.isRead.notNull).toBe(true);
    expect(columns.isRead.hasDefault).toBe(true);
  });

  it("snoozedUntil is nullable timestamp", () => {
    const columns = getTableColumns(notifications);
    expect(columns.snoozedUntil.columnType).toBe("PgTimestamp");
    expect(columns.snoozedUntil.notNull).toBe(false);
  });

  it("createdAt is not null timestamp with default", () => {
    const columns = getTableColumns(notifications);
    expect(columns.createdAt.columnType).toBe("PgTimestamp");
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
  });

  it("exports Notification and NewNotification types", () => {
    const entry: Notification = {} as Notification;
    const newEntry: NewNotification = {} as NewNotification;
    expect(entry).toBeDefined();
    expect(newEntry).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.notifications).toBeDefined();
    expect(schema.notifications).toBe(notifications);
    expect(schema.notificationTypeEnum).toBeDefined();
  });
});
