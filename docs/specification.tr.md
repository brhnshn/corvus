<div align="center">

[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](specification.md)
[![Türkçe](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red?style=for-the-badge)](specification.tr.md)

</div>

# Corvus — Proje ve Mimari Dokümanı

## 1. Proje Tanımı

Corvus, self-hosted sunucular için açık kaynak, düşük kaynak tüketimli, tek panelden erişim + izleme aracıdır.

**Ne yapıyor:**
- **Launcher:** Sunucudaki servisleri (uygulamalar, veritabanları, yönetim araçları) tek panelden listeler, sürükle-bırak/ok tuşlarıyla sıralar ve erişim sağlar — canlı durum bilgisiyle birlikte.
- **Monitoring:** Sistem kaynakları (CPU/RAM/disk), konteyner canlı CPU/RAM/Net istatistikleri, container logları, uptime/endpoint sağlığı (HTTP/TCP/SSL), backup ve cron durumu tek yerde toplanır.
- **Boşluk doldurma:** Dağıtım araçları container yönetimini yaparken dış gözlemlenebilirlik (uptime, eşik tabanlı uyarı, launcher) sağlamaz — Corvus bu boşluğu kapatır.

**Servis keşfi — iki modlu:**
- **Otomatik:** Docker socket'ten çalışan container'ları algılar, Compose projelerine göre gruplar.
- **Manuel:** Docker dışı/uzak servisler veya TCP portları için kullanıcı elle ekleyebilir.

**Genel kullanım prensibi:** Açık kaynak bir araç olarak belirli bir reverse proxy, orkestrasyon aracı veya VPN'e bağımlı olmamalı — kullanıcı bunları tercihine göre kullanır ya da kullanmaz, Corvus hiçbirini şart koşmaz. Ters vekil arkasında Zero-Trust SSO başlıklarını (`Tailscale`, `Cloudflare Access`, `Remote-User`, `X-Forwarded-User`) otomatik tanır.

**Marka Kimliği:** Corvus (Latince kuzgun) — "gözcü, yukarıdan izleyen" teması. "Hex Sentinel" kurumsal sembolü; Docker heksagonunu, Corvus 'C' monogramını ve tetikteki kuzgun gagasını/gözünü monokrom (siyah/beyaz/gece mavisi) endüstriyel estetikle birleştirir. Tüm SVG master dosyaları ve web ikonları `docs/branding/` altında standartlaştırılmıştır.

---

## 2. Teknoloji Seçimi

