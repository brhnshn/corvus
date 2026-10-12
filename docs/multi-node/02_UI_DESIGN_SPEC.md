# Corvus — Çoklu Sistem Tasarım Sistemi & UI Standartları (Midnight v2)

- **Durum:** Onaylandı & Standartlaştırıldı (RFC / Production Spec)
- **Tarih:** 2026-10-12
- **Hedef Versiyon:** Corvus v1.5.0+
- **Terminoloji:** **Sistemler** (İngilizce: **Systems**)
- **Tasarım Felsefesi:** Engelsiz, Akıcı, Hafif ve Veri Tasarruflu (Low-RAM & Downsampled Telemetry)
- **Tasarım Dili:** Corvus Midnight v2 (Derin Arduvaz & Fildişi/Gümüş Aksan)
- **İlgili Dosyalar:** `src/Corvus.Web/src/index.css`, `src/Corvus.Web/src/components/ui/*`, `src/Corvus.Web/src/pages/Systems/*`

---

## 1. Tasarım Felsefesi ve Kullanıcı Deneyimi İlkeleri

Corvus arayüzü; aşırı neon yeşillerden, karmaşık yapılandırma duvarlarından ve kullanıcıyı zorlayan yapay engellerden tamamen uzaktır.

Tasarım sistemi **Midnight v2** ve **Yalın Mühendislik** felsefesine dayanır:
1. **Sade ve Doğrudan Terminoloji:** Karmaşık veya abartılı isimler yerine doğrudan ve net olarak **"Sistemler"** (İngilizce: **"Systems"**) kullanılır.
2. **Kutudan Çıktığı Gibi Doğrudan Çalışma (Zero-Gatekeeping):** Hiçbir veritabanı önkoşulu veya yapılandırma engeli yoktur. Corvus Hub hem gömülü **SQLite (WAL)** hem de **PostgreSQL** ile doğrudan ve eksiksiz çalışır.
3. **RAM ve Veri Tasarrufu UX (Client-Side Memory Efficiency):**
   - Ana Sistemler genel bakış tablosunda yalnızca hafif **canlı tampon verisi (live rolling buffer)** tutulur; tarayıcı belleği gereksiz geçmiş veri noktalarıyla şişirilmez.
   - Detay kokpitindeki grafiklerde zaman filtreleri (**Son 1 Saat**, **24 Saat**, **7 Gün**) seçildiğinde sunucudan önceden hesaplanmış, optimize edilmiş özetler (downsampled / bucketed time-series) çekilir.
4. **Sakin, Derinlikli ve Odaklı Katmanlar:** Gözü yormayan derin arduvaz (`#0d0e15`) arka plan üzerinde, hafif opak ve 1px cam kenarlı (`surface`, `glass`, `sheet-glass`) paneller.
5. **Mat Gümüş / Fildişi Aksan Vurgusu:** Birincil etkileşim noktaları (`#d5d5dc` / `#eceef6`) fildişi ve mat gümüş tonlarında parlar.
6. **Tabüler ve Okunabilir Sayısal Veriler:** Tüm IP adresleri, bellek, CPU, disk, port ve zaman damgalarında her zaman hizalı `font-mono` (`JetBrains Mono` / `ui-monospace`).

---

## 2. Tasarım Değişkenleri & Renk Paleti (Midnight v2 Semantic Tokens)

