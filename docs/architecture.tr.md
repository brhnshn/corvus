<div align="center">

[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](architecture.md)
[![Türkçe](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red?style=for-the-badge)](architecture.tr.md)

</div>

# Corvus — Klasör ve Sistem Mimarisi

Bu doküman, Corvus'un güncel dosya ve katman mimarisini, servislerini, temiz mimari standartlarını ve veri akışını belgeler.

---

## 📁 Dizin Yapısı

```
corvus/
├── docker-compose.yml
├── Dockerfile                    # Multi-stage: Frontend build + .NET 9 AOT build + minimal runtime
├── README.md                     # Proje genel bakışı ve hızlı başlangıç (İngilizce)
├── README.tr.md                  # Proje genel bakışı ve hızlı başlangıç (Türkçe)
├── CONTRIBUTING.md               # Katkı sağlama ve mimari kılavuzu (İngilizce)
├── CONTRIBUTING.tr.md            # Katkı sağlama ve mimari kılavuzu (Türkçe)
├── LICENSE
│
├── src/
│   ├── Corvus.Api/                # Backend — ASP.NET Core Minimal API, .NET 9 Native AOT
│   │   ├── Program.cs             # Uygulama girişi, DI ve Minimal API orkestrasyonu (113 satır)
│   │   ├── Corvus.Api.csproj      # Native AOT, Dapper.AOT, System.GC.ConserveMemory=5
│   │   ├── Endpoints/             # Kaynak odaklı Minimal API uç noktaları (extension metodlar)
│   │   │   ├── AuthEndpoints.cs          # Session auth, kayıt yönetimi ve Zero-Trust SSO
│   │   │   ├── BackupEndpoints.cs        # Tek tıkla SQLite VACUUM INTO anlık yedek indirme
│   │   │   ├── ContainersEndpoints.cs    # Containers, /stats, /stats-summary (toplu stats), /logs/stream ve kontroller
│   │   │   ├── DashboardEndpoints.cs     # 2.5s in-memory önbellekli Dashboard KPI özeti
│   │   │   ├── IncidentEndpoints.cs      # Sistem olayları ve planlı bakım CRUD & yaşam döngüsü
│   │   │   ├── MetricsEndpoints.cs       # Sistem donanım metrikleri zaman serisi
│   │   │   ├── NotificationEndpoints.cs  # Çok kanallı alarm test uç noktası
│   │   │   ├── PushEndpoints.cs          # Push webhooks ve Dead Man's Snitch (/push-monitors)
│   │   │   ├── ServicesEndpoints.cs      # Servis CRUD ve /reorder
│   │   │   ├── SettingsEndpoints.cs      # Dinamik ayarlar, sürüm kontrolü (/version) ve DB disk telemetrisi
│   │   │   ├── StatusPageEndpoints.cs    # Şifresiz halka açık durum özeti (/api/status-page)
│   │   │   ├── StreamEndpoints.cs        # Canlı SSE olay akışı (/api/stream/events)
│   │   │   └── UptimeEndpoints.cs        # Servis uptime denetim geçmişi
│   │   ├── BackgroundServices/    # Arka plan çalışan iş parçacıkları
│   │   │   ├── ContainerDiscoveryService.cs  # Docker socket periyodik konteyner senkronizasyonu (10s)
│   │   │   ├── SystemMetricsCollector.cs     # Host CPU/RAM/Disk/Net metrik toplayıcısı (15s)
│   │   │   ├── UptimeCheckerService.cs       # 3 durumlu HTTP/TCP ping, SSL ve Snitch denetimi (60s)
│   │   │   └── RetentionCleanupService.cs    # Dinamik veri saklama temizleyicisi, PRAGMA optimize & GC compact (24h)
│   │   ├── Data/                  # Veri erişim katmanı (Dapper.AOT + SQLite)
│   │   │   ├── DbConnectionFactory.cs        # SQLite WAL, busy_timeout=5000 ve PRAGMA optimizasyonları
│   │   │   ├── DatabaseMigrator.cs           # DbUp sıralı göç yöneticisi
│   │   │   ├── IncidentRepository.cs         # Sistem olayları ve duyurular veri erişimi
│   │   │   ├── ServicesRepository.cs         # Servis ve override sorguları
│   │   │   ├── PushMonitorRepository.cs      # Dead Man's Snitch veri erişimi
│   │   │   ├── UptimeRepository.cs           # Uptime geçmişi ve 5s önbellekli 24h yüzde agregasyonu
│   │   │   ├── MetricsRepository.cs          # Host metrikleri
│   │   │   ├── BackupRepository.cs           # Push backup logları
│   │   │   ├── UserRepository.cs             # Kullanıcı hesapları ve parola hashleme
│   │   │   ├── SettingsRepository.cs         # Key-value ayarlar
│   │   │   └── Migrations/                   # Sıralı göç SQL dosyaları
│   │   │       ├── 001_init.sql
│   │   │       ├── 002_add_users.sql
│   │   │       ├── 003_roadmap_features.sql
│   │   │       ├── 004_performance_indexes.sql
│   │   │       ├── 005_service_overrides_extended.sql
│   │   │       ├── 006_uptime_advanced_options.sql
│   │   │       ├── 007_opt_in_uptime.sql         # Opt-in uptime, self-healing durum sıfırlama ve indeks
│   │   │       ├── 008_service_incidents.sql     # Sistem olayları ve planlı bakım şeması
│   │   │       └── 009_uptime_rollup_and_transition.sql # Uptime günlük özet ve durum geçiş takibi
│   │   ├── Models/                 # DTO'lar ve Veritabanı Varlıkları
│   │   │   ├── Service.cs                    # Servis modeli (check_type, port, ssl, is_public, display_order)
│   │   │   ├── ServiceIncident.cs            # Sistem olay duyurusu modeli
│   │   │   ├── ServiceOverride.cs            # Docker override modeli
│   │   │   ├── PushMonitor.cs                # Dead Man's Snitch modeli
│   │   │   ├── DockerModels.cs               # Docker API modelleri
│   │   │   ├── DockerActionResult.cs         # Konteyner işlem sonucu yanıtı
│   │   │   ├── SystemMetric.cs               # Host donanım metrik modeli
│   │   │   ├── UptimeCheck.cs                # Uptime denetim kayıt modeli
│   │   │   ├── BackupEvent.cs                # Backup push bildirim modeli
│   │   │   ├── User.cs                       # Kullanıcı modeli
│   │   │   ├── VersionInfo.cs                # Dinamik GitHub SemVer sürüm DTO'su
│   │   │   └── CorvusJsonSerializerContext.cs # .NET 9 Native AOT JsonSourceGeneration context
│   │   ├── Utils/                  # Yardımcı sınıflar
│   │   │   └── StatusCodeMatcher.cs          # HTTP durum kodu (aralık ve tekil kod) ayrıştırıcı
│   │   └── Services/                # Çekirdek iş mantığı servisleri
│   │       ├── DockerHttpClient.cs           # SocketsHttpHandler ile doğrudan Docker REST istemcisi
│   │       ├── DockerService.cs              # 2.5s önbellekli konteyner işlemleri, toplu stats özeti ve etiket eşleme
│   │       ├── DockerLogDemuxer.cs           # Multiplexed Docker stdout/stderr sıfır bellek tahsisli ayrıştırıcı
│   │       ├── NotificationService.cs        # SSRF korumalı, çift dilli Discord, Telegram, Ntfy ve Webhook motoru
│   │       ├── EventBroadcaster.cs           # Çok istemcili Channel Pub/Sub SSE olay yayıncısı
│   │       ├── AuthService.cs                # Zero-Trust SSO proxy headers & SHA-256 session auth
│   │       ├── CorvusAuthFilter.cs           # Minimal API EndpointFilter kimlik doğrulama katmanı
│   │       └── UpdateCheckerService.cs       # GitHub Releases API sürüm kontrol servisi
│   │
│   └── Corvus.Web/                 # Frontend — TypeScript + React 19 + Vite + Tailwind CSS v4
│       ├── vite.config.ts          # manualChunks ile optimize edilmiş Vite yapılandırması
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx             # React.lazy rota kod ayrıştırma (code-splitting) & SSE bağlantısı
│       │   ├── types/              # Modüler tip sözleşmeleri (Clean Architecture)
│       │   │   └── index.ts        # Tüm API ve DTO arayüz tipleri
│       │   ├── api/                # Modülerleştirilmiş API istemci katmanı
│       │   │   ├── http.ts         # fetchJson, in-memory SWR önbellek (fetchCachedJson), invalidateCache
│       │   │   ├── auth.ts         # Kimlik doğrulama uç noktaları
│       │   │   ├── services.ts     # Servis CRUD ve sıralama
│       │   │   ├── containers.ts   # Konteyner işlemleri, toplu stats (/stats-summary) ve loglar
│       │   │   ├── uptime.ts       # Uptime kontrolleri ve push monitörleri
│       │   │   ├── metrics.ts      # Donanım metrikleri
│       │   │   ├── settings.ts     # Ayarlar ve yedekleme
│       │   │   ├── index.ts        # Birleşik API nesnesi
│       │   │   └── client.ts       # Geriye dönük uyumluluk re-export katmanı
│       │   ├── i18n/               # Derleme anında tip güvenli çoklu dil sistemi
│       │   │   ├── en.ts           # Birincil İngilizce sözlük
│       │   │   ├── tr.ts           # Türkçe çeviri sözlüğü
│       │   │   ├── types.ts        # DeepStringify ve sözlük tipleri
│       │   │   └── index.tsx       # I18nProvider ve useI18n hook'u
│       │   ├── utils/              # Modüler yardımcı fonksiyonlar
│       │   │   ├── url.ts          # Servis URL formatlama ve güvenli dönüştürme
│       │   │   ├── format.ts       # Bayt dönüştürme (B, KB, MB, GB, TB) yardımcı modülü
│       │   │   └── grouping.ts     # Docker Compose akıllı gruplama mantığı
│       │   ├── components/         # SADECE ortak/paylaşılan global UI bileşenleri
│       │   │   ├── Sidebar.tsx               # Masaüstü ray menü & mobil slide-over çekmece
│       │   │   ├── StatusBadge.tsx           # Sağlık durumu rozeti (healthy, degraded, down)
│       │   │   ├── LanguageSwitch.tsx        # Kompakt ve tam modlu arayüz dil değiştirici
│       │   │   └── RegistrationPromptModal.tsx # İlk yönetici kayıt yönlendirme modalı
│       │   └── pages/              # Modüler özellik bazlı sayfa klasörleri
│       │       ├── AuthPage/
│       │       │   └── index.tsx             # Giriş ve kayıt ekranı
│       │       ├── Containers/
│       │       │   ├── index.tsx             # Toplu stats ile çalışan sayfa yöneticisi (<250 satır)
│       │       │   ├── ContainerList.tsx     # Duyarlı mobil kartlar ve masaüstü tablo görünümü
│       │       │   ├── ComposeStackGroup.tsx # Docker Compose stack projeleri için akordiyon bileşeni
│       │       │   ├── ContainerStatsBadges.tsx # CPU, RAM ve Ağ canlı rozetleri
│       │       │   ├── ContainerActionButtons.tsx # Yaşam döngüsü butonları ve yükleniyor durumları
│       │       │   └── ContainerLogsModal.tsx   # Canlı konteyner log terminali modalı
│       │       ├── Dashboard/
│       │       │   ├── index.tsx             # Konsolide KPI özeti ve çalışan servisler
│       │       │   ├── SystemPulseHero.tsx   # Canlı durum nabzı, ağ I/O ve güncelleme kontrol kartı
│       │       │   ├── SystemKpiStrip.tsx    # 2 sütunlu kompakt KPI şeridi ve tam genişlikte Disk çubuğu
│       │       │   ├── AttentionRequiredCard.tsx # Kritik arızalar ve SSL uyarıları kartı
│       │       │   └── ActiveContainersWidget.tsx # 2 sütunlu duyarlı aktif konteynerler kartı
│       │       ├── PublicStatus/
│       │       │   ├── index.tsx             # Şifresiz halka açık durum sayfası (/status)
│       │       │   ├── PublicStatusCategoryGroup.tsx # Kategori bazlı açılır/kapanır akordeon grupları
│       │       │   ├── PublicStatusIncidentBanner.tsx # Canlı olay ve planlı bakım duyuru afişi
│       │       │   ├── PublicStatusServiceBar.tsx # Son 30 denetim etkileşimli durum çubuğu
│       │       │   └── PublicStatusServiceCard.tsx # Detaylı servis durum ve uptime kartı
│       │       ├── Services/
│       │       │   ├── index.tsx             # Servis launcher ve sürükle-bırak sıralama
│       │       │   ├── ServiceCard.tsx       # Servis kartı ve düzenleme aksiyonu
│       │       │   ├── AddServiceModal.tsx   # Manuel servis ekleme modalı
│       │       │   ├── EditServiceModal.tsx  # Servis uç noktası, ters proxy URL ve kontrol türü düzenleme modalı
│       │       │   └── AdvancedCheckOptions.tsx # Bağımsız gelişmiş kontrol parametreleri akordiyonu
│       │       ├── Settings/
│       │       │   ├── index.tsx             # Ayarlar kabuğu ve sekme seçici
│       │       │   ├── GeneralSettingsTab.tsx # Genel ayarlar, retention ve DB boyutu telemetrisi
│       │       │   ├── NotificationSettingsTab.tsx # Çok kanallı alarm yapılandırması
│       │       │   └── BackupSettingsTab.tsx # Çift yönlü dahili/harici yedekleme yöneticisi
│       │       ├── SystemMetrics/
│       │       │   ├── index.tsx             # Zaman serisi telemetri kabuğu ve periyot filtresi
│       │       │   ├── SystemKpiCards.tsx    # Canlı donanım kullanım kartları
│       │       │   ├── CpuMetricsChart.tsx   # CPU yükü alan grafiği
│       │       │   ├── RamMetricsChart.tsx   # Bellek kullanımı alan grafiği
│       │       │   └── DiskStorageCard.tsx   # Disk depolama ve bölüm dağılımı
│       │       └── Uptime/
│       │           ├── index.tsx             # Uptime kabuğu ve sekme seçici
│       │           ├── PingUptimeTab.tsx     # HTTP/TCP ping, gecikme ve SSL takibi ana sekmesi
│       │           ├── PushMonitorsTab.tsx   # Dead Man's Snitch cron izleme listesi
│       │           ├── IncidentsTab.tsx      # Sistem olayları ve planlı bakım yönetim sekmesi
│       │           ├── AddSnitchModal.tsx    # Push monitor oluşturma modalı
│       │           ├── UptimeStatsCards.tsx  # KPI kartları ve uç nokta düzenleme tetikleyicisi
│       │           ├── UptimeRecentChecks.tsx# Son Uptime kontrolleri listesi
│       │           ├── UptimeBar.tsx         # Geçmiş 90 günlük uptime çubuğu
│       │           └── components/           # Modüler Uptime alt bileşenleri
│       │               ├── DiscoveredServicesSection.tsx # Keşfedilen izlenmeyen servisler havuzu
│       │               ├── EnableUptimeModal.tsx          # Akıllı ön dolumlu canlı bağlantı test modalı
│       │               ├── AddIncidentModal.tsx           # Olay ve planlı bakım oluşturma modalı
│       │               └── DisableUptimeDialog.tsx        # Takipten çıkarma onay diyaloğu
│       └── wwwroot/                # Üretime hazır derlenmiş arayüz paketi (Corvus.Api tarafından sunulur)
│
├── tests/
│   └── Corvus.Api.Tests/           # xUnit Test Paketi (137 Başarılı Test)
│       ├── AuthServiceTests.cs
│       ├── DockerServiceTests.cs     # Konteyner işlemleri, micro-cache ve batch stats testleri
│       ├── DockerLogDemuxerTests.cs
│       ├── NotificationServiceTests.cs
│       ├── RoadmapFeaturesTests.cs
│       ├── UpdateCheckerTests.cs
│       ├── StatusCodeMatcherTests.cs
│       └── DatabaseMigrationAndRepositoryTests.cs
│
└── docs/                           # Teknik şartnameler ve mimari kılavuzlar
    ├── architecture.md             # Sistem mimarisi (İngilizce)
    ├── architecture.tr.md          # Sistem mimarisi (Türkçe)
    ├── specification.md            # Teknik şartname (İngilizce)
    ├── specification.tr.md         # Teknik şartname (Türkçe)
    ├── design-system.md            # Tasarım sistemi ve arayüz tokenları (İngilizce)
    └── design-system.tr.md         # Tasarım sistemi ve arayüz tokenları (Türkçe)
```

