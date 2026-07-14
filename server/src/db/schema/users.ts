import { randomUUID } from 'node:crypto';
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Users table — supports email/password auth, Google OAuth, GitHub OAuth,
 * AI provider settings (encrypted), and soft deletion via deleted_at.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    passwordHash: text('password_hash'),
    githubId: varchar('github_id', { length: 255 }).unique(),
    googleId: varchar('google_id', { length: 255 }).unique(),
    githubAccessToken: text('github_access_token'),
    aiProvider: text('ai_provider'),
    aiApiKey: text('ai_api_key'),
    emailNotificationsEnabled: boolean('email_notifications_enabled')
      .notNull()
      .default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_created_at_idx').on(table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
