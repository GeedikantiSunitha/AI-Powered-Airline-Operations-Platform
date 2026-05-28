import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { securityReview } from '../services/security/securityReview';
import { logAudit } from '../middleware/audit';

const REQUIRED_AUDIT_ACTIONS = [
  'user.prompt_received',
  'ai.tool_calls_executed',
  'ai.recommendation_generated',
  'ai.approval_state_recorded',
];

export const securityRouter = Router();
securityRouter.use(requireAuth, requireRole('admin', 'operations_manager'));

/** GET /api/v1/security/posture — Phase 15 */
securityRouter.get('/posture', (_req, res) => {
  res.json({ data: securityReview.getPosture() });
});

/** GET /api/v1/security/audit-chain?traceId= */
securityRouter.get('/audit-chain', (req, res) => {
  const traceId = String(req.query.traceId ?? '');
  if (!traceId) {
    res.status(400).json({ error: 'ValidationError', message: 'traceId is required' });
    return;
  }
  const validation = securityReview.validateAuditChain(traceId);
  res.json({ data: validation });
});

/** POST /api/v1/security/review/run — checkpoint helper */
securityRouter.post('/review/run', async (req, res) => {
  const traceId = String(req.body?.traceId ?? '');
  const inference = securityReview.validateInferenceExposure();
  const chain = traceId
    ? securityReview.validateAuditChain(traceId)
    : { complete: false, missing: REQUIRED_AUDIT_ACTIONS, events: [] };

  const passed = inference.privateOnly && chain.complete;
  await logAudit({
    category: 'security',
    userId: req.user?.userId,
    action: 'security.review_executed',
    resource: '/api/v1/security/review/run',
    metadata: { traceId, passed, inference, chainComplete: chain.complete },
  });

  res.json({
    data: {
      passed,
      inference,
      auditChain: chain,
    },
  });
});
