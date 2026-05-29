import type { FareClass, SeatMapSeat } from '@airline-ops/shared';

export interface FlightInventory {
  flightLegId: string;
  capacity: number;
  bookedSeats: number;
  overbookingLimitPct: number;
  fares: Record<FareClass, { baseUsd: number; available: number }>;
}

const FARE_BASE: Record<FareClass, number> = {
  ECONOMY: 120,
  PREMIUM_ECONOMY: 220,
  BUSINESS: 480,
};

export const flightInventory: Record<string, FlightInventory> = {
  'FL-20260521-AI302-DEL-BOM': {
    flightLegId: 'FL-20260521-AI302-DEL-BOM',
    capacity: 180,
    bookedSeats: 142,
    overbookingLimitPct: 3,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY, available: 28 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS, available: 2 },
    },
  },
  'FL-20260521-AI405-BOM-BLR': {
    flightLegId: 'FL-20260521-AI405-BOM-BLR',
    capacity: 160,
    bookedSeats: 98,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY, available: 52 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY, available: 6 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS, available: 4 },
    },
  },
  'FL-20260521-AI118-DEL-DXB': {
    flightLegId: 'FL-20260521-AI118-DEL-DXB',
    capacity: 220,
    bookedSeats: 175,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 40, available: 35 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 60, available: 7 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 120, available: 3 },
    },
  },
};

export function buildSeatMap(flightLegId: string): SeatMapSeat[] {
  const inv = flightInventory[flightLegId];
  if (!inv) return [];
  const columns = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seats: SeatMapSeat[] = [];
  for (let row = 1; row <= 30; row++) {
    for (const column of columns) {
      const fareClass: FareClass = row <= 4 ? 'BUSINESS' : row <= 10 ? 'PREMIUM_ECONOMY' : 'ECONOMY';
      const seatNum = (row - 1) * columns.length + columns.indexOf(column);
      const available = seatNum >= inv.bookedSeats;
      seats.push({
        seatId: `${row}${column}`,
        row,
        column,
        fareClass,
        available,
        priceUsd: inv.fares[fareClass].baseUsd * 0.05,
      });
    }
  }
  return seats;
}