| Token Adı | CSS Değişkeni | HEX / Değer | Kullanım Amacı & Anlamsal Karşılığı |
|---|---|---|---|
| **Canvas Background** | `--color-bg` / `--bg` | `#0d0e15` | Tüm uygulamanın ana gövde arka planı |
| **Panel / Card Surface** | `--color-panel` / `--panel` | `#1b1d2a` | Kartlar, paneller, kenar çubuğu (Sidebar) |
| **Primary Indicator** | `--color-indicator` / `--ind` | `#d5d5dc` | **Birincil aksan**, butonlar, aktif sekme hapları, fildişi rozetler |
| **Primary Text** | `--color-txt` / `--txt` | `#eceef6` | Başlıklar, metrik değerleri, birincil metinler |
| **Subdued / Muted Text** | `--color-sub` / `--sub` | `#9ba0b5` | İkincil metinler, etiketler, ölçü birimleri, IP adresleri |
| **Healthy / Online** | `--color-ok` / `--ok` | `#34d399` | Çevrimiçi durum noktası, normal tüketim çubukları (< 70%) |
| **Warning / Degraded** | `--color-warn` / `--wr` | `#fbbf24` | Uyarı / Yüksek kaynak tüketimi (%70 - %89), gecikmeli sinyal |
| **Error / Offline / Critical**| `--color-err` / `--er` | `#f87171` | Çevrimdışı sistemler, kesintiler, kritik tüketim (%90+) |
| **Informational / Tunnel** | `--color-info` / `--inf` | `#818cf8` | WebSocket tüneli, ağ verisi, IP/Host etiketleri |
| **Border Line** | `--line` | `rgba(255, 255, 255, 0.10)` | 1px cam kenar çizgileri |
| **Subtle Line** | `--line-subtle` | `rgba(255, 255, 255, 0.06)` | Ayırıcı çizgiler, iç hücre kenarlıkları |
| **Glass Surface** | `.surface` | `rgba(27, 29, 42, 0.90)` | Kart gölgeleri ve arka plan opaklığı |
| **Sheet Glass** | `.sheet-glass` | `rgba(27, 29, 42, 0.84)` | 24px blur ile alt çekmece (Sheet) ve modallar |

---

## 3. Ekran Hiyerarşisi ve Akıcı Kullanıcı Yolculuğu (User Journey)

