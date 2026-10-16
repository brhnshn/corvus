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

### Corvus Edge Agent (`src/Corvus.Agent`)
- Language & Runtime: **C# / .NET 9 Native AOT** (Zero Reflection, single self-contained binary <15 MB)
- Memory Footprint Target: **<10 MB RAM** (idle runtime: ~6-8 MB)
- Architecture: **Outbound-Only TLS WebSocket Tunnel** (`/agent/connect`), zero inbound listening ports or firewall ingress required on monitored edge nodes
- Telemetry Collection: Direct high-performance Linux `/proc` filesystem and `/sys` reader (`ProcFsCollector`, zero subshell overhead) for CPU, RAM, Disk partitions, and Network interface throughput
- Docker Integration: Unix domain socket RPC (`/var/run/docker.sock`) streaming remote container states and executing container management commands (`start`, `stop`, `restart`, `logs`)
- Linux Systemd Integration: Regex-guarded whitelist unit manager (`SystemdServiceClient`, `journalctl` log streamer)

### Corvus Central Hub (Backend)
- Language & Runtime: **C# / .NET 9 Native AOT** (Ahead-Of-Time compiled ELF/PE binary)
- Web Framework: **ASP.NET Core Minimal API** with high-throughput route endpoints
- Memory Architecture: **Zero-Dependency In-Memory Micro-Cache** (<150 KB heap; 2.5s-10s TTL for Docker socket, 5s TTL for Uptime 24h aggregations), **Unmanaged Struct Telemetry Ring Buffer** (128-byte `SystemTelemetryPoint`, 60-point rolling window in RAM, ~7.2 KB per node), **.NET 9 Non-Concurrent Workstation GC** (`DOTNET_gcConcurrent=0`), **Elastic Memory Conservation** (`DOTNET_GCConserveMemory=9`, `MALLOC_TRIM_THRESHOLD_=65536`), periodic native memory trimmer (`MemoryTrimmerBackgroundService`, flushes database connection pools every 3 minutes, runs `PRAGMA wal_checkpoint(TRUNCATE);`, aggressive Gen 2 compaction, and triggers libc `malloc_trim(0)`), Container Discovery Fingerprinting (`ComputeFingerprint`), and container inspect cache (`_inspectCache`).
- Memory Footprint Target: **<35 MB RAM** (idle runtime: ~20–30 MB, ceiling strictly controlled under 40 MB under heavy multi-node load)

### Frontend
- **TypeScript + React 19 + Vite**
- Architecture: **Modular Clean Architecture**: strict type contracts in `types/`, domain-driven client modules in `api/` (`http.ts`, `services.ts`, `containers.ts`, `systems.ts`, `activity.ts`, etc.) with in-memory SWR caching
- Design System: **ObsidianUI** (Greyish Cloud White palette `#F5F6F8`, strict zero-gradient threshold-driven semantics, 180-220ms spring micro-animations, glass surfaces)
- Styling: **Tailwind CSS v4** (Mobile Glass Bottom Navigation Bar, single-column unified settings shell, flexible responsive cards)
- Charting: **Recharts**
- Internationalization (i18n): **Native React 19 Context** with compile-time type safety (`DeepStringify`), zero external library overhead (~1.2 KB), primary English (`en`) and complete Turkish (`tr`) support, dynamic switcher
- Code-Splitting: **React.lazy + Suspense** and Vite `manualChunks` with an initial bundle payload under 200 KB
- Real-Time Communication: REST + **Server-Sent Events (SSE)** for live status broadcasts (`corvus_event` pub/sub channels) + **100ms Adaptive Systems SSE Stream** (`/api/systems/{id}/stream`)

### Persistence & Storage Layer
- **Dual Database Provider Support:**
  - **SQLite (Default Embedded):** Microsoft.Data.Sqlite + Dapper.AOT in WAL mode (`PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA temp_store = MEMORY;`, `PRAGMA cache_size = -64000;`, `PRAGMA optimize;`)
  - **PostgreSQL (Multi-Node / Enterprise):** Npgsql + Dapper.AOT with connection pooling, native schemas, and index optimization
