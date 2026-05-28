/**
 * Baggage connector stub (Phase 3).
 * TODO: consume baggage scans and emit delay/mishandled events.
 */
export const baggageConnectorStub = {
  source: 'airline.ops.baggage',
  emits: ['BaggageDelayDetected'],
};

