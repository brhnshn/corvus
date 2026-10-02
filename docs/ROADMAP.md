# Corvus Engineering Roadmap

This document outlines the structured, vertical-slice roadmap ("tracer bullet tickets") to advance Corvus toward enterprise-grade production reliability while strictly preserving its core identity: ultra-low memory footprint (30-50 MB RAM), lightning-fast performance, and zero bloat.

---

## Phase 1: Reliability, Identity & Auth Hardening

### Ticket 1.1 — Persistent SQLite Session Store [Completed - v1.5.19]
* **Blocked by:** None.
* **Objective:** Prevent session logout when the container restarts or updates.
* **Scope:**
  - SQLite `user_sessions` table migration (`010_user_sessions.sql`).
  - `ISessionRepository` and `SessionRepository` data access layer.
  - Hybrid write-through caching in `AuthService` (RAM speed + SQLite durability).
  - Daily pruning of expired sessions in `RetentionCleanupService`.
* **Acceptance Criteria:** User sessions survive container restart; all 149 unit tests pass.

### Ticket 1.2 — User Management, RBAC & Password Change [Completed]
* **Blocked by:** Ticket 1.1
* **Objective:** Allow administrators to update passwords, manage users, and assign `admin` vs `viewer` (read-only) roles.
* **Scope:**
  - `UserRepository` CRUD expansion (update password, list/delete users).
  - Endpoints: `POST /api/auth/change-password`, `GET/POST/DELETE /api/users`, and `RequireAdmin` RBAC filter.
  - Safeguards against self-deletion and last admin deletion; active session revocation on deletion.
  - Guard mutating actions (container restart/start/stop, service mutations, settings update, backup download) with 403 Forbidden for viewers.
  - Modular Profile page (`/profile`) with dual tabs ("Profile & Security" and admin "Users & Roles").
  - Full bilingual (TR & EN) localization.
* **Acceptance Criteria:** Password change verified; `viewer` role blocked with 403 Forbidden on mutating actions; all 157 unit tests pass.

---

## Phase 2: Network & Advanced Monitoring Engine

### Ticket 2.1 — Proactive SSL/TLS Expiry Alerting [Completed]
* **Blocked by:** None.
* **Objective:** Send proactive alerts to notification channels when certificates are within 14 and 7 days of expiration.
* **Scope:**
  - Added `DispatchSslExpiryAlertAsync` to `INotificationService` with Discord (Amber/Red embed), Telegram, Ntfy (lock/warning priority), and Generic Webhook integrations.
  - Level-based (`7d` critical, `14d` warning) daily debounce (anti-spam) in `UptimeCheckerService` with auto-reset upon certificate renewal.
  - Notification trigger filter `notify_ssl_expiry` in Settings.
  - Enhanced UI badges on Service and Status pages with pulsing red `ShieldAlert` for <= 7d and amber warning for <= 14d.
  - Full bilingual (TR & EN) localization.
* **Acceptance Criteria:** Alerts sent upon threshold breach; anti-spam debounce verified; all 160 unit tests pass.

### Ticket 2.2 — ICMP Ping Monitor [Completed]
* **Blocked by:** None.
* **Objective:** Measure RTT latency and packet loss for bare network devices (routers, switches, gateways).
* **Scope:**
  - Non-blocking asynchronous ICMP Echo Request and RTT measurement via `System.Net.NetworkInformation.Ping`.
  - Target host sanitization (`ExtractHost`: stripping `ping://`, ports, and paths) and container loopback resolution.
  - `CheckType = "ping"` support in Service model and real-time ping check on `/api/uptime/test-connection`.
  - UI options in Add, Edit, and Enable Uptime modals with dynamic field filtering (hiding HTTP options when ping is selected).
  - Cyan `ICMP PING` / `PING` badges and RTT metrics display on Dashboard and Uptime views.
  - Full bilingual (TR & EN) localization and xUnit unit test suite (`PingCheckerTests.cs`).
* **Acceptance Criteria:** ICMP ping records latency correctly; unit tests pass (169/169 tests passing).

### Ticket 2.3 — HTTP Response Body (Keyword / Regex) Assertion
* **Blocked by:** None.
* **Objective:** Verify response payload contents even when endpoints return HTTP 200.
* **Scope:**
  - Add `expected_body` column to `Service` model.
  - Streaming body assertion in `UptimeCheckerService`.
  - UI input for "Expected Response Content (Optional)".
* **Acceptance Criteria:** Service marked degraded/down when expected keyword is missing.

---

## Phase 3: Notification Channels & Alert Discipline

### Ticket 3.1 — Email (SMTP) & Slack Channels
* **Blocked by:** None.
* **Objective:** Add standard enterprise notification channels.
* **Scope:**
  - SMTP client implementation in `NotificationService`.
  - Slack Webhook payload formatting.
  - Settings tab test and save controls.
* **Acceptance Criteria:** Test notifications successfully delivered to SMTP and Slack.

### Ticket 3.2 — Flapping Suppression & Alert Debounce
* **Blocked by:** None.
* **Objective:** Prevent alert spam when unstable networks cause rapid service status transitions.
* **Scope:**
  - Sliding-window state history per service.
  - Automatic suppression when transitions exceed threshold in a 5-minute window.
* **Acceptance Criteria:** Flapping simulation yields only initial failure and final stable recovery alerts.

---

## Phase 4: Advanced Docker & Container Operations

### Ticket 4.1 — Web Container Exec Terminal
* **Blocked by:** None.
* **Objective:** Open interactive `sh`/`bash` terminal directly into containers from the browser.
* **Scope:**
  - Docker Exec bidirectional WebSocket streaming endpoint.
  - Frontend `xterm.js` terminal integration.
  - "Open Terminal" button on container details view.
* **Acceptance Criteria:** Run commands (`ls`, `ps`) interactively via web terminal.

### Ticket 4.2 — System Prune (Images & Volumes)
* **Blocked by:** None.
* **Objective:** One-click cleanup of dangling images and unused volumes to reclaim host disk space.
* **Scope:**
  - Docker `/images/prune` and `/volumes/prune` API endpoints.
  - Containers page "System Cleanup" modal with confirmation and reclaimed byte reporting.
* **Acceptance Criteria:** Disk space reclaimed and reported in UI.

---

## Phase 5: Telemetry, Downsampling & Organization

### Ticket 5.1 — Metrics Downsampling (Hourly Rollups)
* **Blocked by:** None.
* **Objective:** Retain 1-year historical telemetry without database bloat by downsampling raw 15-second records past 7 days into hourly averages.
* **Scope:**
  - `system_metrics_hourly` rollup aggregation in `RetentionCleanupService`.
  - Query dispatcher to read from rollup table for ranges > 7 days.
* **Acceptance Criteria:** Smooth 30-day and 90-day charts without database size inflation.

### Ticket 5.2 — Tags & Category Grouping
* **Blocked by:** None.
* **Objective:** Group and filter services and containers by environment tags (e.g. `Prod`, `Staging`, `DB`).
* **Scope:**
  - `tags` column in `services` table.
  - Tag pills and filter bar in frontend dashboard.
