<div align="center">

[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](scope.md)
[![Türkçe](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red?style=for-the-badge)](scope.tr.md)

</div>

# Corvus — Scope & Architectural Principles

## 1. Foundational Principle

Corvus is not tailored for a single individual or specific private infrastructure. As an open-source project, it serves as a **universal service launcher and unified monitoring dashboard for any self-hosted node**. The original author's development environment merely serves as an initial testbed — the application has zero mandatory dependencies on specific vendors.

---

## 2. Service Discovery: Dual-Mode Architecture

### A) Automated Discovery (Default)
- Connects directly to the local Docker socket and automatically identifies active containers.
- Operates independently of any reverse proxy (Caddy, Traefik, Nginx) or orchestration tool (Coolify, Portainer) by querying the standard Docker Engine API.
- Ingests container metadata (name, port mappings, runtime status, resource utilization) without requiring external agents.
- Metadata can be extended via Docker labels (`corvus.name`, `corvus.category`, `corvus.url`, `corvus.healthcheck`, `corvus.icon`, `corvus.ignore`).
- Automatically organizes multi-container stacks by their Docker Compose project names (`com.docker.compose.project`).

### B) Manual Registration
- Supports arbitrary endpoints that the Docker daemon cannot directly inspect (remote VPS instances, external SaaS APIs, IoT devices, distinct networks).
- Users can define custom target URLs/IPs, friendly names, category groups, descriptions, check types (HTTP/HTTPS or TCP Port Ping), and visibility on the public status page.
- Services can be custom ordered via drag-and-drop or visual reordering arrows (`display_order`).

---

## 3. Infrastructure Independence & Integration Framework

| Domain | Private Setup Example | Corvus Universal Approach |
|---|---|---|
| Reverse Proxy | Caddy | Compatible with any reverse proxy. Automatically detects Zero-Trust SSO headers (`Tailscale-User-Login`, `Cf-Access-Authenticated-User-Email`, `Remote-User`, `X-Forwarded-User`). |
| Orchestration | Coolify / Portainer | Interacts directly with the standard Docker socket (`/var/run/docker.sock`); no external orchestration dependencies required. |
| Networking / VPN | Tailscale | Requires no specific VPN layer; functions identically across LAN, WireGuard, Tailscale, or the public Internet. |
| Backup / Cron Monitoring | `/opt/scripts/backup.sh` | **Dead Man's Snitch** push infrastructure (`/api/push/{token}`). Automatically dispatches alerts when expected intervals and grace windows expire. |
| Alerting & Notifications | — | Built-in multi-channel alerting: Discord, Telegram, Email (SMTP), Slack Webhooks, Ntfy/Gotify, and generic HTTP Webhooks with intelligent flapping suppression. |
| Container Terminal & Prune | — | Browser-based interactive container web terminal (`/api/containers/{id}/terminal`) and one-click system prune (`/api/containers/prune`) via standard Docker API. |
| Telemetry Downsampling | — | Dual-stage retention (7d raw, 365d hourly rollup) maintaining lightweight SQLite database with fast 30d/90d/1y time-series charts. |
| Real-Time Communication | — | Server-Sent Events (SSE) via `/api/stream/events` and real-time container log streaming (`/api/containers/{id}/logs/stream`). |

---

## 4. UI & Design Principles

- Responsive Mobile & Tablet First: Slide-over drawer navigation, sticky top bar, dual-mode responsive tables and cards.
- Public Status Page: Dedicated, unauthenticated `/status` overview for external users and clients.
- Performance: Code-split routes via `React.lazy`, isolated vendor chunks, adhering to production asset budgets (<200 KB initial chunk).
