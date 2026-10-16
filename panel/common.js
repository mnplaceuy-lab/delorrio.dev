/* Utilidades compartidas del portal (cliente + admin) */
(function (W) {
  'use strict';
  var D = {};

  D.api = function (path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opts.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    return fetch('/api/portal/' + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || 'Algo salió mal'); e.status = r.status; throw e; }
        return d;
      });
    });
  };

  D.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  // texto con links clickeables (seguro)
  D.rich = function (s) {
    return D.esc(s).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  };
  D.$ = function (sel, root) { return (root || document).querySelector(sel); };
  D.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  D.date = function (iso) {
    if (!iso) return '—';
    var d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
    if (isNaN(d)) return '—';
    return d.getDate() + ' ' + MES[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  };
  D.time = function (iso) { var d = new Date(iso); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
  D.ago = function (iso) {
    var s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return 'recién';
    if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h';
    if (s < 86400 * 7) { var d = Math.floor(s / 86400); return 'hace ' + d + (d === 1 ? ' día' : ' días'); }
    return D.date(iso);
  };
  D.daysTo = function (ymd) {
    if (!ymd) return null;
    var t = new Date(ymd + 'T12:00:00'), n = new Date(); n.setHours(12, 0, 0, 0);
    return Math.round((t - n) / 864e5);
  };
  D.money = function (n, cur) {
    var v = Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (cur === 'USD' ? 'US$ ' : '$ ') + v;
  };
  D.size = function (b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; };
  D.initials = function (name) { return String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); };
  D.isImg = function (f) { return /^image\/(png|jpeg|webp|gif)$/.test(f.type); };
  D.ext = function (n) { var m = /\.([a-z0-9]+)$/i.exec(n || ''); return m ? m[1].toUpperCase().slice(0, 4) : 'FILE'; };

  // íconos (trazo)
  var P = {
    check: '<path d="M20 6L9 17l-5-5"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22"/>',
    ext: '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>',
    upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
    chat: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
    news: '<path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>',
    list: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>',
    folder: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
    steps: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    wa: '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>',
    edit: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    up: '<path d="M18 15l-6-6-6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', left: '<path d="M15 18l-6-6 6-6"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
    bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
    money: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  };
  D.ic = function (n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; };

  D.ring = function (pct, label) {
    var r = 54, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return '<div class="ring"><svg viewBox="0 0 132 132"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#37b6ff"/><stop offset="1" stop-color="#7ef0ff"/></linearGradient></defs>' +
      '<circle class="trk" cx="66" cy="66" r="' + r + '"/><circle class="val" cx="66" cy="66" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
      '<b><span>' + pct + '%' + (label ? '<small>' + D.esc(label) + '</small>' : '') + '</span></b></div>';
  };

  D.STAGE = {
    pendiente: { t: 'Pendiente', c: '' },
    en_curso: { t: 'En curso', c: 'info' },
    en_revision: { t: 'Para revisar', c: 'warn' },
    aprobada: { t: 'Aprobada', c: 'ok' },
  };
  D.PROJ = { activo: { t: 'Activo', c: 'info' }, pausado: { t: 'Pausado', c: 'warn' }, finalizado: { t: 'Finalizado', c: 'ok' } };
  D.chip = function (map, k) { var s = map[k] || { t: k, c: '' }; return '<span class="chip ' + s.c + '">' + D.esc(s.t) + '</span>'; };

  // toasts
  D.toast = function (msg, kind) {
    var box = D.$('.toasts') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toasts' }));
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.setAttribute('role', 'status');
    t.innerHTML = '<i></i><div>' + D.esc(msg) + '</div>';
    box.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s,transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; setTimeout(function () { t.remove(); }, 320); }, 3800);
  };

  // modal
  D.modal = function (o) {
    var el = document.createElement('div');
    el.className = 'modal';
    el.innerHTML = '<div class="modal-box ' + (o.wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + D.esc(o.title || '') + '">' +
      '<div class="modal-h"><h3>' + D.esc(o.title || '') + '</h3><button class="btn btn-ghost btn-icon" data-x aria-label="Cerrar">' + D.ic('x') + '</button></div>' +
      '<div class="modal-b">' + (o.body || '') + '</div>' +
      (o.foot === false ? '' : '<div class="modal-f">' + (o.foot || '') + '</div>') + '</div>';
    document.body.appendChild(el);
    var last = document.activeElement;
    function close() { el.remove(); document.removeEventListener('keydown', onKey); if (last && last.focus) last.focus(); if (o.onClose) o.onClose(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    el.addEventListener('mousedown', function (e) { if (e.target === el) close(); });
    el.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    setTimeout(function () { var f = el.querySelector('input,textarea,select,.btn-primary'); if (f) f.focus(); }, 30);
    return { el: el, close: close };
  };
  D.confirm = function (title, text, okLabel, danger) {
    return new Promise(function (res) {
      var m = D.modal({ title: title, body: '<p class="muted" style="margin:0">' + D.esc(text) + '</p>',
        foot: '<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + D.esc(okLabel || 'Confirmar') + '</button>',
        onClose: function () { res(false); } });
      m.el.querySelector('[data-ok]').addEventListener('click', function () { res(true); m.el.remove(); });
    });
  };

  D.lightbox = function (src) {
    var el = document.createElement('div');
    el.className = 'lightbox';
    el.innerHTML = '<img src="' + D.esc(src) + '" alt="">';
    el.addEventListener('click', function () { el.remove(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { el.remove(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(el);
  };

  D.copy = function (text) {
    var done = function () { D.toast('Copiado', 'ok'); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (_) {} t.remove(); }
  };

  // lectura de archivo → base64
  D.readFile = function (file) {
    return new Promise(function (res, rej) {
      if (file.size > 15 * 1024 * 1024) return rej(new Error('“' + file.name + '” supera los 15 MB'));
      var r = new FileReader();
      r.onload = function () { res({ name: file.name, type: file.type || 'application/octet-stream', data: String(r.result).split(',')[1] || '' }); };
      r.onerror = function () { rej(new Error('No se pudo leer el archivo')); };
      r.readAsDataURL(file);
    });
  };
  D.dropzone = function (el, onFiles) {
    var input = document.createElement('input');
    input.type = 'file'; input.multiple = true; input.hidden = true;
    el.appendChild(input);
    el.addEventListener('click', function (e) { if (e.target !== input) input.click(); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', function () { if (input.files.length) onFiles(Array.prototype.slice.call(input.files)); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.remove('is-over'); }); });
    el.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files; if (f && f.length) onFiles(Array.prototype.slice.call(f)); });
  };

  // tiempo real
  D.stream = function (onChange, onState) {
    var es, timer;
    function open() {
      try { es = new EventSource('/api/portal/stream'); } catch (_) { return; }
      es.onopen = function () { onState && onState(true); };
      es.addEventListener('change', function (e) { var d = {}; try { d = JSON.parse(e.data); } catch (_) {} onChange(d); });
      es.onerror = function () {
        onState && onState(false);
        if (es.readyState === 2) { clearTimeout(timer); timer = setTimeout(open, 5000); }
      };
    }
    open();
    // si la pestaña vuelve a estar visible, refrescar
    document.addEventListener('visibilitychange', function () { if (!document.hidden) onChange({ type: 'focus' }); });
  };

  // ver / ocultar contraseña
  D.pwToggles = function (root) {
    D.$$('.pw button', root).forEach(function (b) {
      b.innerHTML = D.ic('eye');
      b.addEventListener('click', function () {
        var i = b.parentNode.querySelector('input');
        var show = i.type === 'password';
        i.type = show ? 'text' : 'password';
        b.innerHTML = D.ic(show ? 'eyeOff' : 'eye');
        b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      });
    });
  };

  W.D = D;
})(window);
