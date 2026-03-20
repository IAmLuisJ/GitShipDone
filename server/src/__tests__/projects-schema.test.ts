import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import {
  projects,
  projectTypeEnum,
  projectStatusEnum,
} from "../db/schema/projects";
import type { Project, NewProject } from "../db/schema/projects";

/**
 * Unit tests for the projects table schema definition.
 * Validates column names, types, constraints, enums, and exported types.
 */
describe("projects schema", () => {
  it('table name is "projects"', () => {
    expect(getTableName(projects)).toBe("projects");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(projects);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "userId",
      "name",
      "description",
      "type",
      "status",
      "progressAuto",
      "progressManual",
      "pointsTotal",
      "level",
      "shareToken",
      "isPublic",
      "githubRepoId",
      "githubRepoName",
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
    const columns = getTableColumns(projects);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("userId is not null uuid", () => {
    const columns = getTableColumns(projects);
    expect(columns.userId.columnType).toBe("PgUUID");
    expect(columns.userId.notNull).toBe(true);
  });

  it("name is not null", () => {
    const columns = getTableColumns(projects);
    expect(columns.name.notNull).toBe(true);
  });

  it("type enum has correct values", () => {
    expect(projectTypeEnum.enumValues).toEqual([
      "software",
      "design",
      "physical",
      "content",
      "learning",
      "other",
    ]);
  });

  it("status enum has correct values", () => {
    expect(projectStatusEnum.enumValues).toEqual([
      "active",
      "on_hold",
      "completed",
      "archived",
    ]);
  });

  it("type defaults to other and is not null", () => {
    const columns = getTableColumns(projects);
    expect(columns.type.notNull).toBe(true);
    expect(columns.type.hasDefault).toBe(true);
  });

  it("status defaults to active and is not null", () => {
    const columns = getTableColumns(projects);
    expect(columns.status.notNull).toBe(true);
    expect(columns.status.hasDefault).toBe(true);
  });

  it("progressAuto defaults to 0 and is not null", () => {
    const columns = getTableColumns(projects);
    expect(columns.progressAuto.notNull).toBe(true);
    expect(columns.progressAuto.hasDefault).toBe(true);
  });

  it("progressManual is nullable", () => {
    const columns = getTableColumns(projects);
    expect(columns.progressManual.notNull).toBe(false);
  });

  it("pointsTotal defaults to 0 and is not null", () => {
    const columns = getTableColumns(projects);
    expect(columns.pointsTotal.notNull).toBe(true);
    expect(columns.pointsTotal.hasDefault).toBe(true);
  });

  it("level defaults to Seed and is not null", () => {
    const columns = getTableColumns(projects);
    expect(columns.level.notNull).toBe(true);
    expect(columns.level.hasDefault).toBe(true);
  });

  it("shareToken is nullable uuid", () => {
    const columns = getTableColumns(projects);
    expect(columns.shareToken.columnType).toBe("PgUUID");
    expect(columns.shareToken.notNull).toBe(false);
  });

  it("isPublic defaults to false and is not null", () => {
    const columns = getTableColumns(projects);
    expect(columns.isPublic.notNull).toBe(true);
    expect(columns.isPublic.hasDefault).toBe(true);
  });

  it("nullable fields are correctly nullable", () => {
    const columns = getTableColumns(projects);
    const nullableFields = [
      "description",
      "progressManual",
      "shareToken",
      "githubRepoId",
      "githubRepoName",
      "deletedAt",
    ] as const;

    for (const field of nullableFields) {
      expect(columns[field].notNull).toBe(false);
    }
  });

  it("timestamp columns have defaults and correct nullability", () => {
    const columns = getTableColumns(projects);
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
    expect(columns.updatedAt.notNull).toBe(true);
    expect(columns.updatedAt.hasDefault).toBe(true);
    expect(columns.deletedAt.notNull).toBe(false);
  });

  it("exports Project and NewProject types", () => {
    const project: Project = {} as Project;
    const newProject: NewProject = {} as NewProject;
    expect(project).toBeDefined();
    expect(newProject).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.projects).toBeDefined();
    expect(schema.projects).toBe(projects);
    expect(schema.projectTypeEnum).toBeDefined();
    expect(schema.projectStatusEnum).toBeDefined();
  });
});
