-- Migration: 018_services_and_activity_system_scope_postgres.sql
-- Description: System node isolation for services and activity logs (PostgreSQL)

ALTER TABLE services ADD COLUMN IF NOT EXISTS system_id VARCHAR(64) NOT NULL DEFAULT 'local-host';
CREATE INDEX IF NOT EXISTS idx_services_system_id ON services(system_id);

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS system_id VARCHAR(64) NOT NULL DEFAULT 'local-host';
CREATE INDEX IF NOT EXISTS idx_activity_logs_system_id ON activity_logs(system_id);
