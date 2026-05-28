# Commands Runbook

This file captures the key commands used during setup and implementation so you can run the same flow yourself.

## Notes

- Shell is PowerShell on Windows.
- Use `;` to chain commands in PowerShell (not `&&`).
- Run commands from the specified folder.

---

## General environment checks

### Check project and service status

```powershell
netstat -ano | findstr :5432
```

- Purpose: verify PostgreSQL is listening on port `5432`.

```powershell
Get-Service | Where-Object { $_.Name -like "*postgres*" -or $_.DisplayName -like "*PostgreSQL*" }
```

- Purpose: list PostgreSQL services and running state.

```powershell
Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter psql.exe -ErrorAction SilentlyContinue | Select-Object -First 5 FullName
```

- Purpose: locate `psql.exe` binaries.

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -U postgres -d postgres -c "\conninfo"
```

- Purpose: confirm DB connection details (host, port, user, database).

---

## Dependency install and type checks

### Backend

```powershell
cd backend
npm install
npm run typecheck
```

- Purpose:
  - install backend dependencies.
  - verify TypeScript compilation for backend code.

### Frontend

```powershell
cd frontend
npm install
npm run typecheck
```

- Purpose:
  - install frontend dependencies.
  - verify TypeScript compilation for frontend code.

---

## Phase 16 checks (SRE readiness)

```powershell
cd backend
npm run runbook:quarterly-failure-drill
```

- Purpose: run quarterly chaos suite (ingestion outage, model endpoint failure, OpenSearch degradation) and verify detection + recovery within SLO.

```powershell
$admin = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/v1/auth/login" -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'; $token = $admin.token; Invoke-RestMethod -Uri "http://localhost:3001/api/v1/sre/dashboard" -Headers @{ Authorization = "Bearer $token" }
```

- Purpose: verify unified SRE dashboard API returns pipeline/model/agent/API SLO widgets.

---

## Start / restart app servers

```powershell
foreach ($port in 3001, 3000, 8080) { Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }; Write-Host "Ports 3001/3000/8080 cleared"
```

- Purpose: stop existing API/UI dev servers before restart.

```powershell
cd backend
npm run dev
```

- Purpose: start backend API server on port `3001`.

```powershell
cd frontend
npm run dev
```

- Purpose: start frontend Next.js server on port `3000`.

---

## Phase 1 checks (Auth + RBAC)

```powershell
$viewer = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/v1/auth/login" -ContentType "application/json" -Body '{"username":"viewer","password":"viewer123"}'; $viewerToken = $viewer.token; try { Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/users" -Headers @{ Authorization = "Bearer $viewerToken" } | Out-Null; $viewerAdmin = 200 } catch { $viewerAdmin = $_.Exception.Response.StatusCode.value__ }; "viewer-admin-status=$viewerAdmin"
```

- Purpose: confirm `viewer` cannot access admin route (`403` expected).

```powershell
$admin = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/v1/auth/login" -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'; $adminToken = $admin.token; $adminUsers = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/users" -Headers @{ Authorization = "Bearer $adminToken" }; "admin-users-count=$($adminUsers.data.Count)"
```

- Purpose: confirm admin route works for `admin`.

---

## Phase 2 checks (Flights + WebSocket)

```powershell
$admin = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/v1/auth/login" -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'; $token = $admin.token; $list = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/flights" -Headers @{ Authorization = "Bearer $token" }; $one = Invoke-RestMethod -Uri ("http://localhost:3001/api/v1/flights/" + $list.data[0].flightLegId) -Headers @{ Authorization = "Bearer $token" }; "flights-count=$($list.data.Count); single-flight=$($one.data.flightNumber)"
```

- Purpose: verify flights REST endpoints return data.

```powershell
node -e "const WebSocket=require('ws');(async()=>{const login=await fetch('http://localhost:3001/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123'})});const {token}=await login.json();const start=Date.now();const ws=new WebSocket('ws://localhost:3001/ws');let done=false;ws.on('open',async()=>{ws.send(JSON.stringify({action:'subscribe',topic:'flight.status.updated'}));await fetch('http://localhost:3001/api/v1/flights/simulate-delay',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({flightLegId:'FL-20260521-AI405-BOM-BLR',delayMinutes:10})});});ws.on('message',(buf)=>{const msg=JSON.parse(buf.toString());if(msg.type==='flight.status.updated'){console.log('latency_ms='+ (Date.now()-start));done=true;ws.close();}});setTimeout(()=>{if(!done){console.log('timeout');process.exit(1);}else process.exit(0);},2000);})();"
```

- Purpose: verify WebSocket event delivery and latency (< 2s checkpoint).

---

## Phase 3 commands (Ingestion pipeline)

```powershell
cd backend
npm run ingest:sample
```

- Purpose: run sample `FlightDelayed` event ingestion:
  - validates event,
  - writes to local S3-style folders under `ingestion/local-s3`,
  - inserts row into `stg_flight_events`.

```powershell
python "c:\Users\prash\sunitha\Fintech\ai-airlines\ingestion\glue\curate-flight-events.py"
```

- Purpose: smoke-test Glue ETL stub script output.

---

## Phase 4 commands (Warehouse + OTP checkpoint)

```powershell
cd backend
npm run warehouse:etl
```

- Purpose: load gold warehouse tables from staging:
  - `dim_airport`
  - `dim_aircraft`
  - `fact_flight_leg`
  - `fact_delay`

```powershell
cd backend
npm run warehouse:otp
```

- Purpose: run OTP query for last 7 days grouped by hub (Phase 4 checkpoint).

---

## Quick health checks

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

- Purpose: verify backend health endpoint.

```powershell
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
```

- Purpose: verify frontend responds.

