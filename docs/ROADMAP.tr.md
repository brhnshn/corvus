# Corvus Geliştirme Yol Haritası (Roadmap)

Bu belge, Corvus projesinin hafiflik (30-50 MB RAM), yüksek performans ve sıfır bağımlılık felsefesini koruyarak kurumsal üretim seviyesine taşınması için planlanan dikey dilimli görevleri (tracer bullet biletleri) tanımlar.

---

## Faz 1: Güvenilirlik, Kimlik & Oturum (Temel Zırhlama)

### Bilet 1.1 — Kalıcı SQLite Oturum Yönetimi (Persistent Sessions) [Tamamlandı - v1.5.19]
* **Önkoşul:** Yok (Hemen başlanabilir).
* **Amaç:** Konteyner yeniden başladığında veya güncellendiğinde tüm kullanıcıların oturumunun düşmesini engellemek.
* **Kapsam:**
  - SQLite `user_sessions` tablosu migration'ı (`010_user_sessions.sql`).
  - `ISessionRepository` ve `SessionRepository` veri erişim katmanı.
  - `AuthService` içindeki hibrit write-through önbellek mimarisi (RAM hızı + SQLite kalıcılığı).
  - `RetentionCleanupService` günlük süresi dolmuş oturum temizliği.
* **Kabul Kriteri:** Konteyner yeniden başlatıldıktan sonra tarayıcı çereziyle oturumun korunması, unit testlerin geçmesi (149/149 test geçti).

### Bilet 1.2 — Kullanıcı Yönetimi, Rol Yetkilendirme & Şifre Değiştirme (RBAC) [Tamamlandı]
* **Önkoşul:** Bilet 1.1
* **Amaç:** Admin kullanıcısının mevcut şifresini değiştirebilmesi, yeni kullanıcı açabilmesi ve `admin` / `viewer` (salt okunur) yetkisi atayabilmesi.
* **Kapsam:**
  - `UserRepository` CRUD genişletmesi (şifre güncelleme, kullanıcı listeleme/silme).
  - API uç noktaları: `POST /api/auth/change-password`, `GET/POST/DELETE /api/users` ve `RequireAdmin` RBAC filtresi.
  - Son yönetici ve kendi hesabını silme engelleri, silinen kullanıcının oturumlarının anında geçersiz kılınması.
  - Mutating uç noktaların (konteyner başlat/durdur/yeniden başlat, servis ekle/düzenle/sil, ayarlar ve yedek indirme) admin rolüne kilitlenmesi.
  - Bağımsız modüler Profil Sayfası (`/profile`) üzerinden açılan çift sekmeli yapı ("Profil & Güvenlik" ve adminler için "Kullanıcılar & Roller").
  - Tam çift dilli (TR/EN) dil desteği.
* **Kabul Kriteri:** Şifre değişikliğinin doğrulanması, `viewer` rolündeki kullanıcının konteyner aksiyonlarında 403 Forbidden alması, unit testlerin geçmesi (157/157 test geçti).

---

## Faz 2: Ağ & Gelişmiş İzleme Motoru (Probes & Health)

### Bilet 2.1 — SSL/TLS Erken Uyarı ve Proaktif Bildirim Motoru [Tamamlandı]
* **Önkoşul:** Yok.
* **Amaç:** Sertifika bitimine 14 ve 7 gün kaldığında bildirim kanallarına (Telegram, Discord, Ntfy, Webhook) otomatik proaktif alarm iletmek.
* **Kapsam:**
  - `INotificationService` içine `DispatchSslExpiryAlertAsync` eklendi; Discord (Amber/Red embed), Telegram (HTML format), Ntfy (lock/warning priority) ve Generic Webhook kanallarına bağlandı.
  - `UptimeCheckerService` içinde sertifika gün kontrolü ve seviye bazlı (`7d` kritik, `14d` uyarı) günlük debounce (anti-spam) motoru. Sertifika yenilendiğinde alarm durumu otomatik sıfırlanır.
  - Bildirim ayarlarında `notify_ssl_expiry` filtresi (aç/kapa).
  - UI kartlarında (Servisler, Durum Sayfası) \(\le 14\) gün için amber uyarı ve \(\le 7\) gün için yanıp sönen `ShieldAlert` kırmızı kritik rozet.
  - TR/EN çift dilli sözlük desteği.
* **Kabul Kriteri:** Eşik aşıldığında bildirimlerin başarıyla tetiklenmesi, spam önlemesi, birim testlerin geçmesi (160/160 test geçti).

