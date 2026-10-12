# ADR-008: Corvus Çoklu Sistem Yönetimi (Systems) ve Hub-Agent Mimarisi

- **Durum:** Onaylandı & Kesinleşti
- **Tarih:** 2026-10-12
- **İlgili Modüller:** `Corvus.Core`, `Corvus.Agent`, `Corvus.Web`, `Corvus.Database`
- **Modül & Sayfa Adı:** **"Sistemler"** (İngilizce: **"Systems"**)

---

## 1. Bağlam ve Sorun Tanımı (Context)
Corvus şu ana kadar tek bir sunucu üzerinde çalışan ve doğrudan yerel Docker daemon (`/var/run/docker.sock`) ile sistem metriklerini izleyen bağımsız bir platformdu. 

Kullanıcıların birden fazla sunucuya (örneğin: Hetzner VPS, ev sunucusu / Homelab, PostgreSQL veritabanı düğümü, yedekleme sunucusu) sahip olduğu senaryolarda; her sunucu için ayrı bir Corvus Web UI kurmak yerine, **tek bir merkezi Corvus Hub** üzerinden tüm sunucuların durumunu, kaynak tüketimini (CPU, RAM, Disk, Ağ, Load Avg) ve Docker konteynerlerini yönetme ihtiyacı doğmuştur.

Ayrıca, uç düğümlerin (Agent) genellikle güvenlik duvarı (firewall) veya NAT arkasında olması sebebiyle dışarıya port açamaması gerçeği göz önüne alınmalıdır.

---

## 2. Mimari Karar (Decision)

### 2.1. Hub - Agent Modeli (Ters Yönlü Bağlantı / Reverse Push & Tunnel)
1. **Corvus Hub (Merkez Sunucu):**
   - Kullanıcının tarayıcısıyla bağlandığı ana sunucudur (`${CORVUS_HUB_URL}`).
   - Kimlik doğrulama, kullanıcı yetkilendirme, genel sistem telemetrisi, alarmlar ve geçmiş verileri tutar.
   - Uç düğümlerden gelen telemetriyi karşılar (`/api/v1/agent/telemetry`).
   - Uç düğümlere Docker komutları iletmek için güvenli çift yönlü WebSocket tüneli sağlar (`/api/v1/agent/tunnel`).

2. **Corvus Agent (Uç Düğüm / Sistem Ajanı):**
   - Tek bir ikili dosya veya tek satırlık Docker konteyneri olarak çalışır.
   - Dışarıya **hiçbir port açmaz** (Inbound port: 0).
   - Hub'a WSS üzerinden giden bağlantı (Outbound) başlatır.
   - Her 3 saniyede bir hafif telemetri paketini (120 bayt struct) Hub'a iletir.
   - Hub'dan gelen "konteyner başlat", "durdur", "logları getir" veya "web terminal aç" isteklerini yerel Docker soketi üzerinden yürüterek cevabı tünelden geri iletir.

### 2.2. Güvenlik ve Kimlik Doğrulama
- Her sistem için Hub üzerinde kriptografik olarak güvenli bir `NODE_KEY` (`crv_node_live_...`) üretilir.
- Hub, gelen istekleri sabit zamanlı (`CryptographicOperations.FixedTimeEquals`) token hash doğrulaması ile kontrol eder.
- Tüm veri akışı TLS (WSS) üzerinden şifrelenir.
- Token sızması durumunda panelden tek tıkla anahtar iptal edilebilir (revoke).

### 2.3. Performans, Ring Buffer ve Çift Veritabanı
- **In-Memory Ring Buffer (Beszel Modeli):** Her sistem için son 60 nokta (3 dakika @ 3s) bellekte tutulur (50 sistem için <360 KB RAM). Canlı UI doğrudan RAM'den beslenir; diske anlık yazma yapılmaz.
- **Toplu Yazma (60s Batch Flush):** 60 saniyede bir ortalamalar hesaplanıp tek transaction ile kaydedilir. SQLite tek yazıcı kilidi (`database is locked`) sıfırlanır.
- **Saklama & Budama:** 1m verileri 7 gün, 1h verileri 30 gün saklanır. 1 sistemin 1 aylık disk maliyeti yalnızca **~2.5 MB**'tır (20 sistem = ~50 MB).
- **Varsayılan:** SQLite (WAL modu, <30 MB RAM). 1-50 sunucu için sıfır bağımlılıkla kusursuz çalışır.
- **Kurumsal Seçenek:** PostgreSQL (Npgsql + Dapper.AOT). 50-200+ sunuculu kurumsal filolar için konfigürasyonla aktif edilebilir.

---

## 3. Kullanıcı İş Akışı (User Journey)
1. Kullanıcı Corvus Hub'a giriş yapar ve sol menüden **"Sistemler"** sekmesini açar.
2. Karşısına tüm bağlı sunucuların özet tablosu (Online durumu, CPU, RAM, Disk, Konteynerler, Ağ trafiği) gelir.
3. Sağ üstteki **"+ Sistem Ekle"** butonuna tıklar.
4. Açılan modalda sunucu adı (ör. `vps-amsterdam-01`) ve etiketleri girer.
5. Sistem otomatik olarak hazır 1 satırlık komutu üretir:
   ```bash
   docker run -d --name corvus-agent --restart unless-stopped \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -e CORVUS_HUB_URL="${CORVUS_HUB_URL}" \
     -e CORVUS_NODE_KEY="${CORVUS_NODE_KEY}" \
     ghcr.io/corvus/agent:latest
   ```
6. Kullanıcı bu komutu hedef sunucusuna yapıştırıp çalıştırdığı anda, modal canlı dinleyicide yeşile döner: *"Bağlantı başarılı! Sistem kaydedildi."*
7. Artık o sunucunun hem kaynak grafikleri hem de Docker konteynerleri merkezi listede yönetilebilir hale gelir.

---

## 4. Sonuçlar ve Avantajlar
- **Sıfır Port Açma Zorunluluğu:** Ev labları veya kapalı ağdaki VPS'ler bile Hub'a rapor verebilir.
- **Rakiplerden Ayrışan Güç:** Beszel gibi araçlar yalnızca salt-okunur kaynak grafiği sunarken; Corvus Agent aynı zamanda Docker konteyner yönetimi (start/stop/logs) ve Web Terminali uzaktan güvenle tüneller.
- **Modülerlik:** Temiz mimari kuralına tam uyum. UI bileşenleri (`SystemsHeader`, `SystemsKpis`, `SystemsFilterBar`, `SystemRow`, `SystemsEmptyState`, `SystemsEngineBadge`, `AddSystemSheet`, `SystemDetailModal`), servisler (`src/api/systems.ts`) ve backend katmanları tamamen bağımsız tutuldu.
- **Uygulama Durumu:** Faz 1 - Faz 5 uçtan uca tamamlandı. 256/256 xUnit testi ve hatasız frontend Vite derlemesi ile doğrulandı.
