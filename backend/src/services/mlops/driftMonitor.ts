import type { DriftReport } from '@airline-ops/shared';
import { modelRegistry } from './modelRegistry';

const FEATURE_BASELINE: Record<string, number> = {
  inbound_delay_minutes: 0.18,
  dest_weather_risk_score: 0.22,
  origin_congestion_score: 0.15,
};

export const driftMonitor = {
  evaluate(modelId: string, simulatedDriftScore?: number): DriftReport {
    const active = modelRegistry.getActiveProdVersion(modelId);
    const { driftThreshold, dataQualityMin } = modelRegistry.thresholds();
    const driftScore =
      simulatedDriftScore ??
      Number((0.12 + Math.random() * 0.18 + (active?.version === '1.2.0' ? 0.2 : 0)).toFixed(2));

    const features = Object.entries(FEATURE_BASELINE).map(([name, baseline]) => {
      const psi = Number((baseline + driftScore * 0.35).toFixed(3));
      return { name, psi, breached: psi > driftThreshold };
    });

    const dataQualityScore = Number((1 - driftScore * 0.6).toFixed(2));
    const alertTriggered =
      driftScore > driftThreshold || dataQualityScore < dataQualityMin || features.some((f) => f.breached);

    return {
      modelId,
      activeVersion: active?.version ?? 'unknown',
      driftScore,
      dataQualityScore,
      threshold: driftThreshold,
      alertTriggered,
      checkedAt: new Date().toISOString(),
      features,
    };
  },
};