### Bilet 2.2 — ICMP Ping Denetleyicisi (Ping Monitörü) [Tamamlandı]
* **Önkoşul:** Yok.
* **Amaç:** Web sunucusu olmayan ağ cihazları, gateway ve router'ların paket gecikmesi (RTT) ve paket kaybını izlemek.
* **Kapsam:**
  - `System.Net.NetworkInformation.Ping` ile asenkron ICMP Echo Request denetimi ve RTT gecikme ölçümü.
  - Hedef host ayrıştırma (`ExtractHost`: `ping://`, port ve path filtreleme) ve container loopback çözümlemesi.
  - Servis modeline `CheckType = "ping"` desteği ve `/api/uptime/test-connection` üzerinde anlık ping testi.
  - UI servis ekleme, düzenleme ve uptime aktif etme modallarında "ICMP Ping" seçimi; ping seçildiğinde HTTP alanlarının otomatik gizlenmesi.
  - Servis ve uptime kartlarında `ICMP PING` / `PING` cyan rozetleri ve RTT formatlaması.
  - TR/EN çift dilli sözlük desteği ve xUnit birim testleri (`PingCheckerTests.cs`).
* **Kabul Kriteri:** IP adresine ping atılarak RTT yanıt süresinin kaydedilmesi, unit testlerin geçmesi (169/169 test geçti).

### Bilet 2.3 — HTTP Yanıt Gövdesi (Keyword / Regex) Doğrulaması [Tamamlandı]
* **Önkoşul:** Yok.
* **Amaç:** HTTP 200 dönse bile yanıt gövdesinde beklenen kelimenin (`"status":"healthy"`) veya Regex deseninin bulunup bulunmadığını sıfır gereksiz bellek tahsisatıyla kontrol etmek.
* **Kapsam:**
  - SQLite `011_expected_body.sql` migration'ı ile `services` ve `service_overrides` tablolarına `expected_body` kolonu.
  - `HttpBodyValidator` yardımcı modülü: `ArrayPool<byte>` bellek havuzu, 64 KB bellek tavanı, 200ms ReDoS zaman aşımı korumalı Regex desteği ve düz kelime araması.
  - `UptimeCheckerService` asenkron HTTP denetiminde ve `/api/uptime/test-connection` endpoint'inde gövde doğrulama desteği.
  - UI `AdvancedCheckOptions.tsx`, `AddServiceModal.tsx` ve `EditServiceModal.tsx` bileşenlerinde "Beklenen Yanıt İçeriği" alanı (sadece HTTP/HTTPS modunda aktif).
  - TR/EN çift dilli sözlük desteği ve xUnit birim testleri (`HttpBodyValidatorTests.cs`).
* **Kabul Kriteri:** Kelime veya Regex bulunamadığında servisin `down` durumuna geçmesi, 184/184 birim testin yeşil olması.

---

## Faz 3: Bildirim Kanalları & Alarm Disiplini

### Bilet 3.1 — E-Posta (SMTP) & Slack Bildirim Kanalları ✅ (Tamamlandı)
* **Önkoşul:** Yok.
* **Amaç:** Standart hazır SMTP sunucuları (Gmail, Outlook, Resend, Brevo, AWS SES vb.) ve Slack Incoming Webhook bildirimlerini modern etiket/hap (pills) arayüzü ve anlık test yeteneğiyle sisteme kazandırmak.
* **Kapsam:**
  - `NotificationService` içine SMTP (`System.Net.Mail`, TLS, özel gönderen, koyu tema HTML şablonu) ve Slack Webhook (`attachments`, durum renk kodları) entegrasyonu.
  - Native AOT uyumlu JSON serialization (`CorvusJsonSerializerContext`).
  - Frontend `EmailRecipientInput` (pills/tags, regex doğrulama, duplicate koruması, panodan çoklu yapıştırma desteği).
  - Modüler `SlackChannelPanel.tsx` ve `EmailChannelPanel.tsx` bileşenleri ile `NotificationSettingsTab.tsx` entegrasyonu.
  - xUnit birim testleri (190/190 yeşil test).
* **Kabul Kriteri:** SMTP ve Slack test butonlarıyla başarılı bildirim iletimi, hatasız derleme ve test doğrulaması.

