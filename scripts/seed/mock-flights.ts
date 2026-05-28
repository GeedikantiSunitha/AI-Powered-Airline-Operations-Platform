/**
 * Phase 2 helper:
 * Simulate a delay event by calling the API endpoint that broadcasts
 * `flight.status.updated` over WebSocket.
 *
 * Usage:
 *   npx tsx scripts/seed/mock-flights.ts FL-20260521-AI405-BOM-BLR 20
 */
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const flightLegId = process.argv[2] ?? 'FL-20260521-AI405-BOM-BLR';
const delayMinutes = Number(process.argv[3] ?? 15);
const token = process.env.AUTH_TOKEN;

async function run(): Promise<void> {
  if (!token) {
    console.error('Set AUTH_TOKEN environment variable before running this script.');
    process.exit(1);
  }

  const res = await fetch(`${BASE_URL}/api/v1/flights/simulate-delay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ flightLegId, delayMinutes }),
  });

  const body = (await res.json()) as unknown;
  if (!res.ok) {
    console.error('Simulation failed', body);
    process.exit(1);
  }
  console.log('Simulated delay event:', JSON.stringify(body, null, 2));
}

void run();
