-- 006_uptime_advanced_options.sql — Uptime advanced check options & status page settings

-- 1. Extend services table with advanced uptime check options
ALTER TABLE services ADD COLUMN check_interval INTEGER NOT NULL DEFAULT 60;
ALTER TABLE services ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 1;
ALTER TABLE services ADD COLUMN retry_interval INTEGER NOT NULL DEFAULT 30;
ALTER TABLE services ADD COLUMN timeout_seconds INTEGER NOT NULL DEFAULT 5;
ALTER TABLE services ADD COLUMN ignore_tls INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN accepted_status_codes TEXT NOT NULL DEFAULT '200-299';
ALTER TABLE services ADD COLUMN http_method TEXT NOT NULL DEFAULT 'GET';

-- 2. Extend service_overrides table with overrideable check options
ALTER TABLE service_overrides ADD COLUMN check_interval INTEGER;
ALTER TABLE service_overrides ADD COLUMN max_retries INTEGER;
ALTER TABLE service_overrides ADD COLUMN retry_interval INTEGER;
ALTER TABLE service_overrides ADD COLUMN timeout_seconds INTEGER;
ALTER TABLE service_overrides ADD COLUMN ignore_tls INTEGER;
ALTER TABLE service_overrides ADD COLUMN accepted_status_codes TEXT;
ALTER TABLE service_overrides ADD COLUMN http_method TEXT;

-- 3. Settings default for status page
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('status_page_enabled', 'false', datetime('now'));

-- 4. Opt-in public status: update existing services to private (0)
UPDATE services SET is_public = 0 WHERE is_public = 1;
