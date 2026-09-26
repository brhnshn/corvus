<p align="center">
  <img src=".github/assets/logo.png" width="120" alt="Corvus Logo" />
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
  <img src="https://img.shields.io/badge/Tests-85_Passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/i18n-English_%7C_T%C3%BCrk%C3%A7e-blue" alt="i18n" />
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License" />
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-blue?style=for-the-badge" alt="English" /></a>
  <a href="README.tr.md"><img src="https://img.shields.io/badge/Dil-Türkçe-red?style=for-the-badge" alt="Türkçe" /></a>
</p>

---

## 🌟 Overview

**Corvus** is an ultra-lightweight, self-hosted server launcher and observability dashboard designed for homelabs, VPS instances, and self-hosted environments. Compiled ahead-of-time (**Native AOT**) with zero dynamic reflection, it runs within a **<30 MB RAM footprint** while providing real-time container discovery, Uptime Kuma-grade 3-state service health monitoring, time-series resource tracking, container live logs, multi-channel alerts, and periodic push monitoring.

---

## ✨ Key Features

- **🌍 Fully Bilingual & Compile-Time i18n:**
  - Native React 19 Context with zero external library overhead (~1.2 KB) and compile-time type safety (`DeepStringify`).
  - English (`en`) as default, Turkish (`tr`) fully supported with one-click seamless switcher.
  - Outbound alerts (Discord, Telegram, Ntfy, Webhooks) synchronized to the configured system language.
- **🚀 Dual-Mode Service Launcher:**
  - **Automatic Discovery:** Detects Docker containers via direct Docker socket communication (`/var/run/docker.sock`), extracting Glance-style metadata (`corvus.name`, `corvus.category`, `corvus.url`, etc.).
  - **Manual Services:** Add external URLs, bare-metal endpoints, IoT devices, or local services.
  - **Visual Reordering:** Drag & drop / up-down service ordering with persistent `display_order`.
- **🧠 In-Memory Micro-Cache & Elastic Memory Architecture:**
  - 2.5-second zero-allocation in-memory cache: Eliminates 90% of redundant Docker socket and SQLite calls during rapid tab switching (<150 KB memory footprint).
  - Batch container stats endpoint (`GET /api/containers/stats-summary`) gathering all active container metrics in a single HTTP request instead of N+1.
  - .NET 9 `System.GC.ConserveMemory=5` runtime configuration and periodic post-retention memory compaction, keeping memory strictly between 30–45 MB.
- **🛡️ Uptime Kuma-Grade 3-State Resilience Engine:**
  - `healthy` ➔ `degraded` ➔ `down` state machine: Prevents panicky false alarms during transient network glitches; only raises alarms after 3 consecutive failures.
  - Concurrent health probing powered by `Parallel.ForEachAsync` with bounded concurrency.
  - Automatic container loopback networking resolution (`host.docker.internal` / default bridge gateway routing).
- **💾 Dual-Mode Backup Management & Disaster Recovery:**
  - **Internal Snapshot Download:** One-click SQLite `VACUUM INTO` point-in-time database snapshot download (`GET /api/backup/download`), lock-free and instantly updating Dashboard stats via SSE.
  - **External Backup Push:** Easy integration for host backup tools (`restic`, `borg`, cron) with dynamic token generator and auto-configured `curl` snippets.
- **🧹 Flexible Data Retention & Storage Telemetry:**
  - Configurable retention presets: 7d, 15d, 30d (recommended), 60d, 90d, 180d, 365d, or **Unlimited (0)**.
  - Informative disk-growth advisories when selecting Unlimited mode.
  - Real-time database disk footprint tracking (`GET /api/settings/db-stats`).
  - Dynamic background cleaner (`RetentionCleanupService`) with SQLite `PRAGMA optimize;`.
- **🪵 Real-Time Container Log Streaming:**
  - Zero-allocation multiplexed demuxer (`DockerLogDemuxer.cs`) for Docker stdout/stderr streams.
  - Real-time Server-Sent Events (`/api/containers/{id}/logs/stream`) with dark monospace terminal modal, keyword filtering, and auto-scroll.
