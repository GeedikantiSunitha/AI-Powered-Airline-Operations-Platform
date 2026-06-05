import { Router, type NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logAudit, getAuditEvents } from '../middleware/audit';
import type { UserRole } from '@airline-ops/shared';
import { PERMISSION_MODULES } from '../config/permissionMatrix';
import { adminPersistence } from '../services/admin/adminPersistence';
import { adminHubService } from '../services/admin/adminHubService';
import { validatePasswordPolicy } from '../services/admin/passwordUtils';
import { modelRegistry } from '../services/mlops/modelRegistry';
import { driftMonitor } from '../services/mlops/driftMonitor';
import { pipelineService } from '../services/mlops/pipelineService';
import { securityReview } from '../services/security/securityReview';
import { authService } from '../services/auth/authService';
import {
  getFeatureFlagsForAdmin,
  setCachedFeatureFlag,
  invalidateFeatureFlagCache,
} from '../services/admin/featureFlagGuard';
import { commercialConfigService } from '../services/commercial/commercialConfigService';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

function toPublicUser(u: Awaited<ReturnType<typeof adminPersistence.listUsers>>[number]) {
  return {
    username: u.username,
    role: u.role,
    status: u.status,
    mfaEnabled: u.mfaEnabled,
    authProvider: u.authProvider,
  };
}

