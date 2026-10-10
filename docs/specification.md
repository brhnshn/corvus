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

**Brand Identity:** Corvus (Latin for raven) — represents a watchful guardian observing from above. The "Hex Sentinel" corporate mark unifies the Docker container hexagon, the Corvus 'C' monogram, and a vigilant raven beak/eye in a clean monochrome (black/white/dark navy) aesthetic. All master SVG assets and web icon sets are standardized under `docs/branding/`.

---

## 2. Technology Stack

### Backend
- Language: **C#**
- .NET Version: **.NET 9**
- Web Framework: **ASP.NET Core Minimal API**
- Compilation Mode: **Native AOT** (Zero Reflection)
- Docker Communication: **Custom SocketsHttpHandler + System.Text.Json Source Generation** (direct communication with the Docker daemon over Unix domain sockets or Windows named pipes, `GET /api/containers/stats-summary` batch streaming)
- Memory Architecture: **Zero-Dependency In-Memory Micro-Cache** (<150 KB heap; 2.5s-10s TTL for Docker socket, 5s TTL for Uptime 24h aggregations), **.NET 9 Non-Concurrent Workstation GC** (`DOTNET_gcConcurrent=0`), **Elastic Memory Conservation** (`DOTNET_GCConserveMemory=9`, `MALLOC_TRIM_THRESHOLD_=65536`), periodic native memory trimmer (`MemoryTrimmerBackgroundService`, flushes SQLite connection pools every 3 minutes, runs `PRAGMA wal_checkpoint(TRUNCATE);`, aggressive Gen 2 compaction, and triggers libc `malloc_trim(0)`), Container Discovery Fingerprinting (`ComputeFingerprint`), and container inspect cache (`_inspectCache`).
- Memory Footprint Target: **<35 MB RAM** (idle runtime measurements: ~20–30 MB, ceiling strictly controlled under 40 MB under load)

### Frontend
- **TypeScript + React 19 + Vite**
- Architecture: **Modular Clean Architecture**: strict type contracts in `types/`, domain-driven client modules in `api/` (`http.ts`, `services.ts`, `containers.ts`, etc.) with in-memory SWR caching
- Security: Centralized `corvus_unauthorized` session invalidation handler
- Styling: **Tailwind CSS v4** (Mobile Glass Bottom Navigation Bar, single-column unified settings shell, flexible responsive cards)
- Charting: **Recharts**
- Internationalization (i18n): **Native React 19 Context** with compile-time type safety (`DeepStringify`), zero external library overhead (~1.2 KB), primary English (`en`) and complete Turkish (`tr`) support, dynamic switcher
- Code-Splitting: **React.lazy + Suspense** and Vite `manualChunks` with an initial bundle payload under 200 KB
- Real-Time Communication: REST + **Server-Sent Events (SSE)** for live status broadcasts (`corvus_event` pub/sub channels)

### Persistence Layer
- **SQLite (Microsoft.Data.Sqlite) + Dapper (Dapper.AOT)**: WAL mode with `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA temp_store = MEMORY;`, `PRAGMA cache_size = -64000;` and periodic `PRAGMA optimize;`
- **DbUp**: Sequential SQL-first schema migrations (`001_init.sql` through `013_service_tags.sql`)
- Composite indexes on `system_metrics(recorded_at)`, `system_metrics_hourly(recorded_at)`, and `uptime_checks(service_id, checked_at)`
- **Backup & Retention Engine**: Point-in-time lock-free SQLite snapshot downloads (`VACUUM INTO`), live database disk usage telemetry (`GET /api/settings/db-stats`), dynamic background retention cleaner with Unlimited mode, automated `VACUUM;` freelist reclamation

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
| tags | TEXT (nullable) | Comma-separated or JSON list of environment/category tags (e.g. "Prod,API") |
| health_check_url | TEXT (nullable) | Distinct endpoint for health checking (defaults to `url` if empty) |
| status | TEXT | `healthy` / `degraded` / `down` / `unknown` |
| check_type | TEXT | `http`, `tcp`, `docker`, or `ping` (ICMP ping) |
| port | INTEGER (nullable) | TCP port number |
| expected_body | TEXT (nullable) | Expected response body payload content or pattern |
| expected_body_type | TEXT (nullable) | Body validation type: `contains` (substring) or `regex` |
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
| tags | TEXT (nullable) | User-overridden tags array/CSV for Docker service |
| expected_body, expected_body_type | TEXT (nullable) | Expected response body assertions |
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
Host telemetry time-series samples (15-second resolution, retained for 7 days).

