-- Phase 19+ — PNR ownership for access control

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON bookings (created_by_user_id);
