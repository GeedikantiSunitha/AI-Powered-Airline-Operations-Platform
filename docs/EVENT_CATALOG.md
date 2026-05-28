# Event Catalog (EventBridge)

All events use envelope:

```json
{
  "source": "airline.ops.{system}",
  "detail-type": "{EventName}",
  "detail": { }
}
```

## Operational events

| detail-type | source | Trigger |
|-------------|--------|---------|
| FlightDelayed | airline.ops.flights | ETA slips beyond threshold |
| FlightCancelled | airline.ops.flights | Status → CANCELLED |
| GateChanged | airline.ops.airport | Gate assignment update |
| CrewUnavailable | airline.ops.crew | No legal crew for leg |
| CrewDutyRisk | airline.ops.crew | Approaching duty limit |
| WeatherRiskDetected | airline.ops.weather | riskScore > threshold |
| BaggageDelayDetected | airline.ops.baggage | Loading SLA breach |
| HighPassengerImpactDetected | airline.ops.booking | Misconnect count > N |
| DelayRiskElevated | airline.ops.ml | SageMaker score > threshold |

## Schema files

JSON Schema definitions: `shared/schemas/events/*.schema.json`

## Example: FlightDelayed

```json
{
  "flightLegId": "FL-20260521-AI302-DEL-BOM",
  "flightNumber": "AI-302",
  "delayMinutes": 45,
  "reasonCode": "LATE_INBOUND",
  "previousEta": "2026-05-21T14:30:00Z",
  "newEta": "2026-05-21T15:15:00Z"
}
```

## Consumers (EventBridge rules)

| Rule | Target |
|------|--------|
| flight-delayed | Lambda alert + S3 archive + WebSocket fanout |
| delay-risk-elevated | Lambda notify + agent async analysis |
| crew-unavailable | Crew Coordination Agent + alert |
