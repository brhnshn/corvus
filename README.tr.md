<p align="center">
  <img src=".github/assets/banner.jpg" alt="Corvus Banner" width="100%" />
</p>

<h1 align="center">Corvus</h1>

<p align="center">
  <strong>Kendi Sunucularınız İçin Ultra Hafif, Native AOT Servis Başlatıcı ve İzleme Paneli</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-9.0_Native_AOT-512BD4?logo=dotnet" alt=".NET 9" />
  <img src="https://img.shields.io/badge/RAM_T%C3%BCketimi-%3C30_MB-success" alt="RAM <30MB" />
  <img src="https://img.shields.io/badge/Frontend-React_19_+_Vite_+_Tailwind-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Veritaban%C4%B1-SQLite_+_Dapper.AOT-003B57?logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Testler-223_Ba%C5%9Far%C4%B1l%C4%B1-brightgreen" alt="Tests" />
  <a href="https://github.com/brhnshn/Corvus/actions/workflows/codeql.yml"><img src="https://github.com/brhnshn/Corvus/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <a href="https://coderabbit.ai"><img src="https://img.shields.io/badge/CodeRabbit-Reviewed-ff5722?logo=coderabbit" alt="CodeRabbit" /></a>
  <img src="https://img.shields.io/badge/i18n-%C4%B0ngilizce_%7C_T%C3%BCrk%C3%A7e-blue" alt="i18n" />
  <img src="https://img.shields.io/badge/Lisans-MIT-blue" alt="License" />
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-blue?style=for-the-badge" alt="English" /></a>
  <a href="README.tr.md"><img src="https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red?style=for-the-badge" alt="Türkçe" /></a>
</p>

---

## 🌟 Genel Bakış

**Corvus**, homelab ortamları, VPS sunucuları ve self-hosted altyapılar için tasarlanmış ultra hafif, yerel bir servis başlatıcı ve gözlemlenebilirlik (observability) kontrol panelidir. Sıfır çalışma zamanı yansıması (zero-reflection) ile önceden derlenen (**Native AOT**) Corvus, **30 MB'ın altında RAM** tüketerek çalışırken gerçek zamanlı Docker konteyner keşfi, endüstriyel standartta 3 durumlu servis sağlık denetimi, zaman serisi kaynak takibi, canlı konteyner logları, çok kanallı alarmlar ve periyodik push izleme sunar.

---

## ✨ Temel Özellikler

- **🔐 Rol Tabanlı Yetkilendirme (RBAC) & Kalıcı Oturumlar (Session Store):**
  - `admin` (tam yetki) ve `viewer` (salt okuma) rolleri ile uç nokta düzeyinde RBAC koruması (`RequireAdminAttribute`).
  - Kalıcı SQLite oturum deposu (`user_sessions` tablosu): Konteyner yeniden başladığında veya güncellendiğinde oturumun düşmesini önler; bellek üzerinde mikrosaniye seviyesinde doğrulama hızını korur.
  - Bağımsız modüler **Profil ve Güvenlik Sayfası** (`/profile`): Şifre değiştirme, 2FA yönetimi ve yöneticiler için kullanıcı ekleme/silme paneli.
  - Merkezi `corvus_unauthorized` oturum düşüş yakalayıcısı: Oturum bittiğinde ekranda kırmızı hata yerine kullanıcıyı doğrudan ve zarifçe giriş ekranına yönlendirir.
- **📱 Mobil Cam Altbar (Mobile Glass Bottom Navigation):**
  - Tablet ve mobil ekranlar için özel tasarlanmış, kayan göstergeli ve genişleyen 7 sekmeli buzlu cam (frosted glass) alt gezinti çubuğu (`BottomNav.tsx`).
  - Ekran alanını daraltan eski mobil üst bar ve hamburger çekmece menüsü kaldırılarak tam ekran temiz mobil deneyim.