| Field | Type | Description |
|---|---|---|
| id | INTEGER (autoincrement) | Primary key |
| recorded_at | DATETIME | Timestamp of sample |
| cpu_percent | REAL | Overall host CPU usage |
| ram_used_mb, ram_total_mb | INTEGER | System RAM usage |
| disk_used_gb, disk_total_gb | INTEGER | Primary disk usage |
| network_rx_bytes, network_tx_bytes | INTEGER | Network throughput |

### `system_metrics_hourly`
Hourly aggregated time-series samples (downsampled rollups for 365-day SLA & historical reporting).

| Field | Type | Description |
|---|---|---|
| id | INTEGER (autoincrement) | Primary key |
| recorded_at | TEXT (UNIQUE) | ISO-8601 hourly bucket (`YYYY-MM-DDTHH:00:00Z`) |
| cpu_percent | REAL | Average hourly CPU usage |
| ram_used_mb, ram_total_mb | REAL | Average hourly RAM used and peak capacity |
| disk_used_gb, disk_total_gb | REAL | Average hourly disk used and peak capacity |
| network_rx_bytes, network_tx_bytes | INTEGER | Average hourly network throughput |

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
| is_transition | INTEGER | `1`: Check represents a status change event, `0`: Routine ping |

### `uptime_daily_stats`
Aggregated daily uptime statistics for 365-day SLA historical reporting.

| Field | Type | Description |
|---|---|---|
| service_id | TEXT | Foreign key referencing `services.id` (Composite PK) |
| date | TEXT | Calendar date (`YYYY-MM-DD`, Composite PK) |
| total_checks | INTEGER | Total health checks performed on this date |
| up_checks | INTEGER | Successful health checks count |
| avg_response_time_ms | INTEGER (nullable) | Average check latency in milliseconds |

### `service_incidents`
System incident notices and scheduled maintenance advisories.

| Field | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary key |
| title | TEXT | Incident or maintenance title |
| message | TEXT | Detailed message content |
| severity | TEXT | `info`, `warning`, `critical`, `maintenance` |
| is_pinned | INTEGER | `1`: Pinned atop status page, `0`: Standard |
| status | TEXT | `investigating`, `identified`, `monitoring`, `resolved` |
| created_at | TEXT | Incident creation timestamp (ISO-8601) |
| resolved_at | TEXT (nullable) | Incident resolution timestamp (ISO-8601) |

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

### `users`, `user_sessions`, and `settings`
- `users`: `id`, `username`, `password_hash` (PBKDF2), `role` (`admin` or `viewer`), `created_at`
- `user_sessions`: `token` (PK), `username`, `expires_at`, `created_at` (Persistent SQLite session store surviving container redeployments and restarts)
- `settings`: `key`, `value`, `updated_at` (alert credentials, registration toggle, retention policies)

---

## 4. API Endpoints (Minimal API)

