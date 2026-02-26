import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

export interface JwtConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenOptions?: jwt.SignOptions;
  refreshTokenOptions?: jwt.SignOptions;
}

let JWT_CONFIG: JwtConfig | null = null;

export function initJwt(config: JwtConfig) {
  JWT_CONFIG = config;
}

function getJwtConfig(): JwtConfig {
  if (!JWT_CONFIG) {
    throw new Error('Token config is not initialized. Call initTokens() first.');
  }
  return JWT_CONFIG;
}


// Access Token Functions
export function generateAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtConfig().accessTokenSecret, getJwtConfig().accessTokenOptions);
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtConfig().accessTokenSecret);
    if (typeof decoded === 'string') return null; // Should never happen
    return decoded;
  } catch {
    return null;
  }
}


// Refresh Token Functions
export function generateRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtConfig().refreshTokenSecret, getJwtConfig().refreshTokenOptions);
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtConfig().refreshTokenSecret);
    if (typeof decoded === 'string') return null; // Should never happen
    return decoded;
  } catch {
    return null;
  }
}