# Corvus — Marka Kimliği ve Logo Kullanım Kılavuzu (Brand Guidelines)

> **"Ultra Hafif, Yerel ve Keskin Gözlemci"**  
> Corvus; homelab ortamları, VPS sunucuları ve self-hosted altyapılar için tasarlanmış ultra hafif (<30 MB RAM) Native AOT servis başlatıcı ve gözlemlenebilirlik kontrol panelidir.

---

## 🦅 1. Logo Konsepti ve Mimarisi (Hex Sentinel)

Corvus logosu, üç temel mühendislik ve marka değerinin saf geometrik kesişimidir:

1. **Monogram 'C':** Marka adı olan **Corvus**'un baş harfini temsil eder.
2. **Konteyner Altıgeni (Hexagon):** Docker konteynerlerini, sunucu düğümlerini ve homelab altyapısının modülerliğini simgeler.
3. **Nöbetçi Karga (Raven Sentinel):** Üst kolda ileriye doğru uzanan keskin gaga ve iç boşluktaki üçgen göz; sunucuları ve servisleri 24/7 uyumadan izleyen zeki ve çevik kargayı (*Corvus*) ifade eder.
4. **Aerodinamik Kanat/Tüy Çıkışı:** Alt koldaki 45° açılı pah kırma; .NET 9 Native AOT derlemesinin getirdiği sıfır-yansıma, düşük sürtünme ve yüksek hızı vurgular.

---

## 🎨 2. Renk Paleti (Monochrome / Siyah & Beyaz)

Corvus, geliştirici ve sistem yöneticisi estetiğine uygun olarak saf **monokrom (siyah & beyaz)** kimliği benimser:

| Renk Adı | HEX Kodu | RGB | Kullanım Alanı |
|---|---|---|---|
| **Obsidian Black** | `#000000` | `0, 0, 0` | Açık zeminler, baskı, monokrom belgeler |
| **Dark Slate (Ana Zemin)** | `#0B0F17` | `11, 15, 23` | Dashboard arayüzü, terminal, koyu arka planlar |
| **Pure White** | `#FFFFFF` | `255, 255, 255` | Koyu zeminlerde logo sembolü, başlıklar, kontrast metinler |
| **Border / Slate Muted** | `#1E293B` | `30, 41, 59` | Çerçeveler, ayrım çizgileri, ikincil rozetler |

---

## 📐 3. Güvenli Alan ve Minimum Boyutlar (Clear Space & Sizing)

* **Güvenli Alan (Clear Space):** Logonun çevresinde en az **1X** boşluk bırakılmalıdır. (1X = Logonun üst gaga üçgeninin taban genişliği). Hiçbir metin, buton veya görsel bu alana taşamaz.
* **Minimum Sembol Boyutu:** `16 × 16 px` (Tarayıcı faviconda veya menü tepsisinde netliği bozulmaz).
* **Minimum Yatay Logo Boyutu:** Yükseklik en az `28 px` olmalıdır (Kelime işaretinin okunabilirliği için).

---

## 📁 4. Varlıklar ve Dosya Formatları (Asset Inventory)

Tüm logolar ve ikonlar `docs/branding/` dizini altında organize edilmiştir:

```
docs/branding/
├── BRAND_GUIDELINES.md                 # Bu kullanım kılavuzu
├── svg/                                # Vektör Ana Dosyaları
│   ├── corvus-symbol-black.svg         # Saf siyah sembol (şeffaf zemin)
│   ├── corvus-symbol-white.svg         # Saf beyaz sembol (koyu zeminler için)
│   ├── corvus-symbol-dark-slate.svg    # Koyu arduvaz sembol
│   ├── corvus-symbol-badge-dark.svg    # Koyu kare kart üzerinde beyaz sembol
│   ├── corvus-lockup-horizontal-black.svg # Yatay logo (Siyah, açık zemin)
│   ├── corvus-lockup-horizontal-white.svg # Yatay logo (Beyaz, koyu zemin)
│   ├── corvus-lockup-stacked-black.svg    # Dikey / istifli logo (Siyah)
│   └── corvus-lockup-stacked-white.svg    # Dikey / istifli logo (Beyaz)
├── web-icons/                          # Web & Uygulama İkon Paketi
│   ├── favicon.ico                     # 16, 32, 48 px multi-res favicon
│   ├── corvus-favicon.svg              # Modern tarayıcılar için saf vektör favicon
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png            # iOS ana ekran (180x180)
│   ├── icon-192.png                    # Android / PWA
│   ├── icon-512.png                    # PWA Splash
│   ├── site.webmanifest                # Web uygulaması manifestosu
│   └── head-snippet.html               # HTML <head> içine eklenecek hazır kod
└── png/                                # Yüksek Çözünürlüklü Şeffaf PNG'ler
    ├── corvus-symbol-512.png
    ├── corvus-symbol-1024.png
    ├── corvus-lockup-black-1200.png
    └── corvus-lockup-white-1200.png
```

---

## 🚫 5. Hatalı Kullanımlar (Misuse Rules)

1. Logonun en-boy oranını bozacak şekilde esnetmeyin, basıklaştırmayın.
2. Logonun keskin köşelerine harici degrade (*gradient*) veya gölge (*drop-shadow*) ekleyerek geometriyi bulandırmayın.
3. Koyu zeminlerde siyah logoyu, açık zeminlerde beyaz logoyu görünürlüğü düşürecek şekilde kullanmayın.
4. Göz veya gaga oranlarını bağımsız olarak değiştirmeyin.