| Method & Path | Authorization | Description |
|---|---|---|
| `GET /api/dashboard/summary` | Auth | Consolidated KPI overview of services, containers, metrics, and backup status |
| `GET /api/services` | Auth | Ordered service catalog with overrides and SSL metadata |
| `POST /api/services` | Admin | Register a new manual service (HTTP, TCP, or ICMP Ping) |
| `PUT /api/services/{id}` | Admin | Update service details or save an override for a Docker container |
| `PUT /api/services/reorder` | Admin | Persist visual reordering of services |
| `DELETE /api/services/{id}` | Admin | Delete a manual service or reset a Docker container override |
| `GET /api/status-page` | **Unauthenticated** | Public status page summary (services, 30-check `RecentChecks`, and active `Incidents`) |
| `GET /api/incidents` | Auth | List active and historical incidents & maintenance notices |
| `POST /api/incidents` | Admin | Create a new system incident or maintenance notice |
| `PUT /api/incidents/{id}` | Admin | Update incident details, severity, status, or message |
| `POST /api/incidents/{id}/resolve` | Admin | Mark an incident as resolved with timestamp |
| `DELETE /api/incidents/{id}` | Admin | Remove an incident record |
| `GET /api/uptime/{id}/daily-stats` | Auth | 365-day historical daily uptime rollup summary |
| `GET /api/containers` | Auth | List Docker containers with status, ports, and labels |
| `GET /api/containers/stats-summary` | Auth | **Batch Stats:** Stream CPU, RAM, and Network metrics for all running containers in a single request |
| `GET /api/containers/{id}/stats` | Auth | Live per-container CPU%, RAM usage, and Network I/O metrics |
| `GET /api/containers/{id}/logs` | Auth | Snapshot of the last 100 log lines |
| `GET /api/containers/{id}/logs/stream` | Auth | **SSE:** Live real-time container log stream |
| `GET /api/containers/{id}/terminal` | Admin | **WebSocket Proxy:** Interactive container exec terminal (`/bin/bash` -> `/bin/sh` -> `/bin/ash` -> `sh`, ANSI 256 colors) |
| `GET /api/containers/system-df` | Auth | **Disk Usage Audit:** Returns detailed reclaimable space for stopped containers, unused images, volumes, and build cache |
| `POST /api/containers/prune` | Admin | **System Prune:** Host disk space cleanup (images, containers, volumes, networks, build cache) |
| `POST /api/containers/prune/selective` | Admin | **Selective Dry-Run Prune:** Granular deletion of chosen containers, images, volumes, and build cache |
| `GET /api/containers/{id}/inspect` | Auth | **Inspect Details:** Complete low-level configuration, env vars, port mappings, networks, and storage mounts |
| `POST /api/containers/{id}/update` | Admin | **Live Resource Tuning:** Zero-downtime CPU (`NanoCpus`), RAM (`Memory`), and Restart Policy update |
| `GET /api/containers/{id}/check-update` | Auth | **OCI Digest Inspection:** Performs zero-body HEAD request checking upstream registry (Docker Hub, GHCR, Quay) for new digests |
| `GET /api/containers/updates` | Auth | **Batch Image Update Status:** Returns list of all active containers with upstream update availability |
| `POST /api/containers/{id}/recreate` | Admin | **One-Click Recreate:** Pulls latest image, halts previous container, and seamlessly restarts with identical parameters |
| `GET /api/compose/{projectName}/file` | Admin | **Compose YAML Inspector:** Path-traversal sanitized retrieval of `compose.yaml` file contents |
| `PUT /api/compose/{projectName}/file` | Admin | **Safe Compose In-Place Editor:** Updates Compose configuration file with automated `.bak` backup and optional stack restart |
| `POST /api/hooks/deploy/{token}` | Constant-Time Token | **CI/CD Inbound Deploy Webhook:** Constant-time token verified inbound webhook triggering server deployment |
| `GET /api/containers/tags` | Auth | List all unique environment tags applied to containers |
| `PUT /api/containers/{id}/tags` | Admin | Update container environment tags (persisted in SQLite `service_overrides`) |
| `POST /api/containers/{id}/start` | Admin | Start container |
| `POST /api/containers/{id}/stop` | Admin | Stop container |
| `POST /api/containers/{id}/pause` | Admin | Pause container |
| `POST /api/containers/{id}/unpause` | Admin | Unpause container |
| `POST /api/containers/{id}/restart` | Admin | Restart container |
| `GET /api/push-monitors` | Auth | List Dead Man's Snitch periodic push monitors |
| `POST /api/push-monitors` | Admin | Create a new expected-interval push monitor |
| `PUT /api/push-monitors/{id}` | Admin | Update push monitor interval or settings |
| `DELETE /api/push-monitors/{id}` | Admin | Delete a push monitor |
| `POST /api/push/{token}` | Public | Push webhook ping for cron and backup jobs |
| `GET /api/metrics/system` | Auth | System resource time-series (`?range=1h\|6h\|12h\|24h\|7d\|30d\|90d\|1y`) |
| `GET /api/uptime` | Auth | Service uptime history (`?service_id=...&range=7d`) |
| `POST /api/uptime/test-connection` | Auth | **Live Connection Testing:** Performs instant HTTP/HTTPS, TCP or ICMP Ping test; returns latency (ms) |
| `GET /api/settings` | Auth | Get current application settings |
| `PUT /api/settings` | Admin | Update application settings |
| `GET /api/settings/db-stats` | Auth | Retrieve database and WAL storage disk size metrics |
| `GET /api/backup/download` | Admin | Download point-in-time SQLite `VACUUM INTO` snapshot |
| `POST /api/notifications/test` | Admin | Test dispatch alerts (Discord, Telegram, SMTP Email, Slack, Ntfy, Webhook) |
| `GET /api/version` | Auth | Queries GitHub Releases API for current Corvus version and update availability |
| `GET /api/stream/events` | Auth | **SSE:** Real-time stream of service state changes and events |
| `GET /api/auth/status` | Public | Current session state, role, and Zero-Trust SSO header detection |
| `POST /api/auth/login` | Public | Authenticate user and issue 7-day session cookie |
| `POST /api/auth/register` | Public | Register initial admin or new user if registrations are open |
| `POST /api/auth/logout` | Auth | Invalidate current session and remove persistent record |
| `POST /api/auth/change-password` | Auth | Self-service password change for logged-in user |
| `GET /api/users` | Admin | List all system users and assigned roles (`admin`, `viewer`) |
| `POST /api/users` | Admin | Create a new user with specified role |
| `DELETE /api/users/{id}` | Admin | Delete user and immediately revoke all active sessions |

