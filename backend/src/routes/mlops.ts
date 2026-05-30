import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { requireModuleFlag } from '../middleware/featureFlag';
import { logAudit } from '../middleware/audit';
import { modelRegistry } from '../services/mlops/modelRegistry';
import { driftMonitor } from '../services/mlops/driftMonitor';
import { pipelineService } from '../services/mlops/pipelineService';
import { rollbackService } from '../services/mlops/rollbackService';
import { mlopsOrchestrator } from '../services/mlops/mlopsOrchestrator';

export const mlopsRouter = Router();
mlopsRouter.use(
  requireAuth,
  requireRole('admin', 'operations_manager', 'analyst'),
  requireModuleFlag('module_mlops')
);

/** GET /api/v1/mlops/pipelines — Phase 13 */
mlopsRouter.get('/pipelines', (_req, res) => {
  res.json({ data: pipelineService.listPipelines() });
});

/** GET /api/v1/mlops/pipelines/runs */
mlopsRouter.get('/pipelines/runs', (req, res) => {
  const pipelineId = req.query.pipelineId ? String(req.query.pipelineId) : undefined;
  res.json({ data: pipelineService.listRuns(pipelineId) });
});

/** POST /api/v1/mlops/pipelines/:pipelineId/run */
mlopsRouter.post('/pipelines/:pipelineId/run', async (req, res, next) => {
  try {
    const run = await pipelineService.startRun(req.params.pipelineId);
    await logAudit({
      userId: req.user?.userId,
      action: 'mlops.pipeline_started',
      resource: '/api/v1/mlops/pipelines/:pipelineId/run',
      metadata: { pipelineId: req.params.pipelineId, runId: run.runId },
    });
    res.status(202).json({ data: run });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/mlops/registry */
mlopsRouter.get('/registry', (req, res) => {
  const modelId = req.query.modelId ? String(req.query.modelId) : undefined;
  res.json({ data: modelRegistry.listVersions(modelId) });
});

/** POST /api/v1/mlops/registry/:modelId/promote */
mlopsRouter.post('/registry/:modelId/promote', async (req, res, next) => {
  try {
    const version = String(req.body?.version ?? '');
    const targetStage = req.body?.targetStage as 'dev' | 'staging' | 'prod' | undefined;
    if (!version || !targetStage) {
      res.status(400).json({ error: 'ValidationError', message: 'version and targetStage are required' });
      return;
    }
    const result = modelRegistry.promote(req.params.modelId, version, targetStage);
    await logAudit({
      userId: req.user?.userId,
      action: 'mlops.model_promoted',
      resource: '/api/v1/mlops/registry/:modelId/promote',
      metadata: { modelId: req.params.modelId, version, targetStage, result },
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/mlops/approval-gates/:gateId/approve */
mlopsRouter.post('/approval-gates/:gateId/approve', async (req, res, next) => {
  try {
    const record = modelRegistry.approveGate(req.params.gateId);
    await logAudit({
      userId: req.user?.userId,
      action: 'mlops.approval_gate_approved',
      resource: '/api/v1/mlops/approval-gates/:gateId/approve',
      metadata: { gateId: req.params.gateId, modelVersion: record.version },
    });
    res.json({ data: record });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/mlops/approval-gates */
mlopsRouter.get('/approval-gates', (_req, res) => {
  res.json({ data: modelRegistry.listApprovalGates() });
});

/** GET /api/v1/mlops/drift?modelId= */
mlopsRouter.get('/drift', (req, res) => {
  const modelId = String(req.query.modelId ?? 'flight_delay_v1');
  res.json({ data: driftMonitor.evaluate(modelId) });
});

/** POST /api/v1/mlops/drift/simulate — checkpoint helper */
mlopsRouter.post('/drift/simulate', async (req, res, next) => {
  try {
    const modelId = String(req.body?.modelId ?? 'flight_delay_v1');
    const driftScore = Number(req.body?.driftScore ?? 0.42);
    const executeRollback = req.body?.executeRollback !== false;
    const result = executeRollback
      ? mlopsOrchestrator.simulateDriftWithRollback(modelId, driftScore)
      : {
          drift: driftMonitor.evaluate(modelId, driftScore),
          approvalGate: modelRegistry.createDriftApprovalGate(
            modelId,
            driftMonitor.evaluate(modelId, driftScore).activeVersion,
            driftScore
          ),
          rollback: null,
        };
    await logAudit({
      userId: req.user?.userId,
      action: 'mlops.drift_simulated',
      resource: '/api/v1/mlops/drift/simulate',
      metadata: { modelId, driftScore, executeRollback },
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/mlops/rollback */
mlopsRouter.post('/rollback', async (req, res, next) => {
  try {
    const modelId = String(req.body?.modelId ?? '');
    const approvalGateId = req.body?.approvalGateId
      ? String(req.body.approvalGateId)
      : undefined;
    if (!modelId) {
      res.status(400).json({ error: 'ValidationError', message: 'modelId is required' });
      return;
    }
    const result = rollbackService.execute(modelId, approvalGateId);
    await logAudit({
      userId: req.user?.userId,
      action: 'mlops.rollback_executed',
      resource: '/api/v1/mlops/rollback',
      metadata: { ...result },
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});