---

## 🏛️ Temiz Mimari ve Modülerlik İlkeleri

Corvus, kod tabanının açık kaynak dünyasında örnek gösterilecek seviyede şeffaf, sürdürülebilir ve katkı sağlamaya elverişli kalabilmesi için **Temiz Mimari** ve **Tek Sorumluluk** ilkelerini sıkı şekilde uygular:

### 1. Tek Dosyaya Kod Yığma Yasağı (Anti-Monolith Kuralı)
- Hiçbir dosya kendi temel sorumluluğu dışındaki kodlarla şişirilemez. Sayfalar modüler özellik klasörlerine (`pages/<Özellik>/index.tsx`) bölünür; sekmeler, formlar ve modallar bağımsız alt bileşen dosyalarına çıkarılır.

### 2. Merkezileştirilmiş API Servis Katmanı
- UI bileşenleri içinde **asla** ham `fetch()` çağrıları veya HTTP protokol detayları bulunmaz.
- Tüm backend iletişimi `src/api/client.ts` içinde tip korumalı olarak tanımlanır. Sayfalar doğrudan `api.getServices()`, `api.startContainer()` vb. çağrılar yapar.

### 3. Sayfaya Özgü Modallar ve Sekmeler
- Yalnızca tek bir sayfaya ait olan modallar, sekmeler ve diyaloglar doğrudan o sayfanın klasöründe yer alır (ör. `pages/Services/AddServiceModal.tsx`, `pages/Uptime/AddSnitchModal.tsx`, `pages/Containers/ContainerLogsModal.tsx`).
- `src/components/` dizini kesinlikle yalnızca tüm projede ortak kullanılan (`Sidebar`, `StatusBadge`, `LanguageSwitch`, `RegistrationPromptModal`) bileşenlere ayrılmıştır.

