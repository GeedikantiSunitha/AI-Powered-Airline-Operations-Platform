# Data Ingestion

Connectors and serverless processors for airline source systems.

## Layout

```
ingestion/
├── connectors/          # Pull/push adapters per source system
├── lambdas/             # EventBridge-triggered handlers
└── glue/                # Batch ETL (Spark/Python)
```

## Source systems (stubs implemented)

| Connector | Path | Events |
|-----------|------|--------|
| Flights | `connectors/flight-system/connector.ts` | FlightDelayed, GateChanged |
| Weather | `connectors/weather-api/connector.ts` | WeatherRiskDetected |
| Booking | `connectors/booking-system/connector.ts` | HighPassengerImpactDetected |
| Baggage | `connectors/baggage-system/connector.ts` | BaggageDelayDetected |
| Crew | `connectors/crew-system/connector.ts` | CrewUnavailable, CrewDutyRisk |
| Airport | `connectors/airport-ops/connector.ts` | GateChanged |

## Flow

```
Source → connector/Lambda → validate (shared schema) → EventBridge → S3 raw + processors
```

## Local Phase 3 run

1. Start postgres: `docker-compose up -d postgres`
2. Run sample ingestion from backend:

```bash
cd backend
npm run ingest:sample
```

This executes:

- `ingestion/lambdas/flight-event-processor/handler.ts`
- local S3 writes under `ingestion/local-s3/raw|curated|processed/...`
- insert into `stg_flight_events` (local Postgres staging table)

## Phase

Implement in **Phase 3** — start with `lambdas/flight-event-processor` and one connector.
