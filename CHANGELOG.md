# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.11] - 2026-10-16 — Dedicated Deployment Center, Deploy from Scratch Wizard & 502 Self-Preservation Guard

### Added
- **Dedicated Deployment Center Page (`/deployments`)**:
  - `src/Corvus.Web/src/pages/Deployments/`: Promoted deployments from container detail sub-tabs to a first-class, standalone navigation page accessible via the main sidebar and mobile bottom navigation with the `Rocket` icon.
  - `DeploymentsOverview.tsx`: Introduced 4 high-level KPI cards displaying Total Deployments, Success Rate percentage, Active/Queued count, and Average Deployment Duration.
  - `DeploymentsHistoryTable.tsx`: Added comprehensive audit trail table with multi-state filtering (`all`, `success`, `failed`, `pending`), real-time search across container names/images/IDs, duration tracking, and one-click log drawer inspection.
  - `NewDeploymentModal.tsx`: Built dual-tab deployment wizard:
    - **Tab 1: Deploy from Scratch (New Service)**: Direct deployment of unconfigured Docker images (`nginx:alpine`, `ghcr.io/...`, `redis:latest`) with customizable container names, host-to-container port bindings, multiline environment variables, and restart policies (`unless-stopped`, `always`, `on-failure`, `no`).
    - **Tab 2: Connect & Test Existing Containers**: Instant health inspection, internal IP resolution, exposed port validation, quick redeploy trigger, and CI/CD webhook setup.
- **Backend Scratch Container Deployment Engine**:
  - `IDeploymentEngine.cs` & `DeploymentEngine.cs`: Added `StartScratchDeploymentAsync` implementing fail-fast pre-pull validation, port/env parsing, container instantiation (`CreateContainerAsync`), startup verification (`StartContainerAsync`), and real-time ANSI log streaming.
  - `DeploymentsEndpoints.cs`: Exposed `POST /api/deployments/scratch` and `GET /api/deployments/containers/test-connection/{id}` (.RequireAdmin).

### Security & Stability
- **Self-Preservation Guard (502 Bad Gateway Prevention)**:
  - `DeploymentEngine.cs`: Added strict self-container detection (`IsSelfContainer`). Prevents users from attempting to stop/recreate Corvus's own container from inside the panel. Halting Corvus while serving requests caused instant process termination and upstream reverse proxy `502 Bad Gateway` errors. Informative guidance directs users to external CI/CD webhooks or docker compose.
- **Native AOT Contract Hardening**:
  - `CorvusJsonSerializerContext.cs`: Added `ScratchDeploymentRequest` and `ContainerConnectionTestResult` compile-time type definitions.

### Fixed
- **Scratch Deployment Orphan Container Cleanup on Failure**:
  - `DeploymentEngine.cs`: Added automatic container deletion (`DeleteContainerAsync`) when container startup fails due to port allocation collisions (`port is already allocated`) or unexpected crashes, preventing orphaned stopped containers.
  - Automatically detect and purge leftover `created` or `dead` containers on new deployment triggers, preventing "container already exists" blocking errors.
  - `NewDeploymentModal.tsx`, `tr.ts`, `en.ts`: Added format guidance (`HostPort:ContainerPort`, e.g. `3005:3001`) to help users avoid binding busy host ports.
- **Prevent Infinite SSE Reconnection & Log Pollution**:
  - `deployments.ts` & `useDeploymentStream.ts`: Once a deployment finishes (`success`, `failed`, or `rolled_back`), the browser's built-in `EventSource` auto-reconnect cycle is halted via `eventSource.close()`, permanently stopping duplicate log spam and terminal pollution.
- **Unintended Corvus Deployment Modal on Page Load**:
  - `useDeploymentStream.ts` & `useDeploymentsPageState.ts`: Fixed an issue where stale deployment records in `localStorage` would automatically trigger the live deployment progress modal for `corvus_web` on page mount. `getSavedActiveDeployment()` was hardened with Corvus self-preservation inspection, 10-minute maximum age timeout, and purging completed deployment entries.
- **Corvus Container Exclusion from Deployment Targets**:
  - `NewDeploymentModal.tsx`: Explicitly filtered out all Corvus internal containers (`corvus`, `corvus_web`, `corvus-api`, `corvus_db`) from existing container selection dropdowns. Added validation on scratch deployment forms to reject container names and images containing `corvus`.
- **Startup Sweep for Stale Deployments**:
  - `DeploymentRepository.cs` & `Program.cs`: Implemented `CleanupStaleDeploymentsAsync()` on server startup to mark orphaned or unfinished deployments (`pending`, `in_progress`, `pulling`, `recreating`, `healthcheck`) and Corvus self-deployments as failed, preventing stuck `Active / Queued` counters.
- **ObsidianUI Design System Alignment**:
  - Brought the `/deployments` page into full visual alignment with Corvus ObsidianUI specifications:
    - `index.tsx`: Rebuilt layout using `PageHeader` and `Button variant="cloud"`.
    - `DeploymentsOverview.tsx`: Replaced raw cards with `KpiRow`, `KpiCard` with `StatusDot` and `decimals={0}` formatting.
    - `DeploymentsHistoryTable.tsx`: Integrated `Card`, `CardHeader`, `CardTitle`, `SearchInput`, `FilterChip`, and `EmptyState`.
    - `NewDeploymentModal.tsx`: Migrated to standard `Modal` and tactile `Button` components for cohesive design language.
- **Navigation & Routing Synchronization**:
  - `useAppNavigation.ts` & `AppRouter.tsx`: Registered `deployments` in `VALID_PAGES`, ensuring direct navigation to `/deployments` loads seamlessly without redirecting to `/systems`.
  - Synchronized dual-language translation dictionaries across `tr.ts` and `en.ts`.

---

## [1.6.10] - 2026-10-16 — Native AOT Deployment Center, Zero-Downtime Safe Rollback & Synchronous CI/CD Inbound Webhook

### Added
- **Native AOT Container Deployment Center (Self-Hosted PaaS Engine)**:
  - `019_deployments_sqlite.sql` & `DeploymentRepository.cs`: Introduced persistent `deployments` SQLite schema and Dapper.AOT repository indexing deployment target, trigger types (`manual_ui`, `webhook_github`, `scheduled`), status (`pending`, `in_progress`, `success`, `failed`, `rolled_back`), execution steps, image digest diffs, duration in ms, and ANSI log outputs.
  - `DeploymentEngine.cs`: High-performance background deployment executor featuring dual-path buffering — streaming real-time Docker pull layer progress directly to SSE subscribers via `IEventBroadcaster` in RAM (<1ms) while batching writes to SQLite to eliminate WAL database locks (`SQLITE_BUSY`).
  - `DeploymentLockManager.cs`: Container-level fine-grained asynchronous keyed locking (`ConcurrentDictionary<string, SemaphoreSlim>`). Rejects concurrent duplicate deployment triggers with fail-fast `409 Conflict`, stopping race conditions and duplicate container operations.
  - `DeploymentsEndpoints.cs`: Added minimal API routes `/api/containers/{id}/deploy` (202 Accepted trigger), `/api/deployments` (filtered history list), `/api/deployments/{id}` (execution details & accumulated logs), and `/api/deployments/{id}/stream` (real-time SSE stream).
- **Synchronous CI/CD Webhook & Global Pipeline Status (`&wait=true`)**:
  - `DeployWebhookEndpoints.cs`: Extended `POST /api/hooks/deploy/{token}` with `&wait=true` parameter. Keeps HTTP connection open until deployment passes health checks (returning HTTP 200) or fails/rolls back (returning HTTP 500), enabling GitHub Actions / GitLab CI pipelines to accurately reflect pass/fail status without external tooling.
  - Broadcasts `deployment_started` global WebSocket events to active web sessions, showing floating toast notifications with direct links to live progress modals.
- **Vercel-Grade Modular Frontend Deployment Center**:
  - `DeploymentStepper.tsx`: 5-phase discrete visual progress stepper (`Queued` ➔ `Pulling` ➔ `Recreating` ➔ `Healthcheck` ➔ `Live` / `Rolled Back`) with real-time step timers.
  - `DeploymentTerminalLog.tsx`: High-contrast dark ANSI terminal console with regex log search, auto-scroll lock, one-click clipboard copy, and clean clearing.
  - `DeploymentProgressModal.tsx`: Accessible dialog shell with ESC listener, focus-trap, and background minimize pill. Recovers active deployments from `localStorage` on page refresh/F5 with zero log loss.
  - `DeploymentsTable.tsx` & `ContainerDeploymentsTab.tsx`: Audit trail table displaying status badges, trigger sources, duration, old vs new image digests, and log drawer inspection.
  - `DeployWebhookWizardModal.tsx`: Zero-friction CI/CD onboarding modal generating secure deployment tokens and ready-to-use GitHub Actions workflow YAML snippets.
  - `ansi.ts`: Safe HTML span parser and ANSI escape code sanitizer with zero dependencies.

### Security
- **Fail-Fast Pre-Pull Hard Gate (Zero-Downtime Guarantee)**:
  - `DockerService.cs` & `DockerImageClient.cs`: Enforced pre-flight validation on remote image pulls. If the remote registry returns 401 Unauthorized, 404 Not Found, or times out, the running container is **never stopped or renamed**, preserving 100% production uptime without unnecessary downtime.
- **Deterministic Nano-Unique Rollback**:
  - Renamed backup containers to `${originalName}_corvus_backup_${timestamp}_${guid}` to eliminate name collision vulnerabilities on rapid successive deployments.
  - Guaranteed atomic rollback ordering: terminate and delete failed container, verify name liberation, rename backup container back to original, and restart.
- **Native AOT Compile-Time Event Serialization**:
  - `CorvusJsonSerializerContext.cs`: Registered strongly-typed deployment event records (`DeploymentTriggerResponse`, `DeploymentStepChangedEventPayload`, `DeploymentLogChunkEventPayload`, `DeploymentCompletedEventPayload`, `DeploymentStartedGlobalPayload`, `DeploymentErrorResponse`) preventing reflection runtime crashes in .NET 9 Native AOT.

### Fixed
- **Container Row Quick Actions Integration**:
  - `ContainerRow.tsx` & `ContainerActionSheet.tsx`: Connected "Deploy" button and GitHub Actions wizard seamlessly with container state without layout shifting.
- **i18n Dual-Language Synchronization**:
  - Synchronized comprehensive `deployments` translation keys across `tr.ts` and `en.ts` with zero hardcoded UI strings.

---

## [1.6.9] - 2026-10-16 — Security Hardening, Real-time Telemetry, Concurrency Locks & Services Native AOT Resolution

### Security
- **Open Registration & Privilege Escalation Mitigation (CWE-269 / CWE-284)**:
  - `AuthService.cs` & `AuthEndpoints.cs`: Initial setup creates the first user as an `admin` and immediately closes open registration (`registration_enabled = false`). When users exist and registration is disabled, registration attempts return `403 Forbidden`. When registration is explicitly re-enabled by an admin, newly registered accounts receive the least-privilege `viewer` role by default. Added IP rate limiting on `/api/auth/register`.
- **System Secret & Deploy Token Masking (CWE-200)**:
  - `SettingsEndpoints.cs`: Locked `GET /api/settings` with `.RequireAdmin()`. Masked sensitive secrets (`smtp_pass`, `notification_telegram_bot_token`, Discord/Slack webhook URLs, and `deploy_webhook_token`) as `******`. Prevented overwriting actual stored values with mask placeholders on `PUT`.
  - Added a dedicated `/api/settings/public` (.AllowViewer) endpoint for non-sensitive frontend preferences (`system_language`, `theme`, `refresh_interval`).
- **SSRF & DNS Rebinding Protection (CWE-918)**:
  - `SsrfGuard.cs`: Introduced centralized IP and host validator blocking IPv4 link-local (`169.254.0.0/16`), Cloud Metadata (`169.254.169.254`, `metadata.google.internal`), IPv6 link-local (`fe80::/10`), and `0.0.0.0/8`. Enforced DNS resolution checks to foil `nip.io` / `sslip.io` DNS rebinding attempts.
  - `NotificationClient` & `NotificationSecurity.cs`: Configured notification HTTP handlers with `AllowAutoRedirect = false` to prevent 302 redirects into internal infrastructure. Secured Uptime test connection endpoints with `SsrfGuard`.
- **Agent Path Traversal & Docker Socket CRLF Defense (CWE-22 / CWE-93)**:
  - `AgentDockerClient.cs`: Enforced strict regex constraints on `projectName` and `containerId`. Verified stack working paths stay anchored within the base `stacks/` directory via `Path.GetFullPath`. Guarded Docker Unix domain socket HTTP calls against CRLF injection and URL-encoded container identifiers via `Uri.EscapeDataString`.
- **RBAC Role Sıkılaştırması (CWE-862)**:
  - `ComposeEndpoints.cs`: Required admin permissions (`.RequireAdmin()`) for reading, saving, and deploying Docker Compose configurations.
  - `ContainersEndpoints.cs`: Locked container recreate (`/recreate`) actions to admin users. Masked container environment variables (`KEY=******`) in `/inspect` responses for `viewer` accounts.
  - `PushEndpoints.cs`: Enforced admin authorization for push monitor management. Rejected unrecognized push tokens at `/api/push/{token}` with immediate `404 Not Found` without touching the database to stop disk DoS attacks.
  - Registered strongly-typed `PushReceivedEventPayload` and `ContainerTagsUpdatedEventPayload` in `CorvusJsonSerializerContext` for Native AOT safe JSON serialization without string interpolation vulnerabilities.

### Fixed
- **Services Endpoint HTTP 500 Resolution (Native AOT Safe Data Reader)**:
  - `ServicesRepository.cs`: Resolved `PlatformNotSupportedException: Dynamic code generation is not supported on this platform` when querying `/api/services`. Dynamic SQL string interpolation prevented Dapper.AOT source generator from intercepting queries, causing a runtime fallback to `Reflection.Emit` which is disallowed in Native AOT. Migrated `GetAllAsync`, `GetPublicServicesAsync`, `GetByIdAsync`, and `GetAllContainerTagsAsync` to direct, zero-allocation `DbDataReader` mapping (`MapReaderToService`), ensuring 100% Native AOT compatibility and eliminating runtime reflection errors.
