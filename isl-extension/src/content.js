// Injected on demand from the popup. Running it again closes the panel.
(() => {
  if (window.__islCleanup) { window.__islCleanup(); return; }

  const origin = new URL(chrome.runtime.getURL('')).origin;
  const host = document.createElement('div');
  host.id = 'isl-ext-root';
  const root = host.attachShadow({ mode: 'open' });

  // Panel is 392x560 shown at 0.9 (was 0.8). Lower SCALE = smaller.
  // Change PW / PH / SCALE to resize. No backdrop-filter here: only the inner stage is frosted (in panel.css).
  const PW = 392, PH = 560, SCALE = 0.9;
  let scale = SCALE;

  root.innerHTML = `
    <style>
      .wrap{position:fixed;right:12px;bottom:12px;z-index:2147483647;background:transparent;border:0;overflow:visible;}
      iframe{display:block;width:${PW}px;height:${PH}px;border:0;background:transparent;color-scheme:normal;
        transform-origin:0 0;}
    </style>
    <div class="wrap">
      <iframe title="ISL Aid" allowtransparency="true" src="${chrome.runtime.getURL('panel.html')}"></iframe>
    </div>`;
  document.documentElement.appendChild(host);

  const wrap = root.querySelector('.wrap'), frame = root.querySelector('iframe');

  function applyScale() {
    // shrink further on short windows so the panel always fits
    scale = Math.min(SCALE, (innerHeight - 24) / PH, (innerWidth - 24) / PW);
    frame.style.transform = `scale(${scale})`;
    wrap.style.width = PW * scale + 'px';
    wrap.style.height = PH * scale + 'px';
  }
  applyScale();
  window.addEventListener('resize', applyScale);
  let ready = false, pending = [], source = 'captions';
  const post = m => frame.contentWindow.postMessage({ source: 'isl-ext', ...m }, origin);
  const send = m => (ready ? post(m) : pending.push(m));

  chrome.storage.sync.get({ source: 'captions' }).then(v => {
    source = v.source;
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
  };
  chrome.storage.onChanged.addListener(onStore);

  // --- Drag: the panel header reports how far the pointer moved since
  // pointerdown (in the iframe's own CSS pixels); we move the wrapper.
  function moveBy(dx, dy) {
    const r = wrap.getBoundingClientRect();
    wrap.style.right = wrap.style.bottom = 'auto';
    const left = Math.max(0, Math.min(innerWidth - 60, r.left + dx * scale));
    const top = Math.max(0, Math.min(innerHeight - 60, r.top + dy * scale));
    wrap.style.left = left + 'px';
    wrap.style.top = top + 'px';
  }

  const onMsg = e => {
    if (e.source === frame.contentWindow && e.data?.source === 'isl-panel') {
      if (e.data.type === 'ready') { ready = true; pending.forEach(post); pending = []; }
      if (e.data.type === 'close') cleanup();
      if (e.data.type === 'drag') moveBy(e.data.dx, e.data.dy);
    }
  };
  window.addEventListener('message', onMsg);

  // --- Keep the panel visible even when the page (e.g. a YouTube video)
  // goes fullscreen. The Fullscreen API hides every element that isn't a
  // descendant of document.fullscreenElement.
  function reparent() {
    const target = document.fullscreenElement || document.webkitFullscreenElement || document.documentElement;
    if (host.parentElement !== target) target.appendChild(host);
  }
  document.addEventListener('fullscreenchange', reparent);
  document.addEventListener('webkitfullscreenchange', reparent);

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

  // YouTube (and similar players) draw captions as plain page text.
  // A MutationObserver reacts instantly; a light interval is the fallback.
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
    window.removeEventListener('resize', applyScale);
    chrome.storage.onChanged.removeListener(onStore);
    host.remove(); delete window.__islCleanup;
  }
  window.__islCleanup = cleanup;
})();