### 4. Yardımcı Fonksiyonların İzolasyonu
- URL dönüştürme, formatlama ve hesaplama mantıkları JSX render ağacının içine gömülmez. `src/utils/` (`url.ts`, `format.ts`) altında modülerleştirilerek dışa aktarılır.

### 5. Backend Dikey Dilimleri (Vertical Slices)
- Minimal API endpoint'leri `Endpoints/` altında domain bazında extension metodlar olarak gruplanır (`app.MapContainersEndpoints()`, `app.MapServicesEndpoints()`).
- Veri erişimi `Data/` altında Dapper repository'lerine bölünmüştür.
- Arka plan işleri birbirinden bağımsız `BackgroundService` sınıflarında yürütülür.

---

## 🔄 Veri Akışı ve Gerçek Zamanlı Güncellemeler

```mermaid
sequenceDiagram
    participant Browser as React Frontend
    participant API as ASP.NET Core Minimal API
    participant Docker as Docker Engine Socket
    participant SQLite as SQLite (WAL Modu)
    participant Worker as Background Workers

    Worker->>Docker: Konteynerleri ve İstatistikleri Sorgula (10s)
    Worker->>SQLite: Metrik ve Sağlık Kayıtlarını Yaz
    Worker->>API: EventBroadcaster ile Olayı Tetikle
    API-->>Browser: Canlı SSE Akışı Gönder (/api/stream/events)
    Browser->>API: Kullanıcı İşlemi (ör. POST /api/containers/{id}/restart)
    API->>Docker: Konteyner Komutunu Çalıştır
    API->>SQLite: Denetim Olayını Kaydet
    API-->>Browser: İyimser Güncelleme + JSON Yanıtı
```

