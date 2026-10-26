/* Nocturne launcher logic. ES5 on purpose: older Tizen browsers are picky. */
(function () {
  'use strict';

  var STORE_KEY = 'nocturne.v1';
  var GRID_COLS = 6;
  var THEMES = ['midnight', 'oled', 'aurora'];
  // Built-in backgrounds; your own photos (backgrounds/backgrounds.js) are added after these.
  var BUILTIN_BACKGROUNDS = [
    { id: 'none', name: 'Theme colour' },
    { id: 'aurora', name: 'Aurora (moving)' },
    { id: 'nebula', name: 'Nebula' },
    { id: 'dusk', name: 'Dusk' }
  ];
  var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009,
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406
  };
  // Browser-preview stand-ins for the remote's colour keys and Back.
  var PREVIEW_KEYS = { r: KEY.RED, g: KEY.GREEN, y: KEY.YELLOW, b: KEY.BLUE, Escape: KEY.BACK, Backspace: KEY.BACK };

  var onTV = typeof tizen !== 'undefined' && !!tizen.application;

  var state = {
    apps: [],          // every launchable app, sorted by name
    pinned: [],        // app ids, in display order
    theme: 'midnight',
    background: 'none',
    rows: [],         // [{ kind: 'pinned'|'grid', items: [app] }]
    focus: { row: 0, col: 0 },
    moving: false
  };

  var el = {
    stage: document.getElementById('stage'),
    rows: document.getElementById('rows'),
    bg: document.getElementById('bg'),
    glow: document.getElementById('glow'),
    clock: document.getElementById('clock'),
    date: document.getElementById('date'),
    toast: document.getElementById('toast'),
    badge: document.getElementById('mode-badge')
  };

  // ---------- storage ----------

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ pinned: state.pinned, theme: state.theme, background: state.background }));
    } catch (e) { /* storage unavailable: settings just won't persist */ }
  }

  // ---------- apps ----------

  function brandFor(name) {
    var lower = name.toLowerCase();
    var brands = window.NOCTURNE_BRANDS;
    for (var i = 0; i < brands.length; i++) {
      if (lower.indexOf(brands[i].match) !== -1) return brands[i];
    }
    return null;
  }

  function hashColor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return 'hsl(' + h + ', 45%, 32%)';
  }

  function normalize(list) {
    return list.map(function (a) {
      var brand = brandFor(a.name || '');
      return {
        id: a.id,
        name: a.name || a.id,
        icon: a.iconPath || '',
        color: brand ? brand.color : hashColor(a.name || a.id)
      };
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function loadApps(done) {
    if (!onTV) { done(normalize(window.NOCTURNE_MOCK_APPS)); return; }
    try {
      var self = tizen.application.getCurrentApplication().appInfo.id;
      tizen.application.getAppsInfo(function (list) {
        done(normalize(list.filter(function (a) { return a.show && a.id !== self && a.name; })));
      }, function (err) {
        toast('App list blocked (' + err.name + '). Showing common apps.');
        done(normalize(window.NOCTURNE_FALLBACK_APPS));
      });
    } catch (e) {
      done(normalize(window.NOCTURNE_FALLBACK_APPS));
    }
  }

  function defaultPins(apps) {
    var pins = [];
    window.NOCTURNE_BRANDS.forEach(function (b) {
      if (!b.pin) return;
      for (var i = 0; i < apps.length; i++) {
        if (apps[i].name.toLowerCase().indexOf(b.match) !== -1 && pins.indexOf(apps[i].id) === -1) {
          pins.push(apps[i].id);
          return;
        }
      }
    });
    return pins;
  }

  function appById(id) {
    for (var i = 0; i < state.apps.length; i++) if (state.apps[i].id === id) return state.apps[i];
    return null;
  }

  function launch(app) {
    if (!onTV) { toast('Opening ' + app.name + ' (preview)'); return; }
    try {
      tizen.application.launch(app.id, null, function () { toast('Couldn’t open ' + app.name); });
    } catch (e) {
      toast('Couldn’t open ' + app.name);
    }
  }

  // ---------- layout ----------

  function buildRows() {
    var pinnedApps = state.pinned.map(appById).filter(Boolean);
    state.pinned = pinnedApps.map(function (a) { return a.id; }); // drop pins for uninstalled apps
    var rest = state.apps.filter(function (a) { return state.pinned.indexOf(a.id) === -1; });

    var rows = [];
    if (pinnedApps.length) rows.push({ kind: 'pinned', items: pinnedApps });
    for (var i = 0; i < rest.length; i += GRID_COLS) {
      rows.push({ kind: 'grid', items: rest.slice(i, i + GRID_COLS) });
    }
    state.rows = rows;
  }

  function tileHTML(app, r, c) {
    var art = app.icon
      ? '<img src="' + escapeAttr(app.icon) + '" alt="">'
      : '<span class="mono">' + escapeHTML(monogram(app.name)) + '</span>';
    return '<div class="tile" data-r="' + r + '" data-c="' + c + '">' +
      '<div class="tile-art" style="background:' + tileBackground(app.color) + '">' + art + '</div>' +
      '<div class="tile-name">' + escapeHTML(app.name) + '</div></div>';
  }

  function render() {
    var html = '';
    var gridStarted = false;
    state.rows.forEach(function (row, r) {
      if (row.kind === 'pinned') {
        html += '<section class="section pinned"><h2 class="section-title">Pinned</h2><div class="row" data-row="' + r + '">';
      } else {
        if (!gridStarted) {
          html += '<section class="section grid"><h2 class="section-title">All apps</h2>';
          gridStarted = true;
        }
        html += '<div class="row" data-row="' + r + '">';
      }
      row.items.forEach(function (app, c) { html += tileHTML(app, r, c); });
      html += '</div>';
      if (row.kind === 'pinned') html += '</section>';
    });
    if (gridStarted) html += '</section>';
    if (!state.rows.length) html = '<div class="empty">No apps found. Press yellow to refresh.</div>';
    el.rows.innerHTML = html;

    // Broken icon paths fall back to the monogram.
    var imgs = el.rows.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; i++) imgs[i].onerror = iconFailed;

    updateFocus();
  }

  function iconFailed() {
    var tile = this.parentNode.parentNode;
    var app = state.rows[+tile.getAttribute('data-r')].items[+tile.getAttribute('data-c')];
    this.outerHTML = '<span class="mono">' + escapeHTML(monogram(app.name)) + '</span>';
  }

  function focusedApp() {
    var row = state.rows[state.focus.row];
    return row ? row.items[state.focus.col] : null;
  }

  function updateFocus() {
    var prev = el.rows.querySelectorAll('.tile.focused, .tile.moving');
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove('focused', 'moving');

    var tile = el.rows.querySelector('.tile[data-r="' + state.focus.row + '"][data-c="' + state.focus.col + '"]');
    if (!tile) return;
    tile.classList.add('focused');
    if (state.moving) tile.classList.add('moving');

    var app = focusedApp();
    el.glow.style.background = 'radial-gradient(ellipse at center, ' + app.color + ' 0%, rgba(0,0,0,0) 65%)';

    // Keep the focused row comfortably on screen.
    // offsetTop is measured from #viewport (the nearest positioned ancestor) and ignores the transform.
    var shift = Math.max(0, tile.parentNode.offsetTop - 260);
    el.rows.style.transform = 'translateY(' + (-shift) + 'px)';
    // Long pinned rows slide sideways so the focused tile never leaves the screen.
    var shiftX = Math.max(0, tile.offsetLeft + tile.offsetWidth - 1800);
    tile.parentNode.style.transform = 'translateX(' + (-shiftX) + 'px)';
  }

  // ---------- actions ----------

  function move(dRow, dCol) {
    if (!state.rows.length) return;
    var f = state.focus;

    if (state.moving) {
      if (dRow !== 0) return; // reorder only sideways
      var pins = state.pinned;
      var to = f.col + dCol;
      if (to < 0 || to >= pins.length) return;
      var tmp = pins[f.col]; pins[f.col] = pins[to]; pins[to] = tmp;
      f.col = to;
      savePrefs();
      buildRows();
      render();
      return;
    }

    var r = Math.min(Math.max(f.row + dRow, 0), state.rows.length - 1);
    var len = state.rows[r].items.length;
    var c = dRow !== 0 ? Math.min(f.col, len - 1) : Math.min(Math.max(f.col + dCol, 0), len - 1);
    if (r === f.row && c === f.col) return;
    f.row = r; f.col = c;
    updateFocus();
  }

  function togglePin() {
    var app = focusedApp();
    if (!app || state.moving) return;
    var idx = state.pinned.indexOf(app.id);
    if (idx === -1) {
      state.pinned.push(app.id);
      toast('Pinned ' + app.name);
    } else {
      state.pinned.splice(idx, 1);
      toast('Unpinned ' + app.name);
    }
    savePrefs();
    buildRows();
    refocus(app.id);
    render();
  }

  function toggleMoveMode() {
    var row = state.rows[state.focus.row];
    if (!state.moving && (!row || row.kind !== 'pinned')) { toast('Move to a pinned app to reorder'); return; }
    state.moving = !state.moving;
    el.badge.textContent = 'Reorder';
    el.badge.classList.toggle('on', state.moving);
    if (!state.moving) toast('Order saved');
    updateFocus();
  }

  function cycleTheme() {
    var next = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];
    applyTheme(next);
    savePrefs();
    toast('Theme: ' + next.charAt(0).toUpperCase() + next.slice(1));
  }

  function applyTheme(name) {
    document.body.classList.remove('theme-' + state.theme);
    state.theme = THEMES.indexOf(name) === -1 ? 'midnight' : name;
    document.body.classList.add('theme-' + state.theme);
  }

  function allBackgrounds() {
    var photos = (window.NOCTURNE_PHOTOS || []).map(function (p) {
      return { id: 'photo:' + p.file, name: p.name || p.file, file: p.file };
    });
    return BUILTIN_BACKGROUNDS.concat(photos);
  }

  function applyBackground(id) {
    var list = allBackgrounds();
    // Saved choice first; if it's missing (e.g. a deleted photo) use the default, then plain theme colour.
    var bg = null, fallback = list[0];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) bg = list[i];
      if (list[i].id === window.NOCTURNE_DEFAULT_BACKGROUND) fallback = list[i];
    }
    bg = bg || fallback;
    state.background = bg.id;
    el.bg.className = bg.file ? 'photo' : 'bg-' + bg.id;
    el.bg.style.backgroundImage = bg.file ? 'url("backgrounds/' + encodeURI(bg.file) + '")' : '';
    return bg;
  }

  function cycleBackground() {
    var list = allBackgrounds();
    var idx = 0;
    for (var i = 0; i < list.length; i++) if (list[i].id === state.background) idx = i;
    var bg = applyBackground(list[(idx + 1) % list.length].id);
    savePrefs();
    toast('Background: ' + bg.name);
  }

  function refocus(appId) {
    for (var r = 0; r < state.rows.length; r++) {
      for (var c = 0; c < state.rows[r].items.length; c++) {
        if (state.rows[r].items[c].id === appId) { state.focus = { row: r, col: c }; return; }
      }
    }
    state.focus = { row: 0, col: 0 };
  }

  function back() {
    if (state.moving) { toggleMoveMode(); return; }
    if (onTV) {
      try { tizen.application.getCurrentApplication().exit(); } catch (e) { /* ignore */ }
    } else {
      toast('Back would close Nocturne on the TV');
    }
  }

  // Re-reads the installed apps; runs whenever you come back to Nocturne, so new installs just appear.
  function refresh() {
    var current = focusedApp();
    loadApps(function (apps) {
      state.apps = apps;
      buildRows();
      refocus(current ? current.id : null);
      render();
    });
  }

  function onKey(e) {
    var code = e.keyCode;
    if (!onTV && PREVIEW_KEYS[e.key]) code = PREVIEW_KEYS[e.key];
    switch (code) {
      case KEY.LEFT: move(0, -1); break;
      case KEY.RIGHT: move(0, 1); break;
      case KEY.UP: move(-1, 0); break;
      case KEY.DOWN: move(1, 0); break;
      case KEY.ENTER:
        if (state.moving) { toggleMoveMode(); } else if (focusedApp()) { launch(focusedApp()); }
        break;
      case KEY.RED: togglePin(); break;
      case KEY.GREEN: toggleMoveMode(); break;
      case KEY.YELLOW: cycleBackground(); break;
      case KEY.BLUE: cycleTheme(); break;
      case KEY.BACK: back(); break;
      default: return;
    }
    e.preventDefault();
  }

  // ---------- helpers ----------

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 2200);
  }

  function tickClock() {
    var d = new Date();
    var h = d.getHours() % 12 || 12;
    var m = d.getMinutes();
    el.clock.textContent = h + ':' + (m < 10 ? '0' : '') + m;
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    el.date.textContent = days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + '  ·  ' + greeting(d.getHours());
  }

  function greeting(hour) {
    if (hour < 5) return 'Late night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function monogram(name) {
    var words = name.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean);
    if (!words.length) return '?';
    return words.length > 1 ? words[0].charAt(0) + words[1].charAt(0) : words[0].charAt(0);
  }

  function tileBackground(color) {
    return 'linear-gradient(145deg, ' + color + ' 0%, rgba(0,0,0,0.55) 140%), ' + color;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }
  function escapeAttr(s) { return escapeHTML(s).replace(/'/g, '&#39;'); }

  function fitStage() {
    // TVs already render at 1920x1080; this only matters in the browser preview.
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    el.stage.style.transform = 'scale(' + scale + ')';
    // Centre it like a TV screen, letterboxed in black.
    el.stage.style.left = Math.max(0, (window.innerWidth - 1920 * scale) / 2) + 'px';
    el.stage.style.top = Math.max(0, (window.innerHeight - 1080 * scale) / 2) + 'px';
  }

  function registerRemoteKeys() {
    if (typeof tizen === 'undefined' || !tizen.tvinputdevice) return;
    ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'].forEach(function (k) {
      try { tizen.tvinputdevice.registerKey(k); } catch (e) { /* key not on this remote */ }
    });
  }

  // ---------- start ----------

  function init() {
    var prefs = loadPrefs();
    applyTheme(prefs && prefs.theme);
    applyBackground(prefs && prefs.background);
    registerRemoteKeys();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && state.apps.length) refresh();
    });
    fitStage();
    window.addEventListener('resize', fitStage);
    document.addEventListener('keydown', onKey);
    tickClock();
    setInterval(tickClock, 15000);

    loadApps(function (apps) {
      state.apps = apps;
      state.pinned = prefs && prefs.pinned ? prefs.pinned : defaultPins(apps);
      buildRows();
      render();
    });
  }

  init();
})();
