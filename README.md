<p align="center">
  <img src=".github/assets/banner.jpg" alt="Corvus Banner" width="100%" />
</p>

<h1 align="center">Corvus</h1>

<p align="center">
  <strong>Lightweight, Native AOT Server Launcher & Monitoring Dashboard for Self-Hosted Nodes</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-9.0_Native_AOT-512BD4?logo=dotnet" alt=".NET 9" />
  <img src="https://img.shields.io/badge/RAM_Usage-%3C30_MB-success" alt="RAM <30MB" />
  <img src="https://img.shields.io/badge/Frontend-React_19_+_Vite_+_Tailwind-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Database-SQLite_+_Dapper.AOT-003B57?logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Tests-211_Passing-brightgreen" alt="Tests" />
  <a href="https://github.com/brhnshn/Corvus/actions/workflows/codeql.yml"><img src="https://github.com/brhnshn/Corvus/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <a href="https://coderabbit.ai"><img src="https://img.shields.io/badge/CodeRabbit-Reviewed-ff5722?logo=coderabbit" alt="CodeRabbit" /></a>
  <img src="https://img.shields.io/badge/i18n-English_%7C_T%C3%BCrk%C3%A7e-blue" alt="i18n" />
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License" />
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-blue?style=for-the-badge" alt="English" /></a>
  <a href="README.tr.md"><img src="https://img.shields.io/badge/Dil-Türkçe-red?style=for-the-badge" alt="Türkçe" /></a>
</p>

---

## 🌟 Overview

**Corvus** is an ultra-lightweight, self-hosted server launcher and observability dashboard designed for homelabs, VPS instances, and self-hosted environments. Compiled ahead-of-time (**Native AOT**) with zero dynamic reflection, it runs within a **<30 MB RAM footprint** while providing real-time container discovery, enterprise-grade 3-state service health monitoring, time-series resource tracking, container live logs, multi-channel alerts, and periodic push monitoring.

---

## ✨ Key Features

- **🔐 Role-Based Access Control (RBAC) & Persistent Sessions:**
  - Granular `admin` (full mutations) and `viewer` (read-only) roles protected at the endpoint level via `RequireAdminAttribute`.
  - Persistent SQLite session store (`user_sessions` table): Ensures user sessions survive container upgrades, restarts, and redeployments without losing sub-microsecond in-memory verification.
  - Modular **Profile & Security View** (`/profile`): Self-service password updates, 2FA management, and administrative user provisioning.
  - Centralized `corvus_unauthorized` session interceptor: Gracefully redirects users back to login without throwing unhandled exceptions.
- **📱 Mobile Glass Bottom Navigation Bar:**
  - 7-tab frosted glass bottom navigation bar (`BottomNav.tsx`) with expanding active tabs, sliding indicator, and safe-area notch padding.
  - Clean edge-to-edge mobile experience without redundant top bars or drawer clutter.
- **🌍 Fully Bilingual & Compile-Time i18n:**
  - Native React 19 Context with zero external library overhead (~1.2 KB) and compile-time type safety (`DeepStringify`).
  - English (`en`) as default, Turkish (`tr`) fully supported with one-click seamless switcher.
  - Outbound alerts (Discord, Telegram, Ntfy, Webhooks) synchronized to the configured system language.
- **🧠 In-Memory Micro-Cache & Aggressive Memory Compaction (Memory Trimmer):**
  - 2.5–10 second zero-allocation in-memory cache: Eliminates 90% of redundant Docker socket and SQLite calls during rapid tab switching (<150 KB memory footprint).
  - Batch container stats endpoint (`GET /api/containers/stats-summary`) with `one-shot=true` and sliding CPU delta calculation, eliminating Docker Engine 1-second sampling sleep and delivering sub-100ms instant metrics.
  - **MemoryTrimmerBackgroundService:** Periodically (every 3 min) flushes SQLite connection pools (`ClearAllPools`), truncates WAL logs via `PRAGMA wal_checkpoint(TRUNCATE);`, invokes Gen 2 aggressive compacting GC, and calls Linux libc `malloc_trim(0)`.
  - **Non-Concurrent Workstation GC** (`DOTNET_gcConcurrent=0`) and `DOTNET_GCConserveMemory=9` locking idle RAM strictly between 20–30 MB.
  - **RetentionCleanupService:** Performs automatic SQLite `VACUUM;` after daily cleanups to return orphaned freelist storage directly back to the host filesystem.
