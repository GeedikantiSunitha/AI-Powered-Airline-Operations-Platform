import type { FlightLeg } from '@airline-ops/shared';
import { mockFlights } from '../../data/mockFlights';

export interface FlightListFilters {
  status?: string;
  hub?: string;
  date?: string;
}

export const flightService = {
  async list(filters: FlightListFilters): Promise<FlightLeg[]> {
    let results = [...mockFlights];
    if (filters.status) {
      results = results.filter((f) => f.status === filters.status);
    }
    if (filters.hub) {
      results = results.filter(
        (f) => f.origin === filters.hub || f.destination === filters.hub
      );
    }
    return results;
  },

  async getById(flightLegId: string): Promise<FlightLeg | null> {
    return mockFlights.find((f) => f.flightLegId === flightLegId) ?? null;
  },

  async simulateDelay(
    flightLegId: string,
    delayMinutes: number
  ): Promise<FlightLeg | null> {
    const flight = mockFlights.find((f) => f.flightLegId === flightLegId);
    if (!flight) return null;

    const nextDeparture = new Date(
      flight.estimatedDeparture ?? flight.scheduledDeparture
    );
    nextDeparture.setMinutes(nextDeparture.getMinutes() + delayMinutes);

    flight.status = 'DELAYED';
    flight.delayMinutes = Math.max(delayMinutes, flight.delayMinutes ?? 0);
    flight.estimatedDeparture = nextDeparture.toISOString();
    flight.gate = flight.gate ?? 'TBD';
    return flight;
  },
};
