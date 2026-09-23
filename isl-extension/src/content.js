// Injected on demand from the popup. Running it again closes the panel.
(() => {
  if (window.__islCleanup) { window.__islCleanup(); return; }

  const origin = new URL(chrome.runtime.getURL('')).origin;
  const host = document.createElement('div');
  host.id = 'isl-ext-root';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      .wrap{position:fixed;right:20px;bottom:20px;width:340px;z-index:2147483647;border-radius:14px;overflow:hidden;
        background:#1B2D38;box-shadow:0 12px 40px rgba(0,0,0,.45);font:13px "Segoe UI Variable","Noto Sans",system-ui,sans-serif}
      .bar{height:34px;display:flex;align-items:center;gap:6px;padding:0 6px 0 12px;color:#EAF1EE;cursor:grab;user-select:none;touch-action:none}
      .bar b{flex:1;font-weight:600}
      button{all:unset;cursor:pointer;width:24px;height:24px;border-radius:6px;text-align:center;line-height:24px;color:#93A8A6}
      button:hover,button:focus-visible{background:#2E4653;color:#EAF1EE}
      iframe{display:block;width:100%;height:480px;border:0}
      .min iframe{display:none}
    </style>
    <div class="wrap"><div class="bar"><b>ISL avatar</b>
      <button id="min" title="Minimize" aria-label="Minimize">–</button>
      <button id="close" title="Close" aria-label="Close">✕</button></div>
      <iframe title="ISL avatar" src="${chrome.runtime.getURL('panel.html')}"></iframe></div>`;
  document.documentElement.appendChild(host);

  const wrap = root.querySelector('.wrap'), frame = root.querySelector('iframe'), bar = root.querySelector('.bar');
  let ready = false, pending = [], source = 'captions';
  const post = m => frame.contentWindow.postMessage({ source: 'isl-ext', ...m }, origin);
  const send = m => (ready ? post(m) : pending.push(m));

  chrome.storage.sync.get({ source: 'captions' }).then(v => (source = v.source));
  const onStore = ch => { if (ch.source) source = ch.source.newValue; };
  chrome.storage.onChanged.addListener(onStore);

  const onMsg = e => {
    if (e.source === frame.contentWindow && e.data?.source === 'isl-panel' && e.data.type === 'ready') {
      ready = true; pending.forEach(post); pending = [];
    }
  };
  window.addEventListener('message', onMsg);

  // --- Drag ---
  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const r = wrap.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    bar.setPointerCapture(e.pointerId); bar.style.cursor = 'grabbing';
    wrap.style.right = wrap.style.bottom = 'auto';
    const move = ev => {
      wrap.style.left = Math.max(0, Math.min(innerWidth - 60, ev.clientX - dx)) + 'px';
      wrap.style.top = Math.max(0, Math.min(innerHeight - 34, ev.clientY - dy)) + 'px';
    };
    const up = () => { bar.style.cursor = ''; bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
    bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up);
  });
  root.getElementById('min').onclick = () => wrap.classList.toggle('min');
  root.getElementById('close').onclick = () => cleanup();

  // --- Caption capture ---
  let last = '', found = false, statusSent = '';
  const status = t => { if (t !== statusSent) { statusSent = t; send({ type: 'status', text: t }); } };
  function pushCaption(raw) {
    if (source !== 'captions') return;
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text || text === last) return;
    const fresh = text.startsWith(last) ? text.slice(last.length).trim() : text;
    last = text;
    if (fresh) { found = true; status('Reading captions from the page'); send({ type: 'text', text: fresh }); }
  }

  // YouTube and similar players draw captions as page text.
  const ytTimer = setInterval(() => {
    const segs = document.querySelectorAll('.ytp-caption-segment');
    if (segs.length) pushCaption([...segs].map(s => s.textContent).join(' '));
  }, 300);

  // Standard HTML5 caption tracks.
  const seen = new WeakSet();
  function watchVideos() {
    for (const v of document.querySelectorAll('video')) {
      for (const t of v.textTracks) {
        if (!['captions', 'subtitles'].includes(t.kind) || seen.has(t)) continue;
        seen.add(t);
        if (t.mode === 'disabled') t.mode = 'hidden';
        t.addEventListener('cuechange', () => pushCaption([...(t.activeCues || [])].map(c => c.text).join(' ')));
      }
    }
  }
  watchVideos();
  const vidTimer = setInterval(watchVideos, 2000);
  const hintTimer = setTimeout(() => {
    if (!found) status('No captions found yet. Turn on CC in the video, or type below.');
  }, 4000);

  function cleanup() {
    clearInterval(ytTimer); clearInterval(vidTimer); clearTimeout(hintTimer);
    window.removeEventListener('message', onMsg);
    chrome.storage.onChanged.removeListener(onStore);
    host.remove(); delete window.__islCleanup;
  }
  window.__islCleanup = cleanup;
})();
