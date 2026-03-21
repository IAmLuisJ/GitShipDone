import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { parkingLotItems } from "../db/schema/parkingLotItems";
import type {
  ParkingLotItem,
  NewParkingLotItem,
} from "../db/schema/parkingLotItems";

/**
 * Unit tests for the parking_lot_items table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe("parkingLotItems schema", () => {
  it('table name is "parking_lot_items"', () => {
    expect(getTableName(parkingLotItems)).toBe("parking_lot_items");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(parkingLotItems);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "projectId",
      "title",
      "description",
      "aiPathway",
      "archivedAt",
      "createdAt",
      "updatedAt",
    ];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(parkingLotItems);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("projectId is not null uuid", () => {
    const columns = getTableColumns(parkingLotItems);
    expect(columns.projectId.columnType).toBe("PgUUID");
    expect(columns.projectId.notNull).toBe(true);
  });

  it("title is not null varchar(500)", () => {
    const columns = getTableColumns(parkingLotItems);
    expect(columns.title.columnType).toBe("PgVarchar");
    expect(columns.title.notNull).toBe(true);
  });

  it("description is nullable text", () => {
    const columns = getTableColumns(parkingLotItems);
    expect(columns.description.columnType).toBe("PgText");
    expect(columns.description.notNull).toBe(false);
  });

  it("aiPathway is nullable text", () => {
    const columns = getTableColumns(parkingLotItems);
    expect(columns.aiPathway.columnType).toBe("PgText");
    expect(columns.aiPathway.notNull).toBe(false);
  });

  it("archivedAt is nullable timestamp", () => {
    const columns = getTableColumns(parkingLotItems);
    expect(columns.archivedAt.columnType).toBe("PgTimestamp");
    expect(columns.archivedAt.notNull).toBe(false);
    expect(columns.archivedAt.hasDefault).toBe(false);
  });

  it("createdAt is not null timestamp with default", () => {
    const columns = getTableColumns(parkingLotItems);
    expect(columns.createdAt.columnType).toBe("PgTimestamp");
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
  });

  it("updatedAt is not null timestamp with default", () => {
    const columns = getTableColumns(parkingLotItems);
    expect(columns.updatedAt.columnType).toBe("PgTimestamp");
    expect(columns.updatedAt.notNull).toBe(true);
    expect(columns.updatedAt.hasDefault).toBe(true);
  });

  it("exports ParkingLotItem and NewParkingLotItem types", () => {
    const item: ParkingLotItem = {} as ParkingLotItem;
    const newItem: NewParkingLotItem = {} as NewParkingLotItem;
    expect(item).toBeDefined();
    expect(newItem).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.parkingLotItems).toBeDefined();
    expect(schema.parkingLotItems).toBe(parkingLotItems);
  });
});
