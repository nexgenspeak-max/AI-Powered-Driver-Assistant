import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { config } from '../config';
import { Role } from './userService';

export interface TokenClaims {
  sub: string;
  role: Role;
  permissions: string[];
  name: string;
  phone?: string;
  email?: string;
}

export function signAccessToken(claims: TokenClaims): string {
  return jwt.sign({ ...claims, type: 'access' }, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(claims: TokenClaims): string {
  return jwt.sign({ ...claims, type: 'refresh' }, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenClaims & { type: 'access' | 'refresh' } {
  return jwt.verify(token, config.jwtSecret) as TokenClaims & { type: 'access' | 'refresh' };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const DURATION_MULTIPLIERS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

export function durationFromNow(duration: string): string {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const ms = Number(match[1]) * DURATION_MULTIPLIERS[match[2]];
  return new Date(Date.now() + ms).toISOString();
}
