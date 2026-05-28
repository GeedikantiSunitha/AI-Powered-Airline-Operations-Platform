import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const OTP_QUERY = `
SELECT
  hub_iata,
  COUNT(*)::INT AS flights_total,
  ROUND(100.0 * AVG(CASE WHEN on_time_flag THEN 1.0 ELSE 0.0 END), 2) AS otp_pct
FROM fact_flight_leg
WHERE COALESCE(actual_departure, updated_at) >= (NOW() - INTERVAL '7 days')
GROUP BY hub_iata
ORDER BY hub_iata;
`;

async function run(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(OTP_QUERY);
    console.log(JSON.stringify({ ok: true, last7daysByHub: res.rows }, null, 2));
  } finally {
    await client.end();
  }
}

void run();

