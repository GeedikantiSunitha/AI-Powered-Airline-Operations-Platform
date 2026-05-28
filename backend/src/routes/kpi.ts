import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { kpiService } from '../services/kpi/kpiService';

export const kpiRouter = Router();
kpiRouter.use(requireAuth, requireRole('admin', 'operations_manager', 'analyst', 'viewer'));

/** GET /api/v1/kpi/summary — Phase 5 */
kpiRouter.get('/summary', async (req, res, next) => {
  try {
    const rangeDays = Number(req.query.days ?? 7);
    const summary = await kpiService.getSummary(rangeDays);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/kpi/trends — Phase 5 */
kpiRouter.get('/trends', async (req, res, next) => {
  try {
    const rangeDays = Number(req.query.days ?? 7);
    const trends = await kpiService.getTrends(rangeDays);
    res.json({ data: trends });
  } catch (err) {
    next(err);
  }
});
