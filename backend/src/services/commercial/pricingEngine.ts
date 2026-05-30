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
    'DEL-MAA': 1.17,
    'MAA-DEL': 1.16,
    'BOM-MAA': 1.14,
    'MAA-BOM': 1.13,
    'BLR-MAA': 1.08,
    'MAA-BLR': 1.07,
    'HYD-MAA': 1.09,
    'MAA-HYD': 1.08,
    'DEL-CCU': 1.19,
    'CCU-DEL': 1.18,
    'BOM-CCU': 1.15,
    'CCU-BOM': 1.14,
    'BLR-CCU': 1.12,
    'CCU-BLR': 1.11,
    'DEL-PNQ': 1.13,
    'PNQ-DEL': 1.12,
    'BOM-PNQ': 1.1,
    'PNQ-BOM': 1.09,
    'BOM-GOI': 1.22,
    'GOI-BOM': 1.21,
    'DEL-GOI': 1.24,
    'GOI-DEL': 1.23,
    'BOM-DXB': 1.3,
    'DXB-BOM': 1.28,
    'BLR-DXB': 1.27,
    'DXB-BLR': 1.26,
    'MAA-DXB': 1.25,
    'DXB-MAA': 1.24,
    'DEL-LHR': 1.38,
    'LHR-DEL': 1.36,
    'BOM-LHR': 1.35,
    'LHR-BOM': 1.34,
    'DEL-JFK': 1.42,
    'JFK-DEL': 1.4,
    'BOM-JFK': 1.4,
    'JFK-BOM': 1.38,
    'DEL-EWR': 1.41,
    'EWR-DEL': 1.39,
    'DEL-ORD': 1.4,
    'ORD-DEL': 1.38,
    'DEL-SFO': 1.39,
    'SFO-DEL': 1.37,
    'DEL-IAD': 1.38,
    'IAD-DEL': 1.36,
    'BOM-EWR': 1.39,
    'EWR-BOM': 1.37,
    'BOM-ORD': 1.38,
    'ORD-BOM': 1.36,
    'BLR-SFO': 1.37,
    'SFO-BLR': 1.35,
    'HYD-ORD': 1.36,
    'ORD-HYD': 1.34,
    'DEL-YYZ': 1.39,
    'YYZ-DEL': 1.37,
    'DEL-YVR': 1.38,
    'YVR-DEL': 1.36,
    'BOM-YYZ': 1.37,
    'YYZ-BOM': 1.35,
    'BLR-YYZ': 1.35,
    'YYZ-BLR': 1.33,
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