### Bilet 3.2 — Flapping (Dalgalanma) Koruması & Alarm Debounce ✅ (Tamamlandı)
* **Önkoşul:** Yok.
* **Amaç:** Ağ dalgalanmasında veya crash-loop durumlarında kısa sürede peş peşe düşüp kalkan servislerin bildirim kanallarını spamlemesini önlemek.
* **Kapsam:**
  - Bağımsız `IFlappingDetector` ve `FlappingDetector` servisi: Kayan pencere (sliding window) zaman damgası hafızası, sıfır gereksiz bellek tahsisatı ve thread-safe durum takibi.
  - `UptimeCheckerService` entegrasyonu: Eşik aşıldığında tekil `[DALGALANMA TESPİT EDİLDİ]` alarmı iletildikten sonra ara bildirimlerin susturulması (suppress).
  - Kararlılık eşiği sağlandığında (N ardışık başarılı kontrol) tekil `[DALGALANMA SONA ERDİ]` kurtarma bildirimi.
  - `NotificationService.DispatchFlappingAlertAsync` ile 6 kanala (Discord, Telegram, Slack, SMTP, Ntfy, Webhook) amber/yeşil renk kodlu bildirim iletimi.
  - Ayarlar sayfasında modüler `FlappingProtectionCard.tsx` ve `NotificationEventFilters.tsx` yapılandırması (eşik, kayan pencere, kararlılık kontrolü).
  - xUnit birim testleri (`FlappingDetectorTests.cs` ve `NotificationServiceTests.cs`, 200/200 yeşil test).
* **Kabul Kriteri:** Yapay flapping testinde peş peşe 10 durum değişiminde yalnızca ilk ve son stabil durum bildiriminin gitmesi, 200/200 testin yeşil olması.

---

## Faz 4: Gelişmiş Docker & Konteyner Yönetimi

### Bilet 4.1 — Konteyner İçi Web Terminali (Exec Shell) [TAMAMLANDI]
* **Önkoşul:** Yok.
* **Amaç:** Tarayıcı üzerinden konteyner içine `sh`/`bash` terminali açabilmek, kilitlenmeyen çift yönlü klavye akışı ve otomatik kabuk tespiti sağlamak.
* **Kapsam:**
  - Docker Exec API entegrasyonu (POST `/containers/{id}/exec`, HTTP 1.1 Upgrade ile `/exec/{id}/start` ve `/exec/{id}/resize`).
  - ASP.NET Core Native AOT uyumlu `GET /api/containers/{id}/terminal` WebSocket proxy (`ArrayPool<byte>` ile sıfır bellek ayırma, 8 KB sabit tampon, oturum kapandığında otomatik RAM iadesi).
  - Windows dosya olmayan adlandırılmış borularında (named pipes) `FlushFileBuffers` kaynaklı oluşan deadlock giderildi; klavye girdileri akıcı hale getirildi.
  - Otomatik geri çekilme kabuk zinciri: `/bin/bash` -> `/bin/sh` -> `/bin/ash` -> `sh` ve `TERM=xterm-256color` ANSI renk desteği.
  - RBAC güvenliği: Terminal yalnızca `admin` rolüne açık (`[RequireAdmin]`, 403 Forbidden koruması).
  - Frontend `@xterm/xterm` ve `@xterm/addon-fit` ile `ContainerTerminalModal.tsx` modüler bileşeni (tam ekran desteği, ANSI 256 renkler, dinamik TTY boyutlandırma).
  - Konteyner aksiyon çubuğunda (`ContainerActionButtons.tsx`) çalışan (`running`) konteynerlerde aktif Web Terminali ikonu.
* **Kabul Kriteri:** Tarayıcıdan konteyner içerisinde `ls`, `ps`, `top` gibi komutların gecikmesiz çalıştırılabilmesi; klavye, yön tuşları ve kısayolların akıcı çalışması; xUnit testlerinin yeşil olması (203/203 birim test).

### Bilet 4.2 — Güvenli İki Aşamalı Kuru Çalıştırmalı Sistem Temizliği (System Prune) [TAMAMLANDI]
* **Önkoşul:** Yok.
* **Amaç:** Sunucuda disk alanı tüketen durdurulmuş konteyner, kullanılmayan imaj, yetim ağ ve hacimleri körü körüne silmeden önce analiz edip tablo tablo seçtirerek güvenle temizlemek.
* **Kapsam:**
  - İlk aşama kuru çalıştırma analizi: `GET /api/containers/system-df` ile tahmini kurtarılacak alan, durdurulmuş konteynerler, kullanılmayan imajlar, sahipsiz volumeler ve build cache dökümü.
  - Modüler seçim tabloları: `PruneContainersTable.tsx`, `PruneImagesTable.tsx`, `PruneVolumesTable.tsx`, `PruneBuildCacheCard.tsx`.
  - Kalıcı veri kaybı koruması: Volumeler varsayılan olarak kapalı tutulur ve sarı renkli veri kaybı uyarı banner'ı ile korunur.
  - Seçimli temizlik API'si: Native AOT uyumlu `POST /api/containers/prune/selective` uç noktası ve `[RequireAdmin]` rol koruması.
  - Modüler iki aşamalı `SystemPruneModal.tsx` bileşeni ve anlık kurtarılan alan raporlama.
