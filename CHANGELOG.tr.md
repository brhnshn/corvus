# Değişiklik Günlüğü (Changelog)

Bu projedeki tüm önemli değişiklikler bu dosyada belgelenir.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) standardına dayanır ve bu proje [Semantik Versiyonlama](https://semver.org/lang/tr/) kurallarını benimser.

## [1.6.8] - 2026-10-15 — Servisler, Uptime ve Olay Geçmişinde Düğüm İzolasyonu ve Kenar Çubuğu Hiyerarşisi Ayrımı

### Düzeltilenler (Fixed)
- **Sol Menü (Sidebar) Yönetim ve Düğüm Hiyerarşisi Ayrımı**:
  - `Sidebar.tsx`: `Ayarlar` seçeneği düğüm kapsamı alt menüsünden çıkarılarak kenar çubuğunun altında bağımsız `Yönetim` bölümü altına taşındı. Böylece sunucu bazlı kaynaklar (Konteynerler, Servisler, Metrikler, Uptime, Olay Geçmişi) ile tüm sistemi ilgilendiren genel ayarlar (Kullanıcılar, Bildirimler, Veritabanı Yedeği, Genel Yapılandırma) arasındaki mimari ayrım netleştirildi.
- **Servisler Sayfası Düğüm İzolasyonu**:
  - `018_services_and_activity_system_scope_sqlite.sql` ve `018_services_and_activity_system_scope_postgres.sql`: `services` ve `activity_logs` tablolarına `system_id` kolonu (varsayılan `'local-host'`) ve indeksleri eklendi.
  - `ServicesRepository.cs`: Dapper tip dönüşümünü (`long` -> `int?`) sıfır hatayla gerçekleştirebilmek için `ServiceDbRow` sınıf mimarisine geçirildi, `system_id` eşlemesi yapıldı ve `GetAllAsync` fonksiyonu sistem bazlı filtrelemeye bağlandı.
  - `ServicesEndpoints.cs`: `GET /api/services` ve `POST /api/services` uç noktaları `X-System-Id` HTTP başlığı ile filtrelenerek Host ile uç ajanlar (örn. `Deneme`) arasındaki servis karışıklığı giderildi; yeni eklenen servisler otomatik olarak o an seçili aktif düğümle ilişkilendirildi.
- **Uptime ve SSL Takibi Düğüm Senkronizasyonu**:
  - `Uptime/index.tsx`: `corvus_active_system_changed` dinleyicisi eklenerek düğüm değiştirildiğinde servis listesinin anında seçili düğüme göre yenilenmesi sağlandı; sayfa başlığına aktif sunucu rozeti eklendi.
- **Olay Geçmişi (Activity Timeline) Kapsam Filtresi**:
  - `ActivityLogEndpoints.cs` ve `ActivityLogRepository.cs`: Olay kayıtları için `systemId` filtreleme altyapısı kuruldu.
  - `ActivityTimeline/index.tsx` ve `ActivityTimelineFilter.tsx`: `[ Aktif Düğüm | Tüm Filo ]` geçiş anahtarı eklenerek operatörlerin hem yalnızca seçili sunucudaki olayları hem de tüm filo genelindeki olayları filtreleyebilmesi sağlandı.
  - `tr.ts` ve `en.ts` dosyalarına Olay Geçmişi için tip güvenli yeni i18n çevirileri eklendi.
- **Birim Test Kapsamı ve Zaman Dilimi Dayanıklılığı**:
  - `ServicesRepository_SystemId_Isolation_WorksCorrectly` ve `GetPagedAsync_WithSystemId_FiltersCorrectly` testleri yazılarak sistem bazlı izolasyon doğrulandı (294/294 test başarılı).
  - Gece yarısına yakın saatlerde (23:40 UTC) CI üzerinde çalıştırıldığında gün sınırını aşarak testin 2 gün üretmesine sebep olan `UptimeRepository_SmartRetentionAndRollup_WorksCorrectly` testi gün ortasına (`.Date.AddDays(-2).AddHours(12)`) sabitlenerek saat dilimi dalgalanması (flakiness) tamamen çözüldü.

---

## [1.6.7] - 2026-10-15 — Sistem Yönetim Modalları ObsidianUI Standardizasyonu ve Düğüm Kapsamı (Node Scope) İzolasyonu

### Düzeltilenler (Fixed)
- **Düğüm Kapsamı (Node Scope) İzolasyonu ve Çoklu Sunucu Ayrımı**:
  - `DashboardEndpoints.cs`: `/api/dashboard/summary` uç noktası `X-System-Id` HTTP başlığına duyarlı hale getirildi. Aktif sistem uç bir ajan (örn. `Deneme`) olduğunda, Host sunucusunun yerel verileri yerine `ITelemetryRingBuffer` üzerinden o ajanın canlı CPU, RAM ve Disk telemetrisi ile `GetCachedContainers` listesi sunuldu.
  - Önbellek İzolasyonu: Tek küresel `_cachedSummary` yerine `ConcurrentDictionary<string, ...>` tabanlı thread-safe sistem bazlı önbellek mimarisine geçilerek farklı sunucuların birbirlerinin verilerini ezmesi engellendi.
  - `ContainersEndpoints.cs`: `GET /api/containers` ve `GET /stats-summary` uç noktaları `X-System-Id` filtresine bağlandı; Deneme seçildiğinde Host'un 17 konteyneri yerine uç ajanın gerçek yerel konteynerleri listelendi. Konteyner aksiyonları (`restart`, `start`, `stop`, `pause`, `unpause`) uç ajanlar için `ISystemTunnelManager` WebSocket RPC kanalı üzerinden çalıştırıldı.
  - Frontend Senkronizasyonu: `Dashboard` ve `Containers` sayfalarında `corvus_active_system_changed` dinleyicileri bağlanarak düğüm değiştirildiğinde verilerin anında güncellenmesi ve sayfa başlıklarında aktif düğüm rozetinin gösterilmesi sağlandı.
- **Konteyner Sayfası Donma ve Hata Çözümü (Remote Şema Eşleme)**:
  - `ContainersEndpoints.cs`: Uç sunucularda (örn. `Deneme`) konteyner sayfasına girildiğinde oluşan `TypeError: undefined.replace / undefined.toLowerCase / undefined.slice` UI donma ve hata fırtınası çözüldü; `SystemContainerCacheEntity` verisi eksiksiz `DockerContainerInfo` modeline dönüştürülerek (`Id`, `Names`, `Image`, `State`, `Status`, `Ports`, `Labels`, `Tags`) tam şema uyumu sağlandı.
  - Uç Sunucu Konteyner İstatistikleri: `GET /api/containers/stats-summary` ve `GET /{id}/stats` uç noktaları uzak sistemler için canlı telemetri önbelleğinden beslenerek her konteynerin CPU ve RAM kullanımı arayüzde gösterildi.
  - JSON-RPC Uzak Konteyner Logları: `GET /api/containers/{id}/logs` uç noktası `ISystemTunnelManager` WebSocket RPC üzerinden uzak sunucudaki konteynerin gerçek loglarını çekecek şekilde bağlandı.
  - Frontend Çökme Dayanıklılığı (Null-Safety): `useContainersPageState.ts`, `ContainerRow.tsx`, `ContainersStats.tsx` ve `Containers/index.tsx` bileşenleri isim, durum, imaj ve etiket erişimlerinde güvenceye alındı.
- **Tüm Sayfalarda (Fleet-Wide) Düğüm Kapsamı Senkronizasyonu**:
  - `MetricsEndpoints.cs`: `/api/metrics/system`, `/api/metrics/latest` ve canlı SSE `/api/metrics/stream` uç noktaları `X-System-Id` ve `systemId` filtrelerine bağlanarak aktif seçili sunucunun canlı ve geçmiş telemetrisi sunuldu.
  - `SystemMetrics/index.tsx`: Sayfa başlığına aktif sunucu rozeti (`[Deneme]` / `[Host]`) eklendi; `corvus_active_system_changed` dinleyicisi ile SSE bağlantısı ve grafikler aktif sunucuya bağlandı.
  - `Services`: `ServicesHeader` başlığına aktif sunucu rozeti eklendi; `SystemdUnitsTab` sekmesi aktif sunucu kimliğine (`selectedSystemId`) bağlandı.
  - `ActivityTimeline`: Olay geçmişi sayfasına aktif düğüm rozeti eklendi ve düğüm değişiminde otomatik yenileme sağlandı.
- **Disk Float Precision Yuvarlama Hatası**:
  - `DashboardKpis.tsx`: Disk boş alanı hesaplanırken ortaya çıkan IEEE 754 float hassasiyet hatası (`939.6999999999999 GB Boş`) `parseFloat(...toFixed(1))` ile temiz `939.7 GB` gösterimine dönüştürüldü.
- **Ajan Disk Algılama İyileştirmesi**:
  - `SystemMetricCollector.cs`: Ajan konteyner ortamında çalışırken `/host` mount'unu önceliklendirerek veya en büyük kapasiteli root sürücüyü seçerek doğru disk boyutunu raporlaması sağlandı.
- **Sistem Modallarında Eski Tasarım ve Hardcoded Renklerin Kaldırılması**:
  - `AddSystemSheet.tsx`: Standart dışı eski kart yapısı ve hardcoded `#1b1d2a` / `#eceef6` renkleri kaldırılarak ortak `Modal` ve `Button` bileşenlerine geçirildi. Kurulum adımları, durum rozetleri ve terminal komut bloğu ObsidianUI token'larıyla (`var(--bg-card)`, `input w-full` vb.) tam uyumlu hale getirildi.
  - `EditSystemModal.tsx`: Eski popup şablonu ve el yapımı butonlar kaldırılarak ObsidianUI `Modal` mimarisine dönüştürüldü.
  - `DeleteSystemModal.tsx`: Standart `Modal` ve `Button` bileşenlerine (`variant="danger"`, `isLoading`) geçirilerek arayüz bütünlüğü sağlandı.
  - Modallar içerisindeki hardcoded Türkçe metinler temizlendi; hem `tr.ts` hem de `en.ts` dosyalarına yeni i18n çeviri anahtarları eklenerek çift dilli tam senkronizasyon sağlandı.

---

## [1.6.6] - 2026-10-14 — CodeQL Güvenlik Sıkılaştırması ve Komut Enjeksiyonu Koruması

### Düzeltilenler (Fixed)
- **Komut Satırı Enjeksiyonu Koruması (CWE-78 / CWE-88 - Uncontrolled Command Line)**:
  - `SystemdServiceClient` ve `AgentDockerClient` içerisinde `systemctl` ve `journalctl` süreç çalıştırmalarında dize birleştirmeli `ProcessStartInfo.Arguments` kullanımı kaldırılarak strongly-typed `ProcessStartInfo.ArgumentList` koleksiyonuna geçildi. Argümanlar kabuk (shell) yorumlaması olmaksızın işletim sistemi çekirdeğine bağımsız diziler olarak iletilerek argüman/komut enjeksiyonu açıkları tamamen kapatıldı.
  - `ComposeFileService` içerisindeki Docker Compose çalıştırma çağrıları da `ArgumentList.Add(...)` yapısına geçirilerek sağlamlaştırıldı.
- **Log Enjeksiyonu ve CRLF Temizleme (CWE-117 - Log Entries from User Input)**:
  - Dışarıdan veya kullanıcıdan gelen parametrelerin loglara doğrudan yazılması engellendi; `SecuritySanitizer.SanitizeLog(...)` ile `\r` ve `\n` karakterleri temizlenerek log bütünlüğü korundu:
    - `SystemdServiceClient`: Hata loglarındaki `{Unit}` ve `{Action}` parametreleri temizlendi.
    - `DockerContainerClient`: `GetContainerLogsAsync` hata logundaki `{ContainerId}` temizlendi.
    - `DockerService`: Konteyneri yeniden oluşturma ve geri alma (rollback) loglarındaki `{Image}`, `{Name}`, `{NewId}` ve `{OldId}` parametreleri temizlendi.
    - `ContainersEndpoints`: WebSocket CSWSH engelleme uyarısındaki `{Origin}` ve `{Host}` parametreleri temizlendi.
    - `SystemTunnelManager`: Tünel kayıt ve ayrılma loglarındaki `{SystemId}` parametresi temizlendi.

---

## [1.6.5] - 2026-10-14 — Kalıcı Bağlamsal Düğüm Ağacı, Kademeli Genel Bakış Yüklemesi, CSP ve Gerçek Veri Disiplini

### Eklenenler (Added)
- **Bağlamsal Düğüm Ağacı ve Kalıcı Corvus Kabuğu**:
  - `AppLayout.tsx` içerisindeki `isNavStandalone` şartı kaldırılarak Corvus logosu, kabuk düzeni ve sol kenar çubuğunun Sistemler (Tüm Sunucular) sayfası dahil tüm sayfalarda kalıcı olarak ekranda kalması sağlandı.
  - `Sidebar.tsx` bileşeni çift katmanlı bağlamsal ağaç mimarisine geçirildi:
    - En üstte tüm sunuculara anında geçiş sağlayan bağımsız "Tüm Sunucular" (`Server` Lucide SVG ikonu) bağlantısı.
    - Altında aktif sunucunun adını, çevrimiçi durumunu ve hızlı değiştirici butonunu gösteren "Düğüm Kapsamı" kartı ile o sunucuya ait alt gezinme dalları (Genel Bakış, Servisler, Konteynerler, Metrikler, Uptime, Olaylar, Ayarlar).
  - Mobil alt menüye (`BottomNav.tsx`) `Server` SVG ikonu ile "Sistemler" gezinme öğesi eklendi.
  - Arayüzde kesinlikle emoji kullanılmadı; yalnızca Lucide React SVG ikonları ve Obsidian UI tipografisi benimsendi.

### Düzeltilenler (Fixed)
- **Content Security Policy (CSP) Google Fonts İzinleri**:
  - `src/Corvus.Api/Program.cs` içerisindeki CSP güvenlik başlığına `style-src` altında `https://fonts.googleapis.com` ve `font-src`/`connect-src` altında `https://fonts.gstatic.com` izinleri eklenerek ilk açılışta font stil dosyalarının engellenmesi hatası çözüldü.
- **Alarm Kuralları HTTP 500 ve Native AOT Serileştirme Hatası**:
  - `AlertRuleRepository.GetAllRulesAsync()` ve `GetEnabledRulesAsync()` metotlarında sorgu satırları `.ToList()` ile somutlaştırılarak kayıtsız LINQ iterator tipi yerine `Task<List<AlertRule>>` dönmesi sağlandı.
  - `CorvusJsonSerializerContext` kaynak üreticisine `IEnumerable<AlertRule>` ve `AlertRule[]` öznitelikleri eklenerek Native AOT derleme zırhlandı.
  - `AlertRulesEndpoints.cs` içerisindeki anonim nesneler standart `GenericApiResponse` modeline geçirildi ve yetkilendirmeler `.RequireAdmin()` zincirine bağlandı.
- **Gerçek Veri Disiplini ve Null-Safety Koruma Önlemleri**:
  - `DashboardKpis.tsx` içerisinde metrikler henüz toplanmamış veya boşken uydurma 0% veya sahte GB hesaplaması yapılması engellendi; veri beklenirken temiz tire (`-`) gösterimi sağlandı.
  - `TopResourcesCard.tsx` içerisinde `0.0%` CPU/RAM değerlerinin falsy sayılarak tireye dönüşmesi hatası `typeof === 'number'` kontrolüyle düzeltildi.
  - `RecentEventsCard.tsx` içerisindeki uydurma sentetik konteyner olayları kaldırılarak `activityLogsApi.getActivityLogs()` üzerinden gerçek telemetri olaylarına bağlandı.
  - `SystemsTable.tsx` tablosundaki `loadAvg5m` ve `loadAvg15m` değerleri boş olduğunda uydurma `'0.00'` basılması engellenerek `-` gösterildi.
  - `SystemsColumnsMenu.tsx` içerisinden telemetrisi bulunmayan hayalet sütunlar (GPU, Wi-Fi, Pil, Sıcaklık, Güncellemeler) temizlenerek yalnızca gerçek verisi olan sütunlar sunuldu.
  - `Systems/index.tsx` içerisinde sunucu seçildiğinde localStorage'daki aktif sunucu adının (`corvus_active_system_name`) senkronize olarak güncellenmesi sağlandı; statik `'homelab-01'` bağımlılığı ortadan kaldırıldı.

### Performans (Performance)
- **Genel Bakış Kademeli Yükleme (Progressive Loading) ve Render Ayrıştırması**:
  - `DashboardPage` ana yükleme akışından ağır Docker konteyner istatistikleri sorgusu (`/api/containers/stats-summary`) ayrıştırıldı. Ana KPI şeridi, operasyonel durum paneli, servisler ve konteyner listesi 100ms içinde anında ekrana basılacak şekilde kademelendirildi.
  - Genel Bakış sayfasındaki SSE `corvus_event` dinleyicisine 1500ms `debounce` eklenerek art arda gelen olaylarda mükerrer API bombardımanı engellendi.
- **Backend Özet Sorgularının Paralelleştirilmesi ve Bellek İçi Rol Önbelleği**:
  - `DashboardEndpoints.cs` içindeki 4 sorgu (servisler, docker, yedekler, metrikler) `Task.WhenAll` ile eşzamanlı çalıştırılarak özet yanıt süresi minimize edildi; önbellek süresi 2.5 saniyeden 15 saniyeye yükseltildi.
  - `AuthService.cs` içerisine 30 saniye TTL'li bellek içi `RoleCache` eklenerek her kimlik doğrulamalı HTTP isteğinde SQLite `users` tablosuna mükerrer sorgu gitmesi önlendi.

### Uluslararasılaştırma (i18n)
- Eklenen tüm yeni navigasyon, düğüm kapsamı ve kaynak metrikleri metinleri hem `tr.ts` hem de `en.ts` sözlüklerine tip güvenli olarak işlendi.

## [1.6.4] - 2026-10-14 — Otomatik Semantik Sürümleme ve Arayüz Sadeleştirmeleri

### Eklenenler (Added)
- **Otomatik Semantik Etiketleme ve Sürüm Dağıtım Hattı**:
  - `.github/workflows/ci.yml` CI/CD hattına otomatik sürüm artırma entegre edildi. `main` dalına gönderilen `fix:` veya `feat:` commit'lerinde sistem semantik sürümü otomatik olarak artırır (örn. `v1.6.3` -> `v1.6.4`), Git etiketini oluşturur, sürüm notlarını ayıklayarak GitHub Release yayınlar ve hem Hub hem de Agent için sürümlü Docker imajlarını derler.
  - Arayüzdeki sabit sürüm yazıları tamamen kaldırılarak Vite derleme aşamasında `__APP_VERSION__` üzerinden dinamik sürüme bağlandı; yerel geliştirme için `UpdateCheckerService` servisinden otomatik okuma desteği sağlandı.

### Kaldırılanlar (Removed)
- **Genel Bakış Başlığındaki Gereksiz Telemetri Rozeti**:
  - `DashboardHeader.tsx` bileşeninden göz yoran ve lüzumsuz olan "Canlı Telemetri · 100ms Senkron" rozeti kaldırıldı; genel bakış başlığı ferahlatılarak gerçek veri disiplini standartlarına uygun hale getirildi.

## [1.6.3] - 2026-10-14 — UI/UX Modernizasyonu, Obsidian Modal Standardizasyonu ve Düzen İyileştirmeleri

### Eklenenler (Added)
- **Obsidian Standart Modal Mimarisi**:
  - Proje genelindeki 10 eski modal pencere (`AddServiceModal`, `EditServiceModal`, `ContainerDetailModal`, `ContainerTagsModal`, `SystemPruneModal`, `AddUserModal`, `AddAlertRuleModal`, `AddSnitchModal`, `DisableUptimeDialog`, `EnableUptimeModal`, `AddIncidentModal`, `RegistrationPromptModal`), merkezi ve erişilebilir `<Modal>` bileşenine dönüştürüldü; arka plan bulanıklığı (backdrop blur), ESC tuşu dinleyicisi ve tutarlı odak kapanı sağlandı.
- **Etkileşimli Eylem Bildirimleri**:
  - Gösterge paneli ve sistem verileri manuel yenilendiğinde sağ alt köşeden bilgilendirici Toast bildirimi (`toast.success`) tetiklendi.
- **Profil Sayfası Navigasyon ve Düzen Entegrasyonu**:
  - Profil sayfasında kenar çubuğunun (Sidebar) kaybolması ve geri dönüş yolunun kapanması sorunu giderildi; tam iskelet entegrasyonu ve Dashboard'a dönüş kırıntı bağlantısı (breadcrumb) eklendi.
- **Kenar Çubuğunda GitHub Sürüm Bağlantısı**:
  - Kenar çubuğu altındaki statik sürüm metni, resmi GitHub SVG ikonuyla birlikte güncel sürüm rozetini depoya yönlendiren etkileşimli bir bağlantıya dönüştürüldü.

### Düzeltilenler (Fixed)
- **Ayarlar Sayfası Kart Dolguları (Padding) ve Sınır Hizalaması**:
  - Ayarlar sekmelerinde (`GeneralSettingsTab`, `BackupSettingsTab`, `NotificationSettingsTab`, `UsersTab`, `AlertRulesTab`) içeriklerin kenarlara sıfır yapışması hatası standart `p-5 sm:p-7` dolgu ve `max-w-5xl` genişlik sınırıyla düzeltildi.
- **Kenar Çubuğu Tipografisi, Aktif Buton Kontrastı ve Logo**:
  - Kenar çubuğu üst başlığındaki geçici harf yerine orijinal şeffaf marka logosu (`/logo_transparent.png`) yeniden bağlandı.
  - Navigasyon aktif pill butonunun dikey kayması (`top: 0`), sınır kontrastı (`rgba(255, 255, 255, 0.08)`) ve metin parlaklığı düzeltildi.
- **Uluslararasılaştırma (i18n) ve Sabit Metinlerin Temizlenmesi**:
  - `en.ts` ve `tr.ts` sözlükleri; alarmlar, olaylar, ayarlar, konteynerler ve servisler modüllerinde tam tip güvenliğiyle eksiksiz senkronize edildi.

### Kaldırılanlar (Removed)
- **Sahte/Dummy Metrik ve Grafiklerin Temizlenmesi**:
  - Gerçek veri disiplinine uygun olarak; servis kartlarındaki uydurma 22 çubukluk geçmiş (`Array(22).fill`), rastgele 42ms/480ms gecikme verileri ve gösterge panelindeki sabit `28 MB` bellek etiketi kaldırıldı.
- **Yinelenen ve Gereksiz Arayüz Butonları**:
  - Gösterge Paneli ve Konteyner Detay başlıklarındaki çift yenileme ve işlevsiz tab butonları temizlendi.
- **Atıl/Yetim Kodların Temizlenmesi**:
  - `src/Corvus.Web/src/pages/Systems/` altında referansı kalmamış 5 ölü dosya (`SystemRow.tsx`, `SystemsFilterBar.tsx`, `SystemsKpis.tsx`, `SystemsNavbar.tsx`, `SystemDetailModal.tsx`) projeden tamamen silindi.

## [1.6.2] - 2026-10-14 — Güvenlik Sıkılaştırması, Sıfır-Tahsisli Native AOT ve Hafif SVG Grafikler

### Düzeltilenler (Fixed)
- **WebSocket Terminal CSWSH Koruması**:
  - `ContainersEndpoints.cs` (`/{id}/terminal`) içerisindeki WebSocket yükseltme el sıkışmasında `Request.Headers.Origin` başlığı `Request.Host` ile sıkı kontrole tabi tutuldu; siteler arası WebSocket ele geçirme (CSWSH) saldırıları `403 Forbidden` ile engellendi.
- **URL Parametresinde Jeton Sızıntısının Kapatılması ve Bearer Desteği**:
  - `CorvusAuthFilter.cs` içindeki URL `?token=` parametre kabulü, tarayıcıların özel başlık ekleyemediği gerçek zamanlı akış uç noktalarıyla (`/terminal`, `/stream`, `/tunnel`) sınırlandırıldı.
  - Standart REST uç noktalarında URL üzerinden oturum jetonu iletimi engellenerek jetonların proxy erişim loglarına, tarayıcı geçmişine ve `Referer` başlıklarına sızması önlendi.
  - Standart RFC 6750 `Authorization: Bearer <token>` başlığıyla kimlik doğrulama desteği eklendi.
- **Eşzamanlı Veritabanı Yedeği DoS Kilidi**:
  - `GET /api/backup/download` altındaki SQLite `VACUUM INTO` işlemi eşzamanlı istek kilidi (`SemaphoreSlim(1, 1)`) ile korumaya alındı; çoklu çağrılarla sunucu diskinin dolması, kilitlenmesi veya bellek tükenmesi riski bertaraf edildi.
- **Konteyner Yetki Yükseltme Koruması (Hardening)**:
  - `docker-compose.yml` içerisine `security_opt: ["no-new-privileges:true"]` direktifi eklenerek konteyner içerisindeki setuid/setgid ikili dosyalarıyla yetki yükseltme açığı kapatıldı.
- **Evrensel HTTP Güvenlik Başlıkları Katmanı (Middleware)**:
  - `Program.cs` içerisine hafif bir ara yazılım (middleware) eklenerek tüm yanıtlara `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin` ve `Content-Security-Policy` başlıkları eklendi.

### Performans (Performance)
- **`recharts` Bağımlılığının Kaldırılması ve Ultra Hafif Doğal SVG Grafikler**:
  - CPU, RAM ve Konteyner geçmiş metriklerinde kullanılan hantal `recharts` kütüphanesi yerine sıfır bağımlılıklı, hafif ObsidianUI SVG bileşeni (`ObsidianAreaChart.tsx`) geliştirildi.
  - 39 npm paketi bağımlılıktan temizlendi; istemci paket (bundle) boyutu ~353 kB sıkıştırılmamış (~102 kB gzipped) hafifletildi ve akıcı imleç izleme ile tepe nokta inceleme yeteneği korundu.
- **Ajan Tünelinde Sıfır-Tahsisli (Zero-Alloc) JSON Ayrıştırma**:
  - `AgentTunnelEndpoints.cs` içerisinde ajanlardan gelen her telemetri paketinde oluşan 64 KB yığın tampon tahsisi ve UTF-8 dize dönüşümleri kaldırılarak `ArrayPool<byte>.Shared` ve `ReadOnlySpan<byte>` tabanlı sıfır-tahsisli JSON ayrıştırma (`JsonSerializer.Deserialize`) mimarisine geçildi.
  - Gen0 çöp toplayıcı (GC) baskısı minimum seviyeye indirildi.
- **Asenkron Terminal Soket Akışı ve Arka Planda Oturum Temizliği**:
  - `ContainersEndpoints.cs` terminal soket döngülerindeki (`PumpDockerToWsAsync`, `PumpWsToDockerAsync`) gereksiz `Task.Run` ThreadPool sarmalayıcıları kaldırılarak doğrudan `Task.WhenAny` ile asenkron yürütmeye geçirildi.
  - `AuthService.cs` içindeki veritabanı oturum yazma işlemi doğrudan asenkron `await` ile güvene alındı ve süresi dolmuş oturumların periyodik temizliği `MetricsRetentionWorker` arka plan işçisine bağlandı.

## [1.6.1] - 2026-10-14 — ObsidianUI İskelet, Kenar Çubuğu ve Üst Çubuk Yerleşim Düzeltmesi

### Düzeltilenler (Fixed)
- **ObsidianUI Ana İskelet, Kenar Çubuğu ve Üst Çubuk Yerleşim Düzeltmesi (Layout & CSS Fix)**:
  - `src/Corvus.Web/src/index.css` içine eksik olan ObsidianUI iskelet ve navigasyon sınıfları eklendi: `.shell`, `.sidebar`, `.sidebar-resizer`, `.sidebar-top`, `.brand-row`, `.brand`, `.brand-mark`, `.system-selector`, `.cmd-trigger`, `.kbd`, `.nav-list`, `.nav-hover-pill`, `.nav-active-pill`, `.nav-btn`, `.nav-btn-left`, `.sidebar-footer`, `.footer-link`, `.version-row`, `.workspace`, `.header`, `.header-left`, `.page-title`, `.header-context`, `.header-actions`, `.page-body`.
  - Canlı dağıtımda Navbar ve Sidebar bileşenlerinin çakışması, menü butonlarının iç içe geçmesi ve stil eksikliği tamamen giderildi.
  - 1024px altındaki mobil cihazlar için ekran düzenini koruyan `@media (max-width: 1023px)` duyarlılık kuralları tamamlandı.

## [1.6.0] - 2026-10-14 — Çoklu Sistem Kokpiti, Uç Ajan, RBAC, Görsel Compose ve Systemd Yönetimi

### Eklenenler (Added)
- **Kapsamlı Mimari ve Teknik Şartname Dokümantasyon Senkronizasyonu**:
  - `docs/architecture.md`, `docs/architecture.tr.md`, `docs/specification.md`, `docs/specification.tr.md`, `README.md` ve `README.tr.md` dosyaları hem Türkçe hem İngilizce olarak Corvus v1.6.0 mimarisine tam senkronize edildi.
  - Çok Düğümlü Uç Ajan (Edge Agent), 3 seviyeli RBAC (`admin`, `operator`, `viewer`), Linux Systemd servis yönetimi, Görsel Compose & .env editörü, yönetilmeyen 128 bayt struct halka tamponu ve 320 otomatik test (291 backend + 29 frontend) eksiksiz belgelendi.
- **SSE Telemetri Akışı ve 100ms Canlı Senkronizasyon**:
  - Tarayıcı HTTP yoklama (polling) yükü kaldırılarak Server-Sent Events tabanlı gerçek zamanlı veri akışı sağlandı (`GET /api/v1/systems/{id}/stream` ve `/api/v1/metrics/stream`).
  - Üstel geri çekilme (exponential backoff) ve otomatik kurtarma mekanizmalı `useSystemMetricsStream` hook'u geliştirildi.
- **Kapanışta Sıfır Kayıplı RAM Flush (Graceful Shutdown)**:
  - `MetricsBatchFlusherBackgroundService` içine uygulama durdurulurken (`ApplicationStopping` / `SIGTERM`) arabellekteki tüm yazılmamış telemetri noktalarını anında diske yazan zorunlu `FlushAsync` entegrasyonu sağlandı.
- **Rol Tabanlı Erişim Kontrolü (RBAC) ve İzleyici (Viewer) Rolü**:
  - `017_users_rbac_sqlite.sql` ve `017_users_rbac_postgres.sql` migrasyonlarıyla `users` tablosuna `role` sütunu (`admin`, `operator`, `viewer`) eklendi.
  - `CorvusAuthFilter` ile yazma/değiştirme yapan tüm uç noktalar (`POST`, `PUT`, `DELETE`) `viewer` rolü için `403 Forbidden` ile koruma altına alındı.
  - `UsersTab.tsx` kullanıcı ve yetki yönetim arayüzü inşa edildi.
- **Görsel Compose & .env Düzenleyicisi ve Dağıtım Motoru**:
  - YAML sekme (TAB) karakterlerini derleme öncesi denetleyen, `.bak` otomatik yedeklemesi alan `PUT /api/v1/compose/{stackName}` uç noktası eklendi.
  - `POST /api/v1/compose/{stackName}/deploy` ile `docker compose up -d` komutunu çalıştırıp anlık çıktısını sunan dağıtım motoru kuruldu.
  - `ComposeConfigModal.tsx` bileşeni sekmeli ve düzenlenebilir kod editörüne dönüştürüldü.
- **Tek Tıkla İmaj Güncelleme (Pull & Recreate)**:
  - OCI registry digest karşılaştırması konteyner yaşam döngüsüyle bağlandı.
  - Konteyner ayarlarını, hacimlerini ve portlarını koruyarak yeni imajı çeken, hata anında otomatik geri alma (rollback) yapan `POST /api/v1/containers/{id}/recreate` uç noktası geliştirildi.
  - Konteynerler ekranına mat kehribar "Güncelleme Mevcut" rozeti ve aksiyon butonları eklendi.
- **Systemd Servis ve Süreç Yönetimi**:
  - Komut enjeksiyonunu engelleyen (`^[a-zA-Z0-9@_.-]+\.service$`) ve Linux harici sistemlerde güvenle çalışan `SystemdServiceClient` oluşturuldu.
  - Sistem birimlerini listeleme, başlatma/durdurma/yeniden başlatma ve `journalctl` log akışı uç noktaları kuruldu.
  - `SystemdUnitsTab.tsx` bileşeniyle arama, durum filtreleri, journalctl modalı ve aksiyon onayları geliştirildi; Servisler ve Sistemler sayfalarına entegre edildi.
- **Gelişmiş Komut Merkezi ve Klavye Aksiyonları (Ctrl+K)**:
  - Komut paleti aksiyon çalıştıran bir komuta merkezine dönüştürüldü:
    - `> restart <container>`: Konteyneri doğrudan yeniden başlatır ve Geri Al (Undo) bildirimini sunar.
    - `> logs <container>`: Canlı SSE log modalını açar.
    - `> switch <system>`: Aktif sunucu düğümünü anında değiştirir.
    - `> check <service>`: İlgili servise anlık HTTP/TCP yoklaması göndererek yanıt süresini bildirir.
- **Frontend Test Altyapısı (Vitest)**:
  - `Corvus.Web` projesine Vitest ve `@testing-library/react` kuruldu.
  - HTTP önbellekleme, formatlama, bulanık arama ve ObsidianUI temel bileşenleri (`AnimatedNumber`, `SegmentedTabs`, `ExpandableTable`, `StatusBadge`) için 29 adet birim testi yazıldı.
- **Çoklu Sistem Yönetimi Kokpiti ve Dağıtık Uç Ajanı (`/systems`)**:
  - Dışa doğru (outbound) güvenli TLS tüneliyle hiçbir port açma zorunluluğu olmaksızın farklı VPS, sunucu ve homelab ortamlarını tek merkezden yöneten sistem mimarisi.
  - SQLite (`016_systems_sqlite.sql`) ve PostgreSQL (`016_systems_postgres.sql`) migrasyonları uygulandı: `systems`, `system_tokens`, `system_metrics_1m`, `system_metrics_1h` ve `system_containers_cache` tabloları ve indeksleri oluşturuldu.
  - 128 baytlık unmanaged `readonly struct SystemTelemetryPoint` ve sistem başına bellekte 60 telemetri noktası (3 dakika @ 3s) tutan dairesel `TelemetryRingBuffer` (`ITelemetryRingBuffer`) inşa edildi (50 sistemde yalnızca ~360 KB RAM).
  - Her 60 saniyede bir çalışan ve 1 dakikalık ortalamaları tek bir transaction ile `system_metrics_1m` tablosuna kaydeden `MetricsBatchFlusherBackgroundService` eklendi.
  - 7 günden eski 1m verilerini saatlik özetlere (`system_metrics_1h`) sıkıştıran ve 30 günden eski saatlik kayıtları budayan `MetricsRetentionWorker` eklendi (sistem başına aylık yalnızca ~2.5 MB disk ayak izi).
  - Dapper.AOT uyumlu `SystemRepository` (`ISystemRepository`), `SystemMetricRepository` (`ISystemMetricRepository`) ve motor/saklama raporlayan `SystemStatusService` (`ISystemStatusService`) yazıldı; `CorvusJsonSerializerContext` içine işlendi.
  - `MultiNodePhase1Tests.cs` kapsamlı birim test takımı eklenerek test sayısı 252/252 yeşile ulaştırıldı.
- **Çoklu Sistem Yönetimi Faz 2: Hub Backend Servisleri ve Sistem API Uç Noktaları**:
  - `SystemAuthService` (`ISystemAuthService`) ile 32 baytlık kriptografik güvenli token (`crv_node_live_...`), SHA-256 hash, sabit zamanlı `FixedTimeEquals` doğrulaması ve anında token iptali hayata geçirildi.
  - `SystemTunnelManager` (`ISystemTunnelManager`) ile aktif WebSocket tünelleri havuzu, correlationId tabanlı RPC istek/yanıt yönetimi (`docker_req` / `docker_res`) ve ikili PTY çerçeveleme köprüsü kuruldu.
  - `SystemWatchdogService` ile 5 saniyede bir kalp atışı izlemesi (online <=10s, degraded <=30s, offline >30s) sağlandı.
  - `/api/v1/systems/*` Minimal API uç noktaları (`SystemsEndpoints`) inşa edildi (durum, canlı RAM telemetrisiyle listeleme, kayıt, detaylar, silme, token döndürme, metrik geçmişi, uzaktan Docker konteyner başlat/durdur/yeniden başlat/loglar).
  - `GET /api/v1/agent/tunnel` (`AgentTunnelEndpoints`) uç noktasıyla giden TLS/WSS el sıkışması ve telemetri akış pompası tamamlandı.
  - `MultiNodePhase2Tests.cs` test takımıyla toplam yeşil test sayısı 254/254'e ulaştı.
- **Çoklu Sistem Yönetimi Faz 3: Corvus Ajanı Uç İstemcisi**:
  - Bağımsız, sıfır yansımalı .NET 9 Native AOT uç ajanı (`src/Corvus.Agent/`) geliştirildi (<10 MB RAM ayak izi).
  - `/proc/stat`, `/proc/meminfo`, `/proc/net/dev` ve `/proc/loadavg` üzerinden doğrudan CPU, RAM, Disk, Ağ ve Yük Ortalaması toplayan hafif `SystemMetricCollector` inşa edildi.
  - `/var/run/docker.sock` Unix Domain Socket üzerinden yerel Docker daemon ile konuşan, konteyner durumlarını tarayan ve uzaktan RPC eylemlerini (`start`, `stop`, `restart`, `logs`) yürüten `AgentDockerClient` yazıldı.
  - Hub'a outbound TLS/WSS tüneli açan, 3 saniyede bir hafif telemetri akıtan ve $\pm 500\text{ms}$ jitter destekli üstel geri çekilme ($2\text{s} \to 60\text{s}$) ile yeniden bağlanan `AgentTunnelClient` tamamlandı.
  - Minimal distroless konteyner imajı için `Dockerfile.agent` (`ghcr.io/corvus/agent:latest`) hazırlandı.
  - `MultiNodePhase3Tests.cs` test paketiyle yeşil test sayısı 256/256'ya ulaştı.
- **Çoklu Sistem Yönetimi Faz 4 & 5: Sistemler UI Kokpiti, Mimari ve Doğrulama**:
  - `src/Corvus.Web/src/pages/Systems/` altında modüler bileşen mimarisi kuruldu: `SystemsHeader.tsx`, `SystemsKpis.tsx`, `SystemsFilterBar.tsx`, `SystemRow.tsx`, `SystemsEmptyState.tsx`, `SystemsEngineBadge.tsx`, `AddSystemSheet.tsx`, `SystemDetailModal.tsx` ve `useSystemsPageState.ts` durum kancası.
  - Bağımsız API servis katmanı `src/Corvus.Web/src/api/systems.ts` ve yardımcı fonksiyonlar `src/Corvus.Web/src/utils/systemsUtils.ts` (bayt formatlama, durum temaları, 1-satırlık agent çalıştırma komut üreteci) yazıldı.
  - Sistemler kokpiti `Sidebar.tsx`, `AppRouter.tsx` ve `App.tsx` bileşenlerine kod bölme (lazyWithRetry) ve tam çift dilli (`tr.ts` ve `en.ts`) senkronizasyonla bağlandı.
  - 256/256 xUnit backend testinin ve hatasız Vite frontend üretim derlemesinin (`npm run build`) eksiksiz geçtiği doğrulandı.


### Düzeltilenler (Fixed)
- **Depo Temizliği ve Yerel Tasarım Taslakları .gitignore**:
  - Yerel UX prototipleri ve tasarım taslaklarını içeren `Yeni Tasarımlar/` klasörü `.gitignore` dosyasına eklendi ve git önbelleğinden (cache) kaldırılarak yerel dosyalar korunurken uzak depoya gitmesi engellendi.
- Komut paletinde prefix ve komut eşleşmelerinin en üst sırada listelenmesi sağlandı.
- Linux harici sistemlerde journalctl log sorgularının çökme yaşanmadan açıklayıcı mesaj dönmesi sağlandı.
- **ObsidianUI Tasarım Sistemi ve Motion Design Altyapısı (Faz 1–4)**:
  - `index.css` içine ObsidianUI tasarım jetonları entegre edildi: Grimsi Bulut Beyazı (`--cloud-100`..`--cloud-500`), Mat Obsidyen yüzeyler (`--bg-canvas`..`--bg-active`), 1px keskin saç teli kenarlıklar (`--border-hairline`) ve sıfır gradyan / sıfır parlama disiplini.
  - `src/lib/motion.ts` hareket motoru kuruldu: Yay (Spring) fiziği, kademeli (stagger) jetonları, çalışma zamanı hareket hızı çarpanı (1x Hız, 0.35x Slow-Mo, Anında) ve Koyu/Açık tema yöneticisi.
  - Yeniden kullanılabilir hareket bileşenleri geliştirildi: `MotionStage.tsx` (`<PageStage>`, `<MotionItem staggerIndex={n}>`), `AnimatedNumber.tsx` (`useAnimatedNumber` ve cubic-out RAF interpolasyonu) ve `AnimatedBar.tsx` (4px yay dolgulu ilerleme çubuğu).
  - `src/components/ui/` altında modüler bileşen kütüphanesi inşa edildi: `Card.tsx`, `KpiCard.tsx`, `KpiRow.tsx`, `QuietBanner.tsx`, `AlertStrip.tsx`, `SegmentedTabs.tsx`, `Button.tsx` (dokunsal scale 0.96 ve durum morfolojili spinner), `StatusBadge.tsx`, `StatusDot.tsx`, `ExpandableTable.tsx` (akordiyon çekmece satırlar), `FloatingBulkBar.tsx`, `UptimeStrip.tsx` ve 2.8s eriyen ilerleme çubuklu + geri alma (undo) destekli `Toast.tsx`.
  - Uygulama kabuğu yenilendi: `Sidebar.tsx` (184px–320px sürüklenebilir boyutlandırıcı, kayan hover/aktif hapları, sistem değiştirici) ve `Header.tsx` (bağlam göstergesi, motion hız sekmeleri, tema değiştirici, yenileme).
- **Sistemler Tablosu Aksiyon Menüsü Kırpılma ve Portal Konumlandırma Düzeltmesi**:
  - `SystemActionMenu.tsx` bileşeni React Portal (`createPortal(..., document.body)`) ve `fixed z-[9999]` katmanına taşındı; böylece tablonun `overflow-x-auto` yatay kaydırma kutusu ve kart çerçeveleri tarafından menünün kesilmesi/altta kalıp görünmemesi sorunu kökten çözüldü.
  - Dinamik ekran yüksekliği algılama eklendi: Butonun altında yeterli alan kalmadığında (tablonun alt satırları veya ekranın altı) menü otomatik olarak **yukarı doğru** (`openUp`) açılır.
  - Sayfa kaydırıldığında, pencere boyutu değiştiğinde veya ESC tuşuna basıldığında menünün pürüzsüzce kapanması sağlandı.
- **Modal Açılış Yumuşak Geçiş Animasyonu ve Yeniden Kullanılabilir Modal Mimarisi**:
  - Pencerelerin aniden ve sert bir şekilde açılmasını engellemek için `index.css` içine hafif fizik tabanlı giriş animasyonları eklendi: `@keyframes modal-backdrop-in` (180ms fade-in) ve `@keyframes modal-card-in` (220ms `cubic-bezier(0.16, 1, 0.3, 1)` scale `0.96 -> 1` ve `translateY(8px -> 0)`).
  - Modüler `src/Corvus.Web/src/components/ui/Modal.tsx` bileşeni inşa edildi; arka plana tıklayarak kapatma, ESC tuşu dinleyicisi, gövde kaydırma kilidi (`overflow: hidden`) ve ARIA erişilebilirlik standartları merkezi olarak sağlandı.
  - Başta sistem yönetimi ve servisler olmak üzere modallar (`EditSystemModal`, `DeleteSystemModal`, `AddServiceModal`, `EditServiceModal`, `CommandPaletteModal`) `.animate-modal-backdrop` ve `.animate-modal-card` sınıflarıyla donatıldı.
  - Erişilebilirlik için `@media (prefers-reduced-motion: reduce)` ile animasyon sürelerinin otomatik sıfırlanması korundu.
- **Sistemler Sayfası Büyütülmüş Düzen ve Sütun Görünümü Menüsü (HTML Mockup Uyumu)**:
  - Sistemler kokpiti (`/systems`), sağlanan HTML mockup tasarımına sadık kalınarak büyütüldü ve modernize edildi: `bg-[#12131e] border-[#242637] rounded-3xl p-6 sm:p-7` kart yapısı, 30px başlık, sayaç rozeti, filtreleme ve yenileme kontrolleri.
  - Modüler `SystemsColumnsMenu.tsx` bileşeni inşa edildi; "Görüntüle" sütun menüsü üzerinden isteğe bağlı metrikler (GPU, Sıcaklık, Pil, Wi-Fi, Servisler, Güncellemeler) açılıp kapatılabilir ve `localStorage` üzerinde saklanır.
  - `SystemsTable.tsx` tablosu genişletildi: Sütun başlık ikonları, yön sıralama okları, monospace gösterge çubukları (`<b>%{percent}</b> <bar><i /></bar> <em>{kullanım}</em>`), mor host etiketi (`#7c7cff`) ve satır tıklamasından izole aksiyon menüsü eklendi.
  - `AppLayout.tsx` bağımsız görünüm maksimum genişliği HTML mockup `.wrap` standardına uygun olarak `max-w-[1500px]` seviyesine genişletildi.
- **Sistem Aksiyon Menüsü ve Sunucu Yaşam Döngüsü Yönetimi**:
  - Modüler `SystemActionMenu.tsx` bileşeni geliştirilerek sunucu satırlarına kapsamlı aksiyon menüsü eklendi: Sistemi Düzenle (isim ve etiketler), İzlemeyi Duraklat / Devam Ettir, Adı Kopyala, Ana Bilgisayarı Kopyala ve Sistemi Sil.
  - Sistem adı ve etiketlerini güncellemek için `EditSystemModal.tsx` ile arka uç `PUT /api/v1/systems/{id}` API uç noktası ve AOT JSON serileştiricisi entegre edildi.
  - Yanlışlıkla sunucu silinmesini önleyen onay pencereli `DeleteSystemModal.tsx` bileşeni eklendi (`DELETE /api/v1/systems/{id}`).
  - Ajanı henüz bağlanmamış (`pending`) veya duraklatılmış (`paused`) sistemlerde yanıltıcı sahte `%0.0` ve `0 B` gösterimi engellendi; yerine `Ajan Bekleniyor` rozeti ve temiz tire (`-`) gösterimi sağlandı.
- **Navbar & Sidebar Düzen Çakışması ve Tekil Doğruluk Kaynağı**:
  - `Navbar.tsx` ile `Sidebar.tsx` arasındaki yükseklik ve konum çakışması giderildi; sol kenar çubuğu (`Sidebar`) artık kalıcı üst barın altından (`top-16`, `h-[calc(100vh-4rem)]`, `z-30`) başlar.
  - `Sidebar.tsx` içindeki mükerrer Corvus logosu ve marka başlığı kaldırıldı; duyarlı menü açma/kapatma butonu (`PanelLeftOpen` / `PanelLeftClose`) `Navbar.tsx` içerisine taşındı.
  - Kullanıcı profil yönetimi, oturum kapatma ve dil seçici mükerrerlikleri tamamen temizlenerek yalnızca kalıcı `Navbar.tsx` üzerinde birleştirildi.
- **Terminoloji ve Buton İyileştirmeleri ("Filo" Temizliği ve "+ +" Buton Düzeltmesi)**:
  - İstenmeyen "Filo" ibaresi arayüz başlıklarından, breadcrumb yollarından ve dil sözlüklerinden (`tr.ts`, `en.ts`) kaldırılarak endüstri standardı "Sistemler" terimine geçildi.
  - `SystemsPage` ve i18n dosyalarındaki `+ + Sistem Ekle` çift artı hatası, i18n metninden artı simgesi kaldırılarak (`Sistem Ekle`) düzeltildi.
- **Duyarlı Tasarım: Mobil Alt Barın (BottomNav) Viewport Tabanına Sabitlenmesi**:
  - `BottomNav.tsx`, iç içe geçmiş flex kapsayıcılardan doğrudan ana sayfa kök seviyesine (`fixed inset-x-2.5 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50`) taşındı. Böylece sayfa sonuna kayma problemi çözüldü ve ekranın altında sabit kalması sağlandı.
  - İçeriğin mobil alt barın arkasında kalmaması için `main` alanına güvenli alt dolgu (`pb-32`) uygulandı.
- **Sunucu Seçiminde Sayfa Yüklenmeme Sorunu ve Çoklu Sistem Önbellek Ayrımı**:
  - Sistemler tablosunda bir sunucuya tıklandığında `invalidateCache()` tetiklenerek ve `corvus_active_system_changed` olayı fırlatılarak Genel Bakış (Dashboard) sayfasının anında taze verilerle yüklenmesi sağlandı.
  - `DashboardPage` içine aktif sunucu değişimi dinleyicisi eklenerek sunucu geçişinde otomatik veri yenileme devreye alındı.
  - `http.ts` içerisindeki `fetchCachedJson` önbellek anahtarları seçili sunucu kimliğiyle bölümlendi (`${activeSystemId}:${url}`) ve istek başlıklarına `X-System-Id` eklendi.
- **Navbar & Sidebar Düzen Çakışması Giderimi ve Profil Sayfası İzolasyonu**:
  - Profil sayfasında (`/profile`) gereksizce beliren sol menü (`Sidebar`) ve mobil çubuk kaldırıldı; Profil sayfası da tıpkı Filo ekranı gibi üst Navbar altında bağımsız tam genişlikli olarak izole edildi.
  - Sol kenar çubuğunun (Sidebar) altındaki mükerrer profil kutusu ve dil seçici tamamen kaldırıldı; profil yönetimi, çıkış yapma ve dil değiştirme tek merkez olarak üst Navbar'da toplandı.
- **Kalıcı Üst Navbar Mimarisi ve Ölçeklendirilmiş Corvus Tasarım Hiyerarşisi**:
  - Tüm sayfalarda (hem Filo `/` karşılama ekranında hem de bir sunucunun içine girildiğinde Genel Bakış, Konteynerler, Servisler sayfalarında) kalıcı olarak çalışan tekil bir üst bar (`Navbar.tsx`) entegre edildi.
  - Sayfa akışının bozulması önlendi: Üst bar hiçbir zaman kaybolmaz; bir sunucuya tıklandığında sol kenar çubuğu (`Sidebar.tsx`) bu üst barın altına pürüzsüzce oturur.
  - Profil görünümü doğrudan URL rotasına (`/profile`) bağlanan bağımsız bir sayfa olarak açılır hale getirildi.
  - Tüm Sistemler tablosu ve bölümü diğer Corvus sayfaları standartlarına (`PageHeader`, `max-w-[1400px]`, `rounded-3xl`, genişletilmiş satır dolguları ve ilerleme çubukları) uygun olarak büyütüldü.
- **Sistem Filosu Karşılama Ekranı Düzeni ve Geri Dönüş Breadcrumb Mimarisi**:
  - Seçilen sunucunun sol menüsünden (`Sidebar.tsx`) ve mobil alt bardan (`BottomNav.tsx`) "Sistemler" öğesi kaldırılarak, menünün en tepesine üst seviyedeki filo kokpitine (`/`) geri dönüş sağlayan temiz bir breadcrumb bağlantısı (`← Tüm Sistemler [/]`) eklendi.
  - Kullanıcı tarafından tanımlanmamış yerel disk doluluğunu alarm gibi gösteren yapay uyarı şeridi (`SystemsAlertBanner.tsx`) kod tabanından tamamen temizlendi.
- **Sunucu Seçiminde Doğrudan Corvus Ana Paneline Geçiş Mimarisi**:
  - Gereksiz ve kafa karıştırıcı olan ayrı detay sayfası (`SystemDetailPageView.tsx`) ve motor rozeti (`SystemsEngineBadge.tsx`) projeden tamamen silindi.
  - Filo tablosundan herhangi bir sunucuya tıklandığında, kullanıcının doğrudan bildiği ve yönettiği orijinal Corvus ekranına (`Genel Bakış`, `Servisler`, `Konteynerler`, `Metrikler`, `Uptime`, `Ayarlar`) sol kenar çubuğu (Sidebar) aktif olarak geçiş yapması sağlandı.
  - Filo üst barına (`SystemsNavbar.tsx`) Kullanıcı Ayarları / Profil kısayolu eklendi; genel kullanıcı yönetim ve profil ayarlarına ilk ekrandan erişim sağlandı.
  - Sunucuya özel yapılandırmalar (Docker ayarları, sunucu metrik saklama vb.) seçilen sunucunun kendi sol menüsündeki Ayarlar (`Settings`) sayfasında bırakıldı.
- **Sistemler Filosu İyileştirmeleri, Tam i18n Desteği ve Hata Giderme**:
  - `SystemDetailPageView.tsx` içindeki `TypeError: Cannot read properties of undefined (reading 'toFixed')` çalışma zamanı çökmesi; tüm metrik, CPU ve yük ortalaması hesaplamalarına eksiksiz null kontrolü eklenerek tamamen giderildi.
  - `App.tsx` içindeki `ChunkErrorBoundary` sınıfı, genel React bileşen çalışma zamanı hataları ile gerçek dinamik chunk yükleme hatalarını kesin olarak ayırt edecek şekilde güçlendirildi; böylece bileşen hatalarında yanlış "Yeni Sürüm Algılandı" döngüsü engellendi.
  - `SystemsNavbar.tsx`, `SystemsTable.tsx`, `SystemsAlertBanner.tsx`, `SystemDetailPageView.tsx` ve `Systems/index.tsx` içindeki tüm sabit kodlanmış (hardcoded) metinler tip güvenli i18n sözlüklerine (`tr.ts` ve `en.ts`) taşındı.
  - Filo tablosundaki Yük Ortalaması ve Ağ Trafiği kolonları, backend `SystemSummaryDto` ve `TelemetryRingBuffer` üzerinden gelen gerçek anlık verilerle beslendi; sahte/dummy değerler tamamen kaldırıldı.
  - Arama çubuğunda `Ctrl+K` klavye kısayolu işlevsel hale getirildi; gereksiz parlayan animasyonlar (`animate-ping`, `animate-pulse`) ve işlevsiz butonlar kaldırıldı.
  - Kullanıcı geri bildirimi doğrultusunda filo sayfasının altındaki kafa karıştırıcı `SystemsEngineBadge` (RAM: ~8 KB vb.) rozeti kaldırıldı.
- **Sistemler (Systems) Kokpiti 2-Kademeli Filo Mimarisi & Bağımsız Giriş Ekranı**:
  - Modern minimalist sunucu yönetim araçlarından ilham alınarak 2-katmanlı filo mimarisi kuruldu:
    - **1. Katman (Giriş Ekranı - Tüm Sistemler Filosu):** Açılışta kenar çubuğu (Sidebar) veya mobil alt bar olmaksızın tam ekran olarak sunulur (`AppLayout.tsx`). Üstte `SystemsNavbar.tsx` (Corvus logosu, arama çubuğu, uyarılar ve `+ Sistem ekle` butonu), aktif eşik uyarısı banner'ı (`SystemsAlertBanner.tsx`) ve her sunucunun durumunu, CPU, RAM, Disk barlarını, Yük Ortalamasını, Ağ hızını ve Konteyner sayısını gösteren yatay `SystemsTable.tsx` tablosunu içerir.
    - **2. Katman (Seçili Sistem Yönetim Paneli):** Filodaki herhangi bir sunucuya tıklandığında popup modal yerine doğrudan `SystemDetailPageView.tsx` ekranına geçilir. Üstte sunucu meta bilgileri (IP, işletim sistemi, çekirdek, RAM), zaman aralığı seçici (`live`, `1h`, `24h`, `7d`, `30d`), Çekirdek/Ağ/Depolama/Konteynerler/Güvenlik sekmeleri ve filoya tek tıkla geri dönme butonu sunulur.
  - Corvus Hub'ın üzerinde çalıştığı ana makine (`local-host`), `SystemMetricsCollector` tarafından dairesel bellek tamponuna ve veritabanına otomatik kaydedilerek listede ilk canlı düğüm olarak gösterildi.
  - Detay açılışında yaşanan chunk yükleme ve "Yeni Sürüm Algılandı" takılma sorunu giderildi.
- **React Hook Yaşam Döngüsü Tutarlılığı (`App.tsx`)**:
  - Komut paleti `useCommandPalette` / `fetchCommandItems` `useEffect` hook'u koşullu erken dönüşlerden (`authLoading`, `authStatus`) önce, bileşenin en üst seviyesine taşındı. Kullanıcı giriş yaptıktan sonra tetiklenen ve siyah ekrana yol açan üretim React #310 ("Rendered more hooks than during the previous render") hatası giderildi.

### Güvenlik (Security)
- **Oturum Çerezi Güvenli İletim Politikası (`AuthEndpoints.cs`)**:
  - `corvus_session` oturum çerezi, doğrudan HTTPS veya TLS sonlandırmalı ters vekil sunucu (`X-Forwarded-Proto: https`) arkasındayken otomatik olarak `Secure = true` olarak damgalandı. Yerel ağ HTTP homelab erişimini bozmadan şifresiz ortamda oturum çalınması (CWE-319/CWE-614) engellendi.
- **Log Sahteciliği ve CRLF Enjeksiyonu Koruması (`SecuritySanitizer.cs`)**:
  - Docker, Compose ve Webhook denetleyici loglarında dış kaynaklı/kullanıcı kaynaklı değerlerin satır sonu (`\r`, `\n`) karakterlerinden arındırılmasını sağlayan `SecuritySanitizer.SanitizeLog` merkezi mekanizması devreye alındı. Log bütünlüğü ve denetim güvenliği (CWE-117) güvenceye alındı.

### Değiştirilenler (Refactored)
- **Temiz Dashboard Mimarisi & Görsel Ferahlık**:
  - Genel Bakış (Dashboard) ekranı, deneysel sıkışık çoklu panel bölünmelerinden tamamen arındırılarak Corvus'un ferah, dengeli ve modern Midnight v2 kart düzenine geri getirildi; okunabilirlik ve performans en üst seviyeye çıkarıldı.
  - Sıfır sabit kodlanmış metin: `useI18n` altyapısıyla hem `tr.ts` hem de `en.ts` üzerinde eksiksiz ve senkronize çok dilli destek sağlandı.
- **Backend Model Zenginleştirmesi (`DockerModels.cs`)**:
  - `DockerContainerInfo` ve `DockerContainerDto` içerisine `NetworkSettings` (`DockerNetworkSettings`) dahil edilerek Docker ağ isimleri web istemcisine doğrudan serileştirildi.

## [1.5.30] - 2026-10-10

### Değiştirilenler (Refactored)
- **Docker İstemci Mimarisi & Soket İletişiminin Ayrıştırılması**:
  - Unix Domain Socket ve Windows Named Pipe tabanlı alt taşıma katmanı `DockerHttpTransport.cs` (`IDockerHttpTransport`) sınıfına çıkarıldı.
  - Özelleşmiş alt istemciler `Corvus.Api.Services.Docker` altında bağımsız modüller olarak yapılandırıldı: `DockerContainerClient.cs`, `DockerImageClient.cs`, `DockerVolumeClient.cs`, `DockerSystemClient.cs` ve `DockerExecClient.cs`.
  - 865 satırlık monolitik `DockerHttpClient.cs`, dışa dönük API sözleşmesini bozmadan hafif bir orkestratör cephesine (facade) dönüştürüldü.
- **Konteyner Sayfası Durum ve Olay Yönetiminin Ayrıştırılması**:
  - `Containers/index.tsx` içerisindeki periyodik yoklama, görünürlük dinleyicileri, SSE olay entegrasyonu, iyimser (optimistic) eylemler ve filtreleme mantıkları `useContainersPageState.ts` hook'una aktarılarak sayfa bileşeni sadeleştirildi.
- **Çok Kanallı Bildirim Mimarisi Modüler Ayrımı**:
  - `DiscordChannelSender`, `TelegramChannelSender`, `SlackChannelSender`, `SmtpChannelSender`, `NtfyChannelSender` ve `WebhookChannelSender` bağımsız sınıflara çıkarıldı (`Corvus.Api.Services.Notifications`).
  - SSRF saldırılarına karşı güvenli URL doğrulayıcısı (`NotificationSecurity.cs`) ve iki dilli (TR/EN) şablon formatlayıcısı (`NotificationMessageFormatter.cs`) ayrıştırıldı.
  - `NotificationService.cs` ~980 satırdan ince bir orkestratör cephesine (facade) dönüştürüldü; tüm xUnit testleriyle %100 uyumluluk korundu.
- **Uptime Protokol Denetleyicilerinin Ayrıştırılması**:
  - Protokol denetimleri `Corvus.Api.Services.Uptime.Checkers` altında bağımsız sınıflara bölündü: `HttpProtocolChecker`, `TcpProtocolChecker`, `PingProtocolChecker` ve `NetworkAddressResolver`.
  - Ağ adresi çözümleme, container gateway eşleme ve SSL bilgisi okuma kodları ana döngüden (`UptimeCheckerService.cs`) temizlendi.
- **Frontend Çekirdek Rota ve Yönlendirme Modülerleşmesi**:
  - URL ayrıştırma, browser geçmişi (`pushState`/`popstate`) ve sekme yönlendirmeleri `useAppNavigation.ts` hook'una aktarıldı.
  - Sayfa eşleme ve lazy-load render mekanizması `AppRouter.tsx` bileşenine çıkarılarak `App.tsx` sadeleştirildi.

### Eklenenler (Added)
- **Genel Komut Paleti (`Ctrl+K` / `Cmd+K`) & Klavye Odaklı Gezinme**:
  - **Hafif Bulanık Arama Algoritması (`fuzzySearch.ts`)**: Sıfır dış bağımlılıkla hızlı klavye filtreleme ve karakter dizisi puanlaması.
  - **Modüler Komut Paleti Modalı (`CommandPaletteModal.tsx`, `useCommandPalette.ts`, `commandItems.ts`)**: Klavye ok tuşları (`↑`/`↓`/`Enter`) ile Sayfalar, Konteyner Hızlı Eylemleri, Canlı Loglar, Web Terminali ve Sistem Metrikleri arasında anında geçiş.
  - **Kenar Çubuğu Hızlı Arama Butonu (`Sidebar.tsx`)**: Masaüstü ve mobil menüde tek tıkla komut paletini açan şık arama çubuğu ve `Ctrl K` kısayol rozeti.
- **Mikro-Animasyonlar & Yumuşak Sayfa Geçişleri**:
  - **Akıcı Sayfa Geçiş Katmanı (`PageTransition.tsx`)**: Rota değişimlerinde 150ms hafif opaklık ve yukarı kayma geçişi (`prefers-reduced-motion` erişilebilirlik korumalı).
  - **Kademeli Rakam Sayaç İnterpolasyonu (`useAnimatedNumber.ts`)**: Canlı telemetri ve metrik sayaçlarının sıçramadan yumuşakça akmasını sağlayan hook.
  - **İskelet Yükleme Ekranları (`Skeleton.tsx`)**: Tablolar ve kartlar için yükleme esnasında göze batmayan modern shimmer iskelet göstergeleri.
- **Proaktif Metrik Eşik Alarm Motoru (Faz 9)**:
  - **SQLite Alarm Kuralları Tablosu (`014_alert_rules.sql`)**: Kullanıcı tanımlı CPU, RAM ve Disk eşik kuralları, ihlal süresi ve spam önleyici cooldown sürelerini saklayan kalıcı tablo.
  - **Dapper Veri Erişim & Native AOT Desteği (`AlertRuleRepository.cs`, `AlertRule.cs`, `CorvusJsonSerializerContext.cs`)**: Sıfır çalışma zamanı yansıması (reflection-free) ile yüksek performanslı veri katmanı.
  - **Arka Plan Kayan Pencere Değerlendiricisi (`ThresholdEvaluatorService.cs`)**: Sistem metriklerini sürekli inceleyen, ihlal sürelerini takip eden ve anlık spike'larda gereksiz alarm üretmeyen arka plan izleyicisi.
  - **Çok Kanallı Eşik Bildirimleri (`NotificationService.cs`)**: Eşik aşımı ve normale dönme (resolved) durumlarında Discord, Telegram, Slack, SMTP, Ntfy ve Webhook kanallarına anında uyarı iletimi.
  - **REST Yönetim Uç Noktaları (`AlertRulesEndpoints.cs`)**: `RequireAdmin` korumalı tam CRUD API (`/api/alerts/rules`).
  - **Olay Geçmişi ve Denetim Zaman Çizelgesi (Faz 10)**:
    - **SQLite Olay Kayıtları Tablosu (`015_activity_logs.sql`)**: Konteyner işlemleri, metrik alarmları ve yönetici eylemleri için zaman ve kategori indeksli yapısal loglama.
    - **Kuyruk Tipi Asenkron Yazma Hattı (`ActivityLogService.cs`, `ActivityLogRepository.cs`)**: `System.Threading.Channels` ile ana API akışına sıfır gecikme maliyeti getiren tamponlu arka plan kayıt mekanizması.
    - **Native AOT DTO'ları & Serileştirme (`ActivityLogEntry.cs`, `CorvusJsonSerializerContext.cs`)**: Uçtan uca yansımasız (reflection-free) güvenli veri modelleri.
    - **Denetim REST Uç Noktaları (`ActivityLogEndpoints.cs`)**: Sayfalamalı ve kategori filtreli `/api/activity-logs` API'si ve otomatik saklama süresi temizliği.
    - **Olay Zaman Çizelgesi Ekranı (`ActivityTimeline/index.tsx`, `ActivityTimelineItem.tsx`, `ActivityTimelineFilter.tsx`)**: Kategori rozetleri, aktör bilgisi ve hızlı filtre çipleri içeren kronolojik olay akışı.
  - **Docker Hacim ve İmaj Hijyen Denetimi (Faz 11)**:
    - **İki Aşamalı Önizlemeli Sistem Hijyeni**: `GET /api/containers/system-df` ile disk analizi ve `POST /api/containers/prune/selective` ile seçici temizlik.
    - **Klavyeden Doğrudan Temizlik Başlatıcı**: Komut Paleti üzerinden (`action-prune`) ve `/containers?action=prune` sorgu parametresiyle anında disk temizlik ekranına geçiş.

## [1.5.28] - 2026-10-10

### Düzeltilenler (Fixed)
- **Konteyner İnceleme Verisi Normalizasyonu & Eksik Alanların Onarılması**:
  - **Büyük/Küçük Harf Toleranslı Güvenli Veri Erişimi (`inspectHelpers.ts`)**: Docker daemon'ın PascalCase (`Config`, `NetworkSettings`, `PortBindings`, `Mounts`) çıktısı ile istemci tarafındaki camelCase (`config`, `networkSettings`, `mounts`) alan eşleşmesi düzeltildi. Ortam değişkenleri (`Env`), port eşleşmeleri, bağlı Docker ağları ve depolama bağlama noktaları (mounts) artık `/containers/:id` detay sayfasında eksiksiz ve hatasız listelenir.
  - **Çalışma Zamanı ve Sağlık Durumu Çözümleyicisi**: Konteyner çalışma dizini, başlangıç komutları (entrypoint) ve konteyner sağlık durumu (health probes) için güvenli veri haritalandırması yapıldı.
- **Akıcı Satır Tıklama Geçişi & Hızlı Eylemler (Quick Actions) Çubuğu**:
  - **Tüm Satıra Tıklanabilir Doğrudan Gezinme (`ContainerRow.tsx`)**: 3 nokta menüsüyle uğraşma zorunluluğu kaldırılarak tüm satır tıklanabilir hale getirildi (`hover:bg-white/[0.08] active:scale-[0.998] transition-all`); tıklandığında akıcı mikro-geçişle doğrudan `/containers/:id` sayfasına yönlendirir. Buton tıklamaları `stopPropagation` ile izole edildi.
  - **Satır Üstü Hızlı Eylemler Çubuğu (`ContainerQuickActions.tsx`)**: Tablo satırlarına doğrudan tek tıkla Canlı Loglar (`FileText`), Konteyner İnceleme (`Info`), Telemetri ve Kaynaklar (`Activity`) ve Web Terminali (`Terminal`) sekmesini açan kompakt aksiyon seti eklendi.
  - **Tıklanabilir Yayınlanan Portlar (`ContainerRow.tsx`)**: Dışa açılan portlar (`p.PublicPort ? host:port ↗`) yeni tarayıcı sekmesinde açılabilir köprü bağlantılarına dönüştürüldü.
  - **Doğrudan Sekme Bağlantısı (`App.tsx`, `Containers/index.tsx`, `ContainerDetail/index.tsx`)**: `?tab=` URL sorgu parametresi desteğiyle Hızlı Eylem ikonuna tıklandığında doğrudan ilgili sekmenin açılması sağlandı.
- **OCI Registry İmaj Güncelleme Takipçisi & Digest İzleyici**:
  - **Sıfır Yüklü Manifest Sorgulama (`OciRegistryClient.cs`)**: Docker Hub, GitHub Container Registry (GHCR) ve Quay üzerinde `/v2/{repo}/manifests/{tag}` adreslerine sıfır gövdeli HEAD istekleri atarak büyük imaj katmanlarını indirmeden (bant genişliği tüketmeden) üst sürüm olup olmadığını tespit eden istemci uygulandı.
  - **Docker Engine Katman Karşılaştırması (`DockerHttpClient.cs`, `DockerService.cs`)**: Konteynerin `RepoDigests` verisi ile uzak registry'den alınan SHA256 digest'ı karşılaştırılarak güncelleme durumu hesaplanır.
  - **Tek Tıkla Güvenli Yeniden Oluşturma (`ContainersEndpoints.cs`)**: `POST /api/containers/{id}/recreate` (`RequireAdmin`) uç noktası ile yeni imaj çekilir, eski konteyner durdurulur ve aynı konfigürasyonla kesintisiz yeniden ayağa kaldırılır.
  - **Görsel Güncelleme Bildirimi (`ImageUpdateModal.tsx`, `ContainerRow.tsx`, `ContainerList.tsx`, `ContainerDetailHeader.tsx`)**: Konteyner listesinde, kartlarda ve detay sayfasında amber "Güncelleme Var" rozeti ve yerel vs uzak hash özetlerini gösteren modal eklendi.
- **Docker Compose YAML İnceleyici & Güvenli Düzenleyici**:
  - **Dizin Aşımı Korumalı YAML Servisi (`ComposeFileService.cs`, `ComposeEndpoints.cs`)**: Compose etiketlerinden dosya yolunu çözer, dizin aşımı (`..`) girişimlerini engeller.
  - **Otomatik `.bak` Yedeği**: Dosyaya yazılmadan önce mevcut dosyanın otomatik `.bak` yedeği alınır.
  - **Modüler Tarayıcı İçi Editör (`ComposeConfigModal.tsx`, `ComposeStackGroup.tsx`)**: Monospace formatlama, satır sayısı, dosya boyutu göstergesi ve "Kaydet ve Stack'i Yeniden Başlat" aksiyonu sunan hafif editör bileşeni.
- **Olay Güdümlü Kendi Kendini Onarma (Auto-Healing) & Gelen Dağıtım Webhook'ları**:
  - **Döngü Korumalı Otomatik Kurtarma (`AutoHealingService.cs`, `ContainerDiscoveryService.cs`)**: Sıfır olmayan çıkış koduyla çöken konteynerler anında tespit edilip yeniden başlatılır; kayan pencere algoritmasıyla (15 dakikada en fazla 2 deneme) sonsuz flapping döngüleri engellenir.
  - **Çok Kanallı Kurtarma Alarmları (`NotificationService.cs`)**: Başarılı otomatik kurtarmalarda Discord, Telegram, Slack, SMTP, Ntfy ve Webhook kanallarına anında bildirim gönderilir.
  - **Sabit Zamanlı Gelen Dağıtım Webhook'u (`DeployWebhookEndpoints.cs`)**: CI/CD boru hatları için `POST /api/hooks/deploy/{token}` uç noktası eklendi; timing saldırılarına karşı `CryptographicOperations.FixedTimeEquals` ile doğrulanır.
  - **Dağıtım Token Yönetim Arayüzü (`GeneralSettingsTab.tsx`)**: Güvenli webhook token üretme ve görüntüleme ayar kartı eklendi.
- **Konteyner Detay Sayfası & Bağımsız URL Mimarisi**:
  - **Tam Ekran Bağımsız Konteyner Paneli (`/containers/:id`)**: Konteyner inceleme işlemi sıkışık modal penceresinden (`ContainerDetailModal`) çıkarılarak doğrudan URL ile erişilebilir, yer imlerine eklenebilir ve sayfa yenilendiğinde kaybolmayan tam ekran bağımsız bir detay sayfasına dönüştürüldü.
  - **Canlı CPU & RAM Trend Görselleştirmesi (`ContainerHistoricalCharts.tsx`)**: Konteynerin CPU yükünü ve bellek kullanım geçmişini renk kodlu degrade dolgular ve araç ipuçlarıyla gösteren duyarlı Recharts Area grafikleri eklendi.
  - **Docker Compose Stack Toplu Eylemleri (`ComposeStackGroup.tsx`, `GroupSection.tsx`)**: Compose grup başlıklarına tüm projeyi tek seferde Yeniden Başlatma, Başlatma ve Durdurma butonları ile döner yükleme göstergesi eklendi.
  - **Anormal Çıkış Kodu İzleme (`ContainerDiscoveryService.cs`, `NotificationService.cs`)**: Sıfır olmayan çıkış koduyla duran veya çöken (ExitCode != 0, OOMKilled) konteynerler anında tespit edilerek Discord, Telegram, Slack, SMTP, Ntfy ve Webhook kanallarına acil bildirim iletilmesi sağlandı.
- **Konteyner Web Terminali ve Etkileşimli Girdi Akışı (Stdin)**:
  - **Docker Exec HTTP El Sıkışma Boyut Doğrulaması (`DockerHttpClient.cs`)**: Docker daemon'a ham HTTP upgrade isteğinde dinamik UTF-8 byte hesaplayıcısıyla el sıkışma düzeltildi.
  - **Anlık Stdin Akış Boşaltma (`ContainersEndpoints.cs`)**: WebSocket üzerinden gelen her tuş vuruşunun Docker giriş borusuna yazılmasının ardından hemen `await dockerStream.FlushAsync(ct)` çağrılması sağlandı.
  - **Evrensel Kabuk Önceliği & Alpine / Minimal Uyumluluğu (`ContainersEndpoints.cs`)**: Otomatik kabuk tespit listesinde POSIX standardı `/bin/sh` ve `sh` kabukları `/bin/bash` önüne alındı.

### Değiştirilenler (Changed)
- **Dokümantasyon & Açık Kaynak Vitrini Modernizasyonu**:
  - **10 Saniyede Hızlı Başlangıç Önceliği**: Doğrulanmış tek satırlık `docker run` komutu (`ghcr.io/brhnshn/corvus:latest`) ve yalın `compose.yaml` örneği `README.md` ve `README.tr.md` dosyalarının en üstüne taşındı.
  - **Otantik Mühendislik & Mimari Kapsam**: Şişirilmemiş somut verilerle "Mimari Kapsam ve Felsefe" karşılaştırma tablosu ve sıfır-CLR, Workstation GC, bellek kompaktörü ile gömülü SQLite WAL çalışma prensiplerini açıklayan "Native AOT Mühendislik Avantajı" bölümü eklendi.
  - **Resmi Konteyner Registry Uyumu**: Şablon imaj adları resmi GitHub Container Registry adresi (`ghcr.io/brhnshn/corvus:latest`) ile güncellendi.
  - **İlham Kaynakları & Teşekkür**: Açık kaynak saygı ve ilham etiği kurallarına uygun olarak referans projeler resmi listeye eklendi.
  - **Kapsamlı Mimari & Şartname Dokümantasyonu Senkronizasyonu**: `README.md`, `README.tr.md`, `docs/architecture.md`, `docs/architecture.tr.md`, `docs/specification.md`, `docs/specification.tr.md`, `docs/ROADMAP.md` ve `docs/ROADMAP.tr.md` dosyaları; Faz 6, Faz 7 ve Faz 8 yol haritasını yansıtacak şekilde baştan sona eksiksiz güncellendi.

---

## [1.5.27] - 2026-10-05

### Düzeltilenler (Fixed)
- **Konteyner Alt İşlem Çekmecesinin Sadeleştirilmesi**:
  - **Çekmece Aksiyonlarının Arındırılması (`ContainerActionSheet.tsx`)**: HTML prototipinin saf ve sade yapısıyla tam uyumlu olacak şekilde, alt çekmecedeki "Konteyner detayları" ve "Kaynak sınırları & telemetri" butonları kaldırıldı. Çekmece doğrudan günlükler, terminal, etiketleme ve yaşam döngüsü eylemlerine (başlat/durdur/duraklat/yeniden başlat) odaklandı.
- **Mimari Planlama (Roadmap Güncellemesi)**:
  - **Bağımsız Konteyner Detay & Telemetri Sayfası (`/containers/:id`)**: Modal tabanlı inceleme ve kaynak yönetimi yerine gelecekte konteynerin derinlemesine telemetri ve yapılandırmasını barındıracak bağımsız bir tam ekran detay sayfası (`/containers/:id`) oluşturulması Faz 6 (Bilet 6.1) olarak mimari yol haritasına (`ROADMAP.md`, `ROADMAP.tr.md`) kaydedildi.

---

## [1.5.26] - 2026-10-05

### Düzeltilenler (Fixed)
- **Konteyner Kaynak Sınırları ve Canlı Telemetri Zenginleştirmesi**:
  - **Gerçek Zamanlı Telemetri ve Performans Göstergeleri (`ContainerResourcesTab.tsx`)**: Boş kalan kaynak sınırları sekmesi, gerçek zamanlı telemetri motoruyla donatıldı. Çalışan konteynerler için anlık CPU kullanımı (%), bellek kullanımı (MB/GB ve %), tanımlı çekirdek/RAM limitleri ile dinamik renkli ilerleme çubukları (yeşil / sarı / kırmızı) ve canlı ağ giriş/çıkış (Rx/Tx) veri akışı entegre edildi.
  - **Host Donanım Kapasitesi ve Docker Compose Farkındalığı**: Konteynere ayrılmış limitler ile sunucunun (host) toplam fiziksel RAM ve CPU kapasitesi karşılaştırmalı olarak sunuldu. Compose yığınlarına bağlı konteynerler için otomatik compose yığın etiketi ve kalıcı kaynak limitleri (`deploy.resources.limits`) bilgilendirme paneli eklendi.
  - **Doğrudan Sekme Yönlendirmesi ve Alt Menü Ayrımı (`ContainerActionSheet.tsx` & `ContainerDetailModal.tsx`)**: Konteyner işlem çekmecesindeki "Kaynak sınırları" eylemi "Kaynak sınırları & telemetri" olarak güncellendi ve doğrudan ilgili sekmeyi açacak şekilde `initialTab` yönlendirmesi eklendi. Genel yapılandırma için "Konteyner detayları" seçeneği bağımsız olarak ayrıldı.

---

## [1.5.25] - 2026-10-05

### Düzeltilenler (Fixed)
- **Eksiksiz Midnight v2 Modernizasyonu ve Eski Tasarım Sisteminin Tamamen Kaldırılması**:
  - **Uptime İzleme Ekranları ve Modalları**: Push Monitörleri (`PushMonitorsTab.tsx`), Snitch ekleme modalı (`AddSnitchModal.tsx`), Olaylar / Duyurular sekmesi (`IncidentsTab.tsx`), Olay ekleme penceresi (`AddIncidentModal.tsx`), Ping Uptime sekmesi (`PingUptimeTab.tsx`), Son Kontroller tablosu (`UptimeRecentChecks.tsx`) ve yardımcı pencereler (`DisableUptimeDialog`, `EnableUptimeModal`, `DiscoveredServicesSection`) Midnight v2 `sheet-glass` cam morfolojisi ve `surface` standartlarına taşındı.
  - **Servis Yönetimi ve Modalları**: Servis ekleme penceresi (`AddServiceModal.tsx`), gelişmiş kontrol parametreleri (`AdvancedCheckOptions.tsx`), servis düzenleme modalı (`EditServiceModal.tsx`), ilk yönetici kayıt istemi (`RegistrationPromptModal.tsx`) ve servis boş durum kartı (`ServicesEmptyState.tsx`) modern köşe kavisli girdiler ve Midnight v2 eylem butonlarıyla yenilendi.
  - **Ayarlar ve Bildirim Kanalları**: Bildirim kanalı sekme çubuğu, 6 adet entegrasyon paneli (Discord, Telegram, Slack, Webhook, SMTP E-Posta, Ntfy), Kararsızlık (Flapping) koruma kartı ve olay filtreleme kutuları Midnight v2 tasarım diline geçirildi. Yedekleme sekmesi (`BackupSettingsTab.tsx`) karanlık kod önizleme alanı ve kopyalama düğmeleriyle modernize edildi.
  - **Kullanılmayan Ölü Kodların Temizlenmesi**: Projede unutulmuş ve kullanılmayan 6 eski dashboard bileşeni (`ActiveContainersWidget`, `AttentionRequiredCard`, `OperationsWidget`, `QuickServicesGrid`, `SystemKpiStrip`, `SystemPulseHero`) projeden tamamen kaldırılarak mimari dokümanları güncellendi.
  - **Eski Renk Kodlarının Sıfırlanması**: Kod tabanında kalan tüm eski renk kodları (`#1a1d29`, `#0f1117`, `#2a2e3f` vb.); `App.tsx`, `LanguageSwitch.tsx`, `TagFilterBar.tsx`, `TagInput.tsx`, `GroupSection.tsx` ve `ContainerActionButtons.tsx` genelinde tamamen temizlendi.

---

## [1.5.24] - 2026-10-05

### Düzeltilenler (Fixed)
- **HTML Referans Çekmecesi ile 1:1 Birebir Uyumluluk (`Corvus – Konteynerler.html`)**:
  - **Akıcı Çekmece Fiziği (`Sheet.tsx`)**: Statik Tailwind açılışı yerine HTML prototipindeki `transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)` eğrisi ile ekranın tamamen altından (`translate(-50%, 105%)`'ten `translate(-50%, 0)`'a) kayarak açılma ve yumuşak karartma (scrim) animasyonu sağlandı.
  - **Alt Kenara Sıfırlanma ve Kompakt Genişlik**: Panel masaüstünde de dahil olmak üzere `bottom: 0`, `w-[min(100%, 460px)]` ve `rounded-t-[28px]` ile alt kenara tam oturtuldu, kenarlardaki yüzen boşluklar kaldırıldı.
  - **Sade Tek Sütunlu Menü (`ContainerActionSheet.tsx`)**: Kaba 2 sütunlu kartlar ve uzun paragraflar kaldırılarak HTML tasarımındaki `.mi` dikey buton listesi formatına (Loglar, Terminal, Kaynak sınırları, Etiket ekle, Yeniden Başlat, Duraklat/Devam ettir, Durdur/Başlat) dönüştürüldü.

---

## [1.5.23] - 2026-10-05

### Düzeltilenler (Fixed)
- **Konteyner Alt Aksiyon Çekmecesi ve Modal Mimarisi Yenilemesi**:
  - **Gerçek Alt Çekmece (Bottom Sheet) Deneyimi (`Sheet.tsx` & `ContainerActionSheet.tsx`)**: Masaüstünde ortalanmış sıradan modal yerine tüm ekran boyutlarında sayfa altından yukarı kayarak açılan modern alt çekmece (drawer) mimarisi sağlandı. Sürükleme tutamacı (drag handle), konteyner durum hapı (Pill), imaj rozeti ve iki aşamalı eylem kartları (*İnceleme & Geliştirici Araçları* ve *Yaşam Döngüsü Eylemleri*) entegre edildi.
  - **Konteyner Modallarının Midnight v2 Tasarımına Geçişi**: Eski temadan kalan `#1a1d29` ve `slate-*` renkleri temizlenerek projenin güncel Midnight v2 tasarım sistemine uyarlandı:
    - **Canlı Günlükler Modalı (`ContainerLogsModal.tsx`)**: `sheet-glass` cam katmanı (`rounded-[28px] border-white/10`), canlı SSE akış rozeti, modern filtreleme girdisi ve okunabilir monospace log alanı.
    - **Web Terminal Modalı (`ContainerTerminalModal.tsx`)**: Midnight v2 kabuk (shell) seçici, bağlantı durum hapı ve tam ekran kontrolleri.
    - **Etiket Yönetim Modalı (`ContainerTagsModal.tsx`)**: Temiz Midnight v2 etiket giriş alanı ve aksiyon butonları.
    - **Konteyner Detay & Canlı Yapılandırma (`ContainerDetailModal.tsx`)**: 5 sekmeli detay modalı ve alt bileşenleri (`ContainerOverviewTab`, `ContainerEnvTab`, `ContainerNetworkingTab`, `ContainerStorageTab`, `ContainerResourcesTab`) cam sekmeler ve `surface` kartları ile yenilendi.
    - **Güvenli Sistem Analizi & Temizliği (`SystemPruneModal.tsx`)**: Disk analiz raporu, alt tablolar (`PruneContainersTable`, `PruneImagesTable`, `PruneVolumesTable`, `PruneBuildCacheCard`) ve alt işlem çubuğu Midnight v2'ye taşındı.

---

## [1.5.22] - 2026-10-05

### Düzeltilenler (Fixed)
- **Dayanıklı ve Gizlilik Korumalı Dağıtım Webhook Mekanizması**: `ci.yml` ve `release.yml` dağıtım adımlarına 3 aşamalı yeniden deneme döngüsü (retry with backoff) ve 15 saniye bağlantı zaman aşımı eklendi. Açık kaynak repository loglarında sunucu hata yanıtlarının, IP veya iç dizin bilgilerinin sızmasını engellemek için curl çıktısı `/dev/null`'a yönlendirildi; yalnızca sayısal HTTP durum kodunun izlenmesi sağlanarak tam güvenlik ve gizlilik sağlandı.

---

## [1.5.21] - 2026-10-04

### Eklenenler (Added)
- **Midnight v2 Bütünleşik Ön Yüz Tasarım Sistemi**:
  - **Paylaşımlı Tasarım Değişkenleri & Yardımcı Sınıflar**: Düz `#0d0e15` arka plan, `surface` kart katmanı (`rgba(27,29,42,0.9)`), tekil açık gri `#d5d5dc` odak rengi ve anlamsal durum renkleri (`ok`: `#34d399`, `warn`: `#fbbf24`, `err`: `#f87171`, `neutral-bar`: `rgba(213,213,220,0.55)`) entegre edildi. `@utility surface`, `@utility glass`, `@utility sheet-glass` ve `animate-rv`, `animate-dot-pulse` anahtar kare animasyonları tanımlandı.
  - **Modüler Arayüz Bileşen Kütüphanesi (`src/components/ui/`)**: Temiz mimari ve modüler ayrım kuralı uyarınca tekrar kullanılabilir tip güvenli bileşenler inşa edildi: `Button`, `Pill`, `ProgressBar`, `StatTile`, `SearchInput`, `FilterChip`, `TagChip`, `Segment`, `Sheet`, `Toast` (`ToastProvider` & `useToast`), `EmptyState`, `SslBadge`, `HistoryBars`.
  - **Merkezi Katlanabilir Yerleşim Düzeni (`AppLayout.tsx`)**: Sayfa bazında tekrarlayan sarmalayıcılar yerine MVC benzeri merkezi bir yerleşim geliştirildi. Sol panelin (Sidebar) katlanabilmesi, katlanma durumunun `localStorage`'da saklanması, katlandığında sol üstte beliren Corvus logolu animasyonlu hap tetikleyici buton ve mobil uyumlu alt navigasyon barı sağlandı.
  - **Genel Bakış (Dashboard) Yenilemesi**: `StatTile` tabanlı KPI kartları, canlı bellek tüketim rozeti, kritik/uyarı durumundaki konteynerler ve süresi yaklaşan SSL sertifikaları için dikkat paneli (`AttentionAlerts`), en çok RAM tüketen ilk 5 konteyner çubuğu ve 24 saatlik olay zaman çizelgesi modernleştirildi.
  - **Servisler & Konteynerler Sayfaları**: Servis kartları, grup başlıkları ve konteyner liste/küme görünümleri tek renkli eşik çubukları, `SearchInput`, `FilterChip` ve alt çekmece aksiyon menüsü (`ContainerActionSheet`) ile yenilendi.
  - **Sistem Metrikleri Sayfası**: Recharts alan grafikleri rastgele camgöbeği/mor degradelerden arındırılarak kesin eşik renklerine bağlandı, zaman aralığı `Segment` bileşeni entegre edildi ve disk depolama kartı 3'lü kapasite kutucuklarıyla modernize edildi.
  - **Uptime & Sistem Ayarları Sayfaları**: Uptime izleme sekmeleri, servis arama/filtreleme seçicisi ve sistem ayarları Midnight v2 cam sekmeleri ve uyumlu `surface` kartları ile dönüştürüldü.
  - **Profil & Kullanıcı Yönetimi Yenilemesi**: `/profile` güvenlik sekmesi, ekip yetkilendirmesi ve `AddUserModal` bileşeni `surface` kartları ve `Button` kütüphanemizle modernize edildi.
  - **Giriş & İlk Kurulum Ekranı (/auth)**: Giriş ve kayıt ekranı Midnight düz zemini, şık `surface` form kartı, cam tab geçişi ve erişilebilir form elemanları ile yenilendi.
  - **Herkese Açık Durum Sayfası (/status)**: Dışa dönük sistem durum sayfası, kategori akordeonları, servis çubukları ve olay/bakım duyuru panoları Midnight v2 görsel çizgisine kavuşturuldu.

### Değiştirilenler (Changed)
- **Eşik Tabanlı İlerleme & Metrik Renklendirmesi**: Tüm ilerleme çubukları ve zaman serisi grafiklerindeki mor/camgöbeği süsleme degradeleri kaldırıldı; renklerin sistem kaynak yük eşiklerini kesin ve doğru biçimde yansıtması sağlandı (<%70 normal, %70-89 yüksek, >=%90 kritik).
- **Özgün Marka Kimliği & Terminoloji**: Arayüz metinlerinde üçüncü taraf araç adları yerine bağımsız ve endüstri standardı mühendislik terminolojisi kullanıldı.

---

## [1.5.20] - 2026-10-03

### Eklenenler (Added)
- **Güvenli Sistem Temizliği ve Kuru Çalıştırma Ön İnceleme (Paket 3 — Safe System Prune & Dry-Run Audit)**:
  - **Kuru Çalıştırma (Dry-Run) Analiz Motoru:** Docker daemon'ın `GET /system/df` API'si üzerinden durdurulmuş konteynerlerin, kullanılmayan imajların, sahipsiz hacimlerin ve derleme önbelleğinin kazandıracağı disk alanını silme öncesi hesaplayan `GET /api/containers/system-df` uç noktası devreye alındı.
  - **Seçici Temizlik (Selective Prune) API'si:** Kullanıcının yalnızca istediği ID ve isimleri seçerek silebilmesini sağlayan `POST /api/containers/prune/selective` uç noktası ve `DockerSelectivePruneRequest` modeli geliştirildi.
  - **Modüler Ön İnceleme Arayüzü:** Tek tıkla kontrolsüz silme yerine 2 aşamalı (tarama/onay) modüler arayüz (`SystemPruneModal.tsx`) geliştirildi; `PruneContainersTable`, `PruneImagesTable`, `PruneVolumesTable` ve `PruneBuildCacheCard` bileşenlerine ayrıştırıldı.
  - **Kalıcı Hacim Veri Kaybı Koruması:** Herhangi bir konteyner tarafından bağlanmamış ancak veritabanı veya medya barındırabilecek sahipsiz Docker hacimleri için kritik uyarı rozetleri ve varsayılan olarak seçili gelmeme koruması uygulandı.
- **Konteyner Detay & Canlı Yapılandırma Düzenleme (Paket 4 — Container Detail & Live Configuration Management)**:
  - **Kapsamlı Konteyner İnceleme (Inspect):** `DockerContainerInspectInfo` modeli genişletilerek komutlar, entrypoint, çalışma dizini, kullanıcı, tam zaman damgaları, ağ uç noktaları, port eşleşmeleri ve bağlı hacimler eksiksiz ayrıştırıldı (`GET /api/containers/{id}/inspect`).
  - **Canlı Kaynak Güncelleme API'si:** Konteyneri yeniden oluşturmadan ve kesinti yaşatmadan CPU çekirdek kotası (`NanoCpus`), RAM limiti (`Memory`) ve yeniden başlatma politikasını canlı güncelleyen `POST /api/containers/{id}/update` uç noktası eklendi.
  - **Modüler Konteyner Detay Modalı:** `ContainerDetailModal.tsx` ve 5 bağımsız alt sekme (`ContainerOverviewTab`, `ContainerEnvTab`, `ContainerNetworkingTab`, `ContainerStorageTab`, `ContainerResourcesTab`) geliştirildi.
  - **Ortam Değişkenleri Görüntüleyici:** Hassas parolaları maskeleme toggle'ı, filtreleme araması ve tek tek veya toplu `.env` panoya kopyalama desteği sunuldu.
  - **İnteraktif Konteyner Erişimi:** Düz liste ve Compose gruplarında konteyner isimleri tıklanabilir hale getirildi; ayrıca aksiyon çubuğuna hızlı detay butonu eklendi.
- **Konteyner Etiketleme ve Filtreleme (Paket 2 — Container Tags & Category Management)**:
  - **Backend & Native AOT DTO:** `UpdateContainerTagsRequest` modeli oluşturuldu ve `CorvusJsonSerializerContext` kaynak üreticisine kaydedildi.
  - **Veritabanı ve Repository Katmanı:** `ServicesRepository` sınıfına `SaveContainerTagsAsync` ve `GetAllContainerTagsAsync` eklendi; etiketlerin `service_overrides` üzerinde upsert edilmesi ve `services` tablosuyla eşzamanlanması sağlandı.
  - **Docker Servisi ve Etiket Birleştirme:** `DockerContainerInfo` modeline `Tags` listesi eklendi; `DockerService.GetContainersAsync` içinde Docker label'larından çıkarılan etiketler ile `service_overrides` veritabanı kayıtları harmanlanarak konteynerlere atandı. `InvalidateContainersCache` mekanizmasıyla etiket güncellemelerinde anında önbellek tazeleme sağlandı.
  - **Konteyner Etiket API Endpoint'i:** `PUT /api/containers/{id}/tags` endpoint'i (`[RequireAdmin]`) eklendi; istek gövdesinden etiketleri alıp kaydederek audit günlüğü ve `container_tags_updated` SSE yayını yaptı.
  - **Frontend Tipleri ve API:** `DockerContainer` arayüzüne `tags?: string[]` eklendi; `containersApi.updateContainerTags` metodu geliştirildi.
  - **Ortak TagFilterBar Bileşeni:** `src/Corvus.Web/src/components/common/TagFilterBar.tsx` ortak bileşeni oluşturuldu; `/containers` sayfasında anlık etiket süzme (hem düz liste hem Compose grupları dahil) aktif kılındı.
  - **Modüler Konteyner Etiket Modalı:** `src/Corvus.Web/src/pages/Containers/ContainerTagsModal.tsx` oluşturuldu; `TagInput` kullanılarak konteyner satırından veya rozetlerden tek tıkla etiket düzenleme imkanı sunuldu.
- **Akıllı Kabuk Otomatik Tespiti ve Fallback Zinciri (Paket 1)**:
  - `ContainersEndpoints.cs` ve arayüz kabuk seçicisine `auto` seçeneği eklendi (`/bin/bash` -> `/bin/sh` -> `/bin/ash` -> `sh`). Seçilen kabuk konteynerde bulunmadığında bağlantının kopması engellendi; otomatik olarak var olan kabuğa geçiş sağlandı.
  - Docker exec oluşturma gövdesine (`DockerHttpClient.cs`) `"Env": ["TERM=xterm-256color"]` parametresi eklenerek Linux kabuklarında ok tuşları, geçmiş gezinimi (readline) ve renkli çıktı tam uyumlu kılındı.
  - `StartExecStreamAsync` içinde HTTP durum kodu (`101 UPGRADED` / `200 OK`) kontrolü getirilerek Docker daemon başlatma hataları kabuk deneme döngüsünde anında yakalanabilir hale getirildi.
- **Birim Test Kapsamı:** İnceleme, güncelleme, etiketler ve seçici temizlik metotları için `DockerServiceTests.cs` ve `ContainerTagsTests.cs` testleri eklendi (tüm 223 test başarılı).

### Düzeltilenler (Fixed)
- **Web Terminali Pipe Kilitlenme Düzeltmesi (Paket 1)**: `ContainersEndpoints.cs` içindeki NamedPipeClientStream üzerinde Win32 `FlushFileBuffers` çağrısını tetikleyerek klavye girişini kilitleyen gereksiz `FlushAsync` kaldırıldı; terminal yazım akışı anlık ve akıcı hale getirildi.
- **XTerm Girdi Akışı Konsolidasyonu**: `ContainerTerminalModal.tsx` içindeki mükerrer `term.onBinary` dinleyicisi kaldırılarak tüm kullanıcı girişleri tekil `term.onData` üzerinden güvenle iletilecek biçimde standartlaştırıldı.

---

## [1.5.19] - 2026-10-02

### Eklenenler (Added)
- **Servis & Konteyner Etiketleme / Gruplama (Faz 5 - Bilet 5.2)**:
- **Veritabanı Şema Güncellemesi (`013_service_tags.sql`)**: `services` ve `service_overrides` tablolarına kesintisiz migration ile `tags TEXT DEFAULT ''` kolonu eklendi.
- **Native AOT Backend Modelleri & Esnek Ayrıştırma**:
  - `Service` ve `ServiceOverride` modellerine `List<string> Tags` özelliği entegre edildi.
  - `CreateServiceRequest` ve `UpdateServiceRequest` kaynak üretimli DTO modellerine opsiyonel `Tags` alanı eklendi.
  - Hem JSON array metni (`["Prod","DB"]`) hem de virgülle ayrılmış dizgileri (`Prod, DB`) hatasız şekilde okuyan, boşlukları budayan ve yinelenenleri eleyen esnek ayrıştırıcı (`ParseTags`) geliştirildi.
  - Docker servisleri arayüzden etiketlendiğinde (`service_overrides`) arka plan senkronizasyonlarının bu etiketleri koruması sağlandı.
  - Docker container etiketlerinden (`corvus.tags`, `environment`, `env`, `com.docker.compose.project`) otomatik etiket türetme motoru devreye alındı.
- **Modüler Frontend Etiket Mimarisi**:
  - `TagBadge.tsx`: Etiket metnine göre deterministik pastel palet (Emerald, Cyan, Indigo, Violet, Amber, Rose, Blue, Teal, Fuchsia) ve anlamsal ortam ön ayarları sunan yeniden kullanılabilir rozet bileşeni.
  - `TagInput.tsx`: Enter/virgül/Tab ile ekleme, Backspace ve 'X' ile silme, mükerrer engelleyici ve hızlı öneri hapları içeren interaktif etiket formu bileşeni.
  - `TagFilterBar.tsx`: Servislerdeki etiketleri anlık frekans adediyle listeleyen, tek tıkla süzme ve "Tümü" seçeneği sunan yatay filtreleme çubuğu.
- **Servisler ve Konteynerler Sayfa Entegrasyonu**:
  - `AddServiceModal.tsx` ve `EditServiceModal.tsx` formlarına `TagInput` eklendi.
  - `ServiceCard.tsx` üzerinde tıklanabilir etiket rozetleri gösterildi (tıklandığında filtre çubuğunu anında tetikler).
  - `ServicesPage` (`Services/index.tsx`) içine arama ile eşzamanlı çalışan `TagFilterBar` entegre edildi.
  - `QuickServicesGrid.tsx` (Dashboard) ve `ContainerList.tsx` (mobil ve masaüstü) listelerinde etiket hapları görünür kılındı.
- **Kapsamlı Birim Testleri**: Etiket oluşturma, güncelleme, JSON/CSV ayrıştırma ve Docker override kalıcılığını doğrulayan 2 yeni birim test eklendi (tüm 213 test başarılı).
- **Çift Dilli Senkronizasyon**: Türkçe ve İngilizce dil dosyaları (`tr.ts`, `en.ts`) tam uyumlu hale getirildi.

### Telemetri, Seyreltme & Metrik Özeti (Faz 5 - Bilet 5.1)
- **Zaman Serisi Metrik Seyreltme (Saatlik Rollup)**: 15 saniyelik ham sistem kaynak metriklerini (`system_metrics`) saatlik ortalama özet kayıtlarına (`system_metrics_hourly`) dönüştüren otomatik seyreltme hattı geliştirildi.
- **İkili Veri Saklama (Dual Retention) Stratejisi**: Yakın geçmişteki detaylı hata ayıklamayı korumak için 15 saniyelik yüksek çözünürlüklü kayıtlar 7 gün saklanıp temizlenirken, saatlik özetler 365 gün boyunca tutulur. `RetentionCleanupService` döngüsünde 7 günden eski ham veriler ve 365 günden eski saatlik özetler düzenli olarak temizlenir.
- **Birleşik Uzun Vadeli Sorgu Motoru**: `GetRecentAsync` uç noktası `30d`, `90d` ve `1y` (365 gün) zaman aralıklarını destekleyecek şekilde genişletildi. Optimize edilmiş SQLite CTE ile saatlik tablodan okuma yapılırken henüz özetlenmemiş en son saatler anlık olarak birleştirilerek veri boşluğu olmadan milisaniyeler içinde grafik üretilir.
- **Arayüz Zaman Aralıkları & Dinamik Etiketler**: Sistem Metrikleri sayfasında (`SystemMetrics/index.tsx`) `30 Gün`, `90 Gün` ve `1 Yıl` filtreleme butonları eklendi; çok günlük ve aylık görünümler için duyarlı tarih formatları entegre edildi.
- **Kapsamlı Test Paketi**: Saatlik agregasyon idempotency, ikili temizlik politikası ve seyreltilmiş sorguları doğrulayan 5 yeni birim test (`MetricsRepositoryTests.cs`) eklendi (tüm 211 test yeşil).

### Konteyner Yönetimi, Web Terminali & Sistem Temizliği (Faz 4 - Bilet 4.1 & 4.2)
- **İmaj, Hacim ve Sistem Temizliği (System Prune - Bilet 4.2)**: Docker daemon üzerinde disk alanı tüketen dangling/kullanılmayan imajları, durdurulmuş geçici konteynerleri, yetim ağları ve kullanılmayan hacimleri arayüzden tek tıkla temizleme motoru geliştirildi.
- **Güvenli Temizlik Mimarisi & Hacim Koruması**: Veritabanı ve kalıcı durum kaybını önlemek için `Volumes` seçeneği varsayılan olarak kapalı tutuldu ve seçildiğinde görsel sarı uyarı şeridi sağlandı. İmajlar için "Sadece askıda kalanlar (dangling)" ile "Kullanılmayan tüm imajlar" ayrımı sunuldu.
- **Modüler Temizlik Modalı (`SystemPruneModal.tsx`)**: Temizlik öncesi onay diyaloğu, temizlik esnasında animasyonlu ilerleme durumu ve tamamlandığında kurtarılan toplam disk alanını (`1.42 GB serbest bırakıldı`) kategori bazlı rozetlerle döküm halinde gösteren arayüz bileşeni geliştirildi.
- **Native AOT & RBAC Uç Noktası**: `POST /api/containers/prune` uç noktası `[RequireAdmin]` ile güvenceye alındı; `DockerPruneRequest`, `DockerPruneResult` ve prune yanıt tipleri `CorvusJsonSerializerContext` içine kaynak üreticili olarak kaydedildi.
- **Konteyner İçi Web Terminali (Exec Shell - Bilet 4.1)**: Tarayıcı üzerinden doğrudan çalışan Docker konteynerlerinin içine interaktif kabuk (`/bin/sh`, `/bin/bash`, `/bin/ash`, `/bin/zsh`) açabilen yüksek performanslı Web Terminali geliştirildi.
- **Sıfır Bellek Tahsisatlı (Zero-Allocation) WebSocket Proxy**: `GET /api/containers/{id}/terminal` uç noktasında .NET WebSockets ve Docker Engine HTTP 1.1 Upgrade TTY stream'i arasında çift yönlü veri akışı `ArrayPool<byte>` (8 KB sabit tampon) ile sağlandı. İstemci ayrıldığında veya sekme kapandığında Docker exec PID süreci anında sonlandırılır, kiralanan bellekler iade edilir ve Corvus RAM tüketimi taban seviyesine (30-50 MB) döner.
- **Dinamik PTY Boyutlandırma (Resize Frame)**: Terminal boyutu veya tarayıcı penceresi değiştiğinde `{type: "resize", cols, rows}` kontrol mesajları üzerinden Docker `/exec/{id}/resize` uç noktası tetiklenerek satır ve sütun uyumu anlık olarak eşitlenir.
- **RBAC Güvenlik Koruması**: Konteyner terminali yetkisiz erişimlere karşı `[RequireAdmin]` ile zırhlanarak yalnızca `admin` rolüne açıldı (Gözlemci/Viewer için 403 Forbidden koruması).
- **Modüler Terminal Arayüzü (`ContainerTerminalModal.tsx`)**: `@xterm/xterm` ve `@xterm/addon-fit` kütüphaneleriyle Corvus koyu temasına tam uyumlu, tam ekran destekli, VT100/ANSI renk paletli, ekran temizleme, yeniden bağlanma ve anlık kabuk değiştirme özelliklerine sahip modern terminal modalı eklendi.
- **Aksiyon Butonları & Log Ayrımı**: Konteyner aksiyon çubuğunda (`ContainerActionButtons.tsx`) log butonu `ScrollText` ikonuna dönüştürüldü; yanına sadece çalışan konteynerlerde ve yönetici oturumunda aktif olan `SquareTerminal` ikonlu Web Terminali butonu entegre edildi.

### Güvenlik & Kullanıcı Yönetimi (RBAC)
- **Rol Tabanlı Yetkilendirme (RBAC)**: `admin` ve `viewer` rolleri `CorvusAuthFilter` ve `RequireAdminAttribute` ile koruma altına alındı. `viewer` rolündeki kullanıcıların salt okuma yapması sağlandı; servis ekleme/silme, konteyner aksiyonları, sistem ayarları ve yedekleme indirme uç noktaları yetkisiz erişimlere kapatıldı (403 Forbidden).
- **Kullanıcı Yönetimi & Şifre Değiştirme**: SQLite `UserRepository` CRUD uç noktaları (`/api/users`), şifre güncelleme (`/api/auth/change-password`), ve kullanıcı silindiğinde ilişkili aktif oturumların anında düşürülmesi (`DeleteSessionsByUsernameAsync`) sağlandı.
- **Modüler Profil & Kullanıcı Yönetimi Sayfası**: Kullanıcı ayarları modal yapısından çıkarılarak bağımsız, modüler bir sayfaya (`/profile`) dönüştürüldü. Kendi parolasını değiştirme (`ProfileSecurityTab.tsx`) ve yöneticiler için kullanıcı listesi/ekleme/silme (`ProfileUsersTab.tsx`, `AddUserModal.tsx`) bileşenlerine ayrıştırıldı. Tasarım renkleri Corvus'un resmi Indigo paletine çekildi, mor renk kirliliği giderildi.

### Ağ & İzleme Motoru
- **HTTP Yanıt Gövdesi (Keyword & Regex) Doğrulaması**: HTTP durum kodu 200 dönse dahi uygulamanın gerçekte sağlıklı olup olmadığını teyit etmek için yanıt gövdesinde anahtar kelime (`"status":"healthy"`, `status=ok` vb.) veya Regex deseni arayan denetim motoru entegre edildi.
- **Sıfır Tahsisatlı 64 KB Bellek Tavanı**: Tüm yanıt gövdesini belleğe alıp OOM riski oluşturmak yerine, `ArrayPool<byte>` bellek havuzu ve `HttpBodyValidator` ile akış en fazla 64 KB taranacak şekilde sınırlandırıldı. ReDoS saldırılarına karşı 200ms Regex zaman aşımı koruması sağlandı.
- **ICMP Ping Monitörü**: HTTP portu bulunmayan fiziksel sunucu, gateway ve router'ların paket gecikmesini (RTT) ve erişilebilirliğini `System.Net.NetworkInformation.Ping` ile asenkron izleyen denetleyici entegre edildi. Servis ekleme/düzenleme modallarında ICMP Ping seçeneği, `/api/uptime/test-connection` üzerinde anlık ping testi, ve arayüzde cyan `ICMP PING` rozetleri sağlandı.
- **Proaktif SSL/TLS Bitiş Alarmı**: Sertifika süresi bitimine 14 ve 7 gün kala Discord (renk kodlu embed), Telegram, Ntfy ve Webhook kanallarına otomatik erken uyarı bildirim motoru entegre edildi.
- **Akıllı Debounce & Anti-Spam Koruması**: `UptimeCheckerService` içine kademeli (14g uyarı, 7g kritik) günlük durum hafızası eklendi; sertifika yenilendiğinde alarm durumu otomatik sıfırlanır hale getirildi.
- **Servis Kartı SSL Rozeti**: 7 günden az kalan sertifikalarda yanıp sönen kırmızı `ShieldAlert`, 14 günden az kalanlarda amber uyarı rozetleri eklendi.
- **Bildirim Filtresi**: Ayarlar paneline `notify_ssl_expiry` açma/kapama seçeneği eklendi.

### Bildirim Kanalları & Alarm Disiplini (Faz 3 - Bilet 3.1 & 3.2)
- **Flapping (Dalgalanma) Koruması & Alarm Debounce (Bilet 3.2)**: Ağ dalgalanmaları veya crash-loop döngülerinde kısa sürede peş peşe düşüp kalkan servislerin bildirim kanallarını spamlemesini önleyen akıllı alarm filtresi geliştirildi.
- **Kayan Pencere (Sliding Window) Hafızası (`FlappingDetector`)**: Bağımsız ve thread-safe `IFlappingDetector` servisi ile servis başına durum geçiş zaman damgaları kayan pencerede izlenir. Eşik (varsayılan: 10 dakikada 4 geçiş) aşıldığında tek bir `[DALGALANMA TESPİT EDİLDİ]` alarmı gönderilerek ara bildirimler geçici olarak susturulur.
- **Kararlılık Tespiti & Kurtarma Bildirimi**: Servis belirlenen sayıda (varsayılan: 3 ardışık kontrol) stabil UP/DOWN durumu sunduğunda flapping modu sonlandırılır ve kanallara tekil `[DALGALANMA SONA ERDİ]` kararlılık bildirimi iletilerek normal izleme tekrar devreye alınır.
- **Modüler Yapılandırma Kartı (`FlappingProtectionCard.tsx`)**: Ayarlar sayfasında bildirimler sekmesine geçiş eşiği, kayan pencere süresi ve kararlılık kontrol sayısını yöneten modern, modüler yapılandırma bileşeni eklendi; tetikleyici filtresine `notify_flapping_events` seçeneği bağlandı.
- **E-Posta (SMTP) Bildirim Kanalı (Bilet 3.1)**: Standart SMTP sunucuları (Gmail, Outlook, Resend, Brevo, AWS SES, cPanel vb.) üzerinden anında durum alarmları ileten bildirim motoru geliştirildi. Özel gönderen adı (`From Name`), port, TLS/SSL desteği ve modern koyu temalı HTML e-posta şablonu sağlandı.
- **Etiket / Hap (Pills) Tabanlı Çoklu Alıcı Girişi (`EmailRecipientInput`)**: Alıcı e-postalarının ham metin kutusu yerine modern çipler/haplar halinde yönetilmesini sağlayan arayüz bileşeni geliştirildi. Enter ve virgül tuşlarıyla ekleme, `x` butonu ve Backspace ile silme, Regex doğrulama, mükerrer önleme ve panodan çoklu yapıştırma (ayrıştırma) desteği eklendi.
- **Slack Incoming Webhook Kanalı (Bilet 3.1)**: Slack kanallarına anında durum bildirimleri gönderen entegrasyon eklendi. Slack attachments mimarisi ve durum renk kodlamaları (Kırmızı: Down, Yeşil: Up/Test, Amber: SSL/Flapping Uyarısı) ile zengin formatlı mesaj iletimi sağlandı.
- **Anlık Test Butonları & Native AOT Uyumu**: Ayarlar sayfasında her iki kanal için anlık "Test Et" butonları entegre edildi. `System.Net.Mail` kullanılarak harici kütüphane bağımlılığı olmadan 30-50 MB RAM disiplini ve Native AOT JSON kaynak üreticisi (`CorvusJsonSerializerContext`) tam uyumu korundu.

### Hata Düzeltmeleri & UX İyileştirmeleri
- **HTTP/2 SSE Protokol Hatası Düzeltildi**: `/api/stream/events` uç noktasında HTTP/2 ve HTTP/3 bağlantılarında RFC 7540 standardına aykırı olan `Connection: keep-alive` başlığının Chromium tarayıcılarda `net::ERR_HTTP2_PROTOCOL_ERROR` hatası fırlatması engellendi. Başlık HTTP/1.x ile sınırlandırıldı; `X-Accel-Buffering: no` eklendi ve istemci erken kapattığında fırlatılan `IOException` sessizce bertaraf edildi.
- **Ayarlar Sayfası Hizalama & Genişlik Dengesi**: Ayarlar sayfasındaki `max-w-4xl mx-auto` sınırlaması kaldırılarak Dashboard, Servisler, Konteynerler ve Sistem Metrikleri sayfalarıyla aynı tam genişlik ve sol hizalama standardına getirildi; sekmeler arası geçişteki zıplama hissi giderildi.

### Kullanıcı Deneyimi & Tasarım (UI/UX)
- **Ayarlar Sayfası UX Sadeleştirmesi**: Sağdaki mükerrer 4 kolonluk yapışkan sidebar (çift veritabanı boyutu, mükerrer kullanıcı kayıt durumu ve statik metinler) tamamen kaldırılarak sayfa tekil ve modern bir mimariye kavuşturuldu. Çift kaydet butonu ikilemesi giderildi; sürüm durumu başlık yanına şık ve kompakt bir rozet olarak taşındı.
- **Güvenli Oturum Düşüş Yönetimi (401 Interceptor)**: API katmanında oturum süresi dolduğunda (`401 Unauthorized`) fırlatılan işlenmemiş hatalar `corvus_unauthorized` olayıyla merkezi olarak yakalanarak kullanıcının anında oturum açma ekranına yönlendirilmesi sağlandı; `api.getSettings()` yakalama bloklarıyla donatıldı.
- **Mobil Arayüz Sadeleştirmesi**: Alt bar (`BottomNav`) aktifken mobilde ekran alanı daraltan üst header, hamburger menü ve kayan drawer layout'u tamamen kaldırıldı; parmak ucu erişimi için Profil & Kullanıcı sekmesi doğrudan alt bara entegre edildi.
- **Rol Metin Standardı**: Türkçe dil dosyasında hem yönetici hem admin yazan ikili gösterim (`Yönetici (Admin)`) giderilerek sade `Yönetici` ve `Gözlemci` terminolojisi sağlandı.
- **Mobil Cam Altbar (Mobile Glass Bottom Navigation Bar)**: Tablet ve mobil ekranlar (`< lg`) için genişleyen hap ve kayan göstergeli buzlu cam (frosted glass) alt gezinti çubuğu (`BottomNav.tsx`) geliştirildi; güvenli alan (`viewport-fit=cover`, `env(safe-area-inset-bottom)`) entegrasyonu sağlandı.
- **Çift Dilli Sözlük Desteği**: Eklenen tüm yeni arayüz ve bildirim metinleri Türkçe ve İngilizce (`tr.ts`, `en.ts`) olarak eksiksiz uyarlandı.

### Performans & Bellek
- **Agresif Sıkıştırmalı (Compacting) Gen 2 GC**: Düşük bellek baskısında .NET GC tarafından sessizce atlanan `GCCollectionMode.Optimized` yerine `MemoryTrimmerBackgroundService` ve `RetentionCleanupService` içinde `GCCollectionMode.Aggressive, blocking: true, compacting: true` ve `GC.WaitForPendingFinalizers()` mekanizmasına geçildi. Bu sayede Gen 2 segmenti sıkıştırılarak boşalan onlarca megabaytlık sanal bellek Linux çekirdeğine iade edildi.
- **Non-Concurrent Workstation GC**: `ConcurrentGarbageCollection` ayarı `false` yapıldı ve konteynere `DOTNET_gcConcurrent=0` tanımlandı. Böylece 80 MB tabanlı devasa segment rezervasyonları engellenerek küçük segmentli ve kompakt bellek profili sağlandı.
- **Docker JSON Tahsisat Freni**: `DockerService._cachedContainers` önbellek süresi 2.5 saniyeden 10 saniyeye çıkarıldı. Uptime denetim döngüsündeki 48 KB'lık ham Docker JSON deserialization yükü %75 oranında azaltıldı.
- **Sıfır Tahsisatlı /proc/meminfo Okuması**: `SystemMetricsCollector` içindeki dosya okuma mantığı erken çıkan `StreamReader` akışına dönüştürülerek gereksiz string koleksiyonu oluşturulması engellendi.

### Depolama & Veritabanı
- **Kalıcı SQLite Oturum Yönetimi (Session Store)**: `user_sessions` şeması ve `ISessionRepository` hibrit write-through önbellek mimarisiyle `AuthService` katmanına entegre edildi. Bu sayede konteyner yeniden başladığında veya güncellendiğinde oturumun düşmesi engellendi; RAM üzerindeki mikrosaniye altı doğrulama hızı ve sıfır bellek tahsisatı korundu.
- **Otomatik SQLite Freelist Temizliği (VACUUM)**: `RetentionCleanupService` günlük temizlik döngüsüne otomatik `VACUUM;` çağrısı eklendi. Silinen eski kayıtların bıraktığı boş alanların (freelist) diske iade edilmesi sağlandı ve veritabanı boyutu %60-70 oranında küçültüldü.
- **WAL Dosyası Sıfırlama (TRUNCATE)**: `MemoryTrimmerBackgroundService` içindeki SQLite checkpoint çağrısı `PASSIVE` yerine `PRAGMA wal_checkpoint(TRUNCATE);` yapılarak WAL günlüğünün her 3 dakikada bir 0 byte'a çekilmesi sağlandı.
- **Docker Log Rotasyon Sınırı**: `docker-compose.yml` dosyasına `max-size: 10m` ve `max-file: 3` kuralları eklenerek konteyner loglarının diskte kontrolsüz büyümesi engellendi.

### Testler
- Tüm 206 birim testi sıfır hatayla başarıyla tamamlandı (`Passed: 206, Failed: 0`).

---

## [1.5.18] - 2026-10-02

### Performans (Performance)
- **Elastik Bellek Mimarisi (OOM Koruması)**: Ani yük veya log akışlarında uygulamanın OOM (Out Of Memory) ile çökmesini önlemek için katı `DOTNET_GCHeapHardLimit` kısıtlamaları kaldırıldı; `DOTNET_GCConserveMemory=9` ile yük bittiğinde belleğin tabana inmesi sağlandı.
- **Gen 2 Bloklamayan Soft Trimming**: `MemoryTrimmerBackgroundService` ve `RetentionCleanupService` içindeki `GC.Collect(1)` çağrısı `GC.Collect(2, GCCollectionMode.Optimized, blocking: false)` seviyesine yükseltilerek arka plan döngülerinden Gen 2'ye geçen nesnelerin toplanması ve `malloc_trim(0)` ile işletim sistemine iadesi sağlandı.
- **UptimeChecker In-Memory Servis ve Eşik Önbelleklemesi**: Her 5 saniyede bir veritabanından tüm servisleri çeken döngü yerine 25 saniyelik mikro önbellek mimarisine geçildi; boşta çalışma anında her tikte oluşan yüzlerce gereksiz DI scope ve SQLite nesne tahsisi sıfırlandı.
- **ContainerDiscovery İhtiyaç Anında Scope Tahsisi**: Singleton Docker servisleri doğrudan `ContainerDiscoveryService` içine enjekte edildi; DI scope tahsisi yalnızca parmak izi (fingerprint) değiştiğinde çalışacak şekilde optimize edildi.

### Kullanıcı Deneyimi & Tasarım (UI/UX)
- **Modern 2 Kolonlu Ayarlar Paneli**: Geniş ekranlardaki sağ boşluğu gidermek için Ayarlar sayfası 2 kolonlu modern dashboard mimarisine geçirildi; sol tarafa sekme seçicili form alanları (Genel & Güvenlik, Bildirimler, Yedekleme), sağ tarafa ise anlık sistem sürümü, SQLite veritabanı depolama boyutu, kayıt güvenliği ve her an erişilebilir hızlı kaydet aksiyonunu içeren yapışkan (sticky) bir durum paneli eklendi.
- **Koyu Temalar İçin Yüksek Kontrastlı Beyaz Logo**: Koyu zeminlerde görünürlüğü düşük kalan siyah logo ve favicon varlıkları, resmi yüksek kontrastlı saf beyaz Hex Sentinel sembolü (`corvus-white-512.png`, `corvus-white.svg`) ile güncellendi; Sidebar, Mobil Üst Bar, Giriş (Auth) ekranı, Genel Durum sayfası ve tarayıcı sekmelerinde tam netlik sağlandı.

### Testler (Tests)
- Tüm test paketi (145/145 birim test) başarıyla doğrulandı.

---

## [1.5.17] - 2026-10-01

### 🚀 Eklenenler (Added)
- **Dual-Track (İkili Hat) CI/CD & Kontrollü Sürüm Mimarisi**: Sürüm enflasyonunu önlemek için endüstri standardı ikili hat modeline geçildi: `main` dalına yapılan rutin commit'ler artık sürüm numarasını şişirmeden doğrudan `latest` Docker imajını derleyip sunucuya anında deploy ederken; resmi sürümler (`release.yml`) yalnızca Git etiketleri (`v*`) veya GitHub Actions manuel tetikleme ile `CHANGELOG.md`'den zengin sürüm notlarını çekerek kontrollü olarak yayınlanır.
- **Otomatik GitHub Sürüm Notları Çıkarımı**: `CHANGELOG.md` dosyasındaki en güncel sürüm bloğu otomatik ayıklanıp `softprops/action-gh-release@v2` üzerinden GitHub Releases açıklamasına bağlandı.

### ⚡ Performans (Performance)
- **SQLite Bellek Kırpma (`PRAGMA shrink_memory`)**: `MemoryTrimmerBackgroundService` döngüsüne entegre edilen SQLite yerel `shrink_memory` komutu ile her 3 dakikada bir kullanılmayan sayfa önbellekleri, B-Tree tamponları ve unmanaged C heap lookaside tahsisleri işletim sistemine iade edildi.
- **Kilitlenmesiz WAL Checkpoint (`PRAGMA wal_checkpoint(PASSIVE)`)**: Periyodik olarak çalışan pasif checkpoint mekanizması sayesinde, hiçbir aktif okuyucu veya yazıcı ping işlemini kilitlemeden WAL çerçeveleri ana veritabanına aktarıldı; `.wal` ve `.shm` paylaşımlı bellek haritası şişmesi engellendi.
- **Çapraz Platform Working Set Kırpma**: `NativeMemoryTrimmer` sınıfına `psapi.dll` üzerinden `EmptyWorkingSet` çağrısı eklenerek Linux `malloc_trim(0)` desteğinin yanı sıra Windows işletim sisteminde de referans verilmeyen fiziksel RAM sayfalarının derhal serbest bırakılması sağlandı.
- **Boşta Kalan Soket Havuzu Tahliyesi**: `DockerHttpClient`'ın `SocketsHttpHandler` yapılandırmasına `PooledConnectionIdleTimeout = TimeSpan.FromMinutes(1)` tanımlanarak 1 dakika boyunca boşta duran Unix domain socket ve named pipe tamponlarının bellekten düşmesi sağlandı.

### 🛡️ Testler (Tests)
- `MemoryTrimmerTests` paketi veritabanı bağlantı fabrikası entegrasyonuyla genişletilerek toplam test sayısı **145/145 Başarılı** seviyesine ulaştırıldı.

---

## [1.5.13] - 2026-10-01

### 🚀 Eklenenler (Added)
- **MemoryTrimmerBackgroundService**: Her 3 dakikada bir otomatik çalışan, SQLite bağlantı havuzunu (`SqliteConnection.ClearAllPools`) boşaltan, Gen 1 GC optimizasyonu yapan ve Linux libc `malloc_trim(0)` çağırarak native belleği işletim sistemine iade eden arka plan temizleyicisi.
- **Hex Sentinel Kurumsal Kimlik Kiti**: Docker heksagonu, 'C' monogramı ve kuzgun gözcüsünü birleştiren yeni profesyonel monokrom marka kimliği, SVG master vektörleri, yatay/dikey lockup'lar, web ikonları ve manifest (`docs/branding/`).
- **Gözlemlenebilirlik Hızlı Filtresi**: Keşfedilen servisler havuzuna yalnızca geçerli HTTP/Web domaini olan konteynerleri listeleyen `domainOnlyWeb` filtre anahtarı ve tam i18n desteği.
- **Gecikme Rozetleri & Tooltip**: Uptime son kontroller tablosunda milisaniye bazlı renk kodlu yanıt süresi rozetleri (<200ms zümrüt yeşili, 200–500ms kehribar sarısı, >500ms gül kırmızısı) ve hata mesajı kesme (truncate) tooltip'i.
- **xUnit Bellek Testleri**: Native trimmer ve GC davranışlarını doğrulayan birim test paketi (`MemoryTrimmerTests.cs`) ile test sayısı 144/144 başarıya yükseltildi.

### ⚡ Performans (Performance)
- **.NET 9 Agresif Bellek Sınırı**: İstek dalgalanmaları bittiğinde boşta kalan sanal sayfaların çekirdeğe derhal iadesi için `DOTNET_GCConserveMemory=9` ve 48 MB GC tavan limiti (`DOTNET_GCHeapHardLimit=0x3000000`) tanımlandı.
- **Docker Keşif Önbelleği (`_inspectCache`)**: Konteyner ortam değişkenleri ID ve Image ID bazlı önbelleğe alınarak her döngüde tekrarlanan Docker socket inspect çağrıları engellendi.
- **Durum Parmak İzi (`ComputeFingerprint`)**: Konteyner durumları hash'lenerek değişiklik olmayan döngülerde SQLite yazma işlemleri tamamen atlandı; disk yıpranması ve WAL log şişmesi sıfırlandı.
- **Streaming Meminfo**: `/proc/meminfo` dosyasının tamamını belleğe almak yerine `File.ReadLines()` akışı ile ilk 2 satırda kısa devre yapan okuma mimarisine geçildi.
- **Glibc Sınırlandırması**: Konteyner ortamında arena parçalanmasını engellemek için `MALLOC_TRIM_THRESHOLD_=65536` ve `MALLOC_ARENA_MAX=2` yapılandırıldı.

### 🔄 Değiştirilenler (Changed)
- `README.md` ve `README.tr.md` üst başlık banner'ı yeni Hex Sentinel kurumsal kimliği ve yüksek çözünürlüklü vektör tipografi ile yenilendi.
- Statik web ve API faviconları eski raster PNG yerine saf, keskin vektör `favicon.svg` ile değiştirildi.
- `.gitignore` kural seti sıkılaştırılarak sunum slaytları, test veritabanları ve geçici kalıntılar korumaya alındı.
- Test başarı rozetleri 144 Passing olarak güncellendi.

---

## [1.5.12] - 2026-09-29

### 🔒 Güvenlik & Kimlik Doğrulama
- **PBKDF2 Parola Güçlendirme**: 100.000 iterasyonlu PBKDF2-HMAC-SHA256 ve 16-byte kriptografik tuz (salt) mimarisi; eski kullanıcılar için şeffaf dinamik yükseltme eklendi.
- **Brute-Force & DoS Koruması**: 1 dakikada 5 hatalı giriş sonrasında IP ve kullanıcı adını 1 dakika kilitleyen in-memory hız sınırlayıcı (`HTTP 429`).
- **Ters Vekil Başlık Güvenliği**: Zero-Trust SSO başlık sahteciliğini önleyen `CORVUS_TRUST_PROXY_HEADERS` ve güvenilir IP doğrulama kontrolü.

---

## [1.5.11] - 2026-09-28

### 🛡️ Gözlemlenebilirlik & Dayanıklılık
- **Halka Açık Durum Sayfası Modernizasyonu**: Son 30 kontrol etkileşimli durum çubukları, gecikme tooltip'leri ve kategori bazlı akordeon grupları.
- **Sistem Olayları & Planlı Bakım**: Durum sayfası üzerinde anlık duyuru afişleri yayımlayan olay yönetim motoru (`service_incidents`).
- **Akıllı 24 Saatlik Retention**: Durum değişikliği olmayan kayıtları 24 saat sonra silen (`is_transition = 0`), durum değişimlerini koruyan ve 365 günlük SLA özet tablosu üreten hibrit temizlik motoru.
- **One-Shot Docker Stats**: N+1 soket okumalarını kaldıran `GET /api/containers/stats-summary` toplu okuma akışı ile sub-100ms anlık metrikler.

---

## [1.5.0] - 2026-09-26

### 🚀 Çift Dilli i18n & Temiz Mimari
- **Derleme Anında Tip Korumalı i18n**: Sıfır dış kütüphane ek yükü (~1.2 KB) ile İngilizce ve Türkçe dinamik dil seçici.
- **Temiz Mimari Refaktörü**: Sayfaların 250 satır altında kalması, alt sekmelerin (`*Tab.tsx`), modalların (`*Modal.tsx`) ve API servislerinin (`src/api/*`) bağımsız modüllere ayrılması.
- **Çift Yönlü Yedekleme**: Tek tıkla kilitlenmesiz SQLite snapshot indirme (`VACUUM INTO`) ve harici curl push entegrasyonu.
- **Mobil-Öncelikli Dashboard**: 2 sütunlu kompakt KPI şeridi, tam genişlikte Disk barı ve yan yana aktif konteyner kartları.