### Backend
- Dil: **C#**
- .NET sürümü: **.NET 9**
- Web framework: **ASP.NET Core Minimal API**
- Derleme modu: **Native AOT** (Zero Reflection)
- Docker erişimi: **Custom SocketsHttpHandler + System.Text.Json Source Generator** (Docker daemon REST API'sine Unix Socket ve Windows Named Pipe üzerinden doğrudan erişim, `GET /api/containers/stats-summary` toplu okuma akışı)
- Bellek Mimarisi: **Sıfır Bağımlılıklı In-Memory Micro-Cache** (<150 KB heap; Docker soketi için 2.5s-10s TTL, Uptime 24s agregasyonları için 5s TTL), **.NET 9 Non-Concurrent Workstation GC** (`DOTNET_gcConcurrent=0`), **Elastik Bellek Ayarı** (`DOTNET_GCConserveMemory=9`, `MALLOC_TRIM_THRESHOLD_=65536`), periyodik native bellek temizleyici (`MemoryTrimmerBackgroundService`, 3 dakikada bir SQLite havuz tahliyesi, `PRAGMA wal_checkpoint(TRUNCATE);`, Gen 2 agresif sıkıştırma ve libc `malloc_trim(0)` ile native bellek iadesi), Container Discovery Fingerprinting (`ComputeFingerprint`) ve akıllı ortam değişkeni önbelleği (`_inspectCache`).
- Hedef RAM: **<35 MB** (Boşta ~20-30 MB, yük altında bile 40 MB sınırıyla kilitli)

### Frontend
- **TypeScript + React 19 + Vite**
- Mimari: **Modüler Temiz Mimari (Clean Architecture)**: `types/` altında güçlü tip sözleşmeleri, `api/` altında bağımsız etki alanı servisleri (`http.ts`, `services.ts`, `containers.ts` vb.) ve yerleşik SWR in-memory önbellekleme
- Güvenlik: Merkezi `corvus_unauthorized` oturum düşüş yakalayıcısı
- Stil: **Tailwind CSS v4** (Mobil Cam Altbar, duyarlı tek kolonlu modern ayarlar kabuğu, esnek kartlar)
- Grafikler: **Recharts**
- Çoklu Dil (i18n): **Derleme anında tip güvenli yerli React 19 Context** (`DeepStringify`), sıfır dış kütüphane ek yükü (~1.2 KB), varsayılan İngilizce (`en`) ve tam kapsamlı Türkçe (`tr`) desteği, dinamik dil seçici
- Kod Ayrıştırma (Code-Splitting): **React.lazy + Suspense** ve Vite `manualChunks` ile <200 KB ilk yükleme
- İletişim: REST + **Server-Sent Events (SSE)** üzerinden anlık durum yayını (`corvus_event` pub/sub kanalları)

### Veri katmanı
- **SQLite (Microsoft.Data.Sqlite) + Dapper (Dapper.AOT)**: WAL modu, `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA temp_store = MEMORY;`, `PRAGMA cache_size = -64000;` ve periyodik `PRAGMA optimize;`
- **DbUp**: SQL-first sıralı migration yönetimi (`001_init.sql` - `013_service_tags.sql`)
- Zaman serisi tablolarında kompozit performans indeksleri (`system_metrics(recorded_at)`, `system_metrics_hourly(recorded_at)`, `uptime_checks(service_id, checked_at)`)
- **Yedekleme ve Saklama Motoru**: Kilitlenmesiz SQLite anlık görüntü indirme (`VACUUM INTO`), gerçek zamanlı veritabanı disk boyutu telemetrisi (`GET /api/settings/db-stats`), Sınırsız mod destekli dinamik retention temizleyicisi, günlük otomatik `VACUUM;` freelist temizliği

---

## 3. Veri Modeli (SQLite Şeması)

### `services`
Otomatik algılanan veya manuel eklenen tüm servisler (launcher + durum takibi için tek kaynak).

| Alan | Tip | Açıklama |
|---|---|---|
| id | TEXT (UUID) | Birincil anahtar |
| source | TEXT | `docker` veya `manual` |
| container_id | TEXT (nullable) | `source=docker` ise Docker container ID'si |
| name | TEXT | Görünen isim (label'dan, manuel girişten veya container adından) |
| description | TEXT (nullable) | Kısa açıklama |
| url | TEXT (nullable) | Launcher'da "Aç" butonunun gideceği adres |
| icon | TEXT (nullable) | İkon adı/URL |
| category | TEXT (nullable) | Gruplama için (Uygulamalar, Veritabanları, vb.) |
| tags | TEXT (nullable) | Ortam/kategori etiketleri (JSON dizisi veya virgülle ayrılmış metin) |
| health_check_url | TEXT (nullable) | Uptime kontrolü için ayrı endpoint (boşsa `url` kullanılır) |
| status | TEXT | `healthy` / `degraded` / `down` / `unknown` |
| check_type | TEXT | `http`, `tcp`, `docker` veya `ping` (ICMP ping) |
| port | INTEGER (nullable) | TCP port numarası |
| expected_body | TEXT (nullable) | Yanıt gövdesinde aranan içerik veya desen |
| expected_body_type | TEXT (nullable) | Gövde doğrulama tipi: `contains` (alt metin) veya `regex` |
| ssl_expiry_days | INTEGER (nullable) | Kalan SSL sertifika günü |
| ssl_issuer | TEXT (nullable) | Sertifikayı veren kurum |
| is_public | INTEGER | `1`: Halka açık durum sayfasında görünür (yalnızca `is_uptime_enabled = 1` iken), `0`: gizli |
| is_uptime_enabled | INTEGER | `1`: Uptime sağlık takibi aktif, `0`: Kapalı (keşfedilen Docker servisleri varsayılan `0`) |
| display_order | INTEGER | Özel sıralama sırası |
| created_at, updated_at | DATETIME | |

### `service_overrides`
Docker'dan otomatik algılanan bir container için kullanıcının panel üzerinden yaptığı düzenlemeler.

| Alan | Tip | Açıklama |
|---|---|---|
| container_id | TEXT | Birincil anahtar, `services.container_id` ile eşleşir |
| name, description, url, icon, category | TEXT (nullable) | Override edilen alanlar |
| tags | TEXT (nullable) | Docker servisi için kullanıcı tarafından geçersiz kılınan etiketler |
| expected_body, expected_body_type | TEXT (nullable) | Yanıt gövdesi arama doğrulama ayarları |
| is_uptime_enabled | INTEGER (nullable) | Uptime takip tercihi override'ı |

### `push_monitors` (Dead Man's Snitch)
Periyodik cron veya yedekleme scriptlerinin zamanında çalışıp çalışmadığını izleyen monitörler.

| Alan | Tip | Açıklama |
|---|---|---|
| id | TEXT (UUID) | Birincil anahtar |
| token | TEXT (UNIQUE) | Push URL'sinde kullanılan rastgele anahtar |
| name | TEXT | Monitör adı |
| expected_interval_minutes | INTEGER | Beklenen çalışma periyodu (varsayılan: 1440 dk = 24 saat) |
| grace_period_minutes | INTEGER | Tolerans süresi (varsayılan: 60 dk) |
| last_seen_at | TEXT (nullable) | Son başarılı sinyal zamanı |
| status | TEXT | `healthy` / `down` / `unknown` |
| created_at | DATETIME | |

### `system_metrics`
Host düzeyinde periyodik 15 saniyelik ham ölçümler (7 gün saklanır).

| Alan | Tip | Açıklama |
|---|---|---|
| id | INTEGER (autoincrement) | |
| recorded_at | DATETIME | |
| cpu_percent | REAL | |
| ram_used_mb, ram_total_mb | INTEGER | |
| disk_used_gb, disk_total_gb | INTEGER | |
| network_rx_bytes, network_tx_bytes | INTEGER | |

### `system_metrics_hourly`
Saatlik seyreltilmiş özet ölçümler (365 günlük akıcı SLA ve geçmiş raporlaması).

| Alan | Tip | Açıklama |
|---|---|---|
| id | INTEGER (autoincrement) | Birincil anahtar |
| recorded_at | TEXT (UNIQUE) | ISO-8601 saat dilimi (`YYYY-MM-DDTHH:00:00Z`) |
| cpu_percent | REAL | Saatlik ortalama CPU kullanımı |
| ram_used_mb, ram_total_mb | REAL | Saatlik ortalama kullanılan RAM ve pik kapasite |
| disk_used_gb, disk_total_gb | REAL | Saatlik ortalama kullanılan disk ve pik kapasite |
| network_rx_bytes, network_tx_bytes | INTEGER | Saatlik ortalama ağ transferi |

### `uptime_checks`
Her endpoint kontrolünün sonucu (zaman serisi).

| Alan | Tip | Açıklama |
|---|---|---|
| id | INTEGER (autoincrement) | Birincil anahtar |
| service_id | TEXT | `services.id` referansı |
| checked_at | DATETIME | Kontrol zamanı |
| status | TEXT | `up` / `down` |
| response_time_ms | INTEGER (nullable) | Yanıt süresi (ms) |
| error_message | TEXT (nullable) | Hata detayları |
| is_transition | INTEGER | `1`: Durum değişim anı, `0`: Olağan kontrol |

### `uptime_daily_stats`
365 günlük SLA ve geçmiş raporlaması için günlük özetlenen uptime istatistikleri.

| Alan | Tip | Açıklama |
|---|---|---|
| service_id | TEXT | `services.id` referansı (Kompozit PK) |
| date | TEXT | Takvim günü (`YYYY-MM-DD`, Kompozit PK) |
| total_checks | INTEGER | İlgili günde yapılan toplam kontrol sayısı |
| up_checks | INTEGER | Başarılı kontrol sayısı |
| avg_response_time_ms | INTEGER (nullable) | Ortalama yanıt süresi (ms) |

### `service_incidents`
Sistem arıza, araştırma, izleme ve planlı bakım duyuruları.

| Alan | Tip | Açıklama |
|---|---|---|
| id | TEXT (UUID) | Birincil anahtar |
| title | TEXT | Olay veya bakım başlığı |
| message | TEXT | Ayrıntılı açıklama içeriği |
| severity | TEXT | `info`, `warning`, `critical`, `maintenance` |
| is_pinned | INTEGER | `1`: Durum sayfasının tepesine sabitlenmiş, `0`: Standart |
| status | TEXT | `investigating`, `identified`, `monitoring`, `resolved` |
| created_at | TEXT | Oluşturulma zaman damgası (ISO-8601) |
| resolved_at | TEXT (nullable) | Çözümlenme zaman damgası (ISO-8601) |

### `backup_events`
Push monitor üzerinden gelen son yedekleme sinyalleri.

| Alan | Tip | Açıklama |
|---|---|---|
| id | INTEGER (autoincrement) | Birincil anahtar |
| token | TEXT | Bildiren job anahtarı |
| received_at | DATETIME | |
| status | TEXT | `success` / `failure` |
| size_bytes | INTEGER (nullable) | |
| message | TEXT (nullable) | |

### `users`, `user_sessions` ve `settings`
- `users`: `id`, `username`, `password_hash` (PBKDF2), `role` (`admin` veya `viewer`), `created_at`
- `user_sessions`: `token` (PK), `username`, `expires_at`, `created_at` (Konteyner yeniden başlasa bile oturumu koruyan kalıcı SQLite deposu)
- `settings`: `key`, `value`, `updated_at` (bildirim ayarları, kayıt açık/kapalı, saklama periyotları)

---

## 4. API Endpoint'leri (Minimal API)

| Method & Path | Yetki | Açıklama |
|---|---|---|
| `GET /api/dashboard/summary` | Auth | Servis sayıları, konteyner durumu, metrik ve backup özetini döner |
| `GET /api/services` | Auth | Servis listesi (sıralı, override ve SSL bilgileriyle) |
| `POST /api/services` | Admin | Yeni manuel servis ekler (HTTP, TCP veya ICMP Ping kontrolü) |
| `PUT /api/services/{id}` | Admin | Servisi günceller veya Docker servisi için override yazar |
| `PUT /api/services/reorder` | Admin | Servislerin görsel sıralamasını kaydeder |
| `DELETE /api/services/{id}` | Admin | Manuel servisi siler veya Docker override'ını kaldırır |
| `GET /api/status-page` | **Şifresiz** | Halka açık durum sayfası özeti (servisler, 30 kontrol `RecentChecks` ve aktif `Incidents`) |
| `GET /api/incidents` | Auth | Aktif ve geçmiş sistem olayları / bakım duyurularını listeler |
| `POST /api/incidents` | Admin | Yeni sistem olayı veya bakım duyurusu oluşturur |
| `PUT /api/incidents/{id}` | Admin | Olay detaylarını, önem derecesini veya mesajını günceller |
| `POST /api/incidents/{id}/resolve` | Admin | Olayı çözüldü olarak işaretler ve zaman damgası ekler |
| `DELETE /api/incidents/{id}` | Admin | Olay kaydını siler |
| `GET /api/uptime/{id}/daily-stats` | Auth | Bir servisin 365 günlük özet istatistiklerini getirir |
| `GET /api/containers` | Auth | Docker container listesi (durum, portlar, etiketler) |
| `GET /api/containers/stats-summary` | Auth | **Toplu Stats:** Tüm çalışan konteynerlerin CPU, RAM ve Ağ metriklerini tek HTTP akışında toplar |
| `GET /api/containers/{id}/stats` | Auth | Anlık konteyner CPU%, bellek kullanımı ve ağ I/O istatistikleri |
| `GET /api/containers/{id}/logs` | Auth | Son 100 konteyner log satırını döner |
| `GET /api/containers/{id}/logs/stream` | Auth | **SSE:** Gerçek zamanlı canlı konteyner log akışı |
| `GET /api/containers/{id}/terminal` | Admin | **WebSocket Proxy:** İnteraktif çift yönlü konteyner terminali (`/bin/bash` -> `/bin/sh` -> `/bin/ash` -> `sh`, ANSI 256 renk) |
| `GET /api/containers/system-df` | Auth | **Disk Analizi:** Durdurulmuş konteynerler, kullanılmayan imajlar, hacimler ve derleme önbelleği dökümü |
| `POST /api/containers/prune` | Admin | **Sistem Temizliği:** Disk alanı temizliği (imajlar, konteynerler, hacimler, ağlar, derleme önbelleği) |
| `POST /api/containers/prune/selective` | Admin | **Seçimli Kuru Çalıştırmalı Temizlik:** Seçilen durdurulmuş konteyner, imaj, yetim hacim ve derleme önbelleklerini temizler |
| `GET /api/containers/{id}/inspect` | Auth | **Konteyner Detayları:** Derinlemesine yapılandırma, ortam değişkenleri, portlar, ağlar ve disk bağlama noktaları |
| `POST /api/containers/{id}/update` | Admin | **Sıfır Kesintili Kaynak Güncelleme:** Canlı CPU (`NanoCpus`), RAM (`Memory`) ve Yeniden Başlatma İlkesi düzenleme |
| `GET /api/containers/{id}/check-update` | Auth | **OCI Digest Kontrolü:** İlgili konteynerin upstream OCI registry'de (Docker Hub, GHCR, Quay) yeni sürümü olup olmadığını sıfır veri transferiyle sorgular |
| `GET /api/containers/updates` | Auth | **Toplu İmaj Güncellemeleri:** Tüm çalışan konteynerlerin imaj güncelleme durum listesini döner |
| `POST /api/containers/{id}/recreate` | Admin | **Tek Tıkla Yeniden Oluşturma:** Yeni imajı çeker, eski konteyneri durdurur ve aynı konfigürasyonla kesintisiz yeniden ayağa kaldırır |
| `GET /api/compose/{projectName}/file` | Admin | **Compose YAML İnceleyici:** Dizin aşımı korumalı `compose.yaml` dosya içeriğini okur |
| `PUT /api/compose/{projectName}/file` | Admin | **Güvenli Compose Düzenleyici:** Compose dosyasını günceller, otomatik `.bak` yedeği alır ve isteğe bağlı stack'i yeniden başlatır |
| `POST /api/hooks/deploy/{token}` | Sabit Zamanlı Token | **CI/CD Dağıtım Webhook'u:** Sabit zamanlı kriptografik token ile güvenli gelen dağıtım tetikleyicisi |
| `GET /api/containers/tags` | Auth | Konteynerlere atanmış tüm tekil etiketleri listeler |
| `PUT /api/containers/{id}/tags` | Admin | Konteyner ortam etiketlerini günceller (SQLite `service_overrides` ile kalıcı saklanır) |
| `POST /api/containers/{id}/start` | Admin | Konteyneri başlatır |
| `POST /api/containers/{id}/stop` | Admin | Konteyneri durdurur |
| `POST /api/containers/{id}/pause` | Admin | Konteyneri duraklatır |
| `POST /api/containers/{id}/unpause` | Admin | Konteyneri devam ettirir |
| `POST /api/containers/{id}/restart` | Admin | Konteyneri yeniden başlatır |
| `GET /api/push-monitors` | Auth | Dead Man's Snitch monitörlerini listeler |
| `POST /api/push-monitors` | Admin | Yeni beklenen periyotlu push monitörü oluşturur |
| `PUT /api/push-monitors/{id}` | Admin | Push monitörünü günceller |
| `DELETE /api/push-monitors/{id}` | Admin | Push monitörünü siler |
| `POST /api/push/{token}` | Herkese Açık | Cron veya yedekleme sinyalini alır, snitch durumunu günceller |
| `GET /api/metrics/system` | Auth | Sistem kaynakları zaman serisi (`?range=1h\|6h\|12h\|24h\|7d\|30d\|90d\|1y`) |
| `GET /api/uptime` | Auth | Servis uptime geçmişi (`?service_id=...&range=7d`) |
| `POST /api/uptime/test-connection` | Auth | **Canlı Bağlantı Sınama:** HTTP/HTTPS, TCP veya ICMP Ping hedefine anlık ping atar; yanıt süresi (ms) döner |
| `GET /api/settings` | Auth | Sistem yapılandırma ayarlarını döner |
| `PUT /api/settings` | Admin | Sistem ayarlarını günceller |
| `GET /api/settings/db-stats` | Auth | Veritabanı ve WAL disk kullanım boyutunu döner |
| `GET /api/backup/download` | Admin | SQLite `VACUUM INTO` veritabanı yedeğini anlık indirir |
| `POST /api/notifications/test` | Admin | Alarm kanallarını (Discord, Telegram, SMTP E-posta, Slack, Ntfy, Webhook) test eder |
| `GET /api/version` | Auth | GitHub Releases API üzerinden güncel Corvus sürümünü ve güncelleme durumunu sorgular |
| `GET /api/stream/events` | Auth | **SSE:** Servis durumu ve sistem olaylarının anlık yayını |
| `GET /api/auth/status` | Herkese Açık | Oturum durumu, rol ve Zero-Trust SSO başlık denetimi |
| `POST /api/auth/login` | Herkese Açık | Giriş yapar ve 7 günlük oturum çerezi üretir |
| `POST /api/auth/register` | Herkese Açık | İlk yönetici veya kayıtlar açıksa yeni kullanıcı kaydeder |
| `POST /api/auth/logout` | Auth | Oturumu ve kalıcı oturum kaydını sonlandırır |
| `POST /api/auth/change-password` | Auth | Kendi şifresini güvenle günceller |
| `GET /api/users` | Admin | Sistemdeki tüm kullanıcıları ve rollerini (`admin`, `viewer`) listeler |
| `POST /api/users` | Admin | Yeni kullanıcı oluşturur ve rolünü atar |
| `DELETE /api/users/{id}` | Admin | Kullanıcıyı siler ve aktif oturumlarını derhal düşürür |

---

## 5. Arka Plan Servisleri (Background Services)

| Servis | Periyot | İş |
|---|---|---|
| `ContainerDiscoveryService` | 10 sn | Docker socket'ten container listesini senkronize eder. Keşfedilen yeni konteynerler `is_uptime_enabled = 0` olarak başlatılır; Docker running olduğu sürece durumları `healthy` senkronize edilir. Sıfır olmayan çıkış koduyla duran konteynerleri tespit edip kurtarma/alarm sürecini tetikler |
| `AutoHealingService` | Olay Güdümlü | Sıfır olmayan çıkış koduyla çöken konteynerleri thread-safe kayan pencere algoritmasıyla (15 dakikada en fazla 2 kurtarma) otomatik yeniden başlatır; flapping döngülerini engeller ve kurtarma alarmları gönderir |
| `SystemMetricsCollector` | 15 sn | Host CPU/RAM/disk/network ölçer, `system_metrics` tablosuna yazar |
| `UptimeCheckerService` | 5 sn (tick) / 60 sn | HTTP/TCP ve ICMP ping denetimleri, gövde içeriği doğrulaması, proaktif SSL erken uyarıları (14g ve 7g), durum geçiş takibi (`healthy` -> `degraded` -> `down`) ve Snitch denetimi |
| `UpdateCheckerService` | 24 saat | GitHub Releases API'sini sorgulayarak yeni sürüm kontrolü yapar, güncelleme bildirimlerini önbelleğe alır |
| `MemoryTrimmerBackgroundService` | 3 dakika | SQLite havuz temizliği, `PRAGMA wal_checkpoint(TRUNCATE);` ile WAL sıfırlama, Gen 2 agresif GC sıkıştırması ve libc `malloc_trim(0)` |
| `RetentionCleanupService` | Günde 1 kez | Saatlik metrik agregasyonu (`system_metrics_hourly`), ikili veri saklama temizliği (7g ham / 365g saatlik), `VACUUM;` ile freelist alanlarını işletim sistemine iade etme ve Gen 2 GC sıkıştırması |
| `FlappingDetector` | Sürekli (RAM içi) | Kayan pencereli durum geçiş takibi. Kısa süreli dalgalanmaları tespit eder, bildirim kirliliğini susturur ve Sarı uyarı ile Yeşil toparlanma bildirimi üretir |

---

## 6. Kimlik Doğrulama, RBAC ve Oturum Dayanıklılığı

1. **Rol Tabanlı Yetkilendirme (RBAC):**
   - `admin`: Tüm sisteme, servis ekleme/düzenleme/silmeye, konteyner kontrollerine, yedek indirmeye ve kullanıcı yönetimine tam yetkili.
   - `viewer`: Yalnızca panelleri, metrikleri ve durumları görüntüleyebilir (salt okuma). Mutasyon uç noktalarında `403 Forbidden` ile engellenir.
2. **Kalıcı SQLite Session Store:**
   - Oturumlar hem RAM'de mikrosaniye seviyesinde doğrulanır hem de SQLite `user_sessions` tablosunda saklanır. Konteyner güncellendiğinde veya yeniden başladığında kullanıcıların oturumu düşmez.
3. **Merkezi 401 Oturum Takibi:**
   - API katmanında oturum süresi dolduğunda (`401 Unauthorized`) fırlatılan işlenmemiş hatalar `corvus_unauthorized` olayıyla merkezi olarak yakalanır ve kullanıcıyı login sayfasına yönlendirir.
4. **Zero-Trust SSO / Reverse Proxy Desteği:**
   - Ters vekil sunuculardan gelen SSO başlıkları (`Tailscale-User-Login`, `Cf-Access-Authenticated-User-Email` vb.) yalnızca `CORVUS_TRUST_PROXY_HEADERS=true` ve güvenilir IP ise işletilir.
5. **Kaba Kuvvet (Brute-Force) Koruması:**
   - 1 dakikada 5 başarısız denemede IP ve kullanıcı bazında 1 dakika geçici kilitlenme (`HTTP 429`).

---

## 7. Sayfalar ve Kullanıcı Arayüzü

| Sayfa | URL | Özellikler |
|---|---|---|
| **Dashboard** | `/` | Mobil-öncelikli 2 sütunlu KPI şeridi, tam genişlikte Disk barı, canlı sistem nabzı, GitHub sürüm rozeti ve aktif konteynerler widget'ı |
| **Servisler** | `/services` | Servis kartları, durum rozetleri, TCP/ICMP PING port göstergeleri, HTTP gövde doğrulaması, SSL kalan gün rozeti, **ortam etiketleri (`TagBadge`)**, **anlık etiket filtreleme çubuğu (`TagFilterBar`)**, yukarı/aşağı sıralama butonları |
| **Container'lar** | `/containers` | Toplu stats akışı, anlık CPU%, RAM ve Net I/O rozetleri, **Tıklanabilir Satır Gezinmesi (`ContainerRow`)**, **Satır İçi Hızlı Aksiyonlar (`ContainerQuickActions`)**, Start/Stop/Pause/Restart aksiyonları, **Toplu Stack Butonları (`ComposeStackGroup`)**, **Tarayıcı İçi YAML Editörü (`ComposeConfigModal`)**, **OCI İmaj Güncelleme Takibi (`ImageUpdateModal`)**, canlı log terminali, **İnteraktif Web Terminali**, **Kuru Çalıştırmalı Disk Temizliği (`SystemPruneModal`)**, **Konteyner Etiketleme & Filtreleme (`TagFilterBar`)** |
| **Konteyner Detay** | `/containers/:id` | **Tam Ekran Komuta Merkezi:** Bağımsız URL ile erişilebilir, yer imlerine eklenebilir, derin bağlantılı (`?tab=`) kontrol paneli; canlı CPU %, RAM, Ağ Rx/Tx metrik kartları, **Tarihsel Telemetri Area Grafikleri (`ContainerHistoricalCharts`)**, tam ekran loglar ve xterm.js web terminali |
| **Uptime & Snitch** | `/uptime` | 3 durumlu sağlık takibi, HTTP/TCP/Ping yanıt süreleri geçmişi, proaktif SSL alarmları, Dead Man's Snitch ve sistem olayları / planlı bakım duyuru sekmesi |
| **Sistem Metrikleri**| `/metrics` | **1h, 6h, 12h, 24h, 7d, 30d, 90d ve 1y** aralıklarında saatlik rollup destekli CPU, RAM, Disk ve Ağ I/O grafikleri |
| **Ayarlar** | `/settings` | Tek kolonlu (`max-w-4xl`) ferah düzen, başlık sürüm rozeti, sekmeli alarm yapılandırması (**Discord, Telegram, SMTP E-posta, Slack Webhook, Ntfy, Webhook**), çift yönlü yedekleme, **Dalgalanma Koruması** ve esnek veri saklama |
| **Profil & Kullanıcılar** | `/profile` | Parola değiştirme, 2FA güvenlik ayarları ve yöneticiler için kullanıcı ekleme/silme ve rol atama paneli |
| **Canlı Durum** | `/status` | **Şifresiz:** Tüm sistemler operasyonel banner'ı, son 30 kontrol etkileşimli durum çubukları, kategori akordeonları, aktif arıza ve planlı bakım duyuruları |
| **Mobil Cam Altbar** | *Global* | Tablet ve mobilde 7 sekmeli buzlu cam (frosted glass) alt gezinti çubuğu (`BottomNav.tsx`) |

---

## 8. Tamamlanan Yol Haritası Adımları

- [x] Native AOT + Docker.DotNet doğrulama ve custom SocketsHttpHandler istemcisi
- [x] Dapper + Dapper.AOT + Microsoft.Data.Sqlite + DbUp veri katmanı (001-013)
- [x] Docker socket multiplexed log demuxer ve canlı log akışı
- [x] Konteyner İçi Web Terminali (Exec Shell, WebSocket Proxy, çift yönlü akış düzeltmesi ve geri çekilme kabuk zinciri)
- [x] İki Aşamalı Kuru Çalıştırmalı Sistem Temizliği (System Prune & Güvenli Hacim Koruması)
- [x] Konteyner Detay İnceleme ve Sıfır Kesintili Kaynak Düzenleme (`/inspect`, `/update`)
- [x] Çok kanallı alarm motoru (Discord, Telegram, SMTP E-posta, Slack, Ntfy, Webhook)
- [x] Dalgalanma (Flapping) Engelleme ve Alarm Yorgunluğu Koruması
- [x] Zaman Serisi Seyreltme (Hourly Rollup & 30d/90d/1y Grafikleri)
- [x] Servis & Konteyner Ortam Etiketleme / Gruplama (`013_service_tags.sql`, `TagBadge`, `TagInput`, `TagFilterBar`, konteyner etiketleri)
- [x] HTTP Yanıt Gövdesi (Kelime & Regex) Doğrulaması
- [x] Konteyner başına canlı kaynak kullanımı (Docker Stats: CPU, RAM, Net I/O)
- [x] Bağımsız Tam Ekran Konteyner Detay & Teşhis Sayfası (`/containers/:id`, derin bağlantı ve telemetri paneli)
- [x] Konteyner Tarihsel Telemetri Grafikleri (Recharts Area zaman serisi CPU & RAM yük trendi)
- [x] Docker Compose Stack Toplu Eylemleri (Toplu Başlat/Durdur/Yeniden Başlat)
- [x] Konteyner Beklenmedik Kapanma & Crash-Loop Alarmları (ExitCode != 0, OOMKilled)
- [x] OCI Registry İmaj Güncelleme Sentinel & Digest İzleyici (HEAD istekleriyle katman indirmeden tespit, 1-tıkla recreate)
- [x] Docker Compose YAML İnceleyici & Tarayıcı İçi Güvenli Düzenleyici (Dizin aşımı korumalı, otomatik .bak yedeği)
- [x] Olay Güdümlü Kendi Kendini Onarma (Auto-Healing) ve Sabit Zamanlı CI/CD Dağıtım Webhook'ları
- [x] Konteyner İnceleme Verisi Normalizasyonu & Eksik Alan Onarımları (`inspectHelpers.ts`)
- [x] Akıcı Satır Tıklama & Hızlı Eylemler Çubuğu (`ContainerQuickActions.tsx`)
- [x] Otomatik CI/CD Sürüm Algılama & Git Tag / Release Otomasyonu (`ci.yml`)
- [x] Genişletilmiş Uptime: TCP Port Ping, ICMP Ping ve SSL Sertifika erken uyarıları
- [x] Dead Man's Snitch: Beklenen periyotlu push monitörü ve otomatik gecikme alarmları
- [x] Halka Açık / Şifresiz Durum Sayfası (`/status` ve `/api/status-page`)
- [x] Server-Sent Events (SSE) Canlı Veri Yayını (`/api/stream/events`)
- [x] Docker Compose Stack Hiyerarşisi ve Gruplama (`com.docker.compose.project`)
- [x] Zero-Trust SSO / Reverse Proxy Auth başlıkları desteği
- [x] Rol Tabanlı Yetkilendirme (RBAC: `admin` vs `viewer`) ve Kullanıcı Yönetimi
- [x] Kalıcı SQLite Oturum Deposu (`user_sessions` ve `ISessionRepository`)
- [x] Modüler Profil & Güvenlik Sayfası (`/profile`)
- [x] Mobil Cam Altbar (Mobile Glass Bottom Navigation Bar)
- [x] Ayarlar Sayfası UX Sadeleştirmesi ve Merkezi 401 Interceptor
- [x] Servis görsel sıralama düzeni (`display_order` ve `/api/services/reorder`)
- [x] Frontend Code-Splitting ve Recharts paket optimizasyonu (<200 KB chunking)
- [x] SQLite WAL, kompozit indeksler ve yüksek performans PRAGMA optimizasyonları
- [x] Derleme anında tip korumalı çift dilli i18n sistemi (İngilizce varsayılan, Türkçe tam destek)
- [x] Çift yönlü yedekleme yönetimi: Tek tıkla kilitlenmesiz SQLite anlık yedek indirme (`GET /api/backup/download`), SSE canlı Dashboard güncellemesi ve harici push entegrasyonu
- [x] Esnek veri saklama süresi ve disk telemetrisi, otomatik `VACUUM;` freelist temizliği
- [x] In-Memory Micro-Cache (<150 KB) & .NET 9 Non-Concurrent GC + `DOTNET_GCConserveMemory=9`
- [x] Periyodik Native ve Yönetilen Bellek Temizleyici (`MemoryTrimmerBackgroundService`, Gen 2 compacting GC, `PRAGMA wal_checkpoint(TRUNCATE)` ve libc `malloc_trim(0)`)
- [x] Akıllı Konteyner Keşfi Parmak İzi (`ComputeFingerprint`) ve ortam değişkenleri önbelleği (`_inspectCache`)
- [x] Toplu İstatistikler (Batch Stats) Uç Noktası (`GET /api/containers/stats-summary`) ile N+1 soket çağrılarının kaldırılması
- [x] Gelişmiş 3 durumlu dayanıklılık motoru (`healthy` -> `degraded` -> `down`) & Docker loopback ağ geçidi çözümlemesi
- [x] Mobil-öncelikli 2 sütunlu kompakt KPI şeridi & aktif konteynerler widget'ı
- [x] GitHub Releases API dinamik SemVer sürüm denetleyicisi (`GET /api/version`)
- [x] Gelişmiş Uptime izleme parametreleri (özel kontrol aralığı, timeout, retry, TLS yoksayma, durum kodları) ve opt-in durum sayfası
- [x] Halka Açık Durum Sayfasında son 30 kontrol durum çubukları, kategori akordeonları ve canlı gecikme tooltip'leri
- [x] Sistem Olayları & Planlı Bakım Yönetimi ile durum sayfasında canlı uyarı afişleri (`service_incidents`)
- [x] Akıllı 24 saatlik retention (`is_transition`) ve 365 günlük SLA özet agregasyonu (`uptime_daily_stats`)
- [x] "Hex Sentinel" profesyonel kurumsal kimlik, SVG master vektörleri ve web ikon seti (`docs/branding/`)
- [x] 223/223 xUnit birim ve entegrasyon testi doğrulaması
