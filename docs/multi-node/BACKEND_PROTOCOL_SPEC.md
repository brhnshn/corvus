# Corvus — Çoklu Sistem Yönetimi (Systems) & Protokol Spesifikasyonu

- **Versiyon:** 4.0.0 (Sistemler / Systems — Optimize Saklama ve Bellek Modeli)
- **Durum:** Onaylandı & Kesinleşti
- **Hedef Çalışma Zamanı:** .NET 9 Native AOT (`PublishAot=true`, Sıfır Reflection, Dapper.AOT)
- **Modül & Menü Adı:** **"Sistemler"** (İngilizce: **"Systems"**)

---

## 1. Mimari Genel Bakış ve Tasarım İlkeleri

Corvus, tek bir sunucudaki yerel Docker ve sistem kaynaklarını izlemenin ötesine geçerek; birden fazla sunucuyu (VPS, bare-metal, homelab) tek bir merkezi ekrandan yöneten **Sistemler (Systems)** yeteneğine sahiptir.

```
  [ Tarayıcı / Web UI ("Sistemler") ]
                  │ (WSS / SSE Canlı Akış)
                  ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                        CORVUS HUB (.NET 9 AOT)                         │
  │                                                                        │
  │  ┌──────────────────────────────────────────────────────────────────┐  │
  │  │ TelemetryRingBuffer (RAM: 60 Nokta / 3 Dakika @ 3s - 7.2 KB/düğüm)│  │
  │  └──────────────────▲────────────────────────────┬──────────────────┘  │
  │                     │ (3s Canlı Telemetri)       │                     │
  │                     │                            ▼ (60s Batch Flush)   │
  │  ┌──────────────────┴─────────────┐  ┌──────────────────────────────┐  │
  │  │ NodeTunnelManager (/ws/tunnel) │  │ MetricsBatchFlusher (Worker) │  │
  │  └──────────────────▲─────────────┘  └───────────┬──────────────────┘  │
  └─────────────────────┼────────────────────────────┼─────────────────────┘
                        │ Outbound WSS               │
                        │ (Inbound Port: 0!)         ▼ Tek Transaction / Batch
     ┌──────────────────┴──────────────┐   ┌──────────────────────────────┐
     │      CORVUS AGENT (Sistem 1..N) │   │ ÇİFT VERİTABANI PERSISTENCE  │
     │      - Dışarıya Port Açmaz      │   │ - SQLite WAL (Varsayılan)    │
     │      - 3s Telemetri Gönderimi   │   │ - PostgreSQL (Ölçeklenme)    │
     │      - Docker Proxy & Terminal  │   └──────────────────────────────┘
     └─────────────────────────────────┘
```

---

## 2. Derin Optimizasyon: RAM Kullanımı, Veri Yazımı ve Saklama (Retention) Matematiği

### 2.1. RAM Tüketim Sınırı (Zero Bloat Garantisi)
- **Ring Buffer Boyutu:** Her sistem için bellekte yalnızca son **60 telemetri noktası** (3 dakikalık canlı pencere @ 3 saniye) tutulur.
- **1 Telemetri Noktası Struct Boyutu:** `unmanaged / readonly struct` olarak tasarlanır, boyutu tam **~120 bayt**'tır:
  - `Timestamp` (8 B) + `CpuPercent` (4 B) + `CpuCores` (2 B) + `RamUsedBytes` (8 B) + `RamTotalBytes` (8 B) + `DiskUsedBytes` (8 B) + `DiskTotalBytes` (8 B) + `NetRxBytesSec` (8 B) + `NetTxBytesSec` (8 B) + `LoadAvg1m/5m/15m` (12 B) + Flags & Padding (46 B) = 120 B.
- **Düğüm Başına Bellek:** $60 \text{ nokta} \times 120 \text{ bayt} \approx 7.2 \text{ KB}$ RAM.
- **50 Bağlı Sistem İçin Toplam RAM:** $50 \times 7.2 \text{ KB} \approx 360 \text{ KB}$ (1 MB bile değil!).
- **.NET 9 Native AOT Bellek Hedefi:**
  - Boşta (Idle): **< 30 MB RAM**.
  - 50 bağlı sistem canlı telemetri basarken (Steady-State): **< 45 MB RAM**.

