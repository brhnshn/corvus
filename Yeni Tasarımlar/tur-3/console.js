// Tur 3 - Operasyon Konsolu Veri ve İş Mantığı
(function () {
  const SERVICES = [
    {
      id: 'jellyfin',
      name: 'jellyfin',
      type: 'container',
      tag: 'media',
      status: 'err',
      port: '8096',
      cpu: '0.0%',
      mem: '0 MB / 4 GB',
      image: 'jellyfin/jellyfin:10.9.11',
      uptime: '97.1%',
      exitCode: '137 (OOM)',
      downSince: '03:12:44',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0],
      logs: [
        { t: '03:12:40', lvl: 'INF', msg: 'Transcode task initialized for session 8a2f' },
        { t: '03:12:42', lvl: 'WRN', msg: 'Memory threshold exceeded: 3890MB / 4096MB' },
        { t: '03:12:44', lvl: 'ERR', msg: 'fatal: Out of memory (oom-killer invoked). Process terminated with exit 137' }
      ]
    },
    {
      id: 'gitea',
      name: 'gitea',
      type: 'service',
      tag: 'vcs',
      status: 'warn',
      port: '3000',
      cpu: '24.2%',
      mem: '420 MB',
      latency: '1840ms',
      image: 'gitea/gitea:1.22',
      uptime: '99.96%',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2],
      logs: [
        { t: '16:01:10', lvl: 'INF', msg: 'HTTP GET /api/v1/repos/sahin/corvus 200 (120ms)' },
        { t: '16:02:15', lvl: 'WRN', msg: 'Slow query detected on git_lfs_objects lookup: 1420ms' },
        { t: '16:03:00', lvl: 'WRN', msg: 'Average latency degraded above SLA threshold (1840ms > 500ms)' }
      ]
    },
    {
      id: 'vaultwarden',
      name: 'vaultwarden',
      type: 'service',
      tag: 'security',
      status: 'warn',
      port: '8080',
      cpu: '1.2%',
      mem: '88 MB',
      latency: '88ms',
      sslDays: 9,
      image: 'vaultwarden/server:1.32',
      uptime: '100%',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      logs: [
        { t: '07:05:12', lvl: 'WRN', msg: 'Let\'s Encrypt ACME challenge failed for vault.sahin.dev' },
        { t: '07:05:13', lvl: 'WRN', msg: 'TLS certificate expiration warning: 9 days remaining' },
        { t: '14:22:01', lvl: 'INF', msg: 'Client vault synchronized successfully' }
      ]
    },
    {
      id: 'traefik',
      name: 'traefik',
      type: 'proxy',
      tag: 'gateway',
      status: 'ok',
      port: '80/443',
      cpu: '3.4%',
      mem: '142 MB',
      latency: '3ms',
      image: 'traefik:v3.2',
      uptime: '100%',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      logs: [
        { t: '16:04:12', lvl: 'INF', msg: 'Entrypoint https: route cloud.sahin.dev -> nextcloud:80 [200 OK]' },
        { t: '16:04:19', lvl: 'INF', msg: 'Entrypoint https: route git.sahin.dev -> gitea:3000 [200 OK]' }
      ]
    },
    {
      id: 'nextcloud',
      name: 'nextcloud',
      type: 'service',
      tag: 'cloud',
      status: 'ok',
      port: '80',
      cpu: '5.1%',
      mem: '1.1 GB',
      latency: '142ms',
      image: 'nextcloud:29',
      uptime: '99.98%',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      logs: [
        { t: '15:58:30', lvl: 'INF', msg: 'Cron task background jobs completed in 1.4s' },
        { t: '16:00:12', lvl: 'INF', msg: 'WebDAV sync lock released for user sahin' }
      ]
    },
    {
      id: 'immich',
      name: 'immich',
      type: 'service',
      tag: 'photos',
      status: 'ok',
      port: '2283',
      cpu: '7.8%',
      mem: '760 MB',
      latency: '210ms',
      image: 'immich-server:v1.119',
      uptime: '99.95%',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      logs: [
        { t: '15:48:00', lvl: 'INF', msg: 'Successfully migrated schema to immich v1.119' },
        { t: '16:02:11', lvl: 'INF', msg: 'Dispatched 48 images to ML pipeline queue' }
      ]
    },
    {
      id: 'immich-ml',
      name: 'immich-ml',
      type: 'container',
      tag: 'ml-worker',
      status: 'ok',
      port: '3003',
      cpu: '31.2%',
      mem: '2.4 GB',
      image: 'immich-ml:v1.119',
      uptime: '100%',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      logs: [
        { t: '16:03:00', lvl: 'INF', msg: 'Facial recognition batch #142 loaded on CPU threads' },
        { t: '16:03:45', lvl: 'INF', msg: 'Processed 120 vector embeddings (avg 18ms/vector)' }
      ]
    },
    {
      id: 'postgres',
      name: 'postgres',
      type: 'database',
      tag: 'db',
      status: 'ok',
      port: '5432',
      cpu: '2.8%',
      mem: '890 MB',
      image: 'postgres:16',
      uptime: '100%',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      logs: [
        { t: '15:30:00', lvl: 'INF', msg: 'checkpoint complete: wrote 412 buffers (2.1%); 0 WAL file(s) added' }
      ]
    },
    {
      id: 'home-assistant',
      name: 'home-assistant',
      type: 'service',
      tag: 'iot',
      status: 'ok',
      port: '8123',
      cpu: '3.1%',
      mem: '620 MB',
      latency: '34ms',
      image: 'home-assistant:2026.10',
      uptime: '100%',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      logs: [
        { t: '16:00:00', lvl: 'INF', msg: 'Zigbee coordinator poll: 24 active devices responded' }
      ]
    },
    {
      id: 'paperless',
      name: 'paperless',
      type: 'service',
      tag: 'dms',
      status: 'ok',
      port: '8000',
      cpu: '1.4%',
      mem: '410 MB',
      latency: '96ms',
      image: 'paperless-ngx:2.12',
      uptime: '99.91%',
      history: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      logs: [
        { t: '09:15:20', lvl: 'INF', msg: 'OCR pipeline processed invoice_202610.pdf (3 pages)' }
      ]
    }
  ];

  // Topoloji Düğüm & Bağlantı Yerleşimi (Kompakt ve Dengeli Grid)
  const NODES = [
    { id: 'traefik', x: 280, y: 35, label: 'traefik (proxy)', sub: ':80/:443' },
    { id: 'nextcloud', x: 80, y: 130, label: 'nextcloud', sub: 'cloud.sahin.dev' },
    { id: 'immich', x: 280, y: 130, label: 'immich', sub: 'photos.sahin.dev' },
    { id: 'gitea', x: 480, y: 130, label: 'gitea', sub: 'git.sahin.dev' },
    { id: 'vaultwarden', x: 620, y: 130, label: 'vaultwarden', sub: 'vault.sahin.dev' },
    { id: 'immich-ml', x: 280, y: 230, label: 'immich-ml (worker)', sub: 'cpu: %31.2' },
    { id: 'postgres', x: 180, y: 230, label: 'postgres:16', sub: 'core-db :5432' },
    { id: 'jellyfin', x: 480, y: 230, label: 'jellyfin (media)', sub: 'EXITED 137' },
    { id: 'home-assistant', x: 80, y: 230, label: 'home-assistant', sub: 'iot :8123' },
    { id: 'paperless', x: 620, y: 230, label: 'paperless', sub: 'dms :8000' }
  ];

  const EDGES = [
    { from: 'traefik', to: 'nextcloud' },
    { from: 'traefik', to: 'immich' },
    { from: 'traefik', to: 'gitea' },
    { from: 'traefik', to: 'vaultwarden' },
    { from: 'immich', to: 'immich-ml' },
    { from: 'immich', to: 'postgres' },
    { from: 'nextcloud', to: 'postgres' },
    { from: 'gitea', to: 'postgres' },
    { from: 'traefik', to: 'jellyfin', broken: true }
  ];

  let selectedId = 'jellyfin';
  let searchQuery = '';

  const $ = (s) => document.querySelector(s);

  function getService(id) {
    return SERVICES.find(s => s.id === id) || SERVICES[0];
  }

  // 1. Sol Panel: Servis Envanterini Çiz
  function renderInventory() {
    const list = $('#serviceList');
    const filtered = SERVICES.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    list.innerHTML = filtered.map(s => {
      const isSel = s.id === selectedId;
      const metricText = s.status === 'err' ? 'CRASH' : (s.latency || s.cpu);
      const metricClass = s.status === 'err' ? 'err' : (s.status === 'warn' ? 'warn' : '');
      
      const bars = s.history.map(h => {
        const cls = h === 0 ? 'down' : (h === 2 ? 'degraded' : '');
        return `<span class="${cls}"></span>`;
      }).join('');

      return `
        <li class="service-row ${isSel ? 'selected' : ''}" data-id="${s.id}">
          <span class="status-indicator ${s.status}"></span>
          <div class="svc-info">
            <div class="svc-name">
              <span>${s.name}</span>
              <span class="svc-tag">${s.tag}</span>
            </div>
            <div class="svc-meta">${s.type} · :${s.port}</div>
          </div>
          <div class="svc-metrics">
            <div class="svc-metric-val ${metricClass}">${metricText}</div>
            <div class="svc-uptime-bar">${bars}</div>
          </div>
        </li>
      `;
    }).join('');

    $('#inventoryCount').textContent = `${SERVICES.length}`;
  }

  // 2. Merkez Panel: Topoloji Ağ Haritası
  function renderTopology() {
    const svg = $('#topologySvg');
    const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

    let edgesHtml = EDGES.map(e => {
      const n1 = nodeMap[e.from];
      const n2 = nodeMap[e.to];
      if (!n1 || !n2) return '';
      const cls = e.broken ? 'broken' : 'active';
      return `<path class="topo-edge ${cls}" d="M${n1.x + 60},${n1.y + 20} L${n2.x + 60},${n2.y + 20}" />`;
    }).join('');

    let nodesHtml = NODES.map(n => {
      const svc = getService(n.id);
      const isSel = n.id === selectedId;
      const statusClass = svc.status;

      return `
        <g class="topo-node ${isSel ? 'selected' : ''} ${statusClass}" data-id="${n.id}" transform="translate(${n.x}, ${n.y})">
          <rect class="topo-node-box" width="130" height="42" />
          <circle cx="12" cy="18" r="4" fill="${svc.status === 'err' ? 'var(--status-err)' : (svc.status === 'warn' ? 'var(--status-warn)' : 'var(--status-ok)')}" />
          <text x="24" y="21">${n.label}</text>
          <text class="sub" x="24" y="34">${n.sub}</text>
        </g>
      `;
    }).join('');

    svg.innerHTML = edgesHtml + nodesHtml;
  }

  // 3. Sağ Panel: Mühendislik Detayı & Canlı Log Akışı
  function renderDetail() {
    const svc = getService(selectedId);
    
    // Üst Hero
    $('#detailTitle').textContent = svc.name;
    const pill = $('#detailStatusPill');
    pill.className = `detail-status-pill ${svc.status}`;
    pill.textContent = svc.status === 'err' ? 'CRITICAL FAILURE' : (svc.status === 'warn' ? 'DEGRADED / WARN' : 'OPERATIONAL');

    // Aksiyon Butonları
    const actionsContainer = $('#detailActions');
    if (svc.status === 'err') {
      actionsContainer.innerHTML = `
        <button class="btn-action primary" id="btnRestart">⚡ Yeniden Başlat (docker restart)</button>
        <button class="btn-action" id="btnLogs">Logları İncele</button>
      `;
    } else if (svc.status === 'warn') {
      actionsContainer.innerHTML = `
        <button class="btn-action primary" id="btnFix">Sorunu Çöz / Yenile</button>
        <button class="btn-action" id="btnLogs">Logları İncele</button>
      `;
    } else {
      actionsContainer.innerHTML = `
        <button class="btn-action" id="btnRestart">Restart</button>
        <button class="btn-action" id="btnExec">Exec Terminal</button>
      `;
    }

    // Teknik Özellikler (Specs)
    $('#detailSpecs').innerHTML = `
      <dt>Image</dt><dd>${svc.image}</dd>
      <dt>Ports</dt><dd>0.0.0.0:${svc.port} -> ${svc.port}/tcp</dd>
      <dt>Uptime 30d</dt><dd>${svc.uptime}</dd>
      <dt>CPU / RAM</dt><dd>${svc.cpu} · ${svc.mem}</dd>
      ${svc.exitCode ? `<dt style="color:var(--status-err)">Exit Code</dt><dd style="color:var(--status-err)">${svc.exitCode}</dd>` : ''}
      ${svc.latency ? `<dt>Latency</dt><dd>${svc.latency}</dd>` : ''}
      ${svc.sslDays ? `<dt style="color:var(--status-warn)">SSL Expiry</dt><dd style="color:var(--status-warn)">${svc.sslDays} days</dd>` : ''}
    `;

    // Log Akışı
    const logBox = $('#detailLogStream');
    logBox.innerHTML = svc.logs.map(l => `
      <div class="log-line">
        <span class="log-time">${l.t}</span>
        <span class="log-lvl ${l.lvl}">[${l.lvl}]</span>
        <span class="log-msg">${l.msg}</span>
      </div>
    `).join('');
    logBox.scrollTop = logBox.scrollHeight;
  }

  // Aksiyon Tetikleme Mantığı (Hızlı Geri Bildirim)
  function setupActions() {
    $('#serviceList').addEventListener('click', (e) => {
      const row = e.target.closest('.service-row');
      if (row) {
        selectedId = row.dataset.id;
        renderAll();
      }
    });

    $('#topologySvg').addEventListener('click', (e) => {
      const node = e.target.closest('.topo-node');
      if (node) {
        selectedId = node.dataset.id;
        renderAll();
      }
    });

    $('#searchInput').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderInventory();
    });

    $('#detailActions').addEventListener('click', (e) => {
      const svc = getService(selectedId);
      if (e.target.id === 'btnRestart' || e.target.id === 'btnFix') {
        // Durumu anında yeşile çek
        svc.status = 'ok';
        if (svc.latency) svc.latency = '120ms';
        if (svc.exitCode) delete svc.exitCode;
        if (svc.sslDays) svc.sslDays = 90;
        svc.history[svc.history.length - 1] = 1;
        svc.logs.push({
          t: new Date().toTimeString().slice(0, 8),
          lvl: 'INF',
          msg: `Operasyon başarılı: ${svc.name} servisi nominal operasyonel duruma döndü.`
        });
        
        // Alert barı gizle/güncelle
        const activeAlert = SERVICES.find(s => s.status === 'err');
        if (!activeAlert) {
          $('#alertStrip').style.display = 'none';
        }
        renderAll();
      }
    });

    // Alert Strip doğrudan çözme butonu
    $('#alertFixBtn').addEventListener('click', () => {
      const jelly = getService('jellyfin');
      jelly.status = 'ok';
      delete jelly.exitCode;
      jelly.history[jelly.history.length - 1] = 1;
      $('#alertStrip').style.display = 'none';
      selectedId = 'jellyfin';
      renderAll();
    });
  }

  function renderAll() {
    renderInventory();
    renderTopology();
    renderDetail();
  }

  window.initConsole = function () {
    renderAll();
    setupActions();
  };
})();
