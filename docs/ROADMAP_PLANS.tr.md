# Corvus Geliştirme Yol Haritası ve Uygulama Planı (Faz 8 & 9)

Bu belge; Corvus'un yüksek performanslı, Native AOT uyumlu, düşük bellek tüketen (<50 MB RAM) mimarisini koruyarak modern bir operasyon merkezine dönüştürülmesi için hazırlanan dikey dilimli (tracer bullet) geliştirme yol haritasıdır.

Tüm geliştirmeler **Temiz Mimari**, **Modüler Ayrım**, **Spec-First** ve **Keep a Changelog** kurallarına uygun olarak planlanmıştır.

---

## 🎯 Planlanan Fazlar Özeti

| Faz | Odak Alanı | Kapsam | Öncelik / Etki |
|---|---|---|---|
| **Faz 8** | **UI/UX & Hızlı Etkileşim Cilası** | Komut Paleti (`Ctrl+K`), Akıcı Sayfa Geçişleri, Skeleton & Mikro Animasyonlar | ⭐⭐⭐ (Anında Hissedilen Hız) |
| **Faz 9** | **Proaktif Alarm & Metrik Motoru** | Eşik Tabanlı CPU/RAM/Disk Alarmları, Kayan Pencere Değerlendirme, Çok Kanallı Uyarılar | ⭐⭐⭐ (Kritik Operasyonel Değer) |
| **Faz 10** | **Denetim & Olay Zaman Çizelgesi** | Audit Log, Olay Akışı (Activity Timeline), Kullanıcı & Sistem Eylem Kayıtları | ⭐⭐ (Güvenlik & İzlenebilirlik) |
| **Faz 11** | **Docker Depolama & İmaj Yönetimi** | Volume ve Dangling Image Temizliği, Boyut Analizi, Tek Tıkla Prune & Pull | ⭐⭐ (Sistem Bakımı) |

---

## 📋 FAZ 8: Modern UI/UX, Komut Paleti & Mikro-Animasyonlar

### Bilet 8.1 — Hızlı Komut Paleti (`Ctrl+K` / `Cmd+K`)
* **Önkoşul:** Yok.
* **Amaç:** Fareden bağımsız olarak tek bir klavye kısayoluyla konteynerler, servisler, ayarlar ve operasyonel aksiyonlar arasında anında arama ve geçiş sağlamak.
* **Ne Yapılacak?**
  1. **Global Kısayol Dinleyicisi (`useCommandPalette.ts`):** `Ctrl+K`, `Cmd+K` ve isteğe bağlı `/` tuşuna basıldığında modalı açıp kapatan React kancası.
  2. **Modüler Bileşen (`src/Corvus.Web/src/components/common/CommandPalette/`):**
     - `CommandPaletteModal.tsx`: Backdrop blur, ESC ile kapanma, odak kilidi (focus trap).
     - `CommandPaletteInput.tsx`: Anlık arama girdisi, arama temizleme.
     - `CommandPaletteResults.tsx`: Klavye ok tuşlarıyla (`ArrowUp` / `ArrowDown` / `Enter`) seçim.
     - `commandItems.ts`: Sayfa yönlendirmeleri (`Dashboard`, `Containers`, `Services`, `Settings`), konteyner aksiyonları (`Start`, `Stop`, `Restart`, `Logs`, `Terminal`) ve filtreler.
  3. **Arama Algoritması (`fuzzySearch.ts`):** Sıfır harici kütüphane bağımlılığıyla hızlı harf eşleştirme ve öncelik puanlama.
* **Nasıl Doğrulanacak?**
  - `Ctrl+K` basıldığında klavye odağının input'a geçmesi.
  - Bir konteyner adı yazıldığında doğrudan `/containers/:id?tab=logs` veya `/containers/:id?tab=terminal` yönlendirmesinin çalışması.

### Bilet 8.2 — Sayfa Geçişleri & Durum Değişim Mikro-Animasyonları
* **Önkoşul:** Bilet 8.1
* **Amaç:** Sayfa değişimlerinde ve liste güncellemelerinde ani sıçramaları önleyerek akıcı, modern ve hafif (GPU destekli CSS) görsel deneyim sunmak.
* **Ne Yapılacak?**
  1. **Sayfa Geçiş Katmanı (`PageTransition.tsx`):** React Router sayfa değişimlerinde `150-200ms` `opacity` ve hafif `translateY(4px)` yumuşak giriş efekti.
  2. **Canlı Durum Nabzı (Status Pulse):**
     - Sağlıklı çalışan konteyner/servislerde yumuşak nefes alma (subtle breathing pulse: `emerald-500/20`).
     - Çöken veya dalgalanan servislerde dikkat çekici ama göz yormayan amber/kırmızı alarm nabzı.
  3. **Canlı Sayaç Akışı (Animated Number Counter):** CPU, Bellek ve Uptime yüzdeleri güncellendiğinde rakamların tıkırtısız, yumuşak geçişle artıp azalması (`useAnimatedNumber.ts`).
  4. **Erişilebilirlik Koruması (`prefers-reduced-motion`):** Sistem düzeyinde animasyon kapatılmışsa tüm geçişlerin anında sonlanması.
