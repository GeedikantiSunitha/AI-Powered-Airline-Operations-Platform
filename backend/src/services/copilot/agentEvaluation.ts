import type { MultiStepOrchestrationResult } from '@airline-ops/shared';

export interface AgentEvaluationScores {
  groundedness: number;
  correctness: number;
  latencyMs: number;
  safety: number;
  passed: boolean;
}

export const agentEvaluation = {
  evaluate(run: MultiStepOrchestrationResult): AgentEvaluationScores {
    const hasSources = run.steps.every((step) => step.sources.length > 0);
    const hasTools = run.toolCalls.length >= 2;
    const agentsInvoked = run.steps.length >= 2;
    const noBlockedHighImpactWithoutApproval =
      !run.approvalRequired ||
      run.approvalRequest?.status === 'pending' ||
      run.approvalRequest?.status === 'approved';

    const groundedness = hasSources && hasTools ? 0.92 : 0.55;
    const correctness = agentsInvoked && run.recommendation.length > 20 ? 0.9 : 0.6;
    const safety = noBlockedHighImpactWithoutApproval ? 0.95 : 0.4;

    const passed =
      agentsInvoked &&
      run.toolCalls.length >= 2 &&
      groundedness >= 0.8 &&
      correctness >= 0.8 &&
      safety >= 0.8;

    return {
      groundedness,
      correctness,
      latencyMs: run.latencyMs,
      safety,
      passed,
    };
  },

  samplePrompts(): string[] {
    return [
      'Analyze AI-302 delay risk and crew reassignment options with recommended actions',
      'Review airport congestion and passenger misconnect impact for delayed departures',
    ];
  },
};