- **⚡ Container Stats & Lifecycle Controls:**
  - Live per-container CPU %, Memory (usage/limit), and Net I/O (Rx/Tx) via Docker Stats API.
  - Lifecycle actions: **Start**, **Stop**, **Pause**, **Unpause**, and **Restart** with confirmation modals.
  - **Compose Stack Grouping:** Toggle between flat list and collapsible Docker Compose projects (`com.docker.compose.project`).
- **🔔 Multi-Channel Alerting Engine:**
  - Tabbed notification configuration: **Discord**, **Telegram**, **Ntfy / Gotify**, and **Generic Webhooks**.
  - Configurable notification triggers (`notify_service_events`) and one-click test notification dispatcher.
- **⏱️ Extended Endpoint Uptime & SSL Tracking (Uptime Kuma Architecture):**
  - **Automatic Reverse Proxy Domain Detection:** Parses Traefik rules (`Host(...)`), Caddy labels, `VIRTUAL_HOST`, `LETSENCRYPT_HOST`, and container environment variables (`NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `APP_URL`) to bind public domains instead of unreachable host loopbacks.
  - **Advanced Monitor Parameters (`AdvancedCheckOptions`):** Independent per-service check intervals (`check_interval`: 10s-300s), custom timeouts (`timeout_seconds`), failure tolerance (`max_retries` / `retry_interval`), ignore TLS errors (`ignore_tls`), accepted HTTP status codes (`accepted_status_codes`, e.g. `200-299, 401`), and HTTP method selection (GET/POST/HEAD).
  - **Customizable Service Endpoints & Check Types:** Standalone modular modal accessible from both Services and Uptime pages to configure target URLs, custom health endpoints (`/api/health`), TCP ports, or native Docker daemon health checks. Preserved across restarts via `service_overrides`.
  - **Native Docker Health Checks for Internal/Agent Containers:** Internal background services without exposed web ports (e.g. `internal-beszel-agent`) are monitored via direct Docker daemon state (`checkType: 'docker'`), providing real green SLA bars and audit trails.
  - **HTTP/HTTPS & TCP Port Ping:** Socket-level connection test for non-HTTP services (databases, SSH, game servers).
  - **SSL Certificate Expiration:** Auto-tracks SSL remaining days and issuer; triggers alert if expiration is within 14 days.
- **💀 Dead Man's Snitch (Periodic Push Monitor):**
  - Monitor cron jobs and backup scripts (`borg`, `restic`, scripts).
  - Configurable expected interval (e.g. every 24h) and grace period; automatically alerts when overdue.
- **🌐 Public Status Page (Disabled by Default & Opt-in):**
  - Follows Uptime Kuma security principles: **disabled by default** (`status_page_enabled = false`); easily toggled on/off in Settings.
  - Renders a clean, dark-themed "Status Page Disabled" card (`PublicStatusDisabled.tsx`) when inactive.
  - **Strictly Opt-in:** Discovered Docker containers or manual services are never auto-published; only services explicitly marked with `is_public` appear on the public board.
- **🛡️ Zero-Trust SSO & Reverse Proxy Auth:**
  - Auto-login support via trusted headers: `Tailscale-User-Login`, `Cf-Access-Authenticated-User-Email`, `Remote-User`, `X-Forwarded-User`.
  - Built-in credentials authentication with configurable registration toggle.
- **📱 Responsive Mobile & Tablet First Command Center:**
  - 2-column KPI strip (Services, Containers, CPU, RAM), full-width disk progress card, and side-by-side active container cards.
  - Slide-over drawer navigation, sticky mobile header, and dual-mode responsive tables/cards.
- **🔄 Automated Semantic Version & Update Checker:**
  - Dynamic SemVer comparison against GitHub Releases API (`GET /api/version`) with one-click update notice banner.
- **⚡ Performance & Optimization:**
  - SQLite WAL mode with `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA temp_store = MEMORY;`.
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
| `GET /api/status-page` | Public unauthenticated system status summary |
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

## 📄 License

This project is licensed under the [MIT License](LICENSE).
