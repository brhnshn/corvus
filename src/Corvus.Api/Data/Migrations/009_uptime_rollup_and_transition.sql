-- 1. Uptime kontrollerine durum geçişi (transition) bayrağı ekle
ALTER TABLE uptime_checks ADD COLUMN is_transition INTEGER NOT NULL DEFAULT 0;

-- 2. Akıllı temizlik için indeks
CREATE INDEX IF NOT EXISTS idx_uptime_checks_cleanup ON uptime_checks (checked_at, is_transition);

-- 3. 365 günlük hafif yıllık hafıza için günlük özet tablosu
CREATE TABLE IF NOT EXISTS uptime_daily_stats (
    service_id TEXT NOT NULL,
    date TEXT NOT NULL,
    total_checks INTEGER NOT NULL,
    up_checks INTEGER NOT NULL,
    avg_response_time_ms INTEGER,
    PRIMARY KEY (service_id, date)
);

CREATE INDEX IF NOT EXISTS idx_uptime_daily_date ON uptime_daily_stats (date DESC);