- **Dependency Injection Lifetime Validation**:
  - `Program.cs`: Fixed startup failure `Cannot consume scoped service 'IUserRepository' from singleton 'IAuthService'`. Aligned service lifetimes by registering `IAuthService` and `CorvusAuthFilter` as `Scoped` to match the scoped lifetime of database repositories.
- **NotificationService Constructor Disambiguation**:
  - `NotificationService.cs` & `Program.cs`: Fixed DI activation error `Unable to activate type 'NotificationService'. The following constructors are ambiguous`. Marked the primary production constructor with `[ActivatorUtilitiesConstructor]` and provided an explicit factory resolver in DI registration.
- **Frontend Modular Decomposition & Clean Architecture (`GEMINI.md`)**:
  - `App.tsx`: Extracted `lazyWithRetry` to `utils/lazyWithRetry.ts` and `ChunkErrorBoundary` to `components/common/ChunkErrorBoundary.tsx`, significantly reducing top-level complexity.
  - `SystemdUnitsTab.tsx`: Extracted monolithic inline dialogs into standalone components (`SystemdLogsModal.tsx` and `SystemdConfirmModal.tsx`).
  - `EnableUptimeModal.tsx`: Extracted inline URL port extraction logic to `utils/url.ts`.
  - `ContainerRow.tsx`: Sanitized third-party software references, replacing with standard engineering nomenclature (`Inline Quick Actions`).
- **Real Data Discipline & Null-Safety Guardrails (`GEMINI.md`)**:
  - `ContainerResourcesTab.tsx`: Replaced misleading `0.0%` / `0 B (0%)` fallback representations with clean dashes (`-`) when telemetry is pending or container is offline.
  - Standardized hardcoded hex color codes to semantic ObsidianUI tokens (`var(--text-primary)`, `var(--text-secondary)`, `var(--border-subtle)`).
- **Dual-Language Internationalization (i18n Synchronization)**:
  - Added 20+ strongly-typed translation keys across `tr.ts` and `en.ts`, migrating all hardcoded UI strings in `ContainerResourcesTab`, `SystemPruneModal`, `ComposeConfigModal`, `LogsTab`, and `ContainerDetail` to `t(...)` hooks.
- **Agent Telemetry & Real-Time CPU Delta Math**:
  - `SystemMetricCollector.cs` (Agent): Replaced inaccurate boot cumulative average with delta calculation (`deltaBusy / deltaTotal`) between measurement intervals (incorporating `iowait`, `irq`, `softirq`, `steal`).
  - Purged all fake fallback figures (`5.0f`, `4GB RAM`, `100GB Disk`, `0.1 loadavg`), returning standard `0.0f` and `0` when unsupported.
  - `SystemMetricsCollector.cs` (API): Replaced static `0.1f` load average with `/proc/loadavg` and hooked real-time `/proc/net/dev` for accurate Rx/Tx bytes/sec rates.
- **WebSocket Concurrency & Socket Contention Locks**:
  - `AgentTunnelClient.cs` & `SystemTunnelManager.cs`: Guarded `WebSocket.SendAsync` calls behind `SemaphoreSlim(1, 1)` locks, resolving socket contention race conditions between periodic telemetry pings and incoming RPC command dispatches.
- **Docker HTTP Chunked Decoder & Multiplexed Stream Demuxer**:
  - `AgentDockerClient.cs`: Added robust `Transfer-Encoding: chunked` framing parser and enforced `Connection: close`. Implemented 8-byte multiplexed stream header demuxer (`[stream_type, size...]`) to clean corrupted binary headers from container logs in the UI.
- **Multi-Node Service & Container Isolation**:
  - `ServicesRepository.cs`: Added `system_id` parameter and isolation checks to `SyncDockerBatchAsync` queries to prevent cross-node service overwrites.
  - `SystemRepository.cs`: Evicted deleted containers from `system_containers_cache` in `UpsertContainersCacheAsync` (`DELETE ... WHERE container_id NOT IN @ActiveIds`).
- **Audit Log Actor Attribution**:
  - `CorvusAuthFilter.cs` & `ContainersEndpoints.cs`: Injected authenticated `ClaimsPrincipal` on `HttpContext.User`, resolving the issue where container actions were consistently attributed to `"admin"` in logs.
- **Async Scope Lifetime Safeguard**:
  - `AuthService.cs` & `ContainerDiscoveryService.cs`: Properly awaited background database tasks to prevent DbContext and DI scope disposal races.

---

## [1.6.8] - 2026-10-15 — Fleet-Wide Services, Uptime & Activity Log Node Isolation & Sidebar Hierarchy Refactor

### Fixed
- **Sidebar Hierarchy Separation (Management & Global Scope)**:
  - `Sidebar.tsx`: Extracted `Settings` out of the node-scoped navigation list into a dedicated `Management (Yönetim)` section at the bottom of the sidebar. Prevents confusion between node-level resources (Containers, Services, Metrics, Uptime, Activity) and global system-wide administration (Users, Notifications, Database Backups, Global Settings).
- **Services Node Isolation & System Scope**:
  - `018_services_and_activity_system_scope_sqlite.sql` & `018_services_and_activity_system_scope_postgres.sql`: Added `system_id` column with index to `services` and `activity_logs` tables (defaulting to `'local-host'`).
  - `ServicesRepository.cs`: Updated `ServiceDbRow` to class mapping with parameterless constructor for seamless Dapper type coercion, mapped `SystemId`, and added `systemId` filtering in `GetAllAsync`.
  - `ServicesEndpoints.cs`: Partitioned `GET /api/services` and `POST /api/services` using `X-System-Id` header and query parameter, isolating services between Host and edge nodes.
- **Uptime Monitoring Node Scope Synchronization**:
  - `Uptime/index.tsx`: Bound `corvus_active_system_changed` event listener to re-fetch and re-sync services when switching nodes. Added contextual node status badge in the Uptime page header.
- **Activity & Audit Log Scope Filtering (Active Node vs All Fleet)**:
  - `ActivityLogEndpoints.cs` & `ActivityLogRepository.cs`: Added `systemId` filtering support across audit records.
  - `ActivityTimeline/index.tsx` & `ActivityTimelineFilter.tsx`: Added an interactive scope switch (`[ Active Node | All Fleet ]`) allowing operators to inspect either node-specific actions or fleet-wide activity.
  - Synchronized type-safe i18n keys for Activity Timeline in both `en.ts` and `tr.ts`.
- **Test Coverage & Flakiness Prevention**:
  - Added node isolation tests `ServicesRepository_SystemId_Isolation_WorksCorrectly` and `GetPagedAsync_WithSystemId_FiltersCorrectly` (294/294 tests passing).
  - Fixed a flaky midnight boundary condition in `UptimeRepository_SmartRetentionAndRollup_WorksCorrectly` where executing tests near 23:40 UTC rolled over into the next calendar day, normalizing timestamps to midday.

---

## [1.6.7] - 2026-10-15 — ObsidianUI Standardization for System Management Modals & Node Scope Isolation

### Fixed
- **Node Scope Isolation & Multi-Node Partitioning**:
  - `DashboardEndpoints.cs`: Enhanced `/api/dashboard/summary` to respect the `X-System-Id` request header. When inspecting an edge node (e.g. `Deneme`), metrics and container counts are pulled from `ITelemetryRingBuffer` instead of falling back to the local host Docker daemon.
  - Per-System Concurrency-Safe Caching: Migrated from a single static cache entry to a thread-safe `ConcurrentDictionary<string, ...>` cache keyed by `systemId`, preventing telemetry pollution between host and edge nodes.
  - `ContainersEndpoints.cs`: Partitioned `GET /api/containers` and `/stats-summary` with `X-System-Id` filtering. Containers page now cleanly displays edge node containers for remote hosts. Container lifecycle operations (`restart`, `start`, `stop`, `pause`, `unpause`) are routed through `ISystemTunnelManager` via WebSocket JSON-RPC.
  - Frontend Synchronous Reactivity: Hooked `corvus_active_system_changed` event listeners in `Dashboard` and `Containers` pages, automatically reloading scoped data on node switch and rendering contextual node badges in headers.
- **Containers Screen Crash Fix & Remote Schema Mapping**:
  - `ContainersEndpoints.cs`: Resolved UI freeze and render exceptions on edge nodes (`TypeError: undefined.replace / undefined.toLowerCase / undefined.slice`) by strictly mapping `SystemContainerCacheEntity` to full `DockerContainerInfo` schema (`Id`, `Names`, `Image`, `State`, `Status`, `Ports`, `Labels`, `Tags`).
  - Edge Node Container Stats: Populated `GET /api/containers/stats-summary` and `GET /{id}/stats` for remote systems directly from live edge cache, showing real-time CPU% and RAM usage for remote containers.
  - Remote Container Logs via JSON-RPC: Wired `GET /api/containers/{id}/logs` to request remote logs through `ISystemTunnelManager` WebSocket RPC.
  - Bulletproof Frontend Null-Safety: Reinforced `useContainersPageState.ts`, `ContainerRow.tsx`, `ContainersStats.tsx`, and `Containers/index.tsx` with defensive property checks across name, id, state, image, and labels.
- **Fleet-Wide Multi-Node Scope Propagation Across All Views**:
  - `MetricsEndpoints.cs`: Partitioned `/api/metrics/system`, `/api/metrics/latest`, and live SSE `/api/metrics/stream` with `X-System-Id` and `systemId` query parameters, streaming real-time downsampled metrics for any active edge node.
  - `SystemMetrics/index.tsx`: Bound `corvus_active_system_changed` listener, added contextual system scope badge, and routed SSE connection to the active system.
  - `Services`: Scoped `ServicesHeader` with active node badge and propagated `selectedSystemId` into `SystemdUnitsTab`.
  - `ActivityTimeline`: Bound active node badge and dynamic reload on system change.
- **Disk Free Space Float Precision**:
  - `DashboardKpis.tsx`: Fixed IEEE 754 float precision glitch (`939.6999999999999 GB Free`) using `parseFloat(...toFixed(1))` to output clean `939.7 GB`.
- **Agent Host Disk Detection**:
  - `SystemMetricCollector.cs`: Improved disk detection logic to prioritize `/host` mount points and largest physical drives when running inside containerized environments.
- **Purge Legacy Styling and Standardize System Modals**:
  - `AddSystemSheet.tsx`: Refactored to ObsidianUI `Modal` and tactile `Button` components, removing legacy `#1b1d2a` / `#eceef6` hardcoded color palettes. Setup steps, status badges, and code blocks now strictly use standard tokens (`var(--bg-card)`, `input w-full`, etc.).
  - `EditSystemModal.tsx`: Replaced bespoke popup wrapper with standard `Modal`, removing custom inline styles.
  - `DeleteSystemModal.tsx`: Refactored with standard `Modal` and danger-variant `Button` with built-in loading spinners.
  - Replaced hardcoded text in all system dialogs with type-safe i18n keys synchronized across `en.ts` and `tr.ts`.

---

## [1.6.6] - 2026-10-14 — CodeQL Security Hardening & Command Injection Protection

### Fixed
- **Uncontrolled Command Line Hardening (CWE-78 / CWE-88)**:
  - Migrated `SystemdServiceClient` and `AgentDockerClient` process spawning (`systemctl` and `journalctl`) from string concatenation via `ProcessStartInfo.Arguments` to strongly-typed `ProcessStartInfo.ArgumentList`. Each argument is passed as an isolated token directly to the OS kernel without shell expansion or delimiter injection risks.
  - Hardened Docker Compose execution in `ComposeFileService` using `ArgumentList.Add(...)` instead of concatenated argument strings.
- **Log Injection / Forging Sanitization (CWE-117)**:
  - Sanitized tainted parameters across all logging sinks using `SecuritySanitizer.SanitizeLog(...)` to strip carriage return (`\r`) and newline (`\n`) characters:
    - `SystemdServiceClient`: Sanitized `{Unit}` and `{Action}` parameters in error logs.
    - `DockerContainerClient`: Sanitized `{ContainerId}` parameter in `GetContainerLogsAsync` error logging.
    - `DockerService`: Sanitized `{Image}`, `{Name}`, `{NewId}`, and `{OldId}` parameters during container recreate and rollback flows.
    - `ContainersEndpoints`: Sanitized `{Origin}` and `{Host}` parameters in WebSocket CSWSH security violation alerts.
    - `SystemTunnelManager`: Sanitized `{SystemId}` in tunnel connection and disconnection event logging.

---

## [1.6.5] - 2026-10-14 — Persistent Collapsible Node Tree, Progressive Dashboard Loading, CSP & Real Data Discipline

### Added
- **Contextual Collapsible Node Tree & Persistent Corvus Shell**:
  - Eliminated `isNavStandalone` layout condition in `AppLayout.tsx`. The Corvus brand logo, shell frame, and left sidebar now permanently persist across all application views including the full Systems fleet view.
  - Redesigned `Sidebar.tsx` to feature a dual-tier navigation model:
    - Dedicated "Fleet Overview" (`Server` Lucide SVG) at the top level for instant fleet switching.
    - Contextual active node scope section displaying live node status, active system name, quick switcher, and child navigation (Dashboard, Services, Containers, Metrics, Uptime, Activity, Settings).
  - Integrated full Systems navigation into mobile `BottomNav.tsx` with dedicated Lucide `Server` icon.
  - Ensured zero emojis across all navigation elements, strictly adopting Lucide React SVG icons and Obsidian UI typography.

### Fixed
- **Content Security Policy (CSP) Google Fonts Directive**:
  - Updated CSP headers in `src/Corvus.Api/Program.cs` to explicitly permit `https://fonts.googleapis.com` under `style-src` and `https://fonts.gstatic.com` under `font-src` and `connect-src`, resolving stylesheet blockages on application launch.
