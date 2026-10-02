(function () {
  if (document.getElementById('isl-aid-frame')) return;

  // ===== Change the size here =====
  const WIDTH = 300;    // px (try 260 to go smaller, 340 to go bigger)
  const HEIGHT = 440;   // px
  // ================================

  const iframe = document.createElement('iframe');
  iframe.id = 'isl-aid-frame';
  iframe.src = chrome.runtime.getURL('panel.html');
  iframe.setAttribute('allowtransparency', 'true');

  iframe.style.cssText = `
    position: fixed !important;
    top: 80px !important;
    right: 20px !important;
    left: auto;
    bottom: auto;
    width: ${WIDTH}px !important;
    height: ${HEIGHT}px !important;
    border: 0 !important;
    background: transparent !important;
    z-index: 2147483647 !important;
    color-scheme: normal;
  `;

  document.documentElement.appendChild(iframe);

  let origin = null;

  window.addEventListener('message', (e) => {
    if (e.source !== iframe.contentWindow) return;
    const d = e.data;
    if (!d || d.source !== 'isl-panel') return;

    if (d.type === 'close') iframe.remove();

    if (d.type === 'dragstart') {
      const r = iframe.getBoundingClientRect();
      origin = { left: r.left, top: r.top };
      iframe.style.setProperty('right', 'auto', 'important');
      iframe.style.setProperty('bottom', 'auto', 'important');
      iframe.style.setProperty('left', r.left + 'px', 'important');
      iframe.style.setProperty('top', r.top + 'px', 'important');
    }

    if (d.type === 'drag' && origin) {
      const x = Math.min(Math.max(0, origin.left + d.dx), window.innerWidth - iframe.offsetWidth);
      const y = Math.min(Math.max(0, origin.top + d.dy), window.innerHeight - iframe.offsetHeight);
      iframe.style.setProperty('left', x + 'px', 'important');
      iframe.style.setProperty('top', y + 'px', 'important');
    }

    if (d.type === 'dragend') origin = null;
  });
})();