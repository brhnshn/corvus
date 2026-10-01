# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