- **Alert Rules HTTP 500 & Native AOT Serialization Failure**:
  - Materialized query rows in `AlertRuleRepository.GetAllRulesAsync()` and `GetEnabledRulesAsync()` with `.ToList()` returning `Task<List<AlertRule>>` instead of unregistered compiler LINQ iterator types.
  - Registered `IEnumerable<AlertRule>` and `AlertRule[]` in `CorvusJsonSerializerContext` to safeguard source-generated Native AOT compilation.
  - Replaced ad-hoc anonymous response objects in `AlertRulesEndpoints.cs` with standard `GenericApiResponse` and chained `.RequireAdmin()` route extensions.
- **Strict Real Data Discipline & Null-Safety Guardrails**:
  - In `DashboardKpis.tsx`, eliminated dummy default values (calculating with 0% or fake GB when metrics are absent). When metrics are pending or unavailable, displays clean `-` indicators.
  - In `TopResourcesCard.tsx`, fixed falsy check on `item.cpuPercent` and `item.ramPercent` so `0.0%` is accurately displayed as `0.0%` rather than being converted to `-`.
  - In `RecentEventsCard.tsx`, replaced synthetic mock container events with real telemetry activity logs from `activityLogsApi.getActivityLogs()`.
  - In `SystemsTable.tsx`, corrected `loadAvg5m` and `loadAvg15m` null fallbacks to display `-` instead of deceptive `'0.00'`.
  - In `SystemsColumnsMenu.tsx`, pruned unsupported phantom columns (GPU, Wi-Fi, Battery, Temperature, Updates) that have no backend telemetry points.
  - In `Systems/index.tsx`, synchronized `corvus_active_system_name` in localStorage on server selection, eliminating hardcoded `'homelab-01'` fallback.

### Performance
- **Dashboard Progressive Loading & Render Decoupling**:
  - Decoupled the heavy, single-shot `/api/containers/stats-summary` Docker polling from the primary `DashboardPage` load stream. Critical overview KPIs, status banner, services, and container lists render immediately (~100ms) without waiting for kernel-level CPU/RAM delta evaluations.
  - Added 1500ms debounce protection to SSE `corvus_event` listener on the dashboard to eliminate cascading refetch storms.
- **Backend Summary Query Parallelization & In-Memory Role Cache**:
  - Converted the sequential query waterfall in `DashboardEndpoints.cs` to parallel execution using `Task.WhenAll`, reducing dashboard summary latency.
  - Extended dashboard summary cache duration from 2.5s to 15s.
  - Introduced an in-memory 30-second TTL `RoleCache` in `AuthService.cs`, eliminating redundant SQLite database lookups for user roles on every authenticated HTTP request.

### Internationalization
- Synchronized typed translation dictionaries across `tr.ts` and `en.ts` for all newly introduced fleet, node scope, and dashboard resource metric keys.

## [1.6.4] - 2026-10-14 — Automated Semantic Versioning & UI Clutter Elimination

### Added
- **Automated Semantic Tagging & Release Pipeline**:
  - Restored automated semantic version bump action in `.github/workflows/ci.yml`. Any commit pushed to `main` with `fix:` or `feat:` automatically bumps the patch version, creates the git tag (e.g. `v1.6.4`), extracts changelog release notes, publishes the GitHub Release, and builds versioned Docker images for both Corvus Hub and Agent.
  - Eliminated hardcoded version strings across frontend components; Vite dynamically injects `__APP_VERSION__` extracted from `CHANGELOG.md` or build arguments, while `UpdateCheckerService` resolves development versions directly from changelog files.

### Removed
- **Redundant Telemetry Sync Badge in Overview Header**:
  - Removed the unnecessary "Canlı Telemetri · 100ms Senkron" / "Live Telemetry · 100ms Sync" badge from `DashboardHeader.tsx`, streamlining the page header and eliminating arbitrary millisecond sync claims in accordance with true data integrity rules.

## [1.6.3] - 2026-10-14 — UI/UX Modernization, Obsidian Modal Standardization & Layout Refinements

### Added
- **Obsidian Modal Standardization**:
  - Migrated 10 legacy modal dialogs across the application (`AddServiceModal`, `EditServiceModal`, `ContainerDetailModal`, `ContainerTagsModal`, `SystemPruneModal`, `AddUserModal`, `AddAlertRuleModal`, `AddSnitchModal`, `DisableUptimeDialog`, `EnableUptimeModal`, `AddIncidentModal`, `RegistrationPromptModal`) to the centralized, accessible `<Modal>` component with backdrop blur, keyboard navigation, and consistent focus traps.
- **Interactive Action Feedback**:
  - Added instant bottom-right Toast notification on manual telemetry and dashboard refresh (`toast.success`).
- **Profile Navigation & Layout Integration**:
  - Restored standard AppLayout sidebar and mobile bottom navigation on the Profile page, eliminating the user navigation trap and adding a breadcrumb back-link to Dashboard.
- **Repository Version & Release Link in Sidebar**:
  - Upgraded the sidebar version indicator to an interactive GitHub repository link displaying the current version badge alongside the official GitHub SVG icon.

### Fixed
- **Settings Card Flush Padding & Alignment**:
  - Resolved border-flush layout clipping across Settings tabs (`GeneralSettingsTab`, `BackupSettingsTab`, `NotificationSettingsTab`, `UsersTab`, `AlertRulesTab`) by applying standard `p-5 sm:p-7` card padding and clean max-width containment (`max-w-5xl`).
- **Sidebar Typography, Active Pill Contrast & Logo**:
  - Restored high-fidelity transparent brand logo (`/logo_transparent.png`) in the sidebar header.
  - Fixed active pill vertical alignment (`top: 0`) and subtle border contrast (`rgba(255, 255, 255, 0.08)`) with primary text color rendering.
- **Internationalization (i18n) & Hardcoded Text Elimination**:
  - Fully synchronized `en.ts` and `tr.ts` dictionary schemas with type-safe `TranslationDictionary` coverage across alerts, incidents, settings, containers, and services.

### Removed
- **Eliminated Fake/Dummy Telemetry Metrics**:
  - Removed static hardcoded `memoryUsageMb={28}` badge, artificial 22-bar mock latency chart (`Array(22).fill`), and dummy 42ms/480ms ping metrics from service cards and dashboard headers in strict adherence to true data integrity.
- **Redundant & Duplicate UI Buttons**:
  - Cleaned up duplicate refresh and status buttons across Dashboard and Container Detail headers.
- **Purged Orphaned Legacy Code**:
  - Deleted 5 unreferenced dead files in `src/Corvus.Web/src/pages/Systems/` (`SystemRow.tsx`, `SystemsFilterBar.tsx`, `SystemsKpis.tsx`, `SystemsNavbar.tsx`, `SystemDetailModal.tsx`).

## [1.6.2] - 2026-10-14 — Security Hardening, Zero-Alloc Native AOT & Lightweight SVG Charts

### Fixed
- **WebSocket Terminal CSWSH Protection**:
  - Enforced strict `Request.Headers.Origin` validation against `Request.Host` during WebSocket upgrade handshakes in `ContainersEndpoints.cs` (`/{id}/terminal`), blocking Cross-Site WebSocket Hijacking attacks with `403 Forbidden`.
- **Query String Session Token Leakage & Bearer Auth**:
  - Restricted URL `?token=` query parameter validation in `CorvusAuthFilter.cs` exclusively to streaming endpoints (`/terminal`, `/stream`, `/tunnel`) where browser clients cannot inject custom headers.
  - Blocked query string token transmission on standard REST endpoints, eliminating session token leakage into proxy logs, browser history, and `Referer` headers.
  - Added full support for standard RFC 6750 `Authorization: Bearer <token>` authentication headers.
- **Concurrent Database Backup DoS Guard**:
  - Protected `GET /api/backup/download` SQLite `VACUUM INTO` execution with a concurrency lock (`SemaphoreSlim(1, 1)`), preventing disk saturation, process freezing, and database contention from concurrent requests.
- **Container Privilege Escalation Hardening**:
  - Added `security_opt: ["no-new-privileges:true"]` to `docker-compose.yml` to prevent privilege escalation via setuid/setgid binaries inside running containers.
- **Global HTTP Security Headers Middleware**:
  - Added lightweight security headers middleware in `Program.cs` injecting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, and `Content-Security-Policy` across all HTTP responses.

### Performance
- **Eliminated `recharts` Dependency & Ultra-Lightweight Native SVG Charts**:
  - Replaced the heavy `recharts` charting library with a custom, zero-dependency ObsidianUI SVG chart component (`ObsidianAreaChart.tsx`) across CPU, RAM, and Container historical metrics.
  - Removed 39 npm dependencies and reduced client bundle size by ~353 kB uncompressed (~102 kB gzipped) while adding smooth cursor scrubbing and interactive peak inspection.
- **Zero-Allocation JSON Parsing in Agent Tunnel**:
  - Replaced 64 KB heap buffer allocations and UTF-8 string conversions per telemetry ping in `AgentTunnelEndpoints.cs` with rented buffers (`ArrayPool<byte>.Shared`) and span-based zero-allocation deserialization (`JsonSerializer.Deserialize(ReadOnlySpan<byte>, ...)`).
- **Asynchronous Terminal Socket Pump & Background Session Purging**:
  - Removed unnecessary `Task.Run` ThreadPool dispatch wrappers in `ContainersEndpoints.cs` terminal loops (`PumpDockerToWsAsync`, `PumpWsToDockerAsync`) in favor of direct async execution with `Task.WhenAny`.
  - In `AuthService.cs`, eliminated fire-and-forget `Task.Run` session persistence, and wired periodic in-memory and database expired session cleanup into `MetricsRetentionWorker`.

## [1.6.1] - 2026-10-14 — ObsidianUI Shell, Sidebar & Navbar Layout Fix

### Fixed
- **ObsidianUI Core Shell, Sidebar & Navbar Layout Fix**:
  - Added missing ObsidianUI shell and navigation stylesheet classes into `src/Corvus.Web/src/index.css`: `.shell`, `.sidebar`, `.sidebar-resizer`, `.sidebar-top`, `.brand-row`, `.brand`, `.brand-mark`, `.system-selector`, `.cmd-trigger`, `.kbd`, `.nav-list`, `.nav-hover-pill`, `.nav-active-pill`, `.nav-btn`, `.nav-btn-left`, `.sidebar-footer`, `.footer-link`, `.version-row`, `.workspace`, `.header`, `.header-left`, `.page-title`, `.header-context`, `.header-actions`, and `.page-body`.
  - Resolved visual layout degradation on production deployments where Navbar and Sidebar overlapped and unstyled menu buttons clustered.
  - Added responsive layout breakpoint rules (`@media (max-width: 1023px)`) ensuring clean layout coexistence with the mobile bottom navigation bar.

## [1.6.0] - 2026-10-14 — Multi-Node Systems Cockpit, Edge Agent, RBAC, Visual Compose & Systemd Management

### Added
- **Comprehensive Architecture & Specification Documentation Sync**:
  - Fully updated and synchronized `docs/architecture.md`, `docs/architecture.tr.md`, `docs/specification.md`, `docs/specification.tr.md`, `README.md`, and `README.tr.md` in both English and Turkish for v1.6.0.
  - Documented Multi-Node Edge Agent, 3-tier RBAC (`admin`, `operator`, `viewer`), Linux Systemd unit management, Visual Compose & .env Editor, unmanaged 128-byte struct ring buffer, and 320 automated tests (291 backend + 29 frontend).
- **SSE Telemetry Streaming & 100ms Live Sync**:
  - Replaced browser HTTP polling with real-time Server-Sent Events (`GET /api/v1/systems/{id}/stream` and `/api/v1/metrics/stream`).
  - Added `useSystemMetricsStream` hook with exponential backoff and fallback capability.
- **Graceful Shutdown & Zero-Loss RAM Flush**:
  - Implemented application stopping lifetime hook in `MetricsBatchFlusherBackgroundService` to flush all uncommitted RAM telemetry points directly to disk on `SIGTERM`.
- **Role-Based Access Control (RBAC) & Viewer Role**:
  - Added database migrations `017_users_rbac_sqlite.sql` and `017_users_rbac_postgres.sql` introducing `role` column (`admin`, `operator`, `viewer`).
  - Enforced `CorvusAuthFilter` blocking mutating endpoints (`POST`, `PUT`, `DELETE`) for viewer accounts (`403 Forbidden`).
  - Added `UsersTab.tsx` user and role management interface with modal and safe state updates.
- **Visual Compose & .env Editor**:
  - Implemented `PUT /api/v1/compose/{stackName}` with lexical TAB character detection and automatic `.bak` backup creation.
  - Implemented `POST /api/v1/compose/{stackName}/deploy` executing `docker compose up -d` with streamed execution output.
  - Enhanced `ComposeConfigModal.tsx` with side-by-side YAML and .env tabs and inline feedback buttons.
- **One-Click Image Update (Pull & Recreate)**:
  - Integrated OCI registry digest comparison with container state discovery.
  - Implemented `POST /api/v1/containers/{id}/recreate` preserving host configs, mounts, and network settings with automatic rollback on failure.
  - Added matte amber "Update Available" badges and instant recreate action in Containers UI.
- **Systemd Service & Process Management**:
  - Created `ISystemdServiceClient` & `SystemdServiceClient` with strict command injection protection (`^[a-zA-Z0-9@_.-]+\.service$`) and non-Linux OS guards.
  - Added REST endpoints for listing system units, executing `start`/`stop`/`restart`, and streaming `journalctl` logs.
  - Added `SystemdUnitsTab.tsx` with search, active/failed/inactive filters, journalctl logs modal, and confirm modals.
  - Integrated Systemd tab into both Services and Systems Cockpit views.
- **Command Center & Keyboard Fast Actions (Ctrl+K)**:
  - Transformed Command Palette into an actionable command center:
    - `> restart <container>` with Undo toast support.
    - `> logs <container>` opening instant live SSE container log view.
    - `> switch <system>` seamlessly changing active cluster node.
    - `> check <service>` performing instantaneous HTTP/TCP health probe with latency feedback.
- **Frontend Test Suite (Vitest)**:
  - Configured Vitest and `@testing-library/react` in `Corvus.Web`.
  - Added unit test suites covering HTTP caching, formatting, fuzzy matching, and ObsidianUI primitives (`AnimatedNumber`, `SegmentedTabs`, `ExpandableTable`, `StatusBadge`).
