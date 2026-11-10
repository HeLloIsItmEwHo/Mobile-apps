import { readFile } from 'node:fs/promises';
import pg from 'pg';

export function createPool(databaseUrl) {
  return new pg.Pool({ connectionString: databaseUrl, max: 10 });
}

export async function migrate(pool) {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
}

// Runs `work` inside a transaction and undoes it if `work` throws.
export async function withTransaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
