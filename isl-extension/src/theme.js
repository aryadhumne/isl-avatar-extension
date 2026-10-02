// Dark mode toggle for the ISL Aid panel.
(function () {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  const sunPath = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  const moonPath = '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>';

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeIcon) themeIcon.innerHTML = theme === 'dark' ? sunPath : moonPath;
    if (themeToggle) {
      themeToggle.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    try { localStorage.setItem('isl-theme', theme); } catch (e) {}
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      try { chrome.storage.sync.set({ theme: theme }); } catch (e) {}
    }
    try {
      window.parent.postMessage({ source: 'isl-panel', type: 'theme', theme: theme }, '*');
    } catch (e) {}
  }

  function toggleTheme() {
    const current = root.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  applyTheme(root.getAttribute('data-theme') || 'light');
})();