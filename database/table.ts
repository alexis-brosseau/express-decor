import type { UUID } from 'crypto';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

export default class Table {
  private client: PoolClient;
  private name: string;

  constructor(client: PoolClient, name: string) {
    this.client = client;
    this.name = name;
  }

  protected async query<T extends QueryResultRow>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return this.client.query<T>(sql, params);
  }

  protected async call<T extends QueryResultRow>(procedure: string, params: Record<string, any> = {}): Promise<QueryResult<T>> {
    const paramKeys = Object.keys(params);
    const paramPlaceholders = paramKeys.map((_, index) => `$${index + 1}`).join(', ');
    const query = `SELECT * FROM ${procedure}(${paramPlaceholders})`;
    const paramValues = paramKeys.map(key => params[key]);

    const res = await this.query<T>(query, paramValues);
    return res;
  }

  protected async get<T extends QueryResultRow>(id: UUID): Promise<any | null> {
    const query = `SELECT * FROM "${this.name}" WHERE "id" = $1`;
    
    const res = await this.query<T>(query, [id]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }
}