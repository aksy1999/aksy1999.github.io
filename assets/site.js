(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  var label = document.getElementById('theme-label');
  var mql = window.matchMedia('(prefers-color-scheme: dark)');

  try {
    localStorage.removeItem('amit-theme');
    localStorage.removeItem('theme');
  } catch (_) {}

  function resolveTheme(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    return mql.matches ? 'dark' : 'light';
  }

  function applyMode(mode) {
    var valid = (mode === 'light' || mode === 'dark') ? mode : 'auto';
    var theme = resolveTheme(valid);
    root.dataset.theme = theme;
    root.dataset.themeMode = valid;
    root.style.colorScheme = theme;
    if (label) {
      label.textContent = valid.toUpperCase();
    }
  }

  var initialMode = 'auto';
  try {
    var s = sessionStorage.getItem('amit-theme-mode');
    if (s === 'light' || s === 'dark' || s === 'auto') initialMode = s;
  } catch (_) {}

  applyMode(initialMode);

  if (btn) {
    btn.addEventListener('click', function () {
      var cur = root.dataset.themeMode || 'auto';
      var next = cur === 'auto' ? 'light' : cur === 'light' ? 'dark' : 'auto';
      try {
        sessionStorage.setItem('amit-theme-mode', next);
      } catch (_) {}
      applyMode(next);
    });
  }

  if (mql.addEventListener) {
    mql.addEventListener('change', function () {
      if ((root.dataset.themeMode || 'auto') === 'auto') {
        applyMode('auto');
      }
    });
  }

  document.querySelectorAll('.home-link-row[data-href]').forEach(function (row) {
    row.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      window.location.href = row.getAttribute('data-href');
    });
    row.addEventListener('keydown', function (e) {
      if (e.target === row && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        window.location.href = row.getAttribute('data-href');
      }
    });
  });
})();