- **DbUp**: Sequential SQL-first schema migrations (`001_init.sql` through `017_users_rbac_sqlite.sql` and PostgreSQL counterparts)
- Composite indexes on `system_metrics(recorded_at)`, `system_metrics_hourly(recorded_at)`, `system_metrics_1m(system_id, recorded_at)`, and `uptime_checks(service_id, checked_at)`
- **Backup & Retention Engine**: Point-in-time lock-free SQLite snapshot downloads (`VACUUM INTO`), live database disk usage telemetry (`GET /api/settings/db-stats`), two-tier retention cleaner (7d raw 1m / 30d 1h rollup / 365d daily SLA), automated `VACUUM;` freelist reclamation

### Automated Test Suite
- **374 Total Passing Tests:**
  - **Backend (329 Tests):** xUnit + Moq + FluentAssertions integration and unit test suite across Minimal API endpoints, background services, repository layers, Docker clients, deployment engine, and RBAC security filters.
  - **Frontend (45 Tests):** Vitest + React Testing Library unit and component tests validating state management, ANSI terminal parsing, stepper stages, i18n formatting, fuzzy search, and component rendering.

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

### `alert_rules`
Threshold-based alerting rules for host and container resource limits (`014_alert_rules.sql`).

| Field | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary key |
| name | TEXT | Rule name (e.g. 'Node CPU Overload') |
| target_type | TEXT | `system` or `container` |
| target_id | TEXT (nullable) | Target container ID (if `target_type = container`) |
| metric | TEXT | `cpu`, `memory`, or `disk` |
| operator | TEXT | `gt` (greater than) or `lt` (less than) |
| threshold_value | REAL | Threshold percentage or value (e.g. 85.0) |
| duration_seconds | INTEGER | Consecutive duration in violation required before firing (default: 60) |
| cooldown_minutes | INTEGER | Minimum interval between repeat notifications (default: 30) |
| is_enabled | INTEGER | `1`: Active rule, `0`: Disabled |
| is_firing | INTEGER | `1`: Currently in violation and alert dispatched, `0`: Normal |
| violation_start_at | TEXT (nullable) | ISO-8601 timestamp when violation threshold was first breached |
| last_triggered_at | TEXT (nullable) | ISO-8601 timestamp of last notification dispatch |
| created_at, updated_at | TEXT | Creation and modification timestamps |

### `activity_logs`
Structured audit trail for security, configuration, and container events (`015_activity_logs.sql`).

| Field | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary key |
| actor_username | TEXT | Initiating username or `system` |
| action_type | TEXT | `container_restart`, `compose_update`, `threshold_alert`, `user_login`, etc. |
| category | TEXT | `container`, `service`, `security`, `alert`, `system` |
| target_resource | TEXT | Affected resource name (e.g. `nginx-web`, `api.corvus.local`) |
| details_json | TEXT (nullable) | Structured JSON metadata describing the action |
| ip_address | TEXT (nullable) | Request client IP address |
| created_at | TEXT | ISO-8601 event timestamp (Indexed DESC) |

### `systems` (Fleet Nodes)
Multi-node edge system registration and heartbeats (`016_systems_sqlite.sql`).

| Field | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary key (Node ID) |
| name | TEXT | Human-readable system name (e.g. `vps-frankfurt-01`) |
| hostname | TEXT (nullable) | Server hostname reported by the agent |
| ip_address | TEXT (nullable) | Remote agent IP address |
| os_info | TEXT (nullable) | OS distribution, kernel version, and architecture |
| agent_version | TEXT (nullable) | Running Corvus Agent SemVer version |
| tags_json | TEXT | JSON string array of node tags (e.g. `["prod", "edge"]`) |
| status | TEXT | Node connection status: `online`, `degraded`, or `offline` |
| created_at, updated_at | TEXT | Registration and metadata update timestamps |
| last_seen_at | TEXT (nullable) | ISO-8601 timestamp of last received WebSocket heartbeat |

### `system_tokens`
Cryptographically secure node registration tokens for Edge Agent authentication (`016_systems_sqlite.sql`).

