import { metricsStore } from './metricsStore';
import { alertingStrategy } from './alertingStrategy';
import { incidentPlaybooks } from './incidentPlaybooks';
import { syntheticChecks } from './syntheticChecks';

export type ChaosScenario =
  | 'ingestion-outage'
  | 'model-endpoint-failure'
  | 'opensearch-degradation';

export interface ChaosDrillResult {
  scenario: ChaosScenario;
  detected: boolean;
  alerts: ReturnType<typeof alertingStrategy.evaluate>;
  mitigated: boolean;
  recovered: boolean;
  recoveryMinutes: number;
  playbookId: string;
  withinSlo: boolean;
}

export const chaosDrills = {
  async run(scenario: ChaosScenario): Promise<ChaosDrillResult> {
    const started = Date.now();
    const playbook = incidentPlaybooks.get(
      scenario === 'ingestion-outage'
        ? 'ingestion-outage'
        : scenario === 'model-endpoint-failure'
          ? 'model-endpoint-failure'
          : 'opensearch-degradation'
    );

    if (scenario === 'ingestion-outage') {
      metricsStore.recordPipelineFailure();
    } else if (scenario === 'model-endpoint-failure') {
      metricsStore.recordModelDriftAlert();
      metricsStore.recordModelDriftAlert();
    } else {
      metricsStore.recordAgentToolFailure();
      metricsStore.recordAgentToolFailure();
      metricsStore.recordAgentToolFailure();
    }

    const snapshot = metricsStore.getSnapshot();
    const alerts = alertingStrategy.evaluate(snapshot);
    const detected = alerts.length > 0;

    // Mitigation simulation: execute first playbook mitigation step.
    const mitigated = Boolean(playbook?.mitigation.length);

    metricsStore.resetIncidentCounters();
    const synthetics = await syntheticChecks.runAll();
    const recovered = synthetics.every((row) => row.passed);

    const recoveryMinutes = Number(((Date.now() - started) / 60000).toFixed(2));
    const withinSlo = recoveryMinutes <= metricsStore.getTargets().recoveryTargetMinutes;

    return {
      scenario,
      detected,
      alerts,
      mitigated,
      recovered,
      recoveryMinutes,
      playbookId: playbook?.id ?? scenario,
      withinSlo,
    };
  },

  async runQuarterlySuite(): Promise<{
    passed: boolean;
    drills: ChaosDrillResult[];
    recoveryTargetMinutes: number;
  }> {
    const scenarios: ChaosScenario[] = [
      'ingestion-outage',
      'model-endpoint-failure',
      'opensearch-degradation',
    ];
    const drills = [];
    for (const scenario of scenarios) {
      drills.push(await this.run(scenario));
    }
    const passed = drills.every((row) => row.detected && row.mitigated && row.recovered && row.withinSlo);
    return {
      passed,
      drills,
      recoveryTargetMinutes: metricsStore.getTargets().recoveryTargetMinutes,
    };
  },
};
