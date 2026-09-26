<div align="center">

[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](specification.md)
[![Türkçe](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red?style=for-the-badge)](specification.tr.md)

</div>

# Corvus — Project & Technical Specification

## 1. Project Overview

Corvus is an open-source, ultra-low resource consumption service launcher and unified monitoring dashboard tailored for self-hosted servers, homelabs, and VPS nodes.

**Core Capabilities:**
- **Launcher:** Presents server services (web apps, databases, administrative tools) in a single dashboard with drag-and-drop or keyboard-accessible ordering, direct URL launching, and live operational status badges.
- **Monitoring:** Consolidates host system metrics (CPU, RAM, disk, network), per-container stats (live CPU%, memory limit/usage, net I/O), live container logs, uptime & endpoint health (HTTP, TCP, SSL expiration), and cron/backup status in one view.
- **Bridging the Gap:** Deployment orchestrators handle container provisioning but lack external uptime checks and status launching. Corvus fills this void with a minimal, unified footprint.

**Dual-Mode Service Discovery:**
- **Automatic:** Discovers running containers via the Docker socket and groups them by Compose projects.
- **Manual:** Supports registering non-Docker services, bare-metal endpoints, remote APIs, or TCP ports.

**Interoperability Principle:** As an open-source tool, Corvus does not enforce specific reverse proxies, orchestrators, or VPNs. When deployed behind reverse proxies, it seamlessly detects Zero-Trust SSO authentication headers (`Tailscale`, `Cloudflare Access`, `Remote-User`, `X-Forwarded-User`).

**Brand Identity:** Corvus (Latin for raven) — represents a watchful guardian observing from above. Dark theme, silver/platinum accents, monochrome icon-only aesthetic.

---

## 2. Technology Stack

### Backend
- Language: **C#**
- .NET Version: **.NET 9**
- Web Framework: **ASP.NET Core Minimal API**
- Compilation Mode: **Native AOT** (Zero Reflection)
- Docker Communication: **Custom SocketsHttpHandler + System.Text.Json Source Generation** (direct communication with the Docker daemon over Unix domain sockets or Windows named pipes, `GET /api/containers/stats-summary` batch streaming)
- Memory Architecture: **Zero-Dependency In-Memory Micro-Cache** (<150 KB heap; 2.5s TTL for Docker socket, 5s TTL for Uptime 24h aggregations), **.NET 9 Elastic Memory Tuning** (`System.GC.ConserveMemory=5`, `ServerGarbageCollection=false`), releasing idle memory pages eagerly to the host OS upon traffic completion
- Memory Footprint Target: <45 MB RAM (idle runtime measurements: ~30–38 MB, ceiling tightly capped during navigation)

### Frontend
- **TypeScript + React 19 + Vite**
- Architecture: **Modular Clean Architecture**: strict type contracts in `types/`, domain-driven client modules in `api/` (`http.ts`, `services.ts`, `containers.ts`, etc.) with in-memory SWR caching
- Styling: **Tailwind CSS v4** (Mobile-first 2-column KPI strip, full-width Disk bar, flexible cards)
- Charting: **Recharts**
- Internationalization (i18n): **Native React 19 Context** with compile-time type safety (`DeepStringify`), zero external library overhead (~1.2 KB), primary English (`en`) and complete Turkish (`tr`) support, dynamic switcher
- Code-Splitting: **React.lazy + Suspense** and Vite `manualChunks` with an initial bundle payload under 200 KB
- Real-Time Communication: REST + **Server-Sent Events (SSE)** for live status broadcasts (`corvus_event` pub/sub channels)

### Persistence Layer
- **SQLite (Microsoft.Data.Sqlite) + Dapper (Dapper.AOT)**: WAL mode with `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA temp_store = MEMORY;`, `PRAGMA cache_size = -64000;` and periodic `PRAGMA optimize;`
- **DbUp**: Sequential SQL-first schema migrations (`001_init.sql`, `002_add_users.sql`, `003_roadmap_features.sql`, `004_performance_indexes.sql`)
- Composite indexes on `system_metrics(recorded_at)` and `uptime_checks(service_id, checked_at)`
- **Backup & Retention Engine**: Point-in-time lock-free SQLite snapshot downloads (`VACUUM INTO`), live database disk usage telemetry (`GET /api/settings/db-stats`), and dynamic background retention cleaner with Unlimited mode

