-- Migration: 019_deployments_sqlite.sql
-- Description: Create deployments table and indexes for zero-downtime container deployment center

CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL DEFAULT 'container',
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    trigger_type TEXT NOT NULL DEFAULT 'manual_ui',
    triggered_by TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending',
    current_step TEXT NOT NULL DEFAULT 'queued',
    image_name TEXT NOT NULL,
    old_digest TEXT,
    new_digest TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    log_output TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_deployments_target_id ON deployments(target_id);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
