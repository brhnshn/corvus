/* Tur 2 / C — bir bileşene yakınlaşma. overview.js ve palette.js'ten sonra yüklenmeli.
   Geçiş: View Transitions API (Chrome/Edge). Desteklemeyen tarayıcıda anında geçer. */
(function () {
  const D = window.CORVUS, C = window.Corvus;
  const $ = (s) => document.querySelector(s);
  let current = null, savedScroll = 0;
  document.body.classList.add('zoomable');

  const neighbors = (id) => D.edges.filter((e) => e.includes(id)).map((e) => (e[0] === id ? e[1] : e[0]));
  const linkFor = (id) => document.querySelector(`#overview .svc-link[data-id="${id}"]`);

  function transition(update, back) {
    if (!document.startViewTransition) { update(); return; }
    document.documentElement.classList.toggle('vt-back', !!back);
    document.startViewTransition(update).finished.finally(() => {
      document.documentElement.classList.remove('vt-back');
      document.querySelectorAll('.svc-link').forEach((l) => (l.style.viewTransitionName = ''));
    });
  }

  function chartSvg(item) {
    const s = D.series(item), W = 600, H = 160;
    const max = Math.max(...s.filter((v) => v !== null)) * 1.15;
    const x = (k) => (k / (s.length - 1)) * W, y = (v) => H - (v / max) * H;
    let line = '', area = '', firstNull = -1;
    s.forEach((v, k) => {
      if (v === null) { if (firstNull < 0) firstNull = k; return; }
      line += `${line ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)} `;
    });
    const lastIdx = firstNull < 0 ? s.length - 1 : firstNull - 1;
    area = `${line}L${x(lastIdx)},${H} L0,${H} Z`;
    const dead = firstNull >= 0 ? `<line class="dead" x1="${x(firstNull)}" y1="${H - 1}" x2="${W}" y2="${H - 1}"/>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <line class="base" x1="0" y1="${H}" x2="${W}" y2="${H}"/><path class="area" d="${area}"/><path class="line" d="${line}"/>${dead}</svg>`;
  }

  function neighborSvg(item) {
    const nb = neighbors(item.id);
    if (!nb.length) return '<p class="alone">Bağımsız çalışıyor; başka bir bileşene bağlı değil.</p>';
    const cx = 180, cy = 130, r = nb.length > 4 ? 100 : 88;
    const pts = nb.map((id, k) => {
      const a = (-90 + (k * 360) / nb.length) * Math.PI / 180;
      return { id, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), s: C.byId(id).status };
    });
    const edges = pts.map((p) => `<line class="edge" x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}"/>`).join('');
    const nodes = pts.map((p) => {
      const anchor = p.x < cx - 10 ? 'end' : p.x > cx + 10 ? 'start' : 'middle';
      const dx = anchor === 'end' ? -10 : anchor === 'start' ? 10 : 0, dy = anchor === 'middle' ? (p.y < cy ? -12 : 20) : 4;
      return `<g class="nb" data-id="${p.id}"><circle cx="${p.x}" cy="${p.y}" r="14" fill="transparent"/>
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="${C.colorVar(p.s)}"/>
        <text x="${p.x + dx}" y="${p.y + dy}" text-anchor="${anchor}">${p.id}</text></g>`;
    }).join('');
    return `<svg viewBox="0 0 360 260">${edges}${nodes}
      <g class="self"><circle cx="${cx}" cy="${cy}" r="6" fill="${C.colorVar(item.status)}"/>
      <text x="${cx}" y="${cy + 24}" text-anchor="middle">${item.id}</text></g></svg>`;
  }

  function uptimeBars(item) {
    const d = item.days || {};
    return Array.from({ length: 30 }, (_, k) =>
      `<i class="${(d.e || []).includes(k) ? 'e' : (d.w || []).includes(k) ? 'w' : ''}"></i>`).join('');
  }

  function render(id) {
    const i = C.byId(id);
    const ok = i.status === 'ok';
    const lede = ok
      ? `<span class="word">Sakin.</span> Son 30 günde %${i.uptime} erişilebilir${i.ms ? `, ortalama ${i.ms} ms` : ''}.`
      : `<span class="word">${i.word}</span> ${i.why}`;
    const acts = ok ? ['Loglar', 'Terminal', 'Yeniden başlat'] : i.actions;
    const last = D.series(i).filter((v) => v !== null).pop();
    const head = i.status === 'err' ? '—' : i.ms ? i.ms : Math.round(last);
    const evs = D.events.filter((e) => e.id === id);
    $('#detail').innerHTML = `
      <nav class="crumbs"><button data-back>${D.host.name}</button><span>/</span><span>${i.id}</span><span class="esc">Esc ile geri</span></nav>
      <h1 class="d-title">${i.id}</h1>
      <p class="d-lede" style="--c:${C.colorVar(i.status)}">${lede}</p>
      <div class="d-acts">${acts.map((a, k) => `<button class="act ${k === 0 ? 'primary' : ''}" data-act="${a}">${a}</button>`).join('')}</div>
      <div class="d-grid">
        <section>
          <div class="chart-head"><span class="big num">${head}</span><span class="unit">${i.unit}, son 24 saat</span></div>
          <div class="chart">${chartSvg(i)}</div>
          <div class="chart-meta"><span>dün 16:00</span><span>gece yarısı</span><span>08:00</span><span>şimdi</span></div>
          <h2 class="section-h mt">Son 30 gün <span>%${i.uptime}</span></h2>
          <div class="uptime">${uptimeBars(i)}</div>
          <h2 class="section-h mt">Olaylar</h2>
          <ul class="events">${evs.length ? C.eventsHtml(evs) : '<li><time></time><p>Son 24 saatte kayda değer bir şey olmadı.</p></li>'}</ul>
        </section>
        <aside>
          <h2 class="section-h">Komşuları <span>tıkla, oraya geç</span></h2>
          <div class="neighbors">${neighborSvg(i)}</div>
          <dl class="facts"><dt>Adres</dt><dd>${i.addr}</dd><dt>İmaj</dt><dd>${i.image}</dd><dt>Bağlantı</dt><dd>${neighbors(id).length} bileşen</dd></dl>
        </aside>
      </div>`;
  }

  C.openService = function (id) {
    const fromOverview = !current;
    if (fromOverview) {
      savedScroll = scrollY;
      const l = linkFor(id); if (l) l.style.viewTransitionName = 'svc-title';
    }
    transition(() => {
      const l = linkFor(id); if (l) l.style.viewTransitionName = '';
      render(id);
      $('#overview').hidden = true; $('#detail').hidden = false;
      scrollTo(0, 0); current = id;
    });
  };

  function back() {
    if (!current) return;
    const id = current;
    transition(() => {
      $('#detail').hidden = true; $('#overview').hidden = false; current = null;
      const l = linkFor(id); if (l) l.style.viewTransitionName = 'svc-title';
      scrollTo(0, savedScroll);
    }, true);
  }

  C.onChange = (id) => { if (current === id) render(id); };

  $('#detail').addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) return back();
    const nb = e.target.closest('.nb'); if (nb) return C.openService(nb.dataset.id);
    const act = e.target.closest('.act'); if (act) C.resolve(current, act.dataset.act);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !C.paletteOpen()) back(); });
})();
