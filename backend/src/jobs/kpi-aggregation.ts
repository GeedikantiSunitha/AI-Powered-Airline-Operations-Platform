/**
 * Phase 5 — Scheduled job: aggregate KPIs from warehouse → cache/API
 * Run via cron, EventBridge schedule, or node-cron in dev
 */
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
import { kpiService } from '../services/kpi/kpiService';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
}

export async function runKpiAggregation(): Promise<void> {
  const summary = await kpiService.getSummary(7);
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS kpi_daily (
        id BIGSERIAL PRIMARY KEY,
        period VARCHAR(16) NOT NULL,
        otp_pct NUMERIC(6,2) NOT NULL,
        avg_delay_minutes NUMERIC(8,2) NOT NULL,
        cancellation_rate_pct NUMERIC(6,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(
      `
      INSERT INTO kpi_daily (period, otp_pct, avg_delay_minutes, cancellation_rate_pct)
      VALUES ($1, $2, $3, $4)
    `,
      [
        summary.period,
        summary.onTimePerformancePct,
        summary.avgDelayMinutes,
        summary.cancellationRatePct,
      ]
    );
  } finally {
    await client.end();
  }
}
