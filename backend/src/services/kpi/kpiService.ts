import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
import type { KpiSummary } from '@airline-ops/shared';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
}

export interface KpiTrendPoint {
  date: string;
  otpPct: number;
  avgDelayMinutes: number;
  cancellations: number;
}

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export const kpiService = {
  async getSummary(rangeDays = 7): Promise<KpiSummary> {
    return withDb(async (client) => {
      const res = await client.query(
        `
        SELECT
          ROUND(100.0 * AVG(CASE WHEN on_time_flag THEN 1.0 ELSE 0.0 END), 2) AS otp_pct,
          ROUND(AVG(delay_minutes)::numeric, 2) AS avg_delay,
          ROUND(100.0 * AVG(CASE WHEN status = 'CANCELLED' THEN 1.0 ELSE 0.0 END), 2) AS cancel_pct
        FROM fact_flight_leg
        WHERE COALESCE(actual_departure, updated_at) >= (NOW() - ($1::text || ' days')::interval)
      `,
        [String(rangeDays)]
      );

      const row = res.rows[0] ?? {};
      return {
        period: `${rangeDays}d`,
        onTimePerformancePct: Number(row.otp_pct ?? 0),
        avgDelayMinutes: Number(row.avg_delay ?? 0),
        cancellationRatePct: Number(row.cancel_pct ?? 0),
        baggageDelayRatePct: 0,
        crewUtilizationPct: 0,
        passengerImpactScore: 0,
        fuelEfficiencyPct: 0,
      };
    });
  },

  async getTrends(rangeDays = 7): Promise<KpiTrendPoint[]> {
    return withDb(async (client) => {
      const res = await client.query(
        `
        WITH day_series AS (
          SELECT (CURRENT_DATE - offs)::date AS day
          FROM generate_series(0, $1::int - 1) AS offs
        ),
        daily AS (
          SELECT
            DATE(COALESCE(actual_departure, updated_at)) AS day,
            ROUND(100.0 * AVG(CASE WHEN on_time_flag THEN 1.0 ELSE 0.0 END), 2) AS otp_pct,
            ROUND(AVG(delay_minutes)::numeric, 2) AS avg_delay,
            COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancellations
          FROM fact_flight_leg
          WHERE COALESCE(actual_departure, updated_at) >= (NOW() - ($1::text || ' days')::interval)
          GROUP BY 1
        )
        SELECT
          to_char(s.day, 'YYYY-MM-DD') AS date,
          COALESCE(d.otp_pct, 0)::float AS otp_pct,
          COALESCE(d.avg_delay, 0)::float AS avg_delay,
          COALESCE(d.cancellations, 0)::int AS cancellations
        FROM day_series s
        LEFT JOIN daily d ON d.day = s.day
        ORDER BY s.day
      `,
        [rangeDays]
      );

      return res.rows.map((row: { date: string; otp_pct: number; avg_delay: number; cancellations: number }) => ({
        date: row.date as string,
        otpPct: Number(row.otp_pct),
        avgDelayMinutes: Number(row.avg_delay),
        cancellations: Number(row.cancellations),
      }));
    });
  },
};

