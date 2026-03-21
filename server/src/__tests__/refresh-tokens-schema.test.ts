import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { refreshTokens } from "../db/schema/refreshTokens";
import type {
  RefreshToken,
  NewRefreshToken,
} from "../db/schema/refreshTokens";

/**
 * Unit tests for the refresh_tokens table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe("refreshTokens schema", () => {
  it('table name is "refresh_tokens"', () => {
    expect(getTableName(refreshTokens)).toBe("refresh_tokens");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(refreshTokens);
    const columnNames = Object.keys(columns);

    const expected = ["id", "userId", "tokenHash", "expiresAt", "createdAt"];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(refreshTokens);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("userId is not null uuid (FK to users)", () => {
    const columns = getTableColumns(refreshTokens);
    expect(columns.userId.columnType).toBe("PgUUID");
    expect(columns.userId.notNull).toBe(true);
  });

  it("tokenHash is not null text", () => {
    const columns = getTableColumns(refreshTokens);
    expect(columns.tokenHash.columnType).toBe("PgText");
    expect(columns.tokenHash.notNull).toBe(true);
  });

  it("expiresAt is not null timestamp", () => {
    const columns = getTableColumns(refreshTokens);
    expect(columns.expiresAt.columnType).toBe("PgTimestamp");
    expect(columns.expiresAt.notNull).toBe(true);
  });

  it("createdAt is not null timestamp with default", () => {
    const columns = getTableColumns(refreshTokens);
    expect(columns.createdAt.columnType).toBe("PgTimestamp");
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
  });

  it("exports RefreshToken and NewRefreshToken types", () => {
    const entry: RefreshToken = {} as RefreshToken;
    const newEntry: NewRefreshToken = {} as NewRefreshToken;
    expect(entry).toBeDefined();
    expect(newEntry).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.refreshTokens).toBeDefined();
    expect(schema.refreshTokens).toBe(refreshTokens);
  });
});