| Field | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary key |
| system_id | TEXT | Foreign key referencing `systems.id` (ON DELETE CASCADE) |
| token_hash | TEXT (UNIQUE) | SHA-256 hash of agent secret token |
| token_prefix | TEXT | Safe prefix for UI identification (e.g. `crv_live_9f82`) |
| created_at | TEXT | Creation timestamp |
| expires_at | TEXT (nullable) | Optional expiration timestamp |
| is_revoked | INTEGER | `1`: Revoked, `0`: Active |
| revoked_at | TEXT (nullable) | Revocation timestamp |

### `system_metrics_1m`
1-minute rolled-up host telemetry for registered systems, retained for 7 days (`016_systems_sqlite.sql`).

| Field | Type | Description |
|---|---|---|
| id | INTEGER | Primary key (Autoincrement) |
| system_id | TEXT | Foreign key referencing `systems.id` (ON DELETE CASCADE) |
| recorded_at | TEXT | ISO-8601 sample bucket timestamp |
| cpu_percent | REAL | 1-minute average CPU utilization percentage |
| cpu_cores | INTEGER | Available logical CPU core count |
| ram_used_bytes, ram_total_bytes | INTEGER | RAM memory allocation and capacity in bytes |
| disk_used_bytes, disk_total_bytes | INTEGER | Primary storage usage and capacity in bytes |
| network_rx_bytes_sec, network_tx_bytes_sec | INTEGER | Network throughput rates in bytes/sec |
| load_avg_1m, load_avg_5m, load_avg_15m | REAL (nullable) | Linux kernel CPU load averages |

### `system_metrics_1h`
1-hour aggregated downsampled metrics for registered systems, retained for 30 days (`016_systems_sqlite.sql`).

| Field | Type | Description |
|---|---|---|
| id | INTEGER | Primary key (Autoincrement) |
| system_id | TEXT | Foreign key referencing `systems.id` (ON DELETE CASCADE) |
| recorded_at | TEXT | Hourly bucket timestamp (`YYYY-MM-DDTHH:00:00Z`) |
| cpu_avg, cpu_max | REAL | Average and peak CPU usage across the hour |
| ram_used_avg | INTEGER | Average RAM consumption in bytes |
| disk_used_avg | INTEGER | Average storage utilization in bytes |
| network_rx_total, network_tx_total | INTEGER | Total network traffic transferred in bytes |

### `system_containers_cache`
Live remote container inventory streamed by the Edge Agent (`016_systems_sqlite.sql`).

| Field | Type | Description |
|---|---|---|
| system_id | TEXT | Foreign key referencing `systems.id` (Composite PK) |
| container_id | TEXT | Remote container hash ID (Composite PK) |
| name | TEXT | Container name |
| image | TEXT (nullable) | Container image repository and tag |
| state | TEXT | State string (`running`, `exited`, `paused`, etc.) |
| status | TEXT (nullable) | Up status summary (e.g. `Up 4 hours`) |
| cpu_percent | REAL | Instantaneous CPU percentage |
| memory_bytes | INTEGER | Instantaneous memory usage in bytes |
| ports_json | TEXT | JSON string array of port bindings |
| updated_at | TEXT | Last cache synchronization timestamp |

### `deployments`
Persistent audit trail and execution history for container rollouts (`019_deployments_sqlite.sql`).

| Field | Type | Description |
|---|---|---|
| id | TEXT | Primary Key (GUID string) |
| container_id | TEXT | Target container hash or identifier |
| container_name | TEXT | Human-readable container name |
| service_name | TEXT (nullable) | Associated service or Compose stack service name |
| trigger_type | TEXT | Trigger source (`manual_ui`, `webhook_github`, `webhook_generic`, `scheduled`) |
| status | TEXT | Lifecycle state (`pending`, `in_progress`, `success`, `failed`, `rolled_back`, `cancelled`) |
| current_step | TEXT (nullable) | Active stage (`queued`, `pulling`, `recreating`, `healthcheck`, `live`, `rolled_back`) |
| steps_json | TEXT | JSON array of discrete execution steps with timestamps and status |
| error_message | TEXT (nullable) | Human-readable failure explanation or stack trace |
| old_image_digest | TEXT (nullable) | Upstream image digest before deployment |
| new_image_digest | TEXT (nullable) | Upstream image digest after deployment |
| duration_ms | INTEGER (nullable) | Total deployment execution time in milliseconds |
| logs | TEXT (nullable) | Accumulated ANSI execution and layer progress logs |
| triggered_by | TEXT (nullable) | Initiating username or webhook token identifier |
| created_at | TEXT | Deployment trigger timestamp (ISO 8601) |
| started_at | TEXT (nullable) | Execution start timestamp |
| finished_at | TEXT (nullable) | Execution completion or termination timestamp |