* **Nasıl Doğrulanacak?**
  - Tarayıcı DevTools ile CPU kısıtlaması (CPU Throttling 4x) altında test; 60 FPS korunması ve layout shift (CLS) olmaması.

### Bilet 8.3 — İskelet Yükleme Ekranları (Skeleton States)
* **Önkoşul:** Bilet 8.2
* **Amaç:** Spinner yerine içerik iskeleti (skeleton placeholders) göstererek yükleme sürelerindeki algısal bekleme süresini azaltmak.
* **Ne Yapılacak?**
  1. `ContainerTableSkeleton.tsx`: Konteyner listesi yüklenirken satır iskeletleri.
  2. `MetricCardsSkeleton.tsx`: Dashboard telemetri kartları için parıldayan (shimmer) iskeletler.
  3. `ServiceGridSkeleton.tsx`: Servis kartları yüklenme alanı.
* **Nasıl Doğrulanacak?**
  - Sayfa ilk açılışında içerik gelene kadar boş ekran veya dönen çember yerine düzenli gri iskeletlerin görünmesi.

---

## 🚨 FAZ 9: Metrik Eşik Tabanlı Alarm Motoru (Threshold Alerting)

### Bilet 9.1 — Eşik Kuralı Tanımlama ve SQLite Depolama Katmanı
* **Önkoşul:** Faz 8 tamamlandı.
* **Amaç:** Kullanıcıların sistem veya konteyner bazında eşik kuralları ("CPU > %85 3 dakika sürerse", "RAM > %90 olursa") tanımlayabilmesi.
* **Ne Yapılacak?**
  1. **SQLite Migration (`013_alert_rules.sql`):**
     - Tablo: `alert_rules` (`id`, `name`, `target_type` [system/container], `target_id`, `metric` [cpu/memory/disk], `operator` [gt/lt], `threshold_value`, `duration_seconds`, `cooldown_minutes`, `is_enabled`, `created_at`).
     - Tablo: `alert_rule_states` (`rule_id`, `is_firing`, `last_triggered_at`, `violation_start_at`).
  2. **Model ve Repository:** `IAlertRuleRepository` ve `AlertRuleRepository.cs` ile CRUD işlemleri.
  3. **REST API Uç Noktaları (`AlertRulesEndpoints.cs`):**
     - `GET /api/alerts/rules`
     - `POST /api/alerts/rules` (`RequireAdmin`)
     - `PUT /api/alerts/rules/{id}` (`RequireAdmin`)
     - `DELETE /api/alerts/rules/{id}` (`RequireAdmin`)
* **Nasıl Doğrulanacak?**
  - xUnit testleriyle CRUD operasyonlarının doğrulanması.

### Bilet 9.2 — Arka Plan Değerlendirme Motoru (`ThresholdEvaluatorService`)
* **Önkoşul:** Bilet 9.1
* **Amaç:** Toplanan telemetri verilerini tanımlı kurallara göre kayan pencere (sliding window) mantığıyla değerlendirmek ve spam korumalı alarm tetiklemek.
* **Ne Yapılacak?**
  1. **Arka Plan Servisi (`ThresholdEvaluatorService.cs`):**
     - Her 15-30 saniyede bir son CPU/RAM/Disk metriklerini kurallarla eşleştirir.
     - Anlık spike'ları engellemek için `duration_seconds` (örneğin 3 dakika boyunca eşik üstünde kaldı mı?) doğrulaması.
     - `cooldown_minutes` ile aynı alarmın peş peşe kanallara yağmasını engelleme (anti-spam debounce).
  2. **Bildirim Servisi Genişletmesi (`NotificationService.cs`):**
     - `DispatchMetricThresholdAlertAsync(rule, currentValue)`: Discord, Telegram, Slack, SMTP, Ntfy ve Webhook kanallarına kritik eşik aşımı bildirimi iletme.
     - Durum normale döndüğünde otomatik yeşil `[DÜZELDİ]` toparlanma bildirimi.
* **Nasıl Doğrulanacak?**
  - Simüle edilen yüksek CPU yükü testinde kural süresi dolunca tek seferlik bildirim iletilmesi ve cooldown süresine riayet edilmesi.

### Bilet 9.3 — Alarm Kuralları Yönetim Arayüzü
* **Önkoşul:** Bilet 9.2
* **Amaç:** Ayarlar menüsünden veya ilgili sekmeden kolayca görsel kural oluşturma, açma/kapatma ve test etme imkanı.
* **Ne Yapılacak?**
  1. `src/Corvus.Web/src/pages/Settings/alerts/`:
     - `AlertRulesTab.tsx`: Aktif ve durdurulmuş kuralların listesi.
     - `AddAlertRuleModal.tsx`: Hedef seçici (Tüm Sistem veya Belirli Konteyner), metrik tipi (CPU, RAM, Disk), eşik kaydırıcısı ve süre seçimi.
     - `AlertRuleRow.tsx`: Durum rozeti (Normal, Alarmda, Devre Dışı) ve hızlı sil/düzenle aksiyonları.
  2. Çift dilli (TR/EN) sözlük entegrasyonu.
