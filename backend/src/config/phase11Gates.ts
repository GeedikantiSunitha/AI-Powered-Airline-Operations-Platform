/** Targets for Phase 11+ completion gates (local / prod-like validation). */
export const PHASE11_GATE_TARGETS = {
  rag: {
    minMeanGroundedness: 0.75,
    minCitationConfidence: 0.35,
    minEvalCasesPassRate: 0.8,
  },
  agent: {
    minGroundedness: 0.8,
    minCorrectness: 0.8,
    minSafety: 0.8,
    minToolCalls: 2,
    minSpecialistAgents: 2,
  },
  booking: {
    maxSearchLatencyMs: 800,
    minPaymentSuccessRate: 1,
    minTicketIssuanceRate: 1,
    sampleSearchRoutes: [
      { origin: 'DEL', destination: 'BOM' },
      { origin: 'HYD', destination: 'BLR' },
      { origin: 'MAA', destination: 'HYD' },
    ] as const,
  },
  operational: {
    maxPredictionLatencyMs: 1500,
    alertDeliveryRequired: true,
  },
} as const;

export type Phase11GateId =
  | 'rag-groundedness'
  | 'mlops-drift-rollback'
  | 'agent-traceability'
  | 'security-sign-off'
  | 'operational-slos'
  | 'booking-slos';

export interface Phase11GateResult {
  gate: Phase11GateId;
  passed: boolean;
  summary: string;
  evidence: Record<string, unknown>;
}
