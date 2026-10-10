-- Migration: 014_alert_rules.sql
-- Description: Eşik tabanlı sistem ve konteyner alarmları tablosu (Faz 9)

CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'system', -- 'system' veya 'container'
    target_id TEXT,                             -- container id veya NULL
    metric TEXT NOT NULL,                       -- 'cpu', 'memory', 'disk'
    operator TEXT NOT NULL DEFAULT 'gt',        -- 'gt' (>), 'lt' (<)
    threshold_value REAL NOT NULL,              -- örn: 85.0 (%85)
    duration_seconds INTEGER NOT NULL DEFAULT 60, -- Kaç saniye boyunca eşik aşılırsa alarm verilsin
    cooldown_minutes INTEGER NOT NULL DEFAULT 30, -- Aynı kural kaç dakika aralıkla alarm göndersin (spam engeli)
    is_enabled INTEGER NOT NULL DEFAULT 1,
    is_firing INTEGER NOT NULL DEFAULT 0,
    violation_start_at TEXT,
    last_triggered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_target ON alert_rules(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(is_enabled);