---

## 🧠 Bellek Dayanıklılığı ve In-Memory Micro-Cache

Corvus, harici bir önbellek sunucusu (Redis vb.) çalıştırmadan sistem belleğini **30–45 MB** bandında tutmak için çok katmanlı bir optimizasyon mimarisi uygular:

1. **Sıfır Dış Bağımlılıklı Micro-Cache:**
   - Docker soket okumaları (`GetContainersAsync`) ve Dashboard özetleri (`GET /api/dashboard/summary`) 2.5 saniyelik mikro önbelleğe alınır.
   - Uptime 24 saatlik yüzde agregasyonları (`Get24hUptimePercentagesAsync`) 5 saniye önbellekte tutulur.
   - Hızlı sayfa geçişlerinde Docker soketi ve SQLite üzerinde oluşan nesne tahsisatları (allocations) %90 oranında engellenir.
2. **Toplu İstatistikler (Batch Stats Endpoint):**
   - Konteyner başına N+1 paralel `/stats` isteği yerine `GET /api/containers/stats-summary` ile çalışan tüm konteynerlerin metrikleri tek bir HTTP akışında toplanır.
3. **.NET 9 Bellek Tasarruf Yapılandırması (`System.GC.ConserveMemory=5`):**
   - İstek dalgalanmaları bittiğinde boşta kalan sanal sayfaların Linux çekirdeğine (`madvise`) hızlıca iade edilmesi sağlanır.
   - `RetentionCleanupService` eski kayıtları sildikten sonra `GC.Collect(1, GCCollectionMode.Optimized)` ile bellek sıkıştırması yapar.

