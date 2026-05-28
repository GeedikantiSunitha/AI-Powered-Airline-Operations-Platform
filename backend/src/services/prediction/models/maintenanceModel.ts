import type { FlightLeg, MaintenanceModelOutput, UnifiedModelPrediction } from '@airline-ops/shared';
import { wrapPrediction } from '../unified';

const AIRCRAFT_PROFILE: Record<string, { ageYears: number; cycles: number; lastAcheckDays: number }> = {
  'VT-EXA': { ageYears: 8.2, cycles: 12400, lastAcheckDays: 42 },
  'VT-EXB': { ageYears: 5.1, cycles: 8100, lastAcheckDays: 18 },
  'VT-EXC': { ageYears: 11.4, cycles: 16800, lastAcheckDays: 63 },
};

function componentAtRisk(aircraftRiskScore: number): string {
  if (aircraftRiskScore >= 0.75) return 'APU + bleed air system';
  if (aircraftRiskScore >= 0.55) return 'landing gear actuator';
  return 'hydraulic pump line';
}

export const maintenanceModel = {
  predictUnified(flight: FlightLeg): UnifiedModelPrediction<MaintenanceModelOutput> {
    const profile = AIRCRAFT_PROFILE[flight.aircraftRegistration] ?? {
      ageYears: 7,
      cycles: 10000,
      lastAcheckDays: 35,
    };
    const delayStress = Math.min(1, (flight.delayMinutes ?? 0) / 60);
    const ageFactor = Math.min(1, profile.ageYears / 15);
    const cycleFactor = Math.min(1, profile.cycles / 20000);
    const checkFactor = Math.min(1, profile.lastAcheckDays / 90);
    const aircraftRiskScore = Number(
      (0.35 * ageFactor + 0.3 * cycleFactor + 0.2 * checkFactor + 0.15 * delayStress).toFixed(2)
    );
    const component = componentAtRisk(aircraftRiskScore);
    const recommendedAction =
      aircraftRiskScore >= 0.7
        ? `Schedule targeted inspection for ${component} before next revenue cycle.`
        : `Monitor ${component}; defer maintenance unless risk crosses 0.75.`;
    const inspectionWindowHours = aircraftRiskScore >= 0.7 ? 12 : 48;

    return wrapPrediction({
      model: 'maintenance_risk_v1',
      version: '1.0.0',
      flightLegId: flight.flightLegId,
      aircraftRegistration: flight.aircraftRegistration,
      confidence: Math.min(0.92, 0.58 + aircraftRiskScore * 0.3),
      features: {
        aircraft_age_years: profile.ageYears,
        cycle_count: profile.cycles,
        days_since_acheck: profile.lastAcheckDays,
        operational_delay_stress: delayStress,
      },
      output: {
        aircraftRiskScore,
        recommendedAction,
        componentAtRisk: component,
        inspectionWindowHours,
      },
      factors: [
        { factor: 'aircraft_age_years', weight: profile.ageYears },
        { factor: 'cycle_count', weight: profile.cycles / 1000 },
        { factor: 'days_since_acheck', weight: profile.lastAcheckDays },
        { factor: 'operational_delay_stress', weight: delayStress },
      ],
      shapSummary:
        'Fleet age and cycle utilization dominate maintenance risk; recent operational delays increase inspection urgency.',
    });
  },
};
