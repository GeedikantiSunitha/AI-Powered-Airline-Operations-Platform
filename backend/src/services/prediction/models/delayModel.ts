import type { DelayModelOutput, DelayPrediction, FlightLeg, UnifiedModelPrediction } from '@airline-ops/shared';
import { modelRegistry } from '../../mlops/modelRegistry';
import { wrapPrediction } from '../unified';

interface DelayFeatures {
  inboundDelayMinutes: number;
  destWeatherRiskScore: number;
  originCongestionScore: number;
  crewLegalFlag: number;
  rotationSlackMinutes: number;
}

const AIRPORT_WEATHER_RISK: Record<string, number> = {
  BOM: 0.42,
  DEL: 0.35,
  BLR: 0.28,
  DXB: 0.21,
};

const AIRPORT_CONGESTION: Record<string, number> = {
  BOM: 0.63,
  DEL: 0.58,
  BLR: 0.47,
  DXB: 0.39,
};

function buildFeatures(flight: FlightLeg): DelayFeatures {
  const inboundDelayMinutes = flight.delayMinutes ?? 0;
  return {
    inboundDelayMinutes,
    destWeatherRiskScore: AIRPORT_WEATHER_RISK[flight.destination] ?? 0.2,
    originCongestionScore: AIRPORT_CONGESTION[flight.origin] ?? 0.25,
    crewLegalFlag: 1,
    rotationSlackMinutes: Math.max(5, 40 - inboundDelayMinutes),
  };
}

function scoreRisk(features: DelayFeatures): number {
  const weighted =
    0.82 * Math.min(1, features.inboundDelayMinutes / 60) +
    0.2 * features.destWeatherRiskScore +
    0.03 * features.originCongestionScore +
    0.02 * (1 - Math.min(1, features.rotationSlackMinutes / 40));
  return Math.min(0.99, Math.max(0.01, weighted));
}

export const delayModel = {
  predictUnified(flight: FlightLeg): UnifiedModelPrediction<DelayModelOutput> {
    const features = buildFeatures(flight);
    const delayProbability = scoreRisk(features);
    const predictedDelayMinutes = Math.round(
      10 +
        features.inboundDelayMinutes * 0.65 +
        features.destWeatherRiskScore * 24 +
        features.originCongestionScore * 18
    );

    const activeVersion = modelRegistry.getActiveProdVersion('flight_delay_v1')?.version ?? '1.1.0';

    return wrapPrediction({
      model: 'flight_delay_v1',
      version: activeVersion,
      flightLegId: flight.flightLegId,
      confidence: delayProbability,
      features: {
        inbound_delay_minutes: features.inboundDelayMinutes,
        dest_weather_risk_score: features.destWeatherRiskScore,
        origin_congestion_score: features.originCongestionScore,
        crew_legal_flag: features.crewLegalFlag,
        rotation_slack_minutes: features.rotationSlackMinutes,
      },
      output: {
        delayProbability: Number(delayProbability.toFixed(2)),
        predictedDelayMinutes,
      },
      factors: [
        { factor: 'inbound_delay_minutes', weight: features.inboundDelayMinutes },
        { factor: 'dest_weather_risk_score', weight: features.destWeatherRiskScore },
        { factor: 'origin_congestion_score', weight: features.originCongestionScore },
      ],
      shapSummary:
        'Inbound delay and destination weather risk contribute most to predicted departure slip.',
    });
  },

  predictLegacy(flight: FlightLeg): DelayPrediction {
    const unified = this.predictUnified(flight);
    return {
      flightLegId: flight.flightLegId,
      predictedAt: unified.predictedAt,
      delayProbability: unified.output.delayProbability,
      predictedDelayMinutes: unified.output.predictedDelayMinutes,
      topFactors: unified.explainability.topFactors.map((factor) => ({
        factor: factor.factor,
        weight: factor.weight,
      })),
    };
  },
};