### `users`, `user_sessions`, and `settings`
- `users`: `id`, `username`, `password_hash` (PBKDF2), `role` (`admin`, `operator`, `viewer`), `created_at` (`017_users_rbac_sqlite.sql`)
- `user_sessions`: `token` (PK), `username`, `expires_at`, `created_at` (Persistent session store surviving container redeployments and restarts)
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
| `POST /api/containers/{id}/deploy` | Admin | **Trigger Deployment:** Initiates asynchronous deployment (pre-pull fail-fast, nano-rollback, live SSE stream); returns 202 Accepted |
| `GET /api/deployments` | Auth | **Deployment Audit History:** Query paginated/filtered deployment executions (`?container_id=...&limit=...`) |
| `GET /api/deployments/{id}` | Auth | **Deployment Record:** Retrieve execution status, discrete step timings, image digests, and accumulated logs |
| `POST /api/deployments/{id}/cancel` | Admin | **Cancel Deployment:** Gracefully cancel in-progress deployment task |
| `GET /api/deployments/{id}/stream` | Auth | **Deployment SSE Stream:** Real-time Server-Sent Events stream for progress steps and ANSI log chunks |
| `GET /api/compose/{projectName}/file` | Admin | **Compose YAML Inspector:** Path-traversal sanitized retrieval of `compose.yaml` file contents |
| `PUT /api/compose/{projectName}/file` | Admin | **Safe Compose In-Place Editor:** Updates Compose configuration file with automated `.bak` backup and optional stack restart |
| `POST /api/hooks/deploy/{token}` | Constant-Time Token | **CI/CD Inbound Deploy Webhook:** Constant-time token verified inbound webhook with synchronous `&wait=true` pipeline gate support |
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
| `GET /api/users` | Admin | List all system users and assigned roles (`admin`, `operator`, `viewer`) |
| `POST /api/users` | Admin | Create a new user with specified role |
| `PUT /api/users/{id}/role` | Admin | Update user access role (`admin`, `operator`, `viewer`) |
| `DELETE /api/users/{id}` | Admin | Delete user and immediately revoke all active sessions |
| `GET /api/systems` | Auth | List registered systems with status, CPU/RAM/Disk metrics, and last seen timestamps |
| `POST /api/systems` | Admin | Register a new remote system and issue initial agent secret token |
| `GET /api/systems/{id}` | Auth | Retrieve system telemetry, hardware specs, OS information, and container cache |
| `PUT /api/systems/{id}` | Admin | Update system display name, tags, and operational configuration |
| `DELETE /api/systems/{id}` | Admin | Unregister system, revoke agent token, and purge historical metrics |
| `POST /api/systems/{id}/token` | Admin | Regenerate and re-issue cryptographically secure agent authentication token |
| `GET /api/systems/{id}/metrics` | Auth | Retrieve time-series metrics (`?range=1h\|6h\|24h\|7d\|30d`) from 1m and 1h rollups |
| `GET /api/systems/{id}/containers` | Auth | Retrieve cached remote Docker containers for edge system |
| `GET /api/systems/{id}/stream` | Auth | **SSE:** 100ms adaptive high-frequency telemetry stream from in-memory ring buffer |
| `GET /agent/connect` | Token Auth | **WSS Tunnel:** Bidirectional secure WebSocket tunnel for Corvus Edge Agent |
| `GET /agent/scripts/install.sh` | Public | Dynamic one-line shell installation script for Linux hosts |
| `GET /api/systemd/services` | Admin | List whitelist-filtered Linux systemd services with active/sub-state |
| `POST /api/systemd/services/{name}/start` | Admin | Start specified systemd service unit |
| `POST /api/systemd/services/{name}/stop` | Admin | Stop specified systemd service unit |
| `POST /api/systemd/services/{name}/restart` | Admin | Restart specified systemd service unit |
| `POST /api/systemd/services/{name}/enable` | Admin | Enable systemd service unit at boot |
| `POST /api/systemd/services/{name}/disable` | Admin | Disable systemd service unit from boot |
| `GET /api/systemd/services/{name}/logs` | Admin | Stream live `journalctl -u {name} -n 100` execution logs |
| `GET /api/alerts/rules` | Auth | List configured metric threshold rules and current firing states |
| `POST /api/alerts/rules` | Admin | Create a new metric threshold alert rule (CPU, RAM, Disk) |
| `PUT /api/alerts/rules/{id}` | Admin | Update threshold value, duration, cooldown, or enabled state |
| `DELETE /api/alerts/rules/{id}` | Admin | Delete a metric threshold rule |
| `GET /api/activity` | Auth | Retrieve paginated audit trail events (`?page=1&limit=50&category=...`) |
| `GET /api/activity/stats` | Auth | Summary statistics of audit log events grouped by category |

