# Corvus — Çoklu Sistem Yönetimi (Systems) Geliştirme Eylem Planı

- **Durum:** Onaylandı & Uygulama Aşaması (v4.0)
- **Tarih:** 2026-10-12
- **Hedef Sürüm:** Corvus v1.5.0+
- **Terminoloji:** **"Sistemler"** (İngilizce: **"Systems"**)
- **Mimari Disiplini:** Temiz Mimari, .NET 9 Native AOT, Dapper.AOT, Beszel-Stili In-Memory Ring Buffer + 60s Batch Flush + 7g/30g Rolling Retention
- **Teknik Detaylar:** [BACKEND_PROTOCOL_SPEC.md](file:///c:/Users/sahin/Desktop/Projeler/Corvus/docs/multi-node/BACKEND_PROTOCOL_SPEC.md)

---

## Faz 1: In-Memory Ring Buffer, Çift Veritabanı ve Saklama Altyapısı
**Hedef:** Canlı telemetriyi bellekte sıfır disk I/O ile tutan (~360 KB RAM @ 50 sistem), her 60 saniyede bir toplu yazan ve 7g/30g budama yapan altyapıyı kurmak.

- [x] **Görev 1.1:** Veritabanı DDL Migrasyonları:
  - SQLite için `src/Corvus.Api/Data/Migrations/016_systems_sqlite.sql` tablolaması (`systems`, `system_tokens`, `system_metrics_1m`, `system_metrics_1h`, `system_containers_cache`).
  - PostgreSQL için `src/Corvus.Api/Data/Migrations/PostgreSql/016_systems_postgres.sql` (BRIN indeksleri ve JSONB ile).
- [x] **Görev 1.2:** In-Memory Ring Buffer Servisi (`TelemetryRingBuffer`):
  - 120 baytlık `unmanaged / readonly struct` metrik yapısı.
  - Her sistem için son 60 telemetri noktasını (3 dakika @ 3s) ve güncel konteyner önbelleğini tutan dairesel koleksiyon.
- [x] **Görev 1.3:** Toplu Disk Yazıcı Arka Plan Servisi (`MetricsBatchFlusherBackgroundService`):
  - Her 60 saniyede bir çalışan arka plan worker servisi.
  - Bellekteki verileri 1 dakikalık ortalama/özet biçiminde toplayıp tek bir transaction içinde `system_metrics_1m` tablosuna toplu yazma (`InsertBatchAsync`).
- [x] **Görev 1.4:** Saklama ve Budama Arka Plan Servisi (`MetricsRetentionWorker`):
  - Her gece çalışan otomatik temizlik servisi.
  - 7 günden eski 1m verilerini saatlik ortalamalara (`system_metrics_1h`) sıkıştırıp silme; 30 günden eski saatlik verileri budama.
  - 1 sistemin 1 aylık disk ayak izini **~2.5 MB** ile sınırlama.
- [x] **Görev 1.5:** Sistem Durum Servisi (`SystemStatusService`):
  - `ISystemStatusService` ve `GET /api/v1/systems/status` uç noktası hazırlığı.
  - Aktif motoru (`sqlite`/`postgresql`), bağlı sistem sayısını ve bellek tampon sağlığını raporlama.
- [x] **Görev 1.6:** Repository Sözleşmeleri ve Dapper.AOT:
  - `ISystemRepository` ve `ISystemMetricRepository` arayüzleri ve Dapper.AOT implementasyonları.
- [x] **Görev 1.7:** Native AOT JSON Serialization Context:
  - `CorvusJsonSerializerContext` içine tüm yeni modellerin kaydedilmesi (Sıfır çalışma zamanı yansıma/reflection).

---

## Faz 2: Hub Backend Servisleri ve Sistem API Uç Noktaları
**Hedef:** Uç sistemlerin güvenle bağlanabileceği, çift yönlü komut ve terminal tünelinin yönetileceği Hub servisleri.

- [x] **Görev 2.1:** Sistem Kimlik Doğrulama Servisi (`SystemAuthService`):
  - 32 bayt rastgele entropi ile `crv_node_live_...` anahtar üretimi.
  - SHA-256 hash ve `CryptographicOperations.FixedTimeEquals` sabit zamanlı doğrulama.
  - Token iptali (`RevokeTokenAsync`).
- [x] **Görev 2.2:** WebSocket Tünel Yöneticisi (`SystemTunnelManager`):
  - Uç sunucuların açık WSS soketlerini yönetme (`ConcurrentDictionary<string, WebSocket>`).
  - RPC istek/yanıt eşleme mekanizması (`correlationId` tabanlı `TaskCompletionSource`).
  - Çift yönlü PTY terminal ikili çerçeveleme (Opcode `0x01` veri akışı, `0x02` resize, `0x03` close).
- [x] **Görev 2.3:** Sistem Durum Watchdog Servisi (`SystemWatchdogService`):
  - 5 saniyede bir çalışan arka plan servisi (`BackgroundService`).
  - Durum kuralları: $\le 10\text{s}$ `online`, $> 15\text{s}$ `degraded`, $> 30\text{s}$ `offline`.
- [x] **Görev 2.4:** Sistem Yönetim API Uç Noktaları (`SystemsEndpoints.cs`):
  - `GET /api/v1/systems/status`: Sistem ve motor durumu.
  - `GET /api/v1/systems`: Kayıtlı sunucuları RAM'deki canlı metriklerle listeleme.
  - `POST /api/v1/systems`: Yeni sunucu kaydı ve tek kullanımlık `NODE_KEY` üretimi.
  - `GET /api/v1/systems/{id}`: Sistem detayları, donanım özellikleri ve konteynerler.
  - `DELETE /api/v1/systems/{id}`: Sistem kaydını silme ve tüneli kapatma.
  - `POST /api/v1/systems/{id}/token/revoke`: Token iptali.
- [x] **Görev 2.5:** Uzaktan Docker Proxy Uç Noktaları:
  - `POST /api/v1/systems/{id}/containers/{cid}/start|stop|restart`.
  - `GET /api/v1/systems/{id}/containers/{cid}/logs` (RPC Log akışı).
- [x] **Görev 2.6:** Ajan Tünel Uç Noktası (`AgentTunnelEndpoints.cs`):
  - `GET /api/v1/agent/tunnel`: Outbound WSS bağlantısını karşılama, token doğrulama ve mesaj pompası.

---

## Faz 3: Corvus Agent (Uç Sistem İstemcisi)
**Hedef:** Hedef sunucuda tek satırlık Docker komutu olarak çalışacak hafif ajan.

- [x] **Görev 3.1:** Sistem Metrik Toplayıcı:
  - 120 baytlık optimize struct ile CPU, RAM, Disk, Ağ ve Linux Load Average toplama (`SystemMetricCollector`).
- [x] **Görev 3.2:** Yerel Docker Entegrasyonu:
  - `/var/run/docker.sock` üzerinden yerel konteynerlerin taranması ve komut yürütme (`AgentDockerClient`).
- [x] **Görev 3.3:** Outbound WSS İstemcisi ve Yeniden Bağlanma:
  - Jitter destekli üstel geri çekilme ($2\text{s} \to 60\text{s}$) ve telemetri pompası (`AgentTunnelClient`).
- [x] **Görev 3.4:** Docker İmajı:
  - `Dockerfile.agent` ile hafif distroless/AOT tabanlı imaj hazırlandı.

---

## Faz 4: Frontend — Sistemler Sayfası ve UI Modülleri (Midnight v2)
**Hedef:** Yalın, "Sistemler" adlandırmasıyla çalışan yüksek performanslı arayüz.

- [x] **Görev 4.1:** API Servis Katmanı:
  - `src/Corvus.Web/src/api/systems.ts` (REST çağrıları ve durum sorguları).
- [x] **Görev 4.2:** Ana Sistemler Sayfası:
  - `src/Corvus.Web/src/pages/Systems/index.tsx`.
- [x] **Görev 4.3:** Alt Bileşenler (Modüler Parçalama):
  - `SystemsHeader.tsx`: Başlık ("Sistemler"), sayaçlar, "+ Sistem Ekle" butonu.
  - `SystemsKpis.tsx`: Toplam CPU, RAM, Disk ve Konteyner özet kartları.
  - `SystemsList.tsx`: Sistem kartları listesi (`SystemRow.tsx`, `SystemsEmptyState.tsx`, `SystemsEngineBadge.tsx`).
  - `SystemRow.tsx`: Tekil sistem kartı (JetBrains Mono IP/Hostname, progress barlar, canlı durum noktası, hızlı eylemler).
  - `AddSystemSheet.tsx`: Yeni sistem ekleme çekmecesi, kopyalanabilir 1-satırlık docker run komutu.
  - `SystemDetailModal.tsx`: Tıklanan sistemin konteynerleri, canlı grafikleri ve yönetim eylemleri.
- [x] **Görev 4.4:** Menü Entegrasyonu:
  - `Sidebar.tsx`, `AppRouter.tsx` ve `App.tsx` bileşenlerine **"Sistemler"** sekmesinin eklenmesi.

---

## Faz 5: Dokümantasyon, Test ve Doğrulama
- [x] **Görev 5.1:** Birim ve Performans Testleri:
  - RAM ayak izi testi: 50 simüle sistem altında Hub RAM tüketiminin < 45 MB olduğunu doğrulama (`MultiNodePhase1Tests`).
  - Disk yazım testi: 60 saniyelik batch flush süresinin < 5 ms olduğunu doğrulama.
  - Retention testi: 7g ve 30g budama mantığının doğrulanması (`MetricsRetentionWorker`).
- [x] **Görev 5.2:** Dokümantasyon Güncellemeleri:
  - `README.md` ve `README.tr.md` içerisine "Sistemler" terminolojisi ve kurulum kılavuzunun eklenmesi.
  - `CHANGELOG.md` ve `CHANGELOG.tr.md` güncellemesi.
