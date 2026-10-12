/* Tur 2 — sahte veri. Tüm varyantlar aynı veriyi gösterir. "Şimdi" = 16:05 kabul edildi. */
window.CORVUS = {
  host: { name: 'homelab-01', uptimeDays: 41 },
  items: [
    { id: 'jellyfin', addr: 'media.sahin.lan', status: 'err', word: 'Durdu.',
      why: "Gece 03:12'de bellek yetersizliğinden kapandı (exit 137). 13 saattir erişilemiyor.",
      actions: ['Yeniden başlat', 'Loglar'], base: 180, unit: 'ms', image: 'jellyfin/jellyfin:10.9.11',
      uptime: '97,1', segs: [[46.7, 100, 'err']], days: { e: [29] } },
    { id: 'gitea', addr: 'git.sahin.dev', status: 'warn', word: 'Yavaşladı.',
      why: '14 dakikadır ortalama 1,8 saniyede yanıt veriyor; normali 120 ms civarı.',
      actions: ['Loglar', 'Yeniden başlat'], ms: 1840, base: 120, unit: 'ms', image: 'gitea/gitea:1.22',
      uptime: '99,96', segs: [[99, 100, 'warn']], days: { w: [21, 29] } },
    { id: 'vaultwarden', addr: 'vault.sahin.dev', status: 'warn', word: 'Sertifika bitiyor.',
      why: 'TLS sertifikasının süresi 9 gün sonra doluyor; otomatik yenileme iki kez başarısız oldu.',
      actions: ['Şimdi yenile', 'Ertele'], ms: 88, base: 88, unit: 'ms', image: 'vaultwarden/server:1.32',
      uptime: '100', segs: [] },
    { id: 'nextcloud', addr: 'cloud.sahin.dev', status: 'ok', ms: 142, base: 142, unit: 'ms', image: 'nextcloud:29', uptime: '99,98', segs: [] },
    { id: 'immich', addr: 'photos.sahin.dev', status: 'ok', ms: 210, base: 210, unit: 'ms', image: 'immich-server:v1.119', uptime: '99,95', segs: [[82, 84, 'warn']], days: { w: [11] } },
    { id: 'home-assistant', addr: 'ha.sahin.lan', status: 'ok', ms: 34, base: 34, unit: 'ms', image: 'home-assistant:2026.10', uptime: '100', segs: [] },
    { id: 'paperless', addr: 'docs.sahin.lan', status: 'ok', ms: 96, base: 96, unit: 'ms', image: 'paperless-ngx:2.12', uptime: '99,91', segs: [[56, 57, 'err']], days: { e: [4] } },
    { id: 'pihole', addr: 'dns.sahin.lan', status: 'ok', ms: 12, base: 12, unit: 'ms', image: 'pihole:2026.09', uptime: '100', segs: [] },
    { id: 'traefik', addr: 'dış ağ :443', status: 'ok', ms: 3, base: 3, unit: 'ms', image: 'traefik:v3.2', uptime: '100', segs: [] },
    { id: 'postgres', addr: 'iç ağ :5432', status: 'ok', note: '890 MB', base: 3, unit: '% işlemci', image: 'postgres:16', uptime: '100', segs: [] },
    { id: 'redis', addr: 'iç ağ :6379', status: 'ok', note: '64 MB', base: 1, unit: '% işlemci', image: 'redis:7', uptime: '100', segs: [] },
    { id: 'immich-ml', addr: 'iç ağ', status: 'ok', note: '%31 işlemci', base: 31, unit: '% işlemci', image: 'immich-ml:v1.119', uptime: '100', segs: [] },
  ],
  edges: [
    ['traefik', 'nextcloud'], ['traefik', 'immich'], ['traefik', 'gitea'], ['traefik', 'vaultwarden'],
    ['traefik', 'jellyfin'], ['traefik', 'paperless'], ['traefik', 'home-assistant'],
    ['nextcloud', 'postgres'], ['nextcloud', 'redis'], ['immich', 'postgres'], ['immich', 'redis'],
    ['immich', 'immich-ml'], ['gitea', 'postgres'], ['paperless', 'postgres'], ['paperless', 'redis'],
  ],
  events: [
    { t: '16:02', id: 'gitea', c: 'warn', txt: 'yanıt süresi 1,8 saniyeye çıktı.' },
    { t: '15:48', id: 'immich', c: 'ok', txt: '1.118 sürümünden 1.119 sürümüne güncellendi.' },
    { t: '14:30', id: null, c: 'ok', txt: 'Gece yedeği tamamlandı, 38,2 GB.' },
    { t: '11:40', id: 'immich', c: 'warn', txt: 'yarım saat boyunca yavaş yanıt verdi (640 ms).' },
    { t: '07:05', id: 'vaultwarden', c: 'warn', txt: 'sertifika yenileme ikinci kez başarısız oldu.' },
    { t: '05:30', id: 'paperless', c: 'err', txt: '4 dakika erişilemedi, kendiliğinden düzeldi.' },
    { t: '03:12', id: 'jellyfin', c: 'err', txt: 'bellek yetersizliğinden durdu.' },
  ],
};

/* Sahte zaman serisi üretici (deterministik) */
window.CORVUS.series = function (item) {
  let h = 0; for (const ch of item.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  const pts = [];
  for (let k = 0; k < 96; k++) {
    const pct = (k / 95) * 100;
    let v = item.base * (0.85 + rnd() * 0.3) + Math.sin(k / 7) * item.base * 0.08;
    for (const [a, b, c] of item.segs) {
      if (pct >= a && pct <= b) v = c === 'err' ? null : item.base * (item.id === 'gitea' ? 15 : 3);
    }
    pts.push(v);
  }
  return pts;
};