Kullanıcı menüden `"Sistemler"` sekmesine tıkladığında doğrudan sayfa açılır:
1. **Henüz sistem eklenmemişse:** Zarif bir boş durum ([`SystemsEmptyState.tsx`](file:///c:/Users/sahin/Desktop/Projeler/Corvus/src/Corvus.Web/src/pages/Systems/SystemsEmptyState.tsx)) karşılar. *"Bağlı Sistem Bulunmuyor. İlk sunucunuzu eklemek için '+ Sistem Ekle' butonuna tıklayın."*
2. **`+ Sistem Ekle` Butonuna Tıklandığında:** Anında alttan açılan [`AddSystemSheet.tsx`](file:///c:/Users/sahin/Desktop/Projeler/Corvus/src/Corvus.Web/src/pages/Systems/AddSystemSheet/index.tsx) çekmecesi açılır, tek satırlık dinamik Docker komutunu üretir.
3. **Sistem bağlandığında:** Canlı telemetri eşleşir, sistem doğrudan listeye eklenir.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Corvus Sistemler Dashboard (/systems)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Header: "Sistemler"  |  6 Bağlı Sunucu  |  [+ Sistem Ekle] ]               │
│                                                                             │
│ [KPI Kartları: Toplam Sistem | Çevrimiçi | CPU Yükü | Toplam RAM | Konteyner]│
│                                                                             │
│ [Toolbar: Arama Kutusu | Filtreler (Tümü, Prod, Staging, Edge) | Sıralama]   │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ SystemRow #1: vps-frankfurt-01 (Ubuntu 24.04 | 185.12.x.x)              │ │
│ │ [CPU: %24] [RAM: 4.2/16 GB] [Disk: 42/120 GB] [14 Konteyner] [Terminal] │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ SystemRow #2: homelab-cluster (Debian 12 | 192.168.1.50)                │ │
│ │ [CPU: %12] [RAM: 8.1/32 GB] [Disk: 210/500 GB] [8 Konteyner] [Terminal] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ [Footer: Engine Badge -  SQLite (WAL) · 7 Günlük Saklama]                  │
└─────────────────────────────────────────────────────────────────────────────┘
          │ (Tıklanınca)                                    │ (Tıklanınca)
          ▼                                                 ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│ AddSystemSheet (Slide-Up Çekmece)    │  │ SystemDetailModal (Kokpit)        │
├──────────────────────────────────────┤  ├───────────────────────────────────┤
│ 1. Sistem Adı & Ortam (Prod/Edge)    │  │ [Header: vps-frankfurt-01 | IP]   │
│ 2. Kurulum Yöntemi (Docker / Binary) │  │ [Zaman Seçici: 1S | 24S | 7G]     │
│ 3. 1 Satırlık Dinamik Docker Komutu  │  │ [Sekmeler: Telemetri | Konteyner |│
│    (window.location.origin)          │  │            Donanım | Güvenlik]    │
│ 4. Canlı Dinleyici: "Ajan Bekleniyor"│  │ - Optimize CPU/RAM Sparkline      │
│    -> Eşleşti: "Bağlandı!"           │  │ - Uç Docker Konteyner Kontrolü    │
└──────────────────────────────────────┘  │ - Uzaktan Web Terminali Butonu    │
                                          └───────────────────────────────────┘
```

---

## 4. Ekran 1: Sistemler Genel Bakış (`SystemsOverviewPage`)

### 4.1. Üst Başlık ve KPI Sayaçları (`SystemsHeader.tsx` & `SystemsKpis.tsx`)
- **Başlık Alanı:**
  - Sol taraf: `"Sistemler"` başlığı (`text-xl font-bold text-[#eceef6]`), altında hafif gri açıklama: *"Bağlı sunucularınızın canlı sağlık durumu, kaynak tüketimi ve konteynerleri."*
  - Sağ taraf: Canlı yenileme butonu (`RefreshCw`), filtre temizleme ve **`+ Sistem Ekle`** birincil aksan butonu (`#d5d5dc` fildişi hap).
- **KPI Kartları (5'li Grid):**
  1. **Toplam Sistem:** Toplam kayıtlı sunucu sayısı (`font-mono text-2xl`).
  2. **Çevrimiçi / Canlı:** Yeşil atan nokta (`animate-dot-pulse`), örneğin `5/6 Çevrimiçi`.
  3. **Ortalama CPU Yükü:** Küme genelindeki çekirdek ağırlıklı CPU ortalaması (`%21.4`).
  4. **Toplam Bellek:** Tüketilen / Toplam RAM (`28.4 / 96.0 GB`).
  5. **Toplam Konteyner:** Bağlı tüm sistemlerde çalışan toplam Docker konteyneri (`48 Aktif`).

### 4.2. Arama & Filtreleme Çubuğu (`SystemsFilterBar.tsx`)
- **Arama Girdisi (`SearchInput.tsx`):**
  - Hostname, IP adresi, etiket veya işletim sistemine göre gerçek zamanlı filtreleme.
- **Ortam Hapları (`FilterChip.tsx`):**
  - `Tümü (All)`, `Production`, `Staging`, `Edge / Homelab`, `Kritik / Çevrimdışı`.
- **Sıralama Seçicisi:**
  - CPU Yüküne Göre, RAM Tüketimine Göre, Adına Göre (A-Z), Son Sinyal Zamanına Göre.

### 4.3. Sistem Kartı / Satırı (`SystemRow.tsx`)
Tablo yalnızca son canlı kalp atışından (heartbeat) gelen anlık tampon veriyi render eder:
- **Sol Blok (Kimlik & Lokasyon):**
  - Durum İndikatörü: 8px yuvarlak dot (Yeşil: Canlı, Kehribar: Gecikmeli Telemetri, Kırmızı: Kesinti).
  - Sistem Adı: `text-[15px] font-semibold text-[#eceef6]`.
  - Alt Satır: `font-mono text-xs text-[#9ba0b5]` ile Hostname ve IP adresi (`185.12.84.102`).
  - Rozetler: İşletim Sistemi (`Ubuntu 24.04`), Mimari (`x86_64` / `arm64`), Ortam Etiketi (`Prod`).
- **Orta Blok 1 (CPU & Yük):** Sayısal Yüzde + İnce 5px ilerleme çubuğu.
- **Orta Blok 2 (Bellek Kullanımı):** `4.2 / 16 GB` + İlerleme çubuğu.
- **Orta Blok 3 (Disk Doluluğu):** `42 / 120 GB` + İlerleme çubuğu.
- **Orta Blok 4 (Konteyner Durumu):** `Pill.tsx` rozeti: `14 Aktif`.
- **Sağ Blok (Hızlı Aksiyonlar):** `Terminal`, `Konteynerler`, `Detaylar →`.

### 4.4. Boş Durum Karşılama Ekranı (`SystemsEmptyState.tsx`)
- İkon: Sunucu ikonu (`Server` ikonu, `bg-white/5 p-4 rounded-3xl text-[#d5d5dc]`).
- Başlık: `"Bağlı Sistem Bulunmuyor"` (`text-lg font-semibold text-[#eceef6]`).
- Açıklama: *"Yeni bir sunucu ekleyerek kaynak tüketimini ve Docker konteynerlerini tek merkezden izlemeye başlayın."*
- Aksiyon Butonu: **`+ İlk Sistemi Ekle`** (Birincil buton, doğrudan `AddSystemSheet`'i açar).

### 4.5. Veritabanı Motor ve Saklama Bilgi Rozeti (`SystemsEngineBadge.tsx`)
Sayfa altında sade ve zarif bir bilgi rozeti:
- SQLite Durumu: `SQLite (WAL) · 7 Günlük Saklama` (Yeşil nokta ile).
- PostgreSQL Durumu: `PostgreSQL · Süresiz Saklama` (İndigo nokta ile).

---

## 5. Ekran 2: Yeni Sistem Ekleme Paneli (`AddSystemSheet.tsx`)

### 5.1. Sheet Yerleşimi ve Dinamik Komut
- Corvus'un standart `Sheet.tsx` altyapısı kullanılır (`sheet-glass`, `max-w-xl`, alttan yaylanarak açılır).
- **Dinamik 1 Satırlık Docker Komutu:** `window.location.origin` üzerinden çözümlenir (sıfır hardcoded URL).
- **Canlı Eşleşme Dinleyicisi:** Hedef sunucuda komut çalıştırıldığında ilk telemetriyi yakalar ve *"Bağlantı Başarılı!"* bildirimiyle tamamlar.

---

## 6. Ekran 3: Sistem Detay & Canlı Kokpit (`SystemDetailModal.tsx`)

### 6.1. Zaman Aralığı Seçici & Optimize Veri UX (`SystemTimeRangeSelector.tsx`)
Kullanıcı grafik zaman aralığını seçtiğinde Hub, veritabanından saniye bazlı milyonlarca satır çekmek yerine optimize edilmiş özetler döner:
- **Son 1 Saat (`1h`):** 1 dakikalık ortalamalar (60 veri noktası).
- **Son 24 Saat (`24h`):** 15 dakikalık ortalamalar (96 veri noktası).
- **Son 7 Gün (`7d`):** 2 saatlik ortalamalar (84 veri noktası).
Tarayıcı bellek kullanımı daima minimumda (< 5 MB) kalır, arayüz asla donmaz.

### 6.2. Kokpit Sekmeleri (`Segment.tsx`)
1. **Canlı Telemetri & Performans (`SystemTelemetryTab.tsx`)**
2. **Uç Konteynerler (`SystemContainersTab.tsx`)**
3. **Donanım & Sistem Özellikleri (`SystemHardwareTab.tsx`)**
4. **Güvenlik & Ajan Ayarları (`SystemSecurityTab.tsx`)**

---

## 7. Ekran 4: Uzaktan Web Terminali (`SystemTerminalModal.tsx`)

- `@xterm/xterm` + `@xterm/addon-fit`.
- Outbound WSS tüneli ile uzaktan kabuk erişimi (Sistemde port açma ihtiyacı yoktur).

---

## 8. Komponent Sorumluluk Tablosu (GEMINI.md Uyum Denetimi)

| Bileşen Dosyası | Sorumluluk Sınırı | Asla İçermeyeceği Şeyler |
|---|---|---|
| `SystemsOverviewPage.tsx` | Sayfa düzeni, layout, hook bağlama | Raw `fetch()`, devasa inline formlar |
| `SystemsEmptyState.tsx` | Sistem olmadığında karşılama ve ekleme CTA'sı | Liste döngüleri, terminal lojiği |
| `SystemsEngineBadge.tsx` | Veritabanı motoru ve saklama süresi rozeti | Veri çekme servisleri |
| `SystemsHeader.tsx` | Başlık, sayaçlar, ekle butonu | Veri filtreleme mantığı |
| `SystemsKpis.tsx` | Küme özet metrik kartları | Tekil sistem detayları |
| `SystemsFilterBar.tsx` | Arama ve etiket filtreleri | Veri çekme servisleri |
| `SystemRow.tsx` | Tek bir sistemin durum ve tampon metrikleri | Diğer sistemlerin state'i |
| `AddSystemSheet.tsx` | Yeni sistem ekleme çekmecesi | Sistem silme veya grafik çizimleri |
| `SystemDetailModal.tsx` | Tekil sistem kokpit sekme konteyneri | Filo geneli özet hesaplamaları |
| `SystemTerminalModal.tsx` | xterm.js Web terminali | Sistem düzenleme formları |
| `src/api/systems.ts` | Sistemler REST ve WebSocket istemcisi | JSX / UI bileşenleri |
| `src/utils/systemsUtils.ts` | URL oluşturma, formatlayıcılar | React State veya API çağrıları |
