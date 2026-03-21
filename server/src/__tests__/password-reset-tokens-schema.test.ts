import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { passwordResetTokens } from "../db/schema/passwordResetTokens";
import type {
  PasswordResetToken,
  NewPasswordResetToken,
} from "../db/schema/passwordResetTokens";

/**
 * Unit tests for the password_reset_tokens table schema definition.
 */
describe("passwordResetTokens schema", () => {
  it('table name is "password_reset_tokens"', () => {
    expect(getTableName(passwordResetTokens)).toBe("password_reset_tokens");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(passwordResetTokens);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "userId",
      "tokenHash",
      "expiresAt",
      "usedAt",
      "createdAt",
    ];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(passwordResetTokens);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("userId is not null uuid (FK to users)", () => {
    const columns = getTableColumns(passwordResetTokens);
    expect(columns.userId.columnType).toBe("PgUUID");
    expect(columns.userId.notNull).toBe(true);
  });

  it("tokenHash is not null text", () => {
    const columns = getTableColumns(passwordResetTokens);
    expect(columns.tokenHash.columnType).toBe("PgText");
    expect(columns.tokenHash.notNull).toBe(true);
  });

  it("expiresAt is not null timestamp", () => {
    const columns = getTableColumns(passwordResetTokens);
    expect(columns.expiresAt.columnType).toBe("PgTimestamp");
    expect(columns.expiresAt.notNull).toBe(true);
  });

  it("usedAt is nullable timestamp", () => {
    const columns = getTableColumns(passwordResetTokens);
    expect(columns.usedAt.columnType).toBe("PgTimestamp");
    expect(columns.usedAt.notNull).toBe(false);
  });

  it("createdAt is not null timestamp with default", () => {
    const columns = getTableColumns(passwordResetTokens);
    expect(columns.createdAt.columnType).toBe("PgTimestamp");
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
  });

  it("exports PasswordResetToken and NewPasswordResetToken types", () => {
    const entry: PasswordResetToken = {} as PasswordResetToken;
    const newEntry: NewPasswordResetToken = {} as NewPasswordResetToken;
    expect(entry).toBeDefined();
    expect(newEntry).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.passwordResetTokens).toBeDefined();
    expect(schema.passwordResetTokens).toBe(passwordResetTokens);
  });
});
