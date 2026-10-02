-- 012_metrics_hourly_rollup.sql — 1 yıllık hafif geçmiş için saatlik metrik özet tablosu

CREATE TABLE IF NOT EXISTS system_metrics_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recorded_at TEXT NOT NULL UNIQUE,
    cpu_percent REAL NOT NULL,
    ram_used_mb REAL NOT NULL,
    ram_total_mb REAL NOT NULL,
    disk_used_gb REAL NOT NULL,
    disk_total_gb REAL NOT NULL,
    network_rx_bytes INTEGER NOT NULL,
    network_tx_bytes INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_hourly_recorded_at ON system_metrics_hourly(recorded_at);