### 2.2. Veri Yazımı & Disk I/O Optimizasyonu
- **Ham Saniyelik Veriler Diske Yazılmaz:** 3 saniyelik ham paketlerin diske anlık yazılması engellenerek disk yıpranması (SSD/NVMe wear) ve SQLite kilitlenme riski sıfırlanır.
- **Flush Döngüsü:** Tam **60 saniyede bir** (1 dakika).
- **1 Dakikalık Özet:** Her 60 saniyede bir aralıktaki metriklerin özeti (ortalama CPU, RAM, Disk, Ağ, Load) tek bir satır olarak kaydedilir.
- **Yazma Maliyeti:** 50 sistem için dakikada yalnızca 1 adet toplu transaction (`BEGIN IMMEDIATE ... COMMIT`) çalışır. Yazma süresi SQLite WAL modunda yalnızca **2–5 ms** sürer.

### 2.3. Saklama (Retention) ve Otomatik Budama (Rolling Prune)
- **1 Dakikalık Özetler:** **7 gün** saklanır ($\approx 10.080 \text{ satır / sistem}$).
- **1 Saatlik Ortalamalar:** **30 gün** saklanır ($\approx 720 \text{ satır / sistem}$).
- **30 Günden Eski Veriler:** Arka plandaki `MetricsRetentionWorker` tarafından her gece otomatik olarak budanır (`DELETE ... WHERE recorded_at < @cutoff`).
- **Disk Ayak İzi Hesabı:**
  - 1 satır veritabanı boyutu (indeksler dahil): $\approx 220 \text{ bayt}$.
  - 7 günlük 1m veri: $10.080 \times 220 \text{ B} \approx 2.2 \text{ MB}$.
  - 30 günlük 1h veri: $720 \times 220 \text{ B} \approx 0.16 \text{ MB}$.
  - **1 Sistemin 1 Aylık Toplam Disk Ayak İzi:** **~2.5 MB!**
  - **20 Sistemin 1 Aylık Toplam Disk Ayak İzi:** **~50 MB!**
- Veritabanı asla kontrolsüz büyümez, disk dolma riski tamamen ortadan kalkar.

---

## 3. Veritabanı Şemaları (DDL Spesifikasyonları)

### 3.1. SQLite DDL (`src/Corvus.Api/Data/Migrations/016_systems_sqlite.sql`)

```sql
-- Migration: 016_systems_sqlite.sql
-- Description: SQLite schema for Systems Management with 1m rollup and rolling retention

-- 1. Sistemler Tablosu (Nodes/Systems)
CREATE TABLE IF NOT EXISTS systems (
    id TEXT PRIMARY KEY,                           -- UUID v4
    name TEXT NOT NULL,                            -- Kullanıcı dostu ad (örn: 'vps-frankfurt-01')
    hostname TEXT,                                 -- Raporlanan sunucu hostname
    ip_address TEXT,                               -- Algılanan IP adresi
    os_info TEXT,                                  -- İşletim sistemi ve mimari
    agent_version TEXT,                            -- Ajan sürümü
    tags_json TEXT DEFAULT '[]',                   -- JSON etiket dizisi
    status TEXT NOT NULL DEFAULT 'offline',        -- 'online' | 'degraded' | 'offline'
    created_at TEXT NOT NULL,                      -- ISO 8601 UTC
    updated_at TEXT NOT NULL,                      -- ISO 8601 UTC
    last_seen_at TEXT                              -- ISO 8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_systems_status ON systems(status);
CREATE INDEX IF NOT EXISTS idx_systems_last_seen ON systems(last_seen_at);

-- 2. Sistem Erişim Belirteçleri (Tokens)
CREATE TABLE IF NOT EXISTS system_tokens (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,               -- SHA-256 hex string
    token_prefix TEXT NOT NULL,                    -- Örn: 'crv_live_9f82'
    created_at TEXT NOT NULL,
    expires_at TEXT,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    revoked_at TEXT,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_system_tokens_hash ON system_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_system_tokens_sys ON system_tokens(system_id);

-- 3. 1 Dakikalık Toplu Metrik Tablosu (7 Gün Saklanır)
CREATE TABLE IF NOT EXISTS system_metrics_1m (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id TEXT NOT NULL,
    recorded_at TEXT NOT NULL,                     -- ISO 8601 UTC
    cpu_percent REAL NOT NULL,                     -- 1 dakikalık ortalama CPU
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

-- 4. 1 Saatlik Özet Metrik Tablosu (30 Gün Saklanır)
CREATE TABLE IF NOT EXISTS system_metrics_1h (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id TEXT NOT NULL,
    recorded_at TEXT NOT NULL,                     -- Saatlik zaman damgası
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

-- 5. Canlı Konteyner Önbelleği
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
```

### 3.2. PostgreSQL DDL (`src/Corvus.Api/Data/Migrations/PostgreSql/016_systems_postgres.sql`)

```sql
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
```

---

