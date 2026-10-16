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

### Corvus Edge Agent (`src/Corvus.Agent`)
- Dil & Çalışma Zamanı: **C# / .NET 9 Native AOT** (Zero Reflection, tek bağımsız binary <15 MB)
- Hedef RAM Tüketimi: **<10 MB RAM** (boşta çalışma: ~6-8 MB)
- Mimari: **Yalnızca Dışa Doğru (Outbound) TLS WebSocket Tüneli** (`/agent/connect`), izlenen uç sunucularda sıfır açık port veya güvenlik duvarı kuralı gereksinimi
- Telemetri Toplama: Linux `/proc` ve `/sys` dosya sisteminden doğrudan yüksek performanslı veri okuma (`ProcFsCollector`, sıfır alt-kabuk ek yükü) ile CPU, RAM, Disk bölüntüleri ve Ağ arayüzü bant genişliği
- Docker Entegrasyonu: Unix domain soket RPC (`/var/run/docker.sock`) ile uzak konteyner durumlarını canlı akıtma ve yönetim komutları (`start`, `stop`, `restart`, `logs`)
- Linux Systemd Entegrasyonu: Regex korumalı beyaz liste birim yöneticisi (`SystemdServiceClient`, canlı `journalctl` log akıtıcı)

### Corvus Merkezi Kontrol Paneli (Backend)
- Dil & Çalışma Zamanı: **C# / .NET 9 Native AOT** (Ahead-Of-Time derlenmiş ELF/PE ikili dosya)
- Web Framework: Yüksek verimli uç noktalarla **ASP.NET Core Minimal API**
- Bellek Mimarisi: **Sıfır Bağımlılıklı In-Memory Micro-Cache** (<150 KB heap; Docker soketi için 2.5s-10s TTL, Uptime 24s agregasyonları için 5s TTL), **Yönetilmeyen Struct Telemetri Halka Tamponu (Ring Buffer)** (128-byte `SystemTelemetryPoint`, RAM'de kayan 60 nokta penceresi, sunucu başına ~7.2 KB), **.NET 9 Non-Concurrent Workstation GC** (`DOTNET_gcConcurrent=0`), **Elastik Bellek Ayarı** (`DOTNET_GCConserveMemory=9`, `MALLOC_TRIM_THRESHOLD_=65536`), periyodik native bellek temizleyici (`MemoryTrimmerBackgroundService`, her 3 dakikada bir veritabanı havuz tahliyesi, `PRAGMA wal_checkpoint(TRUNCATE);`, Gen 2 agresif sıkıştırma ve libc `malloc_trim(0)` ile native bellek iadesi), Container Discovery Fingerprinting (`ComputeFingerprint`) ve akıllı ortam değişkeni önbelleği (`_inspectCache`).
- Hedef RAM: **<35 MB** (boşta ~20-30 MB, çoklu sunucu yükü altında bile kesinlikle 40 MB tavanıyla kilitli)

### Frontend
- **TypeScript + React 19 + Vite**
- Mimari: **Modüler Temiz Mimari (Clean Architecture)**: `types/` altında güçlü tip sözleşmeleri, `api/` altında bağımsız etki alanı servisleri (`http.ts`, `services.ts`, `containers.ts`, `systems.ts`, `activity.ts` vb.) ve yerleşik SWR in-memory önbellekleme
- Tasarım Sistemi: **ObsidianUI** (Bulut Beyazı palet `#F5F6F8`, kesin sıfır gradyan eşik odaklı renk semantiği, 180-220ms yay fiziği mikro animasyonlar, buzlu cam yüzeyler)
- Stil: **Tailwind CSS v4** (Mobil Cam Altbar, duyarlı tek kolonlu modern ayarlar kabuğu, esnek kartlar)
- Grafikler: **Recharts**
- Çoklu Dil (i18n): **Derleme anında tip güvenli yerli React 19 Context** (`DeepStringify`), sıfır dış kütüphane ek yükü (~1.2 KB), varsayılan İngilizce (`en`) ve tam kapsamlı Türkçe (`tr`) desteği, dinamik dil seçici
- Kod Ayrıştırma (Code-Splitting): **React.lazy + Suspense** ve Vite `manualChunks` ile <200 KB ilk yükleme
- İletişim: REST + **Server-Sent Events (SSE)** üzerinden anlık durum yayını (`corvus_event` kanalları) + **100ms Uyarlanabilir Sistemler SSE Akışı** (`/api/systems/{id}/stream`)

### Veri ve Depolama Katmanı
- **Çift Veritabanı Sağlayıcı Desteği:**
  - **SQLite (Varsayılan Gömülü):** WAL modunda Microsoft.Data.Sqlite + Dapper.AOT (`PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA temp_store = MEMORY;`, `PRAGMA cache_size = -64000;`, `PRAGMA optimize;`)
  - **PostgreSQL (Çok Düğümlü / Kurumsal):** Bağlantı havuzu, yerel şemalar ve indeks optimizasyonu ile Npgsql + Dapper.AOT
- **DbUp**: SQL-first sıralı migration yönetimi (`001_init.sql` - `017_users_rbac_sqlite.sql` ve PostgreSQL karşılıkları)
- Zaman serisi tablolarında kompozit performans indeksleri (`system_metrics(recorded_at)`, `system_metrics_hourly(recorded_at)`, `system_metrics_1m(system_id, recorded_at)`, `uptime_checks(service_id, checked_at)`)
- **Yedekleme ve Saklama Motoru**: Kilitlenmesiz SQLite anlık görüntü indirme (`VACUUM INTO`), gerçek zamanlı veritabanı disk boyutu telemetrisi (`GET /api/settings/db-stats`), iki kademeli saklama temizleyicisi (7 gün 1dk ham / 30 gün 1sa özet / 365 gün günlük SLA), günlük otomatik `VACUUM;` freelist temizliği

### Otomatik Test Paketi
- **Toplam 374 Başarılı Test:**
  - **Backend (329 Test):** Minimal API uç noktaları, arka plan servisleri, repo katmanları, Docker istemcileri, dağıtım motoru ve RBAC güvenlik filtreleri üzerinde xUnit + Moq + FluentAssertions entegrasyon ve birim testleri.
  - **Frontend (45 Test):** Durum yönetimi, ANSI terminal ayrıştırma, stepper aşamaları, i18n biçimlendirme, bulanık arama ve bileşen render doğrulamaları içeren Vitest + React Testing Library testleri.

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

### `alert_rules`
Sistem ve konteyner kaynak sınırları için eşik tabanlı alarm kuralları (`014_alert_rules.sql`).

| Alan | Tip | Açıklama |
|---|---|---|
| id | TEXT (UUID) | Birincil anahtar |
| name | TEXT | Kural adı (örn. 'Sunucu CPU Aşımı') |
| target_type | TEXT | `system` veya `container` |
| target_id | TEXT (nullable) | Hedef konteyner ID (`target_type = container` ise) |
| metric | TEXT | `cpu`, `memory` veya `disk` |
| operator | TEXT | `gt` (büyüktür) veya `lt` (küçüktür) |
| threshold_value | REAL | Eşik yüzdesi veya değeri (örn. 85.0) |
| duration_seconds | INTEGER | Tetiklenme öncesi eşik ihlalinin sürmesi gereken süre (varsayılan: 60 sn) |
| cooldown_minutes | INTEGER | Tekrar bildirim gönderme bekleme süresi (varsayılan: 30 dk) |
| is_enabled | INTEGER | `1`: Aktif kural, `0`: Devre dışı |
| is_firing | INTEGER | `1`: Şu anda ihlal durumunda ve alarm verildi, `0`: Normal |
| violation_start_at | TEXT (nullable) | İhlalin başladığı ISO-8601 zaman damgası |
| last_triggered_at | TEXT (nullable) | Son alarm bildiriminin gönderildiği ISO-8601 zaman damgası |
| created_at, updated_at | TEXT | Oluşturulma ve güncelleme zaman damgaları |

### `activity_logs`
Güvenlik, konfigürasyon ve konteyner olayları için yapılandırılmış denetim izi (`015_activity_logs.sql`).

| Alan | Tip | Açıklama |
|---|---|---|
| id | TEXT (UUID) | Birincil anahtar |
| actor_username | TEXT | İşlemi başlatan kullanıcı adı veya `system` |
| action_type | TEXT | `container_restart`, `compose_update`, `threshold_alert`, `user_login` vb. |
| category | TEXT | `container`, `service`, `security`, `alert`, `system` |
| target_resource | TEXT | Etkilenen kaynak adı (örn. `nginx-web`, `api.corvus.local`) |
| details_json | TEXT (nullable) | İşlemi açıklayan yapılandırılmış JSON meta verisi |
| ip_address | TEXT (nullable) | İstek atan istemci IP adresi |
| created_at | TEXT | ISO-8601 olay zaman damgası (DESC indeksli) |

### `systems` (Uç Sunucular)
Çoklu sunucu mimarisinde kayıtlı uç sunucular ve durum takibi (`016_systems_sqlite.sql`).

| Alan | Tip | Açıklama |
|---|---|---|
| id | TEXT (UUID) | Birincil anahtar (Sunucu Düğüm ID) |
| name | TEXT | Kullanıcı dostu sunucu adı (örn. `vps-frankfurt-01`) |
| hostname | TEXT (nullable) | Ajan tarafından bildirilen sunucu hostname |
| ip_address | TEXT (nullable) | Algılanan uzak ajan IP adresi |
| os_info | TEXT (nullable) | İşletim sistemi dağıtımı, çekirdek ve mimari |
| agent_version | TEXT (nullable) | Çalışan Corvus Ajan SemVer sürümü |
| tags_json | TEXT | JSON etiket dizisi (örn. `["prod", "edge"]`) |
| status | TEXT | Bağlantı durumu: `online`, `degraded` veya `offline` |
| created_at, updated_at | TEXT | Kayıt ve meta veri güncelleme zaman damgaları |
| last_seen_at | TEXT (nullable) | Alınan son WebSocket sinyalinin ISO-8601 zaman damgası |

### `system_tokens`
Corvus Ajan kimlik doğrulaması için kriptografik güvenli sunucu belirteçleri (`016_systems_sqlite.sql`).

| Alan | Tip | Açıklama |
|---|---|---|
| id | TEXT (UUID) | Birincil anahtar |
| system_id | TEXT | `systems.id` referansı (ON DELETE CASCADE) |
| token_hash | TEXT (UNIQUE) | Ajan gizli anahtarının SHA-256 özeti |
| token_prefix | TEXT | Arayüzde güvenli tanımlama için önek (örn. `crv_live_9f82`) |
| created_at | TEXT | Oluşturulma zaman damgası |
| expires_at | TEXT (nullable) | Varsa geçerlilik bitiş zaman damgası |
| is_revoked | INTEGER | `1`: İptal edilmiş, `0`: Aktif |
| revoked_at | TEXT (nullable) | İptal zaman damgası |

### `system_metrics_1m`
Kayıtlı sunucuların 1 dakikalık toplu telemetri verileri, 7 gün saklanır (`016_systems_sqlite.sql`).

| Alan | Tip | Açıklama |
|---|---|---|
| id | INTEGER | Birincil anahtar (Otomatik artan) |
| system_id | TEXT | `systems.id` referansı (ON DELETE CASCADE) |
| recorded_at | TEXT | ISO-8601 örnek kova zaman damgası |
| cpu_percent | REAL | 1 dakikalık ortalama CPU kullanım yüzdesi |
| cpu_cores | INTEGER | Mevcut mantıksal CPU çekirdek sayısı |
| ram_used_bytes, ram_total_bytes | INTEGER | RAM bellek kullanımı ve kapasitesi (bayt) |
| disk_used_bytes, disk_total_bytes | INTEGER | Birincil disk kullanımı ve kapasitesi (bayt) |
| network_rx_bytes_sec, network_tx_bytes_sec | INTEGER | Ağ alma/gönderme bant genişliği (bayt/sn) |
| load_avg_1m, load_avg_5m, load_avg_15m | REAL (nullable) | Linux çekirdeği CPU yük ortalamaları |

### `system_metrics_1h`
Kayıtlı sunucuların 1 saatlik özetlenmiş telemetri verileri, 30 gün saklanır (`016_systems_sqlite.sql`).

| Alan | Tip | Açıklama |
|---|---|---|
| id | INTEGER | Birincil anahtar (Otomatik artan) |
| system_id | TEXT | `systems.id` referansı (ON DELETE CASCADE) |
| recorded_at | TEXT | Saatlik kova zaman damgası (`YYYY-MM-DDTHH:00:00Z`) |
| cpu_avg, cpu_max | REAL | Saat boyunca ortalama ve tepe CPU kullanımı |
| ram_used_avg | INTEGER | Ortalama RAM kullanımı (bayt) |
| disk_used_avg | INTEGER | Ortalama depolama kullanımı (bayt) |
| network_rx_total, network_tx_total | INTEGER | Toplam aktarılan ağ verisi (bayt) |

### `system_containers_cache`
Ajan tarafından canlı akıtılan uzak konteyner önbelleği (`016_systems_sqlite.sql`).

| Alan | Tip | Açıklama |
|---|---|---|
| system_id | TEXT | `systems.id` referansı (Kompozit PK) |
| container_id | TEXT | Uzak konteyner hash ID (Kompozit PK) |
| name | TEXT | Konteyner adı |
| image | TEXT (nullable) | Konteyner imaj deposu ve etiketi |
| state | TEXT | Durum dizesi (`running`, `exited`, `paused` vb.) |
| status | TEXT (nullable) | Çalışma özeti (örn. `Up 4 hours`) |
| cpu_percent | REAL | Anlık CPU yüzdesi |
| memory_bytes | INTEGER | Anlık bellek kullanımı (bayt) |
| ports_json | TEXT | Port eşleştirmeleri JSON dizisi |
| updated_at | TEXT | Son önbellek eşzamanlama zaman damgası |

### `deployments`
Konteyner dağıtım ve güncelleme işlemlerinin kalıcı denetim günlüğü (`019_deployments_sqlite.sql`).

| Alan | Tip | Açıklama |
|---|---|---|
| id | TEXT | Birincil Anahtar (GUID dizesi) |
| container_id | TEXT | Hedef konteyner hash'i veya tanıtıcısı |
| container_name | TEXT | Okunabilir konteyner adı |
| service_name | TEXT (nullable) | İlgili servis veya Compose servis adı |
| trigger_type | TEXT | Tetikleyici türü (`manual_ui`, `webhook_github`, `webhook_generic`, `scheduled`) |
| status | TEXT | Yaşam döngüsü durumu (`pending`, `in_progress`, `success`, `failed`, `rolled_back`, `cancelled`) |
| current_step | TEXT (nullable) | Aktif aşama (`queued`, `pulling`, `recreating`, `healthcheck`, `live`, `rolled_back`) |
| steps_json | TEXT | Zaman damgaları ve durumları içeren ayrık adımlar JSON dizisi |
| error_message | TEXT (nullable) | Hata açıklaması veya istisna izi |
| old_image_digest | TEXT (nullable) | Dağıtım öncesi upstream imaj özeti |
| new_image_digest | TEXT (nullable) | Dağıtım sonrası yeni imaj özeti |
| duration_ms | INTEGER (nullable) | Milisaniye cinsinden toplam dağıtım süresi |
| logs | TEXT (nullable) | Birikmiş ANSI konsol ve katman çekme logları |
| triggered_by | TEXT (nullable) | İşlemi başlatan kullanıcı adı veya webhook tokeni |
| created_at | TEXT | Dağıtım oluşturulma zaman damgası (ISO 8601) |
| started_at | TEXT (nullable) | Yürütmenin başlama zaman damgası |
| finished_at | TEXT (nullable) | Dağıtımın bitiş veya sonlanma zaman damgası |

### `users`, `user_sessions` ve `settings`
- `users`: `id`, `username`, `password_hash` (PBKDF2), `role` (`admin`, `operator`, `viewer`), `created_at` (`017_users_rbac_sqlite.sql`)
- `user_sessions`: `token` (PK), `username`, `expires_at`, `created_at` (Konteyner yeniden başlasa bile oturumu koruyan kalıcı SQLite/PostgreSQL deposu)
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
| `POST /api/containers/{id}/deploy` | Admin | **Dağıtım Tetikleme:** Asenkron dağıtım sürecini başlatır (ön çekim fail-fast, nano-rollback, canlı SSE akışı); 202 Accepted döner |
| `GET /api/deployments` | Auth | **Dağıtım Denetim Geçmişi:** Sayfalanmış/filtrelenmiş dağıtım kayıtlarını sorgular (`?container_id=...&limit=...`) |
| `GET /api/deployments/{id}` | Auth | **Dağıtım Kaydı Detayı:** Yürütme durumu, adım süreleri, imaj digest farkları ve birikmiş logları getirir |
| `POST /api/deployments/{id}/cancel` | Admin | **Dağıtımı İptal Et:** Devam eden dağıtım görevini güvenle iptal eder |
| `GET /api/deployments/{id}/stream` | Auth | **Dağıtım SSE Canlı Akışı:** İlerleme adımları ve ANSI log parçaları için gerçek zamanlı Server-Sent Events akışı |
| `GET /api/compose/{projectName}/file` | Admin | **Compose YAML İnceleyici:** Dizin aşımı korumalı `compose.yaml` dosya içeriğini okur |
| `PUT /api/compose/{projectName}/file` | Admin | **Güvenli Compose Düzenleyici:** Compose dosyasını günceller, otomatik `.bak` yedeği alır ve isteğe bağlı stack'i yeniden başlatır |
| `POST /api/hooks/deploy/{token}` | Sabit Zamanlı Token | **CI/CD Dağıtım Webhook'u:** Sabit zamanlı kriptografik token doğrulamalı ve senkron `&wait=true` boru hattı kapılı gelen dağıtım tetikleyicisi |
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
| `GET /api/users` | Admin | Sistemdeki tüm kullanıcıları ve rollerini (`admin`, `operator`, `viewer`) listeler |
| `POST /api/users` | Admin | Yeni kullanıcı oluşturur ve rolünü atar |
| `PUT /api/users/{id}/role` | Admin | Kullanıcı yetki rolünü günceller (`admin`, `operator`, `viewer`) |
| `DELETE /api/users/{id}` | Admin | Kullanıcıyı siler ve aktif oturumlarını derhal düşürür |
| `GET /api/systems` | Auth | Kayıtlı uç sunucuları, durumlarını, CPU/RAM/Disk metriklerini ve son görülme zamanlarını listeler |
| `POST /api/systems` | Admin | Yeni uç sunucu kaydeder ve ilk ajan gizli erişim anahtarını üretir |
| `GET /api/systems/{id}` | Auth | Sunucu telemetrisini, donanım özelliklerini, işletim sistemi bilgilerini ve konteyner önbelleğini döner |
| `PUT /api/systems/{id}` | Admin | Sunucu görünen adını, etiketlerini ve çalışma yapılandırmasını günceller |
| `DELETE /api/systems/{id}` | Admin | Sunucu kaydını siler, ajan anahtarını iptal eder ve geçmiş metrikleri temizler |
| `POST /api/systems/{id}/token` | Admin | Kriptografik güvenli ajan kimlik doğrulama anahtarını yeniden üretir |
| `GET /api/systems/{id}/metrics` | Auth | 1dk ve 1sa özet tablolarından zaman serisi telemetrisi döner (`?range=1h\|6h\|24h\|7d\|30d`) |
| `GET /api/systems/{id}/containers` | Auth | Uzak sunucunun önbellekteki Docker konteyner envanterini döner |
| `GET /api/systems/{id}/stream` | Auth | **SSE:** RAM halka tamponundan 100ms uyarlanabilir yüksek frekanslı canlı telemetri akışı |
| `GET /agent/connect` | Token Auth | **WSS Tüneli:** Corvus Edge Agent için çift yönlü güvenli WebSocket tüneli |
| `GET /agent/scripts/install.sh` | Herkese Açık | Linux sunucular için tek satırlık dinamik bash kurulum betiği |
| `GET /api/systemd/services` | Admin | Beyaz liste onaylı Linux systemd servislerini aktif durumlarıyla listeler |
| `POST /api/systemd/services/{name}/start` | Admin | Belirtilen systemd servisini başlatır |
| `POST /api/systemd/services/{name}/stop` | Admin | Belirtilen systemd servisini durdurur |
| `POST /api/systemd/services/{name}/restart` | Admin | Belirtilen systemd servisini yeniden başlatır |
| `POST /api/systemd/services/{name}/enable` | Admin | Servisi sistem açılışına (boot) ekler |
| `POST /api/systemd/services/{name}/disable` | Admin | Servisi sistem açılışından kaldırır |
| `GET /api/systemd/services/{name}/logs` | Admin | Canlı `journalctl -u {name} -n 100` loglarını akıtır |
| `GET /api/alerts/rules` | Auth | Yapılandırılmış eşik kurallarını ve anlık alarm durumlarını listeler |
| `POST /api/alerts/rules` | Admin | Yeni metrik eşik alarm kuralı (CPU, RAM, Disk) tanımlar |
| `PUT /api/alerts/rules/{id}` | Admin | Eşik değeri, süre, bekleme veya aktiflik durumunu günceller |
| `DELETE /api/alerts/rules/{id}` | Admin | Tanımlı bir eşik kuralını siler |
| `GET /api/activity` | Auth | Sayfalanmış denetim izi olaylarını döner (`?page=1&limit=50&category=...`) |
| `GET /api/activity/stats` | Auth | Kategoriye göre gruplanmış denetim izi istatistiklerini döner |

---

## 5. Arka Plan Servisleri (Background Services)

| Servis | Periyot | İş |
|---|---|---|
| `ContainerDiscoveryService` | 10 sn | Docker socket'ten container listesini senkronize eder. Keşfedilen yeni konteynerler `is_uptime_enabled = 0` olarak başlatılır; Docker running olduğu sürece durumları `healthy` senkronize edilir. Sıfır olmayan çıkış koduyla duran konteynerleri tespit edip kurtarma/alarm sürecini tetikler |
| `AutoHealingService` | Olay Güdümlü | Sıfır olmayan çıkış koduyla çöken konteynerleri thread-safe kayan pencere algoritmasıyla (15 dakikada en fazla 2 kurtarma) otomatik yeniden başlatır; flapping döngülerini engeller ve kurtarma alarmları gönderir |
| `SystemMetricsCollector` | 15 sn | Host CPU/RAM/disk/network ölçer, `system_metrics` tablosuna yazar |
| `UptimeCheckerService` | 5 sn (tick) / 60 sn | HTTP/TCP ve ICMP ping denetimleri, gövde içeriği doğrulaması, proaktif SSL erken uyarıları (14g ve 7g), durum geçiş takibi (`healthy` -> `degraded` -> `down`) ve Snitch denetimi |
| `UpdateCheckerService` | 24 saat | GitHub Releases API'sini sorgulayarak yeni sürüm kontrolü yapar, güncelleme bildirimlerini önbelleğe alır |
| `MemoryTrimmerBackgroundService` | 3 dakika | Veritabanı havuz temizliği, `PRAGMA wal_checkpoint(TRUNCATE);` ile WAL sıfırlama, Gen 2 agresif GC sıkıştırması ve libc `malloc_trim(0)` |
| `RetentionCleanupService` | Günde 1 kez | Saatlik metrik agregasyonu (`system_metrics_hourly`), ikili veri saklama temizliği (7g ham / 365g saatlik), `VACUUM;` ile freelist alanlarını işletim sistemine iade etme ve Gen 2 GC sıkıştırması |
| `MetricsBatchFlusherBackgroundService` | 60 sn | RAM'deki yönetilmeyen halka tamponundaki telemetri verilerini atomik toplu işlemlerle `system_metrics_1m` tablosuna yazar |
| `MetricsRetentionWorker` | Günde 1 kez | Uç sunucuların zaman serisi metrikleri için kayan saklama süresini (1m için 7 gün, 1h için 30 gün) uygular |
| `SystemWatchdogService` | 30 sn | Uç sunucu kalp atışı sağlığını denetler; 45 sn aşan sunucuları `degraded`, 90 sn aşanları `offline` durumuna çeker |
| `ThresholdEvaluatorService` | 20 sn | Tanımlı eşik kurallarını (`alert_rules`) kayan pencere ve spam önleme korumasıyla sistem telemetrisi üzerinde değerlendirir |
| `FlappingDetector` | Sürekli (RAM içi) | Kayan pencereli durum geçiş takibi. Kısa süreli dalgalanmaları tespit eder, bildirim kirliliğini susturur ve Sarı uyarı ile Yeşil toparlanma bildirimi üretir |

---

## 6. Kimlik Doğrulama, RBAC ve Oturum Dayanıklılığı

1. **Granüler 3 Seviyeli Rol Tabanlı Yetkilendirme (RBAC):**
   - `admin`: Servisler, uç sunucular, erişim anahtarları, kullanıcılar, systemd servisleri, Docker Compose yığınları, imaj re-create ve sistem yedekleri üzerinde tam yönetici yetkisi.
   - `operator`: Konteyner başlatma/durdurma/yeniden başlatma, imaj re-create, alarmları onaylama ve bağlantı testi gibi operasyonel görevleri yürütür; kullanıcı veya sunucu anahtarı yönetemez.
   - `viewer`: Yalnızca panelleri, telemetri grafiklerini, konteyner loglarını ve donanım özelliklerini görüntüleyebilir (salt okuma). Mutasyon uç noktalarında `403 Forbidden` alır.
2. **Kalıcı Oturum Deposu (Session Store):**
   - Oturumlar hem RAM'de mikrosaniye seviyesinde doğrulanır hem de `user_sessions` tablosunda saklanır. Konteyner güncellendiğinde veya yeniden başladığında kullanıcıların oturumu düşmez.
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
| **Container'lar** | `/containers` | Toplu stats akışı, anlık CPU%, RAM ve Net I/O rozetleri, **Tıklanabilir Satır Gezinmesi (`ContainerRow`)**, **Satır İçi Hızlı Aksiyonlar (`ContainerQuickActions`)**, **1 Tıkla Konteyner Dağıtımı**, Start/Stop/Pause/Restart aksiyonları, **Toplu Stack Butonları (`ComposeStackGroup`)**, **Tarayıcı İçi YAML & .env Editörü (`ComposeConfigModal`)**, **OCI İmaj Güncelleme Takibi (`ImageUpdateModal`)**, canlı log terminali, **İnteraktif Web Terminali**, **Kuru Çalıştırmalı Disk Temizliği (`SystemPruneModal`)**, **Konteyner Etiketleme & Filtreleme (`TagFilterBar`)** ve **CI/CD Webhook Kurulum Sihirbazı (`DeployWebhookWizardModal`)** |
| **Konteyner Detay** | `/containers/:id` | **Tam Ekran Komuta Merkezi:** Bağımsız URL ile erişilebilir, yer imlerine eklenebilir, derin bağlantılı (`?tab=`) kontrol paneli; canlı CPU %, RAM, Ağ Rx/Tx metrik kartları, **Tarihsel Telemetri Area Grafikleri (`ContainerHistoricalCharts`)**, tam ekran loglar, xterm.js web terminali ve **Konteyner Dağıtımları Sekmesi (`ContainerDeploymentsTab`, `DeploymentsTable`)** |
| **Sistemler (Filo)** | `/systems` | **Çok Düğümlü Sunucu Kokpiti:** Tüm uç sunucuların genel görünümü, sunucu sağlık rozetleri, anlık kaynak kullanım özetleri (CPU, RAM, Disk), arama & etiket filtreleme ve 1-tıkla ajan kurulum modalı (`AddSystemModal`) |
| **Sistem Detay** | `/systems/:id` | **Tam Ekran Sunucu Teşhisi:** Derin bağlantılı sekmeler (`?tab=overview\|metrics\|containers\|systemd\|settings`), 100ms uyarlanabilir canlı SSE telemetri akışı, geçmiş trend grafikleri, uzak konteyner kontrolleri ve Linux systemd servis yöneticisi |
| **Denetim İzi** | `/activity` | **Kronolojik Olay Zaman Tüneli:** Olay kategorilerine (`container`, `security`, `alert`, `system`) göre filtreleme, kaynak bazlı arama ve yapılandırılmış JSON detayları |
| **Uptime & Snitch** | `/uptime` | 3 durumlu sağlık takibi, HTTP/TCP/Ping yanıt süreleri geçmişi, proaktif SSL alarmları, Dead Man's Snitch ve sistem olayları / planlı bakım duyuru sekmesi |
| **Sistem Metrikleri**| `/metrics` | **1h, 6h, 12h, 24h, 7d, 30d, 90d ve 1y** aralıklarında saatlik rollup destekli CPU, RAM, Disk ve Ağ I/O grafikleri |
| **Ayarlar** | `/settings` | Tek kolonlu (`max-w-4xl`) ferah düzen, başlık sürüm rozeti, sekmeli alarm yapılandırması (**Discord, Telegram, SMTP E-posta, Slack Webhook, Ntfy, Webhook**), **Metrik Eşik Alarm Kuralları (`014_alert_rules.sql`)**, çift yönlü yedekleme, **Dalgalanma Koruması** ve esnek veri saklama |
| **Profil & Kullanıcılar** | `/profile` | Parola değiştirme, 2FA güvenlik ayarları ve 3 seviyeli RBAC (`admin`, `operator`, `viewer`) ile kullanıcı yetkilendirme paneli |
| **Canlı Durum** | `/status` | **Şifresiz:** Tüm sistemler operasyonel banner'ı, son 30 kontrol etkileşimli durum çubukları, kategori akordeonları, aktif arıza ve planlı bakım duyuruları |
| **Komut Paleti** | `Ctrl+K` / `Cmd+K` | **Hızlı Klavye Navigasyonu:** Sayfalar, konteynerler, uç sunucular ve operasyonel hızlı eylemler arasında sıfır bağımlılıklı bulanık arama (`fuzzySearch.ts`) |
| **Mobil Cam Altbar** | *Global* | Tablet ve mobilde 7 sekmeli buzlu cam (frosted glass) alt gezinti çubuğu (`BottomNav.tsx`) |

---

## 8. Tamamlanan Yol Haritası Adımları

- [x] Native AOT + Docker.DotNet doğrulama ve custom SocketsHttpHandler istemcisi
- [x] Dapper.AOT + Microsoft.Data.Sqlite + Npgsql PostgreSQL + DbUp veri katmanı (001-019)
- [x] Corvus Edge Agent (`src/Corvus.Agent`) .NET 9 Native AOT (<10 MB RAM, dışa doğru TLS/WSS tünel, sıfır açık port)
- [x] Çok Düğümlü Sistemler Kokpiti (`/systems`, `/systems/:id`) ve 100ms uyarlanabilir canlı SSE akışı
- [x] Sıfır Tahsisli Yönetilmeyen 128-byte `SystemTelemetryPoint` halka tamponu (sunucu başına ~7.2 KB RAM)
- [x] İki Kademeli Kayan Telemetri Saklama ve Toplu Yazıcı (`MetricsBatchFlusherBackgroundService`, `MetricsRetentionWorker`)
- [x] Sunucu Kalp Atışı Bekçisi (`SystemWatchdogService`) ile otomatik durum kademelendirme (online -> degraded -> offline)
- [x] 3 Seviyeli Rol Tabanlı Yetkilendirme (`admin`, `operator`, `viewer`) ve `CorvusAuthFilter` uç nokta koruması
- [x] Regex Korumalı Linux Systemd Servis Yöneticisi ve canlı `journalctl` log akıtıcı
- [x] Görsel Compose YAML & `.env` Editörü (TAB tuşu girinti desteği, anlık akıtılan deploy, otomatik `.bak` yedeği)
- [x] Metrik Eşik Alarm Motoru (`014_alert_rules.sql`, `ThresholdEvaluatorService`) ve çok kanallı bildirim
- [x] Yapılandırılmış Olay Denetim İzi (`015_activity_logs.sql`, `/activity`)
- [x] Evrensel Komut Paleti (`Ctrl+K`) ve sıfır bağımlılıklı bulanık arama (`fuzzySearch.ts`)
- [x] ObsidianUI Tasarım Sistemi ve Hareket Fiziği Motoru (Bulut Beyazı `#F5F6F8`, 180-220ms yay fiziği, cam yüzeyler)
- [x] Docker socket multiplexed log demuxer ve canlı log akışı
- [x] Çok kanallı alarm motoru (Discord, Telegram, SMTP E-posta, Slack, Ntfy, Webhook) ile sistem dili senkronizasyonu
- [x] Konteyner başına canlı kaynak kullanımı & Toplu Stats Uç Noktası (`GET /api/containers/stats-summary`)
- [x] Bağımsız Tam Ekran Konteyner Detay & Teşhis Sayfası (`/containers/:id`, derin bağlantı ve telemetri paneli)
- [x] Konteyner Tarihsel Telemetri Grafikleri (Recharts Area zaman serisi CPU & RAM yük trendi)
- [x] Docker Compose Stack Toplu Eylemleri (Toplu Başlat/Durdur/Yeniden Başlat)
- [x] Konteyner Beklenmedik Kapanma & Crash-Loop Alarmları (ExitCode != 0, OOMKilled)
- [x] OCI Registry İmaj Güncelleme Sentinel & Digest İzleyici (HEAD istekleriyle tespit, 1-tıkla recreate)
- [x] Event-Driven Auto-Healing & Constant-Time Inbound Deploy Webhooks
- [x] Genişletilmiş Uptime: TCP Port Ping, ICMP Ping ve SSL Sertifika erken uyarıları
- [x] Dead Man's Snitch: Beklenen periyotlu push monitörü ve otomatik gecikme alarmları
- [x] Halka Açık / Şifresiz Durum Sayfası (`/status` ve `/api/status-page`)
- [x] Server-Sent Events (SSE) Canlı Veri Yayını (`/api/stream/events`)
- [x] Zero-Trust SSO / Reverse Proxy Auth başlıkları desteği
- [x] Kalıcı Oturum Deposu (`user_sessions` ve `ISessionRepository`)
- [x] Mobil Cam Altbar (Mobile Glass Bottom Navigation Bar)
- [x] Derleme anında tip korumalı çift dilli i18n sistemi (İngilizce varsayılan, Türkçe tam destek)
- [x] Çift yönlü yedekleme yönetimi: Tek tıkla kilitlenmesiz anlık yedek indirme (`GET /api/backup/download`) + harici push entegrasyonu
- [x] Periyodik Native ve Yönetilen Bellek Temizleyici (`MemoryTrimmerBackgroundService`, Gen 2 compacting GC, `PRAGMA wal_checkpoint(TRUNCATE)` ve libc `malloc_trim(0)`)
- [x] Konteyner İçi Web Terminali (Exec Shell, WebSocket Proxy, çift yönlü akış düzeltmesi ve geri çekilme kabuk zinciri)
- [x] İki Aşamalı Kuru Çalıştırmalı Sistem Temizliği (System Prune & Güvenli Hacim Koruması)
- [x] Servis & Konteyner Ortam Etiketleme / Gruplama (`013_service_tags.sql`, `TagBadge`, `TagInput`, `TagFilterBar`, konteyner etiketleri)
- [x] **Native AOT Konteyner Dağıtım Merkezi (`019_deployments_sqlite.sql`, `DeploymentEngine.cs`, `DeploymentLockManager.cs`)**
- [x] **Sıfır Kesintili Rollback & Fail-Fast Ön Çekim Doğrulaması (`DockerService.cs`, `DockerImageClient.cs`)**
- [x] **Senkron CI/CD Dağıtım Webhook Kapısı (`POST /api/hooks/deploy/{token}?wait=true`)**
- [x] **Vercel Seviyesinde Modüler Frontend Dağıtım Merkezi (`DeploymentStepper`, `DeploymentTerminalLog`, `DeploymentProgressModal`, F5 localStorage durum kurtarma)**
- [x] 374/374 Başarılı Otomatik Test (329 backend xUnit + 45 frontend Vitest)

