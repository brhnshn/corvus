# Corvus — Tasarım Sonrası Mimari, Yeni Özellik ve İleri UX Geliştirme Prompt Paketi

Tasarım altyapısı (`corvus_obsidian_design_system_prompt.md`) tamamlandıktan sonra, seçtiğin geliştirme maddelerini `.NET 9 Native AOT`, `Dapper.AOT` ve `GEMINI.md` kurallarını bozmadan kodlama ajanına uygulatmak için aşağıdaki ana promptu kullanabilirsin. *(Not: Canlı Topoloji ekranı şimdilik ana akıştan çıkarıldı; ileride eklemek istediğinde kullanabilmen için dokümanın en altına bağımsız bir ek prompt olarak ayrıldı.)*

## Kodlama Ajanına Verilecek Ana Prompt (Kopyala & Yapıştır)

```markdown
# Görev: Corvus Mimari İyileştirmeler, Yeni Homelab Özellikleri ve İleri UX Entegrasyonu

`src/Corvus.Web` üzerindeki ObsidianUI (Grimsi Bulut Beyazı & Motion Design) tasarım altyapısı tamamlandı. Şimdi projeyi mimari, fonksiyonel ve kullanıcı deneyimi açısından geliştirecek aşağıdaki 3 ana modülü sırasıyla ve testlerini yazarak uygulayacağız.

---

## 0. Kesin Mühendislik ve Mimari Kurallar (`GEMINI.md` & Native AOT Guardrails)

1. **.NET 9 Native AOT Uyumluluğu (`PublishAot=true`):**
   - `src/Corvus.Api` ve `src/Corvus.Agent` içinde **kesinlikle Reflection veya dinamik tip çözümlemesi kullanma**.
   - Eklenen her yeni Request/Response DTO ve SSE olay modelini mutlaka `JsonSerializerContext` (`AppJsonSerializerContext`) içerisine `[JsonSerializable(typeof(...))]` olarak kaydet.
2. **Dapper.AOT ve Çift Veritabanı (SQLite & PostgreSQL) Kuralı:**
   - Veritabanı şemasında değişiklik gerektiren özelliklerde hem SQLite (`*_sqlite.sql`) hem de PostgreSQL (`*_postgres.sql`) migration dosyalarını `DatabaseMigrator.cs` standartlarına uygun olarak birlikte ekle.
3. **Modülerlik ve < 30 MB Bellek Hedefi:**
   - Tüm kodları tek bir dosyaya yığma; her özelliği kendi `*Endpoints.cs`, `*Service.cs`, `*Repository.cs` ve React bileşen dosyalarına ayır.
   - Yeni arka plan servislerinde gereksiz heap tahsisinden (allocation) kaçın; mevcut `SystemTelemetryPoint` (struct) ve `TelemetryRingBuffer` mimarisini koru.

---

## Modül 1 — Mimari ve Kod Sağlığı İyileştirmeleri

### 1.1 Tarayıcı Tarafındaki HTTP Polling Yükünü SSE'ye Çevirmek (`100ms Sync`)
- **Backend (`src/Corvus.Api/Endpoints/SystemsEndpoints.cs` & `MetricsEndpoints.cs`):**
  - Konteyner loglarında kullanılan Server-Sent Events (SSE) yapısını örnek alarak `GET /api/v1/systems/{id}/stream` (ve yerel sistem için `/api/v1/metrics/stream`) uç noktasını oluştur.
  - `TelemetryRingBuffer` içine yeni bir `SystemTelemetryPoint` eklendiğinde veya konteyner durumu değiştiğinde, bağlı SSE istemcilerine `text/event-stream` formatında anlık JSON verisi (`event: telemetry`) gönder.
- **Frontend (`src/Corvus.Web/src/hooks/`):**
  - `useSystemMetricsStream(systemId)` hook'unu `EventSource` kullanarak yaz; bağlantı koptuğunda otomatik yeniden bağlanma (exponential backoff) ve yalnızca SSE desteklenmeyen durumlarda HTTP polling'e düşme (fallback) mantığı ekle.
  - `Dashboard.tsx` ve `SystemMetrics.tsx` sayfalarındaki periyodik HTTP polling çağrılarını bu canlı SSE akışıyla değiştir.

### 1.2 Kapanışta (Graceful Shutdown) RAM Arabelleğini Diske Boşaltmak
- **Backend (`src/Corvus.Api/Services/MetricsBatchFlusherBackgroundService.cs`):**
  - `MetricsBatchFlusherBackgroundService` 60 saniyelik periyotlarla çalıştığı için konteyner yeniden başlatıldığında (`SIGTERM`) son 59 saniyelik telemetri RAM'de kaybolabiliyor.
  - Servis içinde `StopAsync(CancellationToken cancellationToken)` metodunu override et veya `IHostApplicationLifetime.ApplicationStopping` kancasını kullanarak uygulama kapanırken `TelemetryRingBuffer` içindeki tüm yazılmamış verileri SQLite/PostgreSQL `system_metrics_1m` tablosuna zorunlu `FlushAsync()` ile kaydet.
- **Test (`tests/Corvus.Api.Tests/`):**
  - Servis durdurulduğunda (`StopAsync`) arabellekteki bekleyen telemetri noktalarının veritabanına eksiksiz yazıldığını doğrulayan birim testini ekle.

### 1.3 Frontend Test Boşluğunu Kapatmak (`Vitest`)
- **Frontend (`src/Corvus.Web/`):**
  - `package.json` ve `vite.config.ts` içine **Vitest** ve `@testing-library/react` yapılandırmasını ekle.
  - Kritik API veri dönüştürücüleri (`src/api/`), durum rozeti hesaplamaları ve yeni oluşturulan ortak ObsidianUI bileşenleri (`AnimatedNumber`, `SegmentedTabs`, `ExpandableTable`) için temel birim testlerini (`src/__tests__/`) oluştur.

---

## Modül 2 — Homelab & Self-Hosted Fark Yaratıcı Yeni Özellikler

### 2.1 Görsel `docker-compose.yml` Editörü ve Stack Dağıtımı (Coolify / Dockge Tarzı)
- **Backend (`src/Corvus.Api/Endpoints/ComposeEndpoints.cs` & `src/Corvus.Agent/`):**
  - Mevcut salt-okunur Compose görüntüleme yapısını genişleterek `PUT /api/v1/compose/{stackName}` (YAML ve `.env` içeriğini güvenli şekilde kaydetme, kaydetmeden önce sözcüksel doğrulama yapma) ve `POST /api/v1/compose/{stackName}/deploy` (`docker compose up -d` çalıştırma ve çıktısını SSE/JSON ile döndürme) uç noktalarını ekle.
  - Uzak düğümler için `AgentTunnelEndpoints.cs` ve `AgentTunnelClient.cs` WebSocket protokolüne `compose.save` ve `compose.up` komutlarını ekle.
- **Frontend (`src/Corvus.Web/src/pages/Containers/` & `ComposeConfigModal.tsx`):**
  - `ComposeConfigModal` bileşenini; `docker-compose.yml` ve `.env` sekmeleri olan, satır numaralı, düzenlenebilir bir kod editörüne dönüştür.
  - Alt kısma inline spinner geri bildirimli **"Kaydet & Dağıt (Compose Up)"** butonu ekle.

### 2.2 Tek Tıkla İmaj Güncelleme (`Pull & Recreate`)
- **Backend (`src/Corvus.Api/Services/Docker/` & `ContainersEndpoints.cs`):**
  - Mevcut `OciRegistryClient` altyapısını kullanarak çalışan konteynerlerin yerel imaj özeti (`ImageId / RepoDigests`) ile uzak kayıt defterindeki (`Registry`) güncel digest değerini karşılaştır.
  - `POST /api/v1/containers/{id}/recreate` uç noktasını oluştur: Mevcut konteynerin `HostConfig`, `Env`, `Mounts (Volumes)`, `PortBindings`, `Labels` ve `NetworkingConfig` yapılandırmasını birebir oku -> yeni imajı çek (`DockerImageClient`) -> eski konteyneri durdurup yeniden adlandır -> yeni konteyneri aynı ayarlarla başlat (başarısız olursa eski konteyneri geri başlat / rollback yap).
- **Frontend (`src/Corvus.Web/src/pages/Containers.tsx`):**
  - Güncel olmayan imajların yanına mat kehribar (`--status-warn`) renginde **"Güncelleme Mevcut"** rozeti ve tıklandığında `Pull & Recreate` işlemini başlatıp Sonner bildirimi gösteren aksiyon butonu ekle.

### 2.3 Systemd Servis ve Süreç (Process) Yönetimi
- **Backend & Agent (`src/Corvus.Agent/` & `src/Corvus.Api/Endpoints/SystemsEndpoints.cs`):**
  - Host üzerinde Docker dışında doğrudan çalışan servisleri (Caddy, WireGuard, Tailscale, PostgreSQL, sshd vb.) izlemek ve yönetmek için `SystemdServiceClient.cs` oluştur.
  - Komut enjeksiyonunu (command injection) önlemek için birim adlarını katı şekilde (`^[a-zA-Z0-9@_.-]+\.service$`) doğrula; `systemctl list-units --type=service --output=json`, `systemctl restart/start/stop <unit>` ve `journalctl -u <unit> -n 100 --no-pager` yeteneklerini ekle.
- **Frontend (`src/Corvus.Web/src/pages/Services.tsx` & `Systems.tsx`):**
  - Sistem detaylarında ve Servisler ekranında **"Systemd Birimleri"** sekmesi açarak servislerin durumunu (`active/running`, `failed`), bellek kullanımını, `journalctl` loglarını ve yeniden başlatma butonunu göster.

### 2.4 Rol Tabanlı Erişim Kontrolü (RBAC) ve Salt-Okunur (`Viewer`) Hesaplar
- **Backend (`src/Corvus.Api/Data/` & `AuthService.cs` & `CorvusAuthFilter.cs`):**
  - `users` tablosuna `role` sütunu (`admin`, `operator`, `viewer` — varsayılan: mevcut kullanıcılar için `admin`) ekleyen SQLite ve PostgreSQL migration'larını oluştur.
  - `CorvusAuthFilter.cs` içinde yazma/değiştirme işlemi yapan uç noktalara (`POST`, `PUT`, `DELETE` — konteyner durdurma/silme, terminal exec, compose dağıtımı, ayar değiştirme) rol kontrolü ekle; `viewer` rolü için `403 Forbidden` döndür.
- **Frontend (`src/Corvus.Web/`):**
  - Oturum açan kullanıcının rolü `viewer` olduğunda konteyner durdurma/silme, terminal açma ve ayar kaydetme butonlarını pasif (`disabled`) duruma getir veya gizle; `Settings.tsx` altında kullanıcı rolü yönetim tablosu ekle.

---

## Modül 3 — İleri Seviye UI/UX ve Etkileşim Güncellemeleri

### 3.1 Klavye Odaklı Hızlı Eylemler (`Ctrl+K` Komut Paleti Genişletmesi)
- Mevcut komut paletini yalnızca sayfa değiştiren bir menü olmaktan çıkarıp aksiyon çalıştıran bir komuta merkezine dönüştür:
  - `> restart <container_name>` yazıldığında ilgili konteyneri doğrudan yeniden başlatsın ve **Geri Al (`Undo`)** destekli Sonner bildirimi göstersin.
  - `> logs <container_name>` yazıldığında doğrudan o konteynerin canlı SSE log modalını açsın.
  - `> switch <system_name>` yazıldığında aktif sunucu düğümünü değiştirsin.
  - `> check <service_name>` yazıldığında ilgili servise anlık HTTP/TCP yoklaması atsın.

---

## Uygulama ve Doğrulama Sırası

Lütfen bu görevleri şu sırayla uygula ve her adımın sonunda derleme + test doğrulaması yap:
1. **Adım 1:** Modül 1.1 (SSE Telemetri) ve Modül 1.2 (Graceful Shutdown Flush) -> `dotnet test tests/Corvus.Api.Tests` çalıştır.
2. **Adım 2:** Modül 2.4 (RBAC `admin`/`viewer` migration ve filtreleri) -> `dotnet test` çalıştır.
3. **Adım 3:** Modül 2.1 (Compose Editörü) ve Modül 2.2 (Tek Tıkla İmaj Güncelleme).
4. **Adım 4:** Modül 2.3 (Systemd Yönetimi).
5. **Adım 5:** Modül 3.1 (`Ctrl+K` Komut Paleti Aksiyonları) ve Modül 1.3 (`Vitest` testleri) -> `npm run build` ve `npm run test` çalıştır.
```

