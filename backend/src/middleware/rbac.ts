/**
 * Phase 1 — Role-based access control
 */
import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@airline-ops/shared';
import { logAudit } from './audit';

export function requireRole(..._allowed: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    if (!_allowed.includes(user.role)) {
      void logAudit({
        userId: user.userId,
        action: 'auth.permission_denied',
        resource: req.originalUrl,
        metadata: { requiredRoles: _allowed, actualRole: user.role },
      });
      res.status(403).json({ error: 'Forbidden', message: 'Insufficient role permission' });
      return;
    }

    next();
  };
}
