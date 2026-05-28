/**
 * Phase 3 — Process inbound flight events
 * - Validate against shared/schemas/events/
 * - Write to S3 raw/
 * - Publish to EventBridge
 * - Trigger cache/WebSocket fanout via API callback
 */
import { promises as fs } from 'fs';
import path from 'path';

interface FlightDelayedDetail {
  flightLegId: string;
  flightNumber: string;
  delayMinutes: number;
  reasonCode: string;
  previousEta?: string;
  newEta?: string;
}

interface EventEnvelope<T> {
  source: string;
  ['detail-type']: string;
  time?: string;
  detail: T;
}

interface ProcessedFlightEvent {
  flight_leg_id: string;
  flight_number: string;
  event_type: string;
  delay_minutes: number;
  reason_code: string;
  occurred_at: string;
}

function assertFlightDelayedEvent(
  event: unknown
): asserts event is EventEnvelope<FlightDelayedDetail> {
  const input = event as EventEnvelope<FlightDelayedDetail>;
  if (!input || typeof input !== 'object') throw new Error('Event must be object');
  if (input['detail-type'] !== 'FlightDelayed') throw new Error('detail-type must be FlightDelayed');
  if (!input.detail?.flightLegId) throw new Error('detail.flightLegId is required');
  if (!input.detail?.flightNumber) throw new Error('detail.flightNumber is required');
  if (typeof input.detail?.delayMinutes !== 'number') {
    throw new Error('detail.delayMinutes must be number');
  }
  if (!input.detail?.reasonCode) throw new Error('detail.reasonCode is required');
}

async function writeToLocalS3(prefix: 'raw' | 'curated' | 'processed', payload: unknown): Promise<string> {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const localS3Root =
    process.env.LOCAL_S3_ROOT || path.resolve(process.cwd(), '..', 'ingestion', 'local-s3');
  const dir = path.resolve(localS3Root, prefix, 'flights', yyyy, mm, dd);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `flightdelayed-${now.getTime()}.json`);
  await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

export async function handler(event: unknown): Promise<{ statusCode: number; body: string }> {
  try {
    assertFlightDelayedEvent(event);
    const occurredAt = event.time ?? new Date().toISOString();

    const processed: ProcessedFlightEvent = {
      flight_leg_id: event.detail.flightLegId,
      flight_number: event.detail.flightNumber,
      event_type: event['detail-type'],
      delay_minutes: event.detail.delayMinutes,
      reason_code: event.detail.reasonCode,
      occurred_at: occurredAt,
    };

    const rawPath = await writeToLocalS3('raw', event);
    const curatedPath = await writeToLocalS3('curated', processed);
    const processedPath = await writeToLocalS3('processed', {
      ...processed,
      normalized: true,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, rawPath, curatedPath, processedPath, processed }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Invalid event' }),
    };
  }
}