---

## 3. Data Model (SQLite Schema)

### `services`
Unified table for auto-discovered and manually registered services.

| Field | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary key |
| source | TEXT | `docker` or `manual` |
| container_id | TEXT (nullable) | Docker container ID if `source=docker` |
| name | TEXT | Display name (extracted from label, manual input, or container name) |
| description | TEXT (nullable) | Short description |
| url | TEXT (nullable) | Target URL for the "Open" launcher button |
| icon | TEXT (nullable) | Icon name or URL |
| category | TEXT (nullable) | Category grouping (Apps, Databases, etc.) |
| health_check_url | TEXT (nullable) | Distinct endpoint for health checking (defaults to `url` if empty) |
| status | TEXT | `healthy` / `degraded` / `down` / `unknown` |
| check_type | TEXT | `http` or `tcp` |
| port | INTEGER (nullable) | TCP port number |
| ssl_expiry_days | INTEGER (nullable) | Remaining SSL certificate validity days |
| ssl_issuer | TEXT (nullable) | SSL issuing authority |
| is_public | INTEGER | `1`: Visible on public status page (only when `is_uptime_enabled = 1`), `0`: private |
| is_uptime_enabled | INTEGER | `1`: Active uptime monitoring, `0`: Disabled (discovered containers default to `0`) |
| display_order | INTEGER | Custom visual order index |
| created_at, updated_at | DATETIME | Timestamp tracking |

### `service_overrides`
User customization overrides for auto-discovered Docker containers.

| Field | Type | Description |
|---|---|---|
| container_id | TEXT | Primary key matching `services.container_id` |
| name, description, url, icon, category | TEXT (nullable) | User-overridden fields |
| is_uptime_enabled | INTEGER (nullable) | Opt-in uptime tracking preference override |

### `push_monitors` (Dead Man's Snitch)
Monitors periodic cron jobs and backup scripts to ensure timely execution.

| Field | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary key |
| token | TEXT (UNIQUE) | Unique ping token used in push URL |
| name | TEXT | Monitor display name |
| expected_interval_minutes | INTEGER | Expected frequency in minutes (default: 1440 min = 24 hours) |
| grace_period_minutes | INTEGER | Allowed grace window before alert (default: 60 min) |
| last_seen_at | TEXT (nullable) | Timestamp of the last received heartbeat |
| status | TEXT | `healthy` / `down` / `unknown` |
| created_at | DATETIME | Creation timestamp |

### `system_metrics`
Host telemetry time-series samples.

| Field | Type | Description |
|---|---|---|
| id | INTEGER (autoincrement) | Primary key |
| recorded_at | DATETIME | Timestamp of sample |
| cpu_percent | REAL | Overall host CPU usage |
| ram_used_mb, ram_total_mb | INTEGER | System RAM usage |
| disk_used_gb, disk_total_gb | INTEGER | Primary disk usage |
| network_rx_bytes, network_tx_bytes | INTEGER | Network throughput |

### `uptime_checks`
Individual endpoint audit log entries.

| Field | Type | Description |
|---|---|---|
| id | INTEGER (autoincrement) | Primary key |
| service_id | TEXT | Foreign key referencing `services.id` |
| checked_at | DATETIME | Check execution timestamp |
| status | TEXT | `up` or `down` |
| response_time_ms | INTEGER (nullable) | Latency in milliseconds |
| error_message | TEXT (nullable) | Error diagnostics if unreachable |

### `backup_events`
Incoming push monitor heartbeat records.

| Field | Type | Description |
|---|---|---|
| id | INTEGER (autoincrement) | Primary key |
| token | TEXT | Associated monitor token |
| received_at | DATETIME | Receive timestamp |
| status | TEXT | `success` or `failure` |
| size_bytes | INTEGER (nullable) | Reported backup archive size |
| message | TEXT (nullable) | Execution log or notes |

### `users` and `settings`
- `users`: `id`, `username`, `password_hash` (SHA-256), `role`, `created_at`
- `settings`: `key`, `value`, `updated_at` (alert credentials, registration toggle)

