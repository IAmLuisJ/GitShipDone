import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Runs all pending migrations from the drizzle/ directory.
 * Usage: npx ts-node src/db/migrate.ts
 */
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('[migrate] Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('[migrate] Migrations complete');

  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
});