---

## 5. Background Services & Observability Engines

| Service | Interval | Function |
|---|---|---|
| `ContainerDiscoveryService` | 10 sec | Synchronizes container state from the Docker socket. Newly discovered containers initialize with `is_uptime_enabled = 0`; runtime state directly maps to `healthy` as long as Docker reports running. Detects abnormal non-zero exits to trigger recovery & crash alerts |
| `AutoHealingService` | Event-Driven | Revives crashed containers using a thread-safe sliding window (max 2 restarts within 15 minutes) to avoid infinite flapping storms; dispatches multi-channel auto-healed alert notifications |
| `SystemMetricsCollector` | 15 sec | Samples host CPU, RAM, disk, and network stats into `system_metrics` |
| `UptimeCheckerService` | 5 sec (tick) / 60 sec | HTTP/TCP and ICMP ping checks, body payload assertions, proactive SSL early warnings (14d warning, 7d critical) with daily debounce memory, 3-state finite state machine (`healthy` -> `degraded` -> `down`), and Snitch checks |
| `UpdateCheckerService` | 24 hours | Checks GitHub Releases API for updates and caches release notifications |
| `MemoryTrimmerBackgroundService` | 3 min | Flushes database connection pools, resets WAL logs with `PRAGMA wal_checkpoint(TRUNCATE);`, aggressive Gen 2 compaction, and libc `malloc_trim(0)` |
| `RetentionCleanupService` | Once daily | Performs hourly metric rollup aggregation (`system_metrics_hourly`), enforces dual-stage retention (7d raw / 365d hourly rollup), runs automatic `VACUUM;` to reclaim freelist storage back to host OS, and runs compacting Gen 2 GC sweeps |
| `MetricsBatchFlusherBackgroundService` | 60 sec | Flushes in-memory unmanaged ring buffer telemetry into `system_metrics_1m` in atomic batched transactions |
| `MetricsRetentionWorker` | Once daily | Enforces rolling retention on edge system metrics (7 days for `system_metrics_1m`, 30 days for `system_metrics_1h`) |
| `SystemWatchdogService` | 30 sec | Evaluates node heartbeat health; transitions nodes exceeding 45s to `degraded` and exceeding 90s to `offline` |
| `ThresholdEvaluatorService` | 20 sec | Evaluates configured metric threshold rules (`alert_rules`) against system telemetry with sliding-window anti-spam |
| `FlappingDetector` | Continuous (in-memory) | Sliding-window state transition tracker. Detects flapping oscillations, suppresses intermediate alerts, and dispatches Amber warning and Green recovery alerts |

---

## 6. Authentication, RBAC, and Session Durability

1. **Granular 3-Tier Role-Based Access Control (RBAC):**
   - `admin`: Full administrative control over services, remote systems, tokens, users, systemd units, Docker Compose stacks, container recreate, and system backups.
   - `operator`: Operational management capabilities (start/stop/restart containers, recreate images, acknowledge alarms, run connection tests) without user provisioning or node token revocation privileges.
   - `viewer`: Read-only access across all dashboards, telemetry charts, container logs, and system specs. Mutating endpoints reject viewer requests with `403 Forbidden`.
