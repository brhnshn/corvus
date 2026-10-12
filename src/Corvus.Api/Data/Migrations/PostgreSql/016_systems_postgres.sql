-- Migration: 016_systems_postgres.sql
-- Description: Production PostgreSQL schema for Systems Management

CREATE TABLE IF NOT EXISTS systems (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    hostname VARCHAR(255),
    ip_address VARCHAR(64),
    os_info VARCHAR(255),
    agent_version VARCHAR(64),
    tags_json JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'offline',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pg_systems_status ON systems(status);
CREATE INDEX IF NOT EXISTS idx_pg_systems_last_seen ON systems(last_seen_at);

CREATE TABLE IF NOT EXISTS system_tokens (
    id VARCHAR(64) PRIMARY KEY,
    system_id VARCHAR(64) NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    token_prefix VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pg_system_tokens_hash ON system_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pg_system_tokens_sys ON system_tokens(system_id);

CREATE TABLE IF NOT EXISTS system_metrics_1m (
    id BIGSERIAL PRIMARY KEY,
    system_id VARCHAR(64) NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    cpu_percent DOUBLE PRECISION NOT NULL,
    cpu_cores INTEGER NOT NULL DEFAULT 1,
    ram_used_bytes BIGINT NOT NULL,
    ram_total_bytes BIGINT NOT NULL,
    disk_used_bytes BIGINT NOT NULL,
    disk_total_bytes BIGINT NOT NULL,
    network_rx_bytes_sec BIGINT NOT NULL DEFAULT 0,
    network_tx_bytes_sec BIGINT NOT NULL DEFAULT 0,
    load_avg_1m DOUBLE PRECISION,
    load_avg_5m DOUBLE PRECISION,
    load_avg_15m DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_pg_sys_metrics_1m_query ON system_metrics_1m(system_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_sys_metrics_1m_brin ON system_metrics_1m USING BRIN (recorded_at);

CREATE TABLE IF NOT EXISTS system_metrics_1h (
    id BIGSERIAL PRIMARY KEY,
    system_id VARCHAR(64) NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    cpu_avg DOUBLE PRECISION NOT NULL,
    cpu_max DOUBLE PRECISION NOT NULL,
    ram_used_avg BIGINT NOT NULL,
    disk_used_avg BIGINT NOT NULL,
    network_rx_total BIGINT NOT NULL,
    network_tx_total BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pg_sys_metrics_1h_query ON system_metrics_1h(system_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_sys_metrics_1h_brin ON system_metrics_1h USING BRIN (recorded_at);

CREATE TABLE IF NOT EXISTS system_containers_cache (
    system_id VARCHAR(64) NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    container_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(255),
    state VARCHAR(32) NOT NULL,
    status VARCHAR(128),
    cpu_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    memory_bytes BIGINT NOT NULL DEFAULT 0,
    ports_json JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (system_id, container_id)
);