- **🌍 Çift Dilli & Compile-Time Çoklu Dil (i18n):**
  - Harici kütüphane ek yükü olmayan (~1.2 KB), derleme anında tip korumalı (`DeepStringify`) yerli React 19 Context.
  - Varsayılan İngilizce (`en`), %100 eksiksiz Türkçe (`tr`) ve anında geçiş sağlayan dil seçici.
  - Arka plan bildirim kanallarının (Discord, Telegram, Ntfy, Webhook) seçili sistem diline göre otomatik senkronizasyonu.
- **🧠 Dahili In-Memory Micro-Cache & Agresif Bellek Sıkıştırma (Memory Trimmer):**
  - 2.5–10 saniyelik sıfır-tahsisli dahili önbellekleme: Sekmeler arası hızlı geçişlerde Docker soket ve SQLite sorgu yükünü %90 azaltarak bellek sıçramalarını önler (<150 KB bellek maliyeti).
  - N+1 yerine tek sorguda çalışan `one-shot=true` ve kayan pencere (sliding delta) CPU motorlu toplu metrik uç noktası (`GET /api/containers/stats-summary`), Docker'ın 1 saniyelik uykusunu kaldırarak 100ms altı anlık yanıt sağlar.
  - **MemoryTrimmerBackgroundService:** Her 3 dakikada bir SQLite bağlantı havuzlarını temizler (`ClearAllPools`), `PRAGMA wal_checkpoint(TRUNCATE);` ile WAL boyutunu 0 byte'a çeker, Gen 2 agresif sıkıştırmalı GC'yi tetikler ve Linux libc `malloc_trim(0)` ile serbest kalan bellek sayfalarını doğrudan işletim sistemine iade eder.
  - **Non-Concurrent Workstation GC** (`DOTNET_gcConcurrent=0`) ve `DOTNET_GCConserveMemory=9` ile RAM'i boşta ~20-30 MB bandında kilitler.
  - **RetentionCleanupService:** Günlük temizlik sonrasında otomatik `VACUUM;` çağırarak silinen verilerin freelist alanlarını host diskine geri kazandırır.
- **🚀 Çift Modlu Servis Başlatıcı & Akıllı Konteyner Senkronizasyonu:**
  - **Akıllı Otomatik Keşif:** Docker socket (`/var/run/docker.sock`) üzerinden konteynerleri tespit eder. `_inspectCache` ile değişmeyen konteyner ortam değişkenlerini önbelleğe alır; `ComputeFingerprint` algoritmasıyla durum değişmediğinde gereksiz SQLite yazma transaction'larını tamamen atlar.
  - **Manuel Servisler:** Harici URL'leri, yerel servisleri veya IoT uç noktalarını el ile tanımlayabilme.
  - **Görsel Sıralama:** Servisleri yukarı/aşağı butonlarıyla kalıcı olarak sıralayabilme (`display_order`).
- **🛡️ Gelişmiş 3 Durumlu Dayanıklılık ve Sağlık Motoru:**
  - `healthy` ➔ `degraded` ➔ `down` durum makinesi: Anlık ağ dalgalanmalarında panik false-alarmı üretmez; 3 ardışık başarısızlıktan sonra gerçek arıza alarmı üretir.
  - `Parallel.ForEachAsync` ile onlarca servisi darboğazsız eşzamanlı denetler.
  - Konteyner loopback ağını otomatik çözümler (`host.docker.internal` / varsayılan bridge gateway yönlendirmesi).
