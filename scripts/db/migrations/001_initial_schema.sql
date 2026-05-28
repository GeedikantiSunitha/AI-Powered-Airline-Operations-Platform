-- Phase 4 — Local Postgres mirrors Redshift star schema (simplified)

CREATE TABLE IF NOT EXISTS dim_airport (
  airport_iata VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100),
  country VARCHAR(2)
);

CREATE TABLE IF NOT EXISTS dim_aircraft (
  aircraft_registration VARCHAR(16) PRIMARY KEY,
  aircraft_type VARCHAR(32),
  airline_code VARCHAR(8),
  active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fact_flight_leg (
  flight_leg_id VARCHAR(64) PRIMARY KEY,
  flight_number VARCHAR(10),
  origin VARCHAR(3),
  destination VARCHAR(3),
  scheduled_departure TIMESTAMPTZ,
  scheduled_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  aircraft_registration VARCHAR(16),
  hub_iata VARCHAR(3),
  status VARCHAR(20),
  delay_minutes INT DEFAULT 0,
  on_time_flag BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fact_delay (
  delay_event_id BIGSERIAL PRIMARY KEY,
  flight_leg_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  reason_code VARCHAR(32),
  delay_minutes INT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  hub_iata VARCHAR(3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64),
  action VARCHAR(100),
  resource VARCHAR(200),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  alert_id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(50),
  severity VARCHAR(20),
  flight_leg_id VARCHAR(64),
  message TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3 staging table for ingestion pipeline (local Postgres mirror)
CREATE TABLE IF NOT EXISTS stg_flight_events (
  id BIGSERIAL PRIMARY KEY,
  flight_leg_id VARCHAR(64) NOT NULL,
  flight_number VARCHAR(16) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  delay_minutes INT NOT NULL DEFAULT 0,
  reason_code VARCHAR(32),
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_event JSONB NOT NULL
);
