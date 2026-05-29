-- Phase 17+ — Persist bookings across API restarts

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
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_pnr ON bookings (pnr);
CREATE INDEX IF NOT EXISTS idx_bookings_flight ON bookings (flight_leg_id);
