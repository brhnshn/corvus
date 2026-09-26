-- 005_service_overrides_extended.sql — Extend service_overrides to support all service settings and stable matching
ALTER TABLE service_overrides ADD COLUMN health_check_url TEXT;
ALTER TABLE service_overrides ADD COLUMN check_type TEXT;
ALTER TABLE service_overrides ADD COLUMN port INTEGER;
ALTER TABLE service_overrides ADD COLUMN is_public INTEGER;
ALTER TABLE service_overrides ADD COLUMN service_id TEXT;

CREATE INDEX IF NOT EXISTS idx_service_overrides_service_id ON service_overrides(service_id);
