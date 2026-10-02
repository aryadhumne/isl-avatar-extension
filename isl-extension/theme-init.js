/* Runs before paint to prevent a flash of the wrong theme.
   Must be loaded in <head>, before panel.css if possible. */
(function () {
  try {
    const saved = localStorage.getItem('isl-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {}
})();