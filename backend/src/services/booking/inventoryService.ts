import type { FareClass, FlightSearchResult, SeatMap } from '@airline-ops/shared';
import { mockFlights } from '../../data/mockFlights';
import { buildSeatMap, flightInventory } from '../../data/mockInventory';
import { pricingEngine } from '../commercial/pricingEngine';

function physicalSeatsAvailable(flightLegId: string): number {
  const inv = flightInventory[flightLegId];
  if (!inv) return 0;
  const maxBookable = Math.floor(inv.capacity * (1 + inv.overbookingLimitPct / 100));
  return Math.max(0, maxBookable - inv.bookedSeats);
}

export const inventoryService = {
  physicalSeatsAvailable,

  search(input: { origin: string; destination: string; passengers: number }): FlightSearchResult[] {
    return mockFlights
      .filter(
        (f) =>
          (!input.origin || f.origin === input.origin.toUpperCase()) &&
          (!input.destination || f.destination === input.destination.toUpperCase())
      )
      .map((flight) => {
        const inv = flightInventory[flight.flightLegId];
        const dynamic = pricingEngine.computeFare(flight.flightLegId, 'ECONOMY', input.passengers);
        const fareFromUsd =
          dynamic?.recommendedFareUsd ?? (inv?.fares.ECONOMY.baseUsd ?? 150) * input.passengers;
        const maxBookable = inv
          ? Math.floor(inv.capacity * (1 + inv.overbookingLimitPct / 100))
          : 180;
        const availableSeats = Math.max(0, maxBookable - (inv?.bookedSeats ?? 0));
        return {
          flightLegId: flight.flightLegId,
          flightNumber: flight.flightNumber,
          origin: flight.origin,
          destination: flight.destination,
          scheduledDeparture: flight.scheduledDeparture,
          scheduledArrival: flight.scheduledArrival,
          availableSeats,
          fareFromUsd,
        };
      })
      .filter((row) => row.availableSeats >= input.passengers);
  },

  getSeatMap(flightLegId: string): SeatMap | null {
    const inv = flightInventory[flightLegId];
    if (!inv) return null;
    const seats = buildSeatMap(flightLegId);
    return {
      flightLegId,
      rows: 30,
      columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      seats,
      overbookingLimitPct: inv.overbookingLimitPct,
    };
  },

  reserveSeats(flightLegId: string, seatIds: string[], fareClass: FareClass): boolean {
    const inv = flightInventory[flightLegId];
    if (!inv) return false;
    const maxBookable = Math.floor(inv.capacity * (1 + inv.overbookingLimitPct / 100));
    if (inv.bookedSeats + seatIds.length > maxBookable) return false;
    inv.bookedSeats += seatIds.length;
    const fare = inv.fares[fareClass];
    fare.available = Math.max(0, fare.available - seatIds.length);
    return true;
  },

  releaseSeats(flightLegId: string, count: number): void {
    const inv = flightInventory[flightLegId];
    if (!inv) return;
    inv.bookedSeats = Math.max(0, inv.bookedSeats - count);
  },
};
