import express from 'express';
import cookieParser from 'cookie-parser';
import type { PoolConfig } from 'pg';
import type { JwtConfig } from './jwt/jwt.js';
import { initDatabasePool } from './database/database.js';
import { initJwt } from './jwt/jwt.js';
import { authMiddleware, errorMiddleware, loggerMiddleware, controllerMiddleware } from './middlewares/index.js';

interface DecorConfig {
  pgPool: PoolConfig;
  jwt: JwtConfig;
  preParseMiddlewares?: express.RequestHandler[];
  postParseMiddlewares?: express.RequestHandler[];
}

function decor(config: DecorConfig) {
  const { pgPool, jwt, preParseMiddlewares = [], postParseMiddlewares = [] } = config;
  initDatabasePool(pgPool);
  initJwt(jwt);

  const router = express.Router();
  
  router.use(loggerMiddleware);

  preParseMiddlewares.forEach(mw => router.use(mw));

  // Parsing middlewares
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));
  router.use(cookieParser());

  postParseMiddlewares.forEach(mw => router.use(mw));

  router.use(authMiddleware);
  router.use(controllerMiddleware);
  router.use(errorMiddleware);

  return router;
}

export default decor;