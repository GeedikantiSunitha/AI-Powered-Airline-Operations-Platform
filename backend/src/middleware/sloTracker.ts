import type { NextFunction, Request, Response } from 'express';
import { metricsStore } from '../services/sre/metricsStore';

export function sloTracker(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    const latencyMs = Date.now() - started;
    const isError = res.statusCode >= 500;
    metricsStore.recordRequest(latencyMs, isError);
  });
  next();
}
