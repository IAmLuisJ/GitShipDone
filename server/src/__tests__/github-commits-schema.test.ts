import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { githubCommits } from "../db/schema/githubCommits";
import type { GithubCommit, NewGithubCommit } from "../db/schema/githubCommits";

/**
 * Unit tests for the github_commits table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe("githubCommits schema", () => {
  it('table name is "github_commits"', () => {
    expect(getTableName(githubCommits)).toBe("github_commits");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(githubCommits);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "projectId",
      "sha",
      "message",
      "authorName",
      "authorEmail",
      "committedAt",
      "url",
      "createdAt",
    ];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(githubCommits);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("projectId is not null uuid", () => {
    const columns = getTableColumns(githubCommits);
    expect(columns.projectId.columnType).toBe("PgUUID");
    expect(columns.projectId.notNull).toBe(true);
  });

  it("sha is not null varchar(40) with unique constraint", () => {
    const columns = getTableColumns(githubCommits);
    expect(columns.sha.columnType).toBe("PgVarchar");
    expect(columns.sha.notNull).toBe(true);
    expect(columns.sha.isUnique).toBe(true);
  });

  it("message is not null text", () => {
    const columns = getTableColumns(githubCommits);
    expect(columns.message.columnType).toBe("PgText");
    expect(columns.message.notNull).toBe(true);
  });

  it("authorName is not null varchar(255)", () => {
    const columns = getTableColumns(githubCommits);
    expect(columns.authorName.columnType).toBe("PgVarchar");
    expect(columns.authorName.notNull).toBe(true);
  });

  it("authorEmail is nullable varchar(255)", () => {
    const columns = getTableColumns(githubCommits);
    expect(columns.authorEmail.columnType).toBe("PgVarchar");
    expect(columns.authorEmail.notNull).toBe(false);
  });

  it("committedAt is not null timestamp", () => {
    const columns = getTableColumns(githubCommits);
    expect(columns.committedAt.columnType).toBe("PgTimestamp");
    expect(columns.committedAt.notNull).toBe(true);
  });

  it("url is not null text", () => {
    const columns = getTableColumns(githubCommits);
    expect(columns.url.columnType).toBe("PgText");
    expect(columns.url.notNull).toBe(true);
  });

  it("createdAt is not null timestamp with default", () => {
    const columns = getTableColumns(githubCommits);
    expect(columns.createdAt.columnType).toBe("PgTimestamp");
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
  });

  it("exports GithubCommit and NewGithubCommit types", () => {
    const entry: GithubCommit = {} as GithubCommit;
    const newEntry: NewGithubCommit = {} as NewGithubCommit;
    expect(entry).toBeDefined();
    expect(newEntry).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.githubCommits).toBeDefined();
    expect(schema.githubCommits).toBe(githubCommits);
  });
});