- **Multi-Node Systems Cockpit & Distributed Edge Management (`/systems`)**:
  - Full end-to-end multi-server fleet management connecting disparate VPS nodes, bare-metal servers, and homelabs to a single Corvus Hub without opening inbound ports.
  - Implemented database migrations for SQLite (`016_systems_sqlite.sql`) and PostgreSQL (`016_systems_postgres.sql`) with tables: `systems`, `system_tokens`, `system_metrics_1m`, `system_metrics_1h`, and `system_containers_cache`.
  - Created `SystemTelemetryPoint` (128-byte unmanaged `readonly struct`) and `TelemetryRingBuffer` (`ITelemetryRingBuffer`) storing a 60-point circular telemetry buffer per node in RAM (~7.2 KB/node; ~360 KB total for 50 systems) with zero allocations.
  - Implemented `MetricsBatchFlusherBackgroundService` executing a 60-second transactional batch flush of 1-minute averaged metrics into `system_metrics_1m`.
  - Implemented `MetricsRetentionWorker` rolling up 1-minute metrics older than 7 days into `system_metrics_1h` and pruning hourly records older than 30 days (~2.5 MB/month per system disk footprint).
  - Implemented `SystemRepository` (`ISystemRepository`), `SystemMetricRepository` (`ISystemMetricRepository`), and `SystemStatusService` (`ISystemStatusService`) with compile-time Dapper.AOT and .NET 9 Native AOT source-generated JSON serialization context.
  - Added full test suite `MultiNodePhase1Tests.cs` bringing test count to 252/252 passing.
- **Multi-Node Systems Phase 2: Hub Backend Services & Systems API Endpoints**:
  - Implemented `SystemAuthService` (`ISystemAuthService`) generating cryptographically secure 32-byte node tokens (`crv_node_live_...`), SHA-256 storage, constant-time `FixedTimeEquals` validation, and instant revocation.
  - Implemented `SystemTunnelManager` (`ISystemTunnelManager`) maintaining active WebSocket tunnels, correlation-tracked Docker RPC requests (`docker_req` / `docker_res`), and binary PTY routing.
  - Implemented `SystemWatchdogService` monitoring node heartbeats every 5 seconds (online <=10s, degraded <=30s, offline >30s).
  - Implemented `SystemsEndpoints` mapped under `/api/v1/systems/*` (status, list with RAM telemetry, registration, details, deletion, token rotation, metrics ranges, and remote container start/stop/restart/logs).
  - Implemented `AgentTunnelEndpoints` at `/api/v1/agent/tunnel` handling outbound TLS/WSS handshakes and real-time telemetry frame ingestion.
  - Added comprehensive `MultiNodePhase2Tests.cs` test suite bringing total green tests to 254/254.
- **Multi-Node Systems Phase 3: Corvus Agent Edge Client**:
  - Built standalone, zero-reflection .NET 9 Native AOT edge agent (`src/Corvus.Agent/`) with sub-10 MB RAM footprint.
  - Implemented `SystemMetricCollector` collecting CPU, RAM, Disk, Network I/O and Linux Load Averages directly via `/proc/stat`, `/proc/meminfo`, `/proc/net/dev`, and `/proc/loadavg` with cross-platform fallbacks.
  - Implemented `AgentDockerClient` querying local Docker Engine API over `/var/run/docker.sock` Unix Domain Sockets for container status discovery and executing remote RPC actions (`start`, `stop`, `restart`, `logs`).
  - Implemented `AgentTunnelClient` with outbound TLS/WSS connections, 3-second telemetry streaming, and exponential backoff reconnection with $\pm 500\text{ms}$ jitter ($2\text{s} \to 60\text{s}$).
  - Provided `Dockerfile.agent` creating a minimal distroless container image (`ghcr.io/corvus/agent:latest`).
  - Added unit test suite `MultiNodePhase3Tests.cs` bringing test count to 256/256 passing.
- **Multi-Node Systems Phase 4 & 5: Systems UI Cockpit, Architecture & Verification**:
  - Implemented modular systems frontend under `src/Corvus.Web/src/pages/Systems/`: `SystemsHeader.tsx`, `SystemsKpis.tsx`, `SystemsFilterBar.tsx`, `SystemRow.tsx`, `SystemsEmptyState.tsx`, `SystemsEngineBadge.tsx`, `AddSystemSheet.tsx`, `SystemDetailModal.tsx`, and state hook `useSystemsPageState.ts`.
  - Added dedicated API client module `src/Corvus.Web/src/api/systems.ts` and utility helpers `src/Corvus.Web/src/utils/systemsUtils.ts` (byte formatting, status themes, 1-line agent run script generation).
  - Wired Systems cockpit into `Sidebar.tsx`, `AppRouter.tsx`, and `App.tsx` with code-splitting, zero-lag route transition, and full i18n synchronization (`tr.ts` and `en.ts`).
  - Verified and passed all 256/256 backend xUnit test suites and 100% clean production Vite frontend build.


### Fixed
- **Repository Hygiene & Local Mockups .gitignore**:
  - Excluded `Yeni Tasarımlar/` directory containing local UX mockups and design prototypes from git tracking via `.gitignore` and untracked it from the git index cache to keep remote repository clean while preserving local files.
- Fixed command palette fuzzy scoring ranking exact prefix matches and commands at the top.
- Fixed non-Linux fallback behavior for journalctl log queries.
- **ObsidianUI Design System & Motion Engine Infrastructure (Phases 1-4)**:
  - Implemented ObsidianUI design tokens in `index.css`: Greyish Cloud White (`--cloud-100`..`--cloud-500`), matte obsidian surfaces (`--bg-canvas`..`--bg-active`), 1px hairline borders (`--border-hairline`), and zero-gradient / zero-glow principles.
  - Built motion design system in `src/lib/motion.ts`: Spring physics, stagger tokens, runtime motion scale controller (1x, 0.35x Slow-Mo, Instant), and Dark/Light theme mode manager.
  - Created reusable motion primitives: `MotionStage.tsx` (`<PageStage>`, `<MotionItem staggerIndex={n}>`), `AnimatedNumber.tsx` (`useAnimatedNumber` with cubic-out RAF interpolation), and `AnimatedBar.tsx` (4px spring-filled progress bar).
  - Built modular core UI component library under `src/components/ui/`: `Card.tsx`, `KpiCard.tsx`, `KpiRow.tsx`, `QuietBanner.tsx`, `AlertStrip.tsx`, `SegmentedTabs.tsx`, `Button.tsx` (tactile scale 0.96 & inline spinner morph), `StatusBadge.tsx`, `StatusDot.tsx`, `ExpandableTable.tsx` (accordion drawer rows), `FloatingBulkBar.tsx`, `UptimeStrip.tsx`, and upgraded Sonner-style `Toast.tsx` with 2.8s melting progress bar and undo support.
  - Overhauled application shell with `Sidebar.tsx` (draggable 184px-320px resizer, gliding hover pill & sliding active pill, system switcher) and `Header.tsx` (page context, motion speed tabs, theme toggle, refresh).
- **System Action Dropdown Menu Clipping & Portal Positioning**:
  - Re-architected `SystemActionMenu.tsx` to render via React Portal (`createPortal(..., document.body)`), completely eliminating clipping caused by table `overflow-x-auto` and card container borders.
  - Implemented dynamic boundary detection calculating available screen height below the trigger button: automatically flips menu to open upwards when near the bottom of the table or viewport.
  - Added listeners to automatically dismiss dropdown on scroll, window resize, ESC key, or backdrop click.
- **Modal Entrance Animation & Reusable Modal Architecture**:
  - Implemented subtle, physics-based modal entrance animations in `index.css`: `@keyframes modal-backdrop-in` (180ms fade-in) and `@keyframes modal-card-in` (220ms `cubic-bezier(0.16, 1, 0.3, 1)` scale `0.96 -> 1` and `translateY(8px -> 0)`), resolving abrupt modal popups.
  - Created modular `Modal.tsx` in `src/Corvus.Web/src/components/ui/` featuring backdrop click dismiss, ESC keydown listener, body scroll lock management, and standard ARIA accessibility attributes.
  - Upgraded modal dialogs (`EditSystemModal`, `DeleteSystemModal`, `AddServiceModal`, `EditServiceModal`, `CommandPaletteModal`) with `.animate-modal-backdrop` and `.animate-modal-card`.
  - Maintained accessibility through existing `@media (prefers-reduced-motion: reduce)` overriding animation duration to 0.01ms.
- **Systems Page Layout Expansion & Column View Menu (Mockup Alignment)**:
  - Redesigned the Systems cockpit (`/systems`) to faithfully match the spacious HTML mockup: card wrapper with `bg-[#12131e] border-[#242637] rounded-3xl p-6 sm:p-7`, 30px title with node count badge, unified filter search, and refresh trigger.
  - Implemented modular `SystemsColumnsMenu.tsx` providing a "Görüntüle" / "View" column toggle dropdown enabling users to customize visibility for optional metrics (GPU, Temp, Battery, WiFi, Services, Updates) persisted in `localStorage`.
  - Upgraded table layout with `SystemsTable.tsx` featuring full SVG header icons, sort indicators, monospace meter progress bars (`<b>%{percent}</b> <bar><i /></bar> <em>{used}</em>`), host tags (`#7c7cff`), and non-propagating action menus.
  - Expanded `AppLayout.tsx` standalone container max width to `max-w-[1500px]` matching the 1500px `.wrap` grid specification.
- **System Action Dropdown Menu & Node Lifecycle Management**:
  - Implemented modular `SystemActionMenu.tsx` providing comprehensive node operations: Edit system (name & tags), Pause/Resume monitoring, Copy system name, Copy hostname/IP, and Delete node.
  - Implemented `EditSystemModal.tsx` backed by new `PUT /api/v1/systems/{id}` endpoint and compile-time Native AOT serialization context.
  - Implemented `DeleteSystemModal.tsx` confirmation dialog for securely decommissioning nodes via `DELETE /api/v1/systems/{id}`.
  - Replaced misleading `%0.0` CPU and `0 B` RAM/Disk values on `pending` (awaiting agent) and `paused` systems with dedicated badges (`Awaiting Agent` / `Paused`) and clean `-` placeholders, strictly adhering to real-data zero-dummy integrity rules.
- **Navbar & Sidebar Layout Deconfliction & Single Source of Truth**:
  - Resolved height and position overlapping between `Navbar.tsx` and `Sidebar.tsx`; `Sidebar` now strictly mounts below the persistent header (`top-16`, `h-[calc(100vh-4rem)]`, `z-30`).
  - Removed duplicate brand header and logo from `Sidebar.tsx`; unified the responsive sidebar toggle (`PanelLeftOpen` / `PanelLeftClose`) into `Navbar.tsx`.
  - Consolidated user profile, logout, and language switching exclusively into the persistent top `Navbar.tsx`.
- **Terminology & Button Polish ("Filo" and "+ +" Fixes)**:
  - Completely eradicated the unwanted "Filo" / "Fleet" terminology from UI headers, breadcrumbs, and localization strings, adopting clean industry-standard "Sistemler" / "Systems".
  - Fixed the duplicate `+ + Add System` icon/label bug in `SystemsPage` and i18n files (`tr.ts`, `en.ts`).
- **Responsive Mobile Bottom Bar Viewport Pinning**:
  - Lifted `BottomNav.tsx` out of nested layout flex containers directly into root layout with `fixed inset-x-2.5 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50`, ensuring it remains permanently pinned to the bottom of the viewport on mobile devices.
  - Added bottom padding `pb-32` on main layout container to prevent mobile bottom bar overlapping interactive content.
- **System Selection Dashboard Loading & Active Context Cache Partitioning**:
  - Fixed dashboard not loading immediately when entering a node from the systems table by invoking `invalidateCache()` and dispatching `corvus_active_system_changed` on system selection.
  - Added event listener in `DashboardPage` to immediately trigger a fresh fetch when the active node changes.
  - Partitioned `fetchCachedJson` keys in `http.ts` by active system ID (`${activeSystemId}:${url}`) and attached `X-System-Id` request header, preventing cross-host cache contamination.
- **Navbar & Sidebar Layout Deconfliction & Profile Route Isolation**:
  - Eliminated sidebar and mobile nav interference on the Profile page (`/profile`); profile management now renders in full-width standalone layout under the persistent top navbar just like the Fleet view.
  - Removed duplicate profile card and language toggle from the Sidebar footer, keeping user profile, logout, and language switching unified exclusively in the top navigation bar.
- **Persistent Global Navbar & Scaled Corvus Design Hierarchy**:
  - Unified header architecture with a persistent top bar (`Navbar.tsx`) permanently active across all views (both Fleet `/` and intra-node views like Dashboard, Containers, Services).
  - Preserved continuous page flow: The top bar never disappears; entering a node seamlessly mounts the left sidebar (`Sidebar.tsx`) beneath the header.
  - Profile is now rendered as a first-class route (`/profile`) accessible directly from the top navigation bar with clean URL mapping.
  - Scaled up the Systems fleet section to match standard Corvus Midnight v2 proportions (`max-w-[1400px]`, `PageHeader`, `rounded-3xl`, larger row paddings, and higher progress bars).
- **Fleet Welcome Screen Layout Isolation & Return Breadcrumb**:
  - Removed "Systems" from the active node's sidebar (`Sidebar.tsx`) and mobile bottom bar (`BottomNav.tsx`), placing an intuitive breadcrumb return link (`← All Systems [/]`) at the top of the node sidebar to navigate back to the root fleet cockpit.
  - Eradicated synthetic disk alert thresholds (`SystemsAlertBanner.tsx`) that flagged local disk usage without user-configured alarm rules.
- **Direct Corvus Cockpit Transition on Server Selection**:
  - Completely deleted the redundant, separate detail view (`SystemDetailPageView.tsx`) and unnecessary engine badge (`SystemsEngineBadge.tsx`).
  - Clicking any server in the fleet table now smoothly transitions directly into the full, authentic Corvus cockpit (`Dashboard`, `Services`, `Containers`, `Metrics`, `Uptime`, `Settings`) with the primary sidebar active.
  - Added user management / profile shortcut to the fleet top navigation bar (`SystemsNavbar.tsx`), granting direct access to global user settings.
  - Host-specific configurations (Docker daemon, system retention) remain inside the selected server's native Settings page.
