# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