- **🚀 Dual-Mode Service Launcher & Smart Container Sync:**
  - **Smart Automatic Discovery:** Discovers Docker containers via direct Docker socket communication (`/var/run/docker.sock`). Caches unchanged container environment variables via `_inspectCache` and skips redundant database write transactions using `ComputeFingerprint`.
  - **Manual Services:** Add external URLs, bare-metal endpoints, IoT devices, or local services.
  - **Visual Reordering:** Drag & drop / up-down service ordering with persistent `display_order`.
- **🛡️ Advanced 3-State Resilience & Health Engine:**
  - `healthy` ➔ `degraded` ➔ `down` state machine: Prevents panicky false alarms during transient network glitches; only raises alarms after 3 consecutive failures.
  - Concurrent health probing powered by `Parallel.ForEachAsync` with bounded concurrency.
  - Automatic container loopback networking resolution (`host.docker.internal` / default bridge gateway routing).
- **⏱️ Extended Endpoint Uptime, ICMP Ping & Proactive SSL Expiry:**
  - **ICMP Ping Monitor:** Asynchronous packet round-trip latency (RTT) and reachability diagnostics via `System.Net.NetworkInformation.Ping` for bare-metal nodes, switches, and routers (`checkType: 'ping'`).
  - **Proactive SSL/TLS Expiry Alerts:** Early alerts dispatched to Discord, Telegram, Ntfy, and Webhooks at 14 and 7 days prior to certificate expiration with level-based daily debounce deduplication.
  - **User-Controlled (Opt-in) Uptime & Live Connection Testing:** One-click **"Web/Domain Only"** filter on discovered containers to isolate HTTP endpoints; verify reachability via instant "Test Connection" button (`POST /api/uptime/test-connection`) before opting in.
  - **Interactive Latency Badges:** Color-coded response time badges in recent checks (<200ms green, 200-500ms amber, >500ms red).
  - **Automatic Reverse Proxy Domain Detection:** Parses Traefik rules (`Host(...)`), Caddy labels, `VIRTUAL_HOST`, `LETSENCRYPT_HOST`, and container environment variables (`NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `APP_URL`) to bind public domains instead of unreachable host loopbacks.
  - **Advanced Monitor Parameters (`AdvancedCheckOptions`):** Independent per-service check intervals (`check_interval`: 10s-300s), custom timeouts (`timeout_seconds`), failure tolerance (`max_retries` / `retry_interval`), ignore TLS errors (`ignore_tls`), accepted HTTP status codes (`accepted_status_codes`, e.g. `200-299, 401`), and HTTP method selection (GET/POST/HEAD).
  - **Native Docker Health Checks for Internal Containers:** Internal background services without exposed web ports are monitored via direct Docker daemon state (`checkType: 'docker'`).
- **🦅 Pure Vector Brand Identity (Hex Sentinel):**
  - Crafted geometric logo fusing the Docker container hexagon, Corvus **C** monogram, and the vigilant raven sentinel.
  - Multi-resolution `favicon.ico`, pure vector `favicon.svg`, mobile PWA manifest, and comprehensive brand guidelines (`docs/branding/BRAND_GUIDELINES.md`).
- **💾 Dual-Mode Backup Management & Disaster Recovery:**
  - **Internal Snapshot Download:** One-click SQLite `VACUUM INTO` point-in-time database snapshot download (`GET /api/backup/download`), lock-free and instantly updating Dashboard stats via SSE.
  - **External Backup Push:** Easy integration for host backup tools (`restic`, `borg`, cron) with dynamic token generator and auto-configured `curl` snippets.
- **🧹 Flexible Data Retention & Storage Telemetry:**
  - Configurable retention presets: 7d, 15d, 30d (recommended), 60d, 90d, 180d, 365d, or **Unlimited (0)**.
  - **Intelligent 24-Hour Retention:** Automatically prunes routine non-state-changing pings older than 24 hours (`is_transition = 0`) while preserving transition audit records and populating 365-day lightweight daily summaries (`uptime_daily_stats`).
  - Informative disk-growth advisories when selecting Unlimited mode.
  - Real-time database disk footprint tracking (`GET /api/settings/db-stats`).
  - Dynamic background cleaner (`RetentionCleanupService`) with SQLite `PRAGMA optimize;`.
- **🪵 Real-Time Container Log Streaming & Web Terminal (Exec Shell):**
  - **In-Browser Web Terminal (`/bin/sh`, `/bin/bash`, `/bin/ash`, `/bin/zsh`):** Interactive shell access directly into running containers via zero-allocation ASP.NET Core Native AOT WebSocket proxy (`ArrayPool<byte>`, 8 KB static buffer footprint).
  - Dynamic PTY resizing via JSON control frames, ANSI/VT100 rendering with `@xterm/xterm`, and strict RBAC protection (`[RequireAdmin]`, 403 Forbidden).
  - Zero-allocation multiplexed demuxer (`DockerLogDemuxer.cs`) for Docker stdout/stderr streams.
  - Real-time Server-Sent Events (`/api/containers/{id}/logs/stream`) with dark monospace terminal modal, keyword filtering, and auto-scroll.
- **⚡ Container Stats, Lifecycle Controls & System Prune:**
  - Live per-container CPU %, Memory (usage/limit), and Net I/O (Rx/Tx) via Docker Stats API.
  - Lifecycle actions: **Start**, **Stop**, **Pause**, **Unpause**, and **Restart** with confirmation modals.
  - **Compose Stack Grouping:** Toggle between flat list and collapsible Docker Compose projects (`com.docker.compose.project`).
  - **One-Click System Prune:** Clean dangling/unused images, stopped containers, orphan networks, and unused volumes with persistent data safeguards and detailed disk reclamation statistics.
- **🔔 Multi-Channel Alerting Engine & Flapping Protection:**
  - Tabbed notification configuration: **Discord**, **Telegram**, **Email (SMTP)**, **Slack Webhooks**, **Ntfy / Gotify**, and **Generic Webhooks**.
  - **Intelligent Flapping Suppression (`IFlappingDetector`):** Sliding-window transition tracking suppresses alert spam during intermittent flapping, dispatching single warning (Amber) and resolved (Green) notifications.
  - Interactive multi-recipient chip input (`EmailRecipientInput`) with regex validation and clipboard parsing.
- **📉 Time-Series Downsampling & Historical Rollups:**
  - Automatic downsampling of 15-second raw metrics (`system_metrics`) into hourly summary records (`system_metrics_hourly`).
  - Dual retention policy: 7 days retention for high-frequency raw telemetry, 365 days retention for hourly rollups.
  - High-performance unified queries powering `30d`, `90d`, and `1y` time-series views with zero chart gaps.
- **⏱️ Extended Endpoint Uptime & SSL Tracking:**
  - **User-Controlled (Opt-in) Uptime & Live Connection Testing:** Containers discovered from Docker are not blindly polled; they reside cleanly in an unmonitored pool on the Uptime page. Users configure target endpoints, verify reachability via an instant "Test Connection" button (`POST /api/uptime/test-connection`), and explicitly opt in.
  - **Automatic Reverse Proxy Domain Detection:** Parses Traefik rules (`Host(...)`), Caddy labels, `VIRTUAL_HOST`, `LETSENCRYPT_HOST`, and container environment variables (`NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `APP_URL`) to bind public domains instead of unreachable host loopbacks.
  - **Advanced Monitor Parameters (`AdvancedCheckOptions`):** Independent per-service check intervals (`check_interval`: 10s-300s), custom timeouts (`timeout_seconds`), failure tolerance (`max_retries` / `retry_interval`), ignore TLS errors (`ignore_tls`), accepted HTTP status codes (`accepted_status_codes`, e.g. `200-299, 401`), and HTTP method selection (GET/POST/HEAD).
  - **Customizable Service Endpoints & Check Types:** Standalone modular modal accessible from both Services and Uptime pages to configure target URLs, custom health endpoints (`/api/health`), TCP ports, or native Docker daemon health checks. Preserved across restarts via `service_overrides`.
  - **Native Docker Health Checks for Internal/Agent Containers:** Internal background services without exposed web ports (e.g. `internal-agent`, `cloudflared`, `local-dns`) are monitored via direct Docker daemon state (`checkType: 'docker'`), providing real green SLA bars and audit trails.
  - **HTTP/HTTPS & TCP Port Ping:** Socket-level connection test for non-HTTP services (databases, SSH, game servers).
  - **SSL Certificate Expiration:** Auto-tracks SSL remaining days and issuer; triggers alert if expiration is within 14 days.