---

## Ajanı Yönetirken Kullanabileceğin Kısa Komutlar

1. **İlk komut:** *"Yukarıdaki mimari kurallara uyarak önce yalnızca **Modül 1 (SSE Telemetri, Graceful Shutdown Flush ve Vitest)** adımlarını uygula ve backend/frontend testlerini çalıştır."*
2. **İkinci komut:** *"Harika, şimdi **Modül 2.1 (Görsel Compose Editörü)** ve **Modül 2.2 (Tek Tıkla İmaj Güncelleme - Pull & Recreate)** özelliklerini hem `Corvus.Api` hem de `Corvus.Web` tarafında tamamla."*
3. **Üçüncü komut:** *"Şimdi **Modül 2.3 (Systemd Servis Yönetimi)** ve **Modül 2.4 (RBAC Viewer Rolü)** geliştirmelerini SQLite/Postgres migration'ları ve testleriyle birlikte ekle."*
4. **Dördüncü komut:** *"Son olarak **Modül 3.1 (Ctrl+K Komut Paleti Aksiyonları)** özelliğini ObsidianUI tasarım sistemimize uygun şekilde tamamla."*

---

## İleride Eklenecek Opsiyonel Ek Paket: Canlı Topoloji & Bağımlılık Haritası

İlerleyen aşamada Topoloji ekranını eklemek istediğinde ajana yalnızca şu kısa promptu vermen yeterli olacaktır:

```markdown
# Ek Görev: Canlı Topoloji ve Bağımlılık Haritası (`src/Corvus.Web/src/pages/Topology.tsx`)

`Yeni Tasarımlar/02-topoloji.html` vizyonunu ve kurduğumuz ObsidianUI (Grimsi Bulut Beyazı & Kutusuz Yörünge) tasarım sistemini birleştirerek `Sidebar.tsx` menüsüne **Topoloji (`Topology.tsx`)** ekranını ekle:
- `Systems (Node)` -> `Compose Stack` -> `Container` -> `Monitored Service (Uptime)` hiyerarşisini mevcut API verilerinden otomatik olarak çıkar.
- Düğümler arasında kavisli Bezier bağlantı yayları, canlı durum noktaları (`--status-up`, `--status-warn`, `--status-down`) ve gecikme (`ms`) etiketleri göster.
- Herhangi bir düğüme tıklandığında sağdan detay ve hızlı aksiyon (`Yeniden Başlat`, `Loglar`, `Terminal`, `Şimdi Kontrol Et`) çekmecesini aç.
```
görev bitince bu .md dosyasını sil.