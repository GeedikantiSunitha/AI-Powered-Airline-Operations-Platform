import { bookingPersistence } from '../booking/bookingPersistence';
import { adminPersistence } from './adminPersistence';
import { sreDashboard } from '../sre/sreDashboard';
import { metricsStore } from '../sre/metricsStore';
import { revenueDashboard } from '../commercial/revenueDashboard';
import { cognitoAuth } from '../auth/cognitoAuth';

function fallbackSre(): Awaited<ReturnType<typeof sreDashboard.getUnifiedDashboard>> {
  const snapshot = metricsStore.getSnapshot();
  const targets = metricsStore.getTargets();
  return {
    updatedAt: new Date().toISOString(),
    slo: { snapshot, targets, met: false },
    widgets: {
      pipelineHealth: { score: snapshot.pipelineHealthScore, status: 'degraded' },
      modelHealth: { score: snapshot.modelHealthScore, status: 'degraded' },
      agentLatency: { p95Ms: snapshot.agentLatencyP95Ms, targetMs: targets.agentLatencyP95Ms, healthScore: snapshot.agentHealthScore },
      apiSlo: {
        latencyP95Ms: snapshot.apiLatencyP95Ms,
        errorRatePct: snapshot.apiErrorRatePct,
        targetLatencyP95Ms: targets.apiLatencyP95Ms,
        targetErrorRatePct: targets.apiErrorRatePct,
      },
    },
    activeAlerts: [],
    syntheticChecks: [],
  };
}

export const adminHubService = {
  async getSystemHealthHub() {
    const [sre, revenue, flags] = await Promise.all([
      Promise.race([
        sreDashboard.getUnifiedDashboard(),
        new Promise<Awaited<ReturnType<typeof sreDashboard.getUnifiedDashboard>>>((resolve) => {
          setTimeout(() => resolve(fallbackSre()), 2000);
        }),
      ]),
      Promise.resolve(revenueDashboard.getDashboard()),
      Promise.race([
        adminPersistence.listFeatureFlags(),
        new Promise<Awaited<ReturnType<typeof adminPersistence.listFeatureFlags>>>((resolve) =>
          setTimeout(() => resolve([]), 1500)
        ),
      ]),
    ]);

    const disabledModules = flags.filter((f) => !f.enabled).map((f) => f.flagKey);

    return {
      generatedAt: new Date().toISOString(),
      persistence: {
        bookings: bookingPersistence.isEnabled(),
        admin: adminPersistence.isEnabled(),
      },
      auth: cognitoAuth.getConfig(),
      sre: {
        sloMet: sre.slo.met,
        activeAlerts: sre.activeAlerts.length,
        syntheticChecks: sre.syntheticChecks,
      },
      booking: {
        funnel: revenue.funnel,
        revenue: revenue.revenue,
        operationalConstraints: revenue.operationalConstraints.slice(0, 5),
      },
      featureFlags: {
        total: flags.length,
        disabled: disabledModules,
      },
    };
  },
};