- **⏱️ Genişletilmiş Uptime, ICMP Ping & SSL Erken Uyarısı:**
  - **ICMP Ping Denetimi:** HTTP portu bulunmayan sunucular, router'lar ve IoT cihazlar için `System.Net.NetworkInformation.Ping` ile asenkron paket gecikmesi (RTT) ve erişilebilirlik takibi (`checkType: 'ping'`).
  - **Proaktif SSL/TLS Erken Uyarısı:** Sertifika bitimine 14 ve 7 gün kala Discord, Telegram, Ntfy ve Webhook kanallarına otomatik erken uyarı bildirim motoru; günlük seviye tabanlı debounce hafızası.
  - **Kullanıcı Kontrollü (Opt-in) Uptime & Canlı Bağlantı Testi:** Keşfedilen konteynerler havuzunda tek tıkla **"Yalnızca Web/Domain"** filtresiyle harici URL'si olan servisleri listeleme; dahili "Bağlantıyı Sına" (`POST /api/uptime/test-connection`) butonuyla anlık yanıt süresi ve HTTP/TCP/ICMP durumunu test ederek onaylama.
  - **Etkileşimli Yanıt Süresi Rozetleri:** Son kontrollerde yanıt sürelerini renkli eşiklerle (<200ms yeşil, 200-500ms sarı, >500ms kırmızı) anında görselleştirme.
  - **Ters Vekil (Reverse Proxy) Otomatik Algılama:** Traefik kuralları (`Host(...)`), Caddy etiketleri, `VIRTUAL_HOST`, `LETSENCRYPT_HOST` ve konteyner ortam değişkenleri (`NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `APP_URL`) taranarak yerel `localhost` yerine gerçek alan adlarını otomatik bağlama.
  - **Gelişmiş Monitör Parametreleri (`AdvancedCheckOptions`):** Servis bazında bağımsız kontrol sıklığı (`check_interval`: 10s-300s), özel zaman aşımı (`timeout_seconds`), başarısızlık toleransı (`max_retries` / `retry_interval`), SSL hatalarını yoksayma (`ignore_tls`), kabul edilen HTTP durum kodları (`accepted_status_codes`, örn: `200-299, 401`) ve HTTP yöntemi (GET/POST/HEAD).
  - **Dahili Konteynerler İçin Yerel Docker Uptime Takibi:** Web portu açmayan dahili servisler için doğrudan Docker Engine API üzerinden konteyner çalışma/sağlık durumu denetimi (`checkType: 'docker'`).
- **🦅 Özgün Vektör Marka Kimliği (Hex Sentinel):**
  - Docker konteyner altıgeni, Corvus **C** monogramı ve nöbetçi karga siluetini birleştiren saf geometrik logo kimliği.
  - Sektör standartlarında çok katmanlı `favicon.ico`, modern tarayıcılar için saf vektör `favicon.svg`, PWA manifestosu ve kapsamlı marka kılavuzu (`docs/branding/BRAND_GUIDELINES.md`).
- **💾 Çift Yönlü Yedekleme Yönetimi & Felaket Kurtarma:**
  - **Dahili Anlık Yedekleme İndirme:** Kilitlenmesiz, tutarlı SQLite `VACUUM INTO` veritabanı yedeğini tek tıkla indirme (`GET /api/backup/download`) ve Dashboard istatistiklerini SSE ile canlı güncelleme.
  - **Harici Yedekleme Bildirimi:** Dinamik token oluşturucu ve otomatik yapılandırılmış `curl` şablonları ile host yedekleme araçları (`restic`, `borg`, cron) entegrasyonu.
- **🧹 Esnek Veri Saklama Süresi & Disk Telemetrisi:**
  - Hazır saklama periyotları: 7 gün, 15 gün, 30 gün (önerilen), 60 gün, 90 gün, 180 gün, 365 gün veya **Sınırsız (0)**.
  - **Akıllı 24 Saatlik Retention & 365 Günlük Özet:** 24 saatten eski durum değiştirmeyen olağan kontrolleri temizlerken (`is_transition = 0`), durum değişim anlarını (`is_transition = 1`) ve 365 günlük hafif yıllık özetleri (`uptime_daily_stats`) korur.
  - Sınırsız mod seçildiğinde disk büyümesi ve yedekleme süresi hakkında bilgilendirici akıllı uyarı.
  - SQLite dosya ve WAL boyutunu canlı takip etme (`GET /api/settings/db-stats`).
  - Veritabanı ayarını dinamik dinleyen ve temizlik sonrası `PRAGMA optimize;` çalıştıran `RetentionCleanupService`.
- **🪵 Etkileşimli Web Terminali (Exec Shell) & Canlı Log Akışı:**
  - **Tarayıcı İçi Web Terminali (`/bin/bash` -> `/bin/sh` -> `/bin/ash` -> `sh`):** Ekstra ajan veya arka plan süreci kurmadan çalışan Docker konteynerlerine doğrudan interaktif kabuk erişimi (`ArrayPool<byte>` ile sıfır bellek tahsisatlı, 8 KB sabit tamponlu WebSocket proxy).
  - Windows pipe kilitlenmeleri çözülmüş, kesintisiz çift yönlü klavye akışı, otomatik kabuk zinciri, tam ANSI 256 renk (`TERM=xterm-256color`) ve sıkı RBAC koruması (`[RequireAdmin]`, 403 Forbidden).
  - Docker stdout/stderr akışları için sıfır bellek ayırmalı (zero-alloc) ayrıştırıcı (`DockerLogDemuxer.cs`).
  - Koyu temalı terminal modalı, anahtar kelime filtreleme ve otomatik kaydırma ile Server-Sent Events (`/api/containers/{id}/logs/stream`) akışı.
- **⚡ Konteyner Detay İnceleme, Sıfır Kesintili Kaynak Güncelleme & Güvenli Kuru Çalıştırmalı Temizlik:**
  - **Konteyner Detay Modalı (`ContainerDetailModal.tsx`):** Konteyner adına veya ayar simgesine tıklayarak 5 bağımsız sekmede (Genel Bakış, Gizlenebilir Ortam Değişkenleri & `.env` kopyalama, Portlar & Docker Ağları, Disk/Volume Bağlamaları, Kaynak Yönetimi) tam denetim.
  - **Sıfır Kesintili Kaynak Güncelleme (`POST /api/containers/{id}/update`):** Konteyneri durdurmadan veya yeniden başlatmadan canlı CPU çekirdeği (`NanoCpus`), RAM limiti (`Memory`) ve Yeniden Başlatma İlkesi (Restart Policy) değiştirme.
  - **Güvenli Kuru Çalıştırmalı Sistem Temizliği (`SystemPruneModal.tsx`):** Docker `GET /system/df` ile disk analizini önceden yaparak kazanılacak alanı hesaplar; Durdurulmuş Konteynerler, Kullanılmayan İmajlar, Yetim Volumeler (veri kaybı uyarılı) ve Build Cache kalemlerini tablo tablo seçtirerek güvenle temizler (`POST /api/containers/prune/selective`).
  - **Compose Stack Gruplaması:** Düz liste ile katlanabilir Docker Compose projeleri (`com.docker.compose.project`) arasında tek tıkla geçiş.
- **🔔 Çok Kanallı Alarm Motoru & Dalgalanma (Flapping) Koruması:**
  - Sekmeli yapılandırma: **Discord**, **Telegram**, **E-posta (SMTP)**, **Slack Webhook**, **Ntfy / Gotify** ve **Özel Webhook** kanalları.
  - **Akıllı Dalgalanma Engelleme (`IFlappingDetector`):** Hızlı durum değişimlerinde alarm kirliliğini ve yorgunluğunu önler; tek bir Dalgalanma Uyarısı (Amber) ve Kararlılık/Kurtarma (Yeşil) bildirimi gönderir.
  - Çip/etiket tabanlı çoklu alıcı e-posta girişi (`EmailRecipientInput`), regex e-posta doğrulaması ve panodan toplu yapıştırma desteği.
- **📉 Zaman Serisi Seyreltme & Tarihsel Özetler (Hourly Rollup):**
  - 15 saniyelik ham metriklerin (`system_metrics`) saatlik ortalama özet kayıtlarına (`system_metrics_hourly`) otomatik dönüştürülmesi.
  - İkili veri saklama stratejisi: Yüksek çözünürlüklü ham veriler 7 gün saklanırken saatlik özetler 365 gün boyunca tutulur.
  - Veri boşluğu oluşturmayan birleşik SQLite CTE sorguları ile `30 Gün`, `90 Gün` ve `1 Yıl` zaman aralıklarında milisaniyelik akıcı grafikler.
- **🏷️ Ortam Etiketleri & Kategori Gruplama (Tags):**
  - Servis ve konteynerleri ortam etiketlerine göre (örn. `Prod`, `Staging`, `Database`, `Internal`, `API`) serbestçe etiketleyebilme ve gruplayabilme.
  - Modüler `TagBadge` (deterministik pastel renk algoritması ve anlamsal ortam ön ayarları), `TagInput` (Enter/virgül ile ekleme, çip rozetler, hızlı öneriler) ve `TagFilterBar` (anlık sayaçlı tek tıkla çoklu etiket filtreleme çubuğu).
  - Docker konteyner etiketlerinden (`corvus.tags`, `environment`, `env`, `com.docker.compose.project`) otomatik etiket türetimi.
  - Kalıcı geçersiz kılma (override) koruması: Docker servislerine atanan etiketler SQLite `service_overrides` tablosunda korunur ve periyodik container keşif döngülerinde kaybolmaz.
- **⏱️ Genişletilmiş Uptime & SSL Takibi:**
  - **Kullanıcı Kontrollü (Opt-in) Uptime & Canlı Bağlantı Testi:** Docker'dan keşfedilen konteynerler kontrolsüzce pinglenmez; Uptime ekranında keşfedilenler havuzunda listelenir. Kullanıcı hedef adresi ve kontrol türünü belirler, dahili "Bağlantıyı Sına" (`POST /api/uptime/test-connection`) butonuyla anlık yanıt süresi ve HTTP/TCP durumunu test ederek onaylar.
  - **Ters Vekil (Reverse Proxy) Otomatik Algılama:** Traefik kuralları (`Host(...)`), Caddy etiketleri, `VIRTUAL_HOST`, `LETSENCRYPT_HOST` ve konteyner ortam değişkenleri (`NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `APP_URL`) taranarak yerel `localhost` yerine gerçek alan adlarını otomatik bağlama.
  - **Gelişmiş Monitör Parametreleri (`AdvancedCheckOptions`):** Servis bazında bağımsız kontrol sıklığı (`check_interval`: 10s-300s), özel zaman aşımı (`timeout_seconds`), başarısızlık toleransı (`max_retries` / `retry_interval`), SSL hatalarını yoksayma (`ignore_tls`), kabul edilen HTTP durum kodları (`accepted_status_codes`, örn: `200-299, 401`) ve HTTP yöntemi (GET/POST/HEAD).
  - **Konteyner ve Servis Uç Noktası Düzenleme:** Hem Servisler hem de Uptime ekranlarından açılan bağımsız modüler düzenleme penceresi ile erişim adresi, özel sağlık endpoint'i (`/api/health`), TCP portu veya Docker daemon kontrol türü tanımlama. Yapılandırmalar `service_overrides` tablosunda kalıcı olarak saklanır.
  - **Dahili Konteynerler ve Agent'lar İçin Yerel Docker Uptime Takibi:** Web portu açmayan dahili servisler (örn. `internal-agent`, `cloudflared`, `local-dns`) için Docker Engine API üzerinden konteyner çalışma/sağlık durumu denetimi (`checkType: 'docker'`); eksiksiz yeşil SLA barı ve kontrol kaydı.
  - **HTTP/HTTPS & TCP Port Ping:** Veritabanları, SSH veya oyun sunucuları gibi HTTP dışı servisler için soket seviyesinde bağlantı testi.
  - **SSL Sertifika Bitiş Süresi:** SSL kalan gün sayısını ve sertifika sağlayıcısını otomatik takip eder; bitime 14 gün kala uyarı üretir.