- **Systems Fleet Polish, Full i18n & Error Handling**:
  - Eliminated `TypeError: Cannot read properties of undefined (reading 'toFixed')` runtime crash in `SystemDetailPageView.tsx` by introducing complete null-safety guards across all metrics, CPU percentages, and load average calculations.
  - Hardened `ChunkErrorBoundary` in `App.tsx` to strictly distinguish between dynamic chunk loading errors and general React component runtime exceptions, preventing false "New Version Detected" reload loops.
  - Replaced all hardcoded Turkish/English strings across `SystemsNavbar.tsx`, `SystemsTable.tsx`, `SystemsAlertBanner.tsx`, `SystemDetailPageView.tsx`, and `Systems/index.tsx` with unified, strongly-typed i18n keys (`en.ts` and `tr.ts`).
  - Powered the fleet table with real live load averages and network throughput directly from backend `SystemSummaryDto` and `TelemetryRingBuffer`, eliminating all mock/dummy values.
  - Activated real `Ctrl+K` keyboard shortcut autofocus on the systems search input and removed clutter/pulsing animations and non-functional buttons.
  - Removed confusing database buffer badge (`SystemsEngineBadge`) from the fleet view per UX feedback.
- **Systems Cockpit 2-Layer Fleet Navigation & Standalone Landing View**:
  - Implemented the 2-layer fleet architecture inspired by modern minimalist server monitors:
    - **Layer 1 (Landing Fleet Screen):** Rendered completely full-screen without desktop sidebars or bottom navigation (`AppLayout.tsx`). Features `SystemsNavbar.tsx` (Corvus logo, fleet badge, Ctrl+K search, actions, and `+ Sistem ekle`), an active threshold alert banner (`SystemsAlertBanner.tsx`), and a rich horizontal fleet metrics table (`SystemsTable.tsx`) displaying status, CPU %, RAM %, Disk %, Load Averages, Network throughput, and active container tallies.
    - **Layer 2 (Dedicated System Detail View):** Clicking any system in the fleet smoothly transitions to `SystemDetailPageView.tsx` with top system metadata, time range selector (`live`, `1h`, `24h`, `7d`, `30d`), and dedicated tabs (Core/CPU/RAM, Network, Storage, Containers, Security) with a 1-click back button to the fleet.
  - Automatically registered and bridged the Corvus Hub host server (`local-host`) into the circular telemetry ring buffer and database with live CPU, RAM, Disk, and local Docker container caching.
  - Fixed chunk error boundary re-render issue when navigating into node details.
- **React Hook Lifecycle Consistency (`App.tsx`)**:
  - Relocated the command palette `useCommandPalette` / `fetchCommandItems` effect hook to the component top-level before conditional early returns (`authLoading`, `authStatus`). Resolves production React error #310 ("Rendered more hooks than during the previous render") which caused a black screen after user login.

### Security
- **Session Cookie Secure Transport Policy (`AuthEndpoints.cs`)**:
  - Explicitly bound session cookies (`corvus_session`) to `Secure = true` when served over HTTPS or behind TLS-terminating reverse proxies (`X-Forwarded-Proto: https`). Eliminates CWE-319/CWE-614 cleartext token interception vulnerabilities while preserving local HTTP homelab usability.
- **Log Forging & CRLF Injection Prevention (`SecuritySanitizer.cs`)**:
  - Implemented `SecuritySanitizer.SanitizeLog` across all Docker, Compose, and Webhook controller endpoints to strip newline control characters (`\r`, `\n`) from external parameters. Protects log integrity against CWE-117 log injection and audit log poisoning.

### Refactored
- **Clean Dashboard Architecture & Visual Clarity**:
  - Restored the unified, spacious Midnight v2 dashboard layout as the sole and definitive overview, purging experimental nested layout partitions to preserve optimal readability and performance.
  - Zero hardcoded UI strings: 100% internationalized via `useI18n` with synchronized dictionaries in both `tr.ts` and `en.ts`.
- **Backend Model Enrichment (`DockerModels.cs`)**:
  - Exposed `NetworkSettings` (`DockerNetworkSettings`) in `DockerContainerInfo` and `DockerContainerDto` so Docker network names are serialized directly to the web client.

## [1.5.30] - 2026-10-10

### Refactored
- **Docker Client Architecture & Socket Transport Decoupling**:
  - Extracted core Unix Domain Socket and Windows Named Pipe transport into `DockerHttpTransport.cs` (`IDockerHttpTransport`).
  - Modularized specialized sub-clients under `Corvus.Api.Services.Docker`: `DockerContainerClient.cs`, `DockerImageClient.cs`, `DockerVolumeClient.cs`, `DockerSystemClient.cs`, and `DockerExecClient.cs`.
  - Transformed monolithic 865-line `DockerHttpClient.cs` into a clean, lightweight orchestrator facade with zero breaking changes.
- **Containers Page State & Polling Extraction**:
  - Decoupled polling intervals, visibility listeners, SSE event dispatching, optimistic container actions, and complex tag/state filtering from `Containers/index.tsx` into a dedicated `useContainersPageState.ts` custom hook.
- **Multi-Channel Notification Architecture Decoupling**:
  - Extracted individual notification channel senders (`DiscordChannelSender`, `TelegramChannelSender`, `SlackChannelSender`, `SmtpChannelSender`, `NtfyChannelSender`, `WebhookChannelSender`) under `Corvus.Api.Services.Notifications`.
  - Added dedicated SSRF protection validator (`NotificationSecurity.cs`) and bilingual alert template formatter (`NotificationMessageFormatter.cs`).
  - Slimmed down `NotificationService.cs` from ~980 lines to a clean orchestrator facade with 100% backward compatibility for all test suites.
- **Uptime Monitoring Protocol Separation**:
  - Modularized protocol probes into specialized standalone checkers under `Corvus.Api.Services.Uptime.Checkers`: `HttpProtocolChecker`, `TcpProtocolChecker`, `PingProtocolChecker`, and `NetworkAddressResolver`.
  - Decoupled container gateway loopback address translation and TLS certificate extraction from the main scheduler loop in `UptimeCheckerService.cs`.
- **Frontend Core Architecture & Routing Extraction**:
  - Extracted route parsing, history synchronization, and deep-link query navigation into `useAppNavigation.ts` hook.
  - Decoupled page switching and fallback rendering into dedicated `AppRouter.tsx` layout component.

### Added
- **Global Command Palette (`Ctrl+K` / `Cmd+K`) & Keyboard Navigation**:
  - **Fuzzy Search Algorithm (`fuzzySearch.ts`)**: Zero-dependency, lightweight character sequencing and fuzzy matching for fast keyboard filtering.
  - **Modular Command Palette Modal (`CommandPaletteModal.tsx`, `useCommandPalette.ts`, `commandItems.ts`)**: Instant launcher providing keyboard navigation (`↑`/`↓`/`Enter`), quick access to Pages, Container Actions, Live Logs, Interactive Web Terminals, and System Metrics.
  - **Sidebar Quick Search Launcher (`Sidebar.tsx`)**: Prominent search bar in desktop and mobile layouts triggering the command palette with a single click.
- **Micro-Animations & Smooth Layout Transitions**:
  - **Fluid Page Transitions (`PageTransition.tsx`)**: Subtle 150ms opacity and translateY fade transitions on route changes honoring `prefers-reduced-motion`.
  - **Dynamic Number Counter Interpolation (`useAnimatedNumber.ts`)**: Eased numeric counter transitions for live metrics and telemetry gauges.
  - **Skeleton Loading Placeholders (`Skeleton.tsx`)**: Shimmer placeholder states for tables and cards replacing jarring full-page spinners.
- **Proactive Metric Threshold Alerting Engine (Phase 9)**:
  - **SQLite Alert Rules Migration (`014_alert_rules.sql`)**: Persistent storage for user-defined CPU, RAM, and Disk threshold rules with configurable evaluation duration and anti-spam cooldown periods.
  - **Dapper Repository & Native AOT Models (`AlertRuleRepository.cs`, `AlertRule.cs`, `CorvusJsonSerializerContext.cs`)**: High-performance data access layer with zero runtime reflection.
  - **Background Sliding Window Evaluator (`ThresholdEvaluatorService.cs`)**: Continuous background monitor evaluating telemetry metrics, tracking violation durations, and preventing flapping alert fatigue.
  - **Multi-Channel Alert Dispatcher (`NotificationService.cs`)**: Real-time threshold breach and resolved notifications across Discord, Telegram, Slack, SMTP, Ntfy, and generic Webhooks.
  - **REST Management Endpoints (`AlertRulesEndpoints.cs`)**: Full CRUD API (`/api/alerts/rules`) protected by `RequireAdmin`.
  - **Activity Log & Audit Timeline (Phase 10)**:
    - **SQLite Activity Logs Migration (`015_activity_logs.sql`)**: Structured logging of container lifecycle operations, system alerts, and administrative actions with indexed timestamps and categories.
    - **Non-Blocking Channel Pipeline (`ActivityLogService.cs`, `ActivityLogRepository.cs`)**: High-performance buffered write queue using `System.Threading.Channels` ensuring zero latency impact on API requests.
    - **Native AOT DTOs & Serialization (`ActivityLogEntry.cs`, `CorvusJsonSerializerContext.cs`)**: End-to-end reflection-free data structures.
    - **Audit Log Endpoints (`ActivityLogEndpoints.cs`)**: Paginated and filterable REST API (`/api/activity-logs`) with automated retention cleanup.
    - **Activity Timeline Dashboard (`ActivityTimeline/index.tsx`, `ActivityTimelineItem.tsx`, `ActivityTimelineFilter.tsx`)**: Chronological event stream with category badges, actor details, and quick filter chips.
  - **Docker Volume & Image Hygiene Inspection (Phase 11)**:
    - **Dry-Run Two-Stage System Hygiene**: Full disk analysis (`GET /api/containers/system-df`) paired with selective pruning (`POST /api/containers/prune/selective`).
    - **Keyboard Prune Launcher**: Direct invocation of system hygiene via the Command Palette (`action-prune`) and query action routing (`/containers?action=prune`).

## [1.5.28] - 2026-10-10

### Fixed
- **Container Inspect Data Normalization & Field Restoration**:
  - **Case-Insensitive Safe Data Accessor (`inspectHelpers.ts`)**: Resolved Docker daemon PascalCase (`Config`, `NetworkSettings`, `PortBindings`, `Mounts`) vs client-side camelCase (`config`, `networkSettings`, `mounts`) property mapping. Environment variables, published ports, connected Docker networks, and storage volume mounts now display accurately on `/containers/:id`.
  - **Graceful State & Health Mapping**: Added fallback parsers for runtime execution configuration, working directory, entrypoints, and container health probes.
- **Fluid Row-Click Navigation & Quick Actions Toolbar**:
  - **Whole-Row Direct Click Navigation (`ContainerRow.tsx`)**: Replaced 3-dots menu friction with full-row clickability featuring subtle micro-interaction transitions (`hover:bg-white/[0.08] active:scale-[0.998] transition-all`), navigating straight into `/containers/:id`.
  - **In-Row Quick Actions Toolbar (`ContainerQuickActions.tsx`)**: Added compact 1-click icon buttons directly onto container table rows for instant navigation into Live Logs (`FileText`), Container Overview (`Info`), Telemetry & Resource Limits (`Activity`), and Web Terminal (`Terminal`).
  - **Clickable Published Ports (`ContainerRow.tsx`)**: Exposed external published ports (`p.PublicPort ? host:port ↗`) as direct anchor links opening in a new browser tab with event bubbling isolation.
  - **Deep-Linked Tab Query Navigation (`App.tsx`, `Containers/index.tsx`, `ContainerDetail/index.tsx`)**: Enabled `?tab=` query parameter support so clicking Quick Action icons routes straight into the target tab.
- **OCI Registry Image Sentinel & Digest Tracking**:
  - **Zero-Payload Manifest Inspection (`OciRegistryClient.cs`)**: Implemented zero-byte HEAD requests to `/v2/{repo}/manifests/{tag}` against Docker Hub, GitHub Container Registry (GHCR), and Quay without downloading heavy image layers.
  - **Docker Engine Layer Comparison (`DockerHttpClient.cs`, `DockerService.cs`)**: Extracts container RepoDigests and compares SHA256 digests against remote OCI manifests.
  - **One-Click Safe Recreate (`ContainersEndpoints.cs`)**: Added `POST /api/containers/{id}/recreate` (`RequireAdmin`) to automatically pull the upstream image, stop the old container, recreate it with identical configuration, and launch it seamlessly.
  - **Visual Update Indicator (`ImageUpdateModal.tsx`, `ContainerRow.tsx`, `ContainerList.tsx`, `ContainerDetailHeader.tsx`)**: Displays an amber "Update Available" badge across fleet table rows, cards, and detail headers with a dedicated modal showing local vs remote digest hashes and 1-click update.
- **Docker Compose YAML Inspector & Safe In-Place Editor**:
  - **Path-Traversal Protected YAML Service (`ComposeFileService.cs`, `ComposeEndpoints.cs`)**: Securely resolves Compose configuration files (`compose.yaml`, `docker-compose.yml`) via container labels. Strictly blocks directory traversal (`..`) attempts.
  - **Automatic `.bak` Backup Preservation**: Generates an automatic timestamped or `.bak` copy before committing any file updates to disk.
  - **Modular In-Browser Editor (`ComposeConfigModal.tsx`, `ComposeStackGroup.tsx`)**: Lightweight YAML editor with monospace formatting, line count indicator, file size badges, and "Save & Restart Stack" action.
