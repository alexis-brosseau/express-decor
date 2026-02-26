import type { PoolClient } from 'pg';
import Database from '../database/database.js';
import type Table from '../database/table.js';

type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export type TableMethods<T> = {
  [K in MethodNames<T>]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};

export type RepositoryWithTable<TRepo, TTable> = TRepo & TableMethods<TTable>;

export default class Repository<TTable extends Table> {
  protected readonly db: Database;
  protected readonly TableClass: new (client: PoolClient) => TTable;

  constructor(db: Database, TableClass: new (client: PoolClient) => TTable) {
    this.db = db;
    this.TableClass = TableClass;
  }
}

export function createBoundRepoTable<TRepo extends Repository<any>>(
  db: Database,
  RepositoryClass: new (db: Database) => TRepo
) {
  type TTable = TRepo extends Repository<infer T> ? T : never;

  const repo = new RepositoryClass(db);
    const table = repo['db'].table(repo['TableClass'] as new (client: PoolClient) => TTable);
  return new Proxy(repo, {
    get: (target, key: string | symbol, receiver) => {
      const own = Reflect.get(target as object, key, receiver);
      if (own !== undefined) return typeof own === 'function' ? own.bind(target) : own;

      if (key === 'then' || key === 'catch' || key === 'finally' || key === Symbol.toStringTag) {
        return undefined;
      }

      const method = Reflect.get(table as object, key);
      return typeof method === 'function'
        ? (...args: unknown[]) => method.apply(table, args)
        : method;
    },
  }) as RepositoryWithTable<TRepo, TTable>;
}