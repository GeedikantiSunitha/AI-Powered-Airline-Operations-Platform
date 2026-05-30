# Backend API

Node.js + Express + TypeScript.

## Responsibilities

- REST APIs for dashboards and admin
- WebSocket for real-time flight/alert updates
- RBAC and audit logging
- Alert rule evaluation
- Bridge to SageMaker (predictions) and Bedrock (copilot/agents)

## Structure

```
src/
├── index.ts              # App entry, HTTP + WS server
├── config/               # Env validation
├── routes/               # REST route handlers
├── services/             # Business logic
├── middleware/           # auth, rbac, audit, error
├── websocket/            # WS connection manager
├── jobs/                 # Background KPI aggregation, etc.
└── lib/                  # observability, aws clients
```

## API surface (planned)

| Method | Path | Phase |
|--------|------|-------|
| GET | /health | 0 |
| POST | /api/v1/auth/login | 1 |
| GET | /api/v1/flights | 2 |
| GET | /api/v1/flights/:id | 2 |
| GET | /api/v1/kpi/summary | 5 |
| GET | /api/v1/predictions/delay | 6 |
| GET | /api/v1/predictions/scenario | 12 |
| GET | /api/v1/predictions/weather | 12 |
| GET | /api/v1/predictions/passenger-impact | 12 |
| GET | /api/v1/predictions/maintenance | 12 |
| GET | /api/v1/predictions/unified/delay | 12 |
| GET | /api/v1/mlops/pipelines | 13 |
| POST | /api/v1/mlops/pipelines/:pipelineId/run | 13 |
| GET | /api/v1/mlops/registry | 13 |
| POST | /api/v1/mlops/registry/:modelId/promote | 13 |
| GET | /api/v1/mlops/drift | 13 |
| POST | /api/v1/mlops/drift/simulate | 13 |
| POST | /api/v1/mlops/rollback | 13 |
| GET | /api/v1/alerts | 7 |
| POST | /api/v1/copilot/chat | 8 |
| POST | /api/v1/copilot/orchestrate | 14 |
| GET | /api/v1/copilot/evaluation/sample | 14 |
| GET | /api/v1/security/posture | 15 |
| GET | /api/v1/security/audit-chain | 15 |
| POST | /api/v1/security/review/run | 15 |
| GET | /api/v1/sre/dashboard | 16 |
| POST | /api/v1/sre/synthetics/run | 16 |
| GET | /api/v1/sre/playbooks | 16 |
| POST | /api/v1/sre/chaos/:scenario | 16 |
| POST | /api/v1/sre/drills/quarterly | 16 |
| POST | /api/v1/booking/search | 17 |
| GET | /api/v1/booking/fare-quote | 17 |
| POST | /api/v1/booking/hold | 17 |
| POST | /api/v1/booking/create | 17 |
| POST | /api/v1/booking/payment/confirm | 17 |
| POST | /api/v1/booking/ticket/issue | 17 |
| GET | /api/v1/booking/pnr/:pnr | 17 |
| GET | /api/v1/booking/disruption/:pnr/rebook-options | 17 |
| GET | /api/v1/commercial/pricing/:flightLegId | 18 |
| GET | /api/v1/commercial/offers | 18 |
| GET | /api/v1/commercial/customers/profile | 18 |
| GET | /api/v1/commercial/irops/recommendations/:pnr | 18 |
| POST | /api/v1/commercial/irops/optimize | 18 |
| GET | /api/v1/commercial/dashboard/revenue | 18 |
| GET | /api/v1/config/feature-flags | 19 |
| GET | /api/v1/booking/mine | 19 |
| GET | /api/v1/admin/health-hub | 19 |
| GET | /api/v1/admin/permissions | 19 |
| GET | /api/v1/admin/audit-logs | 19 |
| GET | /api/v1/admin/feature-flags | 19 |
| GET | /api/v1/admin/commercial-config | 19 |
| GET | /api/v1/admin/mlops/summary | 19 |
| GET | /api/v1/admin/security/summary | 19 |
| POST | /api/v1/auth/mfa/verify | 19 |
| GET | /api/v1/admin/users | 10 |
| GET | /api/v1/copilot/knowledge/documents | 11 |
| POST | /api/v1/copilot/knowledge/search | 11 |

## Run

```bash
npm install
npm run dev
```
