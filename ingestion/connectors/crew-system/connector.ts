/**
 * Crew connector stub (Phase 3).
 * TODO: publish crew availability and duty risk events.
 */
export const crewConnectorStub = {
  source: 'airline.ops.crew',
  emits: ['CrewUnavailable', 'CrewDutyRisk'],
};

