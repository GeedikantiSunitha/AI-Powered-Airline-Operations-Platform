import { Router } from 'express';
import { bedrockClient } from '../services/copilot/bedrockClient';
import { createTraceId, getAuditEvents, logAudit } from '../middleware/audit';
import { logCopilotAuditChain } from '../services/security/auditChainLogger';
import { supervisor } from '../services/copilot/supervisor';
import { randomUUID } from 'crypto';
import { knowledgeBase } from '../services/copilot/knowledgeBase';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import type { UserRole } from '@airline-ops/shared';
import { agentEvaluation } from '../services/copilot/agentEvaluation';

export const copilotRouter = Router();
copilotRouter.use(requireAuth, requireRole('admin', 'operations_manager', 'crew_manager'));

interface ApprovalRequest {
  approvalId: string;
  prompt: string;
  recommendation: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
}

const approvalStore: ApprovalRequest[] = [];

function attachApproval(
  prompt: string,
  recommendation: string,
  requiresApproval: boolean
): ApprovalRequest | null {
  if (!requiresApproval) return null;
  const approval: ApprovalRequest = {
    approvalId: randomUUID(),
    prompt,
    recommendation,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  approvalStore.unshift(approval);
  return approval;
}

/** POST /api/v1/copilot/chat — Phase 8 / 14 */
copilotRouter.post('/chat', async (req, res, next) => {
  try {
    const {
      message,
      history = [],
    } = req.body as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };
    if (!message || !message.trim()) {
      res.status(400).json({ error: 'ValidationError', message: 'message is required' });
      return;
    }

    const role = (req.user?.role ?? 'viewer') as UserRole;
    const transcript = [...history, { role: 'user' as const, content: message }];
    const plan = supervisor.routeMulti(message);
    const useOrchestration = plan.length >= 2;

    if (useOrchestration) {
      const traceId = createTraceId();
      const orchestration = await supervisor.executeMultiStep(message, role);
      const approval = attachApproval(message, orchestration.recommendation, orchestration.approvalRequired);
      if (approval) orchestration.approvalRequest = approval;

      await logCopilotAuditChain({
        traceId,
        userId: req.user?.userId,
        prompt: message,
        toolCalls: orchestration.toolCalls,
        recommendation: orchestration.recommendation,
        approvalRequired: orchestration.approvalRequired,
        approvalId: approval?.approvalId ?? null,
        modelDecision: {
          supervisorPlan: orchestration.supervisorPlan,
          latencyMs: orchestration.latencyMs,
        },
      });

      await logAudit({
        traceId,
        category: 'ai',
        userId: req.user?.userId,
        action: 'copilot.multi_agent_orchestrated',
        resource: '/api/v1/copilot/chat',
        metadata: {
          prompt: message,
          supervisorPlan: orchestration.supervisorPlan,
          toolCalls: orchestration.toolCalls,
          approvalRequired: orchestration.approvalRequired,
          approvalId: approval?.approvalId ?? null,
          latencyMs: orchestration.latencyMs,
        },
      });

      res.json({
        data: {
          traceId,
          message: {
            role: 'assistant',
            content: orchestration.recommendation,
            confidence:
              orchestration.steps.reduce((sum, step) => sum + step.confidence, 0) /
              Math.max(1, orchestration.steps.length),
          },
          sources: orchestration.steps.flatMap((step) => step.sources),
          agent: orchestration.supervisorPlan.join(' + '),
          toolCalls: orchestration.toolCalls,
          orchestration,
          approvalRequired: orchestration.approvalRequired,
          approvalRequest: approval,
        },
      });
      return;
    }

    const routedAgent = await supervisor.route(message);
    const shouldUseSpecialist =
      routedAgent !== 'flight-delay' ||
      /crew|reassign|duty|congestion|runway|gate|fuel|passenger|rebook|misconnect/i.test(message);

    const specialistResult = shouldUseSpecialist ? await supervisor.execute(message, role) : null;
    const result = specialistResult
      ? {
          message: {
            role: 'assistant' as const,
            content: specialistResult.content,
            confidence: specialistResult.confidence,
          },
          sources: specialistResult.sources,
        }
      : await bedrockClient.chat(transcript);

    if (specialistResult) {
      await logAudit({
        userId: req.user?.userId,
        action: 'copilot.agent_routed',
        resource: '/api/v1/copilot/chat',
        metadata: {
          agent: specialistResult.agent,
          prompt: message,
          toolCalls: specialistResult.toolCalls,
          confidence: specialistResult.confidence,
        },
      });
    }

    const requiresApproval =
      /mass|cancel|override|ground|reroute all/i.test(result.message.content) ||
      specialistResult?.toolCalls.some((call) => call.name === 'suggest_crew_swap') === true;

    const approval = attachApproval(message, result.message.content, requiresApproval);

    await logAudit({
      userId: req.user?.userId,
      action: 'copilot.response_generated',
      resource: '/api/v1/copilot/chat',
      metadata: {
        prompt: message,
        sources: result.sources,
        response: result.message.content,
        confidence: result.message.confidence ?? specialistResult?.confidence ?? null,
        approvalRequired: requiresApproval,
        approvalId: approval?.approvalId ?? null,
      },
    });

    res.json({
      data: {
        message: result.message,
        sources: result.sources,
        agent: specialistResult?.agent ?? 'bedrock-general',
        toolCalls: specialistResult?.toolCalls ?? [],
        approvalRequired: requiresApproval,
        approvalRequest: approval,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/copilot/orchestrate — Phase 14 multi-step */
copilotRouter.post('/orchestrate', async (req, res, next) => {
  try {
    const message = String(req.body?.message ?? '').trim();
    if (!message) {
      res.status(400).json({ error: 'ValidationError', message: 'message is required' });
      return;
    }
    const role = (req.user?.role ?? 'viewer') as UserRole;
    const traceId = createTraceId();
    const orchestration = await supervisor.executeMultiStep(message, role);
    const approval = attachApproval(message, orchestration.recommendation, orchestration.approvalRequired);
    if (approval) orchestration.approvalRequest = approval;

    await logCopilotAuditChain({
      traceId,
      userId: req.user?.userId,
      prompt: message,
      toolCalls: orchestration.toolCalls,
      recommendation: orchestration.recommendation,
      approvalRequired: orchestration.approvalRequired,
      approvalId: approval?.approvalId ?? null,
      modelDecision: { supervisorPlan: orchestration.supervisorPlan },
    });

    await logAudit({
      traceId,
      category: 'ai',
      userId: req.user?.userId,
      action: 'copilot.multi_agent_orchestrated',
      resource: '/api/v1/copilot/orchestrate',
      metadata: {
        prompt: message,
        supervisorPlan: orchestration.supervisorPlan,
        toolCalls: orchestration.toolCalls,
        approvalRequired: orchestration.approvalRequired,
        approvalId: approval?.approvalId ?? null,
        latencyMs: orchestration.latencyMs,
      },
    });

    res.json({ data: { ...orchestration, traceId } });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/copilot/evaluation/sample — Phase 14 */
copilotRouter.get('/evaluation/sample', async (req, res, next) => {
  try {
    const role = (req.user?.role ?? 'operations_manager') as UserRole;
    const resolved = [];
    for (const prompt of agentEvaluation.samplePrompts()) {
      const run = await supervisor.executeMultiStep(prompt, role);
      resolved.push({ prompt, scores: agentEvaluation.evaluate(run) });
    }
    res.json({ data: resolved });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/copilot/audit */
copilotRouter.get('/audit', async (_req, res) => {
  const audit = getAuditEvents().filter((event) => event.action.startsWith('copilot.'));
  res.json({ data: audit });
});

/** GET /api/v1/copilot/knowledge/documents */
copilotRouter.get('/knowledge/documents', async (_req, res) => {
  const documents = knowledgeBase.listDocuments();
  res.json({ data: documents });
});

/** POST /api/v1/copilot/knowledge/search */
copilotRouter.post('/knowledge/search', async (req, res) => {
  const query = String(req.body?.query ?? '').trim();
  const topK = Math.max(1, Math.min(5, Number(req.body?.topK ?? 3)));
  if (!query) {
    res.status(400).json({ error: 'ValidationError', message: 'query is required' });
    return;
  }
  const result = knowledgeBase.search(query, topK);
  if (!result) {
    res.json({ data: { answer: 'No matching policy documents found.', citations: [] } });
    return;
  }
  res.json({ data: result });
});

/** GET /api/v1/copilot/approvals */
copilotRouter.get('/approvals', async (_req, res) => {
  res.json({ data: approvalStore });
});

/** POST /api/v1/copilot/approvals/:approvalId */
copilotRouter.post('/approvals/:approvalId', async (req, res) => {
  const approval = approvalStore.find((item) => item.approvalId === req.params.approvalId);
  if (!approval) {
    res.status(404).json({ error: 'NotFound', message: 'Approval request not found' });
    return;
  }
  const decision = req.body?.decision as 'approved' | 'rejected' | undefined;
  if (!decision) {
    res.status(400).json({ error: 'ValidationError', message: 'decision is required' });
    return;
  }
  approval.status = decision;
  approval.resolvedAt = new Date().toISOString();
  await logAudit({
    userId: req.user?.userId,
    action: 'copilot.approval_decision',
    resource: '/api/v1/copilot/approvals/:approvalId',
    metadata: { approvalId: approval.approvalId, decision },
  });
  res.json({ data: approval });
});
