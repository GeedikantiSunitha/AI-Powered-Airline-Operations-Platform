import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import type { UserRole } from '@airline-ops/shared';
import { logAudit } from '../middleware/audit';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

interface AdminUser {
  username: string;
  role: UserRole;
  status: 'active' | 'disabled';
}

interface AlertRule {
  ruleId: string;
  type: 'DelayRiskElevated' | 'CrewUnavailable' | 'WeatherRiskDetected' | 'BaggageDelayDetected';
  enabled: boolean;
  threshold: number;
}

const usersStore: AdminUser[] = [
  { username: 'admin', role: 'admin', status: 'active' },
  { username: 'opsmanager', role: 'operations_manager', status: 'active' },
  { username: 'crewmanager', role: 'crew_manager', status: 'active' },
  { username: 'analyst', role: 'analyst', status: 'active' },
  { username: 'viewer', role: 'viewer', status: 'active' },
];

const alertRulesStore: AlertRule[] = [
  { ruleId: 'rule-delay-risk', type: 'DelayRiskElevated', enabled: true, threshold: 0.7 },
  { ruleId: 'rule-crew-unavail', type: 'CrewUnavailable', enabled: true, threshold: 1 },
  { ruleId: 'rule-weather-risk', type: 'WeatherRiskDetected', enabled: true, threshold: 0.75 },
  { ruleId: 'rule-baggage-delay', type: 'BaggageDelayDetected', enabled: true, threshold: 40 },
];

/** Admin routes — Phase 10 */
adminRouter.get('/users', async (_req, res) => {
  res.json({ data: usersStore });
});

adminRouter.post('/users', async (req, res) => {
  const { username, role } = req.body as { username?: string; role?: UserRole };
  if (!username || !role) {
    res.status(400).json({ error: 'ValidationError', message: 'username and role are required' });
    return;
  }
  if (usersStore.some((u) => u.username === username)) {
    res.status(409).json({ error: 'Conflict', message: 'User already exists' });
    return;
  }
  const created: AdminUser = { username, role, status: 'active' };
  usersStore.push(created);
  await logAudit({
    userId: req.user?.userId,
    action: 'admin.user_created',
    resource: '/api/v1/admin/users',
    metadata: { username: created.username, role: created.role, status: created.status },
  });
  res.status(201).json({ data: created });
});

adminRouter.patch('/users/:username', async (req, res) => {
  const target = usersStore.find((u) => u.username === req.params.username);
  if (!target) {
    res.status(404).json({ error: 'NotFound', message: 'User not found' });
    return;
  }
  const { role, status } = req.body as { role?: UserRole; status?: 'active' | 'disabled' };
  if (role) target.role = role;
  if (status) target.status = status;
  await logAudit({
    userId: req.user?.userId,
    action: 'admin.user_updated',
    resource: '/api/v1/admin/users/:username',
    metadata: { username: target.username, role: target.role, status: target.status },
  });
  res.json({ data: target });
});

adminRouter.get('/alert-rules', async (_req, res) => {
  res.json({ data: alertRulesStore });
});

adminRouter.patch('/alert-rules/:ruleId', async (req, res) => {
  const rule = alertRulesStore.find((r) => r.ruleId === req.params.ruleId);
  if (!rule) {
    res.status(404).json({ error: 'NotFound', message: 'Rule not found' });
    return;
  }
  const { enabled, threshold } = req.body as { enabled?: boolean; threshold?: number };
  if (typeof enabled === 'boolean') rule.enabled = enabled;
  if (typeof threshold === 'number') rule.threshold = threshold;
  await logAudit({
    userId: req.user?.userId,
    action: 'admin.alert_rule_updated',
    resource: '/api/v1/admin/alert-rules/:ruleId',
    metadata: {
      ruleId: rule.ruleId,
      type: rule.type,
      enabled: rule.enabled,
      threshold: rule.threshold,
    },
  });
  res.json({ data: rule });
});
