import type { DynamicFareRecommendation, FareClass } from '@airline-ops/shared';
import { flightInventory } from '../../data/mockInventory';
import { mockFlights } from '../../data/mockFlights';

function demandIndexForRoute(origin: string, destination: string): number {
  const key = `${origin}-${destination}`;
  const popular: Record<string, number> = {
    'DEL-BOM': 1.25,
    'BOM-BLR': 1.1,
    'DEL-DXB': 1.35,
  };
  return popular[key] ?? 1.0;
}

export const pricingEngine = {
  computeFare(
    flightLegId: string,
    fareClass: FareClass,
    passengers = 1
  ): DynamicFareRecommendation | null {
    const inv = flightInventory[flightLegId];
    const flight = mockFlights.find((f) => f.flightLegId === flightLegId);
    if (!inv || !flight) return null;

    const loadFactorPct = Number(((inv.bookedSeats / inv.capacity) * 100).toFixed(1));
    const demandIndex = demandIndexForRoute(flight.origin, flight.destination);
    const scarcityBoost = loadFactorPct > 85 ? 1.15 : loadFactorPct > 70 ? 1.08 : 1.0;
    const delayDiscount = (flight.delayMinutes ?? 0) >= 30 ? 0.95 : 1.0;
    const priceMultiplier = Number((demandIndex * scarcityBoost * delayDiscount).toFixed(3));
    const baseFareUsd = inv.fares[fareClass].baseUsd * passengers;
    const recommendedFareUsd = Number((baseFareUsd * priceMultiplier).toFixed(2));

    return {
      flightLegId,
      fareClass,
      baseFareUsd,
      demandIndex,
      loadFactorPct,
      priceMultiplier,
      recommendedFareUsd,
      rationale: `Load ${loadFactorPct}%, demand ${demandIndex}, scarcity ${scarcityBoost}`,
    };
  },

  listForFlight(flightLegId: string): DynamicFareRecommendation[] {
    const classes: FareClass[] = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS'];
    return classes
      .map((fareClass) => this.computeFare(flightLegId, fareClass))
      .filter((row): row is DynamicFareRecommendation => row !== null);
  },
};
