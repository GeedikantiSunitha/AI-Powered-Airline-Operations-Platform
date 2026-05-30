import type { DynamicFareRecommendation, FareClass } from '@airline-ops/shared';
import { flightInventory } from '../../data/mockInventory';
import { mockFlights } from '../../data/mockFlights';
import { commercialConfigService } from './commercialConfigService';

function demandIndexForRoute(origin: string, destination: string): number {
  const key = `${origin}-${destination}`;
  const popular: Record<string, number> = {
    'DEL-BOM': 1.25,
    'BOM-BLR': 1.1,
    'DEL-DXB': 1.35,
    'DXB-DEL': 1.32,
    'BOM-DEL': 1.2,
    'DEL-BLR': 1.15,
    'BLR-DEL': 1.12,
    'DEL-HYD': 1.18,
    'HYD-DEL': 1.16,
    'BOM-HYD': 1.14,
    'HYD-BOM': 1.13,
    'BLR-HYD': 1.1,
    'HYD-BLR': 1.09,
    'HYD-DXB': 1.28,
    'DXB-HYD': 1.26,
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

    const rules = commercialConfigService.getFareRules();
    const loadFactorPct = Number(((inv.bookedSeats / inv.capacity) * 100).toFixed(1));
    const demandIndex = demandIndexForRoute(flight.origin, flight.destination);
    const scarcityBoost = loadFactorPct > 85 ? 1.15 : loadFactorPct > 70 ? 1.08 : 1.0;
    const delayDiscount = (flight.delayMinutes ?? 0) >= 30 ? 0.95 : 1.0;
    let priceMultiplier = rules.dynamicPricingEnabled
      ? demandIndex * scarcityBoost * delayDiscount
      : 1.0;
    priceMultiplier = Math.min(
      rules.maxPriceMultiplier,
      Math.max(rules.minPriceMultiplier, priceMultiplier)
    );
    priceMultiplier = Number(priceMultiplier.toFixed(3));
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
