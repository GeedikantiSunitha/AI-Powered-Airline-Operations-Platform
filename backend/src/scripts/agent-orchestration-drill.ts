/**
 * Phase 14 checkpoint — multi-step orchestration with 2+ agents, tools, approval.
 */
import { supervisor } from '../services/copilot/supervisor';
import { agentEvaluation } from '../services/copilot/agentEvaluation';
import { getAuditEvents, logAudit } from '../middleware/audit';

async function run(): Promise<void> {
  const prompt =
    'Analyze AI-302 delay risk and crew reassignment options with recommended actions';
  const orchestration = await supervisor.executeMultiStep(prompt, 'operations_manager');
  await logAudit({
    action: 'copilot.multi_agent_orchestrated',
    resource: '/api/v1/copilot/orchestrate',
    metadata: {
      prompt,
      supervisorPlan: orchestration.supervisorPlan,
      toolCalls: orchestration.toolCalls,
      approvalRequired: orchestration.approvalRequired,
      latencyMs: orchestration.latencyMs,
    },
  });
  const scores = agentEvaluation.evaluate(orchestration);
  const audit = getAuditEvents().filter((event) => event.action.includes('copilot'));

  const checkpointPassed =
    orchestration.supervisorPlan.length >= 2 &&
    orchestration.steps.length >= 2 &&
    orchestration.toolCalls.length >= 2 &&
    orchestration.approvalRequired === true &&
    orchestration.recommendation.length > 0 &&
    scores.passed;

  console.log(
    JSON.stringify(
      {
        ok: checkpointPassed,
        supervisorPlan: orchestration.supervisorPlan,
        stepAgents: orchestration.steps.map((step) => step.agent),
        toolCallCount: orchestration.toolCalls.length,
        approvalRequired: orchestration.approvalRequired,
        latencyMs: orchestration.latencyMs,
        evaluation: scores,
        auditActions: audit.map((event) => event.action),
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
