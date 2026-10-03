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

### Ticket 2.3 — HTTP Response Body (Keyword / Regex) Assertion [Completed]
* **Blocked by:** None.
* **Objective:** Verify response payload contents (keyword or Regex) even when endpoints return HTTP 200, strictly maintaining zero-allocation and a 64 KB memory cap.
* **Scope:**
  - SQLite migration `011_expected_body.sql` adding `expected_body` column to `services` and `service_overrides`.
  - Stream-based `HttpBodyValidator` utility leveraging `ArrayPool<byte>`, 64 KB scan cap, and 200ms ReDoS-safe Regex matching with keyword fallback.
  - Integration with `UptimeCheckerService` asynchronous probing and `/api/uptime/test-connection` endpoint.
  - UI options in `AdvancedCheckOptions.tsx`, `AddServiceModal.tsx`, and `EditServiceModal.tsx` for "Expected Response Content".
  - Full bilingual (TR & EN) localization and xUnit unit test suite (`HttpBodyValidatorTests.cs`).
* **Acceptance Criteria:** Service marked down when keyword or regex is missing; unit tests pass (184/184 tests passing).

---

## Phase 3: Notification Channels & Alert Discipline

### Ticket 3.1 — Email (SMTP) & Slack Channels ✅ (Completed)
* **Blocked by:** None.
* **Objective:** Enable standard ready-to-use SMTP email providers (Gmail, Outlook, Resend, Brevo, AWS SES, cPanel) and Slack Incoming Webhook channels with interactive recipient pill tagging and instant test delivery.
* **Scope:**
  - `NotificationService` built-in SMTP (`System.Net.Mail`, TLS, custom sender name, responsive dark HTML email template) and Slack Webhook (`attachments`, status color coding).
  - Native AOT source-generated JSON serialization (`CorvusJsonSerializerContext`).
  - Frontend interactive `EmailRecipientInput` (pill tags, regex validation, deduplication, bulk paste parsing).
  - Modular `SlackChannelPanel.tsx` and `EmailChannelPanel.tsx` components integrated into `NotificationSettingsTab.tsx`.
  - Comprehensive unit testing suite (190/190 passing tests).
* **Acceptance Criteria:** Test notifications successfully delivered to SMTP and Slack; clean frontend and backend builds.

### Ticket 3.2 — Flapping Suppression & Alert Debounce ✅ (Completed)
* **Blocked by:** None.
* **Objective:** Prevent notification floods and alert fatigue when network instability or crash-loops cause services to oscillate between UP and DOWN.
* **Scope:**
  - Decoupled `IFlappingDetector` and `FlappingDetector` service: Thread-safe sliding window timestamp tracking with zero unnecessary allocations.
  - Integration with `UptimeCheckerService`: Emits a single `[FLAPPING DETECTED]` warning when transitions cross the threshold and suppresses subsequent notifications.
  - Recovery threshold: Declares stability and emits a single `[FLAPPING RESOLVED]` alert after N consecutive checks in a stable state.
  - Multi-channel delivery via `NotificationService.DispatchFlappingAlertAsync` with status color coding (Amber / Green) across Discord, Telegram, Slack, SMTP, Ntfy, and Webhooks.
  - Settings UI controls with modular `FlappingProtectionCard.tsx` and `NotificationEventFilters.tsx` (threshold, window, recovery checks).
  - xUnit test suite (`FlappingDetectorTests.cs` and `NotificationServiceTests.cs`, 200/200 passing tests).
* **Acceptance Criteria:** Flapping simulation yields only initial alert, flapping warning, and final stable recovery notification; 200/200 tests passing.

---

## Phase 4: Advanced Docker & Container Operations

### Ticket 4.1 — Web Container Exec Terminal [COMPLETED]
* **Blocked by:** None.
* **Objective:** Open interactive `sh`/`bash` terminal directly into containers from the browser with unfrozen keyboard input and automatic shell detection.
* **Scope:**
  - Docker Exec API integration (POST `/containers/{id}/exec`, HTTP 1.1 Upgrade to `/exec/{id}/start`, and `/exec/{id}/resize`).
  - High-performance ASP.NET Core Native AOT WebSocket proxy endpoint `GET /api/containers/{id}/terminal` (zero-allocation with `ArrayPool<byte>`, 8 KB static buffer footprint, immediate garbage-free cleanup on disconnect).
  - Resolved Win32 pipe deadlocks caused by `FlushFileBuffers` on non-file named pipes.
  - Automatic fallback shell chain: `/bin/bash` -> `/bin/sh` -> `/bin/ash` -> `sh` with `TERM=xterm-256color`.
  - RBAC protection: Exec terminal restricted strictly to `admin` role (`[RequireAdmin]`, 403 Forbidden).
  - Modular frontend component `ContainerTerminalModal.tsx` built with `@xterm/xterm` & `@xterm/addon-fit` (VT100/ANSI rendering, fullscreen support, shell selector, real-time PTY resizing).
  - Action button in `ContainerActionButtons.tsx` (only enabled/visible for running containers and admin users).
* **Acceptance Criteria:** Run commands (`ls`, `ps`, `top`) interactively via web terminal; bidirectional typing and arrow keys work cleanly; unit tests pass (203/203 green tests).

