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
  'FL-20260521-AI119-DXB-DEL': {
    flightLegId: 'FL-20260521-AI119-DXB-DEL',
    capacity: 220,
    bookedSeats: 120,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 45, available: 88 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 65, available: 12 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 130, available: 4 },
    },
  },
  'FL-20260521-AI303-BOM-DEL': {
    flightLegId: 'FL-20260521-AI303-BOM-DEL',
    capacity: 180,
    bookedSeats: 110,
    overbookingLimitPct: 3,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY, available: 58 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY, available: 10 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS, available: 3 },
    },
  },
  'FL-20260521-AI406-DEL-BLR': {
    flightLegId: 'FL-20260521-AI406-DEL-BLR',
    capacity: 180,
    bookedSeats: 95,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 15, available: 72 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 25, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 40, available: 4 },
    },
  },
  'FL-20260521-AI407-BLR-DEL': {
    flightLegId: 'FL-20260521-AI407-BLR-DEL',
    capacity: 180,
    bookedSeats: 88,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 15, available: 78 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 25, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 40, available: 4 },
    },
  },
  'FL-20260521-AI408-DEL-HYD': {
    flightLegId: 'FL-20260521-AI408-DEL-HYD',
    capacity: 180,
    bookedSeats: 72,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 10, available: 95 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 20, available: 10 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 35, available: 4 },
    },
  },
  'FL-20260521-AI409-HYD-DEL': {
    flightLegId: 'FL-20260521-AI409-HYD-DEL',
    capacity: 180,
    bookedSeats: 65,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 10, available: 102 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 20, available: 11 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 35, available: 4 },
    },
  },
  'FL-20260521-AI410-BOM-HYD': {
    flightLegId: 'FL-20260521-AI410-BOM-HYD',
    capacity: 160,
    bookedSeats: 54,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 8, available: 98 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 15, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 30, available: 3 },
    },
  },
  'FL-20260521-AI411-HYD-BOM': {
    flightLegId: 'FL-20260521-AI411-HYD-BOM',
    capacity: 160,
    bookedSeats: 48,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 8, available: 104 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 15, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 30, available: 3 },
    },
  },
  'FL-20260521-AI412-BLR-HYD': {
    flightLegId: 'FL-20260521-AI412-BLR-HYD',
    capacity: 160,
    bookedSeats: 42,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 5, available: 110 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 12, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 25, available: 3 },
    },
  },
  'FL-20260521-AI413-HYD-BLR': {
    flightLegId: 'FL-20260521-AI413-HYD-BLR',
    capacity: 160,
    bookedSeats: 38,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 5, available: 114 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 12, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 25, available: 3 },
    },
  },
  'FL-20260521-AI414-HYD-DXB': {
    flightLegId: 'FL-20260521-AI414-HYD-DXB',
    capacity: 200,
    bookedSeats: 90,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 35, available: 98 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 55, available: 10 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 110, available: 4 },
    },
  },
  'FL-20260521-AI415-DXB-HYD': {
    flightLegId: 'FL-20260521-AI415-DXB-HYD',
    capacity: 200,
    bookedSeats: 85,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 38, available: 103 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 58, available: 11 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 115, available: 4 },
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