* **Kabul Kriteri:** Prune çağrısıyla serbest bırakılan disk alanının arayüzde doğru formatta gösterilmesi (`1.42 GB serbest bırakıldı`); hacimlerin varsayılan korunması; xUnit testlerinin yeşil olması (206/206 birim test).

### Bilet 4.3 — Konteyner Detay İnceleme & Sıfır Kesintili Canlı Kaynak Yönetimi [TAMAMLANDI]
* **Önkoşul:** Yok.
* **Amaç:** Konteynerin derinlemesine yapılandırmasını incelemek ve konteyneri durdurmadan CPU, RAM ve yeniden başlatma ilkelerini canlı düzenlemek.
* **Kapsam:**
  - `DockerModels.cs` içinde genişletilmiş Docker inspect model desteği ve `GET /api/containers/{id}/inspect` uç noktası.
  - Sıfır kesintili kaynak güncelleme uç noktası `POST /api/containers/{id}/update` (canlı çalışan konteyner üzerinde `NanoCpus`, `Memory` ve `RestartPolicy` güncelleme ve in-memory micro-cache temizliği).
  - `pages/Containers/detail/` altında çok sekmeli modüler `ContainerDetailModal.tsx`:
    - `ContainerOverviewTab.tsx`: ID, imaj özeti, durum, tam komut satırı ve doğrudan işlem butonları.
    - `ContainerEnvTab.tsx`: Arama filtreli ortam değişkenleri, hassas anahtarlar için tek tıkla maskeleme ve toplu `.env` kopyalama.
    - `ContainerNetworkingTab.tsx`: Yayınlanan port bağlantıları (`http://`) ve bağlı Docker ağ detayları.
    - `ContainerStorageTab.tsx`: Volume ve bind bağlama noktaları, host/konteyner yolları ve RW/RO izinleri.
    - `ContainerResourcesTab.tsx`: Canlı telemetri (CPU/RAM/Ağ I/O), dinamik progress bar, host kapasite karşılaştırması, compose bilgilendirmesi ve hazır limit ön ayarları.
  - Tıklanabilir konteyner isimleri ve hızlı işlem çubuğunda ayar (`Sliders`) butonu entegrasyonu.
* **Kabul Kriteri:** Konteyner detaylarının eksiksiz görüntülenmesi, canlı kaynak limitlerinin konteyneri durdurmadan uygulanması; tüm testlerin başarılı olması.

---

## Faz 5: Telemetri, Seyreltme & Organizasyon

### Bilet 5.1 — Zaman Serisi Seyreltme (Downsampling / Rollup) [TAMAMLANDI]
* **Önkoşul:** Yok.
* **Amaç:** 7 günden eski 15 saniyelik ham metrikleri saatlik ortalamalara dönüştürerek veritabanını şişirmeden 1 yıllık akıcı geçmiş sunmak.
* **Kapsam:**
  - Veritabanı şema güncellemesi (`012_metrics_hourly_rollup.sql`) ile indeksli `system_metrics_hourly` tablosu.
  - `RetentionCleanupService` ve `MetricsRepository` içinde saatlik agregasyon (`AggregateHourlyMetricsAsync`).
  - İkili saklama stratejisi: 15 saniyelik ham veriler 7 gün saklanıp silinirken, saatlik özetler 365 gün boyunca tutulur.
  - Uzun vadeli grafikler (`30d`, `90d`, `1y`) için SQLite CTE ile saatlik tablodan okuyan ve henüz özetlenmemiş en güncel saatleri kesintisiz birleştiren sorgu motoru.
  - Kullanıcı arayüzünde (`SystemMetrics/index.tsx`) 30 Gün, 90 Gün ve 1 Yıl filtreleme butonları ile dinamik tarih etiketleri.
  - Kapsamlı xUnit test paketi (`MetricsRepositoryTests.cs`, 211/211 yeşil test).
* **Kabul Kriteri:** 30 günlük, 90 günlük ve 1 yıllık grafiklerin veritabanı şişmeden milisaniyeler içinde akıcı çizilmesi; tüm birim testlerin geçmesi (211/211 yeşil test).