- **💀 Dead Man's Snitch (Periyodik Push Monitörü):**
  - Cron görevlerini ve yedekleme script'lerini (`borg`, `restic`, bash) izleme.
  - Beklenen periyot (örn. 24 saatte bir) ve tolerans süresi tanımlayabilme; sinyal gelmediğinde otomatik alarm oluşturma.
- **🌐 Genel Durum Sayfası (Public Status — Doğrudan Aktif & Kesinlikle Opt-in):**
  - **Doğrudan Erişim (`/status`):** Genel ayarlardan açma/kapama toggle'ı gerekmeksizin halka açık servisler için her zaman hazırdır.
  - **Kesinlikle Opt-in (Seçmeli):** Servisler asla otomatik olarak durum sayfasına sızmaz; yalnızca kullanıcının açıkça `is_public` ve `is_uptime_enabled` olarak işaretlediği servisler listelenir.
  - **Son 30 Kontrolün Etkileşimli Durum Çubukları:** Her servis için yanıt süresi (ms), kontrol zamanı ve durum rozetlerini canlı tooltip'lerle sunan etkileşimli 30 denetim çubuğu (`RecentChecks`).
  - **Kategori Bazlı Açılır/Kapanır Akordeon Grupları:** Servisleri kategorilerine göre düzenler, grup sağlık rozetleri ve toplu açma/kapama desteği sunar.
  - **Sistem Duyuruları & Planlı Bakım Afişleri:** Yönetici paneli olay yönetim sekmesinden oluşturulan aktif arıza, araştırma ve planlı bakım duyurularını (`service_incidents`) ziyaretçilere anında duyurur.
  - **Hafif Yıllık SLA Özeti:** 365 günlük günlük istatistik özeti tablosu (`uptime_daily_stats`) ile minimum disk alanıyla uzun vadeli SLA takibi sağlar.
