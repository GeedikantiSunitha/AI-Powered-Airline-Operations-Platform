# AI-Powered Airline Operations Data Platform

Centralized platform for real-time airline operations visibility, disruption prediction, KPI analytics, event-driven alerts, and AI-assisted decision-making.

## Plan alignment

This scaffold matches your production-ready specification:

| Your requirement | Scaffold location |
|------------------|-------------------|
| Real-time operations monitoring | `frontend/src/app/(dashboard)/`, `backend/src/websocket/` |
| Unified data platform | `ingestion/`, `infrastructure/modules/s3-data-lake/` |
| Delay & disruption prediction | `ml/sagemaker/`, `backend/src/services/prediction/` |
| KPI analytics | `backend/src/routes/kpi.ts`, `frontend/.../kpi/` |
| AI copilots | `frontend/.../copilot/`, `agents/`, `backend/src/services/copilot/` |
| Event-driven alerts | `ingestion/lambdas/`, `backend/src/services/alerts/` |
| AWS stack (S3, Glue, Redshift, Lambda, EventBridge, SageMaker, Bedrock, VPC) | `infrastructure/` |
| 5 specialist agents | `agents/*/` |
| Security (VPC, IAM, RBAC, audit) | `backend/src/middleware/`, `infrastructure/modules/security/` |
| Observability | `backend/src/lib/observability/`, `infrastructure/modules/observability/` |

## Repository layout

```
ai-airlines/
├── docs/                 # Architecture, phases, events, data model
├── shared/               # Cross-cutting types & event schemas
├── frontend/             # Next.js dashboard + copilot UI
├── backend/              # Express API, WebSocket, RBAC, alerts
├── ingestion/            # Lambda handlers, Glue jobs, connectors
├── ml/                   # SageMaker training & inference
├── agents/               # Bedrock agent definitions & tools
├── infrastructure/       # AWS IaC (Terraform modules)
├── scripts/              # Local dev, seed data, deploy helpers
└── docker-compose.yml    # Local Postgres/Redis (optional)
```

## Implementation order

Follow **[docs/IMPLEMENTATION_PHASES.md](docs/IMPLEMENTATION_PHASES.md)** — 10 phases from auth through production observability.

Quick start (after Phase 0 setup):

```bash
# Terminal 1 — API
cd backend && npm install && npm run dev

# Terminal 2 — UI
cd frontend && npm install && npm run dev
```

Default ports: API `3001`, UI `3000` (configure in `.env`).

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14, TypeScript, Tailwind, Recharts, Leaflet, WebSocket |
| Backend | Node.js, Express, TypeScript, WebSocket, RBAC, audit logs |
| Data | S3 data lake, Glue ETL, Redshift warehouse |
| Events | EventBridge, Lambda |
| ML | SageMaker |
| GenAI | Bedrock + Agents |
| IaC | Terraform (AWS Well-Architected modules) |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Implementation phases](docs/IMPLEMENTATION_PHASES.md)
- [Data model](docs/DATA_MODEL.md)
- [Event catalog](docs/EVENT_CATALOG.md)
- [Security](docs/SECURITY.md)
