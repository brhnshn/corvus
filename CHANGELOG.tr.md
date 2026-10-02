# Değişiklik Günlüğü (Changelog)

Bu projedeki tüm önemli değişiklikler bu dosyada belgelenir.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) standardına dayanır ve bu proje [Semantik Versiyonlama](https://semver.org/lang/tr/) kurallarını benimser.

## [1.5.19] - 2026-10-02

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
