/**
 * Weather API connector stub (Phase 3).
 * TODO: poll weather provider and emit WeatherRiskDetected events.
 */
export const weatherConnectorStub = {
  source: 'airline.ops.weather',
  emits: ['WeatherRiskDetected'],
};

