// Injected on demand from the popup. Running it again closes the panel.
(() => {
  if (window.__islCleanup) { window.__islCleanup(); return; }

  const origin = new URL(chrome.runtime.getURL('')).origin;
  const host = document.createElement('div');
  host.id = 'isl-ext-root';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      .wrap{position:fixed;right:20px;bottom:20px;width:354px;z-index:2147483647;border-radius:24px;overflow:hidden;
        background:#FFFFFF;box-shadow:0 18px 55px -10px rgba(24,32,56,0.2),0 0 0 1px rgba(20,24,38,0.08);
        font:13px -apple-system,"Segoe UI Variable","Noto Sans",system-ui,sans-serif;transition:background 0.3s ease,box-shadow 0.3s ease;}
      .wrap.dark{background:#0D0F18;box-shadow:0 20px 60px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.12);}
      .bar{height:40px;display:flex;align-items:center;gap:6px;padding:0 10px 0 16px;color:#14162B;background:#F8FAFD;
        border-bottom:1px solid rgba(20,24,38,0.08);border-top-left-radius:24px;border-top-right-radius:24px;
        cursor:grab;user-select:none;touch-action:none;transition:background 0.3s ease,color 0.3s ease,border-color 0.3s ease;}
      .wrap.dark .bar{background:#121520;color:#EEF0F8;border-bottom-color:rgba(255,255,255,0.08);}
      .bar b{flex:1;font-weight:700;font-size:13px;letter-spacing:-0.01em;}
      button{all:unset;cursor:pointer;width:26px;height:26px;border-radius:10px;text-align:center;line-height:26px;color:#6B7280;transition:all 0.15s ease;}
      button:hover,button:focus-visible{background:rgba(0,102,255,0.08);color:#0066FF;}
      .wrap.dark button{color:#9AA3B8;}
      .wrap.dark button:hover,.wrap.dark button:focus-visible{background:rgba(255,255,255,0.1);color:#7C9CFF;}
      iframe{display:block;width:100%;height:480px;border:0;border-bottom-left-radius:24px;border-bottom-right-radius:24px;}
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

  chrome.storage.sync.get({ source: 'captions', theme: 'light' }).then(v => {
    source = v.source;
    if (v.theme === 'dark') wrap.classList.add('dark');
    if (source !== 'captions') {
      status('Typed-text mode is on — open the extension popup and set "Text source" to Page captions to read video captions automatically.');
    }
  });
  const onStore = ch => {
    if (ch.source) {
      source = ch.source.newValue;
      if (source !== 'captions') status('Typed-text mode is on — switch "Text source" to Page captions in the popup to resume auto-reading.');
      else { found = false; status('Reading captions from the page'); }
    }
    if (ch.theme) {
      if (ch.theme.newValue === 'dark') wrap.classList.add('dark');
      else wrap.classList.remove('dark');
    }
  };
  chrome.storage.onChanged.addListener(onStore);

  const onMsg = e => {
    if (e.source === frame.contentWindow && e.data?.source === 'isl-panel') {
      if (e.data.type === 'ready') { ready = true; pending.forEach(post); pending = []; }
      if (e.data.type === 'theme') {
        if (e.data.theme === 'dark') wrap.classList.add('dark');
        else wrap.classList.remove('dark');
      }
    }
  };
  window.addEventListener('message', onMsg);

  // --- Keep the panel visible even when the page (e.g. a YouTube video)
  // goes fullscreen. The Fullscreen API hides every element that isn't a
  // descendant of document.fullscreenElement, so without this the panel
  // silently disappears the moment the user fullscreens the video — the
  // most common way this looked "broken" / "not reading captions".
  function reparent() {
    const target = document.fullscreenElement || document.webkitFullscreenElement || document.documentElement;
    if (host.parentElement !== target) target.appendChild(host);
  }
  document.addEventListener('fullscreenchange', reparent);
  document.addEventListener('webkitfullscreenchange', reparent);

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

  // YouTube (and similar players) draw captions as plain page text inside
  // .ytp-caption-window-container / .ytp-caption-segment spans. A
  // MutationObserver reacts the instant a caption line changes, instead of
  // waiting up to 300ms; we also keep a light interval as a fallback for
  // players that replace the whole container node rather than mutating it.
  function readYtCaptions() {
    const segs = document.querySelectorAll('.ytp-caption-segment');
    if (segs.length) pushCaption([...segs].map(s => s.textContent).join(' '));
  }
  let ytObserver = null;
  function attachYtObserver() {
    const container = document.querySelector('.ytp-caption-window-container, .caption-window');
    if (!container || ytObserver?.target === container) return;
    ytObserver?.disconnect();
    ytObserver = new MutationObserver(readYtCaptions);
    ytObserver.target = container;
    ytObserver.observe(container, { childList: true, subtree: true, characterData: true });
    readYtCaptions();
  }
  attachYtObserver();
  const ytTimer = setInterval(() => { attachYtObserver(); readYtCaptions(); }, 300);

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
    if (!found && source === 'captions') status('No captions found yet. Turn on CC in the video, or type below.');
  }, 4000);

  function cleanup() {
    clearInterval(ytTimer); clearInterval(vidTimer); clearTimeout(hintTimer);
    ytObserver?.disconnect();
    document.removeEventListener('fullscreenchange', reparent);
    document.removeEventListener('webkitfullscreenchange', reparent);
    window.removeEventListener('message', onMsg);
    chrome.storage.onChanged.removeListener(onStore);
    host.remove(); delete window.__islCleanup;
  }
  window.__islCleanup = cleanup;
})();