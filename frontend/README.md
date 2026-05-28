# Frontend (Next.js)

## Pages (App Router)

| Route | Module | Phase |
|-------|--------|-------|
| `/` | Operations Dashboard | 2 |
| `/delay-risk` | Flight Delay Risk | 6 |
| `/crew` | Crew Coordination | 9 |
| `/baggage` | Baggage Monitoring | 3+ |
| `/passenger-impact` | Passenger Impact | 9 |
| `/kpi` | KPI Analytics | 5 |
| `/copilot` | AI Copilot Chat | 8 |
| `/alerts` | Alerts & Incidents | 7 |
| `/admin` | User Management | 10 |
| `/login` | Authentication | 1 |

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Libraries

- **Recharts** — KPI and trend charts
- **Leaflet** — airport / flight map (Phase 2)
- **WebSocket** — `src/lib/wsClient.ts` for live updates
