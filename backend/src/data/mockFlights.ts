import type { FlightLeg } from '@airline-ops/shared';

/** Phase 0–2 mock data — replace with DB/Redshift in Phase 4 */
export const mockFlights: FlightLeg[] = [
  {
    flightLegId: 'FL-20260521-AI302-DEL-BOM',
    flightNumber: 'AI-302',
    origin: 'DEL',
    destination: 'BOM',
    scheduledDeparture: '2026-05-21T10:00:00Z',
    scheduledArrival: '2026-05-21T12:15:00Z',
    estimatedDeparture: '2026-05-21T10:45:00Z',
    status: 'DELAYED',
    aircraftRegistration: 'VT-EXA',
    gate: 'A12',
    delayMinutes: 45,
  },
  {
    flightLegId: 'FL-20260521-AI405-BOM-BLR',
    flightNumber: 'AI-405',
    origin: 'BOM',
    destination: 'BLR',
    scheduledDeparture: '2026-05-21T14:00:00Z',
    scheduledArrival: '2026-05-21T15:30:00Z',
    status: 'SCHEDULED',
    aircraftRegistration: 'VT-EXB',
    gate: 'B3',
  },
  {
    flightLegId: 'FL-20260521-AI118-DEL-DXB',
    flightNumber: 'AI-118',
    origin: 'DEL',
    destination: 'DXB',
    scheduledDeparture: '2026-05-21T18:30:00Z',
    scheduledArrival: '2026-05-21T21:00:00Z',
    status: 'BOARDING',
    aircraftRegistration: 'VT-EXC',
    gate: 'C7',
  },
];