### Bilet 5.2 — Servis & Konteyner Etiketleme / Gruplama (Tags) [TAMAMLANDI]
* **Önkoşul:** Yok.
* **Amaç:** Prod, Staging, DB gibi etiketlerle servisleri ve konteynerleri arayüzde filtreleyebilmek.
* **Kapsam:**
  - `services` ve `service_overrides` tablolarına `tags` kolonu (`013_service_tags.sql`).
  - Native AOT uyumlu `List<string> Tags` modeli ve ikili JSON/CSV ayrıştırma motoru (`ParseTags`).
  - Docker container etiketlerinden (`corvus.tags`, `environment`, `env`, `com.docker.compose.project`) otomatik etiket çıkarımı.
  - Konteyner bazında özel etiketleme: `PUT /api/containers/{id}/tags`, `GET /api/containers/tags`, SQLite `service_overrides` ile kalıcı saklama.
  - Etiket değişimlerinde anlık Server-Sent Events yayını (`containers_updated`).
  - Modüler `TagBadge`, `TagInput` ve `TagFilterBar` bileşenleri (hem Servisler hem Konteynerler sayfalarında ortak kullanım).
  - Konteyner etiketleme modalı `ContainerTagsModal.tsx`.
  - Birim test paketi (`ContainerTagsTests.cs`, 223/223 yeşil test).
* **Kabul Kriteri:** Servis ve konteynerlerin dinamik olarak etiketlenebilmesi ve süzülebilmesi; etiket durumunun yeniden başlatmalarda korunması; tüm birim testlerin geçmesi (223/223).

---

## Faz 6: Gelecek Mimari Planlar

### Bilet 6.1 — Bağımsız Konteyner Detay & Telemetri Sayfası (`/containers/:id`) [TAMAMLANDI]
* **Önkoşul:** Bilet 4.3 tamamlandı.
* **Amaç:** Konteyner inceleme, canlı telemetri, loglar, web terminali ve kaynak yönetimi deneyimini açılır modal yerine tam ekran, zengin ve bağımsız bir detay sayfasına (`/containers/:id`) dönüştürmek.
* **Kapsam:**
  - `/containers/:id` rotası ile bağımsız tam sayfa görünümü (`pages/ContainerDetail/`).
  - Genel bakış başlığı, gerçek zamanlı telemetri kartları (anlık CPU %, RAM kullanımı/limiti, Ağ Rx/Tx), çevre değişkenleri tarayıcısı, ağ eşleşmeleri, depolama mountları, yerleşik canlı log akışı (`LogsTab.tsx`) ve yerleşik xterm web terminali (`TerminalTab.tsx`).
  - Çalışma zamanı cgroup kaynak sınırları (vCPU kotası, RAM limiti) ve yeniden başlatma ilkesi (restart policy) canlı güncelleme.
  - Konteyner kartlarından, satırlarından ve aksiyon menüsünden doğrudan URL ile `/containers/:id` sayfasına yönlendirme.
* **Kabul Kriteri:** Modal sınırları olmadan konteynerin tüm metriklerinin, loglarının ve terminalinin bağımsız sayfada derinlemesine izlenip yönetilebilmesi; teftiş için popup modal zorunluluğunun kalkması; tüm testlerin geçmesi.

### Bilet 6.2 — Konteyner Tarihsel Telemetri Grafikleri (CPU & RAM Zaman Serisi) [TAMAMLANDI]
* **Önkoşul:** Bilet 6.1 tamamlandı.
* **Amaç:** Çalışan konteynerler için geçmiş CPU yükünü ve bellek kullanım eğilimlerini grafiklerle görselleştirmek.
* **Kapsam:**
  - `ContainerHistoricalCharts.tsx` modüler Recharts Area grafiği bileşeni ve renk kodlu degrade dolgular.
  - Ekranda son 30 telemetri noktasını (~2.5 dakika) kayan pencereyle tutan bellek içi akış tamponu.
  - Bellek sınırı bağlamı ve formatlanmış bayt araç ipuçları (tooltips).
* **Kabul Kriteri:** CPU % ve RAM eğilimini akıcı gösteren gerçek zamanlı grafikler; masaüstü ve mobil uyumu.

### Bilet 6.3 — Docker Compose Stack Toplu Eylemleri [TAMAMLANDI]
* **Önkoşul:** Yok.
* **Amaç:** Bir Docker Compose projesine ait tüm konteynerleri tek tıkla topluca yönetebilmek.
* **Kapsam:**
  - `GroupSection.tsx` bileşenine özelleştirilebilir `headerActions` yuvası.
  - `ComposeStackGroup.tsx` proje başlığına Stack'i Yeniden Başlat (`RotateCw`), Başlat (`Play`) ve Durdur (`Square`) butonları.
  - Canlı demo etkileşimli havuzuna tam entegrasyon.
* **Kabul Kriteri:** Tek tıkla stack'teki tüm konteynerlerin yeniden başlatılabilmesi veya durdurulabilmesi; admin yetki koruması.

