/**
 * Phase 1 — JWT (local) or Cognito validation
 */
import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth/authService';

function extractBearerToken(req: Request): string | null {
  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing Bearer token' });
    return;
  }

  try {
    req.user = await authService.verifyTokenAsync(token);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}