- **Event-Driven Auto-Healing & Inbound Deploy Webhooks**:
  - **Loop-Guarded Container Auto-Recovery (`AutoHealingService.cs`, `ContainerDiscoveryService.cs`)**: Automatically revives crashed containers when abnormal exit codes are detected, guarded by a thread-safe sliding window algorithm (max 2 restarts within 15 minutes) to prevent infinite flapping storms.
  - **Instant Multi-Channel Auto-Heal Alerts (`NotificationService.cs`)**: Dispatches recovery notifications across Discord, Telegram, Slack, SMTP, Ntfy, and Webhooks upon successful auto-restart.
  - **Constant-Time Inbound Deploy Webhook (`DeployWebhookEndpoints.cs`)**: Added `POST /api/hooks/deploy/{token}` with cryptographic constant-time token verification (`CryptographicOperations.FixedTimeEquals`) to prevent timing side-channel attacks for CI/CD pipelines.
  - **Deploy Token Management UI (`GeneralSettingsTab.tsx`)**: Interface for generating, revealing, and managing secure deploy webhook tokens.
- **Container Detail Architecture & Navigation Overhaul**:
  - **Dedicated Full-Page Container Dashboard (`/containers/:id`)**: Replaced the constrained inspect popup dialog (`ContainerDetailModal`) with a full-screen, URL-addressable container diagnostic and telemetry page. Users can now directly bookmark, reload, and share container URLs (`/containers/{id}`).
  - **Historical Telemetry Time-Series Charts (`ContainerHistoricalCharts.tsx`)**: Embedded responsive Area charts rendering real-time CPU % load and memory usage trends with dynamic color degradation, custom tooltips, and memory limit context.
  - **Docker Compose Stack Bulk Actions (`ComposeStackGroup.tsx`, `GroupSection.tsx`)**: Added Restart Stack, Start Stack, and Stop Stack bulk lifecycle buttons directly onto Compose project group headers.
  - **Container Health & Crash-Loop Alerting (`ContainerDiscoveryService.cs`, `NotificationService.cs`)**: Automatic detection of running-to-exited container state transitions with non-zero exit codes (ExitCode != 0, OOMKilled, runtime faults).
- **Container In-Browser Terminal & Stream Interactivity**:
  - **Dynamic Exec Handshake Length (`DockerHttpClient.cs`)**: Replaced hardcoded byte lengths with dynamic UTF-8 calculations for Docker exec upgrade requests.
  - **Immediate Stdin Stream Flushing (`ContainersEndpoints.cs`)**: Added immediate `FlushAsync` calls on stdin streams preventing buffered typing lag.
  - **Universal Shell Prioritization (`ContainersEndpoints.cs`)**: Prioritizes POSIX `/bin/sh` over `/bin/bash` ensuring 100% compatibility across Alpine, BusyBox, and minimal containers.

### Changed
- **Documentation & Open Source Showcase Modernization**:
  - **10-Second Quick Start Promotion**: Elevated the verified single-line `docker run` command and streamlined `compose.yaml` to the immediate top of `README.md` and `README.tr.md`.
  - **The Native AOT Engineering Advantage**: Detailed the zero-CLR, Workstation GC, memory trimming, and embedded SQLite WAL runtime mechanics.
  - **Inspirations & Credits**: Formally credited open-source inspirations adhering to project credit ethics.
  - **Comprehensive Architecture & Specification Documentation Sync**: Fully synchronized `README.md`, `README.tr.md`, `docs/architecture.md`, `docs/architecture.tr.md`, `docs/specification.md`, `docs/specification.tr.md`, `docs/ROADMAP.md`, and `docs/ROADMAP.tr.md` reflecting Phase 6, Phase 7, and Phase 8 roadmap plans.

---

## [1.5.27] - 2026-10-05

### Fixed
- **Container Action Sheet Streamlining**:
  - **Action Menu Simplification (`ContainerActionSheet.tsx`)**: Removed "Container details" and "Resource limits & telemetry" actions from the quick bottom sheet to align 1:1 with the clean HTML reference menu, keeping the sheet focused on logs, terminal, tagging, and container lifecycle operations (start/stop/pause/restart).
- **Architecture Roadmap Alignment**:
  - **Dedicated Container Detail & Telemetry Page (`/containers/:id`)**: Logged Phase 6 (Ticket 6.1) in project architecture roadmaps (`ROADMAP.md`, `ROADMAP.tr.md`) to transition container deep inspection and resource management from pop-up dialogs to a dedicated full-screen dashboard page (`/containers/:id`).

---

## [1.5.26] - 2026-10-05

### Fixed
- **Container Resource Limits & Live Telemetry Enhancement**:
  - **Real-Time Telemetry & Performance Gauges (`ContainerResourcesTab.tsx`)**: Transformed the previously static resource limits tab into an active telemetry dashboard. Integrated real-time CPU utilization (%), memory consumption (MB/GB and %), configured core/RAM limits, dynamic adaptive progress bars (emerald / amber / rose), and live network I/O (Rx/Tx) traffic metrics with a 2.5-second polling cycle.
  - **Host Hardware Context & Docker Compose Persistence Awareness**: Provided real-time comparisons between container cgroup limits and physical host RAM/CPU capacity. Added intelligent Docker Compose stack detection with informative guidance on persistent limits via `deploy.resources.limits`.
  - **Deep-Tab Routing & Sheet Action Decoupling (`ContainerActionSheet.tsx` & `ContainerDetailModal.tsx`)**: Upgraded container action sheet with explicit "Container details" (overview) and "Resource limits & telemetry" actions with seamless `initialTab` deep-linking.

---

## [1.5.25] - 2026-10-05

### Fixed
- **Full Midnight v2 Modernization & Legacy Design System Purge**:
  - **Uptime Monitoring Overhaul**: Modernized Push Monitors (`PushMonitorsTab.tsx`), Add Snitch modal (`AddSnitchModal.tsx`), Incidents / Announcements tab (`IncidentsTab.tsx`), Add Incident dialog (`AddIncidentModal.tsx`), Ping Uptime tab (`PingUptimeTab.tsx`), Recent Checks monitor table (`UptimeRecentChecks.tsx`), and Uptime helper dialogs (`DisableUptimeDialog`, `EnableUptimeModal`, `DiscoveredServicesSection`) to Midnight v2 `sheet-glass` and `surface` design standards.
  - **Services & Modals Modernization**: Upgraded manual service creation (`AddServiceModal.tsx`), advanced health-check configuration (`AdvancedCheckOptions.tsx`), service edit dialog (`EditServiceModal.tsx`), initial registration prompt (`RegistrationPromptModal.tsx`), and empty state card (`ServicesEmptyState.tsx`) with rounded input tokens, active segment controls, and Midnight v2 action buttons.
  - **Settings & Notification Channels Overhaul**: Upgraded Notification channel tabs and all 6 alert channel panels (Discord, Telegram, Slack, Webhook, SMTP Email, Ntfy) along with Flapping Protection card and notification event filters to Midnight v2 aesthetics. Modernized Backup tab (`BackupSettingsTab.tsx`) with dark monospace snippet preview and copy buttons.
  - **Dead Code Purge**: Removed 6 obsolete, unused legacy dashboard widgets (`ActiveContainersWidget`, `AttentionRequiredCard`, `OperationsWidget`, `QuickServicesGrid`, `SystemKpiStrip`, `SystemPulseHero`), eliminating dead code and updating architecture docs.
  - **Zero-Tolerance Legacy Palette Hex Purge**: Cleaned all lingering legacy hex colors (`#1a1d29`, `#0f1117`, `#2a2e3f`, etc.) across `App.tsx`, `LanguageSwitch.tsx`, `TagFilterBar.tsx`, `TagInput.tsx`, `GroupSection.tsx`, and `ContainerActionButtons.tsx`.

---

## [1.5.24] - 2026-10-05

### Fixed
- **1:1 HTML Reference Bottom Sheet Alignment (`Corvus – Konteynerler.html`)**:
  - **Fluid Drawer Physics (`Sheet.tsx`)**: Replaced static Tailwind pop-in fade with the exact `transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)` sliding physics from `translate(-50%, 105%)` to `translate(-50%, 0)`.
  - **Viewport Flush & Compact Width**: Pinned sheet directly to `bottom: 0` with `w-[min(100%, 460px)]` and `rounded-t-[28px]`, eliminating floating gap margins on desktop viewports.
  - **Sleek Single-Column Menu (`ContainerActionSheet.tsx`)**: Replaced bulky 2-column cards and descriptions with the exact `.mi` vertical action list from the HTML prototype (Loglar, Terminal, Kaynak sınırları, Etiket ekle, Yeniden Başlat, Duraklat/Devam ettir, Durdur/Başlat).

---

## [1.5.23] - 2026-10-05

### Fixed
- **Container Action Sheet & Modal Architecture Overhaul**:
  - **True Bottom Action Drawer (`Sheet.tsx` & `ContainerActionSheet.tsx`)**: Replaced the desktop-centered pop-up modal with an elegant, responsive bottom sheet drawer across all viewports. Features a smooth drag handle indicator, container status Pill header with image badge, and cleanly categorized two-tier action cards (*Inspection & Dev Tools* and *Lifecycle Actions*).
  - **Midnight v2 Modal Redesign**: Modernized all container-related dialogs to eliminate legacy hardcoded `#1a1d29` and `slate-*` palettes:
    - **Container Logs Modal (`ContainerLogsModal.tsx`)**: Glass backdrop (`sheet-glass rounded-[28px] border-white/10`), live SSE indicator pulse, modernized search filter, and monospace log viewer.
    - **Container Web Terminal (`ContainerTerminalModal.tsx`)**: Midnight v2 shell selector, connection status pill, and full-screen controls.
    - **Container Tags Modal (`ContainerTagsModal.tsx`)**: Streamlined tag management modal with unified input and action buttons.
    - **Container Detail & Live Config (`ContainerDetailModal.tsx`)**: Elevated 5-tab dialog with active tab indicators, and modernized sub-tabs (`ContainerOverviewTab`, `ContainerEnvTab`, `ContainerNetworkingTab`, `ContainerStorageTab`, `ContainerResourcesTab`).
    - **Safe System Prune Modal (`SystemPruneModal.tsx`)**: Overhauled disk audit dialog, dry-run tables (`PruneContainersTable`, `PruneImagesTable`, `PruneVolumesTable`, `PruneBuildCacheCard`), and selective prune action footer.

---

## [1.5.22] - 2026-10-05

### Fixed
- **Resilient & Privacy-Hardened Deploy Webhook**: Added a 3-attempt exponential retry loop with 10-second sleep intervals and 15-second connect timeout to `ci.yml` and `release.yml`. Response output is directed to `/dev/null` and only the numeric HTTP status is evaluated/logged, preventing server diagnostic bodies or internal paths from leaking into open-source public logs.

---

## [1.5.21] - 2026-10-04

### Added
- **Midnight v2 Unified Frontend Design System**:
  - **Shared Design Tokens & Utilities**: Integrated `#0d0e15` backdrop, `surface` cards (`rgba(27,29,42,0.9)`), single accent `#d5d5dc` indicator, and semantic status colors (`ok`: `#34d399`, `warn`: `#fbbf24`, `err`: `#f87171`, `neutral-bar`: `rgba(213,213,220,0.55)`). Added `@utility surface`, `@utility glass`, `@utility sheet-glass`, and animations (`animate-rv`, `animate-dot-pulse`).
  - **Modular UI Component Library (`src/components/ui/`)**: Built reusable, type-safe components: `Button`, `Pill`, `ProgressBar`, `StatTile`, `SearchInput`, `FilterChip`, `TagChip`, `Segment`, `Sheet`, `Toast` (with `ToastProvider` & `useToast`), `EmptyState`, `SslBadge`, `HistoryBars`.
  - **Unified Collapsible Layout (`AppLayout.tsx`)**: Replaced fragmented inline containers with a centralized layout supporting collapsible sidebar with persistent state in `localStorage`, floating Corvus logo trigger button, and responsive bottom bar.
  - **Dashboard Modernization**: Redesigned KPI cards with `StatTile`, memory badge, `AttentionAlerts` for degraded/critical containers and expiring SSLs, top RAM usage container bars, and 24h event timeline.
  - **Services & Containers Modernization**: Updated service cards, group headers, and container list/stack views with single-color threshold indicators, `SearchInput`, `FilterChip`, and `ContainerActionSheet`.
  - **System Metrics Overhaul**: Converted Recharts area charts to strictly threshold-driven single colors (eliminating arbitrary gradients), added time-range `Segment` control, and modernized storage card with 3-box capacity breakdown.
  - **Uptime & Settings Redesign**: Overhauled Uptime monitoring tabs, service selector, and system settings with Midnight v2 glass tabs and consistent surface cards.
  - **Profile & User Management Modernization**: Redesigned `/profile` security tab, team user management, and `AddUserModal` using `surface` cards and `Button` components.
  - **Auth & Onboarding Overhaul**: Modernized `/auth` (Login & Register) screen with flat Midnight backdrop, centered `surface` card, glass tab selector, and accessible form inputs.
  - **Public Status Page Overhaul**: Upgraded public-facing status page (`/status`), category accordions, service bars, and incident banners to Midnight v2 styling.

### Changed
- **Threshold-Driven Progress & Metrics**: Removed purple/cyan decorative gradients across all progress bars and charts, ensuring colors strictly represent operational health thresholds (<70% ok, 70-89% warning, >=90% critical).
- **Independent Terminology**: Standardized terminology across the entire frontend adhering to Corvus branding ethics.

---

## [1.5.20] - 2026-10-03

### Added
- **Safe System Prune & Dry-Run Disk Audit (Package 3)**:
  - **Dry-Run Analysis Engine:** Added `GET /api/containers/system-df` delegating to Docker Engine `GET /system/df` to inspect reclaimable space across stopped containers, unused images, unattached volumes, and build cache before deletion.
  - **Selective Prune API:** Introduced `POST /api/containers/prune/selective` with `DockerSelectivePruneRequest` enabling targeted cleanup of specific container IDs, image IDs, and volume names.
  - **Modular Dry-Run UI:** Overhauled the prune modal into an itemized 2-stage audit dialog (`SystemPruneModal.tsx`) featuring dedicated modular subcomponents (`PruneContainersTable`, `PruneImagesTable`, `PruneVolumesTable`, `PruneBuildCacheCard`).
  - **Persistent Volume Safeguards:** Implemented persistent volume warnings and selective checkbox controls to prevent accidental loss of database or storage volumes.
