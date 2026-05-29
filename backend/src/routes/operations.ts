import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import type { UserRole } from '@airline-ops/shared';
import { operationsHub } from '../services/operations/operationsHub';

export const operationsRouter = Router();
const roles: UserRole[] = [
  'admin',
  'operations_manager',
  'crew_manager',
  'analyst',
  'viewer',
];
operationsRouter.use(requireAuth, requireRole(...roles));

operationsRouter.get('/crew', (_req, res) => {
  res.json({ data: operationsHub.getCrewDashboard() });
});

operationsRouter.get('/baggage', (_req, res) => {
  res.json({ data: operationsHub.getBaggageDashboard() });
});

operationsRouter.get('/passenger-impact', (_req, res) => {
  res.json({ data: operationsHub.getPassengerImpactDashboard() });
});
