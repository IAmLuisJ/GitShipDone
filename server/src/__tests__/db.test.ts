import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for the db module. These test the module's structure
 * without requiring a live database connection.
 */

const mockQuery = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });

vi.mock('pg', () => {
  return {
    Pool: class MockPool {
      query = mockQuery;
      connect = vi.fn();
      end = vi.fn();
      on = vi.fn();
    },
  };
});

describe('db module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports db and pool', async () => {
    const { db, pool } = await import('../db');
    expect(db).toBeDefined();
    expect(pool).toBeDefined();
  });

  it('pool can execute a test query', async () => {
    const { pool } = await import('../db');
    const result = await pool.query('SELECT 1');
    expect(result.rows).toBeDefined();
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
  });
});
