import { metricsStore } from './metricsStore';
import { alertingStrategy } from './alertingStrategy';
import { syntheticChecks } from './syntheticChecks';

export const sreDashboard = {
  async getUnifiedDashboard() {
    const snapshot = metricsStore.getSnapshot();
    const targets = metricsStore.getTargets();
    const alerts = alertingStrategy.evaluate(snapshot);
    const synthetics = await syntheticChecks.runAll();

    return {
      updatedAt: new Date().toISOString(),
      slo: {
        snapshot,
        targets,
        met: metricsStore.meetsSlo(snapshot),
      },
      widgets: {
        pipelineHealth: {
          score: snapshot.pipelineHealthScore,
          status: snapshot.pipelineHealthScore >= targets.pipelineHealthMin ? 'healthy' : 'degraded',
        },
        modelHealth: {
          score: snapshot.modelHealthScore,
          status: snapshot.modelHealthScore >= targets.modelHealthMin ? 'healthy' : 'degraded',
        },
        agentLatency: {
          p95Ms: snapshot.agentLatencyP95Ms,
          targetMs: targets.agentLatencyP95Ms,
          healthScore: snapshot.agentHealthScore,
        },
        apiSlo: {
          latencyP95Ms: snapshot.apiLatencyP95Ms,
          errorRatePct: snapshot.apiErrorRatePct,
          targetLatencyP95Ms: targets.apiLatencyP95Ms,
          targetErrorRatePct: targets.apiErrorRatePct,
        },
      },
      activeAlerts: alerts,
      syntheticChecks: synthetics,
    };
  },
};
