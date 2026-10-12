# Corvus — Çoklu Sistem Yönetimi İş Akışı (Systems Workflow)

- **Durum:** Onaylandı & Kesinleşti (v4.0)
- **Tarih:** 2026-10-12
- **Hedef Versiyon:** Corvus v1.5.0+
- **Terminoloji:** **"Sistemler"** (İngilizce: **"Systems"**)
- **İlgili Spesifikasyon:** [BACKEND_PROTOCOL_SPEC.md](file:///c:/Users/sahin/Desktop/Projeler/Corvus/docs/multi-node/BACKEND_PROTOCOL_SPEC.md)

---

## 1. Uçtan Uca Kullanıcı Deneyimi (Step-by-Step)

```
[ Kullanıcı Corvus Paneline Girer ]
                 │
                 ▼
[ Menüden "Sistemler" Tıklanır ]
                 │
                 ▼
[ Bağlı Tüm Sunucular ve Canlı Kaynaklar Listelenir (Kutudan Çıktığı Gibi Hazır) ]
                 │
   ┌─────────────┴────────────────────────────────┐
   │                                              │
[ "+ Sistem Ekle" Tıklanır ]            [ Bir Sistem Satırına Tıklanır ]
   │                                              │
   ▼                                              ▼
[ 1 Satırlık Docker Komutu Alınır ]      [ Sistem Detay / Kokpit Ekranı ]
   │                                     - RAM'den Canlı Grafikler (3s)
   ▼                                     - O Sunucuya Ait Konteynerler
[ Hedef Sunucuya Yapıştırılır ]          - Uzaktan xterm.js Terminali (Exec)
   │                                     - Konteyner Başlat/Durdur/Loglar
   ▼
[ Canlı Dinleyici Eşleşir: "Bağlandı!" ]
   │
   ▼
[ Sistem Listeye Eklenir ]
```

---

## 2. Ajan Yaşam Döngüsü ve İletişim Akışı

```
┌──────────────┐                  ┌────────────┐                  ┌───────────────────┐
│ Corvus Agent │                  │ Corvus Hub │                  │ TelemetryRingBuff │
│   (Sistem)   │                  │  (Merkez)  │                  │    (In-Memory)    │
└──────┬───────┘                  └─────┬──────┘                  └─────────┬─────────┘
       │                                │                                   │
       │ 1. Outbound WSS Handshake      │                                   │
       │───────────────────────────────>│                                   │
       │  (Authorization: Bearer KEY)   │ 2. SHA-256 + FixedTimeEquals      │
       │                                │                                   │
       │ 3. 101 Switching Protocols     │                                   │
       │<───────────────────────────────│                                   │
       │                                │                                   │
       │ 4. Telemetry Frame (Her 3s)    │                                   │
       │───────────────────────────────>│ 5. Push Live Telemetry (120 B)   │
       │                                │──────────────────────────────────>│
       │<───────────────────────────────│                                   │
       │    heartbeat_ack               │ 6. Web UI Canlı SSE/WS Yayını     │
       │                                │    (Disk I/O = 0!)                │
       │                                │                                   │
       │                                │ 7. Her 60s: Batch Disk Flush      │
       │                                │    - 1m Özet Satırı Oluşturulur   │
       │                                │    - Tek Transaction / SQLite WAL │
       │                                │                                   │
       │                                │ 8. Web UI Konteyner Durdur        │
       │ 9. docker_req (stop container) │<──────────────────────────────────│ (Kullanıcı)
       │<───────────────────────────────│                                   │
       │ 10. Local Docker Socket Exec   │                                   │
       │ 11. docker_res (success: true) │                                   │
       │───────────────────────────────>│ 12. Web UI Anında Güncelleme      │
```

### Aşama 1: Sistem Kaydı ve El Sıkışma (Registration & Handshake)
1. Kullanıcı sol menüden **"Sistemler"** sayfasına girer ve sağ üstteki **"+ Sistem Ekle"** butonuna basar.
2. Sistem adını (örn: `vps-frankfurt-01`) ve opsiyonel etiketleri (`["prod", "hetzner"]`) girer.
3. Hub, `POST /api/v1/systems` çağrısı ile:
   - Benzersiz UUID (`systemId`) ve 32 bayt rastgele anahtar üretir (`crv_node_live_...`).
   - Token'ın SHA-256 özetini veritabanına (`system_tokens`) yazar.
   - Kullanıcıya kopyalanabilir tek satırlık Docker komutunu üretir:
     ```bash
     docker run -d --name corvus-agent --restart unless-stopped \
       -v /var/run/docker.sock:/var/run/docker.sock \
       -e CORVUS_HUB_URL="${CORVUS_HUB_URL}" \
       -e CORVUS_NODE_KEY="${CORVUS_NODE_KEY}" \
       ghcr.io/corvus/agent:latest
     ```
4. Ajan hedef sunucuda başladığında Hub'ın `WSS /api/v1/agent/tunnel` adresine bağlanır.
5. Hub, gelen anahtarı `CryptographicOperations.FixedTimeEquals` ile doğrular ve bağlantıyı açar. Modal üzerindeki dinleyici anında yeşile dönerek *"Bağlantı Başarılı!"* der.

---

### Aşama 2: Yüksek Hızlı Telemetri ve In-Memory Ring Buffer
- **Ajan Tarafı:** Her 3 saniyede bir hafif bir struct paketi (120 bayt) gönderir.
- **Hub Bellek Katmanı:** Gelen veriler `TelemetryRingBuffer` içinde saklanır (düğüm başına son 60 nokta = 3 dakika, 7.2 KB RAM).
- **Web UI:** Canlı grafikler doğrudan RAM tamponundan beslenir; diske anlık yazma yapılmaz.
- **Toplu Disk Yazımı (Batch Flusher):** Tam **60 saniyede bir** (1 dakika) arka plan servisi devreye girerek 60 saniyelik ortalamayı hesaplar ve tek bir transaction içinde SQLite (veya PostgreSQL)'e yazar (~2–5 ms).
- **Saklama ve Budama:**
  - 1 dakikalık özetler: 7 gün saklanır.
  - 1 saatlik ortalamalar: 30 gün saklanır.
  - 30 günden eski kayıtlar: Her gece `MetricsRetentionWorker` tarafından otomatik silinir. 1 sistemin 1 aylık disk maliyeti yalnızca **~2.5 MB**'tır.

---

### Aşama 3: Watchdog ve Kesinti Tespiti
- $\le 10\text{s}$: Sistem `online` (yeşil).
- $> 15\text{s}$: Sistem `degraded` (sarı).
- $> 30\text{s}$: Sistem `offline` (kırmızı). Kesinti `activity_logs` tablosuna işlenir ve bildirim kanallarına gönderilir.
- Bağlantı koptuğunda Ajan, $\pm \%20$ jitter destekli üstel geri çekilme algoritması ile ($2\text{s} \to 60\text{s}$) yeniden bağlanmayı dener.

---

### Aşama 4: Uzaktan Docker Yönetimi ve İnteraktif Terminal
- **Konteyner Yaşam Döngüsü:** Başlat / Durdur / Yeniden Başlat komutları WSS tüneli üzerinden JSON RPC mesajı (`type: "docker_req"`) olarak iletilir. Ajan yerel Docker soketinde işlemi yapıp sonucu döner.
- **xterm.js Web Terminali:** Zero-copy ikili çerçeveleme (Opcode `0x01` veri akışı, `0x02` ekran yeniden boyutlandırma) ile tarayıcıdaki terminal doğrudan uç sunucudaki konteyner kabuğuna bağlanır.
