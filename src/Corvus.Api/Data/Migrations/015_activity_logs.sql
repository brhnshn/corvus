-- Migration: 015_activity_logs.sql
-- Description: Sistem olay ve denetim kayıtları tablosu (Faz 10)

CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    actor_username TEXT NOT NULL DEFAULT 'system', -- 'system', 'admin' vb.
    action_type TEXT NOT NULL,                     -- 'container_restart', 'compose_update', 'threshold_alert', 'user_login' vb.
    category TEXT NOT NULL DEFAULT 'system',       -- 'container', 'service', 'security', 'alert', 'system'
    target_resource TEXT NOT NULL,                 -- örn: 'nginx-web', 'api.example.com', 'CPU > %85'
    details_json TEXT,                             -- Ek parametreler veya JSON metadata
    ip_address TEXT,                               -- İstek atan IP adresi
    created_at TEXT NOT NULL                       -- ISO 8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_username);
