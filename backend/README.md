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
| GET | /api/v1/admin/users | 10 |
| GET | /api/v1/copilot/knowledge/documents | 11 |
| POST | /api/v1/copilot/knowledge/search | 11 |

## Run

```bash
npm install
npm run dev
```