---

## 5. Background Services & Observability Engines

| Service | Interval | Function |
|---|---|---|
| `ContainerDiscoveryService` | 10 sec | Synchronizes container state from the Docker socket. Newly discovered containers initialize with `is_uptime_enabled = 0`; runtime state directly maps to `healthy` as long as Docker reports running. Detects abnormal non-zero exits to trigger recovery & crash alerts |
| `AutoHealingService` | Event-Driven | Revives crashed containers using a thread-safe sliding window (max 2 restarts within 15 minutes) to avoid infinite flapping storms; dispatches multi-channel auto-healed alert notifications |
| `SystemMetricsCollector` | 15 sec | Samples host CPU, RAM, disk, and network stats into `system_metrics` |
| `UptimeCheckerService` | 5 sec (tick) / 60 sec | HTTP/TCP and ICMP ping checks, body payload assertions, proactive SSL early warnings (14d warning, 7d critical) with daily debounce memory, 3-state finite state machine (`healthy` -> `degraded` -> `down`), and Snitch checks |
| `UpdateCheckerService` | 24 hours | Checks GitHub Releases API for updates and caches release notifications |
| `MemoryTrimmerBackgroundService` | 3 min | Flushes SQLite connection pools, resets WAL logs with `PRAGMA wal_checkpoint(TRUNCATE);`, aggressive Gen 2 compaction, and libc `malloc_trim(0)` |
| `RetentionCleanupService` | Once daily | Performs hourly metric rollup aggregation (`system_metrics_hourly`), enforces dual-stage retention (7d raw / 365d hourly rollup), runs automatic `VACUUM;` to reclaim freelist storage back to host OS, and runs compacting Gen 2 GC sweeps |
| `FlappingDetector` | Continuous (in-memory) | Sliding-window state transition tracker. Detects flapping oscillations, suppresses intermediate alerts, and dispatches Amber warning and Green recovery alerts |

---

## 6. Authentication, RBAC, and Session Durability

1. **Role-Based Access Control (RBAC):**
   - `admin`: Full administrative control over services, containers, system configuration, backup downloads, and user provisioning.
   - `viewer`: Read-only access to dashboards, metrics, and logs. Mutating actions are rejected with `403 Forbidden`.
2. **Persistent SQLite Session Store:**
   - Sessions are validated in-memory at sub-microsecond latency and persisted to the `user_sessions` SQLite table, ensuring user logins survive container upgrades and service restarts.
3. **Centralized 401 Session Interceptor:**
   - Global HTTP 401 responses emit a `corvus_unauthorized` window event, gracefully directing the user back to the authentication view without throwing unhandled promise rejections.
4. **Zero-Trust SSO / Reverse Proxy Support:**
   - Detects incoming proxy headers (`Tailscale-User-Login`, `Cf-Access-Authenticated-User-Email`, `Remote-User`, `X-Forwarded-User`) strictly gated behind `CORVUS_TRUST_PROXY_HEADERS=true` and trusted IP verification to prevent header spoofing.