- **Container Detail & Live Configuration Management (Package 4)**:
  - **Comprehensive Container Inspect:** Extended `DockerContainerInspectInfo` to deserialize full Docker inspect payload: commands, entrypoint, working directory, process user, timestamps, network endpoints, port bindings, and volume mounts.
  - **Live Resource Updating API:** Added `POST /api/containers/{id}/update` invoking Docker Engine `POST /containers/{id}/update` to adjust CPU limits (`NanoCpus`), memory limits (`Memory`), and restart policies on-the-fly with zero container downtime.
  - **Modular Container Detail Modal:** Created `ContainerDetailModal.tsx` and 5 modular sub-tabs (`ContainerOverviewTab`, `ContainerEnvTab`, `ContainerNetworkingTab`, `ContainerStorageTab`, `ContainerResourcesTab`).
  - **Environment Variables Inspector:** Added searchable environment table with sensitive value masking toggle and single/bulk `.env` clipboard export.
  - **Interactive Container Access:** Made container names clickable across list and stack views to directly open the detail modal, alongside a quick-access sliders action button.
- **Container Tags & Category Management (Package 2)**:
  - **Backend & Native AOT DTO:** Introduced `UpdateContainerTagsRequest` and registered it in `CorvusJsonSerializerContext` for Native AOT source generation.
  - **Database & Repository Layer:** Added `SaveContainerTagsAsync` and `GetAllContainerTagsAsync` to `ServicesRepository`, supporting atomic upsert into `service_overrides` and synchronization with the `services` table.
  - **Docker Service Tag Merging:** Added `Tags` property to `DockerContainerInfo`. Enhanced `DockerService.GetContainersAsync` to aggregate labels (`corvus.tags`, `environment`, `env`, `com.docker.compose.project`) with database overrides, with immediate cache eviction via `InvalidateContainersCache`.
  - **Container Tag API Endpoint:** Added `PUT /api/containers/{id}/tags` (`[RequireAdmin]`) with validation, audit logging, and `container_tags_updated` SSE broadcasting.
  - **Frontend Types & API:** Extended `DockerContainer` with `tags?: string[]` and implemented `containersApi.updateContainerTags`.
  - **Reusable TagFilterBar Component:** Created `src/Corvus.Web/src/components/common/TagFilterBar.tsx` for real-time tag filtering across flat lists and Compose stack groups in `/containers`.
  - **Modular ContainerTagsModal:** Added `src/Corvus.Web/src/pages/Containers/ContainerTagsModal.tsx` utilizing `TagInput` to easily add/edit container tags from cards, rows, or badge buttons.
- **Smart Shell Auto-Detection & Fallback Chain (Package 1)**:
  - Added `auto` shell detection mode (`/bin/bash` -> `/bin/sh` -> `/bin/ash` -> `sh`) in `ContainersEndpoints.cs` and frontend shell dropdown. Missing container shells no longer drop terminal connections, gracefully falling back to available alternatives.
  - Configured `"Env": ["TERM=xterm-256color"]` in Docker exec creation (`DockerHttpClient.cs`) for full readline interactivity, arrow-key navigation, and 256-color support.
  - Added explicit HTTP status checking (`101 UPGRADED` / `200 OK`) in `StartExecStreamAsync` to intercept Docker daemon failures early during shell fallback attempts.
- **Test Suite Expansion:** Added comprehensive unit tests for inspect, update, tags, and selective prune methods in `DockerServiceTests.cs` and `ContainerTagsTests.cs` (all 223 tests passing).

### Fixed
- **Web Terminal Pipe Deadlock Fix (Package 1)**: Removed blocking Win32 `FlushFileBuffers` triggered by `FlushAsync` on NamedPipeClientStream in `ContainersEndpoints.cs`, eliminating keyboard input lockup and lag during container terminal sessions.
- **XTerm Input Stream Consolidation**: Removed redundant `term.onBinary` listener in `ContainerTerminalModal.tsx`, standardizing on unified UTF-8 `term.onData` streaming to eliminate keystroke duplication and conflicts.

---

## [1.5.19] - 2026-10-02

### Added
- **Tags & Category Grouping (Phase 5 - Ticket 5.2)**:
- **Database Schema Migration (`013_service_tags.sql`)**: Added `tags` text column to both `services` and `service_overrides` tables with non-blocking migration support.
- **Native AOT Backend Models & Resilient Parsing**:
  - Extended `Service` and `ServiceOverride` entities with `List<string> Tags`.
  - Added optional `Tags` property to `CreateServiceRequest` and `UpdateServiceRequest` source-generated DTOs.
  - Implemented dual-format tag parser (`ParseTags`) supporting both JSON array string (`["Prod","DB"]`) and comma-separated tokens (`Prod, DB`) with whitespace trimming and case-insensitive deduplication.
  - Preserved Docker service overrides upon automated container rediscovery cycles.
  - Automated tag derivation from Docker container labels (`corvus.tags`, `environment`, `env`, `com.docker.compose.project`).
- **Modular Frontend Tag Architecture**:
  - `TagBadge.tsx`: Reusable deterministic badge component with dark-mode pastel palette hashing (Emerald, Cyan, Indigo, Violet, Amber, Rose, Blue, Teal, Fuchsia) and semantic environment presets.
  - `TagInput.tsx`: Interactive multi-tag input component with chip badges, Enter/comma/Tab creation, Backspace deletion, duplicate prevention, and quick-tag suggestions.
  - `TagFilterBar.tsx`: Dynamic horizontal filter bar computing real-time tag counts, allowing instant single/multi-selection or full reset ("All").
- **Services & Containers Integration**:
  - Embedded `TagInput` inside `AddServiceModal.tsx` and `EditServiceModal.tsx`.
  - Displayed clickable tag pills on `ServiceCard.tsx`, directly triggering filter bar activation.
  - Integrated `TagFilterBar` into `ServicesPage` (`Services/index.tsx`) with combined search + tag predicate filtering.
  - Rendered tag pills in `QuickServicesGrid.tsx` (Dashboard) and `ContainerList.tsx` (mobile and desktop views).
- **Comprehensive Test Coverage**: Added dedicated repository tests validating tag creation, updates, JSON/CSV parsing, and Docker override preservation (213/213 unit tests green).
- **Bilingual Synchronization**: Fully aligned Turkish and English localization strings (`tr.ts`, `en.ts`).

### Telemetry, Downsampling & Metrics Rollup (Phase 5 - Ticket 5.1)
- **Time-Series Metrics Downsampling (Hourly Rollups)**: Built an automated downsampling and compaction pipeline for system metrics, aggregating 15-second raw metrics (`system_metrics`) into hourly summary records (`system_metrics_hourly`).
- **Dual Retention Strategy**: Retains high-resolution 15-second telemetry for 7 days to preserve recent debugging granularity, while maintaining 365 days of hourly rollups. Automatically purges raw records past 7 days and hourly rollups past 365 days in `RetentionCleanupService` alongside SQLite vacuuming.
- **Unified Long-Range Query Engine**: Extended `GetRecentAsync` to support `30d`, `90d`, and `1y` (365d) time horizons. Uses an optimized SQLite CTE to read from indexed hourly rollups while on-the-fly bundling any unaggregated recent hours, delivering instant sub-second chart rendering with zero data gaps.
- **Frontend Time Horizons & Formatting**: Added `30d`, `90d`, and `1y` range filters to the System Metrics page (`SystemMetrics/index.tsx`) with dynamic date formatting and multi-day responsive tooltips.
- **Comprehensive Verification Suite**: Added 5 dedicated unit tests in `MetricsRepositoryTests.cs` verifying hourly aggregation idempotency, dual retention cleanups, and multi-range downsampling queries (all 211 tests green).

### Container Management, Web Terminal & System Prune (Phase 4 - Tickets 4.1 & 4.2)
- **Docker Image, Volume & System Prune (Ticket 4.2)**: Integrated a one-click host disk space reclamation engine communicating directly with Docker daemon prune endpoints (`/containers/prune`, `/images/prune`, `/volumes/prune`, `/networks/prune`, `/build/prune`).
- **Safe Defaults & Volume Data Protection**: Safeguarded against persistent data loss by keeping `Volumes` unselected by default, rendering an amber warning callout when selected. Offers granular image cleanup toggling between "Only dangling images" and "All unused images".
- **Modular Cleanup Interface (`SystemPruneModal.tsx`)**: Engineered an interactive cleanup dialog featuring animated execution progress and an itemized breakdown card grid detailing reclaimed bytes per category (Images, Containers, Volumes, Networks, Build Cache) along with formatted aggregate savings (`1.42 GB reclaimed`).
- **Native AOT & RBAC Endpoint**: Protected `POST /api/containers/prune` under `[RequireAdmin]` filter (403 Forbidden for viewers) and registered source-generated serialization models in `CorvusJsonSerializerContext`.
- **Container Web Terminal (Exec Shell - Ticket 4.1)**: Introduced interactive, browser-based shell access (`/bin/sh`, `/bin/bash`, `/bin/ash`, `/bin/zsh`) directly into running Docker containers without installing external daemons or agents.
- **Zero-Allocation WebSocket Proxy**: Built a high-throughput proxy endpoint `GET /api/containers/{id}/terminal` bridging browser WebSockets and hijacked Docker TTY streams. Employs `ArrayPool<byte>` static 8 KB buffer renting with zero GC allocations; upon terminal closure or tab navigation, the Docker exec PID is immediately killed, rented memory returned, and system RAM restored to baseline (30-50 MB).
- **Dynamic PTY Resizing (Control Frames)**: Automatically synchronizes terminal rows and columns with container pseudo-terminals on window resize and fullscreen toggle via JSON control frames (`{type: "resize", cols, rows}`) routed to Docker's `/exec/{id}/resize` API.
- **RBAC Security Guard**: Locked down container exec operations strictly to authenticated `admin` users via `[RequireAdmin]` endpoint filter (403 Forbidden for viewer accounts).
- **Modular Terminal Component (`ContainerTerminalModal.tsx`)**: Engineered with `@xterm/xterm` and `@xterm/addon-fit`, featuring Corvus dark theme styling, VT100/ANSI color support, fullscreen mode, clear screen, reconnect actions, and live shell switcher.
- **Action Buttons & Log Separation**: Differentiated log viewing with `ScrollText` icon from interactive terminal with `SquareTerminal` icon on `ContainerActionButtons.tsx`, active exclusively for running containers and privileged admins.

### Security & User Management (RBAC)
- **Role-Based Access Control (RBAC)**: Enforced `admin` vs `viewer` role privileges via `CorvusAuthFilter` and `RequireAdminAttribute`. `viewer` users are restricted to read-only access; mutating service/container actions, system settings updates, and backup downloads are guarded with 403 Forbidden.
- **User Management & Password Change**: Introduced SQLite `UserRepository` CRUD endpoints (`/api/users`), self-service password updates (`/api/auth/change-password`), and instant revocation of all active sessions upon user deletion (`DeleteSessionsByUsernameAsync`).
- **Modular Profile & User Management Page**: Replaced the monolithic modal with a dedicated, modular page (`/profile`). Segmented into independent components for self-service password updates (`ProfileSecurityTab.tsx`) and administrator user management (`ProfileUsersTab.tsx`, `AddUserModal.tsx`). Restored design palette consistency by replacing inconsistent purple tones with Corvus's standard Indigo system.

### Network & Monitoring Engine
- **HTTP Response Body (Keyword & Regex) Assertion**: Added payload content verification to ensure services returning HTTP 200 are genuinely healthy by asserting presence of specified keywords (`"status":"healthy"`, `status=ok`, etc.) or regular expression patterns.
- **Zero-Allocation 64 KB Memory Cap**: Instead of reading unbounded HTTP payloads into heap memory, `HttpBodyValidator` scans streams up to a strict 64 KB limit backed by `ArrayPool<byte>` buffers, guarded by a 200ms Regex evaluation timeout against ReDoS vulnerabilities.
- **ICMP Ping Monitor**: Integrated asynchronous non-blocking ICMP echo requests via `System.Net.NetworkInformation.Ping` to track packet latency (RTT) and reachability for bare devices, routers, and gateways without requiring HTTP ports. Added ICMP Ping options to Add/Edit modals, instant connectivity diagnostics on `/api/uptime/test-connection`, and cyan `ICMP PING` badges.
- **Proactive SSL/TLS Expiry Alerts**: Implemented proactive alerting dispatched to Discord (color-coded embed), Telegram, Ntfy (lock/warning priority), and Generic Webhook at 14 days and 7 days prior to certificate expiration.
- **Smart Debounce & Anti-Spam Defense**: Built level-based (14d warning vs 7d critical) daily deduplication memory into `UptimeCheckerService`; automatically resets state upon certificate renewal.
- **Service Card SSL Badges**: Added pulsing red `ShieldAlert` badge for $\le 7$ days and amber badge for $\le 14$ days on Service cards and status views.
- **Notification Event Filter**: Added `notify_ssl_expiry` toggle to Notification Settings.

### Notification Channels & Alert Discipline (Phase 3 - Tickets 3.1 & 3.2)
- **Flapping Suppression & Alert Debounce (Ticket 3.2)**: Built an intelligent alerting filter to protect on-call teams against notification floods and alert fatigue when services oscillate rapidly between UP and DOWN.
- **Sliding-Window State History (`FlappingDetector`)**: Decoupled `IFlappingDetector` service maintaining sliding-window transition timestamps per service with zero redundant allocations. Emits an initial `[FLAPPING DETECTED]` alert and suppresses intermediate notifications until the service reaches stability.
- **Stability Detection & Recovery Notification**: Lifts alert suppression and emits a single `[FLAPPING RESOLVED]` notification once a service maintains steady consecutive checks (default: 3 checks).
- **Modular Settings Card (`FlappingProtectionCard.tsx`)**: Added a dedicated settings card to configure transition threshold, sliding window duration, and recovery check count, complete with `notify_flapping_events` trigger control.
- **Email (SMTP) Notification Channel (Ticket 3.1)**: Built-in alerting engine delivering instant service down, up, and SSL alerts via standard SMTP servers (Gmail, Outlook, Resend, Brevo, AWS SES, cPanel, etc.). Includes custom From Name, port, STARTTLS support, and a responsive dark-mode HTML template.
- **Pills / Tags Multi-Recipient Input (`EmailRecipientInput`)**: Designed a modern interactive chip/pill recipient management component. Features Enter/comma addition, `x` and Backspace deletion, regex email format validation, duplicate prevention, and clipboard multi-paste parsing.
- **Slack Incoming Webhook Channel (Ticket 3.1)**: Integrated direct alerting to Slack channels with attachments layout and color-coded status indicators (Red: Down, Green: Up/Test, Amber: SSL/Flapping Alert).
- **Instant Test Actions & Native AOT Trimming Safety**: Integrated instant "Test Channel" triggers in Settings. Maintained zero external email dependencies using built-in `System.Net.Mail` without heavy third-party packages, preserving strict 30-50 MB RAM footprint and Native AOT source generation (`CorvusJsonSerializerContext`).

