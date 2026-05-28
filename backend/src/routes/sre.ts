import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';
import { sreDashboard } from '../services/sre/sreDashboard';
import { alertingStrategy } from '../services/sre/alertingStrategy';
import { syntheticChecks } from '../services/sre/syntheticChecks';
import { incidentPlaybooks } from '../services/sre/incidentPlaybooks';
import { chaosDrills, type ChaosScenario } from '../services/sre/chaosDrills';
import { metricsStore } from '../services/sre/metricsStore';

export const sreRouter = Router();
sreRouter.use(requireAuth, requireRole('admin', 'operations_manager'));

/** GET /api/v1/sre/dashboard — Phase 16 unified dashboard */
sreRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const data = await sreDashboard.getUnifiedDashboard();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/sre/alerts/rules */
sreRouter.get('/alerts/rules', (_req, res) => {
  res.json({ data: alertingStrategy.listRules() });
});

/** GET /api/v1/sre/alerts/active */
sreRouter.get('/alerts/active', (_req, res) => {
  const snapshot = metricsStore.getSnapshot();
  res.json({ data: alertingStrategy.evaluate(snapshot) });
});

/** POST /api/v1/sre/synthetics/run */
sreRouter.post('/synthetics/run', async (_req, res, next) => {
  try {
    const data = await syntheticChecks.runAll();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/sre/playbooks */
sreRouter.get('/playbooks', (_req, res) => {
  res.json({ data: incidentPlaybooks.list() });
});

/** GET /api/v1/sre/playbooks/:id */
sreRouter.get('/playbooks/:id', (req, res) => {
  const playbook = incidentPlaybooks.get(req.params.id);
  if (!playbook) {
    res.status(404).json({ error: 'NotFound', message: 'Playbook not found' });
    return;
  }
  res.json({ data: playbook });
});

/** POST /api/v1/sre/chaos/:scenario */
sreRouter.post('/chaos/:scenario', async (req, res, next) => {
  try {
    const scenario = req.params.scenario as ChaosScenario;
    const allowed: ChaosScenario[] = [
      'ingestion-outage',
      'model-endpoint-failure',
      'opensearch-degradation',
    ];
    if (!allowed.includes(scenario)) {
      res.status(400).json({ error: 'ValidationError', message: 'Invalid chaos scenario' });
      return;
    }
    const result = await chaosDrills.run(scenario);
    await logAudit({
      userId: req.user?.userId,
      action: 'sre.chaos_drill_executed',
      resource: '/api/v1/sre/chaos/:scenario',
      metadata: { scenario, result },
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/sre/drills/quarterly — checkpoint */
sreRouter.post('/drills/quarterly', async (req, res, next) => {
  try {
    const result = await chaosDrills.runQuarterlySuite();
    await logAudit({
      userId: req.user?.userId,
      action: 'sre.quarterly_failure_drill',
      resource: '/api/v1/sre/drills/quarterly',
      metadata: { passed: result.passed, drills: result.drills },
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});
