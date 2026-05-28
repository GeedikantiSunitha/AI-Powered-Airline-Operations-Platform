# Data Model (canonical)

## Core entities

### FlightLeg

| Field | Type | Description |
|-------|------|-------------|
| flightLegId | string | Primary key |
| flightNumber | string | e.g. AI-302 |
| origin | string | IATA |
| destination | string | IATA |
| scheduledDeparture | datetime | UTC |
| scheduledArrival | datetime | UTC |
| estimatedDeparture | datetime | nullable |
| estimatedArrival | datetime | nullable |
| status | enum | SCHEDULED, BOARDING, DEPARTED, ARRIVED, DELAYED, CANCELLED |
| aircraftRegistration | string | |
| gate | string | nullable |

### CrewAssignment

| Field | Type |
|-------|------|
| assignmentId | string |
| flightLegId | string |
| crewMemberId | string |
| role | enum (CAPTAIN, FO, PURSER, FA) |
| dutyStart | datetime |
| dutyEnd | datetime |
| legal | boolean |

### BaggageRecord

| Field | Type |
|-------|------|
| bagTagId | string |
| flightLegId | string |
| status | enum (LOADED, IN_TRANSIT, DELIVERED, DELAYED, MISHANDLED) |
| lastScanAirport | string |
| lastScanTime | datetime |

### BookingConnection

| Field | Type |
|-------|------|
| pnr | string |
| inboundFlightLegId | string |
| outboundFlightLegId | string |
| connectionMinutes | int |
| passengerCount | int |

### WeatherSnapshot

| Field | Type |
|-------|------|
| airportIata | string |
| observedAt | datetime |
| condition | string |
| visibilityM | int |
| windKts | int |
| riskScore | float 0–1 |

### DelayPrediction

| Field | Type |
|-------|------|
| flightLegId | string |
| predictedAt | datetime |
| delayProbability | float |
| predictedDelayMinutes | int |
| topFactors | json |

### Alert

| Field | Type |
|-------|------|
| alertId | string |
| type | string |
| severity | enum (INFO, WARNING, CRITICAL) |
| flightLegId | string | nullable |
| message | string |
| createdAt | datetime |
| acknowledged | boolean |

## S3 prefix convention

```
s3://{bucket}/raw/{source}/{yyyy}/{mm}/{dd}/
s3://{bucket}/curated/{entity}/{yyyy}/{mm}/{dd}/
s3://{bucket}/processed/delay_predictions/{yyyy}/{mm}/{dd}/
s3://{bucket}/curated/kpi_reports/{report_type}/{yyyy}/{mm}/{dd}/
```

## Redshift star schema (gold)

- **Facts:** `fact_flight_leg`, `fact_delay_event`, `fact_baggage_event`, `fact_fuel_burn`
- **Dims:** `dim_date`, `dim_airport`, `dim_aircraft`, `dim_route`, `dim_crew_member` (masked PII)

DDL stubs: `scripts/db/migrations/`
