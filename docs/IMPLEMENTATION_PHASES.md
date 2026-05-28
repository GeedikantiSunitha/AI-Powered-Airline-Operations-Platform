# Implementation Phases

Work through these phases in order. Each phase has **checkpoints** — do not start the next until checkpoints pass.

---

## Phase 0: Scaffold & local environment

**Goal:** Repo runs locally with mock data.

- [ ] Copy `.env.example` → `.env`
- [ ] `docker-compose up -d` (Postgres + Redis)
- [ ] `cd backend && npm install && npm run dev`
- [ ] `cd frontend && npm install && npm run dev`
- [ ] Health: `GET http://localhost:3001/health` → `ok`
- [ ] UI loads Operations Dashboard with mock flights

**Folders:** entire repo (already scaffolded)

---

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ## Phase 1: Authentication & RBAC

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                **Goal:** Secure login and role-based UI/API access.

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                **Roles:** `admin`, `operations_manager`, `crew_manager`, `analyst`, `viewer`

- [x] Implement auth middleware (`backend/src/middleware/auth.ts`)
- [x] Role guard (`backend/src/middleware/rbac.ts`)
- [x] Login page + session/JWT (`frontend/src/app/(auth)/login`)
- [x] Protect dashboard routes
- [x] Audit log on login/logout

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                **Checkpoint:** Viewer cannot access admin routes; API returns 403.

---

## Phase 2: Flight Operations Dashboard (mock → API)

**Goal:** Real-time flight board with WebSocket updates.

- [x] REST: `GET /api/v1/flights`, `GET /api/v1/flights/:id`
- [x] WebSocket: subscribe `flight.status.updated`
- [x] UI: Operations Dashboard, flight detail drawer
- [x] Map: airport/flight positions (Leaflet)
- [x] Seed script: `scripts/seed/mock-flights.ts`

**Checkpoint:** Simulated delay updates appear on UI within 2s.

---

## Phase 3: Data ingestion pipeline (local → AWS)

**Goal:** Ingest normalized events into lake + warehouse.

- [x] Define event schemas (`shared/schemas/events/`)
- [x] Connector stubs: flight, weather, booking, baggage, crew, airport
- [x] Lambda: `ingestion/lambdas/flight-event-processor/`
- [x] S3 layout: `raw/`, `curated/`, `processed/`
- [x] Glue job stub: `ingestion/glue/curate-flight-events.py`
- [x] EventBridge rules in Terraform

**Checkpoint:** Sample `FlightDelayed` event lands in S3 and Postgres/Redshift staging table.

_Local run command:_ `cd backend && npm run ingest:sample` (set `DATABASE_URL` if needed).

---

## Phase 4: Data lake + warehouse (Redshift / local SQL)

**Goal:** Analytics-ready tables for KPIs and agents.

- [x] DDL: `scripts/db/migrations/` (dimensions + facts)
- [x] Glue → Redshift COPY or local ETL script
- [x] Gold tables: `fact_flight_leg`, `fact_delay`, `dim_airport`, `dim_aircraft`

**Checkpoint:** SQL query returns OTP for last 7 days by hub.

---

## Phase 5: KPI analytics module

**Goal:** Operational KPI dashboards.

- [x] API: `GET /api/v1/kpi/summary`, `GET /api/v1/kpi/trends`
- [x] UI: KPI page with Recharts (OTP, delay minutes, cancellations, baggage, crew, fuel)
- [x] Scheduled aggregation job (`backend/src/jobs/kpi-aggregation.ts`)

**Checkpoint:** KPI cards match warehouse SQL for same date range.

---

## Phase 6: ML prediction service (SageMaker)

**Goal:** Delay risk scores exposed to API and agents.

- [x] Feature pipeline: `ml/sagemaker/features/`
- [x] Train script: `ml/sagemaker/training/delay_prediction/`
- [x] Endpoint or batch transform
- [x] API: `GET /api/v1/predictions/delay?flightLegId=`
- [x] UI: Flight Delay Risk Dashboard

**Checkpoint:** Flight with known late inbound shows risk > 70% in UI.

_Local validation:_ `FL-20260521-AI302-DEL-BOM` returns `delayProbability=0.73` via `/api/v1/predictions/delay`.

---

## Phase 7: Event-driven alerts

**Goal:** Automatic alerts on thresholds.

- [x] Alert rules engine (`backend/src/services/alerts/`)
- [x] EventBridge → Lambda → notification (email/SNS/dashboard)
- [x] UI: Alerts + Incident History
- [x] Rules: delay risk, crew unavailable, weather, baggage

**Checkpoint:** Inject test event → alert appears in UI within 1 minute.

_Local validation:_ injected `WeatherRiskDetected` reached `alerts.created` stream in `29ms`.

---

## Phase 8: AI Copilot (Bedrock)

**Goal:** Natural-language Q&A grounded in operational data.

