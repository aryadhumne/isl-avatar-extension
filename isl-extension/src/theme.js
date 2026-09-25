(function () {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  if (!btn || !icon) return;

  const sunPath = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  const moonPath = '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>';
  let userToggled = false;

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    icon.innerHTML = theme === 'dark' ? sunPath : moonPath;
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function systemDefault() {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function getLocal() {
    try { return localStorage.getItem('isl-theme'); } catch { return null; }
  }
  function setLocal(v) {
    try { localStorage.setItem('isl-theme', v); } catch { /* storage unavailable, theme just won't persist */ }
  }

  // Apply immediately and synchronously from localStorage/system preference.
  // This must happen before any async chrome.storage call so there's no
  // flash of the wrong theme and no chance of a click being undone by a
  // slow storage read resolving afterward.
  apply(getLocal() || systemDefault());

  // Reconcile with chrome.storage.sync (persists across the whole browser
  // profile), but only if the user hasn't already toggled since this panel
  // opened — otherwise a late-resolving read could stomp their click.
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({ theme: getLocal() || systemDefault() })
      .then(v => { if (!userToggled) apply(v.theme); })
      .catch(() => {});
  }

  btn.addEventListener('click', () => {
    userToggled = true;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    setLocal(next);
    try { window.parent.postMessage({ source: 'isl-panel', type: 'theme', theme: next }, '*'); } catch(e) {}
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ theme: next }).catch(() => {});
    }
  });
})();