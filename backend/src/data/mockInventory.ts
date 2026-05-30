import type { FareClass, SeatMapSeat } from '@airline-ops/shared';
import { mockFlights } from './mockFlights';
import { buildSupplementalInventory } from './supplementalFlights';

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

function inv(legId: string, booked: number, economyExtra = 12): FlightInventory {
  return {
    flightLegId: legId,
    capacity: 180,
    bookedSeats: booked,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + economyExtra, available: 96 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + economyExtra + 12, available: 10 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + economyExtra + 35, available: 3 },
    },
  };
}

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
  'FL-20260521-AI416-DEL-MAA': {
    flightLegId: 'FL-20260521-AI416-DEL-MAA',
    capacity: 180,
    bookedSeats: 68,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 18, available: 96 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 28, available: 10 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 45, available: 4 },
    },
  },
  'FL-20260521-AI417-MAA-DEL': {
    flightLegId: 'FL-20260521-AI417-MAA-DEL',
    capacity: 180,
    bookedSeats: 62,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 18, available: 102 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 28, available: 11 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 45, available: 4 },
    },
  },
  'FL-20260521-AI418-BOM-MAA': {
    flightLegId: 'FL-20260521-AI418-BOM-MAA',
    capacity: 180,
    bookedSeats: 55,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 12, available: 108 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 22, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 40, available: 3 },
    },
  },
  'FL-20260521-AI419-MAA-BOM': {
    flightLegId: 'FL-20260521-AI419-MAA-BOM',
    capacity: 180,
    bookedSeats: 51,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 12, available: 112 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 22, available: 10 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 40, available: 3 },
    },
  },
  'FL-20260521-AI420-BLR-MAA': {
    flightLegId: 'FL-20260521-AI420-BLR-MAA',
    capacity: 160,
    bookedSeats: 44,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 8, available: 110 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 15, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 30, available: 3 },
    },
  },
  'FL-20260521-AI421-MAA-BLR': {
    flightLegId: 'FL-20260521-AI421-MAA-BLR',
    capacity: 160,
    bookedSeats: 40,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 8, available: 114 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 15, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 30, available: 3 },
    },
  },
  'FL-20260521-AI422-HYD-MAA': {
    flightLegId: 'FL-20260521-AI422-HYD-MAA',
    capacity: 160,
    bookedSeats: 36,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 6, available: 118 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 12, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 25, available: 3 },
    },
  },
  'FL-20260521-AI423-MAA-HYD': {
    flightLegId: 'FL-20260521-AI423-MAA-HYD',
    capacity: 160,
    bookedSeats: 33,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 6, available: 121 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 12, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 25, available: 3 },
    },
  },
  'FL-20260521-AI424-DEL-CCU': {
    flightLegId: 'FL-20260521-AI424-DEL-CCU',
    capacity: 180,
    bookedSeats: 78,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 20, available: 88 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 30, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 50, available: 4 },
    },
  },
  'FL-20260521-AI425-CCU-DEL': {
    flightLegId: 'FL-20260521-AI425-CCU-DEL',
    capacity: 180,
    bookedSeats: 71,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 20, available: 95 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 30, available: 10 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 50, available: 4 },
    },
  },
  'FL-20260521-AI426-BOM-CCU': {
    flightLegId: 'FL-20260521-AI426-BOM-CCU',
    capacity: 180,
    bookedSeats: 66,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 16, available: 100 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 26, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 42, available: 3 },
    },
  },
  'FL-20260521-AI427-CCU-BOM': {
    flightLegId: 'FL-20260521-AI427-CCU-BOM',
    capacity: 180,
    bookedSeats: 59,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 16, available: 107 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 26, available: 10 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 42, available: 3 },
    },
  },
  'FL-20260521-AI428-BLR-CCU': {
    flightLegId: 'FL-20260521-AI428-BLR-CCU',
    capacity: 180,
    bookedSeats: 52,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 22, available: 114 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 32, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 48, available: 3 },
    },
  },
  'FL-20260521-AI429-CCU-BLR': {
    flightLegId: 'FL-20260521-AI429-CCU-BLR',
    capacity: 180,
    bookedSeats: 48,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 22, available: 118 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 32, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 48, available: 3 },
    },
  },
  'FL-20260521-AI430-DEL-PNQ': {
    flightLegId: 'FL-20260521-AI430-DEL-PNQ',
    capacity: 160,
    bookedSeats: 47,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 14, available: 107 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 24, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 38, available: 3 },
    },
  },
  'FL-20260521-AI431-PNQ-DEL': {
    flightLegId: 'FL-20260521-AI431-PNQ-DEL',
    capacity: 160,
    bookedSeats: 43,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 14, available: 111 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 24, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 38, available: 3 },
    },
  },
  'FL-20260521-AI432-BOM-PNQ': {
    flightLegId: 'FL-20260521-AI432-BOM-PNQ',
    capacity: 160,
    bookedSeats: 35,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 5, available: 119 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 12, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 28, available: 3 },
    },
  },
  'FL-20260521-AI433-PNQ-BOM': {
    flightLegId: 'FL-20260521-AI433-PNQ-BOM',
    capacity: 160,
    bookedSeats: 32,
    overbookingLimitPct: 2,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 5, available: 122 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 12, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 28, available: 3 },
    },
  },
  'FL-20260521-AI434-BOM-GOI': {
    flightLegId: 'FL-20260521-AI434-BOM-GOI',
    capacity: 180,
    bookedSeats: 88,
    overbookingLimitPct: 3,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 25, available: 76 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 35, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 55, available: 3 },
    },
  },
  'FL-20260521-AI435-GOI-BOM': {
    flightLegId: 'FL-20260521-AI435-GOI-BOM',
    capacity: 180,
    bookedSeats: 82,
    overbookingLimitPct: 3,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 28, available: 82 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 38, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 58, available: 3 },
    },
  },
  'FL-20260521-AI436-DEL-GOI': {
    flightLegId: 'FL-20260521-AI436-DEL-GOI',
    capacity: 180,
    bookedSeats: 74,
    overbookingLimitPct: 3,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 30, available: 90 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 42, available: 8 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 60, available: 3 },
    },
  },
  'FL-20260521-AI437-GOI-DEL': {
    flightLegId: 'FL-20260521-AI437-GOI-DEL',
    capacity: 180,
    bookedSeats: 69,
    overbookingLimitPct: 3,
    fares: {
      ECONOMY: { baseUsd: FARE_BASE.ECONOMY + 32, available: 95 },
      PREMIUM_ECONOMY: { baseUsd: FARE_BASE.PREMIUM_ECONOMY + 44, available: 9 },
      BUSINESS: { baseUsd: FARE_BASE.BUSINESS + 62, available: 3 },
    },
  },
  'FL-20260521-AI438-PNQ-BLR': inv('FL-20260521-AI438-PNQ-BLR', 38, 8),
  'FL-20260521-AI439-BLR-PNQ': inv('FL-20260521-AI439-BLR-PNQ', 35, 8),
  'FL-20260521-AI440-PNQ-HYD': inv('FL-20260521-AI440-PNQ-HYD', 41, 10),
  'FL-20260521-AI441-HYD-PNQ': inv('FL-20260521-AI441-HYD-PNQ', 39, 10),
  'FL-20260521-AI442-PNQ-MAA': inv('FL-20260521-AI442-PNQ-MAA', 44, 14),
  'FL-20260521-AI443-MAA-PNQ': inv('FL-20260521-AI443-MAA-PNQ', 42, 14),
  'FL-20260521-AI444-PNQ-CCU': inv('FL-20260521-AI444-PNQ-CCU', 48, 16),
  'FL-20260521-AI445-CCU-PNQ': inv('FL-20260521-AI445-CCU-PNQ', 46, 16),
  'FL-20260521-AI446-PNQ-GOI': inv('FL-20260521-AI446-PNQ-GOI', 52, 18),
  'FL-20260521-AI447-GOI-PNQ': inv('FL-20260521-AI447-GOI-PNQ', 50, 18),
  'FL-20260521-AI448-GOI-BLR': inv('FL-20260521-AI448-GOI-BLR', 56, 15),
  'FL-20260521-AI449-BLR-GOI': inv('FL-20260521-AI449-BLR-GOI', 54, 15),
  'FL-20260521-AI450-GOI-HYD': inv('FL-20260521-AI450-GOI-HYD', 47, 12),
  'FL-20260521-AI451-HYD-GOI': inv('FL-20260521-AI451-HYD-GOI', 45, 12),
  'FL-20260521-AI452-GOI-MAA': inv('FL-20260521-AI452-GOI-MAA', 58, 14),
  'FL-20260521-AI453-MAA-GOI': inv('FL-20260521-AI453-MAA-GOI', 55, 14),
  'FL-20260521-AI454-GOI-CCU': inv('FL-20260521-AI454-GOI-CCU', 61, 20),
  'FL-20260521-AI455-CCU-GOI': inv('FL-20260521-AI455-CCU-GOI', 59, 20),
  'FL-20260521-AI456-MAA-CCU': inv('FL-20260521-AI456-MAA-CCU', 63, 16),
  'FL-20260521-AI457-CCU-MAA': inv('FL-20260521-AI457-CCU-MAA', 60, 16),
  'FL-20260521-AI458-HYD-CCU': inv('FL-20260521-AI458-HYD-CCU', 57, 14),
  'FL-20260521-AI459-CCU-HYD': inv('FL-20260521-AI459-CCU-HYD', 55, 14),
  'FL-20260521-AI460-BOM-DXB': inv('FL-20260521-AI460-BOM-DXB', 95, 42),
  'FL-20260521-AI461-DXB-BOM': inv('FL-20260521-AI461-DXB-BOM', 88, 42),
  'FL-20260521-AI462-BLR-DXB': inv('FL-20260521-AI462-BLR-DXB', 72, 40),
  'FL-20260521-AI463-DXB-BLR': inv('FL-20260521-AI463-DXB-BLR', 68, 40),
  'FL-20260521-AI464-MAA-DXB': inv('FL-20260521-AI464-MAA-DXB', 64, 38),
  'FL-20260521-AI465-DXB-MAA': inv('FL-20260521-AI465-DXB-MAA', 60, 38),
  'FL-20260521-AI466-DEL-LHR': inv('FL-20260521-AI466-DEL-LHR', 120, 85),
  'FL-20260521-AI467-LHR-DEL': inv('FL-20260521-AI467-LHR-DEL', 115, 85),
  'FL-20260521-AI468-BOM-LHR': inv('FL-20260521-AI468-BOM-LHR', 105, 80),
  'FL-20260521-AI469-LHR-BOM': inv('FL-20260521-AI469-LHR-BOM', 100, 80),
  'FL-20260521-AI470-DEL-JFK': inv('FL-20260521-AI470-DEL-JFK', 130, 95),
  'FL-20260521-AI471-JFK-DEL': inv('FL-20260521-AI471-JFK-DEL', 125, 95),
  'FL-20260521-AI472-BOM-JFK': inv('FL-20260521-AI472-BOM-JFK', 118, 90),
  'FL-20260521-AI473-JFK-BOM': inv('FL-20260521-AI473-JFK-BOM', 112, 90),
  'FL-20260521-AI474-DEL-EWR': inv('FL-20260521-AI474-DEL-EWR', 128, 92),
  'FL-20260521-AI475-EWR-DEL': inv('FL-20260521-AI475-EWR-DEL', 122, 92),
  'FL-20260521-AI476-DEL-ORD': inv('FL-20260521-AI476-DEL-ORD', 125, 90),
  'FL-20260521-AI477-ORD-DEL': inv('FL-20260521-AI477-ORD-DEL', 118, 90),
  'FL-20260521-AI478-DEL-SFO': inv('FL-20260521-AI478-DEL-SFO', 120, 88),
  'FL-20260521-AI479-SFO-DEL': inv('FL-20260521-AI479-SFO-DEL', 115, 88),
  'FL-20260521-AI480-DEL-IAD': inv('FL-20260521-AI480-DEL-IAD', 110, 86),
  'FL-20260521-AI481-IAD-DEL': inv('FL-20260521-AI481-IAD-DEL', 105, 86),
  'FL-20260521-AI482-BOM-EWR': inv('FL-20260521-AI482-BOM-EWR', 115, 88),
  'FL-20260521-AI483-EWR-BOM': inv('FL-20260521-AI483-EWR-BOM', 108, 88),
  'FL-20260521-AI484-BOM-ORD': inv('FL-20260521-AI484-BOM-ORD', 112, 86),
  'FL-20260521-AI485-ORD-BOM': inv('FL-20260521-AI485-ORD-BOM', 106, 86),
  'FL-20260521-AI486-BLR-SFO': inv('FL-20260521-AI486-BLR-SFO', 95, 84),
  'FL-20260521-AI487-SFO-BLR': inv('FL-20260521-AI487-SFO-BLR', 90, 84),
  'FL-20260521-AI488-HYD-ORD': inv('FL-20260521-AI488-HYD-ORD', 88, 82),
  'FL-20260521-AI489-ORD-HYD': inv('FL-20260521-AI489-ORD-HYD', 82, 82),
  'FL-20260521-AI490-DEL-YYZ': inv('FL-20260521-AI490-DEL-YYZ', 118, 88),
  'FL-20260521-AI491-YYZ-DEL': inv('FL-20260521-AI491-YYZ-DEL', 112, 88),
  'FL-20260521-AI492-DEL-YVR': inv('FL-20260521-AI492-DEL-YVR', 105, 86),
  'FL-20260521-AI493-YVR-DEL': inv('FL-20260521-AI493-YVR-DEL', 100, 86),
  'FL-20260521-AI494-BOM-YYZ': inv('FL-20260521-AI494-BOM-YYZ', 108, 84),
  'FL-20260521-AI495-YYZ-BOM': inv('FL-20260521-AI495-YYZ-BOM', 102, 84),
  'FL-20260521-AI496-BLR-YYZ': inv('FL-20260521-AI496-BLR-YYZ', 92, 80),
  'FL-20260521-AI497-YYZ-BLR': inv('FL-20260521-AI497-YYZ-BLR', 86, 80),
};

const supplementalLegs = mockFlights.filter(
  (f) => f.flightNumber.startsWith('6E-') || f.flightNumber.startsWith('UK-')
);
Object.assign(flightInventory, buildSupplementalInventory(supplementalLegs));

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
