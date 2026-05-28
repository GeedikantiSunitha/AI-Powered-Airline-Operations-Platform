/**
 * Flight system connector stub (Phase 3).
 * Emits canonical events to the flight-event-processor Lambda.
 */
export interface AirlineEventEnvelope<TDetail> {
  source: string;
  ['detail-type']: string;
  time: string;
  detail: TDetail;
}

export function buildFlightDelayedEvent(): AirlineEventEnvelope<{
  flightLegId: string;
  flightNumber: string;
  delayMinutes: number;
  reasonCode: string;
  previousEta: string;
  newEta: string;
}> {
  return {
    source: 'airline.ops.flights',
    'detail-type': 'FlightDelayed',
    time: new Date().toISOString(),
    detail: {
      flightLegId: 'FL-20260521-AI405-BOM-BLR',
      flightNumber: 'AI-405',
      delayMinutes: 25,
      reasonCode: 'LATE_INBOUND',
      previousEta: new Date(Date.now() + 45 * 60_000).toISOString(),
      newEta: new Date(Date.now() + 70 * 60_000).toISOString(),
    },
  };
}