---

## 🛡️ Gelişmiş 3 Durumlu Dayanıklılık ve Sağlık Motoru

Servis sağlığı kontrollerinde geçici ağ dalgalanmalarının yanlış alarm (false-positive) üretmesini önlemek için 3 durumlu sonlu durum makinesi (finite state machine) kullanılır:
- **`healthy`:** Servis yanıt veriyor ve HTTP 2xx/3xx veya açık TCP portu doğrulandı.
- **`degraded`:** İlk başarısızlık tespit edildi; sistem alarm üretmez, servisi sarı uyarı moduna alır.
- **`down`:** 3 ardışık başarısızlık sonrasında servis kırmızıya döner ve yapılandırılmış bildirim kanallarına (Discord, Telegram, vb.) alarm fırlatılır.
- **Loopback Ağ Çözümlemesi:** Docker içinde çalışan Corvus'un host üzerindeki servislere (`localhost`, `127.0.0.1`) erişebilmesi için varsayılan bridge ağ geçidi (`host.docker.internal`) otomatik çözümlenir.

---

## 🧹 Veri Saklama, Uptime Agregasyonu & Olay Yaşam Döngüsü Mimarisi

### 1. Akıllı 24 Saatlik Retention Temizliği (`is_transition`)
Yüksek sıklıkta yapılan sağlık denetimleri zamanla milyonlarca satır üretir. SQLite sorgularının mikrosaniye seviyesinde kalmasını sağlamak ve disk büyümesini engellerken denetim tutarlılığını korumak için:
- Servis durumunun değişmediği rutin kontroller `is_transition = 0` bayrağıyla kaydedilir.
- Servisin durumunun değiştiği tüm anlar (`up` ➔ `down` veya `down` ➔ `up`) `is_transition = 1` olarak işaretlenir.
- `RetentionCleanupService` günde bir kez çalışır: 24 saatten eski ve durum değişimi içermeyen rutin kontroller (`is_transition = 0`) `idx_uptime_checks_cleanup` indeksi üzerinden anında temizlenir. Durum değişim anları (`is_transition = 1`) ise kullanıcının belirlediği `retention_days` süresince denetim amaçlı saklanır.

