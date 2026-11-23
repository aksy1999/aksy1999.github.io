(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  var label = document.getElementById('theme-label');
  var mql = window.matchMedia('(prefers-color-scheme: dark)');

  // Optional hosted multi-visitor map image override (e.g. MapMyVisitors PNG URL if configured later)
  var HOSTED_MAP_PNG_URL = '';

  var statsState = { site_pv: null, site_uv: null, page_pv: null };
  var geoState = null;
  var worldTopo = null;
  var modalEl = null;

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
    if (modalEl && !modalEl.hidden) {
      renderWorldMap();
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

  // Site-wide live visit counter (Vercount API)
  var visitsBtn = document.getElementById('visitor-map-btn');
  var visitsLabel = document.getElementById('site-visits-label');

  function formatNum(n) {
    return typeof n === 'number' ? n.toLocaleString('en-US') : '—';
  }

  function updateStatsDom() {
    if (visitsLabel && typeof statsState.site_pv === 'number') {
      visitsLabel.textContent = formatNum(statsState.site_pv) + (statsState.site_pv === 1 ? ' visit' : ' visits');
    }
    if (!modalEl) return;
    var elSitePv = modalEl.querySelector('[data-stat="site_pv"]');
    var elSiteUv = modalEl.querySelector('[data-stat="site_uv"]');
    var elPagePv = modalEl.querySelector('[data-stat="page_pv"]');
    if (elSitePv) elSitePv.textContent = formatNum(statsState.site_pv);
    if (elSiteUv) elSiteUv.textContent = formatNum(statsState.site_uv);
    if (elPagePv) elPagePv.textContent = formatNum(statsState.page_pv);
  }

  try {
    fetch('https://events.vercount.one/api/v2/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: window.location.href })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (res) {
        if (res && res.data) {
          statsState.site_pv = res.data.site_pv;
          statsState.site_uv = res.data.site_uv;
          statsState.page_pv = res.data.page_pv;
          updateStatsDom();
        }
      })
      .catch(function () {});
  } catch (_) {}

  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'vmap-backdrop';
    modalEl.hidden = true;
    modalEl.innerHTML =
      '<div class="vmap-dialog" role="dialog" aria-modal="true" aria-labelledby="vmap-title">' +
        '<div class="vmap-head">' +
          '<h2 id="vmap-title">Site Traffic &amp; Visitor Map</h2>' +
          '<button class="vmap-close" type="button" aria-label="Close visitor map">&times;</button>' +
        '</div>' +
        '<div class="vmap-stats">' +
          '<div class="vmap-stat"><span class="vmap-stat-label">Total Site Views</span><span class="vmap-stat-val" data-stat="site_pv">—</span></div>' +
          '<div class="vmap-stat"><span class="vmap-stat-label">Unique Visitors</span><span class="vmap-stat-val" data-stat="site_uv">—</span></div>' +
          '<div class="vmap-stat"><span class="vmap-stat-label">This Page</span><span class="vmap-stat-val" data-stat="page_pv">—</span></div>' +
        '</div>' +
        '<div class="vmap-canvas-wrap">' +
          (HOSTED_MAP_PNG_URL
            ? '<img src="' + HOSTED_MAP_PNG_URL + '" alt="World visitor map" style="display:block;width:100%;height:auto;">'
            : '<canvas id="vmap-canvas" width="800" height="400"></canvas>') +
        '</div>' +
        '<div class="vmap-caption">' +
          '<span id="vmap-you-loc">Detecting current session location…</span>' +
          '<span>Home base: San Francisco, CA</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modalEl);

    modalEl.querySelector('.vmap-close').addEventListener('click', closeModal);
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl && !modalEl.hidden) closeModal();
    });
    return modalEl;
  }

  function decodeArc(topo, idx) {
    var rev = idx < 0;
    var raw = topo.arcs[rev ? ~idx : idx];
    var scale = topo.transform.scale;
    var translate = topo.transform.translate;
    var x = 0, y = 0;
    var pts = new Array(raw.length);
    for (var i = 0; i < raw.length; i++) {
      x += raw[i][0];
      y += raw[i][1];
      pts[i] = [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    }
    if (rev) pts.reverse();
    return pts;
  }

  function projectLonLat(lon, lat, w, h) {
    return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
  }

  function renderWorldMap() {
    if (!modalEl || HOSTED_MAP_PNG_URL) return;
    var canvas = modalEl.querySelector('#vmap-canvas');
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cssW = Math.max(320, canvas.clientWidth || 640);
    var cssH = Math.round(cssW / 2);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var isDark = root.dataset.theme === 'dark';
    var ocean = isDark ? '#101512' : '#f4f7f5';
    var grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    var landFill = isDark ? '#1e2823' : '#dce6e0';
    var landStroke = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(17,134,89,0.28)';
    var accent = isDark ? '#56cf96' : '#118659';

    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, cssW, cssH);

    // Subtle graticule lines
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (var lon = -120; lon <= 120; lon += 60) {
      var gx = ((lon + 180) / 360) * cssW;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, cssH);
      ctx.stroke();
    }
    for (var lat = -60; lat <= 60; lat += 30) {
      var gy = ((90 - lat) / 180) * cssH;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(cssW, gy);
      ctx.stroke();
    }

    if (worldTopo && worldTopo.objects && worldTopo.objects.land) {
      ctx.fillStyle = landFill;
      ctx.strokeStyle = landStroke;
      ctx.lineWidth = 0.7;
      var geoms = worldTopo.objects.land.geometries || [];
      geoms.forEach(function (g) {
        var polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
        polys.forEach(function (rings) {
          ctx.beginPath();
          rings.forEach(function (ring) {
            var first = true;
            ring.forEach(function (arcIdx) {
              var pts = decodeArc(worldTopo, arcIdx);
              for (var i = 0; i < pts.length; i++) {
                var p = projectLonLat(pts[i][0], pts[i][1], cssW, cssH);
                if (first) {
                  ctx.moveTo(p[0], p[1]);
                  first = false;
                } else {
                  ctx.lineTo(p[0], p[1]);
                }
              }
            });
            ctx.closePath();
          });
          ctx.fill();
          ctx.stroke();
        });
      });
    }

    // Home base marker (San Francisco: 37.7749, -122.4194)
    var sf = projectLonLat(-122.4194, 37.7749, cssW, cssH);
    ctx.fillStyle = isDark ? '#9aa6a0' : '#5a645f';
    ctx.beginPath();
    ctx.arc(sf[0], sf[1], 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Current visitor marker
    if (geoState && isFinite(geoState.lon) && isFinite(geoState.lat)) {
      var vp = projectLonLat(geoState.lon, geoState.lat, cssW, cssH);
      ctx.fillStyle = isDark ? 'rgba(86, 207, 150, 0.24)' : 'rgba(17, 134, 89, 0.22)';
      ctx.beginPath();
      ctx.arc(vp[0], vp[1], 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(vp[0], vp[1], 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function openModal() {
    var m = ensureModal();
    m.hidden = false;
    updateStatsDom();

    if (!worldTopo && !HOSTED_MAP_PNG_URL) {
      fetch('/assets/land-110m.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (t) {
          worldTopo = t;
          renderWorldMap();
        })
        .catch(function () {});
    } else {
      renderWorldMap();
    }

    if (!geoState) {
      fetch('https://get.geojs.io/v1/ip/geo.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (g) {
          if (!g) return;
          geoState = {
            lat: parseFloat(g.latitude),
            lon: parseFloat(g.longitude),
            city: g.city || '',
            country: g.country || ''
          };
          var locEl = m.querySelector('#vmap-you-loc');
          if (locEl) {
            var parts = [geoState.city, geoState.country].filter(Boolean);
            locEl.textContent = parts.length ? 'Active session: ' + parts.join(', ') : 'Active session plotted';
          }
          renderWorldMap();
        })
        .catch(function () {
          var locEl = m.querySelector('#vmap-you-loc');
          if (locEl) locEl.textContent = 'Live site-wide counter active';
        });
    }
  }

  function closeModal() {
    if (modalEl) modalEl.hidden = true;
  }

  if (visitsBtn) {
    visitsBtn.addEventListener('click', openModal);
  }
  window.addEventListener('resize', function () {
    if (modalEl && !modalEl.hidden) renderWorldMap();
  });
})();
