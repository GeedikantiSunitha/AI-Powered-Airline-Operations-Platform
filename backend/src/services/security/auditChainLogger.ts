import { logAudit } from '../../middleware/audit';

export async function logCopilotAuditChain(input: {
  traceId: string;
  userId?: string;
  prompt: string;
  toolCalls: unknown;
  recommendation: string;
  approvalRequired: boolean;
  approvalId?: string | null;
  modelDecision?: Record<string, unknown>;
}): Promise<void> {
  await logAudit({
    traceId: input.traceId,
    category: 'user',
    userId: input.userId,
    action: 'user.prompt_received',
    resource: '/api/v1/copilot',
    metadata: { prompt: input.prompt },
  });

  await logAudit({
    traceId: input.traceId,
    category: 'ai',
    userId: input.userId,
    action: 'ai.tool_calls_executed',
    resource: '/api/v1/copilot',
    metadata: { toolCalls: input.toolCalls },
  });

  if (input.modelDecision) {
    await logAudit({
      traceId: input.traceId,
      category: 'model',
      userId: input.userId,
      action: 'model.decision_recorded',
      resource: '/api/v1/predictions',
      metadata: input.modelDecision,
    });
  }

  await logAudit({
    traceId: input.traceId,
    category: 'ai',
    userId: input.userId,
    action: 'ai.recommendation_generated',
    resource: '/api/v1/copilot',
    metadata: { recommendation: input.recommendation },
  });

  await logAudit({
    traceId: input.traceId,
    category: 'ai',
    userId: input.userId,
    action: 'ai.approval_state_recorded',
    resource: '/api/v1/copilot/approvals',
    metadata: {
      approvalRequired: input.approvalRequired,
      approvalId: input.approvalId ?? null,
      status: input.approvalRequired ? 'pending' : 'not_required',
    },
  });
}
