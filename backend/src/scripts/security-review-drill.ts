/**
 * Phase 15 checkpoint — private inference posture + full copilot audit chain.
 */
import { createTraceId } from '../middleware/audit';
import { logCopilotAuditChain } from '../services/security/auditChainLogger';
import { securityReview } from '../services/security/securityReview';
import { supervisor } from '../services/copilot/supervisor';

async function run(): Promise<void> {
  const prompt =
    'Analyze AI-302 delay risk and crew reassignment options with recommended actions';
  const traceId = createTraceId();
  const orchestration = await supervisor.executeMultiStep(prompt, 'operations_manager');

  await logCopilotAuditChain({
    traceId,
    userId: 'u-admin',
    prompt,
    toolCalls: orchestration.toolCalls,
    recommendation: orchestration.recommendation,
    approvalRequired: orchestration.approvalRequired,
    approvalId: orchestration.approvalRequest?.approvalId ?? null,
    modelDecision: { supervisorPlan: orchestration.supervisorPlan },
  });

  const inference = securityReview.validateInferenceExposure();
  const chain = securityReview.validateAuditChain(traceId);
  const posture = securityReview.getPosture();

  const checkpointPassed = inference.privateOnly && chain.complete;

  console.log(
    JSON.stringify(
      {
        ok: checkpointPassed,
        traceId,
        publicInferenceEndpointCount: inference.publicEndpoints,
        privateInferenceOnly: inference.privateOnly,
        auditChainComplete: chain.complete,
        missingAuditActions: chain.missing,
        auditEventCount: chain.events.length,
        vpcEndpointCount: posture.vpcEndpoints.length,
        kmsKeyCount: posture.kmsKeys.length,
      },
      null,
      2
    )
  );

  if (!checkpointPassed) {
    process.exitCode = 1;
  }
}

void run();
