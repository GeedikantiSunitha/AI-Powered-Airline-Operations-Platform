import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const DDL_SQL = `
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
`;

const UPSERT_GOLD_SQL = `
WITH latest AS (
  SELECT DISTINCT ON (s.flight_leg_id)
    s.flight_leg_id,
    s.flight_number,
    s.event_type,
    s.reason_code,
    s.delay_minutes,
    s.occurred_at,
    split_part(s.flight_leg_id, '-', 4) AS origin,
    split_part(s.flight_leg_id, '-', 5) AS destination,
    COALESCE(NULLIF(split_part(s.flight_leg_id, '-', 4), ''), 'UNK') AS hub_iata,
    COALESCE((s.raw_event->'detail'->>'aircraftRegistration'), 'UNKNOWN') AS aircraft_registration
  FROM stg_flight_events s
  ORDER BY s.flight_leg_id, s.occurred_at DESC
),
airport_codes AS (
  SELECT origin AS airport_iata FROM latest
  UNION
  SELECT destination AS airport_iata FROM latest
)
INSERT INTO dim_airport (airport_iata, name, country)
SELECT airport_iata, airport_iata || ' Airport', 'IN'
FROM airport_codes
WHERE airport_iata IS NOT NULL AND airport_iata <> ''
ON CONFLICT (airport_iata) DO NOTHING;

WITH latest AS (
  SELECT DISTINCT ON (s.flight_leg_id)
    s.flight_leg_id,
    s.flight_number,
    s.delay_minutes,
    s.occurred_at,
    split_part(s.flight_leg_id, '-', 4) AS origin,
    split_part(s.flight_leg_id, '-', 5) AS destination,
    COALESCE(NULLIF(split_part(s.flight_leg_id, '-', 4), ''), 'UNK') AS hub_iata,
    COALESCE((s.raw_event->'detail'->>'aircraftRegistration'), 'UNKNOWN') AS aircraft_registration
  FROM stg_flight_events s
  ORDER BY s.flight_leg_id, s.occurred_at DESC
)
INSERT INTO dim_aircraft (aircraft_registration, aircraft_type, airline_code)
SELECT DISTINCT aircraft_registration, 'NARROW_BODY', split_part(flight_number, '-', 1)
FROM latest
WHERE aircraft_registration IS NOT NULL
ON CONFLICT (aircraft_registration)
DO UPDATE SET updated_at = NOW();

WITH latest AS (
  SELECT DISTINCT ON (s.flight_leg_id)
    s.flight_leg_id,
    s.flight_number,
    s.delay_minutes,
    s.occurred_at,
    split_part(s.flight_leg_id, '-', 4) AS origin,
    split_part(s.flight_leg_id, '-', 5) AS destination,
    COALESCE(NULLIF(split_part(s.flight_leg_id, '-', 4), ''), 'UNK') AS hub_iata,
    COALESCE((s.raw_event->'detail'->>'aircraftRegistration'), 'UNKNOWN') AS aircraft_registration
  FROM stg_flight_events s
  ORDER BY s.flight_leg_id, s.occurred_at DESC
)
INSERT INTO fact_flight_leg (
  flight_leg_id,
  flight_number,
  origin,
  destination,
  scheduled_departure,
  scheduled_arrival,
  actual_departure,
  aircraft_registration,
  hub_iata,
  status,
  delay_minutes,
  on_time_flag
)
SELECT
  flight_leg_id,
  flight_number,
  origin,
  destination,
  occurred_at - make_interval(mins => delay_minutes),
  occurred_at + interval '90 minutes',
  occurred_at,
  aircraft_registration,
  hub_iata,
  CASE WHEN delay_minutes > 0 THEN 'DELAYED' ELSE 'ARRIVED' END,
  delay_minutes,
  delay_minutes <= 15
FROM latest
ON CONFLICT (flight_leg_id)
DO UPDATE SET
  delay_minutes = EXCLUDED.delay_minutes,
  status = EXCLUDED.status,
  on_time_flag = EXCLUDED.on_time_flag,
  hub_iata = EXCLUDED.hub_iata,
  actual_departure = EXCLUDED.actual_departure,
  updated_at = NOW();

INSERT INTO fact_delay (
  flight_leg_id,
  event_type,
  reason_code,
  delay_minutes,
  occurred_at,
  hub_iata
)
SELECT
  s.flight_leg_id,
  s.event_type,
  s.reason_code,
  s.delay_minutes,
  s.occurred_at,
  COALESCE(NULLIF(split_part(s.flight_leg_id, '-', 4), ''), 'UNK') AS hub_iata
FROM stg_flight_events s
LEFT JOIN fact_delay d
  ON d.flight_leg_id = s.flight_leg_id
 AND d.event_type = s.event_type
 AND d.occurred_at = s.occurred_at
WHERE d.delay_event_id IS NULL;
`;

async function run(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(DDL_SQL);
    await client.query(UPSERT_GOLD_SQL);

    const counts = await client.query(`
      SELECT 'dim_airport' AS table_name, COUNT(*)::INT AS row_count FROM dim_airport
      UNION ALL
      SELECT 'dim_aircraft' AS table_name, COUNT(*)::INT AS row_count FROM dim_aircraft
      UNION ALL
      SELECT 'fact_flight_leg' AS table_name, COUNT(*)::INT AS row_count FROM fact_flight_leg
      UNION ALL
      SELECT 'fact_delay' AS table_name, COUNT(*)::INT AS row_count FROM fact_delay
    `);
    console.log(JSON.stringify({ ok: true, tables: counts.rows }, null, 2));
  } finally {
    await client.end();
  }
}

void run();