### Bug Fixes & UX Alignment
- **HTTP/2 SSE Protocol Error Resolved**: Fixed Chromium `net::ERR_HTTP2_PROTOCOL_ERROR` on `/api/stream/events` by removing the forbidden `Connection: keep-alive` header under HTTP/2 and HTTP/3 (RFC 7540 §8.1.2.2). Added `X-Accel-Buffering: no` and silent handling of client disconnect `IOException`s.
- **Settings Page Alignment & Layout Consistency**: Removed restrictive `max-w-4xl mx-auto` centering from the Settings page, restoring uniform full-width, left-aligned layout matching Dashboard, Services, Containers, and System Metrics pages.

### UI/UX & Responsive Experience
- **Settings Page Streamlining & De-duplication**: Removed the redundant 4-column sticky sidebar (duplicate database metrics, registration status, and static text), consolidating the settings into a modern, unified layout that fits comfortably on screen without vertical bloat. Eliminated dual save buttons and integrated version diagnostics directly into a compact header badge.
- **Resilient 401 Session Interceptor**: Centralized HTTP 401 handling across the frontend via a `corvus_unauthorized` window event; automatically prompts the user back to the authentication screen when sessions expire rather than emitting unhandled rejections.
- **Mobile Layout Streamlining**: Eliminated the redundant top header, hamburger menu, and drawer on mobile screens (`< lg`), maximizing screen estate and routing all navigation exclusively through the floating glass `BottomNav`.
- **Profile Tab in Bottom Bar**: Added dedicated profile navigation directly to mobile bottom bar for quick one-tap account access.
- **Role Label Refinement**: Standardized role terminology in Turkish locale to clean `Yönetici` and `Gözlemci`.
- **Mobile Glass Bottom Navigation Bar**: Designed and implemented a frosted glass bottom navigation bar (`BottomNav.tsx`) for mobile/tablet screens (`< lg`) featuring sliding pill indicator and expanding active tabs with safe-area notch support (`viewport-fit=cover`).
- **Complete TR/EN Bilingual Support**: Defined all new labels, modal titles, and notification strings across both `tr.ts` and `en.ts`.

### Performance & Memory
- **Aggressive Compacting Gen 2 Trimming**: Replaced `GCCollectionMode.Optimized` (which was silently skipped by .NET GC under low memory pressure) with `GCCollectionMode.Aggressive, blocking: true, compacting: true` followed by `GC.WaitForPendingFinalizers()` in `MemoryTrimmerBackgroundService` and `RetentionCleanupService`, eliminating heap fragmentation and returning uncommitted virtual pages directly to Linux kernel via `madvise`.
- **Non-Concurrent Workstation GC**: Switched `ConcurrentGarbageCollection` to `false` and set `DOTNET_gcConcurrent=0` in runtime container, preventing oversized 80MB segment reservations and forcing compact allocation profiles tailored for low-footprint containers.
- **Throttled Docker Container Deserialization**: Extended `DockerService._cachedContainers` TTL from 2.5s to 10s, slashing repetitive 48KB Docker JSON deserializations and high-churn allocations by over 75%.
- **Zero-Allocation Meminfo Streaming**: Converted `/proc/meminfo` parsing in `SystemMetricsCollector` to early-exit `StreamReader` streaming, eliminating intermediary string collections.

### Storage & Database
- **Persistent SQLite Session Store**: Implemented `user_sessions` schema and `ISessionRepository` with a hybrid write-through cache architecture in `AuthService`, ensuring authenticated user sessions survive container restarts and updates while preserving zero-allocation sub-microsecond in-memory validation speed.
- **Automatic SQLite Freelist Reclamation (VACUUM)**: Integrated automated `VACUUM;` into `RetentionCleanupService` post-retention cleanup, forcing SQLite to release orphaned freelist pages directly back to the filesystem and shrinking fragmented database files by up to 60-70%.
- **WAL Truncation Checkpoint**: Upgraded `MemoryTrimmerBackgroundService` SQLite checkpoint from `PASSIVE` to `PRAGMA wal_checkpoint(TRUNCATE);`, ensuring WAL transaction logs are reset to 0 bytes every 3 minutes.
- **Docker Log Rotation Cap**: Configured `json-file` log limits (`max-size: 10m`, `max-file: 3`) in `docker-compose.yml` to prevent runaway host container log growth.

### Tests
- Validated all 206 unit tests across the entire test suite (`Passed: 206, Failed: 0`).

---

## [1.5.18] - 2026-10-02

### Performance
- **Elastic Memory Architecture (OOM Protection)**: Removed rigid `DOTNET_GCHeapHardLimit` and csproj hard limits to prevent sudden process crashes under load spikes, enabling the runtime to dynamically adapt to variable traffic while retaining aggressive page reclamation via `DOTNET_GCConserveMemory=9`.
- **Gen 2 Non-Blocking Soft Trimming**: Upgraded periodic GC sweeps in `MemoryTrimmerBackgroundService` and `RetentionCleanupService` from `GC.Collect(1)` to `GC.Collect(2, GCCollectionMode.Optimized, blocking: false)`, ensuring promoted long-lived objects from background polling cycles are collected and uncommitted pages returned via `malloc_trim(0)`.
- **In-Memory Service & Threshold Caching in UptimeChecker**: Replaced per-tick (5s) database polling with an in-memory cache for monitored services and alert threshold settings, eliminating redundant SQLite query allocations and DI scopes during steady-state.
- **On-Demand Scope Allocation in ContainerDiscovery**: Injected singleton Docker dependencies into `ContainerDiscoveryService` and deferred DI scope instantiation exclusively to moments when a container state or URL fingerprint change is detected.

### UI/UX
- **Modern 2-Column Settings Dashboard**: Redesigned the Settings page to eliminate wide-screen empty space by introducing a responsive 2-column layout with tab pills (General & Security, Notifications, Backup) on the left and a sticky System Overview sidebar on the right featuring version status, SQLite database storage metrics, registration status, and instant quick-save controls.
- **High-Contrast Pure White Branding for Dark Themes**: Replaced dark/black logo and favicon assets with the official high-contrast pure white Hex Sentinel symbol (`corvus-white-512.png`, `corvus-white.svg`) across the Sidebar, Mobile Header, Login/Auth page, Public Status page, and browser tab favicons for maximum clarity on dark layouts.

### Tests
- Validated all 145 unit tests across the entire test suite (`Passed: 145, Failed: 0`).

---

## [1.5.17] - 2026-10-01

### 🚀 Added
- **Dual-Track CI/CD & Controlled Release Pipeline**: Migrated release architecture to the industry-standard Dual-Track model: routine pushes to `main` now continuously build `latest` Docker images and deploy without inflating semantic version tags, while official releases (`release.yml`) are triggered deliberately via Git tags (`v*`) or manual workflow dispatch with automatic `CHANGELOG.md` extraction.
- **Automated GitHub Release Notes Extraction**: Integrated automated release notes extraction that dynamically parses the latest Keep a Changelog section from `CHANGELOG.md` directly into GitHub Releases via `softprops/action-gh-release@v2`.

### ⚡ Performance
- **SQLite In-Memory Buffer Shrink (`PRAGMA shrink_memory`)**: Integrated automated execution of SQLite's native `shrink_memory` pragma into `MemoryTrimmerBackgroundService` every 3 minutes, flushing dormant page caches, B-Tree allocations, and unmanaged C-heap lookaside buffers back to the system.
- **Non-Blocking WAL Checkpoint (`PRAGMA wal_checkpoint(PASSIVE)`)**: Periodic non-blocking passive checkpoints flush uncommitted write-ahead log frames into the main database without locking active readers or background ping writers, preventing WAL and shared memory map growth.
- **Cross-Platform Working Set Trimming**: Extended `NativeMemoryTrimmer` with Windows OS support via `psapi.dll`'s `EmptyWorkingSet`, immediately releasing unreferenced physical RAM pages on Windows environments alongside Linux `malloc_trim(0)`.
- **Idle Socket Pool Eviction**: Configured `PooledConnectionIdleTimeout = TimeSpan.FromMinutes(1)` on `DockerHttpClient`'s `SocketsHttpHandler` to eagerly release dormant Unix domain socket and named pipe read/write buffers.

### 🛡️ Tests
- Elevated test suite to **145/145 Passing** by expanding `MemoryTrimmerTests` with database factory integration verification.

---

## [1.5.13] - 2026-10-01

### 🚀 Added
- **MemoryTrimmerBackgroundService**: Automated background worker running every 3 minutes that flushes pooled SQLite connections (`SqliteConnection.ClearAllPools`), executes an optimized Gen 1 GC pass, and invokes Linux libc `malloc_trim(0)` to eagerly return native memory pages to the host OS.
- **Hex Sentinel Brand Identity Kit**: Professional monochrome brand identity combining the Docker container hexagon, 'C' monogram, and vigilant raven sentinel. Full suite of scalable SVG master files, horizontal/stacked lockups, web icons, and manifest (`docs/branding/`).
- **Observability Domain-Only Quick Filter**: Added `domainOnlyWeb` quick filter toggle to the discovered services pool to isolate containers with routed HTTP/web hostnames with full bilingual i18n support.
- **Latency Badges & Truncation Tooltip**: Color-coded response time latency badges (<200ms emerald green, 200–500ms amber, >500ms rose) and tooltip error message truncation in the recent checks list.
- **xUnit Memory Test Suite**: Unit and integration tests covering the native memory trimmer and GC behavior (`MemoryTrimmerTests.cs`), elevating passing test count to 144/144.

### ⚡ Performance
- **.NET 9 Aggressive Memory Ceiling**: Configured `DOTNET_GCConserveMemory=9` for rapid virtual memory decommit (`madvise`) and enforced a 48 MB GC heap ceiling (`DOTNET_GCHeapHardLimit=0x3000000`).
- **Docker Discovery Inspect Cache (`_inspectCache`)**: Caches container environment variables by container ID and image ID to eliminate redundant Docker socket `inspect` calls on routine discovery loops.
- **State Fingerprinting (`ComputeFingerprint`)**: Hashes active container status and URL strings; skips SQLite write transactions when state remains unchanged, eliminating disk I/O churn and WAL bloat.
- **Streaming Meminfo**: Refactored host memory telemetry in `SystemMetricsCollector` to stream `/proc/meminfo` via `File.ReadLines()`, short-circuiting after `MemTotal` and `MemAvailable` without buffering the entire file.
- **Glibc Tuning**: Constrained glibc multi-threaded arena allocation via `MALLOC_TRIM_THRESHOLD_=65536` and `MALLOC_ARENA_MAX=2` in container environments.

### 🔄 Changed
- Replaced header banner on `README.md` and `README.tr.md` with the newly minted Hex Sentinel corporate identity and high-resolution typography.
- Replaced old raster PNG favicons with pure, ultra-crisp vector `favicon.svg` across web and API static distributions.
- Hardened `.gitignore` rules to prevent temporary presentation slides, test databases, and local artifacts from being tracked.
- Updated passing test badges across documentation to 144 Passing.

---

## [1.5.12] - 2026-09-29

### 🔒 Security & Authentication
- **PBKDF2 Password Hardening**: Implemented 100,000-iteration PBKDF2-HMAC-SHA256 with 16-byte cryptographic random salting and transparent automatic rehash migration for legacy accounts.
- **Brute-Force & DoS Mitigation**: In-memory rate limiting locking client IP and username after 5 failed attempts within 1 minute with temporary lockout (`HTTP 429`).
- **Reverse Proxy Header Hardening**: Added `CORVUS_TRUST_PROXY_HEADERS` with trusted IP subnet verification to prevent header spoofing in Zero-Trust SSO setups.

---

## [1.5.11] - 2026-09-28

### 🛡️ Observability & Resilience
- **Public Status Page Modernization**: 30-check interactive latency status bars, hover response time tooltips, and collapsible category accordions.
- **System Incidents & Scheduled Maintenance**: Operational incident and maintenance announcement engine (`service_incidents`) broadcasting live alert banners on the status page.
- **Intelligent 24-Hour Retention**: Hybrid cleanup engine pruning non-transition pings older than 24 hours (`is_transition = 0`) while preserving transition milestones and populating 365-day lightweight daily summaries (`uptime_daily_stats`).
- **One-Shot Docker Stats**: Consolidated batch container metrics endpoint (`GET /api/containers/stats-summary`) eliminating N+1 socket reads and delivering sub-100ms stats.

---

## [1.5.0] - 2026-09-26

### 🚀 Bilingual i18n & Clean Architecture
- **Compile-Time Typed i18n**: Native React 19 Context with zero external library overhead (~1.2 KB) supporting English and Turkish with dynamic switching.
- **Clean Architecture Refactoring**: Enforced sub-250-line page shells, extracting sub-tabs (`*Tab.tsx`), modals (`*Modal.tsx`), and API client services (`src/api/*`) into isolated modules.
- **Dual-Mode Backup Management**: One-click lock-free SQLite snapshot downloads (`VACUUM INTO`) and external curl push ping integration.
- **Mobile-First Command Center**: 2-column compact KPI strip, full-width disk storage bar, and side-by-side active container cards.
