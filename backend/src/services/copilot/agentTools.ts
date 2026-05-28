import type { FlightLeg } from '@airline-ops/shared';
import type { UserRole } from '@airline-ops/shared';
import { sagemakerClient } from '../prediction/sagemakerClient';
import { toolPolicy } from './toolPolicy';

export interface ToolCallRecord {
  name: string;
  input: Record<string, unknown>;
  allowed: boolean;
  sensitivity: 'read' | 'write' | 'high_impact';
  output?: unknown;
  blockedReason?: string;
}

const AIRPORT_CONGESTION: Record<string, number> = {
  BOM: 0.63,
  DEL: 0.58,
  BLR: 0.47,
  DXB: 0.39,
};

const FUEL_PLAN: Record<string, { plannedKg: number; actualKg: number }> = {
  'FL-20260521-AI302-DEL-BOM': { plannedKg: 5100, actualKg: 5460 },
  'FL-20260521-AI405-BOM-BLR': { plannedKg: 4300, actualKg: 4460 },
  'FL-20260521-AI118-DEL-DXB': { plannedKg: 7800, actualKg: 7900 },
};

function listCrewAssignments(flightLegId: string) {
  const delayed = flightLegId.includes('AI302');
  return [
    { crewMemberId: 'CR-1001', role: 'CAPTAIN', legal: !delayed },
    { crewMemberId: 'CR-1002', role: 'FO', legal: true },
    { crewMemberId: 'CR-2001', role: 'PURSER', legal: true },
    { crewMemberId: 'CR-2002', role: 'FA', legal: true },
  ];
}

export const agentTools = {
  async invoke(
    toolName: string,
    input: Record<string, unknown>,
    flight: FlightLeg,
    role: UserRole
  ): Promise<ToolCallRecord> {
    const auth = toolPolicy.authorize(role, toolName);
    const record: ToolCallRecord = {
      name: toolName,
      input,
      allowed: auth.allowed,
      sensitivity: auth.sensitivity,
    };
    if (!auth.allowed) {
      record.blockedReason = auth.reason;
      return record;
    }

    switch (toolName) {
      case 'get_flight_status':
        record.output = flight;
        break;
      case 'query_delay_predictions':
        record.output = await sagemakerClient.predictDelay(flight.flightLegId);
        break;
      case 'get_weather_risk':
        record.output = { destination: flight.destination, riskScore: 0.42 };
        break;
      case 'get_airport_congestion':
        record.output = {
          airportIata: String(input.airportIata ?? flight.origin),
          score: AIRPORT_CONGESTION[String(input.airportIata ?? flight.origin)] ?? 0.35,
        };
        break;
      case 'list_crew_assignments':
        record.output = listCrewAssignments(flight.flightLegId);
        break;
      case 'suggest_crew_swap':
        record.output = {
          recommendation: `Swap CAPTAIN CR-1001 -> reserve CR-1099 for ${flight.flightLegId}`,
        };
        break;
      case 'get_fuel_variance': {
        const row = FUEL_PLAN[flight.flightLegId] ?? { plannedKg: 5000, actualKg: 5200 };
        const variancePct = ((row.actualKg - row.plannedKg) / row.plannedKg) * 100;
        record.output = { ...row, variancePct: Number(variancePct.toFixed(2)) };
        break;
      }
      case 'get_passenger_connections': {
        const delay = flight.delayMinutes ?? 0;
        record.output = {
          affectedPassengers: 80 + Math.round(delay * 1.2),
          missedConnections: Math.max(0, Math.round(delay / 12)),
        };
        break;
      }
      default:
        record.allowed = false;
        record.blockedReason = `Unsupported tool: ${toolName}`;
    }

    return record;
  },
};
