// Close button fix (runs first, on window capture, so it beats the header drag handler).
(function () {
  console.log('[close.js] loaded');
  var sel = '#closeBtn', sent = false;
  function onBtn(e) { return e.target && e.target.closest && e.target.closest(sel); }

  // 1) Stop the header drag code from ever seeing a press on the button.
  ['pointerdown', 'mousedown', 'touchstart'].forEach(function (t) {
    window.addEventListener(t, function (e) {
      if (onBtn(e)) e.stopImmediatePropagation();
    }, true);
  });

  // 2) Close on pointerup OR click, whichever arrives first.
  function close(e) {
    if (!onBtn(e) || sent) return;
    sent = true;
    console.log('[close.js] close clicked');
    window.parent.postMessage({ source: 'isl-panel', type: 'close' }, '*');
    setTimeout(function () { sent = false; }, 500);
  }
  window.addEventListener('pointerup', close, true);
  window.addEventListener('click', close, true);
})();