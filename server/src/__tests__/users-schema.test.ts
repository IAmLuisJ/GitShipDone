import { describe, it, expect } from 'vitest';
import { getTableName, getTableColumns } from 'drizzle-orm';
import { users } from '../db/schema/users';
import type { User, NewUser } from '../db/schema/users';

/**
 * Unit tests for the users table schema definition.
 * Validates column names, types, constraints, and exported types.
 */
describe('users schema', () => {
  it('table name is "users"', () => {
    expect(getTableName(users)).toBe('users');
  });

  it('has all required columns', () => {
    const columns = getTableColumns(users);
    const columnNames = Object.keys(columns);

    const expected = [
      'id',
      'email',
      'name',
      'avatarUrl',
      'passwordHash',
      'githubId',
      'googleId',
      'githubAccessToken',
      'aiProvider',
      'aiApiKey',
      'emailNotificationsEnabled',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ];

    for (const col of expected) {
      expect(columnNames).toContain(col);
    }
    expect(columnNames).toHaveLength(expected.length);
  });

  it('id column is uuid with default', () => {
    const columns = getTableColumns(users);
    expect(columns.id.dataType).toBe('string');
    expect(columns.id.columnType).toBe('PgUUID');
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
  });

  it('email column is not null', () => {
    const columns = getTableColumns(users);
    expect(columns.email.notNull).toBe(true);
  });

  it('name column is not null', () => {
    const columns = getTableColumns(users);
    expect(columns.name.notNull).toBe(true);
  });

  it('nullable fields are correctly nullable', () => {
    const columns = getTableColumns(users);
    const nullableFields = [
      'avatarUrl',
      'passwordHash',
      'githubId',
      'googleId',
      'githubAccessToken',
      'aiProvider',
      'aiApiKey',
      'deletedAt',
    ] as const;

    for (const field of nullableFields) {
      expect(columns[field].notNull).toBe(false);
    }
  });

  it('emailNotificationsEnabled defaults to true and is not null', () => {
    const columns = getTableColumns(users);
    expect(columns.emailNotificationsEnabled.notNull).toBe(true);
    expect(columns.emailNotificationsEnabled.hasDefault).toBe(true);
  });

  it('timestamp columns have defaults and correct nullability', () => {
    const columns = getTableColumns(users);
    expect(columns.createdAt.notNull).toBe(true);
    expect(columns.createdAt.hasDefault).toBe(true);
    expect(columns.updatedAt.notNull).toBe(true);
    expect(columns.updatedAt.hasDefault).toBe(true);
    expect(columns.deletedAt.notNull).toBe(false);
  });

  it('exports User and NewUser types', () => {
    const user: User = {} as User;
    const newUser: NewUser = {} as NewUser;
    expect(user).toBeDefined();
    expect(newUser).toBeDefined();
  });

  it('is exported from schema barrel', async () => {
    const schema = await import('../db/schema');
    expect(schema.users).toBeDefined();
    expect(schema.users).toBe(users);
  });
});
