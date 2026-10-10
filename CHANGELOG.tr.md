# Değişiklik Günlüğü (Changelog)

Bu projedeki tüm önemli değişiklikler bu dosyada belgelenir.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) standardına dayanır ve bu proje [Semantik Versiyonlama](https://semver.org/lang/tr/) kurallarını benimser.

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