## 4. Hub-Agent İletişim & WebSocket Protokolü

- **Taşıyıcı:** WebSocket over TLS (`wss://`).
- **Endpoint:** `GET /api/v1/agent/tunnel`.
- **Inbound Port:** Agent üzerinde **0 adet dinleme portu**.
- **Kimlik Doğrulama:**
  - Header: `Authorization: Bearer crv_node_live_<64-hex-token>`.
  - Hub SHA-256 özetini hesaplar ve `CryptographicOperations.FixedTimeEquals` sabit zamanlı fonksiyonuyla doğrular.
- **Mesaj Tipleri:**
  - `WebSocketMessageType.Text`: JSON envelope (`AgentTunnelMessage`) — 3s Telemetri, Heartbeat, Docker RPC.
  - `WebSocketMessageType.Binary`: 5-baytlık PTY başlığı ile sıfır-kopyalama xterm.js terminal stream'i (`0x01` PTY Data, `0x02` Resize, `0x03` Close).
- **Watchdog Kuralları:**
  - $\le 10\text{s}$: `online` (yeşil).
  - $> 15\text{s}$: `degraded` (sarı).
  - $> 30\text{s}$: `offline` (kırmızı + alarm tetikleyici).

---

## 5. Hub Minimal API Uç Noktaları (`/api/v1/systems/*`)

Tüm endpoint'ler sade ve standart **"systems"** adlandırmasıyla çalışır:

| Metod | Rota | Rol | Açıklama |
|---|---|---|---|
| `GET` | `/api/v1/systems/status` | Viewer | Sistem motor durumu (`sqlite`/`postgresql`), bağlı sistem sayısı ve RAM tampon sağlığı |
| `GET` | `/api/v1/systems` | Viewer | Kayıtlı sistemleri RAM tamponundaki canlı metriklerle listeleme |
| `POST` | `/api/v1/systems` | Admin | Yeni sistem oluşturma, tek seferlik `NODE_KEY` üretimi |
| `GET` | `/api/v1/systems/{id}` | Viewer | Sistem detayları, donanım özellikleri, konteynerler |
| `DELETE` | `/api/v1/systems/{id}` | Admin | Sistemi ve geçmiş metriklerini silme, tüneli kapatma |
| `POST` | `/api/v1/systems/{id}/token/revoke` | Admin | Erişim belirtecini iptal etme |
| `GET` | `/api/v1/systems/{id}/metrics` | Viewer | Metrik geçmişi (`range=live|1h|24h|7d|30d` - live RAM'den, diğerleri DB'den) |
| `GET` | `/api/v1/systems/{id}/containers` | Viewer | Sistem üzerindeki güncel konteynerler |
| `POST` | `/api/v1/systems/{id}/containers/{cid}/start` | Admin | Konteyner başlatma |
| `POST` | `/api/v1/systems/{id}/containers/{cid}/stop` | Admin | Konteyner durdurma |
| `POST` | `/api/v1/systems/{id}/containers/{cid}/restart` | Admin | Konteyner yeniden başlatma |
| `GET` | `/api/v1/systems/{id}/containers/{cid}/logs` | Viewer | SSE ile canlı log akışı |
| `GET` | `/api/v1/systems/{id}/containers/{cid}/terminal` | Admin | xterm.js WebSocket PTY köprüsü |

---

## 6. Native AOT JSON Serialization Context

```csharp
[JsonSerializable(typeof(SystemStatusDto))]
[JsonSerializable(typeof(SystemEntity))]
[JsonSerializable(typeof(List<SystemEntity>))]
[JsonSerializable(typeof(SystemTokenEntity))]
[JsonSerializable(typeof(SystemMetric1mEntity))]
[JsonSerializable(typeof(List<SystemMetric1mEntity>))]
[JsonSerializable(typeof(SystemMetric1hEntity))]
[JsonSerializable(typeof(List<SystemMetric1hEntity>))]
[JsonSerializable(typeof(SystemContainerCacheEntity))]
[JsonSerializable(typeof(List<SystemContainerCacheEntity>))]
[JsonSerializable(typeof(CreateSystemRequest))]
[JsonSerializable(typeof(CreateSystemResponse))]
[JsonSerializable(typeof(SystemSummaryDto))]
[JsonSerializable(typeof(List<SystemSummaryDto>))]
[JsonSerializable(typeof(SystemDetailDto))]
[JsonSerializable(typeof(AgentTunnelMessage))]
[JsonSerializable(typeof(AgentTelemetryPayload))]
[JsonSerializable(typeof(DockerRpcRequest))]
[JsonSerializable(typeof(DockerRpcResponse))]
```
