import { Pool } from 'pg';
import type { PoolConfig, PoolClient } from 'pg';
import type Table from './table.js';

let DB_POOL: Pool | null = null;

export function initDatabasePool(poolConfig: PoolConfig): Pool {
  if (DB_POOL) return DB_POOL;
  DB_POOL = new Pool(poolConfig);
  return DB_POOL;
}

function getDatabasePool(): Pool {
  if (!DB_POOL) {
    throw new Error('Database pool is not initialized. Call initDatabasePool() first.');
  }
  return DB_POOL;
}

export default class Database {
  private client: PoolClient;

  constructor(client: PoolClient) {
    this.client = client;
  }

  public table<T extends Table>(TableClass: new (client: PoolClient) => T): T {
    return new TableClass(this.client);
  }
}

export async function transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
  const client = await getDatabasePool().connect();
  try {
    await client.query('BEGIN');
    const db = new Database(client);
    const result = await callback(db);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
  finally {
    client.release();
  }
};

/**
 * Executes a database operation either within an existing transaction or creates a new one.
 * @param db Optional database instance from an existing transaction
 * @param callback Function to execute with the database instance
 * @returns The result of the callback
 */
export async function executeWithDb<T>(
  callback: (db: Database) => Promise<T>,
  db?: Database
): Promise<T> {
  if (db) {
    // Use existing transaction/connection
    return await callback(db);
  } else {
    // Create new transaction
    let result: T;
    await transaction(async (database) => {
      result = await callback(database);
    });
    return result!;
  }
}