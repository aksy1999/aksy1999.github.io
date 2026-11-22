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
    drawShaders();
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

  function drawShaders() {
    var panels = document.querySelectorAll('.shader-panel');
    if (!panels.length) return;
    var styles = getComputedStyle(root);
    var fg = styles.getPropertyValue('--shader-front').trim() || '#4bc48c';
    var bayer = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];

    panels.forEach(function (panel) {
      var canvas = panel.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        panel.appendChild(canvas);
      }
      var rect = panel.getBoundingClientRect();
      var w = Math.max(240, Math.floor(rect.width));
      var h = Math.max(120, Math.floor(rect.height));
      var cell = 5;
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = fg;
      ctx.globalAlpha = root.dataset.theme === 'dark' ? 0.34 : 0.24;

      var seed = Number(panel.getAttribute('data-seed') || 1);
      for (var y = 0; y < h; y += cell) {
        for (var x = 0; x < w; x += cell) {
          var nx = x / w;
          var ny = y / h;
          var wave =
            0.5 +
            0.28 * Math.sin(nx * 9.0 + seed * 1.4) * Math.cos(ny * 6.5 - seed * 0.7) +
            0.22 * Math.cos((nx + ny) * 7.5 + seed);
          var threshold = (bayer[(y / cell) & 3][(x / cell) & 3] + 0.5) / 16.0;
          if (wave > threshold + 0.16) {
            ctx.fillRect(x, y, cell - 1, cell - 1);
          }
        }
      }
    });
  }

  window.addEventListener('resize', drawShaders);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', drawShaders);
  } else {
    drawShaders();
  }
})();