### Bilet 6.4 — Konteyner Beklenmedik Durma & Crash-Loop Alarmları [TAMAMLANDI]
* **Önkoşul:** Yok.
* **Amaç:** Docker konteynerleri beklenmedik şekilde sıfır olmayan bir çıkış koduyla durduğunda (ExitCode != 0, OOMKilled, çökme) anında bildirim göndermek.
* **Kapsam:**
  - `INotificationService` ve `NotificationService.cs` içine Discord, Telegram, Slack, SMTP, Ntfy ve Webhook destekli `DispatchContainerCrashAlertAsync` metodu.
  - `ContainerDiscoveryService.cs` arka plan servisinde çalışan -> durdu geçişlerini ve sıfır olmayan çıkış kodlarını izleyen durum makinesi.
  - `NotificationServiceTests.cs` xUnit birim test kapsamı (225/225 yeşil test).
* **Kabul Kriteri:** Anormal kapanmalarda anında bildirim iletilmesi; normal manuel durdurmalarda (ExitCode == 0) gereksiz alarm üretilmemesi.

---

## Faz 7: Otonom Konteyner Yaşam Döngüsü & GitOps Otomasyonu

### Bilet 7.1 — Konteyner İmaj Güncelleme Takipçisi & OCI Registry Digest İzleyici [TAMAMLANDI]
* **Önkoşul:** Faz 6 tamamlandı.
* **Amaç:** Katman indirmeden (sıfır bant genişliği tüketimi) OCI registry (Docker Hub, GHCR, Quay) digest'larını HEAD istekleriyle kontrol edip güncelleme rozetleri ve tek tıkla yeniden oluşturma (recreate) sunmak.
* **Kapsam:**
  - Native AOT uyumlu `IOciRegistryClient` / `OciRegistryClient.cs` servisi; `/v2/{repo}/manifests/{tag}` adreslerine sıfır gövdeli HEAD istekleri.
  - Docker Hub ve GitHub Container Registry için anonim Bearer token alma mekanizması.
  - Yerel imaj vs. Uzak registry digest karşılaştırma motoru (`ContainerImageUpdateInfo`).
  - Uç noktalar: `GET /api/containers/{id}/check-update`, `GET /api/containers/updates` ve `POST /api/containers/{id}/recreate` (`RequireAdmin`).
  - Frontend modüler `ImageUpdateModal.tsx`, konteyner satırlarında güncelleme rozetleri ve detay sayfasında hızlı eylem butonu.
* **Kabul Kriteri:** Katman indirmeden hızlı digest kontrolü; birim testlerin geçmesi (244/244 yeşil test).

### Bilet 7.2 — Compose Stack Yapılandırma Görüntüleyici & Güvenli YAML Editörü [TAMAMLANDI]
* **Önkoşul:** Yok.
* **Amaç:** Web arayüzünden `compose.yaml` dosyalarını görüntülemek, güvenle düzenlemek, otomatik `.bak` yedeği almak ve tek tıkla stack'i yeniden başlatmak.
* **Kapsam:**
  - `IComposeFileService` / `ComposeFileService.cs` ile dizin aşımı (path traversal) koruması ve otomatik `.bak` yedeği alma motoru.
  - Uç noktalar: `GET /api/compose/{projectName}/file` ve `PUT /api/compose/{projectName}/file` (`RequireAdmin`).
  - Modüler `ComposeConfigModal.tsx` bileşeni ile syntax dostu editör ve stack yeniden başlatma tetikleyicisi.
  - `ComposeStackGroup.tsx` başlık eylemlerine dosya düzenleme butonu entegrasyonu.
* **Kabul Kriteri:** Compose dosyasının güvenle düzenlenip `.bak` yedeğinin alınması; birim testlerin geçmesi.

### Bilet 7.3 — Olay Güdümlü Kendi Kendini Onarma (Auto-Healing) & Gelen Dağıtım Webhook'ları [TAMAMLANDI]
* **Önkoşul:** Bilet 7.1 ve 7.2 tamamlandı.
* **Amaç:** Çöken konteynerleri döngü korumasıyla (loop-prevention) otomatik yeniden başlatmak ve CI/CD dağıtımları için webhook uç noktası sağlamak.
* **Kapsam:**
  - `AutoHealingService.cs` ile thread-safe kayan pencere (15 dakikada en fazla 2 kurtarma) döngü koruması.
  - `ContainerDiscoveryService.cs` üzerinde sıfır olmayan çıkış kodlarında otomatik kurtarma tetiklemesi.
  - `INotificationService.DispatchContainerAutoHealedAlertAsync` ile bildirim kanallarına kurtarma alarmları.
  - Sabit zamanlı (constant-time token) güvenli gelen dağıtım webhook uç noktası (`POST /api/hooks/deploy/{token}`).
  - Ayarlar arayüzünde (`GeneralSettingsTab.tsx`) gizli token oluşturma ve yapılandırma alanı.