---

## 4. API Endpoints (Minimal API)

| Method & Path | Description |
|---|---|
| `GET /api/dashboard/summary` | Consolidated KPI overview of services, containers, metrics, and backup status |
| `GET /api/services` | Ordered service catalog with overrides and SSL metadata |
| `POST /api/services` | Register a new manual service (HTTP or TCP ping) |
| `PUT /api/services/{id}` | Update service details or save an override for a Docker container |
| `PUT /api/services/reorder` | Persist visual reordering of services |
| `DELETE /api/services/{id}` | Delete a manual service or reset a Docker container override |
| `GET /api/status-page` | **Unauthenticated:** Public status page summary |
| `GET /api/containers` | List Docker containers with status, ports, and labels |
| `GET /api/containers/stats-summary` | **Batch Stats:** Stream CPU, RAM, and Network metrics for all running containers in a single request (eliminates N+1 socket calls) |
| `GET /api/containers/{id}/stats` | Live per-container CPU%, RAM usage, and Network I/O metrics |
| `GET /api/containers/{id}/logs` | Snapshot of the last 100 log lines |
| `GET /api/containers/{id}/logs/stream` | **SSE:** Live real-time container log stream |
| `POST /api/containers/{id}/start` | Start container |
| `POST /api/containers/{id}/stop` | Stop container |
| `POST /api/containers/{id}/pause` | Pause container |
| `POST /api/containers/{id}/unpause` | Unpause container |
| `POST /api/containers/{id}/restart` | Restart container |
| `GET /api/push-monitors` | List Dead Man's Snitch periodic push monitors |
| `POST /api/push-monitors` | Create a new expected-interval push monitor |
| `PUT /api/push-monitors/{id}` | Update push monitor interval or settings |
| `DELETE /api/push-monitors/{id}` | Delete a push monitor |
| `POST /api/push/{token}` | Push webhook ping for cron and backup jobs |
| `GET /api/metrics/system` | System resource time-series (`?range=1h\|24h\|7d`) |
| `GET /api/uptime` | Service uptime history (`?service_id=...&range=7d`) |
| `POST /api/uptime/test-connection` | **Live Connection Testing:** Performs instant HTTP/HTTPS or TCP socket test; returns latency (ms) and status code |
| `POST /api/notifications/test` | Test dispatch alerts (Discord, Telegram, Ntfy, Webhook) |
| `GET /api/version` | Queries GitHub Releases API for current Corvus version and update availability |
| `GET /api/stream/events` | **SSE:** Real-time stream of service state changes and events |
| `GET /api/auth/status` | Current session state and Zero-Trust SSO header detection |
| `POST /api/auth/login` | Authenticate user and issue session cookie |
| `POST /api/auth/logout` | Invalidate current session |

---

## 5. Background Services

| Service | Interval | Function |
|---|---|---|
| `ContainerDiscoveryService` | 10 sec | Synchronizes container state from the Docker socket. Newly discovered containers initialize with `is_uptime_enabled = 0`; runtime state directly maps to `healthy` as long as Docker reports running |
| `SystemMetricsCollector` | 15 sec | Samples host CPU, RAM, disk, and network stats into `system_metrics` |
| `UptimeCheckerService` | 5 sec (tick) / 60 sec | HTTP/TCP and SSL checks exclusively for services with `is_uptime_enabled = 1`. Skips stopped containers; 3-state finite state machine (`healthy` -> `degraded` -> `down`) suppresses false alarms |
| `UpdateCheckerService` | 24 hours | Checks GitHub Releases API for updates and caches release notifications |
| `RetentionCleanupService` | Once daily | Dynamically reads `retention_days` from application settings; prunes aged time-series records from `system_metrics` and `uptime_checks` when > 0, skips deletion when 0 (Unlimited mode), and performs optimized memory compaction (`GC.Collect`) |

---

## 6. Authentication and Zero-Trust SSO

1. **Zero-Trust SSO / Reverse Proxy Support:**
   - Automatically detects incoming trusted proxy headers (`Tailscale-User-Login`, `Cf-Access-Authenticated-User-Email`, `Remote-User`, `X-Forwarded-User`) to establish passwordless authenticated sessions.