- **🛡️ Sertleştirilmiş Kimlik Doğrulama, Zero-Trust SSO & DoS Koruması:**
  - **100k İterasyonlu PBKDF2 & Tuzlama:** 16-byte kriptografik rastgele tuz ve PBKDF2-HMAC-SHA256 parola hashleme; eski parolalar için şeffaf otomatik rehash desteği.
  - **Brute-Force & CPU DoS Koruması:** 1 dakika içinde 5 başarısız denemede otomatik 1 dakikalık IP/kullanıcı bazlı geçici kilitleme (`HTTP 429`).
  - **Ters Vekil (Reverse Proxy) Güvenliği:** `CORVUS_TRUST_PROXY_HEADERS` opt-in ve IP whitelist doğrulamasıyla sahte başlık (`Remote-User`, `Tailscale`, `Cloudflare Access`, `X-Forwarded-User`) spoofing engellemesi.
  - **Sertleştirilmiş CORS:** Kimlik bilgisi içeren istekler yalnızca tanımlı `CORVUS_ALLOWED_ORIGINS` veya yerel geliştirme ortamına izin verir.
  - **Modern Giriş Arayüzü:** Şifre göster/gizle ikonu, şifre yöneticisi (`autoComplete`) uyumu ve Docker `.env` hesabı alternatifi.