2. **Persistent Session Store:**
   - Sessions are validated in-memory at sub-microsecond latency and persisted to the `user_sessions` table, ensuring user logins survive container upgrades and service restarts.
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
| **Containers** | `/containers` | Batch stats streaming, live CPU%, RAM, and Net I/O badges, **Clickable Row Navigation (`ContainerRow`)**, **In-Row Quick Actions Toolbar (`ContainerQuickActions`)**, **1-Click Container Deployment**, Start/Stop/Pause/Restart actions, **Bulk Stack Controls (`ComposeStackGroup`)**, **In-Browser YAML & .env Editor (`ComposeConfigModal`)**, **OCI Image Update Sentinel (`ImageUpdateModal`)**, live log terminal, **Interactive Web Terminal**, **Dry-Run Disk Prune (`SystemPruneModal`)**, **Container Tags & Filter Bar (`TagFilterBar`)**, and **CI/CD Webhook Onboarding Wizard (`DeployWebhookWizardModal`)** |
| **Container Detail** | `/containers/:id` | **Dedicated Full-Page Control Center:** Standalone URL-addressable, bookmarkable, deep-linked (`?tab=`) diagnostic dashboard with live telemetry cards (CPU, RAM, Rx/Tx), **Historical Area Telemetry Charts (`ContainerHistoricalCharts`)**, full-screen streaming logs, xterm.js interactive terminal, and **Container Deployments Tab (`ContainerDeploymentsTab`, `DeploymentsTable`)** |
| **Systems Cockpit** | `/systems` | **Multi-Node Fleet Control:** Overview of all edge hosts, node health pills, quick telemetry badges (CPU, RAM, Disk), search & tag filtering, and instant 1-click agent registration modal (`AddSystemModal`) |
| **System Detail** | `/systems/:id` | **Full-Screen Node Diagnostics:** Deep-linked tabs (`?tab=overview\|metrics\|containers\|systemd\|settings`), 100ms adaptive SSE stream (`/api/systems/{id}/stream`), historical charts, remote container control, and Linux systemd unit manager |
| **Activity Timeline** | `/activity` | **Chronological Audit Trail:** Filter by categories (`container`, `security`, `alert`, `system`), search by resource, and view structured JSON metadata payloads |
| **Uptime** | `/uptime` | Service uptime monitors, ICMP Ping, proactive SSL alerts, Dead Man's Snitch monitors, historical check logs, and incident management |
| **System Metrics** | `/metrics` | Time-series hardware utilization charts with **1h, 6h, 12h, 24h, 7d, 30d, 90d, and 1y** periods powered by hourly rollups |
| **Settings** | `/settings` | Single-column (`max-w-4xl`) settings shell with general options, DB storage stats, backup snapshots, **SMTP Email**, **Slack Webhook**, **Metric Threshold Alert Rules (`014_alert_rules.sql`)**, and **Flapping Protection** |
| **Profile** | `/profile` | Self-service password change, 2FA setup, and administrative user management with 3-tier RBAC (`admin`, `operator`, `viewer`) |
| **Public Status** | `/status` | Unauthenticated public uptime dashboard with incident notice banners and collapsible category accordions |
| **Command Palette** | `Ctrl+K` / `Cmd+K` | **Actionable Keyboard Control:** Zero-dependency fuzzy search across pages, containers, node systems, and administrative quick actions |
| **Mobile Glass BottomNav**| *Global* | 7-tab frosted glass bottom navigation bar with sliding indicator and safe-area support (`BottomNav.tsx`) |

---

## 8. Completed Roadmap Milestones

