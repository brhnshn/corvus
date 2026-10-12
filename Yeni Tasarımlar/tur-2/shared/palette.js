/* Tur 2 — komut paleti ( / veya Ctrl+K ). overview.js'ten sonra yüklenmeli. */
(function () {
  const D = window.CORVUS, C = window.Corvus;
  let el, input, list, sel = 0, all = [], shown = [];

  function build() {
    const acts = C.issues().flatMap((i) => i.actions.map((a) => ({
      label: `${i.id}: ${a.toLowerCase()}`, hint: 'eylem', run: () => C.resolve(i.id, a) })));
    const go = C.openService ? D.items.map((i) => ({ label: i.id, hint: 'yakınlaş', run: () => C.openService(i.id) })) : [];
    const pages = ['Servisler', 'Konteynerler', 'Metrikler', 'Ayarlar'].map((p) => ({
      label: p, hint: 'bölüm', run: () => C.toast(`${p} bu prototipte yok`) }));
    return [...acts, ...go, ...pages, { label: 'Yeni servis ekle', hint: 'eylem', run: () => C.toast('Yeni servis formu') }];
  }
  function draw() {
    list.innerHTML = shown.map((x, k) => `<li data-k="${k}" class="${k === sel ? 'on' : ''}">${x.label}<span>${x.hint}</span></li>`).join('');
  }
  function filter() {
    const q = input.value.toLowerCase().trim();
    shown = all.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 8); sel = 0; draw();
  }
  function close() { el.classList.remove('open'); }
  function run() { const x = shown[sel]; close(); if (x) x.run(); }

  C.paletteOpen = () => el.classList.contains('open');
  C.openPalette = function () {
    all = build(); el.classList.add('open'); input.value = ''; filter(); setTimeout(() => input.focus());
  };

  el = document.createElement('div');
  el.className = 'palette';
  el.innerHTML = '<div class="palette-box"><input placeholder="Ne yapmak istiyorsun?" autocomplete="off"><ul></ul></div>';
  document.body.appendChild(el);
  input = el.querySelector('input'); list = el.querySelector('ul');
  input.addEventListener('input', filter);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) { sel = +li.dataset.k; run(); } });

  addEventListener('keydown', (e) => {
    if (C.paletteOpen()) {
      if (e.key === 'Escape') { close(); e.stopImmediatePropagation(); }
      else if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
      else if (e.key === 'Enter') run();
      return;
    }
    if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); C.openPalette(); }
  });
})();
