import type { FareClass, FlightLeg } from '@airline-ops/shared';

interface FlightInventory {
  flightLegId: string;
  capacity: number;
  bookedSeats: number;
  overbookingLimitPct: number;
  fares: Record<FareClass, { baseUsd: number; available: number }>;
}

const INDIAN = new Set(['BLR', 'BOM', 'CCU', 'DEL', 'GOI', 'HYD', 'MAA', 'PNQ']);

const FARE_BASE = { ECONOMY: 120, PREMIUM_ECONOMY: 220, BUSINESS: 480 };

function legDurationMinutes(f: FlightLeg): number {
  return Math.max(
    45,
    Math.round(
      (new Date(f.scheduledArrival).getTime() - new Date(f.scheduledDeparture).getTime()) / 60_000
    )
  );
}

function depIso(baseDate: string, hourUtc: number): string {
  return `${baseDate}T${String(hourUtc).padStart(2, '0')}:15:00.000Z`;
}

function arrIso(departureIso: string, durationMin: number): string {
  return new Date(new Date(departureIso).getTime() + durationMin * 60_000).toISOString();
}

/** Two IndiGo + two Vistara departures per domestic O-D (spread across time buckets). */
const EXTRA_SLOTS = [
  { carrier: '6E', suffix: 'AM', depHourUtc: 5 },
  { carrier: '6E', suffix: 'PM', depHourUtc: 14 },
  { carrier: 'UK', suffix: 'M', depHourUtc: 9 },
  { carrier: 'UK', suffix: 'E', depHourUtc: 19 },
] as const;

/**
 * Adds alternate-carrier flights for every unique domestic route in the base schedule.
 */
export function buildSupplementalFlights(existing: FlightLeg[]): FlightLeg[] {
  const seenRoute = new Set<string>();
  const supplemental: FlightLeg[] = [];

  for (const base of existing) {
    if (!INDIAN.has(base.origin) || !INDIAN.has(base.destination)) continue;
    const routeKey = `${base.origin}-${base.destination}`;
    if (seenRoute.has(routeKey)) continue;
    seenRoute.add(routeKey);

    const duration = legDurationMinutes(base);
    const baseDate = base.scheduledDeparture.slice(0, 10);

    for (const slot of EXTRA_SLOTS) {
      const flightNumber = `${slot.carrier}-${base.origin}${base.destination}-${slot.suffix}`;
      const flightLegId = `FL-20260521-${flightNumber}`;
      const scheduledDeparture = depIso(baseDate, slot.depHourUtc);
      supplemental.push({
        flightLegId,
        flightNumber,
        origin: base.origin,
        destination: base.destination,
        scheduledDeparture,
        scheduledArrival: arrIso(scheduledDeparture, duration),
        status: 'SCHEDULED',
        aircraftRegistration: `VT-X${slot.carrier}${base.origin}`,
        gate: `${slot.carrier}${slot.depHourUtc}`,
      });
    }
  }

  return supplemental;
}

function inv(legId: string, booked: number, economyExtra = 10): FlightInventory {
  return {
    flightLegId: legId,
    capacity: 180,
    bookedSeats: booked,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + economyExtra, available: 96 },
      PREMIUM_ECONOMY: {
        baseUsd: FARE_BASE.PREMIUM_ECONOMY + economyExtra + 12,
        available: 10,
      },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + economyExtra + 35, available: 3 },
    },
  };
}

export function buildSupplementalInventory(legs: FlightLeg[]): Record<string, FlightInventory> {
  const record: Record<string, FlightInventory> = {};
  legs.forEach((leg, i) => {
    record[leg.flightLegId] = inv(leg.flightLegId, 35 + (i % 55), 8 + (i % 12));
  });
  return record;
}