### Ticket 4.2 — Safe Two-Stage Dry-Run System Prune [COMPLETED]
* **Blocked by:** None.
* **Objective:** Safe, audit-first cleanup of stopped containers, unused images, orphan networks, and unused volumes without accidental data loss.
* **Scope:**
  - First-stage dry-run audit via `GET /api/containers/system-df`: Returns estimated recoverable space, itemized list of stopped containers, unused images, volumes, and build cache.
  - Modular itemized audit tables: `PruneContainersTable.tsx`, `PruneImagesTable.tsx`, `PruneVolumesTable.tsx`, `PruneBuildCacheCard.tsx`.
  - Persistent volume safety: Volumes unselected by default with high-visibility data loss warning banner.
  - Selective cleanup API: Native AOT compliant `POST /api/containers/prune/selective` with `[RequireAdmin]` authorization filter.
  - Two-stage dialog in `SystemPruneModal.tsx` with live reclaimed space reporting.
* **Acceptance Criteria:** Reclaimed disk space accurately measured and reported in UI; volumes protected by default; selective deletion verified; unit test suite green (206/206 passing tests).

### Ticket 4.3 — Container Detail Inspection & Live Zero-Downtime Resource Tuning [COMPLETED]
* **Blocked by:** None.
* **Objective:** Inspect comprehensive container configuration and dynamically tune CPU, RAM, and restart policies without downtime.
* **Scope:**
  - Extended low-level inspect deserializer in `DockerModels.cs` and endpoint `GET /api/containers/{id}/inspect`.
  - Zero-downtime resource update endpoint `POST /api/containers/{id}/update` (updating `NanoCpus`, `Memory`, and `RestartPolicy` on the running container and evicting in-memory micro-cache).
  - Multi-tab orchestrator modal `ContainerDetailModal.tsx` in `pages/Containers/detail/`:
    - `ContainerOverviewTab.tsx`: ID, image digest, status, command line, quick actions toolbar.
    - `ContainerEnvTab.tsx`: Searchable env vars with secret masking toggle & bulk `.env` clipboard export.
    - `ContainerNetworkingTab.tsx`: Published port links (`http://`) and Docker network details.
    - `ContainerStorageTab.tsx`: Volume and bind mounts with RW/RO permissions.
    - `ContainerResourcesTab.tsx`: Live sliders and presets for CPU cores, RAM MB, and restart policy.
  - Clickable container names and quick-actions sliders button in `ContainerList.tsx` and `ComposeStackGroup.tsx`.
* **Acceptance Criteria:** Inspect and modify running container resources on-the-fly; verify secret masking; all tests green.

---

## Phase 5: Telemetry, Downsampling & Organization

### Ticket 5.1 — Metrics Downsampling (Hourly Rollups) [COMPLETED]
* **Blocked by:** None.
* **Objective:** Retain 1-year historical telemetry without database bloat by downsampling raw 15-second records past 7 days into hourly averages.
* **Scope:**
  - `system_metrics_hourly` rollup aggregation in `RetentionCleanupService` and `MetricsRepository`.
  - Migration `012_metrics_hourly_rollup.sql` creating indexed table with UNIQUE constraint on `recorded_at`.
  - Intelligent query dispatcher supporting `30d`, `90d`, and `1y` time ranges via SQLite CTEs seamlessly combining rollups with recent unaggregated metrics.
  - Automated dual retention policy: 7 days retention for high-frequency 15-second raw metrics and 365 days retention for hourly rollups.
  - Interactive UI range selectors (`30d`, `90d`, `1y`) with dynamic multi-day date-time formatting in `SystemMetricsPage`.
  - Comprehensive unit test suite (`MetricsRepositoryTests.cs`, 211/211 passing tests).
* **Acceptance Criteria:** Smooth 30-day, 90-day, and 1-year charts without database size inflation; all unit tests green (211/211 passing tests).

### Ticket 5.2 — Tags & Category Grouping [COMPLETED]
* **Blocked by:** None.
* **Objective:** Group and filter services and containers by environment tags (e.g. `Prod`, `Staging`, `DB`).
* **Scope:**
  - `tags` column in `services` and `service_overrides` tables (`013_service_tags.sql`).
  - Native AOT model support with `List<string> Tags` and dual-format JSON/CSV parsing.
  - Automatic tag extraction from container labels (`corvus.tags`, `environment`, `env`, `com.docker.compose.project`).
  - Container-level custom tags: `PUT /api/containers/{id}/tags`, `GET /api/containers/tags`, persisted to SQLite `service_overrides`.
  - Real-time Server-Sent Events broadcasting (`containers_updated`) on tag changes.
  - Modular `TagBadge`, `TagInput`, and `TagFilterBar` components (shared across Services and Containers pages).
  - Container tagging modal `ContainerTagsModal.tsx`.
  - Unit test suite (`ContainerTagsTests.cs`, 223/223 passing tests).
* **Acceptance Criteria:** Services and containers can be tagged and filtered dynamically; tag state is persistent across restarts and rediscovery; all unit tests pass (223/223).
