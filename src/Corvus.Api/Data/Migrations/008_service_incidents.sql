CREATE TABLE IF NOT EXISTS service_incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical', 'maintenance'
    is_pinned INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'investigating', -- 'investigating', 'identified', 'monitoring', 'resolved'
    created_at TEXT NOT NULL,
    resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_active ON service_incidents (status, is_pinned, created_at DESC);
