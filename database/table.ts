import type { UUID } from 'crypto';
import type { PoolClient, QueryResult } from 'pg';

export default class Table {
  private client: PoolClient;
  private name: string;

  constructor(client: PoolClient, name: string) {
    this.client = client;
    this.name = name;
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    const result: QueryResult = await this.client.query(sql, params);
    return result.rows;
  }

  protected async call(procedure: string, params: Record<string, any> = {}): Promise<any[]> {
    const paramKeys = Object.keys(params);
    const paramPlaceholders = paramKeys.map((_, index) => `$${index + 1}`).join(', ');
    const query = `SELECT * FROM ${procedure}(${paramPlaceholders})`;
    const paramValues = paramKeys.map(key => params[key]);

    const rows = await this.query(query, paramValues);
    return rows;
  }

  async get(id: UUID): Promise<any | null> {
    const query = `SELECT * FROM "${this.name}" WHERE "id" = $1`;
    
    const rows = await this.query(query, [id]);
    if (rows.length === 0) return null;
    return rows[0];
  }
}