- [x] Bedrock client + RAG/context builder
- [x] API: `POST /api/v1/copilot/chat`
- [x] UI: Copilot chat with citations
- [x] Log: prompt, sources, response, confidence

**Checkpoint:** Ask “high delay risk next 3 hours” → returns flight list from live data.

_Local validation:_ `/api/v1/copilot/chat` returns top high-risk flights with citations from `/api/v1/predictions/delay/batch`.

---

## Phase 9: Specialist agents (Bedrock Agents)

**Goal:** Five agents with tools and supervisor routing.

| Agent | Phase deliverable |
|-------|-------------------|
| Flight Delay Analysis | Risk + explanation |
| Crew Coordination | Reassignment suggestions |
| Airport Congestion | Gate/runway pressure |
| Fuel Optimization | Planned vs actual variance |
| Passenger Impact | Misconnects + rebooking priority |

- [x] Implement each under `agents/<name>/`
- [x] Register tools in `agents/shared/tools/`
- [x] Wire supervisor in `backend/src/services/copilot/supervisor.ts`

**Checkpoint:** Copilot routes crew question to Crew agent with valid tool calls in audit log.

_Local validation:_ crew prompt routed to `crew-coordination` with `2` tool calls and `copilot.agent_routed` audit entry.

---

## Phase 10: Production hardening

**Goal:** Deploy with security and observability.

- [x] Terraform: VPC, S3, Glue, Redshift, Lambda, EventBridge, Cognito
- [x] Secrets Manager, encryption, least-privilege IAM
- [x] CloudWatch dashboards, X-Ray, model drift alarms
- [x] AI evaluation logs + human approval workflow
- [x] Admin: user management, alert rule config

**Checkpoint:** Runbook test — pipeline failure triggers PagerDuty/SNS mock.

_Local validation:_ `npm run runbook:pipeline-failure-drill` emits SNS + PagerDuty mock notifications for `PipelineFailure`.

_Role access validation:_ `viewer` navigation now hides non-ready sections (`Crew`, `Baggage`, `Passenger Impact`) and can open KPI without `403`.

_Viewer UX validation:_ `viewer` can open delay-risk predictions without `403`, and sidebar session label avoids hydration mismatch on refresh.

_Admin UX validation:_ `/admin` now renders working user management + alert-rule controls (no placeholder), backed by `/api/v1/admin/users` and `/api/v1/admin/alert-rules`.

---

## Production-ready modules checklist

| Module | Phase |
|--------|-------|
| Authentication & RBAC | 1 |
| Flight Operations Dashboard | 2 |
| Data Ingestion Pipeline | 3 |
| Data Lake + Warehouse | 4 |
| ML Prediction Service | 6 |
| AI Copilot | 8 |
| Alert & Notification System | 7 |
| Admin Configuration | 10 |
| Audit Logs | 1, 8, 9 |
| Monitoring & Observability | 10 |

---

## Phase 11: RAG knowledge layer (OpenSearch + Bedrock)

**Goal:** Ground copilots and agents in trusted airline documents.

- [x] Document ingestion pipeline for SOPs, maintenance manuals, FAA/compliance, crew policies
- [x] Chunking + embedding job for document corpus
- [x] OpenSearch index with metadata filters (`docType`, `effectiveDate`, `region`, `version`)
- [x] Retrieval service with top-k + re-ranking for copilot/agents
- [x] Citation contract in API responses (document id, section, confidence)

**Checkpoint:** Ask policy/compliance question and receive grounded answer with valid citations from indexed docs.

_Local validation:_ `POST /api/v1/copilot/knowledge/search` with `{"query":"crew duty reassign policy","topK":3}` returns answer + citations containing `documentId`, `section`, `confidence`.

_Local validation:_ `POST /api/v1/copilot/chat` with policy/compliance prompt returns grounded response and citation-enriched sources.

---

## Phase 12: Enterprise ML use-cases expansion

**Goal:** Move from single delay model to multi-model operations intelligence.

- [x] Weather impact forecasting model (route/airport level)
- [x] Passenger disruption scoring model (misconnect + compensation risk)
- [x] Predictive maintenance recommendation model (aircraft/component risk)
- [x] Unified prediction API contract for all models (`model`, `version`, `features`, `confidence`)
- [x] Model explainability payload (`topFactors`, SHAP/feature attribution summary)

**Checkpoint:** For one flight scenario, API returns delay + weather + passenger impact predictions with explanation fields.

_Local validation:_ `GET /api/v1/predictions/scenario?flightLegId=FL-20260521-AI302-DEL-BOM` returns unified `delay`, `weather`, `passengerImpact`, and `maintenance` predictions with `model`, `version`, `features`, `confidence`, and `explainability.topFactors` + `shapSummary`.

---

## Phase 13: MLOps productionization (SageMaker Pipelines)

**Goal:** Standardized train/deploy/monitor lifecycle with rollback safety.