- **💀 Dead Man's Snitch (Periodic Push Monitor):**
  - Monitor cron jobs and backup scripts (`borg`, `restic`, scripts).
  - Configurable expected interval (e.g. every 24h) and grace period; automatically alerts when overdue.
- **🌐 Public Status Page (Always Active & Strictly Opt-in):**
  - **Direct Access (`/status`):** Active and accessible out of the box for public services without requiring administrative toggle activation.
  - **Strictly Opt-in:** Discovered Docker containers and manual services are never auto-published; only services explicitly marked with both `is_public` and `is_uptime_enabled` appear on the public board.
  - **Interactive 30-Check Latency Bars:** Mini status bars representing the last 30 checks with hover tooltips displaying check latency (ms), timestamp, and pass/fail status.
  - **Collapsible Category Accordions:** Services organized by category with aggregate health status badges and collapse/expand controls.
  - **System Incidents & Scheduled Maintenance Banners:** Real-time operational incident and scheduled maintenance notices (`service_incidents`) managed via the administrative Incidents tab.
  - **Lightweight Yearly Rollup:** Backed by 365-day daily summaries (`uptime_daily_stats`), providing long-term SLA insights with minimal disk footprint.
- **🛡️ Hardened Authentication, Zero-Trust SSO & DoS Protection:**
  - **100k Iteration PBKDF2 & Cryptographic Salting:** 16-byte cryptographic random salt with PBKDF2-HMAC-SHA256 password hashing; automatic transparent rehash migration for legacy accounts.
  - **Brute-Force & CPU DoS Mitigation:** In-memory rate limiting blocks client IP/username after 5 failed attempts in 1 minute with a 1-minute temporary lockout (`HTTP 429`).
  - **Hardened Reverse Proxy Headers:** Spoofing prevention for SSO headers (`Tailscale`, `Cloudflare Access`, `Remote-User`, `X-Forwarded-User`) via opt-in `CORVUS_TRUST_PROXY_HEADERS` and trusted IP verification.
  - **Strict CORS Policy:** Credentialed cross-origin requests restricted to explicitly defined `CORVUS_ALLOWED_ORIGINS` or local development.
  - **Modernized Auth Screen:** Reveal/hide password toggle, full password manager (`autoComplete`) support, and Docker `.env` initial login switch.
