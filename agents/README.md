# Agentic AI Layer (Amazon Bedrock)

Five specialist agents + supervisor orchestration from `backend/src/services/copilot/supervisor.ts`.

Phase 14 adds Bedrock Agent runtime seam (`bedrockAgentRuntime.ts`), prompt chaining templates, tool policy enforcement, and multi-step orchestration (`POST /api/v1/copilot/orchestrate`).

## Agents

| Agent | Directory | Purpose |
|-------|-----------|---------|
| Flight Delay Analysis | `flight-delay/` | Risk, root cause, ETA impact |
| Crew Coordination | `crew-coordination/` | Availability, swaps, duty violations |
| Airport Congestion | `airport-congestion/` | Gates, runway, slot pressure |
| Fuel Optimization | `fuel-optimization/` | Planned vs actual, savings |
| Passenger Impact | `passenger-impact/` | Misconnects, rebooking, compensation |

## Shared tools

Define in `shared/tools/` — each tool maps to an API or SQL query:

- `get_flight_status`
- `query_delay_predictions`
- `list_crew_assignments`
- `get_passenger_connections`
- `get_airport_congestion`
- `get_fuel_variance`

## Observability (required)

Log per invocation: prompt, input sources, tool calls, reasoning summary, recommendation, confidence, human approval.

## Phase

**Phase 9** — implement agents one at a time; **Phase 8** copilot uses Bedrock without full agent orchestration first.
