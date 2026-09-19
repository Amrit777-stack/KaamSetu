-- Safe for an existing Supabase PostgreSQL database; no data is removed.
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
