/* Tur 2 — genel bakış ekranı (A, B, C ortak) */
(function () {
  const D = window.CORVUS;
  const C = (window.Corvus = window.Corvus || {});
  const $ = (s) => document.querySelector(s);
  const COUNT = ['Hiçbir şey', 'Bir şey', 'İki şey', 'Üç şey', 'Dört şey', 'Beş şey'];
  const DONE = {
    'Yeniden başlat': 'yeniden başlatıldı, tekrar yanıt veriyor.',
    'Şimdi yenile': 'sertifikası yenilendi, 90 gün geçerli.',
    'Ertele': 'uyarısı yarına ertelendi.',
  };

  C.colorVar = (c) => (c === 'err' ? 'var(--err)' : c === 'warn' ? 'var(--warn)' : 'var(--ok)');
  C.issues = () => D.items.filter((i) => i.status !== 'ok');
  C.byId = (id) => D.items.find((i) => i.id === id);
  C.nowHM = () => new Date().toTimeString().slice(0, 5);

  C.toast = function (msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
  };

  C.eventsHtml = (list) => list.map((e) =>
    `<li><time class="num">${e.t}</time><p>${e.id ? `<b class="${e.c !== 'ok' ? 'is-' + e.c : ''}">${e.id}</b> ` : ''}${e.txt}</p></li>`
  ).join('');

  function skeleton() {
    return `
    <header class="bar">
      <span class="brand">corvus</span><span>${D.host.name}</span><span class="spacer"></span>
      <button class="search" data-open-palette><span>Bir şey ara ya da yap</span><kbd>/</kbd></button>
      <span class="num" id="clock"></span>
    </header>
    <main class="page" id="overview">
      <h1 class="status" id="status"></h1>
      <section class="section" id="attentionSection"><div id="attention"></div></section>
      <section class="section">
        <h2 class="section-h">Sakin olanlar <span>yanıt süresi ya da yük</span></h2>
        <div class="calm" id="calm"></div>
      </section>
      <section class="section day">
        <div>
          <h2 class="section-h">Son 24 saat</h2>
          <div id="lanes"></div>
          <div class="axis"><span></span><div class="axis-track">
            <span style="left:0;transform:none">dün 16:00</span><span style="left:33.3%">gece yarısı</span>
            <span style="left:66.6%">08:00</span><span style="right:0;transform:none">şimdi</span>
          </div></div>
        </div>
        <div><h2 class="section-h">Olaylar</h2><ul class="events" id="events"></ul></div>
      </section>
      <section class="section"><p class="vitals" id="vitals"></p></section>
    </main>
    <main class="page" id="detail" hidden></main>`;
  }

  function renderStatus() {
    const n = C.issues().length, calm = D.items.length - n;
    $('#status').innerHTML = n
      ? `${COUNT[n]} ilgini bekliyor. <span class="quiet">Geri kalan ${calm} bileşen sakin.</span>`
      : `Her şey sakin. <span class="quiet">${D.items.length} bileşenin hepsi normal çalışıyor.</span>`;
  }

  function renderAttention() {
    const list = C.issues().sort((a, b) => (a.status === 'err' ? -1 : b.status === 'err' ? 1 : 0));
    $('#attentionSection').hidden = !list.length;
    $('#attention').innerHTML = list.map((i) => `
      <div class="issue is-${i.status}" data-id="${i.id}">
        <button class="issue-name svc-link" data-id="${i.id}">${i.id}</button>
        <p class="issue-body"><span class="word">${i.word}</span> ${i.why}</p>
        <div class="issue-acts">${i.actions.map((a, k) => `<button class="act ${k === 0 ? 'primary' : ''}" data-act="${a}">${a}</button>`).join('')}</div>
      </div>`).join('');
  }

  function renderCalm() {
    $('#calm').innerHTML = D.items.filter((i) => i.status === 'ok').map((i) =>
      `<button class="calm-item svc-link" data-id="${i.id}">${i.id}<span class="num">${i.ms ? i.ms + ' ms' : i.note}</span></button>`
    ).join('');
  }

  function renderLanes() {
    $('#lanes').innerHTML = D.items.map((i) => `
      <div class="lane"><span class="${i.status !== 'ok' ? 'is-' + i.status : ''}">${i.id}</span>
        <div class="lane-line">${i.segs.map((s) =>
          `<i class="lane-seg" style="left:${s[0]}%;width:${Math.max(s[1] - s[0], 0.8)}%;background:${C.colorVar(s[2])}"></i>`).join('')}
        </div></div>`).join('');
  }

  function renderVitals() {
    $('#vitals').innerHTML = `${D.host.name} <b>${D.host.uptimeDays} gündür</b> açık. İşlemci <b class="num">%23</b>,
      bellek <b class="num">6,1 / 16 GB</b>, disk <b class="num">412 / 1000 GB</b> kullanımda.
      En çok tüketen <b>immich-ml</b>; gece başlayan yüz tanıma taraması sürüyor.
      Son yedek bugün <b class="num">14:30</b>'da alındı, <b class="num">38,2 GB</b>.`;
  }

  C.renderOverview = function () {
    renderStatus(); renderAttention(); renderCalm(); renderLanes(); renderVitals();
    $('#events').innerHTML = C.eventsHtml(D.events.slice(0, 7));
  };

  /* Bir sorunu çözme / eylem çalıştırma */
  C.resolve = function (id, act) {
    const i = C.byId(id); if (!i) return;
    if (/log|terminal/i.test(act)) { C.toast(`${id}: ${act.toLowerCase()} açılıyor`); return; }
    const done = () => {
      i.status = 'ok';
      if (i.unit === 'ms') i.ms = i.base;
      i.segs.forEach((s) => { if (s[1] === 100) s[1] = 99.4; });
      D.events.unshift({ t: C.nowHM(), id, c: 'ok', txt: DONE[act] || 'işlem tamamlandı.' });
      C.renderOverview();
      if (C.onChange) C.onChange(id);
    };
    C.toast(`${id}: ${act.toLowerCase()}`);
    const row = document.querySelector(`.issue[data-id="${id}"]`);
    if (row && !$('#overview').hidden) { row.classList.add('leaving'); setTimeout(done, 350); } else done();
  };

  C.mountOverview = function (root) {
    root.innerHTML = skeleton();
    C.renderOverview();
    root.addEventListener('click', (e) => {
      const act = e.target.closest('#overview .act');
      if (act) return C.resolve(act.closest('.issue').dataset.id, act.dataset.act);
      const link = e.target.closest('#overview .svc-link');
      if (link && C.openService) return C.openService(link.dataset.id);
      if (e.target.closest('[data-open-palette]') && C.openPalette) C.openPalette();
    });
    const tick = () => { $('#clock').textContent = C.nowHM(); };
    tick(); setInterval(tick, 10000);
  };
})();