5. **Brute-Force & Rate Limiting Defense:**
   - In-memory rate limiting blocks after 5 failed attempts in 1 minute with a 1-minute temporary lockout (`HTTP 429`).

---

## 7. Application Pages and Views

| Page | URL | Features |
|---|---|---|
| **Dashboard** | `/` | Mobile-first 2-column KPI strip, full-width Disk bar, live system pulse hero, GitHub update checker badge, and active containers widget |
| **Services** | `/services` | Service launchpad, status badges, TCP/ICMP PING indicators, expected body assertion, SSL expiration badge, **environment tags (`TagBadge`)**, **real-time tag filter bar (`TagFilterBar`)**, and reordering controls |
| **Containers** | `/containers` | Batch stats streaming, live CPU%, RAM, and Net I/O badges, **Clickable Row Navigation (`ContainerRow`)**, **In-Row Quick Actions Toolbar (`ContainerQuickActions`)**, Start/Stop/Pause/Restart actions, **Bulk Stack Controls (`ComposeStackGroup`)**, **In-Browser YAML Editor (`ComposeConfigModal`)**, **OCI Image Update Sentinel (`ImageUpdateModal`)**, live log terminal, **Interactive Web Terminal**, **Dry-Run Disk Prune (`SystemPruneModal`)**, and **Container Tags & Filter Bar (`TagFilterBar`)** |
| **Container Detail** | `/containers/:id` | **Dedicated Full-Page Control Center:** Standalone URL-addressable, bookmarkable, deep-linked (`?tab=`) diagnostic dashboard with live telemetry cards (CPU, RAM, Rx/Tx), **Historical Area Telemetry Charts (`ContainerHistoricalCharts`)**, full-screen streaming logs, and xterm.js interactive terminal |
| **Uptime** | `/uptime` | Service uptime monitors, ICMP Ping, proactive SSL alerts, Dead Man's Snitch monitors, historical check logs, and incident management |
| **System Metrics** | `/metrics` | Time-series hardware utilization charts with **1h, 6h, 12h, 24h, 7d, 30d, 90d, and 1y** periods powered by hourly rollups |
| **Settings** | `/settings` | Single-column (`max-w-4xl`) settings shell with general options, DB storage stats, backup snapshots, **SMTP Email**, **Slack Webhook**, and **Flapping Protection** |
| **Profile** | `/profile` | Self-service password change, 2FA setup, and administrative user management with RBAC |
| **Public Status** | `/status` | Unauthenticated public uptime dashboard with incident notice banners and collapsible category accordions |
| **Mobile Glass BottomNav**| *Global* | 7-tab frosted glass bottom navigation bar with sliding indicator and safe-area support (`BottomNav.tsx`) |

---

## 8. Completed Roadmap Milestones

