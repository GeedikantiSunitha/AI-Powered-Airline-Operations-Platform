import type { FlightSearchResult } from '@airline-ops/shared';

/** Local calendar date (YYYY-MM-DD) — avoids UTC off-by-one in date inputs. */
export function localTodayIso(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function localMaxBookableIso(monthsAhead = 12): string {
  const n = new Date();
  n.setMonth(n.getMonth() + monthsAhead);
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function clampTravelDate(iso: string): string {
  const today = localTodayIso();
  const max = localMaxBookableIso();
  if (!iso || iso < today) return today;
  if (iso > max) return max;
  return iso;
}

/** Upcoming bookable dates for the fare strip (today → forward). */
export function fareStripDates(anchor: string, count = 14): string[] {
  const today = localTodayIso();
  const max = localMaxBookableIso();
  let start = addDaysIso(anchor, -2);
  if (start < today) start = today;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = addDaysIso(start, i);
    if (d > max) break;
    out.push(d);
  }
  return out;
}

export const AIRPORT_DETAILS: Record<string, { city: string; name: string }> = {
  DEL: { city: 'Delhi', name: 'Indira Gandhi International Airport' },
  BOM: { city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International Airport' },
  BLR: { city: 'Bengaluru', name: 'Kempegowda International Airport' },
  HYD: { city: 'Hyderabad', name: 'Rajiv Gandhi International Airport' },
  MAA: { city: 'Chennai', name: 'Chennai International Airport' },
  CCU: { city: 'Kolkata', name: 'Netaji Subhas Chandra Bose International Airport' },
  PNQ: { city: 'Pune', name: 'Pune Airport' },
  GOI: { city: 'Goa', name: 'Goa Manohar International Airport' },
  DXB: { city: 'Dubai', name: 'Dubai International Airport' },
  LHR: { city: 'London', name: 'Heathrow Airport' },
  JFK: { city: 'New York', name: 'John F. Kennedy International Airport' },
  EWR: { city: 'Newark', name: 'Newark Liberty International Airport' },
  ORD: { city: 'Chicago', name: "O'Hare International Airport" },
  SFO: { city: 'San Francisco', name: 'San Francisco International Airport' },
  IAD: { city: 'Washington', name: 'Washington Dulles International Airport' },
  YYZ: { city: 'Toronto', name: 'Toronto Pearson International Airport' },
  YVR: { city: 'Vancouver', name: 'Vancouver International Airport' },
};

export function airlineNameForFlight(flightNumber: string, airlineName?: string): string {
  if (airlineName?.trim()) return airlineName.trim();
  if (flightNumber.startsWith('AI-')) return 'Air India';
  if (flightNumber.startsWith('6E-')) return 'IndiGo';
  if (flightNumber.startsWith('UK-')) return 'Vistara';
  return 'Airline Ops';
}

/** Display like airline sites: AI 423 instead of AI-423 */
export function formatFlightNumberDisplay(flightNumber: string): string {
  const parts = flightNumber.split('-');
  if (parts.length >= 2) return `${parts[0]} ${parts.slice(1).join(' ')}`;
  return flightNumber;
}

export function airportCity(code: string): string {
  return AIRPORT_DETAILS[code]?.city ?? code;
}

export function airportSubtitle(code: string): string {
  const d = AIRPORT_DETAILS[code];
  if (!d) return code;
  return `${code}, ${d.name}`;
}

export function formatTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDateChip(isoDate: string): { weekday: string; dayMonth: string } {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return {
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
    dayMonth: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  };
}

export function formatDepartureHeading(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function flightDurationMinutes(departureIso: string, arrivalIso: string): number {
  const ms = new Date(arrivalIso).getTime() - new Date(departureIso).getTime();
  return Math.max(0, Math.round(ms / 60_000));
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export type TimeBucket = 'before6' | 'morning' | 'afternoon' | 'evening';

export const TIME_BUCKET_LABELS: Record<TimeBucket, string> = {
  before6: 'Before 6 AM',
  morning: '6 AM – 12 PM',
  afternoon: '12 PM – 6 PM',
  evening: 'After 6 PM',
};

export function departureTimeBucket(iso: string): TimeBucket {
  const hour = new Date(iso).getUTCHours();
  if (hour < 6) return 'before6';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function shiftIsoToTravelDate(iso: string, travelDate: string): string {
  const tIdx = iso.indexOf('T');
  if (tIdx === -1) return `${travelDate}T12:00:00.000Z`;
  return `${travelDate}${iso.slice(tIdx)}`;
}

export function withTravelDate(
  flight: FlightSearchResult,
  travelDate: string
): FlightSearchResult {
  return {
    ...flight,
    scheduledDeparture: shiftIsoToTravelDate(flight.scheduledDeparture, travelDate),
    scheduledArrival: shiftIsoToTravelDate(flight.scheduledArrival, travelDate),
  };
}

/** Client-side indicative fare for date strip (before/without full search). */
export function indicativeDayFare(baseUsd: number, isoDate: string): number {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const dow = d.getUTCDay();
  const weekend = dow === 0 || dow === 6;
  const dayJitter = ((d.getUTCDate() % 5) - 2) * 0.015;
  return Math.round(baseUsd * (weekend ? 1.07 : 1) * (1 + dayJitter));
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dateRangeCentered(center: string, radius = 3): string[] {
  return Array.from({ length: radius * 2 + 1 }, (_, i) => addDaysIso(center, i - radius));
}
