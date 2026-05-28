export interface SloSnapshot {
  apiLatencyP95Ms: number;
  apiErrorRatePct: number;
  pipelineHealthScore: number;
  modelHealthScore: number;
  agentHealthScore: number;
  agentLatencyP95Ms: number;
  syntheticPassRatePct: number;
  updatedAt: string;
}

const latencySamples: number[] = [];
const agentLatencySamples: number[] = [];
let errorCount = 0;
let requestCount = 0;
let pipelineFailures = 0;
let modelDriftAlerts = 0;
let agentToolFailures = 0;
let syntheticPassed = 0;
let syntheticTotal = 0;

const SLO_TARGETS = {
  apiLatencyP95Ms: 500,
  apiErrorRatePct: 1,
  pipelineHealthMin: 0.95,
  modelHealthMin: 0.9,
  agentLatencyP95Ms: 2000,
  syntheticPassRatePct: 99,
  recoveryTargetMinutes: 5,
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

export const metricsStore = {
  recordRequest(latencyMs: number, isError: boolean): void {
    requestCount += 1;
    latencySamples.push(latencyMs);
    if (latencySamples.length > 500) latencySamples.shift();
    if (isError) errorCount += 1;
  },

  recordAgentLatency(latencyMs: number): void {
    agentLatencySamples.push(latencyMs);
    if (agentLatencySamples.length > 200) agentLatencySamples.shift();
  },

  recordPipelineFailure(): void {
    pipelineFailures += 1;
  },

  recordModelDriftAlert(): void {
    modelDriftAlerts += 1;
  },

  recordAgentToolFailure(): void {
    agentToolFailures += 1;
  },

  recordSyntheticResult(passed: boolean): void {
    syntheticTotal += 1;
    if (passed) syntheticPassed += 1;
  },

  resetIncidentCounters(): void {
    pipelineFailures = 0;
    modelDriftAlerts = 0;
    agentToolFailures = 0;
  },

  getAgentToolFailures(): number {
    return agentToolFailures;
  },

  getSnapshot(): SloSnapshot {
    const apiLatencyP95Ms = percentile(latencySamples, 95) || 120;
    const apiErrorRatePct =
      requestCount === 0 ? 0 : Number(((errorCount / requestCount) * 100).toFixed(2));
    const pipelineHealthScore = Number(Math.max(0, 1 - pipelineFailures * 0.15).toFixed(2));
    const modelHealthScore = Number(Math.max(0, 1 - modelDriftAlerts * 0.2).toFixed(2));
    const agentHealthScore = Number(Math.max(0, 1 - agentToolFailures * 0.35).toFixed(2));
    const agentLatencyP95Ms = percentile(agentLatencySamples, 95) || 350;
    const syntheticPassRatePct =
      syntheticTotal === 0
        ? 100
        : Number(((syntheticPassed / syntheticTotal) * 100).toFixed(2));

    return {
      apiLatencyP95Ms,
      apiErrorRatePct,
      pipelineHealthScore,
      modelHealthScore,
      agentHealthScore,
      agentLatencyP95Ms,
      syntheticPassRatePct,
      updatedAt: new Date().toISOString(),
    };
  },

  getTargets() {
    return SLO_TARGETS;
  },

  meetsSlo(snapshot: SloSnapshot): boolean {
    const targets = SLO_TARGETS;
    return (
      snapshot.apiLatencyP95Ms <= targets.apiLatencyP95Ms &&
      snapshot.apiErrorRatePct <= targets.apiErrorRatePct &&
      snapshot.pipelineHealthScore >= targets.pipelineHealthMin &&
      snapshot.modelHealthScore >= targets.modelHealthMin &&
      snapshot.agentLatencyP95Ms <= targets.agentLatencyP95Ms &&
      snapshot.syntheticPassRatePct >= targets.syntheticPassRatePct
    );
  },
};