2. **Credential Authentication:**
   - Secure SHA-256 hashed password storage with HTTP-only session cookies (`corvus_session`).
   - The user registration modal can be toggled off after the initial admin account is created.
3. **Optional Bypass:**
   - Set `CORVUS_AUTH_ENABLED=false` to run in completely unauthenticated internal homelab mode.

---

## 7. Application Pages and Views

| Page | URL | Features |
|---|---|---|
| **Dashboard** | `/` | Mobile-first 2-column KPI strip, full-width Disk bar, live system pulse hero, GitHub update checker badge, and active containers widget |
| **Services** | `/` | Service launchpad, status badges, TCP indicators, SSL expiration badge, and reordering controls |
| **Containers** | `/` | Batch stats streaming, live CPU%, RAM, and Net I/O badges, Start/Stop/Pause/Restart actions, Compose stack accordion grouping, live log terminal |
| **System Metrics**| `/` | Telemetry graphs across 1h, 6h, 12h, 24h, 7d periods for CPU, RAM, Disk, and Network |
| **Uptime & Snitch** | `/` | 3-state health monitoring, response latency charts, and Dead Man's Snitch cron/backup monitor tab |
| **Settings** | `/` | Tabbed alert channel configuration (Discord, Telegram, Ntfy, Webhook), test notifications, dual-mode backup management (internal snapshot download via `VACUUM INTO` + external push integration), flexible data retention (7-365 days, Unlimited mode, risk warning), and real-time database disk usage telemetry |
| **Public Status** | `/status` | **Unauthenticated:** Operational status banner, service uptime metrics, and SSL certificates |

---

## 8. Completed Roadmap Milestones

- [x] Native AOT + custom SocketsHttpHandler direct socket client
- [x] Dapper.AOT + Microsoft.Data.Sqlite + DbUp schema migrations (001-004)
- [x] Docker socket multiplexed log demuxer and live log streaming
- [x] Multi-channel alert engine (Discord, Telegram, Ntfy, Webhook) with system-language synchronization
- [x] Live container resource stats (CPU, RAM, Net I/O)
- [x] Extended Uptime: TCP Port Ping & SSL certificate expiration tracking
- [x] Dead Man's Snitch: Periodic push monitoring with auto-overdue alerting
- [x] Unauthenticated Public Status Page (`/status` and `/api/status-page`)
- [x] Server-Sent Events (SSE) real-time data stream (`/api/stream/events`)
- [x] Docker Compose stack hierarchy grouping (`com.docker.compose.project`)
- [x] Zero-Trust SSO / Reverse proxy authentication header support
- [x] Visual service drag & drop reordering (`display_order` and `/api/services/reorder`)
- [x] Frontend code-splitting and vendor chunk optimization (<200 KB initial chunk)
- [x] SQLite WAL mode, composite indexes, and high-concurrency PRAGMA tuning
- [x] Mobile & tablet responsive drawer navigation and dual-mode responsive layout
- [x] Full compile-time typed bilingual i18n system (English default, Turkish complete)
- [x] Dual-mode backup management: One-click lock-free SQLite snapshot download (`GET /api/backup/download`) with SSE live Dashboard updates + external push integration
- [x] Flexible data retention & disk telemetry: Presets, Unlimited mode with disk advisory, live DB size indicator, and dynamic `RetentionCleanupService`
- [x] In-Memory Micro-Cache (<150 KB) & .NET 9 `System.GC.ConserveMemory=5` elastic memory management (30–45 MB RAM)
- [x] Batch Stats Endpoint (`GET /api/containers/stats-summary`) eliminating N+1 socket calls
- [x] Advanced 3-state resilience engine (`healthy` -> `degraded` -> `down`) & Docker loopback bridge gateway resolution
- [x] Mobile-first 2-column compact KPI strip & active containers widget
- [x] GitHub Releases API dynamic SemVer version update checker (`GET /api/version`)
- [x] Advanced Uptime monitoring parameters (custom interval, timeout, retries, ignore TLS, status codes) and opt-in status page
- [x] 119/119 passing xUnit test coverage
