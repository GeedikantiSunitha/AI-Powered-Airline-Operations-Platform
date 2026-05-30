import type { Request, Response, NextFunction } from 'express';
import { isModuleEnabled } from '../services/admin/featureFlagGuard';

export function requireModuleFlag(flagKey: string) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!isModuleEnabled(flagKey)) {
      res.status(503).json({
        error: 'ModuleDisabled',
        message: `Module "${flagKey}" is disabled for this environment`,
      });
      return;
    }
    next();
  };
}
