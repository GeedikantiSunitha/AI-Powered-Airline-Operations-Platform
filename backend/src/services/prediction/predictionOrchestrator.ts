import type { FlightScenarioPredictions } from '@airline-ops/shared';
import { flightService } from '../flights/flightService';
import { delayModel } from './models/delayModel';
import { maintenanceModel } from './models/maintenanceModel';
import { passengerModel } from './models/passengerModel';
import { weatherModel } from './models/weatherModel';

export const predictionOrchestrator = {
  async getScenario(flightLegId: string): Promise<FlightScenarioPredictions | null> {
    const flight = await flightService.getById(flightLegId);
    if (!flight) return null;

    const predictedAt = new Date().toISOString();
    return {
      flightLegId,
      predictedAt,
      predictions: {
        delay: delayModel.predictUnified(flight),
        weather: weatherModel.predictUnified(flight),
        passengerImpact: passengerModel.predictUnified(flight),
        maintenance: maintenanceModel.predictUnified(flight),
      },
    };
  },
};