### 2. 365 Günlük Günlük İstatistik Özeti (`uptime_daily_stats`)
Eski ham kontroller silinmeden hemen önce, her servis için günlük istatistikler özetlenerek `uptime_daily_stats` tablosuna işlenir:
- Her takvim günü (`date`) için servisin `total_checks`, `up_checks` ve `avg_response_time_ms` metrikleri hesaplanır.
- 30 günlük, 90 günlük ve 365 günlük SLA ve Uptime oranları, devasa `uptime_checks` tablosu taranmadan doğrudan bu hafif özet tablosu üzerinden anlık hesaplanır.
- 365 günden eski özet kayıtları temizlenerek, tam 1 yıllık SLA geçmişi yalnızca birkaç kilobaytlık bir alanda kalıcı olarak tutulur.

### 3. Olay ve Duyuru Yaşam Döngüsü (`service_incidents`)
Arıza, bakım veya altyapı güncellemelerinde kullanıcı iletişimi, otomatik sağlık kontrollerinden bağımsız yönetilir:
- **Önem Seviyeleri (Severity):** `info`, `warning`, `critical`, `maintenance`.
- **Durum Aşamaları (Status):** `investigating` ➔ `identified` ➔ `monitoring` ➔ `resolved`.
- **Halka Açık Görünürlük:** Aktif ve sabitlenmiş (pinned) olaylar `GET /api/status-page` üzerinden servis edilir ve halka açık durum sayfasının en üstünde dikkat çekici canlı afişler (`PublicStatusIncidentBanner.tsx`) olarak sergilenir.
- **Yönetici Kontrolü:** Uptime sayfasındaki Olaylar sekmesinden (`IncidentsTab.tsx`) olay oluşturulabilir (`AddIncidentModal.tsx`), durum aşamaları güncellenebilir ve tek tıkla çözümlenerek (`POST /api/incidents/{id}/resolve`) zaman damgasıyla (`resolved_at`) arşivlenir.

---

## 💡 İlham Kaynakları (Inspirations & Credits)
- [Uptime Kuma](https://github.com/louislam/uptime-kuma) — İzleme mantığı ve durum sayfası felsefesi
- [Beszel](https://github.com/henrygd/beszel) — Hafif telemetri ve sistem kaynak takibi yaklaşımı
- [Portainer](https://github.com/portainer/portainer) — Konteyner yaşam döngüsü vizyonu