/** GET /api/v1/admin/completion-gates — Phase 11+ exit criteria (read-only validation) */
adminRouter.get('/completion-gates', async (_req, res, next: NextFunction) => {
  try {
    const { phase11Gates } = await import('../services/completion-gates/phase11Gates');
    const report = await phase11Gates.validateAll();
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/admin/health-hub */
adminRouter.get('/health-hub', async (_req, res, next: NextFunction) => {
  try {
    res.json({ data: await adminHubService.getSystemHealthHub() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/admin/permissions */
adminRouter.get('/permissions', (_req, res) => {
  res.json({ data: PERMISSION_MODULES });
});

/** GET /api/v1/admin/auth-config */
adminRouter.get('/auth-config', (_req, res) => {
  res.json({ data: authService.getAuthConfig() });
});

/** GET /api/v1/admin/users */
adminRouter.get('/users', async (_req, res) => {
  const users = await adminPersistence.listUsers();
  res.json({ data: users.map(toPublicUser) });
});

/** POST /api/v1/admin/users */
adminRouter.post('/users', async (req, res) => {
  const { username, role, password } = req.body as {
    username?: string;
    role?: UserRole;
    password?: string;
  };
  if (!username || !role || !password) {
    res.status(400).json({ error: 'ValidationError', message: 'username, role, password required' });
    return;
  }
  const policyError = validatePasswordPolicy(password);
  if (policyError) {
    res.status(400).json({ error: 'ValidationError', message: policyError });
    return;
  }
  const existing = await adminPersistence.findByUsername(username);
  if (existing) {
    res.status(409).json({ error: 'Conflict', message: 'User already exists' });
    return;
  }
  const created = await adminPersistence.createUser({
    username,
    role,
    password,
    mfaEnabled: role === 'admin',
  });
  await logAudit({
    userId: req.user?.userId,
    action: 'admin.user_created',
    resource: '/api/v1/admin/users',
    metadata: { username, role },
  });
  res.status(201).json({ data: toPublicUser(created) });
});

/** PATCH /api/v1/admin/users/:username */
adminRouter.patch('/users/:username', async (req, res) => {
  const { role, status, mfaEnabled, password } = req.body as {
    role?: UserRole;
    status?: 'active' | 'disabled';
    mfaEnabled?: boolean;
    password?: string;
  };
  if (password) {
    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      res.status(400).json({ error: 'ValidationError', message: policyError });
      return;
    }
  }
  const { hashPassword } = await import('../services/admin/passwordUtils');
  const updated = await adminPersistence.updateUser(req.params.username, {
    role,
    status,
    mfaEnabled,
    passwordHash: password ? await hashPassword(password) : undefined,
  });
  if (!updated) {
    res.status(404).json({ error: 'NotFound', message: 'User not found' });
    return;
  }
  await logAudit({
    userId: req.user?.userId,
    action: 'admin.user_updated',
    resource: '/api/v1/admin/users/:username',
    metadata: { username: updated.username, role: updated.role, status: updated.status },
  });
  res.json({ data: toPublicUser(updated) });
});

/** GET /api/v1/admin/alert-rules */
adminRouter.get('/alert-rules', async (_req, res) => {
  const rules = await adminPersistence.listAlertRules();
  res.json({
    data: rules.map((r) => ({
      ruleId: r.ruleId,
      type: r.type,
      enabled: r.enabled,
      threshold: r.threshold,
    })),
  });
});

/** PATCH /api/v1/admin/alert-rules/:ruleId */
adminRouter.patch('/alert-rules/:ruleId', async (req, res) => {
  const { enabled, threshold } = req.body as { enabled?: boolean; threshold?: number };
  const rule = await adminPersistence.updateAlertRule(req.params.ruleId, { enabled, threshold });
  if (!rule) {
    res.status(404).json({ error: 'NotFound', message: 'Rule not found' });
    return;
  }
  await logAudit({
    userId: req.user?.userId,
    action: 'admin.alert_rule_updated',
    resource: '/api/v1/admin/alert-rules/:ruleId',
    metadata: { ruleId: rule.ruleId, enabled: rule.enabled, threshold: rule.threshold },
  });
  res.json({
    data: { ruleId: rule.ruleId, type: rule.type, enabled: rule.enabled, threshold: rule.threshold },
  });
});

/** GET /api/v1/admin/feature-flags */
adminRouter.get('/feature-flags', (_req, res) => {
  res.json({ data: getFeatureFlagsForAdmin() });
});

/** PATCH /api/v1/admin/feature-flags/:flagKey */
adminRouter.patch('/feature-flags/:flagKey', async (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  const flag = await adminPersistence.setFeatureFlag(req.params.flagKey, enabled);
  if (!flag) {
    res.status(404).json({ error: 'NotFound', message: 'Flag not found' });
    return;
  }
  setCachedFeatureFlag(flag.flagKey, flag.enabled);
  invalidateFeatureFlagCache();
  await logAudit({
    userId: req.user?.userId,
    action: 'admin.feature_flag_updated',
    metadata: { flagKey: flag.flagKey, enabled: flag.enabled },
  });
  res.json({ data: flag });
});

/** GET /api/v1/admin/commercial-config */
adminRouter.get('/commercial-config', async (_req, res) => {
  res.json({ data: await adminPersistence.getCommercialConfig() });
});

/** PATCH /api/v1/admin/commercial-config */
adminRouter.patch('/commercial-config', async (req, res) => {
  const { key, value } = req.body as { key?: string; value?: Record<string, unknown> };
  if (!key || !value) {
    res.status(400).json({ error: 'ValidationError', message: 'key and value required' });
    return;
  }
  await adminPersistence.updateCommercialConfig(key, value);
  commercialConfigService.invalidate();
  await commercialConfigService.refresh(true);
  await logAudit({
    userId: req.user?.userId,
    action: 'admin.commercial_config_updated',
    metadata: { key },
  });
  res.json({ data: await adminPersistence.getCommercialConfig() });
});

/** GET /api/v1/admin/audit-logs */
adminRouter.get('/audit-logs', async (req, res) => {
  const limit = Math.min(500, Number(req.query.limit ?? 100));
  const dbLogs = await adminPersistence.listAuditLogs(limit);
  const bufferLogs = getAuditEvents()
    .slice(0, limit)
    .map((e) => ({
      traceId: e.traceId,
      category: e.category,
      userId: e.userId,
      action: e.action,
      resource: e.resource,
      metadata: e.metadata,
      at: e.at,
    }));
  const merged = dbLogs.length > 0 ? dbLogs : bufferLogs;
  res.json({ data: merged });
});

/** GET /api/v1/admin/mlops/summary */
adminRouter.get('/mlops/summary', (_req, res) => {
  res.json({
    data: {
      pipelines: pipelineService.listPipelines(),
      recentRuns: pipelineService.listRuns().slice(0, 10),
      registry: modelRegistry.listVersions(),
      drift: [
        driftMonitor.evaluate('flight_delay_v1'),
        driftMonitor.evaluate('passenger_disruption_v1'),
      ],
      approvalGates: modelRegistry.listApprovalGates(),
      rollbackAvailable: Boolean(modelRegistry.getActiveProdVersion('flight_delay_v1')),
    },
  });
});

/** GET /api/v1/admin/security/summary */
adminRouter.get('/security/summary', (_req, res) => {
  res.json({
    data: {
      posture: securityReview.getPosture(),
      inference: securityReview.validateInferenceExposure(),
    },
  });
});
