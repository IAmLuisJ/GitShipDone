import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { githubReleases } from "../db/schema/githubReleases";
import type {
  GithubRelease,
  NewGithubRelease,
} from "../db/schema/githubReleases";

/**
 * Unit tests for the github_releases table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe("githubReleases schema", () => {
  it('table name is "github_releases"', () => {
    expect(getTableName(githubReleases)).toBe("github_releases");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(githubReleases);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "projectId",
      "tagName",
      "name",
      "body",
      "aiSummary",
      "publishedAt",
      "url",
      "createdAt",
    ];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it("id column is uuid with default", () => {
    const columns = getTableColumns(githubReleases);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("projectId is not null uuid", () => {
    const columns = getTableColumns(githubReleases);
    expect(columns.projectId.columnType).toBe("PgUUID");
    expect(columns.projectId.notNull).toBe(true);
  });

  it("tagName is not null varchar(255)", () => {
    const columns = getTableColumns(githubReleases);
    expect(columns.tagName.columnType).toBe("PgVarchar");
    expect(columns.tagName.notNull).toBe(true);
  });

  it("name is nullable varchar(255)", () => {
    const columns = getTableColumns(githubReleases);
    expect(columns.name.columnType).toBe("PgVarchar");
    expect(columns.name.notNull).toBe(false);
  });

  it("body is nullable text", () => {
    const columns = getTableColumns(githubReleases);
    expect(columns.body.columnType).toBe("PgText");
    expect(columns.body.notNull).toBe(false);
  });

  it("aiSummary is nullable text", () => {
    const columns = getTableColumns(githubReleases);
    expect(columns.aiSummary.columnType).toBe("PgText");
    expect(columns.aiSummary.notNull).toBe(false);
  });

  it("publishedAt is not null timestamp", () => {
    const columns = getTableColumns(githubReleases);
    expect(columns.publishedAt.columnType).toBe("PgTimestamp");
    expect(columns.publishedAt.notNull).toBe(true);
  });

  it("url is not null text", () => {
    const columns = getTableColumns(githubReleases);
    expect(columns.url.columnType).toBe("PgText");
    expect(columns.url.notNull).toBe(true);
  });

  it("createdAt is not null timestamp with default", () => {
    const columns = getTableColumns(githubReleases);
    expect(columns.createdAt.columnType).toBe("PgTimestamp");
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
  });

  it("exports GithubRelease and NewGithubRelease types", () => {
    const entry: GithubRelease = {} as GithubRelease;
    const newEntry: NewGithubRelease = {} as NewGithubRelease;
    expect(entry).toBeDefined();
    expect(newEntry).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.githubReleases).toBeDefined();
    expect(schema.githubReleases).toBe(githubReleases);
  });
});
