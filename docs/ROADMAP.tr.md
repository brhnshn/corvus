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
* **Amaç:** Tarayıcı üzerinden konteyner içine `sh`/`bash` terminali açabilmek.
* **Kapsam:**
  - Docker Exec API entegrasyonu (POST `/containers/{id}/exec`, HTTP 1.1 Upgrade ile `/exec/{id}/start` ve `/exec/{id}/resize`).
  - ASP.NET Core Native AOT uyumlu `GET /api/containers/{id}/terminal` WebSocket proxy (`ArrayPool<byte>` ile sıfır bellek ayırma, 8 KB sabit tampon, oturum kapandığında otomatik RAM iadesi).
  - RBAC güvenliği: Terminal yalnızca `admin` rolüne açık (`[RequireAdmin]`, 403 Forbidden koruması).
  - Frontend `@xterm/xterm` ve `@xterm/addon-fit` ile `ContainerTerminalModal.tsx` modüler bileşeni (tam ekran desteği, ANSI renkler, shell seçimi `/bin/sh`, `/bin/bash`, `/bin/ash`, `/bin/zsh`, dinamik TTY boyutlandırma).
  - Konteyner aksiyon çubuğunda (`ContainerActionButtons.tsx`) log butonu yanında sadece çalışan (`running`) konteynerlerde aktif Web Terminali ikonu.
* **Kabul Kriteri:** Tarayıcıdan konteyner içerisinde `ls`, `ps`, `top` gibi komutların gecikmesiz çalıştırılabilmesi; xUnit testlerinin yeşil olması (203/203 birim test).

### Bilet 4.2 — İmaj ve Hacim Temizliği (System Prune) [TAMAMLANDI]
* **Önkoşul:** Yok.
* **Amaç:** Sunucuda disk alanı tüketen dangling imaj, durdurulmuş konteyner, yetim ağ ve kullanılmayan hacimleri arayüzden tek tıkla temizlemek.
* **Kapsam:**
  - Docker Engine Prune API entegrasyonu (`/containers/prune`, `/images/prune`, `/volumes/prune`, `/networks/prune`, `/build/prune`).
  - Native AOT uyumlu `POST /api/containers/prune` uç noktası ve `[RequireAdmin]` rol koruması.
  - Modüler `SystemPruneModal.tsx` bileşeni (güvenli varsayılanlar: hacimler varsayılan kapalı ve sarı veri kaybı uyarı şeritli; dangling vs tüm imaj seçimi; silinen kaynakların kategori döküm kartları).
  - Konteynerler sayfası başlığında "Sistem Temizliği" butonu (`Trash2` ikonu, sadece admin durumunda aktif).
* **Kabul Kriteri:** Prune çağrısıyla serbest bırakılan disk alanının arayüzde doğru formatta gösterilmesi (`1.42 GB serbest bırakıldı`), xUnit testlerinin yeşil olması (206/206 birim test).

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

### Bilet 5.2 — Servis & Konteyner Etiketleme / Gruplama (Tags)
* **Önkoşul:** Yok.
* **Amaç:** Prod, Staging, DB gibi etiketlerle servisleri ve konteynerleri arayüzde filtreleyebilmek.
* **Kapsam:**
  - `services` tablosuna `tags` kolonu (virgülle ayrılmış veya JSON array).
  - Frontend üzerinde etiket hapları (tag pills) ve kategori filtreleme çubuğu.
