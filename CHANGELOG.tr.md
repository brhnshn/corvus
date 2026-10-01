# Değişiklik Günlüğü (Changelog)

Bu projedeki tüm önemli değişiklikler bu dosyada belgelenir.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) standardına dayanır ve bu proje [Semantik Versiyonlama](https://semver.org/lang/tr/) kurallarını benimser.

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