- [x] SageMaker Pipelines for training, evaluation, approval, deployment
- [x] Model Registry integration and promotion workflow (`dev` → `staging` → `prod`)
- [x] CI/CD hooks for model packaging and infra updates
- [x] Drift detection + data quality monitoring with alarm thresholds
- [x] Rollback strategy (last-known-good model) with runbook automation

**Checkpoint:** Simulated drift alert triggers approval gate and controlled rollback to previous model version.

_Local validation:_ `cd backend && npm run runbook:model-drift-rollback-drill` promotes candidate, simulates drift breach, opens approval gate, and rolls back active prod from `1.2.0` to last-known-good `1.1.0`.

---

## Phase 14: Bedrock agent orchestration maturity

**Goal:** Reliable multi-agent execution with policy controls.

- [x] Replace mock orchestration paths with Bedrock Agent runtime integration
- [x] Prompt chaining templates per agent role (delay, crew, congestion, fuel, passenger impact)
- [x] Tool execution policy layer (allowed tools by role + action sensitivity)
- [x] Human-in-the-loop approval for high-impact recommendations
- [x] Agent evaluation suite (groundedness, correctness, latency, safety)

**Checkpoint:** Multi-step query routes through supervisor + 2 specialist agents and logs tool calls, approval state, and final recommendation.

_Local validation:_ `cd backend && npm run runbook:agent-orchestration-drill` returns `supervisorPlan` with 2+ agents, `toolCallCount >= 2`, `approvalRequired=true`, and evaluation `passed=true`.

---

## Phase 15: Security and private inference hardening

**Goal:** Enterprise security baseline for AI and data workloads.

- [x] VPC endpoints for S3, Bedrock, SageMaker, OpenSearch, Secrets Manager
- [x] Private inference endpoints for model serving (no public exposure)
- [x] IAM least-privilege audit and policy tightening pass
- [x] KMS key strategy for data lake, warehouse, and model artifacts
- [x] End-to-end audit logging for user actions + AI recommendations + model decisions

**Checkpoint:** Security review validates no public inference endpoints and full audit chain for one copilot recommendation.

_Local validation:_ `cd backend && npm run runbook:security-review-drill` returns `privateInferenceOnly=true`, `auditChainComplete=true`, and `publicInferenceEndpointCount=0`.

---

## Phase 16: Reliability, observability, and SRE readiness

**Goal:** Operate the platform safely at enterprise scale.

- [x] Unified dashboards: data pipeline health, model health, agent latency, API SLOs
- [x] Alerting strategy for pipeline failures, drift, high error rates, and agent/tool failures
- [x] Synthetic checks for critical user journeys (dashboard, predictions, copilot, admin)
- [x] Incident response playbooks with escalation paths and ownership
- [x] Chaos/failure drills for ingestion outage, model endpoint failure, and OpenSearch degradation

**Checkpoint:** Quarterly failure drill demonstrates detection, alerting, mitigation, and recovery within target SLO.

_Local validation:_ `cd backend && npm run runbook:quarterly-failure-drill` returns `ok=true` with all chaos scenarios `detected`, `mitigated`, `recovered`, and `withinSlo=true`.

---

## Phase 17: Booking and reservations platform

**Goal:** Add production-grade passenger booking flows integrated with operations intelligence.

- [ ] Booking APIs: search, fare quote, hold, create booking, payment confirmation, ticket issuance
- [ ] PNR management: passenger details, itinerary changes, cancellation, refund, re-accommodation
- [ ] Inventory + seat map service with fare class rules and overbooking controls
- [ ] Payment gateway abstraction with retry, idempotency keys, and fraud/risk flags
- [ ] Passenger self-service UI: booking, manage trip, ancillary selection, disruption rebooking
- [ ] Event integration: emit booking lifecycle events to data lake and agent workflows

**Checkpoint:** End-to-end booking flow (search → pay → ticket) succeeds, and disruption event triggers policy-based rebooking options.

---

## Phase 18: Commercial optimization and customer intelligence

**Goal:** Optimize revenue, customer experience, and disruption handling decisions.

- [ ] Dynamic pricing engine integration with demand and seat inventory signals
- [ ] Offer management for ancillaries (bags, seat, meals, lounge) with experimentation hooks
- [ ] Customer segmentation and loyalty-aware recommendation layer
- [ ] Irregular operations module for automated compensation and reaccommodation policy decisions
- [ ] Revenue and conversion dashboards linking booking funnel to operational constraints

**Checkpoint:** For one disrupted flight, system recommends and executes best rebooking + ancillary retention strategy with tracked revenue/cx impact.

---

## Phase 11+ completion gates

- [ ] RAG answer quality >= target groundedness score on evaluation set
- [ ] Model drift alarms and rollback tested in non-prod and prod-like environment
- [ ] Agent recommendations traceable with citations, confidence, and approval status
- [ ] Security sign-off for private inference + least privilege + encryption posture
- [ ] Operational SLOs met for API latency, prediction freshness, and alert delivery
- [ ] Booking platform SLOs met for search latency, payment success rate, and ticket issuance reliability