- **📱 Responsive Mobile & Tablet First Command Center:**
  - 2-column KPI strip (Services, Containers, CPU, RAM), full-width disk progress card, and side-by-side active container cards.
  - Slide-over drawer navigation, sticky mobile header, and dual-mode responsive tables/cards.
- **🔄 Automated Semantic Version & Update Checker:**
  - Dynamic SemVer comparison against GitHub Releases API (`GET /api/version`) with one-click update notice banner.
- **⚡ Performance & Optimization:**
  - SQLite WAL mode with `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA cache_size = -2000;`.
  - Container-level glibc arena constraints (`MALLOC_ARENA_MAX=2`) and zero-body streaming response reads to eliminate multi-threaded memory bloat.
  - Composite indexes on time-series telemetry tables (`004_performance_indexes.sql`).
  - Route code-splitting via `React.lazy` and Vite `manualChunks` (initial bundle <200 KB).

---

## 🏗️ Architecture

```
Corvus Architecture:
┌────────────────────────────────────────────────────────┐
│               Corvus Web Dashboard                    │
│   (React 19 + TypeScript + Tailwind v4 + Recharts)    │
│   [Routes: Dashboard, Services, Containers, Uptime,    │
│            Metrics, Settings, Public Status (/status)] │
└───────────────────────────┬────────────────────────────┘
                            │ REST API + SSE Stream (/api/stream/events)
┌───────────────────────────▼────────────────────────────┐
│               Corvus Core Engine                       │
│       ASP.NET Core Minimal API (.NET 9 Native AOT)     │
├───────────────────────────┬────────────────────────────┤
│  Docker REST API Client   │  SQLite + Dapper.AOT       │
│  (SocketsHttpHandler)     │  (DbUp Migrations 001-006) │
├───────────────────────────┴────────────────────────────┤
│  Core Services:                                        │
│  - DockerLogDemuxer (Zero-alloc multiplexed demuxer)   │
│  - NotificationService (Discord, Telegram, Ntfy, Web)  │
│  - EventBroadcaster (Channel<ServerEventDto> for SSE)  │
│  - AuthService (Zero-Trust SSO + Session Cookies)      │
├────────────────────────────────────────────────────────┤
│  Background Services:                                  │
│  - ContainerDiscoveryService (10s)                     │
│  - SystemMetricsCollector (15s)                        │
│  - UptimeCheckerService (TCP Ping, SSL, Snitch - 60s)  │
│  - RetentionCleanupService (24h)                       │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start with Docker Compose

Create a `docker-compose.yml` file:

```yaml
services:
  corvus:
    image: corvus:latest
    container_name: corvus
    restart: unless-stopped
    ports:
      - "8090:8090"
    environment:
      - CORVUS_PORT=8090
      - CORVUS_DATA_DIR=/data
      - DOCKER_SOCKET=/var/run/docker.sock
      - CORVUS_AUTH_ENABLED=true
      - CORVUS_AUTH_USER=admin
      - CORVUS_AUTH_PASS=corvus123
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - corvus-data:/data

