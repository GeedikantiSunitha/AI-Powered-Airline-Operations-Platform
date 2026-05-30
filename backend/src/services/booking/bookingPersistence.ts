import pg from 'pg';
import type { BookingRecord } from '@airline-ops/shared';

let pool: pg.Pool | null = null;
let enabled = false;

function rowToBooking(row: pg.QueryResultRow): BookingRecord {
  return {
    bookingId: row.booking_id as string,
    pnr: row.pnr as string,
    status: row.status as BookingRecord['status'],
    flightLegId: row.flight_leg_id as string,
    fareClass: row.fare_class as BookingRecord['fareClass'],
    passengers: row.passengers as BookingRecord['passengers'],
    seatIds: row.seat_ids as string[],
    ancillaries: row.ancillaries as BookingRecord['ancillaries'],
    totalUsd: Number(row.total_usd),
    paymentId: (row.payment_id as string) || undefined,
    ticketNumbers: row.ticket_numbers as string[],
    createdByUserId: (row.created_by_user_id as string) || undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

export const bookingPersistence = {
  isEnabled(): boolean {
    return enabled;
  },

  async init(): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.warn('[booking-persistence] DATABASE_URL not set — in-memory only');
      return;
    }
    try {
      pool = new pg.Pool({
        connectionString: url,
        max: 5,
        connectionTimeoutMillis: 2000,
        query_timeout: 3000,
        statement_timeout: 3000,
      });
      await pool.query('SELECT 1');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings (
          booking_id VARCHAR(64) PRIMARY KEY,
          pnr VARCHAR(16) UNIQUE NOT NULL,
          status VARCHAR(32) NOT NULL,
          flight_leg_id VARCHAR(64) NOT NULL,
          fare_class VARCHAR(32) NOT NULL,
          passengers JSONB NOT NULL,
          seat_ids JSONB NOT NULL,
          ancillaries JSONB NOT NULL DEFAULT '[]'::jsonb,
          total_usd NUMERIC(12, 2) NOT NULL,
          payment_id VARCHAR(64),
          ticket_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_by_user_id VARCHAR(64),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);
      await pool.query(
        'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(64)'
      );
      enabled = true;
      console.log('[booking-persistence] Postgres enabled');
    } catch (err) {
      console.warn('[booking-persistence] disabled:', err instanceof Error ? err.message : err);
      pool = null;
      enabled = false;
    }
  },

  async loadAll(): Promise<BookingRecord[]> {
    if (!pool || !enabled) return [];
    const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
    return result.rows.map(rowToBooking);
  },

  async upsert(booking: BookingRecord): Promise<void> {
    if (!pool || !enabled) return;
    await pool.query(
      `INSERT INTO bookings (
        booking_id, pnr, status, flight_leg_id, fare_class, passengers, seat_ids,
        ancillaries, total_usd, payment_id, ticket_numbers, created_by_user_id, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (booking_id) DO UPDATE SET
        status = EXCLUDED.status,
        flight_leg_id = EXCLUDED.flight_leg_id,
        fare_class = EXCLUDED.fare_class,
        passengers = EXCLUDED.passengers,
        seat_ids = EXCLUDED.seat_ids,
        ancillaries = EXCLUDED.ancillaries,
        total_usd = EXCLUDED.total_usd,
        payment_id = EXCLUDED.payment_id,
        ticket_numbers = EXCLUDED.ticket_numbers,
        created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, bookings.created_by_user_id),
        updated_at = EXCLUDED.updated_at`,
      [
        booking.bookingId,
        booking.pnr,
        booking.status,
        booking.flightLegId,
        booking.fareClass,
        JSON.stringify(booking.passengers),
        JSON.stringify(booking.seatIds),
        JSON.stringify(booking.ancillaries),
        booking.totalUsd,
        booking.paymentId ?? null,
        JSON.stringify(booking.ticketNumbers),
        booking.createdByUserId ?? null,
        booking.createdAt,
        booking.updatedAt,
      ]
    );
  },
};