* **Kabul Kriteri:** Çöken konteynerlerin otomatik kurtarılması ve 3. çöküşte döngü engeli konulması; dağıtım webhook doğrulaması; 244 birim testin yeşil olması.

### Bilet 7.4 — İnceleme Normalizasyonu, Hızlı Eylemler & Otomatik Sürümleme [TAMAMLANDI]
* **Önkoşul:** Bilet 7.3 tamamlandı.
* **Amaç:** Konteyner detaylarındaki eksik alanları gidermek, gezinmeyi akıcı hale getirmek ve git tag / GitHub release sürecini tam otomatik CI/CD akışına bağlamak.
* **Kapsam:**
  - `inspectHelpers.ts` ile Docker PascalCase vs camelCase toleranslı normalleştirici; Çevre değişkenleri (`Env`), Portlar, Ağlar ve Mounts verilerinin `/containers/:id` ekranında eksiksiz gösterimi.
  - `ContainerRow.tsx` ve `ContainerQuickActions.tsx` ile tüm satırın tıklanabilir olması, satır içi 1-tıkla Log, İnceleme, Telemetri ve Terminal sekmelerine geçiş ve dışa açılan port köprü bağlantıları.
  - `.github/workflows/ci.yml` üzerinden `main` dalına push yapıldığında `CHANGELOG.md` sürümünü algılayıp otomatik git tag (`vX.Y.Z`) oluşturma, notları ayıklayıp GitHub Release yayınlama ve çift tag'li Docker imajı derleme.
* **Kabul Kriteri:** `/containers/:id` detay sayfasında tüm ortam değişkenleri ve mountların eksiksiz görünmesi; satır tıklamalarının sorunsuz çalışması; CI üzerinde otomatik etiket ve sürüm oluşturulması; tüm birim testlerin geçmesi (244/244).

---

## Faz 8: Modern UI/UX, Komut Paleti & Mikro-Animasyonlar [TAMAMLANDI - v1.5.29]

### Bilet 8.1 — Hızlı Komut Paleti (`Ctrl+K` / `Cmd+K`)
* **Önkoşul:** Yok.
* **Amaç:** Fareden bağımsız olarak tek bir klavye kısayoluyla konteynerler, servisler, ayarlar ve operasyonel aksiyonlar arasında anında arama ve geçiş sağlamak.
* **Kapsam:**
  - `fuzzySearch.ts` ile sıfır bağımlılıklı hafif harf dizisi eşleştirme ve öncelik puanlama.
  - `CommandPaletteModal.tsx`, `useCommandPalette.ts` ve `CommandPaletteResults.tsx` ile ok tuşları (`↑`/`↓`/`Enter`) ve arama filtreleme.
  - `Sidebar.tsx` kenar çubuğuna tek tıkla arama çubuğu ve `Ctrl K` kısayol göstergesi.
* **Kabul Kriteri:** `Ctrl+K` basıldığında paletin açılması, konteyner veya sayfaya tıklandığında anında yönlendirilmesi; 246 birim testin yeşil olması.

### Bilet 8.2 — Sayfa Geçişleri, Durum Nabzı & İskelet Yükleme Ekranları
* **Önkoşul:** Bilet 8.1.
* **Amaç:** Sayfa değişimlerinde sıçramaları önlemek, CPU/RAM sayaçlarını yumuşatmak ve veri yüklenirken shimmer iskeletleri göstermek.
* **Kapsam:**
  - `PageTransition.tsx` ile `prefers-reduced-motion` destekli 150ms sayfa geçişleri.
  - `useAnimatedNumber.ts` ile kademeli sayı interpolasyonu.
  - `Skeleton.tsx` modüler iskelet yükleme bileşeni.
* **Kabul Kriteri:** Akıcı geçişler, sıfır CLS (layout shift) ve erişilebilirlik uyumu.

---

## Faz 9: Proaktif Metrik Eşik Alarm Motoru [TAMAMLANDI - v1.5.29]

### Bilet 9.1 — Eşik Kuralı Tanımlama ve SQLite Depolama Katmanı
* **Önkoşul:** Faz 8 tamamlandı.
* **Amaç:** Sistem metrikleri (CPU, RAM, Disk) için eşik kuralları tanımlamak ve Dapper Native AOT ile saklamak.
* **Kapsam:**
  - SQLite `014_alert_rules.sql` migration tablosu (`id`, `name`, `metric`, `operator`, `threshold_value`, `duration_seconds`, `cooldown_minutes`, `is_enabled`, `is_firing`).
  - `IAlertRuleRepository` ve `AlertRuleRepository.cs` veri erişim katmanı.
  - `AlertRulesEndpoints.cs` ile `/api/alerts/rules` tam CRUD uç noktaları (`RequireAdmin`).
  - `CorvusJsonSerializerContext.cs` AOT serializasyon kayıtları.
