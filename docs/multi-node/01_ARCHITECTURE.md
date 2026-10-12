# Corvus — Çoklu Sunucu Yönetimi (Systems) & Çift Motor Mimarisi

- **Durum:** Onaylandı & Mimari Standart Kesinleşti (v4.0)
- **Tarih:** 2026-10-12
- **Hedef Versiyon:** Corvus v1.5.0+
- **Terminoloji:** **"Sistemler"** (İngilizce: **"Systems"**)
- **Teknik Spesifikasyon:** [BACKEND_PROTOCOL_SPEC.md](file:///c:/Users/sahin/Desktop/Projeler/Corvus/docs/multi-node/BACKEND_PROTOCOL_SPEC.md)

---

## 1. Giriş ve Temel Felsefe

Corvus, tek bir sunucuyu izleyen yerel bir araçtan; birden fazla sunucuyu (VPS, bare-metal, bulut VM'leri, homelab) merkezi ve yalın bir arayüzden yöneten **Sistemler (Systems)** platformuna evrilmektedir.

### Temel Ayrışma Noktamız:
Beszel gibi açık kaynak alternatifler yalnızca salt-okunur kaynak grafiği sunarken; Corvus **Sistemler** mimarisi hem telemetriyi toplar hem de uç sunuculardaki Docker konteynerlerini uzaktan yönetme (Başlat/Durdur/Loglar/Web Terminal) kabiliyetini tek bir güvenli outbound tünelde birleştirir.

---

## 2. Derin Optimizasyon: RAM, Disk I/O ve Saklama Matematiği

### 2.1. RAM Tüketim Sınırı (Zero Bloat)
- **In-Memory Ring Buffer:** Uç sunuculardan her 3 saniyede bir gelen paketler doğrudan diske yazılmaz. Hub içinde düğüm başına son **60 telemetri noktası** (3 dakikalık canlı veri) tutulur.
- **1 Nokta Struct Boyutu:** `readonly struct` olarak ~120 bayt.
- **Düğüm Başına Bellek:** $60 \times 120 \text{ B} \approx 7.2 \text{ KB}$ RAM.
- **50 Bağlı Sistem RAM Yükü:** $50 \times 7.2 \text{ KB} \approx 360 \text{ KB}$ (1 MB'ın çok altında!).
- **.NET 9 Native AOT Çalışma Hedefi:**
  - Boşta (Idle): **< 30 MB RAM**.
  - 50 bağlı sistem ile aktifken: **< 45 MB RAM**.

### 2.2. Veri Yazımı & Disk I/O Optimizasyonu
- **Ham Saniyelik Veriler Diske Yazılmaz:** Disk yıpranmasını önlemek ve SQLite tek-yazıcı kilidini (`database is locked`) sıfırlamak için saniyelik ham paketler diske gitmez.
- **Toplu Yazma Döngüsü:** Tam **60 saniyede bir** (1 dakika).
- **1 Dakikalık Özet:** 60 saniyedeki verilerin ortalaması (avg/min/max CPU, RAM, Disk, Ağ) tek bir satır halinde diske yazılır.
- **Süre:** 50 sistem için dakikada yalnızca 1 transaction çalışır ve SQLite WAL modunda ~2–5 ms sürer.

### 2.3. Saklama (Retention) ve Düzenli Budama (Rolling Prune)
- **1 Dakikalık Özetler:** **7 gün** saklanır ($\approx 10.080 \text{ satır / sistem}$).
- **1 Saatlik Ortalamalar:** **30 gün** saklanır ($\approx 720 \text{ satır / sistem}$).
- **30 Günden Eski Veriler:** Arka plandaki `MetricsRetentionWorker` tarafından her gece otomatik silinir.
- **Disk Ayak İzi:**
  - **1 Sistemin 1 Aylık Disk Maliyeti:** Yalnızca **~2.5 MB**!
  - **20 Sistemin 1 Aylık Disk Maliyeti:** Yalnızca **~50 MB**!
  - Veritabanı asla kontrolsüz büyümez ve disk doldurmaz.

---

## 3. Çift Veritabanı Motoru (Dual Database Engine)

### Motor 1: SQLite (WAL Modu — Varsayılan Sıfır-Bariyer Seçenek)
- **Kullanım Alanı:** 1 – 50 sunucu yöneten tüm homelab ve VPS kullanıcıları.
- **Avantajı:** Kutudan çıktığı gibi çalışır, sıfır harici bağımlılık, <30 MB RAM.

### Motor 2: PostgreSQL (Npgsql + Dapper.AOT — Kurumsal Ölçek Seçeneği)
- **Kullanım Alanı:** 50 – 200+ sunuculu kurumsal filolar veya harici veritabanı kümesi olan yapılar.
- **Aktifleştirme:** Ortam değişkeni ile tek satırda aktif edilir (`CORVUS_DATABASE_PROVIDER=PostgreSql`).

---

## 4. Topoloji ve İletişim Mimarisi

```
  [ Tarayıcı / Web UI ("Sistemler") ]
                 │ (HTTPS / WSS Canlı Yayın)
                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                   CORVUS HUB (Merkez)                       │
  │  - Web UI (React + Tailwind Midnight v2)                    │
  │  - Minimal API (.NET 9 Native AOT)                          │
  │  - TelemetryRingBuffer (360 KB RAM @ 50 Sistem)             │
  │  - MetricsBatchFlusher (60s Transactional Batch Write)      │
  │  - MetricsRetentionWorker (Otomatik 7g / 30g Budama)        │
  │  - Çift Yönlü Komut Tüneli (/api/v1/agent/tunnel)           │
  │  - Watchdog İzleyici (10s Online, 15s Degraded, 30s Offline)│
  └──────────────▲──────────────────────────────┬───────────────┘
                 │ (Giden TLS / Outbound WSS)   │ Dapper.AOT
                 │ Inbound Port: 0 !            ▼
  ┌──────────────┴──────────────┐ ┌─────────────────────────────┐
  │    CORVUS AGENT (Sistem)    │ │   SQLITE (WAL) / POSTGRES   │
  │   - Sistem Telemetrisi (3s) │ │   - systems                 │
  │   - Yerel Docker Soketi     │ │   - system_tokens           │
  │     (/var/run/docker.sock)  │ │   - system_metrics_1m (7g)  │
  └─────────────────────────────┘ │   - system_metrics_1h (30g) │
                                  │   - system_containers_cache │
                                  └─────────────────────────────┘
```

### Güvenlik Kuralları
1. **0 Inbound Port:** Uç sunucularda açık port bulunmaz; bağlantı her zaman Agent'tan Hub'a dışarıya (outbound WSS) kurulur.
2. **Kriptografik Token:** 32 bayt rastgele entropi (`crv_node_live_...`). Yalnızca SHA-256 özeti saklanır.
3. **Zamanlama Saldırısı Koruması:** `CryptographicOperations.FixedTimeEquals` sabit zamanlı fonksiyonu.
4. **Anında İptal (Revoke):** Token iptal edildiğinde tünel soketi `4401 PolicyViolation` ile anında sonlandırılır.
