import type { Request, Response } from 'express';
import type Database from './database/database.js';
import { InternalServerError } from './errors.js';
import type { JwtPayload } from 'jsonwebtoken';

export default interface HttpContext {
  req: Request;
  res: Response;
  body?: Record<string, any>;
  query?: Record<string, any>;
  db?: Database;
  token?: JwtPayload;
}

export function ensureDb(db?: Database | null) {
  if (!db) throw new InternalServerError('Database not found in HttpContext');
  return db;
}

export function ensureToken(token?: JwtPayload | null) {
  if (!token) throw new InternalServerError('Token not found in HttpContext');
  return token;
}

export function ensureQuery(query?: Record<string, any>) {
  if (!query) throw new InternalServerError('Query not found in HttpContext');
  return query;
}

export function ensureBody(body?: any) {
  if (!body) throw new InternalServerError('Body not found in HttpContext');
  return body;
}