* **Kabul Kriteri:** REST uç noktaları ve xUnit testleri (246/246 yeşil test).

### Bilet 9.2 — Arka Plan Değerlendirme Motoru & Çok Kanallı Uyarılar
* **Önkoşul:** Bilet 9.1.
* **Amaç:** Telemetri verilerini kayan pencereyle izleyip ihlal süresi ve cooldown'a göre spam korumalı bildirim göndermek.
* **Kapsam:**
  - `ThresholdEvaluatorService.cs` 20 saniyede bir periyodik kural değerlendiricisi.
  - `NotificationService.DispatchMetricThresholdAlertAsync` ile Discord, Telegram, Slack, SMTP, Ntfy ve Webhook kanallarına anında uyarı ve `[DÜZELDİ]` toparlanma bildirimleri.
  - Ayarlar sayfasında `AlertRulesTab.tsx` ve `AddAlertRuleModal.tsx` görsel kural oluşturma ve takip arayüzü.
* **Kabul Kriteri:** Eşik aşıldığında bildirimlerin iletilmesi ve durum normale döndüğünde toparlanma alarmı gitmesi.

---

## Faz 10: Denetim & Olay Zaman Çizelgesi (Audit Timeline) [TAMAMLANDI - v1.5.29]

### Bilet 10.1 — Kalıcı Olay ve Denetim Kayıtları (Audit Logging Engine)
* **Önkoşul:** Faz 9 tamamlandı.
* **Amaç:** Sistemde gerçekleşen tüm kritik eylemleri (konteyner durdurma/başlatma, ayar değiştirme, oturum açma, otomatik kurtarma) kimin ve ne zaman yaptığını kaydetmek.
* **Kapsam:**
  - SQLite `015_activity_logs.sql` tablosu (`category`, `actor_username`, `created_at` indeksli).
  - Kritik istek yolunu engellemeyen (non-blocking) asenkron `System.Threading.Channels` arka plan kuyruğu (`ActivityLogService.cs`).
  - Native AOT uyumlu `ActivityLogEntry.cs` modeli ve sayfalamalı, filtrelemeli, arama destekli `ActivityLogRepository.cs`.
  - Konteyner yaşam döngüsü (`ContainersEndpoints.cs`) ve metrik alarm değerlendirmesi (`ThresholdEvaluatorService.cs`) üzerinden otomatik olay günlüğü kaydı.
* **Kabul Kriteri:** Hızlı, kesintisiz olay günlüğü kaydı; 248 yeşil birim test.

### Bilet 10.2 — Etkileşimli Zaman Çizelgesi Arayüzü (Activity Timeline Page)
* **Önkoşul:** Bilet 10.1.
* **Amaç:** Olayları tarih, aktör ve kategoriye göre süzebilen şık bir zaman çizgisi sunmak.
* **Kapsam:**
  - `/activity` bağımsız rota sayfası (`ActivityTimeline/index.tsx`).
  - Modüler bileşenler: `ActivityTimelineItem.tsx` ve `ActivityTimelineFilter.tsx`.
  - Kenar Çubuğu (Sidebar), Alt Menü (BottomNav) ve Komut Paleti (`G A` kısayolu) entegrasyonu.
* **Kabul Kriteri:** Sayfalamalı, filtrelemeli ve akıcı olay geçmişi keşfi.

---

## Faz 11: Docker Hacim & İmaj Hijyen Denetimi [TAMAMLANDI - v1.5.29]

### Bilet 11.1 — Güvenli İki Aşamalı Önizlemeli Sistem Hijyeni ve Komut Paleti Entegrasyonu
* **Önkoşul:** Faz 10 tamamlandı.
* **Amaç:** Askıda kalan imajlar, durdurulmuş konteynerler ve yetim birimler için doğrudan hijyen denetimi, kısayollar ve sıfır riskli temizlik sağlamak.
* **Kapsam:**
  - `GET /api/containers/system-df` ile disk analizi ve `POST /api/containers/prune/selective` ile seçici temizlik.
  - Modüler temizlik bileşenleri (`PruneContainersTable.tsx`, `PruneImagesTable.tsx`, `PruneVolumesTable.tsx`, `PruneBuildCacheCard.tsx`).
  - Komut Paleti üzerinden tek tıkla doğrudan Sistem Temizliği açma (`action-prune`) ve `App.tsx` sorgu desteği (`/containers?action=prune`).
* **Kabul Kriteri:** Arayüzden ve klavyeden 1 tıkla güvenli disk temizliği analizi; korumalı varsayılanlar; tüm testlerin geçmesi.