- [x] Native AOT + custom SocketsHttpHandler direct socket client
- [x] Dapper.AOT + Microsoft.Data.Sqlite + Npgsql PostgreSQL + DbUp schema migrations (001-019)
- [x] Corvus Edge Agent (`src/Corvus.Agent`) in .NET 9 Native AOT (<10 MB RAM, outbound TLS/WSS tunnel, zero inbound ports)
- [x] Multi-Node Systems Cockpit (`/systems`, `/systems/:id`) with 100ms adaptive SSE stream
- [x] Zero-Alloc Unmanaged 128-byte `SystemTelemetryPoint` ring buffer (~7.2 KB RAM per node)
- [x] Two-Tier Multi-Node Metrics Retention (`MetricsBatchFlusherBackgroundService`, `MetricsRetentionWorker`)
- [x] System Watchdog Service (`SystemWatchdogService`) for agent heartbeat tracking and automatic state degradation
- [x] 3-Tier Role-Based Access Control (`admin`, `operator`, `viewer`) and `CorvusAuthFilter` endpoint authorization
- [x] Linux Systemd Service Management with regex-guarded validation and live `journalctl` log streaming
- [x] Visual Compose YAML & `.env` Editor with TAB key indentation detection, streamed deployment, and automated `.bak` backups
- [x] Metric Threshold Alerting Engine (`014_alert_rules.sql`, `ThresholdEvaluatorService`) with multi-channel dispatch
- [x] Structured Event Audit Trail (`015_activity_logs.sql`, `/activity`)
- [x] Universal Command Palette (`Ctrl+K`) with zero-dependency fuzzy search (`fuzzySearch.ts`)
- [x] ObsidianUI Design System & Motion Physics Engine (Greyish Cloud White `#F5F6F8`, 180-220ms spring physics, glass surfaces)
- [x] Docker socket multiplexed log demuxer and live log streaming
- [x] Multi-channel alert engine (Discord, Telegram, Ntfy, Webhook, SMTP Email, Slack) with system-language synchronization
- [x] Live container resource stats (CPU, RAM, Net I/O) & Batch Stats Endpoint (`GET /api/containers/stats-summary`)
- [x] Dedicated Full-Page Container Diagnostic & Telemetry Dashboard (`/containers/:id`)
- [x] Historical Container Telemetry Charts (Recharts Area time-series CPU & RAM trend graphs)
- [x] Docker Compose Stack Bulk Actions (Restart / Start / Stop Project)
- [x] Container Crash-Loop & Unexpected Exit Alerting (ExitCode != 0, OOMKilled)
- [x] OCI Registry Image Sentinel & Manifest Digest Watcher (Zero-bandwidth HEAD requests, 1-click safe recreate)
- [x] Event-Driven Auto-Healing & Constant-Time Inbound Deploy Webhooks
- [x] Extended Uptime: TCP Port Ping, ICMP Ping, and proactive SSL certificate early warnings
- [x] Dead Man's Snitch: Periodic push monitoring with auto-overdue alerting
- [x] Unauthenticated Public Status Page (`/status` and `/api/status-page`)
- [x] Server-Sent Events (SSE) real-time data stream (`/api/stream/events`)
- [x] Zero-Trust SSO / Reverse proxy authentication header support
- [x] Persistent Session Store (`user_sessions` and `ISessionRepository`)
- [x] Mobile Glass Bottom Navigation Bar (`BottomNav.tsx`)
- [x] Full compile-time typed bilingual i18n system (English default, Turkish complete)
- [x] Dual-mode backup management: One-click lock-free snapshot download (`GET /api/backup/download`) + external push integration
- [x] Scheduled Native & Managed Memory Trimming (`MemoryTrimmerBackgroundService`, Gen 2 compacting GC, `PRAGMA wal_checkpoint(TRUNCATE)` and libc `malloc_trim(0)`)
- [x] Web Container Exec Terminal (`/api/containers/{id}/terminal`, `@xterm/xterm`, bidirectional stream fix, fallback shell chain)
- [x] Two-Stage Dry-Run System Prune (`/api/containers/system-df`, `/api/containers/prune/selective`, volume protection)
- [x] Environment Tags & Category Grouping (`013_service_tags.sql`, `TagBadge`, `TagInput`, `TagFilterBar`, container tag overrides)
- [x] **Native AOT Container Deployment Center (`019_deployments_sqlite.sql`, `DeploymentEngine.cs`, `DeploymentLockManager.cs`)**
- [x] **Zero-Downtime Rollback & Fail-Fast Pre-Pull Validation (`DockerService.cs`, `DockerImageClient.cs`)**
- [x] **Synchronous CI/CD Inbound Webhook Pipeline Gate (`POST /api/hooks/deploy/{token}?wait=true`)**
- [x] **Vercel-Grade Modular Frontend Deployment Center (`DeploymentStepper`, `DeploymentTerminalLog`, `DeploymentProgressModal`, F5 localStorage state recovery)**
- [x] 374/374 Passing Automated Tests (329 backend xUnit + 45 frontend Vitest)