volumes:
  corvus-data:
```

Run the container:

```bash
docker compose up -d
```

Open your browser at **`http://localhost:8090`** (or public status page at **`http://localhost:8090/status`**).

---

## 🏷️ Docker Container Labels

Enhance your containers with Corvus metadata labels in your compose files:

```yaml
labels:
  - "corvus.name=Nextcloud Hub"
  - "corvus.category=Cloud Storage"
  - "corvus.description=Personal file sync and share"
  - "corvus.url=https://cloud.example.com"
  - "corvus.healthcheck=https://cloud.example.com/status.php"
  - "corvus.icon=cloud"
  - "corvus.ignore=false"
```

---

## 📡 API Endpoints Overview

| Method & Path | Description |
|---|---|
| `GET /api/dashboard/summary` | Consolidated KPI overview |
| `GET /api/services` | Service catalogue with ordering and SSL info |
| `PUT /api/services/reorder` | Update visual service ordering |
| `GET /api/status-page` | Public unauthenticated system status summary (services, 30-check sparklines & incidents) |
| `GET /api/incidents` | List active and historical system incidents & maintenance notices |
| `POST /api/incidents` | Create a new system incident or maintenance notice |
| `PUT /api/incidents/{id}` | Update incident details, severity, or message |
| `POST /api/incidents/{id}/resolve` | Mark an incident as resolved |
| `DELETE /api/incidents/{id}` | Remove an incident record |
| `GET /api/uptime/{id}/daily-stats` | 365-day daily uptime rollup statistics |
| `GET /api/containers` | Docker containers list with state and ports |
| `GET /api/containers/{id}/stats` | Live container CPU%, RAM, Net I/O |
| `GET /api/containers/{id}/logs` | Snapshot container logs |
| `GET /api/containers/{id}/logs/stream` | Real-time SSE container log stream |
| `POST /api/containers/{id}/start` | Start container |
| `POST /api/containers/{id}/stop` | Stop container |
| `POST /api/containers/{id}/pause` | Pause container |
| `POST /api/containers/{id}/unpause` | Unpause container |
| `POST /api/containers/{id}/restart` | Restart container |
| `GET /api/push-monitors` | List Dead Man's Snitch periodic push monitors |
| `POST /api/push-monitors` | Create new Dead Man's Snitch monitor |
| `POST /api/push/{token}` | Push webhook ping for backups and cron jobs |
| `GET /api/backup/download` | Lock-free internal SQLite database snapshot download (`.db`) |
| `GET /api/settings/db-stats` | Real-time SQLite database & WAL disk size telemetry |
| `GET /api/settings` | Retrieve all system settings |
| `PUT /api/settings` | Update system configuration parameters |
| `POST /api/notifications/test` | Test alert dispatch (Discord, Telegram, Ntfy, Webhook) |
| `GET /api/stream/events` | Server-Sent Events live status stream |
| `GET /api/auth/status` | Current session & Zero-Trust SSO detection |

---

## 🛠️ Development & Building from Source

### Prerequisites
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/)

### Building the Project
1. **Frontend:**
   ```bash
   cd src/Corvus.Web
   npm install
   npm run build
   ```
2. **Backend:**
   ```bash
   cd ../Corvus.Api
   dotnet run
   ```
3. **Running Tests:**
   ```bash
   dotnet test tests/Corvus.Api.Tests
   ```

---

## 💡 Inspirations & Credits

Corvus is inspired by the architectural philosophies of pioneering open-source homelab and observability tools, re-imagined from the ground up as a single, ultra-lightweight .NET 9 Native AOT command center:
- [Uptime Kuma](https://github.com/louislam/uptime-kuma) — Health monitoring philosophy and status page concepts
- [Beszel](https://github.com/henrygd/beszel) — Compact telemetry and system resource metrics approach
- [Portainer](https://github.com/portainer/portainer) — Container lifecycle management vision

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
