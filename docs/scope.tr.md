<div align="center">

[![English](https://img.shields.io/badge/Language-English-blue?style=for-the-badge)](scope.md)
[![Türkçe](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red?style=for-the-badge)](scope.tr.md)

</div>

# Corvus — Kapsam ve Mimari İlkeler

## 1. Temel İlke

Corvus, belirli bir kişinin veya kurulumun paneli değildir. Açık kaynak bir proje olarak **herhangi bir self-hosted sunucu için genel bir izleme + launcher paneli**dir. Geliştiricinin kendi sunucusu yalnızca ilk geliştirme/test senaryosudur — ürün hiçbir sağlayıcıya bağımlı değildir.

---

## 2. Servis Keşfi: İki Modlu Yaklaşım

### A) Otomatik Keşif (varsayılan)
- Docker socket'e bağlanıp sunucuda çalışan container'ları otomatik algılar.
- Herhangi bir reverse proxy'e (Caddy, Traefik, Nginx) veya orkestrasyon aracına (Coolify, Portainer) bağımlı değildir — standart Docker API'sini kullanır.
- Container bilgisi (isim, port, durum, kaynak kullanımı) otomatik çekilir.
- Docker label'ları (`corvus.name`, `corvus.category`, `corvus.url`, `corvus.healthcheck`, `corvus.icon`, `corvus.ignore`) üzerinden metadata zenginleştirilebilir.
- Docker Compose projelerine göre otomatik hiyerarşik gruplama (`com.docker.compose.project`) desteklenir.

### B) Manuel Ekleme
- Docker socket'in erişemediği servisler için (uzak sunucu, harici SaaS, IoT cihaz, farklı bir ağdaki servis).
- Kullanıcı arayüzden URL/IP, isim, kategori, açıklama, kontrol türü (HTTP/HTTPS veya TCP Port Ping) ve halka açık durum sayfası görünürlüğü tanımlayabilir.
- Servisler arayüzden yukarı/aşağı butonlarıyla özel olarak sıralanabilir (`display_order`).

---

## 3. Dış Bağımsızlık ve Entegrasyon Çerçevesi

| Alan | Kişisel Kurulum | Corvus Genel Yaklaşımı |
|---|---|---|
| Reverse proxy | Caddy | Herhangi bir proxy ile çalışır. Ters vekil başlıkları (`Tailscale-User-Login`, `Cf-Access-Authenticated-User-Email`, `Remote-User`, `X-Forwarded-User`) üzerinden Zero-Trust SSO otomatik desteklenir. |
| Orkestrasyon | Coolify / Portainer | Doğrudan standart Docker socket (`/var/run/docker.sock`) okur, harici araca bağımlı değildir. |
| Ağ / VPN | Tailscale | Özel ağ gerektirmez; yerel ağ, WireGuard veya açık internet üzerinde eşit kararlılıkla çalışır. |
| Backup / Cron Bildirimi | `/opt/scripts/backup.sh` | **Dead Man's Snitch** push altyapısı (`/api/push/{token}`). Beklenen periyot ve tolerans süresi aşıldığında otomatik alarm üretir. |
| Alarm ve Bildirim | — | Çok kanallı yerleşik bildirim motoru: Discord, Telegram, SMTP E-posta, Slack Webhook, Ntfy/Gotify ve Generic Webhook; akıllı dalgalanma (flapping) koruması. |
| Konteyner Terminali, Temizlik & Yaşam Döngüsü | — | Tarayıcı üzerinden sıfır tahsisatlı Web Terminali (`/api/containers/{id}/terminal`, kabuk zinciri), iki aşamalı güvenli kuru çalıştırmalı sistem temizliği (`/api/containers/prune/selective`, hacim koruması) ve canlı sıfır kesintili kaynak düzenleme destekli detay modalı (`/api/containers/{id}/update`). |
| Telemetri Seyreltme | — | Çift aşamalı veri saklama (7g ham, 365g saatlik rollup) ile hafif veritabanı ve akıcı 30g/90g/1y zaman serisi grafikleri. |
| Ortam Etiketleri & Kategorilendirme | — | Çoklu ortam etiketleme (Prod, Staging, DB, Internal, API) ile deterministik renk algoritması, çip girişleri, anlık sayaçlı filtre çubuğu, Docker etiket çıkarımı (corvus.tags, environment, env) ve kalıcı SQLite override güvencesi. |
| Canlı İletişim | — | Server-Sent Events (SSE) ile `/api/stream/events` ve gerçek zamanlı konteyner log akışı (`/api/containers/{id}/logs/stream`). |

---

## 4. UI ve Tasarım İlkeleri

- Tamamen mobil ve tablet duyarlı: Slide-over drawer, sticky mobil başlık, çift modlu tablolar ve kartlar.
- Halka Açık Durum Sayfası: Giriş gerektirmeyen, bağımsız `/status` arayüzü.
- Performans: Rotalar `React.lazy` ile bölünmüş, vendor paketleri ayrıştırılmış, Vite minification limitlerine (<200 KB) tam uyumlu.
