-- Migration: 016_systems_sqlite.sql
-- Description: SQLite schema for Systems Management with 1m rollup and rolling retention

-- 1. Sistemler Tablosu (Nodes/Systems)
CREATE TABLE IF NOT EXISTS systems (
    id TEXT PRIMARY KEY,                           -- UUID v4
    name TEXT NOT NULL,                            -- Kullanici dostu ad (orn: 'vps-frankfurt-01')
    hostname TEXT,                                 -- Raporlanan sunucu hostname
    ip_address TEXT,                               -- Algilanan IP adresi
    os_info TEXT,                                  -- Isletim sistemi ve mimari
    agent_version TEXT,                            -- Ajan surumu
    tags_json TEXT DEFAULT '[]',                   -- JSON etiket dizisi
    status TEXT NOT NULL DEFAULT 'offline',        -- 'online' | 'degraded' | 'offline'
    created_at TEXT NOT NULL,                      -- ISO 8601 UTC
    updated_at TEXT NOT NULL,                      -- ISO 8601 UTC
    last_seen_at TEXT                              -- ISO 8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_systems_status ON systems(status);
CREATE INDEX IF NOT EXISTS idx_systems_last_seen ON systems(last_seen_at);

-- 2. Sistem Erisim Belirtecleri (Tokens)
CREATE TABLE IF NOT EXISTS system_tokens (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,               -- SHA-256 hex string
    token_prefix TEXT NOT NULL,                    -- Orn: 'crv_live_9f82'
    created_at TEXT NOT NULL,
    expires_at TEXT,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    revoked_at TEXT,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_system_tokens_hash ON system_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_system_tokens_sys ON system_tokens(system_id);

-- 3. 1 Dakikalik Toplu Metrik Tablosu (7 Gun Saklanir)
CREATE TABLE IF NOT EXISTS system_metrics_1m (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id TEXT NOT NULL,
    recorded_at TEXT NOT NULL,                     -- ISO 8601 UTC
    cpu_percent REAL NOT NULL,                     -- 1 dakikalik ortalama CPU
    cpu_cores INTEGER NOT NULL DEFAULT 1,
    ram_used_bytes INTEGER NOT NULL,
    ram_total_bytes INTEGER NOT NULL,
    disk_used_bytes INTEGER NOT NULL,
    disk_total_bytes INTEGER NOT NULL,
    network_rx_bytes_sec INTEGER NOT NULL DEFAULT 0,
    network_tx_bytes_sec INTEGER NOT NULL DEFAULT 0,
    load_avg_1m REAL,
    load_avg_5m REAL,
    load_avg_15m REAL,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sys_metrics_1m_query ON system_metrics_1m(system_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sys_metrics_1m_retention ON system_metrics_1m(recorded_at);

-- 4. 1 Saatlik Ozet Metrik Tablosu (30 Gun Saklanir)
CREATE TABLE IF NOT EXISTS system_metrics_1h (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id TEXT NOT NULL,
    recorded_at TEXT NOT NULL,                     -- Saatlik zaman damgasi
    cpu_avg REAL NOT NULL,
    cpu_max REAL NOT NULL,
    ram_used_avg INTEGER NOT NULL,
    disk_used_avg INTEGER NOT NULL,
    network_rx_total INTEGER NOT NULL,
    network_tx_total INTEGER NOT NULL,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sys_metrics_1h_query ON system_metrics_1h(system_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sys_metrics_1h_retention ON system_metrics_1h(recorded_at);

-- 5. Canli Konteyner Onbellegi
CREATE TABLE IF NOT EXISTS system_containers_cache (
    system_id TEXT NOT NULL,
    container_id TEXT NOT NULL,
    name TEXT NOT NULL,
    image TEXT,
    state TEXT NOT NULL,
    status TEXT,
    cpu_percent REAL NOT NULL DEFAULT 0.0,
    memory_bytes INTEGER NOT NULL DEFAULT 0,
    ports_json TEXT DEFAULT '[]',
    updated_at TEXT NOT NULL,
    PRIMARY KEY (system_id, container_id),
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);
