# Corvus Web — Frontend Architecture & Developer Guide

Corvus Web is the client application for Corvus, built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS v4**. It delivers an unauthenticated public status view and a passwordless/authenticated self-hosted management dashboard with zero external UI bloat.

---

## 🏛️ Architecture & Directory Structure

Corvus Web enforces strict **Clean Architecture** and **Single Responsibility** principles:

```
src/
├── types/              # Type definitions and DTO contracts (zero implementation)
│   └── index.ts        # All API response schemas, status enums, and component prop types
├── api/                # Modular API client layer (NO fetch calls in UI components!)
│   ├── http.ts         # fetchJson, in-memory SWR cache (fetchCachedJson), invalidateCache
│   ├── auth.ts         # Session verification and login/logout endpoints
│   ├── services.ts     # Service discovery, CRUD, and reordering
│   ├── containers.ts   # Container operations, batch stats stream, and live log polling
│   ├── uptime.ts       # Endpoint checks, 3-state health, and push monitors (Dead Man's Snitch)
│   ├── metrics.ts      # Hardware telemetry time-series queries
│   ├── settings.ts     # Configuration, retention, database telemetry, and backup
│   ├── index.ts        # Unified API singleton object
│   └── client.ts       # Backward-compatible re-export layer
├── components/         # Shared global UI components ONLY
│   ├── Sidebar.tsx     # Responsive desktop rail and mobile drawer navigation
│   ├── StatusBadge.tsx # Semantic health badge (healthy, degraded, down, unknown)
│   ├── LanguageSwitch.tsx # Bilingual EN/TR language switcher
│   └── RegistrationPromptModal.tsx # Global first-admin prompt
├── pages/              # Feature-scoped views (each view has its own sub-components)
│   ├── Dashboard/      # DashboardHeader, DashboardKpis, AttentionAlerts, DockerOverviewSection, TopResourcesCard, RecentEventsCard, SystemBanner
│   ├── Containers/     # ContainerList, ComposeStackGroup, ContainerStatsBadges, ContainerLogsModal
│   ├── Services/       # Service cards, AddServiceModal, and drag-and-drop reorder list
│   ├── Uptime/         # PingUptimeTab, PushMonitorsTab, AddSnitchModal, UptimeBar
│   ├── SystemMetrics/  # Telemetry charts (Cpu, Ram, Disk) and timeframe filter
│   ├── Settings/       # GeneralSettingsTab, NotificationSettingsTab, BackupSettingsTab
│   ├── PublicStatus/   # Unauthenticated status page (/status)
│   └── AuthPage/       # Sign-in and initial registration
├── i18n/               # Compile-time type-safe localization
│   ├── en.ts           # Primary English dictionary
│   ├── tr.ts           # Turkish translation dictionary
│   ├── types.ts        # DeepStringify recursive schema types
│   └── index.tsx       # I18nProvider context and useI18n hook
├── utils/              # Pure utility functions
│   ├── url.ts          # URL parsing, host sanitation, and protocol inference
│   ├── format.ts       # Human-readable byte formatting (B, KB, MB, GB, TB)
│   └── grouping.ts     # Docker Compose stack grouping and orphan container segregation
├── App.tsx             # Root router, React.lazy code-splitting, and global SSE subscriber
└── main.tsx            # React 19 entry point
```

---

## 🛑 Strict Modularity Rules (Clean Code Standard)

1. **Zero Monoliths:** No single file may act as a catch-all container. Large pages must be divided into focused sub-components under their feature directory (`pages/<Feature>/`).
2. **Centralized API Service:** UI components **never** perform raw `fetch()` calls. All backend calls go through `api.*` methods in `src/api/` with strict TypeScript return types.
3. **In-Memory SWR Micro-Caching:** Repeated queries across quick tab transitions leverage `fetchCachedJson()` in `src/api/http.ts`, keeping client heap and network traffic minimal. Mutations immediately call `invalidateCache()`.
4. **Lifecycle & SSE Hygiene:** Asynchronous updates and Server-Sent Event (`corvus_event`) handlers must check mounted lifecycle state via `isMountedRef` to prevent memory leaks and state updates after component unmounting.
5. **Pure Utilities:** Logic for data manipulation, formatting, and string transformations belongs in `src/utils/`, covered by unit-testable signatures.

---

## ⚡ Development & Scripts

### Prerequisites
- Node.js 20+
- npm or pnpm

### Commands

```bash
# Install dependencies
npm install

# Run Vite development server (proxies /api to ASP.NET Core backend)
npm run dev

# Typecheck and build production bundle into ../Corvus.Api/wwwroot
npm run build

# Preview production build locally
npm run preview
```

### Production Bundling
Vite is configured with `manualChunks` to split vendor dependencies (React, Recharts) into separate chunks, ensuring the initial entry payload stays under **200 KB** for fast load times even on slow mobile networks.