- [x] Native AOT + custom SocketsHttpHandler direct socket client
- [x] Dapper.AOT + Microsoft.Data.Sqlite + DbUp schema migrations (001-013)
- [x] Docker socket multiplexed log demuxer and live log streaming
- [x] Multi-channel alert engine (Discord, Telegram, Ntfy, Webhook) with system-language synchronization
- [x] Live container resource stats (CPU, RAM, Net I/O)
- [x] Dedicated Full-Page Container Diagnostic & Telemetry Dashboard (`/containers/:id`)
- [x] Historical Container Telemetry Charts (Recharts Area time-series CPU & RAM trend graphs)
- [x] Docker Compose Stack Bulk Actions (Restart / Start / Stop Project)
- [x] Container Crash-Loop & Unexpected Exit Alerting (ExitCode != 0, OOMKilled)
- [x] OCI Registry Image Sentinel & Manifest Digest Watcher (Zero-bandwidth HEAD requests, 1-click safe recreate)
- [x] Docker Compose YAML Inspector & Safe In-Place Browser Editor (Path traversal sanitization, automated `.bak` backups)
- [x] Event-Driven Auto-Healing & Constant-Time Inbound Deploy Webhooks
- [x] Case-Insensitive Container Inspect Normalization (`inspectHelpers.ts`)
- [x] Fluid Row-Click Navigation & In-Row Quick Actions Toolbar (`ContainerQuickActions.tsx`)
- [x] Automated CI/CD SemVer Version Detection & Git Tag / GitHub Release Publishing (`ci.yml`)
- [x] Extended Uptime: TCP Port Ping, ICMP Ping, and proactive SSL certificate early warnings
- [x] Dead Man's Snitch: Periodic push monitoring with auto-overdue alerting
- [x] Unauthenticated Public Status Page (`/status` and `/api/status-page`)
- [x] Server-Sent Events (SSE) real-time data stream (`/api/stream/events`)
- [x] Docker Compose stack hierarchy grouping (`com.docker.compose.project`)
- [x] Zero-Trust SSO / Reverse proxy authentication header support
- [x] Role-Based Access Control (RBAC: `admin` vs `viewer`) and User Management
- [x] Persistent SQLite Session Store (`user_sessions` and `ISessionRepository`)
- [x] Modular Profile & Security Page (`/profile`)
- [x] Mobile Glass Bottom Navigation Bar (`BottomNav.tsx`)
- [x] Settings Page Streamlining & Centralized 401 Session Interceptor
- [x] Visual service drag & drop reordering (`display_order` and `/api/services/reorder`)
- [x] Frontend code-splitting and vendor chunk optimization (<200 KB initial chunk)
- [x] SQLite WAL mode, composite indexes, and high-concurrency PRAGMA tuning
- [x] Full compile-time typed bilingual i18n system (English default, Turkish complete)
- [x] Dual-mode backup management: One-click lock-free SQLite snapshot download (`GET /api/backup/download`) with SSE live Dashboard updates + external push integration
- [x] Flexible data retention & disk telemetry, automated `VACUUM;` freelist cleanup
- [x] In-Memory Micro-Cache (<150 KB) & .NET 9 Non-Concurrent Workstation GC + `DOTNET_GCConserveMemory=9`
- [x] Scheduled Native & Managed Memory Trimming (`MemoryTrimmerBackgroundService`, Gen 2 compacting GC, `PRAGMA wal_checkpoint(TRUNCATE)` and libc `malloc_trim(0)`)
- [x] Smart Container Discovery Fingerprinting (`ComputeFingerprint`) & inspect cache (`_inspectCache`)
- [x] Batch Stats Endpoint (`GET /api/containers/stats-summary`) eliminating N+1 socket calls
- [x] Advanced 3-state resilience engine (`healthy` -> `degraded` -> `down`) & Docker loopback bridge gateway resolution
- [x] Mobile-first 2-column compact KPI strip & active containers widget
- [x] GitHub Releases API dynamic SemVer version update checker (`GET /api/version`)
- [x] Advanced Uptime monitoring parameters (custom interval, timeout, retries, ignore TLS, status codes) and opt-in status page
- [x] Interactive 30-check latency status bars, collapsible category accordions, and real-time tooltips on Public Status
- [x] System Incidents & Scheduled Maintenance management with public alert banners (`service_incidents`)
- [x] Intelligent 24-hour retention (`is_transition`) and 365-day daily SLA rollup (`uptime_daily_stats`)
- [x] "Hex Sentinel" professional corporate identity, SVG master assets, and web icon set (`docs/branding/`)
- [x] SMTP Email & Slack notification channels with interactive recipient pills and status color coding
- [x] Flapping suppression engine (`IFlappingDetector`, `FlappingDetector`) with multi-channel amber/green alerts
- [x] Web Container Exec Terminal (`/api/containers/{id}/terminal`, `@xterm/xterm`, bidirectional stream fix, fallback shell chain)
- [x] Two-Stage Dry-Run System Prune (`/api/containers/system-df`, `/api/containers/prune/selective`, volume protection)
- [x] Container Detail Inspection & Live Zero-Downtime Resource Tuning (`/api/containers/{id}/inspect`, `/api/containers/{id}/update`)
- [x] Time-series metrics downsampling (`system_metrics_hourly`, dual retention, 30d/90d/1y ranges)
- [x] Environment Tags & Category Grouping (`013_service_tags.sql`, `TagBadge`, `TagInput`, `TagFilterBar`, container tag overrides)
- [x] 223/223 passing xUnit test coverage
