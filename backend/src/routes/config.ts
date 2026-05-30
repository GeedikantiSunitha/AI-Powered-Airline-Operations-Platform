import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getFeatureFlagsMap } from '../services/admin/featureFlagGuard';

export const configRouter = Router();

/** GET /api/v1/config/feature-flags — enabled flags for nav and client guards */
configRouter.get('/feature-flags', requireAuth, (_req, res) => {
  res.json({ data: getFeatureFlagsMap() });
});
