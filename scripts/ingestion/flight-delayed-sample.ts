import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import { buildFlightDelayedEvent } from '../../ingestion/connectors/flight-system/connector';
import { handler } from '../../ingestion/lambdas/flight-event-processor/handler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const DEFAULT_DB_CANDIDATES = [
  'postgresql://airline:airline@localhost:5432/airline_ops',
  'postgresql://postgres:postgres@localhost:5432/airline_ops',
  'postgresql://postgres:password@localhost:5432/airline_ops',
  'postgresql://postgres@localhost:5432/airline_ops',
];

async function ensureStagingTable(client: Client): Promise<void> {
  await client.query(`
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
  `);
}

async function run(): Promise<void> {
  const event = buildFlightDelayedEvent();
  const result = await handler(event);
  if (result.statusCode >= 300) {
    throw new Error(`Processor failed: ${result.body}`);
  }
  const payload = JSON.parse(result.body) as {
    processed: {
      flight_leg_id: string;
      flight_number: string;
      event_type: string;
      delay_minutes: number;
      reason_code: string;
      occurred_at: string;
    };
    rawPath: string;
  };

  const connectionCandidates = process.env.DATABASE_URL
    ? [process.env.DATABASE_URL]
    : DEFAULT_DB_CANDIDATES;

  let client: Client | null = null;
  let connectedWith: string | null = null;
  for (const connectionString of connectionCandidates) {
    const candidateClient = new Client({ connectionString });
    try {
      await candidateClient.connect();
      client = candidateClient;
      connectedWith = connectionString;
      break;
    } catch {
      await candidateClient.end().catch(() => undefined);
    }
  }
  if (!client || !connectedWith) {
    throw new Error(
      'Could not connect to Postgres. Set DATABASE_URL and re-run `npm run ingest:sample`.'
    );
  }

  try {
    await ensureStagingTable(client);
    await client.query(
      `INSERT INTO stg_flight_events
        (flight_leg_id, flight_number, event_type, delay_minutes, reason_code, occurred_at, raw_event)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        payload.processed.flight_leg_id,
        payload.processed.flight_number,
        payload.processed.event_type,
        payload.processed.delay_minutes,
        payload.processed.reason_code,
        payload.processed.occurred_at,
        JSON.stringify(event),
      ]
    );
    const verify = await client.query(
      `SELECT flight_leg_id, event_type, delay_minutes, ingested_at
       FROM stg_flight_events
       WHERE flight_leg_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [payload.processed.flight_leg_id]
    );
    console.log(
      JSON.stringify(
        {
          ok: true,
          database: connectedWith,
          rawPath: payload.rawPath,
          stagingRow: verify.rows[0],
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
}

void run();