- **📱 Mobil ve Tablet Uyumlu Komuta Merkezi:**
  - 2 kolonlu optimize KPI kartları, tam genişlikte Disk Durumu çubuğu ve yan yana 2 kolonlu konteyner paneli.
  - Slide-over drawer menüsü, sabit mobil üst başlık, duyarlı tablo ve kart görünümleri.
- **🔄 Otomatik Semantik Sürüm & Güncelleme Kontrolü:**
  - GitHub Releases API ile dinamik sürüm karşılaştırması (`GET /api/version`) ve yeni sürüm çıktığında doğrudan bildirim.
- **⚡ Yüksek Performans & Optimizasyon:**
  - SQLite WAL modu, `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA cache_size = -2000;`.
  - Çok iş parçacıklı bellek şişmesini engelleyen konteyner seviyesinde glibc arena sınırlaması (`MALLOC_ARENA_MAX=2`) ve akış tabanlı HTTP başlık okuması.
  - Zaman serisi telemetri tablolarında kompozit performans indeksleri (`004_performance_indexes.sql`).
  - `React.lazy` ve Vite `manualChunks` ile kod ayrıştırma (ilk paket boyutu <200 KB).

---

## 🏗️ Mimari Şema

```
Corvus Mimarisi:
┌────────────────────────────────────────────────────────┐
│               Corvus Web Dashboard                    │
│   (React 19 + TypeScript + Tailwind v4 + Recharts)    │
│   [Sayfalar: Dashboard, Servisler, Konteynerler,      │
│     Uptime, Metrikler, Ayarlar, Canlı Durum (/status)] │
└───────────────────────────┬────────────────────────────┘
                            │ REST API + SSE Akışı (/api/stream/events)
┌───────────────────────────▼────────────────────────────┐
│               Corvus Core Engine                       │
│       ASP.NET Core Minimal API (.NET 9 Native AOT)     │
├───────────────────────────┬────────────────────────────┤
│  Docker REST API Client   │  SQLite + Dapper.AOT       │
│  (SocketsHttpHandler)     │  (DbUp Migrations 001-006) │
├───────────────────────────┴────────────────────────────┤
│  Çekirdek Servisler:                                   │
│  - DockerLogDemuxer (Sıfır bellek tahsisli log demux)  │
│  - NotificationService (Discord, Telegram, Ntfy, Web)  │
│  - EventBroadcaster (SSE için Channel<ServerEventDto>) │
│  - AuthService (Zero-Trust SSO + Session Cookies)      │
├────────────────────────────────────────────────────────┤
│  Arka Plan Servisleri:                                 │
│  - ContainerDiscoveryService (10s)                     │
│  - SystemMetricsCollector (15s)                        │
│  - UptimeCheckerService (TCP Ping, SSL, Snitch - 60s)  │
│  - RetentionCleanupService (24h)                       │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Docker Compose ile Hızlı Başlangıç

Bir `docker-compose.yml` dosyası oluşturun:

```yaml
services:
  corvus:
    image: ghcr.io/brhnshn/corvus:latest
    container_name: corvus
    restart: unless-stopped
    ports:
      - "8090:8090"
    environment:
      - CORVUS_PORT=8090
      - CORVUS_DATA_DIR=/data
      - DOCKER_SOCKET=/var/run/docker.sock
      - CORVUS_AUTH_ENABLED=true
    volumes:
      # Yaşam döngüsü kontrolleri (Start/Stop/Restart) için okuma-yazma soket erişimi:
      - /var/run/docker.sock:/var/run/docker.sock
      # Kalıcı SQLite veritabanı alanı
      - corvus-data:/data

