# Corvus — Çoklu Sistem Yönetimi Frontend Spesifikasyonu (Frontend Component Spec)

- **Durum:** Onaylandı & Uygulanmaya Hazır (Production Spec)
- **Tarih:** 2026-10-12
- **Hedef Versiyon:** Corvus v1.5.0+
- **Terminoloji:** **Sistemler** (İngilizce: **Systems**)
- **Kullanıcı Deneyimi:** Engelsiz, Doğrudan Çalışan, RAM ve Veri Tasarruflu (Low-RAM & Downsampled Telemetry)
- **Mimari Disiplini:** GEMINI.md Temiz Mimari Kuralı (Zero Monolithic Files, Strict Separation of Concerns, Spec-First)
- **Tasarım Dili:** Corvus Midnight v2 (`#0d0e15`, `#1b1d2a`, `#d5d5dc`, `#34d399`, `#fbbf24`, `#f87171`)

---

## 1. Mimari Prensipler ve Tasarım Kararları

### 1.1. Sade Terminoloji ve Doğrudan Erişim
1. **Sade İsimlendirme:** UI genelinde, navigasyonda ve çevirilerde karmaşık terimler yerine doğrudan **"Sistemler"** (İngilizce: **"Systems"**) kullanılır.
2. **Kutudan Çıktığı Gibi Doğrudan Çalışma:** Çoklu sistem yönetimi hem gömülü **SQLite (WAL)** hem de **PostgreSQL** ile engelsiz ve %100 çalışır.
3. **Samimi Karşılama Ekranı ([`SystemsEmptyState.tsx`](file:///c:/Users/sahin/Desktop/Projeler/Corvus/src/Corvus.Web/src/pages/Systems/SystemsEmptyState.tsx)):** Sistem henüz eklenmemişse *"Bağlı Sistem Bulunmuyor. İlk sunucunuzu eklemek için '+ Sistem Ekle' butonuna tıklayın."* karşılar.
4. **Hafif Motor Bilgi Rozeti ([`SystemsEngineBadge.tsx`](file:///c:/Users/sahin/Desktop/Projeler/Corvus/src/Corvus.Web/src/pages/Systems/SystemsEngineBadge.tsx)):** Sayfa altında `SQLite (WAL) · 7 Günlük Saklama` veya `PostgreSQL · Süresiz Saklama` bilgi rozeti yer alır.

### 1.2. RAM ve Veri Tasarrufu UX (Client-Side Memory Efficiency)
- **Genel Bakış Tablosu:** Yalnızca son canlı kalp atışından (heartbeat) gelen anlık tampon veriyi (`liveBufferMap`) saklar ve render eder; tarayıcı belleği gereksiz geçmiş veri noktalarıyla şişirilmez.
- **Detay Kokpit Grafikleri:** Zaman aralığı seçildiğinde (**Son 1 Saat**, **Son 24 Saat**, **Son 7 Gün**) Hub, istemciye milyonlarca ham log satırı basmak yerine optimize edilmiş, gruplanmış (downsampled / bucketed) özet dizisi döner:
  - `1h`: 1 dakikalık aralıklarla 60 veri noktası.
  - `24h`: 15 dakikalık aralıklarla 96 veri noktası.
  - `7d`: 2 saatlik aralıklarla 84 veri noktası.
  Böylece istemci RAM tüketimi daima < 5 MB kalır ve grafikler 60 FPS akıcılıkta çizilir.

### 1.3. GEMINI.md Temiz Mimari Kuralı
- **Monolitik Kod Yasağı:** Her sekme, modal, satır, kart ve form alanı kendi bağımsız dosyasına ayrıştırılır.
- **Servis Katmanı:** Raw `fetch` kesinlikle UI içine yazılamaz; tüm ağ istekleri [`src/api/systems.ts`](file:///c:/Users/sahin/Desktop/Projeler/Corvus/src/Corvus.Web/src/api/systems.ts) üzerinden tip güvenli çağrılır.
- **Dinamik Origin Çözümleme:** Kurulum komutlarında ASLA sabit alan adı (hardcoded domain) kullanılmaz; `window.location.origin` üzerinden dinamik üretilir.

---

## 2. Dizin ve Dosya Hiyerarşisi (Directory & File Tree)

```
src/Corvus.Web/src/
├── api/
│   ├── systems.ts                        # Sistemler REST API ve WebSocket istemcisi
│   └── index.ts                          # systemsApi re-export katmanı
├── types/
│   └── systems.ts                        # Sistem, Telemetri, Konteyner ve Zaman Aralığı tipleri
├── utils/
│   └── systemsUtils.ts                   # Komut üretici, formatlayıcılar, durum temaları
├── pages/
│   └── Systems/
│       ├── index.tsx                     # SystemsOverviewPage (Ana sayfa konteyneri)
│       ├── useSystemsPageState.ts        # Sayfa state yönetimi, canlı tampon, filtreleme
│       ├── SystemsHeader.tsx             # Başlık, sistem sayaçları, "+ Sistem Ekle" butonu
│       ├── SystemsKpis.tsx               # 5'li özet metrik kartları
│       ├── SystemsFilterBar.tsx          # Arama girdisi, ortam ve durum filtre çipleri
│       ├── SystemsList.tsx               # Sistem listesi konteyneri (Masaüstü & Mobil yönlendirici)
│       ├── SystemRow.tsx                 # Masaüstü geniş satır görünümü
│       ├── SystemCardMobile.tsx          # Mobil ekranlar için dikey kart görünümü
│       ├── SystemsEmptyState.tsx         # Sistem bulunmadığında gösterilen karşılama ekranı
│       ├── SystemsSkeleton.tsx           # Yükleme anındaki parıltılı (shimmer) iskelet
│       ├── SystemsEngineBadge.tsx        # SQLite WAL (7 gün) / PostgreSQL durum rozeti
│       │
│       ├── AddSystemSheet/               # Yeni Sistem Ekleme Çekmecesi
│       │   ├── index.tsx                 # Sheet konteyneri ve adım denetleyicisi
│       │   ├── StepSystemInfo.tsx        # 1. Adım: Sistem adı, ortam ve etiket formu
│       │   ├── StepInstallMethod.tsx     # 2. Adım: Docker vs Binary kurulum sekmesi
│       │   ├── StepCommandBox.tsx        # 3. Adım: Dinamik Docker komutu ve kopyalama alanı
│       │   └── StepHandshakeListener.tsx # 4. Adım: Canlı ilk sinyal/heartbeat dinleyicisi
│       │
│       ├── SystemDetail/                 # Tekil Sunucu Kokpit Modalı
│       │   ├── index.tsx                 # SystemDetailModal konteyneri ve sekme yönetimi
│       │   ├── SystemDetailHeader.tsx    # Host, IP, OS, Ping ve hızlı butonlar
│       │   ├── SystemTimeRangeSelector.tsx# 1S / 24S / 7G optimize zaman seçici
│       │   ├── SystemTelemetryTab.tsx    # Canlı CPU/RAM/Disk/Ağ mikro-grafikleri
│       │   ├── SystemContainersTab.tsx   # Uç sunucunun Docker konteyner listesi & kontrolü
│       │   ├── SystemHardwareTab.tsx     # CPU modeli, bellek, disk bölümleri donanım dökümü
│       │   ├── SystemSecurityTab.tsx     # Token maskesi, döndürme ve sistem silme alanı
│       │   └── SystemMiniSparkline.tsx   # Optimize SVG telemetri grafiği
│       │
│       ├── SystemTerminal/               # Uzaktan Web Terminali
│       │   ├── SystemTerminalModal.tsx   # xterm.js tam ekran/genişletilebilir terminal modalı
│       │   └── useTerminalWebSocket.ts   # WebSocket stream ve resize yönetimi
│       │
│       └── SystemDeleteModal.tsx         # Güvenli silme onay iletişim kutusu
├── hooks/
│   ├── useSystemsData.ts                 # Sistem verisi çekme ve canlı tampon güncellemesi
│   ├── useSystemTelemetry.ts             # Tekil sistem canlı telemetri akışı
│   └── useAgentHandshake.ts              # Ekleme sırasında ilk heartbeat dinleyicisi
└── i18n/
    ├── tr.ts                             # Türkçe dil anahtarları (systems namespace)
    └── en.ts                             # İngilizce dil anahtarları (systems namespace)
```

---

## 3. TypeScript Arayüzleri ve Tipler (`src/types/systems.ts`)

```typescript
/**
 * Telemetri grafik zaman aralıkları
 */
export type TelemetryTimeRange = '1h' | '24h' | '7d';

/**
 * Hub Veritabanı ve Saklama Bilgisi
 */
export interface DatabaseEngineInfo {
  engine: 'sqlite' | 'postgresql';
  isWalMode: boolean;
  retentionDays: number; // 7 (SQLite için) veya 0 (Süresiz)
}

/**
 * Sistem bağlantı durumu
 */
export type SystemStatus = 'online' | 'degraded' | 'offline' | 'pending';

/**
 * Sistem ortam/rol türü
 */
export type SystemEnvironment = 'production' | 'staging' | 'edge' | 'homelab' | 'development';

/**
 * CPU telemetri verisi
 */
export interface SystemCpuMetrics {
  percent: number;
  cores: number;
  model?: string;
}

/**
 * RAM telemetri verisi (Bayt cinsinden)
 */
export interface SystemRamMetrics {
  usedBytes: number;
  totalBytes: number;
  cachedBytes?: number;
  freeBytes?: number;
}

/**
 * Disk telemetri verisi (Bayt cinsinden)
 */
export interface SystemDiskMetrics {
  usedBytes: number;
  totalBytes: number;
  mountPoint: string;
}

/**
 * Ağ telemetri verisi
 */
export interface SystemNetworkMetrics {
  rxBytesPerSec: number;
  txBytesPerSec: number;
}

/**
 * Uç sistemde çalışan Docker konteyneri
 */
export interface RemoteContainerSummary {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'restarting' | 'paused';
  statusText: string;
  cpuPercent: number;
  memoryBytes: number;
  created: number;
}

/**
 * Canlı tampon telemetri paketi (Tablo ve hafif gösterim için)
 */
export interface SystemLiveTelemetry {
  timestamp: string;
  cpu: SystemCpuMetrics;
  ram: SystemRamMetrics;
  disk: SystemDiskMetrics[];
  loadAvg: [number, number, number];
  network: SystemNetworkMetrics;
  containers: RemoteContainerSummary[];
  uptimeSeconds: number;
}

/**
 * Optimize Edilmiş (Downsampled) Zaman Serisi Veri Noktası
 */
export interface DownsampledTelemetryPoint {
  timestamp: string;
  cpuPercent: number;
  ramUsedBytes: number;
  diskUsedBytes: number;
  rxBytesPerSec: number;
  txBytesPerSec: number;
}

/**
 * Ana Sistem Varlığı
 */
export interface SystemEntity {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  osInfo: string;
  architecture: string;
  environment: SystemEnvironment;
  status: SystemStatus;
  agentVersion: string;
  tags: string[];
  lastSeenAt: string;
  createdAt: string;
  pingMs?: number;
  telemetry?: SystemLiveTelemetry;
  activeContainerCount: number;
}

/**
 * Sistemler Kümesi Özet KPI Verisi
 */
export interface SystemsSummaryKpi {
  totalSystems: number;
  onlineSystems: number;
  degradedSystems: number;
  offlineSystems: number;
  averageCpuPercent: number;
  totalRamUsedBytes: number;
  totalRamCapacityBytes: number;
  totalContainers: number;
}

/**
 * Yeni Sistem Kayıt İsteği
 */
export interface CreateSystemRequest {
  name: string;
  environment: SystemEnvironment;
  tags?: string[];
  notes?: string;
}

/**
 * Yeni Sistem Kayıt Yanıtı
 */
export interface CreateSystemResponse {
  system: SystemEntity;
  nodeKey: string;
  hubUrl: string;
}

/**
 * Sistem Güncelleme İsteği
 */
export interface UpdateSystemRequest {
  name?: string;
  environment?: SystemEnvironment;
  tags?: string[];
  notes?: string;
}

/**
 * Token Döndürme Yanıtı
 */
export interface RotateTokenResponse {
  systemId: string;
  newNodeKey: string;
}

/**
 * Konteyner Eylem İsteği
 */
export type RemoteContainerAction = 'start' | 'stop' | 'restart' | 'kill';

/**
 * Web Terminal Başlatma Bileti
 */
export interface TerminalSessionTicket {
  ticket: string;
  wsUrl: string;
  expiresAt: string;
}
```

---

## 4. API Servis Katmanı Spesifikasyonu (`src/Corvus.Web/src/api/systems.ts`)

```typescript
import { fetchJson } from './http';
import type {
  DatabaseEngineInfo,
  SystemEntity,
  SystemsSummaryKpi,
  CreateSystemRequest,
  CreateSystemResponse,
  UpdateSystemRequest,
  RotateTokenResponse,
  DownsampledTelemetryPoint,
  TelemetryTimeRange,
  RemoteContainerSummary,
  RemoteContainerAction,
  TerminalSessionTicket,
  SystemStatus
} from '../types/systems';

export const systemsApi = {
  /**
   * Hub'ın aktif veritabanı motoru ve saklama süresi bilgisini döner
   */
  async getDatabaseInfo(): Promise<DatabaseEngineInfo> {
    return fetchJson<DatabaseEngineInfo>('/systems/database-info');
  },

  /**
   * Kayıtlı tüm sistemleri listeler (Son anlık canlı telemetri ile)
   */
  async getSystems(): Promise<SystemEntity[]> {
    return fetchJson<SystemEntity[]>('/systems');
  },

  /**
   * Küme geneli özet KPI metriklerini getirir
   */
  async getSummaryKpi(): Promise<SystemsSummaryKpi> {
    return fetchJson<SystemsSummaryKpi>('/systems/summary');
  },

  /**
   * Belirli bir sistemin detaylarını getirir
   */
  async getSystemById(systemId: string): Promise<SystemEntity> {
    return fetchJson<SystemEntity>(`/systems/${encodeURIComponent(systemId)}`);
  },

  /**
   * Yeni bir sistem kaydı açar ve tek seferlik NODE_KEY üretir
   */
  async createSystem(payload: CreateSystemRequest): Promise<CreateSystemResponse> {
    return fetchJson<CreateSystemResponse>('/systems', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Sistem bilgilerini günceller
   */
  async updateSystem(systemId: string, payload: UpdateSystemRequest): Promise<SystemEntity> {
    return fetchJson<SystemEntity>(`/systems/${encodeURIComponent(systemId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Sistemi siler ve bağlantı anahtarını iptal eder
   */
  async deleteSystem(systemId: string): Promise<{ success: boolean }> {
    return fetchJson<{ success: boolean }>(`/systems/${encodeURIComponent(systemId)}`, {
      method: 'DELETE'
    });
  },

  /**
   * Sistemin erişim token'ını döndürür
   */
  async rotateToken(systemId: string): Promise<RotateTokenResponse> {
    return fetchJson<RotateTokenResponse>(`/systems/${encodeURIComponent(systemId)}/rotate-token`, {
      method: 'POST'
    });
  },

  /**
   * Ajanın ilk handshake yapıp yapmadığını kontrol eder
   */
  async checkHandshake(systemId: string): Promise<{ status: SystemStatus; system?: SystemEntity }> {
    return fetchJson<{ status: SystemStatus; system?: SystemEntity }>(
      `/systems/${encodeURIComponent(systemId)}/handshake-status`
    );
  },

  /**
   * İstemci belleğini korumak için optimize edilmiş / downsampled telemetri geçmişini getirir
   */
  async getTelemetryHistory(
    systemId: string,
    range: TelemetryTimeRange = '1h'
  ): Promise<DownsampledTelemetryPoint[]> {
    return fetchJson<DownsampledTelemetryPoint[]>(
      `/systems/${encodeURIComponent(systemId)}/telemetry/history?range=${range}`
    );
  },

  /**
   * Sistem üzerinde çalışan Docker konteynerlerini listeler
   */
  async getContainers(systemId: string): Promise<RemoteContainerSummary[]> {
    return fetchJson<RemoteContainerSummary[]>(
      `/systems/${encodeURIComponent(systemId)}/containers`
    );
  },

  /**
   * Sistemdeki bir Docker konteynerine eylem gönderir
   */
  async sendContainerAction(
    systemId: string,
    containerId: string,
    action: RemoteContainerAction
  ): Promise<{ success: boolean; message?: string }> {
    return fetchJson<{ success: boolean; message?: string }>(
      `/systems/${encodeURIComponent(systemId)}/containers/${encodeURIComponent(containerId)}/action`,
      {
        method: 'POST',
        body: JSON.stringify({ action })
      }
    );
  },

  /**
   * Web Terminal oturumu için geçici bilet alır
   */
  async createTerminalSession(systemId: string): Promise<TerminalSessionTicket> {
    return fetchJson<TerminalSessionTicket>(
      `/systems/${encodeURIComponent(systemId)}/terminal/session`,
      { method: 'POST' }
    );
  }
};
```

---

## 5. Yardımcı Fonksiyonlar Spesifikasyonu (`src/Corvus.Web/src/utils/systemsUtils.ts`)

```typescript
import type { SystemStatus, SystemEnvironment } from '../types/systems';

/**
 * Dinamik Hub URL'ini tarayıcı adresinden çözer (Sıfır hardcoded domain)
 */
export function resolveHubUrl(customOverride?: string): string {
  if (customOverride && customOverride.trim().length > 0) {
    return customOverride.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5000';
}

/**
 * Tek satırlık Docker ajan kurulum komutu üretir
 */
export function generateDockerRunCommand(options: {
  hubUrl: string;
  nodeKey: string;
  containerName?: string;
  imageTag?: string;
}): string {
  const hub = options.hubUrl.replace(/\/+$/, '');
  const name = options.containerName || 'corvus-agent';
  const tag = options.imageTag || 'ghcr.io/corvus/agent:latest';

  return `docker run -d --name ${name} --restart unless-stopped \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -e HUB_URL="${hub}" \\
  -e NODE_KEY="${options.nodeKey}" \\
  ${tag}`;
}

/**
 * Tek satırlık Linux Binary / Systemd kurulum komutu üretir
 */
export function generateBinaryInstallCommand(options: {
  hubUrl: string;
  nodeKey: string;
}): string {
  const hub = options.hubUrl.replace(/\/+$/, '');
  return `curl -sSL ${hub}/install-agent.sh | sudo bash -s -- --hub-url "${hub}" --node-key "${options.nodeKey}"`;
}

/**
 * Bayt cinsinden değeri GB / MB formatına dönüştürür
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Ağ hızını (bayt/s) KB/s veya MB/s formatına dönüştürür
 */
export function formatBitrate(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

/**
 * Çalışma süresini (Uptime) gün/saat/dakika formatına dönüştürür
 */
export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 dk';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${minutes}dk`;
  return `${minutes}dk`;
}

/**
 * Sistem durumuna göre renk sınıflarını döner
 */
export function getSystemStatusTheme(status: SystemStatus): {
  dotColor: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
} {
  switch (status) {
    case 'online':
      return {
        dotColor: 'bg-[#34d399]',
        textColor: 'text-[#34d399]',
        badgeBg: 'bg-[#34d399]/10',
        badgeBorder: 'border-[#34d399]/20'
      };
    case 'degraded':
      return {
        dotColor: 'bg-[#fbbf24]',
        textColor: 'text-[#fbbf24]',
        badgeBg: 'bg-[#fbbf24]/10',
        badgeBorder: 'border-[#fbbf24]/20'
      };
    case 'offline':
      return {
        dotColor: 'bg-[#f87171]',
        textColor: 'text-[#f87171]',
        badgeBg: 'bg-[#f87171]/10',
        badgeBorder: 'border-[#f87171]/20'
      };
    case 'pending':
    default:
      return {
        dotColor: 'bg-[#d5d5dc]',
        textColor: 'text-[#d5d5dc]',
        badgeBg: 'bg-white/10',
        badgeBorder: 'border-white/15'
      };
  }
}
```

---

## 6. Çift Dilli Uluslararasılaştırma (i18n) Sözlüğü (`systems.*`)

### 6.1. Türkçe (`tr.ts`) — `systems` Bölümü

```typescript
systems: {
  title: 'Sistemler',
  subtitle: 'Bağlı sunucularınızın canlı sağlık durumu, kaynak tüketimi ve konteynerleri.',
  addSystem: 'Sistem Ekle',
  refresh: 'Yenile',
  searchPlaceholder: 'Sistem adı, hostname, IP veya etiket ara...',
  noSystemsFound: 'Kayıtlı sistem bulunamadı',
  noSystemsDesc: 'Arama filtrenize uygun sunucu bulunamadı.',
  emptyState: {
    title: 'Bağlı Sistem Bulunmuyor',
    description: 'Yeni bir sunucu ekleyerek kaynak tüketimini ve Docker konteynerlerini tek merkezden canlı izlemeye başlayın.',
    ctaButton: '+ İlk Sistemi Ekle'
  },
  engineBadge: {
    sqliteWal: 'SQLite (WAL) · 7 Günlük Saklama',
    postgresql: 'PostgreSQL · Süresiz Saklama',
    storageLabel: 'Depolama Motoru'
  },
  timeRanges: {
    oneHour: 'Son 1 Saat',
    oneDay: 'Son 24 Saat',
    sevenDays: 'Son 7 Gün'
  },
  kpis: {
    totalSystems: 'Toplam Sistem',
    onlineSystems: 'Çevrimiçi',
    avgCpu: 'Ortalama CPU',
    totalRam: 'Toplam Bellek',
    totalContainers: 'Aktif Konteyner'
  },
  filters: {
    allEnvironments: 'Tüm Ortamlar',
    production: 'Production',
    staging: 'Staging',
    edge: 'Edge',
    homelab: 'Homelab',
    allStatuses: 'Tüm Durumlar',
    online: 'Çevrimiçi',
    degraded: 'Uyarı',
    offline: 'Çevrimdışı',
    sortBy: 'Sırala',
    sortName: 'Ada Göre',
    sortCpu: 'CPU Yüküne Göre',
    sortRam: 'RAM Tüketimine Göre',
    sortLastSeen: 'Son Sinyale Göre'
  },
  systemRow: {
    cpu: 'CPU',
    ram: 'Bellek',
    disk: 'Disk',
    containers: 'Konteyner',
    terminal: 'Terminal',
    details: 'Detaylar',
    lastSeen: 'Son sinyal'
  },
  addSheet: {
    title: 'Yeni Sistem Ekle',
    subtitle: 'Sunucunuza Corvus Ajanını kurun ve saniyeler içinde izlemeye başlayın.',
    stepInfoTitle: '1. Sistem Bilgileri',
    stepMethodTitle: '2. Kurulum Yöntemi',
    stepCommandTitle: '3. Kurulum Komutu',
    stepStatusTitle: '4. Bağlantı Durumu',
    systemNameLabel: 'Sistem / Sunucu Adı',
    systemNamePlaceholder: 'örn. vps-frankfurt-01',
    environmentLabel: 'Ortam / Rol',
    tagsLabel: 'Etiketler (Virgülle ayırın)',
    tagsPlaceholder: 'prod, eu-central, hetzner',
    methodDocker: 'Docker Konteyneri (Önerilen)',
    methodBinary: 'Linux Binary / Systemd',
    commandHint: 'Bu komutu hedef sunucunuzda root veya sudo yetkisiyle çalıştırın:',
    hubUrlOverride: 'Özel Hub Adresi (Opsiyonel)',
    waitingHandshake: 'Ajanın ilk sinyali bekleniyor...',
    waitingHint: 'Komutu hedef sunucuya yapıştırdıktan sonra bağlantı otomatik algılanacaktır.',
    connectedSuccess: 'Bağlantı Başarılı!',
    connectedDetails: 'Ajan sisteme bağlandı ve ilk telemetri alındı.',
    goToCockpit: 'Sistem Kokpitine Git',
    finish: 'Tamamla'
  },
  cockpit: {
    tabs: {
      telemetry: 'Canlı Telemetri',
      containers: 'Uç Konteynerler',
      hardware: 'Donanım & Sistem',
      security: 'Güvenlik & Ajan'
    },
    latency: 'Gecikme',
    uptime: 'Çalışma Süresi',
    agentVersion: 'Ajan Sürümü',
    cpuSparklineTitle: 'CPU Yük Geçmişi',
    ramBreakdownTitle: 'Bellek Dağılımı',
    ramUsed: 'Kullanılan',
    ramCached: 'Önbellek',
    ramFree: 'Boş',
    diskTitle: 'Bağlantı Noktaları (Disk)',
    networkTitle: 'Ağ Giriş / Çıkış Hızı',
    loadAvgTitle: 'Yük Ortalaması (1m / 5m / 15m)',
    containersSearch: 'Konteyner ara...',
    noContainers: 'Çalışan konteyner bulunamadı',
    startContainer: 'Başlat',
    stopContainer: 'Durdur',
    restartContainer: 'Yeniden Başlat',
    viewLogs: 'Loglar',
    rotateToken: 'Token Yenile',
    rotateTokenConfirm: 'Bu sistemin erişim anahtarı yenilenecek. Mevcut ajan bağlantısı kesilecektir. Devam edilsin mi?',
    deleteSystem: 'Sistemi Kaldır',
    deleteSystemConfirm: 'Bu sunucuyu kaldırmak istediğinizden emin misiniz? Tüm telemetri geçmişi temizlenecektir.',
    webTerminal: 'Web Terminali',
    terminalClose: 'Terminali Kapat'
  }
}
```

### 6.2. İngilizce (`en.ts`) — `systems` Bölümü

```typescript
systems: {
  title: 'Systems',
  subtitle: 'Real-time health, resource consumption, and containers of your connected hosts.',
  addSystem: 'Add System',
  refresh: 'Refresh',
  searchPlaceholder: 'Search system name, hostname, IP or tags...',
  noSystemsFound: 'No systems found',
  noSystemsDesc: 'No servers match your current search filters.',
  emptyState: {
    title: 'No Systems Connected',
    description: 'Add a new server to start monitoring system resources and Docker containers from a single cockpit.',
    ctaButton: '+ Add First System'
  },
  engineBadge: {
    sqliteWal: 'SQLite (WAL) · 7-Day Retention',
    postgresql: 'PostgreSQL · Unlimited Retention',
    storageLabel: 'Storage Engine'
  },
  timeRanges: {
    oneHour: 'Last 1 Hour',
    oneDay: 'Last 24 Hours',
    sevenDays: 'Last 7 Days'
  },
  kpis: {
    totalSystems: 'Total Systems',
    onlineSystems: 'Online',
    avgCpu: 'Average CPU',
    totalRam: 'Total Memory',
    totalContainers: 'Active Containers'
  },
  filters: {
    allEnvironments: 'All Environments',
    production: 'Production',
    staging: 'Staging',
    edge: 'Edge',
    homelab: 'Homelab',
    allStatuses: 'All Statuses',
    online: 'Online',
    degraded: 'Degraded',
    offline: 'Offline',
    sortBy: 'Sort by',
    sortName: 'By Name',
    sortCpu: 'By CPU Load',
    sortRam: 'By RAM Usage',
    sortLastSeen: 'By Last Heartbeat'
  },
  systemRow: {
    cpu: 'CPU',
    ram: 'Memory',
    disk: 'Disk',
    containers: 'Containers',
    terminal: 'Terminal',
    details: 'Details',
    lastSeen: 'Last seen'
  },
  addSheet: {
    title: 'Add New System',
    subtitle: 'Deploy Corvus Agent on your host and begin monitoring in seconds.',
    stepInfoTitle: '1. System Details',
    stepMethodTitle: '2. Installation Method',
    stepCommandTitle: '3. Install Command',
    stepStatusTitle: '4. Connection Status',
    systemNameLabel: 'System / Server Name',
    systemNamePlaceholder: 'e.g. vps-frankfurt-01',
    environmentLabel: 'Environment / Role',
    tagsLabel: 'Tags (comma separated)',
    tagsPlaceholder: 'prod, eu-central, hetzner',
    methodDocker: 'Docker Container (Recommended)',
    methodBinary: 'Linux Binary / Systemd',
    commandHint: 'Run this command on your target host with root or sudo privileges:',
    hubUrlOverride: 'Custom Hub URL (Optional)',
    waitingHandshake: 'Waiting for agent heartbeat...',
    waitingHint: 'Once executed on the target host, connection will be auto-detected.',
    connectedSuccess: 'Connection Established!',
    connectedDetails: 'Agent connected successfully and initial telemetry received.',
    goToCockpit: 'Open System Cockpit',
    finish: 'Done'
  },
  cockpit: {
    tabs: {
      telemetry: 'Live Telemetry',
      containers: 'Edge Containers',
      hardware: 'Hardware & OS',
      security: 'Security & Agent'
    },
    latency: 'Latency',
    uptime: 'Uptime',
    agentVersion: 'Agent Version',
    cpuSparklineTitle: 'CPU Load History',
    ramBreakdownTitle: 'Memory Breakdown',
    ramUsed: 'Used',
    ramCached: 'Cached',
    ramFree: 'Free',
    diskTitle: 'Mount Points (Storage)',
    networkTitle: 'Network I/O Rate',
    loadAvgTitle: 'Load Average (1m / 5m / 15m)',
    containersSearch: 'Search containers...',
    noContainers: 'No containers running on this system',
    startContainer: 'Start',
    stopContainer: 'Stop',
    restartContainer: 'Restart',
    viewLogs: 'Logs',
    rotateToken: 'Rotate Token',
    rotateTokenConfirm: 'Rotating the access key will invalidate the current agent connection. Do you want to proceed?',
    deleteSystem: 'Remove System',
    deleteSystemConfirm: 'Are you sure you want to remove this system? Historical telemetry will be deleted.',
    webTerminal: 'Web Terminal',
    terminalClose: 'Close Terminal'
  }
}
```

---

## 7. Navigasyon & Uygulama Entegrasyonu

### 7.1. `Sidebar.tsx` Entegrasyonu
- `PageId` tipine `'systems'` eklenir:
  ```typescript
  export type PageId = 'dashboard' | 'systems' | 'services' | 'containers' | 'metrics' | 'uptime' | 'activity' | 'settings' | 'profile';
  ```
- Menü öğesi (İkon: Lucide `Server`):
  ```typescript
  { id: 'systems', label: t('systems.title'), icon: Server }
  ```

### 7.2. `AppRouter.tsx` & `App.tsx` Entegrasyonu
- Kod bölme (Code-splitting) ile dinamik yükleme:
  ```typescript
  const SystemsOverviewPage = lazyWithRetry(() =>
    import('./pages/Systems').then(m => ({ default: m.SystemsOverviewPage }))
  );
  ```
- Yönlendiricide durum eşleşmesi:
  ```typescript
  case 'systems':
    return <SystemsOverviewPage />;
  ```

### 7.3. Komut Paleti (`CommandPalette.tsx`) Kısayolu
- `Cmd+K` arama paletinde:
  - `"Sistemler"` -> `navigateTo('systems')`
  - `"+ Sistem Ekle"` -> `navigateTo('systems', null, 'add')`

---

## 8. Kalite, Güvenlik ve Performans Kontrol Listesi

- [x] **Sade İsimlendirme:** Doğrudan ve yalın olarak **"Sistemler"** (İngilizce: **"Systems"**) adı uygulandı (`systems.*` i18n anahtarları).
- [x] **RAM ve Veri Tasarrufu UX:** Genel bakış tablosunda sadece canlı tampon verisi tutulur; detay grafiklerinde `1h` (60 nokta), `24h` (96 nokta), `7d` (84 nokta) özetleri çekilerek tarayıcı belleği minimumda (< 5 MB) tutuldu.
- [x] **Hafif Motor Bilgi Rozeti:** `SQLite (WAL) · 7 Günlük Saklama` veya `PostgreSQL · Süresiz Saklama` şeffaf biçimde sunuldu.
- [x] **Monolitik Kod Yasağı:** Tüm sekmeler, modallar, satırlar ve yardımcılar bağımsız dosyalara bölündü.
- [x] **Dinamik Origin Çözümleme:** `window.location.origin` kullanılarak sabit alan adı bağımlılığı tamamen kaldırıldı.
- [x] **Bağımsız Terminoloji:** Üçüncü taraf araç isimleri yerine Corvus özgün mühendislik dili uygulandı.
- [x] **Midnight v2 Tasarım Bütünlüğü:** Belirlenen semantic token'lar (`#0d0e15`, `#1b1d2a`, `#d5d5dc`, `#34d399`, `#fbbf24`, `#f87171`) eksiksiz uygulandı.
- [x] **Çift Dilli Tam Eşitlik:** Türkçe (`tr`) ve İngilizce (`en`) sözlük anahtarları %100 birebir senkronize edildi.