* **Nasıl Doğrulanacak?**
  - UI üzerinden eklenen kuralın anında arka planda değerlendirmeye alınması.

---

## 📜 FAZ 10: Olay Zaman Çizelgesi & Denetim Günlüğü (Audit Timeline)

### Bilet 10.1 — Kalıcı Olay ve Denetim Kayıtları (Audit Logging Engine)
* **Önkoşul:** Faz 9 tamamlandı.
* **Amaç:** Sistemde gerçekleşen tüm kritik eylemleri (konteyner durdurma/başlatma, ayar değiştirme, oturum açma, otomatik kurtarma, imaj güncelleme) kimin ve ne zaman yaptığını kaydetmek.
* **Ne Yapılacak?**
  1. **SQLite Migration (`014_activity_logs.sql`):** `activity_logs` tablosu (`id`, `actor_username`, `action_type`, `target_resource`, `details_json`, `ip_address`, `timestamp`).
  2. **Servis Katmanı (`IActivityLogService` / `ActivityLogService.cs`):** Sıfır gecikmeli, asenkron kanal (`Channel<ActivityLogEntry>`) tabanlı arabellekleme ile SQLite'a yığma (batching).
  3. **REST API Uç Noktaları (`ActivityLogEndpoints.cs`):** `GET /api/activity-logs?page=1&limit=50&search=...` (sayfalama ve filtreleme destekli).
* **Nasıl Doğrulanacak?**
  - Bir konteyner yeniden başlatıldığında veya ayar kaydedildiğinde veritabanına log düşmesi.

### Bilet 10.2 — Etkileşimli Zaman Çizelgesi Arayüzü (Activity Timeline Page)
* **Önkoşul:** Bilet 10.1
* **Amaç:** Kullanıcıya tüm sistem geçmişini filtreleyebileceği şık bir zaman çizgisi sunmak.
* **Ne Yapılacak?**
  1. `src/Corvus.Web/src/pages/ActivityTimeline/`:
     - `TimelineFilterBar.tsx`: Kullanıcı, eylem tipi (Auth, Container, System, Healing) ve tarih filtresi.
     - `TimelineFeed.tsx`: İkonlu, renk kodlu kronolojik olay kartları.
     - `TimelineEntryDetailModal.tsx`: Olayın JSON detaylarını ve hata kodlarını görüntüleme.
* **Nasıl Doğrulanacak?**
  - Sayfa üzerinden olayların anlık listelenmesi ve filtrelerin doğru çalışması.

---

## 🗄️ FAZ 11: Docker Volume ve İmaj Yaşam Döngüsü

### Bilet 11.1 — Volume ve Disk Kullanımı Yönetimi
* **Önkoşul:** Faz 10 tamamlandı.
* **Amaç:** Docker volume'lerini listelemek, hangi konteynerlere bağlı olduğunu görmek ve yetim (dangling) volume'leri temizlemek.
* **Ne Yapılacak?**
  1. Backend `IDockerHttpClient` genişletmesi: `/volumes`, `/volumes/{name}` silme ve `/system/df` (disk kullanım özeti).
  2. API: `GET /api/volumes`, `DELETE /api/volumes/{name}`, `POST /api/volumes/prune`.
  3. Frontend: Modüler `/volumes` sayfası ve `VolumePruneModal.tsx`.
* **Nasıl Doğrulanacak?**
  - Kullanılmayan volume'lerin tespit edilip tek tıkla silinebilmesi.

### Bilet 11.2 — İmaj Listesi ve Temizleme (Image Hygiene)
* **Önkoşul:** Bilet 11.1
* **Amaç:** İmajları listelemek, etiketlenmemiş (dangling) imajları ayıklamak ve diskte açılan alanı göstermek.
* **Ne Yapılacak?**
  1. Backend API: `GET /api/images`, `DELETE /api/images/{id}`, `POST /api/images/prune`.
  2. Frontend: `/images` sekmesi veya konteynerler içi alt görünüm; boyut bilgisi ve güvenli temizleme modalı.
* **Nasıl Doğrulanacak?**
  - Dangling imaj temizliği sonrası geri kazanılan megabayt miktarının bildirilmesi.

---

## 🛠️ Uygulama İlkeleri & Kalite Standartları

1. **Modüler Dosya Kuralı (GEMINI.md):** Hiçbir sayfa veya bileşen 200 satırı aşmayacak; servisler `api/`, alt bileşenler bağımsız dosyalarda toplanacak.
2. **Native AOT Uyumluluğu:** Yeni tüm C# DTO ve modelleri `CorvusJsonSerializerContext` içinde kayıt altına alınacak.
3. **Semantik Versiyonlama & Changelog:** Her bilet tamamlandığında `CHANGELOG.md` ve `CHANGELOG.tr.md` eşzamanlı güncellenecek; commit'ler `fix:` veya `perf:` önekiyle açılacak.
4. **Birim Test Zorunluluğu:** Yeni backend servislerinin her biri için xUnit testleri yazılacak ve tüm test paketi (şu an 244 test) kırılmadan korunacak.