volumes:
  corvus-data:
```

Konteyneri başlatın:

```bash
docker compose up -d
```

Tarayıcınızdan **`http://localhost:8090`** adresine (veya şifresiz durum sayfası için **`http://localhost:8090/status`** adresine) gidin.

---

## 🏷️ Docker Konteyner Etiketleri (Labels)

Konteynerlerinizi Docker Compose dosyalarınızda Corvus etiketleri ile tanımlayabilirsiniz:

```yaml
labels:
  - "corvus.name=Nextcloud Hub"
  - "corvus.category=Bulut Depolama"
  - "corvus.description=Kişisel dosya senkronizasyonu"
  - "corvus.url=https://cloud.example.com"
  - "corvus.healthcheck=https://cloud.example.com/status.php"
  - "corvus.icon=cloud"
  - "corvus.ignore=false"
```

---

## 📡 API Uç Noktaları Özeti

| Metot & Yol | Açıklama |
|---|---|
| `GET /api/dashboard/summary` | Konsolide KPI ve durum özeti |
| `GET /api/services` | Servis kataloğu, sıralama ve SSL bilgileri |
| `PUT /api/services/reorder` | Servislerin görsel sıralamasını kaydeder |
| `GET /api/status-page` | Halka açık şifresiz sistem durum özeti (servisler, 30 kontrol sparkline ve olaylar) |
| `GET /api/incidents` | Aktif ve geçmiş sistem olayları / duyurularını listeler |
| `POST /api/incidents` | Yeni olay veya planlı bakım duyurusu oluşturur |
| `PUT /api/incidents/{id}` | Olay detaylarını günceller |
| `POST /api/incidents/{id}/resolve` | Olayı çözüldü olarak işaretler |
| `DELETE /api/incidents/{id}` | Olay kaydını siler |
| `GET /api/uptime/{id}/daily-stats` | 365 günlük servis uptime özet istatistiklerini getirir |
| `GET /api/containers` | Konteyner listesi, durumları ve portları |
| `GET /api/containers/{id}/stats` | Anlık konteyner CPU%, RAM ve Net I/O verisi |
| `GET /api/containers/{id}/logs` | Son konteyner log satırları |
| `GET /api/containers/{id}/logs/stream` | Gerçek zamanlı SSE log akışı |
| `POST /api/containers/{id}/start` | Konteyneri başlatır |
| `POST /api/containers/{id}/stop` | Konteyneri durdurur |
| `POST /api/containers/{id}/pause` | Konteyneri duraklatır |
| `POST /api/containers/{id}/unpause` | Konteyneri devam ettirir |
| `POST /api/containers/{id}/restart` | Konteyneri yeniden başlatır |
| `GET /api/push-monitors` | Dead Man's Snitch monitörlerini listeler |
| `POST /api/push-monitors` | Yeni push monitörü oluşturur |
| `POST /api/push/{token}` | Cron ve yedekleme ping sinyali |
| `GET /api/backup/download` | Kilitlenmesiz SQLite dahili anlık yedek indirme (`.db`) |
| `GET /api/settings/db-stats` | Gerçek zamanlı SQLite ve WAL dosya boyutu telemetrisi |
| `GET /api/settings` | Tüm sistem ayarlarını getirir |
| `PUT /api/settings` | Sistem ayarlarını günceller |
| `POST /api/notifications/test` | Test bildirimi gönderir (Discord, Telegram, Ntfy, Webhook) |
| `GET /api/stream/events` | Server-Sent Events canlı durum akışı |
| `GET /api/auth/status` | Mevcut oturum ve Zero-Trust SSO tespiti |

---

## 🛠️ Kaynak Koddan Geliştirme ve Derleme

### Gereksinimler
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/)

### Projeyi Derleme
1. **Frontend:**
   ```bash
   cd src/Corvus.Web
   npm install
   npm run build
   ```
2. **Backend:**
   ```bash
   cd ../Corvus.Api
   dotnet run
   ```
3. **Testleri Çalıştırma:**
   ```bash
   dotnet test tests/Corvus.Api.Tests
   ```

---

## 💡 İlham Kaynakları & Teşekkürler (Inspirations & Credits)

Corvus, açık kaynak homelab ve sistem izleme ekosistemindeki öncü araçların felsefelerinden ilham alarak .NET 9 Native AOT üzerinde tek ve ultra hafif bir komuta merkezi olarak tasarlanmıştır:
- [Uptime Kuma](https://github.com/louislam/uptime-kuma) — İzleme mantığı ve durum sayfası felsefesi
- [Beszel](https://github.com/henrygd/beszel) — Hafif telemetri ve sistem kaynak takibi yaklaşımı
- [Portainer](https://github.com/portainer/portainer) — Konteyner yaşam döngüsü vizyonu

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.
