import type {
  FlightLeg,
  PassengerDisruptionOutput,
  UnifiedModelPrediction,
} from '@airline-ops/shared';
import { wrapPrediction } from '../unified';

function rebookingPriority(score: number): PassengerDisruptionOutput['rebookingPriority'] {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.35) return 'MEDIUM';
  return 'LOW';
}

export const passengerModel = {
  predictUnified(flight: FlightLeg): UnifiedModelPrediction<PassengerDisruptionOutput> {
    const delayMinutes = flight.delayMinutes ?? 0;
    const connectionDensity = flight.destination === 'DXB' ? 0.72 : 0.48;
    const premiumMix = flight.flightNumber.includes('118') ? 0.58 : 0.32;
    const misconnectRiskScore = Number(
      Math.min(0.98, delayMinutes / 90 + connectionDensity * 0.35).toFixed(2)
    );
    const affectedPassengerEstimate = Math.round(90 + delayMinutes * 1.4 + connectionDensity * 40);
    const compensationExposureUsd = Math.round(
      affectedPassengerEstimate * (45 + premiumMix * 80) * misconnectRiskScore
    );
    const priority = rebookingPriority(misconnectRiskScore);

    return wrapPrediction({
      model: 'passenger_disruption_v1',
      version: '1.1.0',
      flightLegId: flight.flightLegId,
      confidence: Math.min(0.94, 0.5 + misconnectRiskScore * 0.4),
      features: {
        delay_minutes: delayMinutes,
        connection_density: connectionDensity,
        premium_mix_ratio: premiumMix,
        hub_complexity: flight.origin === 'BOM' || flight.destination === 'BOM' ? 'high' : 'medium',
      },
      output: {
        misconnectRiskScore,
        compensationExposureUsd,
        affectedPassengerEstimate,
        rebookingPriority: priority,
      },
      factors: [
        { factor: 'delay_minutes', weight: delayMinutes },
        { factor: 'connection_density', weight: connectionDensity },
        { factor: 'premium_mix_ratio', weight: premiumMix },
      ],
      shapSummary:
        'Delay minutes and hub connection density are the strongest contributors to misconnect and compensation risk.',
    });
  },
};
