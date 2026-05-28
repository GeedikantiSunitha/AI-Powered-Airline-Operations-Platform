import type { SloSnapshot } from './metricsStore';
import { metricsStore } from './metricsStore';

export interface AlertRule {
  id: string;
  category: 'pipeline' | 'model' | 'api' | 'agent';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  condition: string;
  enabled: boolean;
}

export interface ActiveAlert {
  ruleId: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  triggeredAt: string;
}

const RULES: AlertRule[] = [
  {
    id: 'pipeline-failure',
    category: 'pipeline',
    severity: 'CRITICAL',
    condition: 'PipelineFailures > 0',
    enabled: true,
  },
  {
    id: 'model-drift',
    category: 'model',
    severity: 'WARNING',
    condition: 'ModelDriftScore > 0.25',
    enabled: true,
  },
  {
    id: 'api-error-rate',
    category: 'api',
    severity: 'CRITICAL',
    condition: 'ApiErrorRatePct > 1',
    enabled: true,
  },
  {
    id: 'agent-tool-failure',
    category: 'agent',
    severity: 'WARNING',
    condition: 'AgentToolFailureRate > 2%',
    enabled: true,
  },
  {
    id: 'synthetic-journey-fail',
    category: 'api',
    severity: 'CRITICAL',
    condition: 'SyntheticPassRatePct < 99',
    enabled: true,
  },
];

export const alertingStrategy = {
  listRules(): AlertRule[] {
    return RULES;
  },

  evaluate(snapshot: SloSnapshot): ActiveAlert[] {
    const targets = metricsStore.getTargets();
    const alerts: ActiveAlert[] = [];
    const now = new Date().toISOString();

    if (snapshot.pipelineHealthScore < targets.pipelineHealthMin) {
      alerts.push({
        ruleId: 'pipeline-failure',
        message: `Pipeline health ${snapshot.pipelineHealthScore} below ${targets.pipelineHealthMin}`,
        severity: 'CRITICAL',
        triggeredAt: now,
      });
    }
    if (snapshot.modelHealthScore < targets.modelHealthMin) {
      alerts.push({
        ruleId: 'model-drift',
        message: `Model health ${snapshot.modelHealthScore} below ${targets.modelHealthMin}`,
        severity: 'WARNING',
        triggeredAt: now,
      });
    }
    if (snapshot.apiErrorRatePct > targets.apiErrorRatePct) {
      alerts.push({
        ruleId: 'api-error-rate',
        message: `API error rate ${snapshot.apiErrorRatePct}% exceeds ${targets.apiErrorRatePct}%`,
        severity: 'CRITICAL',
        triggeredAt: now,
      });
    }
    if (snapshot.agentHealthScore < 0.75 || snapshot.agentLatencyP95Ms > targets.agentLatencyP95Ms) {
      alerts.push({
        ruleId: 'agent-tool-failure',
        message: `Agent health ${snapshot.agentHealthScore} degraded (latency p95 ${snapshot.agentLatencyP95Ms}ms)`,
        severity: 'WARNING',
        triggeredAt: now,
      });
    }
    if (snapshot.syntheticPassRatePct < targets.syntheticPassRatePct) {
      alerts.push({
        ruleId: 'synthetic-journey-fail',
        message: `Synthetic pass rate ${snapshot.syntheticPassRatePct}% below ${targets.syntheticPassRatePct}%`,
        severity: 'CRITICAL',
        triggeredAt: now,
      });
    }

    return alerts;
  },
};
