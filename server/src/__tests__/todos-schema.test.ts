import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { todos } from "../db/schema/todos";
import type { Todo, NewTodo } from "../db/schema/todos";

/**
 * Unit tests for the todos table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe("todos schema", () => {
  it('table name is "todos"', () => {
    expect(getTableName(todos)).toBe("todos");
  });

  it("has all required columns", () => {
    const columns = getTableColumns(todos);
    const columnNames = Object.keys(columns);

    const expected = [
      "id",
      "projectId",
      "milestoneId",
      "title",
      "isCompleted",
      "isUrgent",
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
    const columns = getTableColumns(todos);
    expect(columns.id.columnType).toBe("PgUUID");
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it("projectId is not null uuid", () => {
    const columns = getTableColumns(todos);
    expect(columns.projectId.columnType).toBe("PgUUID");
    expect(columns.projectId.notNull).toBe(true);
  });

  it("milestoneId is nullable uuid", () => {
    const columns = getTableColumns(todos);
    expect(columns.milestoneId.columnType).toBe("PgUUID");
    expect(columns.milestoneId.notNull).toBe(false);
  });

  it("title is varchar(500) and not null", () => {
    const columns = getTableColumns(todos);
    expect(columns.title.notNull).toBe(true);
    expect(columns.title.columnType).toBe("PgVarchar");
  });

  it("isCompleted defaults to false and is not null", () => {
    const columns = getTableColumns(todos);
    expect(columns.isCompleted.notNull).toBe(true);
    expect(columns.isCompleted.hasDefault).toBe(true);
    expect(columns.isCompleted.columnType).toBe("PgBoolean");
  });

  it("isUrgent defaults to false and is not null", () => {
    const columns = getTableColumns(todos);
    expect(columns.isUrgent.notNull).toBe(true);
    expect(columns.isUrgent.hasDefault).toBe(true);
    expect(columns.isUrgent.columnType).toBe("PgBoolean");
  });

  it("dueDate is nullable date", () => {
    const columns = getTableColumns(todos);
    expect(columns.dueDate.notNull).toBe(false);
    expect(columns.dueDate.columnType).toBe("PgDateString");
  });

  it("sortOrder defaults to 0 and is not null", () => {
    const columns = getTableColumns(todos);
    expect(columns.sortOrder.notNull).toBe(true);
    expect(columns.sortOrder.hasDefault).toBe(true);
    expect(columns.sortOrder.columnType).toBe("PgInteger");
  });

  it("completedAt is nullable timestamp", () => {
    const columns = getTableColumns(todos);
    expect(columns.completedAt.notNull).toBe(false);
    expect(columns.completedAt.columnType).toBe("PgTimestamp");
  });

  it("timestamp columns have defaults and correct nullability", () => {
    const columns = getTableColumns(todos);
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
    expect(columns.updatedAt.notNull).toBe(true);
    expect(columns.updatedAt.hasDefault).toBe(true);
  });

  it("exports Todo and NewTodo types", () => {
    const todo: Todo = {} as Todo;
    const newTodo: NewTodo = {} as NewTodo;
    expect(todo).toBeDefined();
    expect(newTodo).toBeDefined();
  });

  it("is exported from schema barrel", async () => {
    const schema = await import("../db/schema");
    expect(schema.todos).toBeDefined();
    expect(schema.todos).toBe(todos);
  });
});
