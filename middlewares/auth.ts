import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../jwt/jwt.js';
import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      token?: JwtPayload;
    }
  }
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const [type, accessToken] = authHeader.split(' ');
  if (type !== 'Bearer' || !accessToken) return next();

  try {
    const token = verifyAccessToken(accessToken);
    if (!token) return next();
    req.token = token;
    return next();
  } catch (e) {
    // On any verification error, treat as anonymous
    return next();
  }
}

export default authMiddleware;
