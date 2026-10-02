// Close button + drag handle for the ISL Aid panel (runs inside the iframe).
// The content script (injected from the popup) listens for these exact
// message shapes: { source:'isl-panel', type:'close' } and
// { source:'isl-panel', type:'drag', dx, dy }.
//
// dx/dy must be in the iframe's OWN unscaled CSS pixels (clientX/Y), because
// the content script's moveBy() multiplies them by its own `scale` factor
// to account for the outer CSS transform: scale(...) on the iframe.
// Using screenX/Y here would double up with that scaling and break dragging.
(function () {
  const send = (msg) => {
    try { window.parent.postMessage({ source: 'isl-panel', ...msg }, '*'); } catch (e) {}
  };

  // ---- Close ----
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    closeBtn.addEventListener('click', () => send({ type: 'close' }));
  }

  // ---- Drag by header ----
  const header = document.querySelector('.header');
  let start = null;

  if (header) {
    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.close-btn')) return;
      header.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY };
      header.style.cursor = 'grabbing';
    });

    header.addEventListener('pointermove', (e) => {
      if (!start) return;
      send({ type: 'drag', dx: e.clientX - start.x, dy: e.clientY - start.y });
    });

    const end = () => {
      if (!start) return;
      start = null;
      header.style.cursor = 'grab';
    };
    header.addEventListener('pointerup', end);
    header.addEventListener('pointercancel', end);
  }

  // Let the content script know the panel is loaded, so it can flush any
  // queued messages (captions/status) that arrived before this point.
  send({ type: 'ready' });
})();