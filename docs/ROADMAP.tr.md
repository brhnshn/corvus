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
  - Sidebar kullanıcı profili alanı üzerinden açılan çift sekmeli `UserProfileModal` ("Profil & Güvenlik" ve adminler için "Kullanıcılar & Roller").
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

### Bilet 2.2 — ICMP Ping Denetleyicisi (Ping Monitörü)
* **Önkoşul:** Yok.
* **Amaç:** Web sunucusu olmayan ağ cihazları, gateway ve router'ların paket gecikmesi (RTT) ve paket kaybını izlemek.
* **Kapsam:**
  - .NET `System.Net.NetworkInformation.Ping` veya Linux raw socket ICMP denetimi.
  - Servis modeline `CheckType = "ping"` seçeneği.
  - UI modalında servis tipi olarak "ICMP Ping" seçimi.
* **Kabul Kriteri:** IP adresine ping atılarak RTT yanıt süresinin kaydedilmesi.

### Bilet 2.3 — HTTP Yanıt Gövdesi (Keyword / Regex) Doğrulaması
* **Önkoşul:** Yok.
* **Amaç:** HTTP 200 dönse bile yanıt gövdesinde beklenen kelimenin (`"status":"healthy"`) bulunup bulunmadığını kontrol etmek.
* **Kapsam:**
  - `Service` modeline `expected_body` kolonu.
  - `UptimeCheckerService` HTTP kontrolünde yanıt gövdesinin Stream üzerinden kontrol edilmesi.
  - UI servis ekleme/düzenleme formuna "Beklenen Yanıt İçeriği (Opsiyonel)" alanı.
* **Kabul Kriteri:** Kelime bulunamadığında servisin `degraded` veya `down` durumuna geçmesi.

---

## Faz 3: Bildirim Kanalları & Alarm Disiplini

### Bilet 3.1 — E-Posta (SMTP) & Slack Bildirim Kanalları
* **Önkoşul:** Yok.
* **Amaç:** En yaygın iki kurumsal bildirim kanalını Corvus'a kazandırmak.
* **Kapsam:**
  - `NotificationService` içine SMTP (host, port, user, pass, tls) ve Slack Webhook implementasyonu.
  - Ayarlar sayfasında SMTP ve Slack yapılandırma ve test butonları.
* **Kabul Kriteri:** Test butonuna basıldığında başarılı e-posta ve Slack bildirimi iletilmesi.

### Bilet 3.2 — Flapping (Dalgalanma) Koruması & Alarm Debounce
* **Önkoşul:** Yok.
* **Amaç:** Ağ dalgalanmasında 1 dakika içinde 10 kez düşüp kalkan servislerin kanalları spamlemesini önlemek.
* **Kapsam:**
  - Servis bazlı kayan pencere (sliding window) durum hafızası.
  - Belirli süre içinde X adetten fazla durum değişiminde bildirimleri geçici olarak bastırma (suppress).
* **Kabul Kriteri:** Yapay flapping testinde peş peşe 10 durum değişiminde yalnızca ilk ve son stabil durum bildiriminin gitmesi.

---

## Faz 4: Gelişmiş Docker & Konteyner Yönetimi

### Bilet 4.1 — Konteyner İçi Web Terminali (Exec Shell)
* **Önkoşul:** Yok.
* **Amaç:** Tarayıcı üzerinden konteyner içine `sh`/`bash` terminali açabilmek.
* **Kapsam:**
  - Docker Exec API entegrasyonu (WebSocket üzerinden çift yönlü stdin/stdout akışı).
  - Frontend `xterm.js` terminal bileşeni entegrasyonu.
  - Konteyner detay sayfasında "Terminal Aç" butonu.
* **Kabul Kriteri:** Tarayıcıdan konteyner içerisinde `ls`, `ps` komutlarının çalıştırılabilmesi.

### Bilet 4.2 — İmaj ve Hacim Temizliği (System Prune)
* **Önkoşul:** Yok.
* **Amaç:** Sunucuda disk alanı tüketen dangling imaj ve kullanılmayan hacimleri arayüzden tek tıkla temizlemek.
* **Kapsam:**
  - Docker `/images/prune` ve `/volumes/prune` API uç noktası.
  - Konteynerler sayfasında "Sistem Temizliği" butonu ve onay diyaloğu.
* **Kabul Kriteri:** Prune çağrısıyla serbest bırakılan disk alanının arayüzde gösterilmesi.

---

## Faz 5: Telemetri, Seyreltme & Organizasyon

### Bilet 5.1 — Zaman Serisi Seyreltme (Downsampling / Rollup)
* **Önkoşul:** Yok.
* **Amaç:** 7 günden eski 15 saniyelik metrikleri saatlik ortalamalara dönüştürerek veritabanını şişirmeden 1 yıllık geçmiş sunmak.
* **Kapsam:**
  - `RetentionCleanupService` öncesinde saatlik ortalama tablosuna aktarım (`system_metrics_hourly`).
  - Grafik uç noktasında 7 günden eski tarihler için hourly tablosundan okuma.
* **Kabul Kriteri:** 30 günlük grafiğin veritabanı boyutu artmadan pürüzsüz çizilmesi.

### Bilet 5.2 — Servis & Konteyner Etiketleme / Gruplama (Tags)
* **Önkoşul:** Yok.
* **Amaç:** Prod, Staging, DB gibi etiketlerle servisleri ve konteynerleri arayüzde filtreleyebilmek.
* **Kapsam:**
  - `services` tablosuna `tags` kolonu (virgülle ayrılmış veya JSON array).
  - Frontend üzerinde etiket hapları (tag pills) ve kategori filtreleme çubuğu.
