/* Panel de administración · Delorrio.dev */
(function () {
  'use strict';
  var D = window.D, esc = D.esc, ic = D.ic;
  var app = document.getElementById('app');
  var PANEL_URL = location.origin + '/panel/';
  var S = {
    me: null, clients: [], projects: [], plans: {}, live: false, streaming: false,
    view: 'dash', pid: null, tab: 'resumen',
    q: '', pf: 'activo', cq: '',
    edit: null,        // copia editable del proyecto abierto
    compose: { title: '', body: '', link: '', images: [] },
    drafts: {},        // borradores de chat por proyecto
    navOpen: false,
  };
  var DAYS = { 'Web Start': 2, 'Web Pro': 10, 'E-commerce': 15, 'A medida': 15 };

  // ---------------- helpers ----------------
  function proj(id) { return S.projects.find(function (p) { return p.id === id; }); }
  function client(id) { return S.clients.find(function (c) { return c.id === id; }) || { name: '(cliente eliminado)', email: '', phone: '' }; }
  function unread(p) { return p.comments.filter(function (c) { return c.author === 'client' && !c.readByAdmin; }).length; }
  function waiting(p) { return p.stages.filter(function (s) { return s.status === 'en_revision'; }).length; }
  function curStage(p) { return p.stages.find(function (s) { return s.status === 'en_revision'; }) || p.stages.find(function (s) { return s.status === 'en_curso'; }) || p.stages.find(function (s) { return s.status === 'pendiente'; }); }
  function waPhone(ph) {
    var d = String(ph || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('598') === 0) return d;
    if (d[0] === '0') return '598' + d.slice(1);
    if (d.length === 8 && d[0] === '9') return '598' + d;
    return d;
  }
  function waLink(ph, text) { var n = waPhone(ph); return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text); }
  function addBusinessDays(n) {
    var d = new Date(); var added = 0;
    while (added < n) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) added++; }
    return d.toISOString().slice(0, 10);
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fileUrl(id) { return '/api/portal/file/' + encodeURIComponent(id); }
  function access(c) {
    return 'Hola ' + c.name.split(' ')[0] + '! Ya podés seguir tu proyecto en vivo en tu panel de cliente:\n' + PANEL_URL + '\n\nEmail: ' + c.email + '\nContraseña: ';
  }

  // ---------------- arranque ----------------
  D.api('me').then(function (me) {
    if (me.role === 'admin') { S.me = me; return load(true); }
    renderLogin(me.adminConfigured, me.adminIssue);
  }).catch(function () { renderLogin(true); });

  function renderLogin(configured, issue) {
    document.title = 'Ingresar · Admin Delorrio.dev';
    app.innerHTML = '<main class="auth"><div class="auth-box"><div class="auth-card">' +
      '<a class="logo" href="/">Delorrio.dev<i></i><small>Admin</small></a>' +
      '<h1>Panel de administración</h1><p>Gestioná clientes, proyectos y avances en tiempo real.</p>' +
      (configured === false ? '<div class="note" style="margin-bottom:16px">' + esc(issue || 'Falta configurar ADMIN_EMAIL y ADMIN_PASSWORD en Railway.') + '</div>' : '') +
      '<form id="lf" novalidate>' +
      '<label class="field"><span>Email</span><input class="input" type="email" name="email" autocomplete="username" required></label>' +
      '<label class="field"><span>Contraseña</span><div class="pw"><input class="input" type="password" name="password" autocomplete="current-password" required><button type="button" aria-label="Mostrar contraseña"></button></div></label>' +
      '<div class="form-err" id="lerr" role="alert"></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Ingresar</button></form></div></div></main>';
    D.pwToggles(app);
    var f = D.$('#lf'), er = D.$('#lerr');
    f.addEventListener('submit', function (e) {
      e.preventDefault(); er.textContent = '';
      var b = f.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Ingresando…';
      D.api('login', { method: 'POST', body: { email: f.email.value, password: f.password.value, mode: 'admin' } })
        .then(function () { return D.api('me'); }).then(function (me) { S.me = me; return load(true); })
        .catch(function (x) { er.textContent = x.message; b.disabled = false; b.textContent = 'Ingresar'; });
    });
    setTimeout(function () { f.email.focus(); }, 50);
  }

  // ---------------- datos ----------------
  var loading = false, again = false;
  function load(first) {
    if (loading) { again = true; return Promise.resolve(); }
    loading = true;
    return D.api('admin/state').then(function (d) {
      S.clients = d.clients; S.projects = d.projects; S.plans = d.plans;
      if (S.view === 'project' && !proj(S.pid)) { S.view = 'projects'; S.edit = null; }
      if (S.view === 'project' && S.edit && !S.edit.dirty) S.edit = mkEdit(proj(S.pid));
      if (typing()) pendingRender = true; else render();
      if (first && !S.streaming) {
        S.streaming = true;
        var t;
        D.stream(function (ev) {
          notify(ev);
          clearTimeout(t); t = setTimeout(function () { load(); }, 150);
        }, function (on) { S.live = on; D.$$('.js-live').forEach(function (l) { l.className = 'live js-live' + (on ? '' : ' off'); }); });
      }
    }).catch(function (e) { if (e.status === 401) renderLogin(); else D.toast(e.message, 'bad'); })
      .then(function () { loading = false; if (again) { again = false; load(); } });
  }

  var NOTE = { comment: 'te envió un mensaje', approve: 'aprobó una etapa', changes: 'pidió cambios', file: 'subió un archivo', task: 'actualizó sus pendientes' };
  function notify(ev) {
    if (!NOTE[ev.type]) return;
    var p = proj(ev.projectId);
    var who = p ? client(p.clientId).name : 'Un cliente';
    D.toast(who + ' ' + NOTE[ev.type], ev.type === 'approve' ? 'ok' : '');
  }

  // si estás escribiendo en un formulario, no redibujar hasta que salgas del campo
  var pendingRender = false;
  function typing() {
    var a = document.activeElement;
    return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.id !== 'chatTxt' && a.closest('.ad-main'));
  }
  document.addEventListener('focusout', function () {
    setTimeout(function () { if (pendingRender && !typing()) { pendingRender = false; render(); } }, 0);
  });

  function mkEdit(p) {
    return { pid: p.id, dirty: false, f: {
      name: p.name, clientId: p.clientId, plan: p.plan, status: p.status, startDate: p.startDate || '', dueDate: p.dueDate || '',
      previewUrl: p.previewUrl || '', internalNotes: p.internalNotes || '', progressOverride: p.progressOverride,
      stages: clone(p.stages), tasks: clone(p.tasks), payments: clone(p.payments),
    } };
  }
  function dirty() { if (S.edit && !S.edit.dirty) { S.edit.dirty = true; showSaveBar(); } }

  // ---------------- layout ----------------
  function render() {
    // guardar borrador del chat y foco
    var ta = D.$('#chatTxt'); if (ta && S.pid) S.drafts[S.pid] = ta.value;
    var focusId = document.activeElement && document.activeElement.id;
    var m = D.$('#msgs'), atBottom = !m || m.scrollHeight - m.scrollTop - m.clientHeight < 40;

    var totUnread = S.projects.reduce(function (a, p) { return a + unread(p); }, 0);
    document.title = (totUnread ? '(' + totUnread + ') ' : '') + 'Admin · Delorrio.dev';
    var nav = [['dash', 'grid', 'Dashboard', 0], ['projects', 'steps', 'Proyectos', totUnread], ['clients', 'users', 'Clientes', 0]];
    var side = '<aside class="ad-side' + (S.navOpen ? ' open' : '') + '"><a class="logo" href="/">Delorrio.dev<i></i><small>Admin</small></a><nav class="ad-nav">' +
      nav.map(function (n) { var on = S.view === n[0] || (n[0] === 'projects' && S.view === 'project'); return '<button data-nav="' + n[0] + '" class="' + (on ? 'on' : '') + '">' + ic(n[1]) + n[2] + (n[3] ? '<span class="count">' + n[3] + '</span>' : '') + '</button>'; }).join('') +
      '</nav><div class="ad-side-f"><span class="live js-live' + (S.live ? '' : ' off') + '"><i></i>En vivo</span><small>' + esc(S.me.email || '') + '</small>' +
      '<div style="display:flex;gap:6px"><a class="btn btn-sm" href="/panel/" target="_blank" rel="noopener" style="flex:1">' + ic('eye') + 'Vista cliente</a><button class="btn btn-sm btn-ghost" data-logout aria-label="Cerrar sesión">' + ic('logout') + '</button></div></div></aside>';
    var mtop = '<div class="ad-mtop"><button class="btn btn-ghost btn-icon" data-menu aria-label="Menú">' + ic('menu') + '</button><span class="logo">Delorrio.dev<i></i></span><span class="live js-live' + (S.live ? '' : ' off') + '"><i></i></span></div>';

    var main = S.view === 'dash' ? vDash() : S.view === 'projects' ? vProjects() : S.view === 'clients' ? vClients() : vProject();
    app.innerHTML = '<div class="ad">' + side + (S.navOpen ? '<div class="ad-scrim" data-menu></div>' : '') + '<div style="min-width:0">' + mtop + '<main class="ad-main">' + main + '</main></div></div>';
    bindShell(); bindView();

    var nta = D.$('#chatTxt'); if (nta) { nta.value = S.drafts[S.pid] || ''; autosize(nta); }
    if (focusId) { var fe = document.getElementById(focusId); if (fe && fe.focus) { fe.focus(); if (fe.setSelectionRange && typeof fe.value === 'string' && fe.type !== 'email' && fe.type !== 'number' && fe.type !== 'date') { try { fe.setSelectionRange(fe.value.length, fe.value.length); } catch (_) {} } } }
    var nm = D.$('#msgs'); if (nm && atBottom) nm.scrollTop = nm.scrollHeight;
    if (S.edit && S.edit.dirty) showSaveBar();
  }

  function go(view, extra) {
    if (S.edit && S.edit.dirty && !(view === 'project' && extra && extra.pid === S.pid)) {
      return D.confirm('Cambios sin guardar', 'Tenés cambios sin guardar en este proyecto. ¿Querés descartarlos?', 'Descartar', true).then(function (ok) { if (ok) { S.edit = null; go(view, extra); } });
    }
    S.view = view; S.navOpen = false;
    if (extra) Object.keys(extra).forEach(function (k) { S[k] = extra[k]; });
    if (view === 'project') { var p = proj(S.pid); S.edit = mkEdit(p); S.compose = { title: '', body: '', link: '', images: [] }; }
    else S.edit = null;
    render(); window.scrollTo(0, 0);
    if (view === 'project' && S.tab === 'mensajes') markRead(proj(S.pid));
  }

  function bindShell() {
    D.$$('[data-nav]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.nav); }); });
    D.$$('[data-menu]').forEach(function (b) { b.addEventListener('click', function () { S.navOpen = !S.navOpen; render(); }); });
    var lo = D.$('[data-logout]');
    if (lo) lo.addEventListener('click', function () { D.api('logout', { method: 'POST' }).then(function () { location.reload(); }); });
  }

  // ---------------- DASHBOARD ----------------
  function vDash() {
    var act = S.projects.filter(function (p) { return p.status === 'activo'; });
    var due = { UYU: 0, USD: 0 }, paid = { UYU: 0, USD: 0 };
    S.projects.forEach(function (p) { p.payments.forEach(function (x) { if (x.status === 'pagado') paid[x.currency] += x.amount; else due[x.currency] += x.amount; }); });
    var un = S.projects.reduce(function (a, p) { return a + unread(p); }, 0);
    var wt = S.projects.reduce(function (a, p) { return a + (p.status === 'activo' ? waiting(p) : 0); }, 0);
    var h = '<div class="ad-head"><div><h1>Hola, Santiago</h1><p>' + new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' }) + '</p></div>' +
      '<div class="ad-head-r"><button class="btn" data-new-client>' + ic('user') + 'Nuevo cliente</button><button class="btn btn-primary" data-new-project>' + ic('plus') + 'Nuevo proyecto</button></div></div>';
    h += '<div class="kpis">' +
      kpi('steps', 'Proyectos activos', act.length, S.projects.length + ' en total') +
      kpi('chat', 'Mensajes sin leer', un, wt ? wt + (wt === 1 ? ' etapa espera' : ' etapas esperan') + ' al cliente' : 'Todo al día') +
      kpi('money', 'Por cobrar', D.money(due.UYU, 'UYU'), due.USD ? '+ ' + D.money(due.USD, 'USD') : 'en pesos') +
      kpi('card', 'Cobrado', D.money(paid.UYU, 'UYU'), paid.USD ? '+ ' + D.money(paid.USD, 'USD') : 'en pesos') + '</div>';

    h += '<div class="ad-grid"><div style="display:grid;gap:20px;min-width:0"><section class="card"><div class="card-h"><h3>' + ic('rocket') + 'Proyectos en curso</h3><button class="btn btn-sm btn-ghost" data-nav="projects">Ver todos</button></div>' +
      (act.length ? projTable(act) : '<div class="empty">No hay proyectos activos. <button class="btn btn-sm" data-new-project style="margin-left:6px">' + ic('plus') + 'Crear uno</button></div>') + '</section>';

    var upcoming = act.filter(function (p) { return p.dueDate; }).sort(function (a, b) { return a.dueDate < b.dueDate ? -1 : 1; }).slice(0, 6);
    h += '<section class="card"><div class="card-h"><h3>' + ic('cal') + 'Próximas entregas</h3></div>' + (upcoming.length ? '<div class="files">' + upcoming.map(function (p) {
      var dd = D.daysTo(p.dueDate);
      return '<button class="file" data-open="' + p.id + '" style="cursor:pointer;text-align:left;color:inherit;font:inherit"><span class="ic">' + ic('cal') + '</span><span class="nm"><strong>' + esc(p.name) + '</strong><small>' + esc(client(p.clientId).name) + ' · ' + D.date(p.dueDate) + '</small></span>' +
        '<span class="chip ' + (dd < 0 ? 'bad' : dd <= 3 ? 'warn' : 'info') + '">' + (dd < 0 ? 'Vencida' : dd === 0 ? 'Hoy' : dd === 1 ? 'Mañana' : 'En ' + dd + ' días') + '</span></button>';
    }).join('') + '</div>' : '<div class="empty">Sin fechas de entrega cargadas.</div>') + '</section></div>';

    var feed = [];
    S.projects.forEach(function (p) { (p.activity || []).forEach(function (a) { if (a.by === 'client') feed.push({ a: a, p: p }); }); });
    feed.sort(function (x, y) { return x.a.at < y.a.at ? 1 : -1; });
    h += '<section class="card"><div class="card-h"><h3>' + ic('bell') + 'Actividad de clientes</h3></div>' + (feed.length ? '<ul class="acts">' + feed.slice(0, 14).map(function (x) {
      return '<li class="act client" data-open="' + x.p.id + '" style="cursor:pointer"><span class="ai">' + ic(ACT_IC[x.a.type] || 'flag') + '</span><p><b>' + esc(client(x.p.clientId).name) + '</b> ' + esc(lc(x.a.text)) + '<span class="sub dim" style="display:block;font-size:12px">' + esc(x.p.name) + '</span></p><time>' + D.ago(x.a.at) + '</time></li>';
    }).join('') + '</ul>' : '<div class="empty">Cuando tus clientes aprueben etapas, suban archivos o te escriban, lo vas a ver acá en vivo.</div>') + '</section></div>';
    return h;
  }
  function lc(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  function kpi(i, label, val, sub) { return '<div class="kpi"><span>' + ic(i) + esc(label) + '</span><b>' + esc(String(val)) + '</b><small>' + esc(sub) + '</small></div>'; }
  var ACT_IC = { approve: 'check', changes: 'edit', comment: 'chat', task: 'list', file: 'folder', update: 'news', stage: 'steps', payment: 'money', create: 'flag', status: 'flag' };

  function projTable(list) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Proyecto</th><th>Etapa</th><th>Avance</th><th>Entrega</th><th></th></tr></thead><tbody>' + list.map(function (p) {
      var c = client(p.clientId), cs = curStage(p), u = unread(p), w = waiting(p), dd = D.daysTo(p.dueDate);
      return '<tr class="click" data-open="' + p.id + '" tabindex="0"><td><b>' + esc(p.name) + '</b><span class="sub">' + esc(c.name) + (c.company ? ' · ' + esc(c.company) : '') + ' · ' + esc(p.plan) + '</span></td>' +
        '<td>' + (p.status !== 'activo' ? D.chip(D.PROJ, p.status) : cs ? esc(cs.name) + '<span class="sub">' + D.STAGE[cs.status].t + '</span>' : '—') + '</td>' +
        '<td><div class="prog"><div class="bar"><i style="width:' + p.progress + '%"></i></div><b>' + p.progress + '%</b></div></td>' +
        '<td>' + (p.dueDate ? D.date(p.dueDate) + (p.status === 'activo' && dd !== null && dd < 0 ? '<span class="sub" style="color:var(--bad)">Vencida</span>' : '') : '<span class="dim">—</span>') + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' + (u ? '<span class="chip info" title="Mensajes sin leer">' + u + ' msj</span> ' : '') + (w ? '<span class="chip warn" title="Esperando aprobación del cliente">En revisión</span>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  // ---------------- PROYECTOS ----------------
  function vProjects() {
    var q = S.q.toLowerCase();
    var list = S.projects.filter(function (p) {
      if (S.pf !== 'todos' && p.status !== S.pf) return false;
      if (!q) return true;
      var c = client(p.clientId);
      return (p.name + ' ' + c.name + ' ' + c.company + ' ' + p.plan).toLowerCase().indexOf(q) >= 0;
    });
    var counts = { todos: S.projects.length };
    S.projects.forEach(function (p) { counts[p.status] = (counts[p.status] || 0) + 1; });
    return '<div class="ad-head"><div><h1>Proyectos</h1><p>' + S.projects.length + ' en total</p></div><div class="ad-head-r"><button class="btn btn-primary" data-new-project>' + ic('plus') + 'Nuevo proyecto</button></div></div>' +
      '<section class="card"><div class="toolbar"><input class="input" id="pq" type="search" placeholder="Buscar por proyecto o cliente…" value="' + esc(S.q) + '">' +
      '<div class="seg" role="tablist">' + [['activo', 'Activos'], ['pausado', 'Pausados'], ['finalizado', 'Finalizados'], ['todos', 'Todos']].map(function (x) { return '<button data-pf="' + x[0] + '" class="' + (S.pf === x[0] ? 'on' : '') + '">' + x[1] + ' <span class="dim">' + (counts[x[0]] || 0) + '</span></button>'; }).join('') + '</div></div>' +
      (list.length ? projTable(list) : '<div class="empty">' + (S.projects.length ? 'No hay proyectos con ese filtro.' : 'Todavía no creaste proyectos.') + '</div>') + '</section>';
  }

  // ---------------- CLIENTES ----------------
  function vClients() {
    var q = S.cq.toLowerCase();
    var list = S.clients.filter(function (c) { return !q || (c.name + ' ' + c.email + ' ' + c.company + ' ' + c.phone).toLowerCase().indexOf(q) >= 0; });
    return '<div class="ad-head"><div><h1>Clientes</h1><p>' + S.clients.length + ' con acceso al panel</p></div><div class="ad-head-r"><button class="btn btn-primary" data-new-client>' + ic('plus') + 'Nuevo cliente</button></div></div>' +
      '<section class="card"><div class="toolbar"><input class="input" id="cq" type="search" placeholder="Buscar cliente…" value="' + esc(S.cq) + '"></div>' +
      (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>Contacto</th><th>Proyectos</th><th>Último ingreso</th><th>Acceso</th><th></th></tr></thead><tbody>' + list.map(function (c) {
        var ps = S.projects.filter(function (p) { return p.clientId === c.id; });
        return '<tr><td><div style="display:flex;align-items:center;gap:12px"><span class="avatar">' + esc(D.initials(c.name)) + '</span><div><b>' + esc(c.name) + '</b><span class="sub">' + esc(c.company || '—') + '</span></div></div></td>' +
          '<td>' + esc(c.email) + '<span class="sub">' + esc(c.phone || 'sin teléfono') + '</span></td>' +
          '<td>' + (ps.length ? ps.map(function (p) { return '<button class="btn btn-sm btn-ghost" data-open="' + p.id + '" style="padding:4px 8px">' + esc(p.name) + '</button>'; }).join('') : '<span class="dim">—</span>') + '</td>' +
          '<td>' + (c.lastLogin ? D.ago(c.lastLogin) : '<span class="dim">Nunca</span>') + '</td>' +
          '<td>' + (c.active ? '<span class="chip ok">Activo</span>' : '<span class="chip">Bloqueado</span>') + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="btn btn-sm" data-cedit="' + c.id + '">' + ic('edit') + 'Editar</button> <button class="btn btn-sm" data-creset="' + c.id + '" title="Generar nueva contraseña">' + ic('key') + 'Acceso</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">' + (S.clients.length ? 'Sin resultados.' : 'Todavía no hay clientes. Creá el primero para darle acceso a su panel.') + '</div>') + '</section>';
  }

  // ---------------- PROYECTO ----------------
  var TABS = [['resumen', 'Resumen'], ['etapas', 'Etapas'], ['novedades', 'Novedades'], ['mensajes', 'Mensajes'], ['pendientes', 'Pendientes'], ['pagos', 'Pagos'], ['archivos', 'Archivos']];
  function vProject() {
    var p = proj(S.pid), c = client(p.clientId), E = S.edit.f;
    var u = unread(p);
    var h = '<button class="back" data-nav="projects">' + ic('left') + 'Proyectos</button>';
    h += '<section class="card pj-head"><div class="pj-head-l">' + D.ring(p.progress) + '<div style="min-width:0"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">' + D.chip(D.PROJ, p.status) + '<span class="chip plain">' + esc(p.plan) + '</span></div><h2>' + esc(p.name) + '</h2>' +
      '<div class="meta"><span>' + ic('user').replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"') + ' ' + esc(c.name) + (c.company ? ' · ' + esc(c.company) : '') + '</span><span>Entrega: ' + D.date(p.dueDate) + '</span>' + (c.lastLogin ? '<span>Último ingreso del cliente: ' + D.ago(c.lastLogin) + '</span>' : '<span>El cliente aún no ingresó</span>') + '</div></div></div>' +
      '<div class="ad-head-r">' + (p.previewUrl ? '<a class="btn" href="' + esc(p.previewUrl) + '" target="_blank" rel="noopener">' + ic('ext') + 'Vista previa</a>' : '') +
      (c.phone ? '<a class="btn" href="' + esc(waLink(c.phone, 'Hola ' + c.name.split(' ')[0] + '! Hay novedades en tu proyecto. Miralas en tu panel: ' + PANEL_URL)) + '" target="_blank" rel="noopener">' + ic('wa') + 'Avisar al cliente</a>' : '') +
      '</div></section>';
    h += '<div class="tabs" role="tablist">' + TABS.map(function (t) {
      var badge = t[0] === 'mensajes' && u ? '<span class="count">' + u + '</span>' : t[0] === 'pendientes' ? '<span class="dim">' + p.tasks.filter(function (x) { return !x.done; }).length + '</span>' : t[0] === 'archivos' && p.files.length ? '<span class="dim">' + p.files.length + '</span>' : '';
      return '<button role="tab" data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + badge + '</button>';
    }).join('') + '</div>';
    h += ({ resumen: tResumen, etapas: tEtapas, novedades: tNovedades, mensajes: tMensajes, pendientes: tPendientes, pagos: tPagos, archivos: tArchivos })[S.tab](p, E, c);
    return h;
  }

  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(label) + '</option>'; }

  function tResumen(p, E) {
    var auto = E.progressOverride === null || E.progressOverride === undefined;
    var h = '<div class="ad-grid"><div style="display:grid;gap:20px;min-width:0"><section class="card"><div class="card-h"><h3>' + ic('edit') + 'Datos del proyecto</h3></div><div style="display:grid;gap:14px">' +
      '<label class="field"><span>Nombre del proyecto</span><input class="input" id="f-name" data-f="name" value="' + esc(E.name) + '"></label>' +
      '<div class="grid2"><label class="field"><span>Cliente</span><select class="select" id="f-client" data-f="clientId">' + S.clients.map(function (c) { return opt(c.id, c.name + (c.company ? ' · ' + c.company : ''), E.clientId); }).join('') + '</select></label>' +
      '<label class="field"><span>Plan</span><select class="select" id="f-plan" data-f="plan">' + Object.keys(S.plans).map(function (k) { return opt(k, k, E.plan); }).join('') + '</select></label></div>' +
      '<div class="grid3"><label class="field"><span>Estado</span><select class="select" id="f-status" data-f="status">' + opt('activo', 'Activo', E.status) + opt('pausado', 'Pausado', E.status) + opt('finalizado', 'Finalizado', E.status) + '</select></label>' +
      '<label class="field"><span>Inicio</span><input class="input" type="date" id="f-start" data-f="startDate" value="' + esc(E.startDate) + '"></label>' +
      '<label class="field"><span>Entrega estimada</span><input class="input" type="date" id="f-due" data-f="dueDate" value="' + esc(E.dueDate) + '"></label></div>' +
      '<label class="field"><span>Link de vista previa</span><input class="input" type="url" id="f-prev" data-f="previewUrl" placeholder="https://…" value="' + esc(E.previewUrl) + '"></label>' +
      '<div class="field"><span>Avance que ve el cliente</span><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<div class="seg"><button type="button" data-prog="auto" class="' + (auto ? 'on' : '') + '">Automático</button><button type="button" data-prog="manual" class="' + (!auto ? 'on' : '') + '">Manual</button></div>' +
      (auto ? '<span class="muted" style="font-size:13.5px">Se calcula con las etapas · hoy ' + p.progress + '%</span>' : '<input class="input" type="range" min="0" max="100" step="5" id="f-prog" value="' + E.progressOverride + '" style="flex:1;min-width:140px;padding:0;border:0;background:none;box-shadow:none;accent-color:#37b6ff"><b id="f-prog-v" style="width:44px;text-align:right">' + E.progressOverride + '%</b>') +
      '</div></div></div></section>' +
      '<section class="card"><div class="card-h"><h3>' + ic('key') + 'Notas internas</h3><span class="dim" style="font-size:12.5px">Solo las ves vos</span></div><textarea class="textarea" id="f-notes" data-f="internalNotes" rows="6" placeholder="Accesos, ideas, acuerdos con el cliente…">' + esc(E.internalNotes) + '</textarea></section>' +
      '<section class="card"><div class="card-h"><h3 style="color:var(--bad)">' + ic('alert').replace('stroke="currentColor"', 'stroke="#f87171"') + 'Zona de peligro</h3></div><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><p class="muted" style="margin:0;font-size:14px">Eliminar el proyecto borra etapas, mensajes y archivos. No se puede deshacer.</p><button class="btn btn-danger" data-delproj>' + ic('trash') + 'Eliminar proyecto</button></div></section></div>';
    h += '<section class="card"><div class="card-h"><h3>' + ic('clock') + 'Historial</h3></div>' + ((p.activity || []).length ? '<ul class="acts">' + p.activity.slice(0, 40).map(function (a) {
      return '<li class="act ' + (a.by === 'client' ? 'client' : '') + '"><span class="ai">' + ic(ACT_IC[a.type] || 'flag') + '</span><p><b>' + (a.by === 'client' ? 'Cliente' : 'Vos') + ':</b> ' + esc(lc(a.text)) + '</p><time title="' + esc(new Date(a.at).toLocaleString('es-UY')) + '">' + D.ago(a.at) + '</time></li>';
    }).join('') + '</ul>' : '<div class="empty">Sin actividad todavía.</div>') + '</section></div>';
    return h;
  }

  function tEtapas(p, E) {
    var h = '<section class="card"><div class="card-h"><h3>' + ic('steps') + 'Etapas</h3><span class="muted" style="font-size:13px">Cuando pongas una etapa en <b style="color:var(--warn)">Para revisar</b>, el cliente puede aprobarla o pedir cambios.</span></div>';
    h += E.stages.map(function (s, i) {
      return '<div class="st-row"><span class="num">' + (i + 1) + '</span><div class="st-f"><input class="input" data-st="' + i + '" data-k="name" value="' + esc(s.name) + '" aria-label="Nombre de la etapa">' +
        '<input class="input" data-st="' + i + '" data-k="note" value="' + esc(s.note || '') + '" placeholder="Nota para el cliente (opcional)" aria-label="Nota"></div>' +
        '<select class="select st-sel" data-st="' + i + '" data-k="status" aria-label="Estado">' + Object.keys(D.STAGE).map(function (k) { return opt(k, D.STAGE[k].t, s.status); }).join('') + '</select>' +
        '<div class="st-btns"><button class="btn btn-ghost btn-icon" data-stmv="' + i + ':-1" aria-label="Subir" ' + (i === 0 ? 'disabled' : '') + '>' + ic('up') + '</button><button class="btn btn-ghost btn-icon" data-stmv="' + i + ':1" aria-label="Bajar" ' + (i === E.stages.length - 1 ? 'disabled' : '') + '>' + ic('down') + '</button><button class="btn btn-ghost btn-icon" data-stdel="' + i + '" aria-label="Eliminar etapa">' + ic('trash') + '</button></div></div>';
    }).join('');
    return h + '<button class="btn btn-sm" data-stadd style="margin-top:14px">' + ic('plus') + 'Agregar etapa</button></section>';
  }

  function tNovedades(p) {
    var imgs = p.files.filter(D.isImg), C = S.compose;
    var h = '<div class="ad-grid"><section class="card"><div class="card-h"><h3>' + ic('news') + 'Nueva novedad</h3><span class="dim" style="font-size:12.5px">El cliente la ve al instante</span></div><div style="display:grid;gap:14px">' +
      '<label class="field"><span>Título</span><input class="input" id="c-title" data-c="title" maxlength="160" placeholder="Ej.: Terminé el diseño de la portada" value="' + esc(C.title) + '"></label>' +
      '<label class="field"><span>Detalle</span><textarea class="textarea" id="c-body" data-c="body" rows="5" placeholder="Contale qué hiciste, qué sigue o qué necesitás que revise…">' + esc(C.body) + '</textarea></label>' +
      '<label class="field"><span>Link (opcional)</span><input class="input" id="c-link" data-c="link" type="url" placeholder="https://…" value="' + esc(C.link) + '"></label>' +
      '<div class="field"><span>Imágenes</span>' + (imgs.length ? '<div class="img-pick">' + imgs.map(function (f) { return '<label title="' + esc(f.name) + '"><input type="checkbox" data-cimg="' + f.id + '" ' + (C.images.indexOf(f.id) >= 0 ? 'checked' : '') + '><img src="' + fileUrl(f.id) + '" alt="' + esc(f.name) + '" loading="lazy"></label>'; }).join('') + '</div>' : '') +
      '<div class="drop" id="cdrop" tabindex="0" role="button" style="padding:12px">' + ic('upload') + '<span>Subir capturas para esta novedad</span></div></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn btn-primary" data-publish>' + ic('send') + 'Publicar</button></div></div></section>';
    h += '<section class="card"><div class="card-h"><h3>Publicadas</h3><span class="dim">' + p.updates.length + '</span></div>' + (p.updates.length ? '<div class="feed">' + p.updates.map(function (u) {
      return '<article class="post"><div class="post-h"><h4>' + esc(u.title) + '</h4><div style="display:flex;gap:6px;align-items:center"><time>' + D.ago(u.createdAt) + '</time><button class="btn btn-ghost btn-icon" data-delupd="' + u.id + '" aria-label="Eliminar">' + ic('trash') + '</button></div></div>' +
        (u.body ? '<p>' + D.rich(u.body) + '</p>' : '') + ((u.images || []).length ? '<div class="shots">' + u.images.map(function (id) { return '<button data-zoom="' + fileUrl(id) + '"><img src="' + fileUrl(id) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '') +
        (u.link ? '<a class="btn btn-sm post-link" href="' + esc(u.link) + '" target="_blank" rel="noopener">' + ic('ext') + 'Link</a>' : '') + '</article>';
    }).join('') + '</div>' : '<div class="empty">Todavía no publicaste novedades.</div>') + '</section></div>';
    return h;
  }

  function tMensajes(p, E, c) {
    var h = '<div class="ad-grid"><section class="card"><div class="card-h"><h3>' + ic('chat') + 'Conversación con ' + esc(c.name) + '</h3></div><div class="chat" style="height:520px"><div class="msgs" id="msgs">';
    if (!p.comments.length) h += '<div class="empty" style="margin:auto 0">Sin mensajes todavía.</div>';
    var last = '';
    p.comments.forEach(function (m) {
      var day = new Date(m.createdAt).toDateString();
      if (day !== last) { h += '<span class="day-sep">' + (day === new Date().toDateString() ? 'Hoy' : D.date(m.createdAt)) + '</span>'; last = day; }
      h += '<div class="msg ' + (m.author === 'admin' ? 'me' : 'them') + '">' + D.rich(m.text) + '<time>' + D.time(m.createdAt) + (m.author === 'admin' ? (m.readByClient ? ' · Visto' : ' · Enviado') : '') + '</time></div>';
    });
    h += '</div><form class="chat-in" id="chatF"><textarea class="textarea" id="chatTxt" rows="1" placeholder="Responder… (Enter para enviar)" maxlength="3000" aria-label="Mensaje"></textarea><button class="btn btn-primary" type="submit" aria-label="Enviar">' + ic('send') + '</button></form></div></section>';
    h += '<section class="card"><div class="card-h"><h3>' + ic('user') + 'Contacto</h3></div><div class="cred"><div><span>Nombre</span><b>' + esc(c.name) + '</b></div><div><span>Email</span><b>' + esc(c.email) + '</b></div><div><span>Teléfono</span><b>' + esc(c.phone || '—') + '</b></div></div>' +
      '<div style="display:grid;gap:8px;margin-top:14px">' + (c.phone ? '<a class="btn" href="' + esc(waLink(c.phone, 'Hola ' + c.name.split(' ')[0] + '! Te respondí en tu panel: ' + PANEL_URL)) + '" target="_blank" rel="noopener">' + ic('wa') + 'Avisar por WhatsApp</a>' : '') +
      '<a class="btn" href="mailto:' + esc(c.email) + '">' + ic('send') + 'Enviar email</a></div></section></div>';
    return h;
  }

  function tPendientes(p, E) {
    var h = '<section class="card"><div class="card-h"><h3>' + ic('list') + 'Lo que necesitás del cliente</h3><span class="dim" style="font-size:12.5px">El cliente puede marcarlos como enviados</span></div>';
    h += E.tasks.length ? E.tasks.map(function (t, i) {
      return '<div class="list-row"><label class="check" style="padding:0;border:0;background:none"><input type="checkbox" data-tk="' + i + '" data-k="done" ' + (t.done ? 'checked' : '') + '><span class="box">' + ic('check') + '</span></label>' +
        '<input class="input" data-tk="' + i + '" data-k="text" value="' + esc(t.text) + '" aria-label="Pendiente">' +
        '<div style="display:flex;align-items:center;gap:6px">' + (t.done && t.doneBy === 'client' ? '<span class="chip ok" title="Marcado por el cliente">Cliente</span>' : '') + '<button class="btn btn-ghost btn-icon" data-tkdel="' + i + '" aria-label="Eliminar">' + ic('trash') + '</button></div></div>';
    }).join('') : '<div class="empty">Sin pendientes.</div>';
    return h + '<button class="btn btn-sm" data-tkadd style="margin-top:14px">' + ic('plus') + 'Agregar pendiente</button></section>';
  }

  function tPagos(p, E) {
    var h = '<section class="card"><div class="card-h"><h3>' + ic('card') + 'Pagos</h3></div>';
    h += E.payments.length ? E.payments.map(function (x, i) {
      return '<div class="pay-row"><input class="input" data-py="' + i + '" data-k="label" value="' + esc(x.label) + '" aria-label="Concepto">' +
        '<input class="input" type="number" min="0" step="1" data-py="' + i + '" data-k="amount" value="' + esc(x.amount) + '" aria-label="Monto">' +
        '<select class="select" data-py="' + i + '" data-k="currency" aria-label="Moneda">' + opt('UYU', 'UYU', x.currency) + opt('USD', 'USD', x.currency) + '</select>' +
        '<input class="input" type="date" data-py="' + i + '" data-k="dueDate" value="' + esc(x.dueDate || '') + '" aria-label="Vencimiento">' +
        '<select class="select" data-py="' + i + '" data-k="status" aria-label="Estado">' + opt('pendiente', 'Pendiente', x.status) + opt('pagado', 'Pagado', x.status) + '</select>' +
        '<button class="btn btn-ghost btn-icon" data-pydel="' + i + '" aria-label="Eliminar">' + ic('trash') + '</button></div>';
    }).join('') : '<div class="empty">Sin pagos cargados.</div>';
    var t = {};
    E.payments.forEach(function (x) { t[x.currency] = t[x.currency] || { a: 0, p: 0 }; t[x.currency].a += Number(x.amount) || 0; if (x.status === 'pagado') t[x.currency].p += Number(x.amount) || 0; });
    h += '<button class="btn btn-sm" data-pyadd style="margin-top:14px">' + ic('plus') + 'Agregar pago</button>';
    h += Object.keys(t).map(function (k) { return '<div class="sum-row"><span>Total ' + k + ': <b>' + D.money(t[k].a, k) + '</b></span><span>Cobrado: <b style="color:var(--ok)">' + D.money(t[k].p, k) + '</b></span><span>Pendiente: <b style="color:var(--warn)">' + D.money(t[k].a - t[k].p, k) + '</b></span></div>'; }).join('');
    return h + '</section>';
  }

  function tArchivos(p) {
    var h = '<section class="card"><div class="card-h"><h3>' + ic('folder') + 'Archivos del proyecto</h3></div><div class="drop" id="adrop" tabindex="0" role="button">' + ic('upload') + '<span><b>Subí archivos</b> o arrastralos acá</span><small>El cliente los ve al instante · hasta 15 MB cada uno</small></div>';
    if (p.files.length) h += '<div class="files" style="margin-top:14px">' + p.files.map(function (f) {
      return '<div class="file"><span class="ic">' + (D.isImg(f) ? '<img src="' + fileUrl(f.id) + '" alt="" loading="lazy">' : esc(D.ext(f.name))) + '</span><div class="nm"><a href="' + fileUrl(f.id) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a><small>' + D.size(f.size) + ' · ' + (f.by === 'client' ? '<span style="color:var(--accent)">Subido por el cliente</span>' : 'Subido por vos') + ' · ' + D.date(f.createdAt) + '</small></div>' +
        '<a class="btn btn-ghost btn-icon" href="' + fileUrl(f.id) + '?dl=1" aria-label="Descargar">' + ic('download') + '</a><button class="btn btn-ghost btn-icon" data-fdel="' + f.id + '" aria-label="Eliminar">' + ic('trash') + '</button></div>';
    }).join('') + '</div>';
    return h + '</section>';
  }

  // ---------------- barra de guardado ----------------
  function showSaveBar() {
    if (D.$('.save-bar') || !S.edit || ['resumen', 'etapas', 'pendientes', 'pagos'].indexOf(S.tab) < 0) return;
    var main = D.$('.ad-main'); if (!main) return;
    var bar = document.createElement('div');
    bar.className = 'save-bar';
    bar.innerHTML = '<p>Tenés cambios sin guardar</p><div style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm" data-discard>Descartar</button><button class="btn btn-primary btn-sm" data-save>' + ic('check') + 'Guardar cambios</button></div>';
    main.appendChild(bar);
    bar.querySelector('[data-discard]').addEventListener('click', function () { S.edit = mkEdit(proj(S.pid)); render(); });
    bar.querySelector('[data-save]').addEventListener('click', save);
  }
  function save() {
    var E = S.edit.f, b = D.$('[data-save]');
    if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
    var body = {
      name: E.name, clientId: E.clientId, plan: E.plan, status: E.status, startDate: E.startDate, dueDate: E.dueDate,
      previewUrl: E.previewUrl, internalNotes: E.internalNotes, progressOverride: E.progressOverride === undefined ? null : E.progressOverride,
      stages: E.stages, tasks: E.tasks, payments: E.payments.map(function (x) { return Object.assign({}, x, { amount: Number(x.amount) || 0 }); }),
    };
    D.api('admin/projects/' + S.pid, { method: 'PATCH', body: body }).then(function () {
      S.edit.dirty = false; D.toast('Cambios guardados · el cliente ya los ve', 'ok'); return load();
    }).catch(function (e) { D.toast(e.message, 'bad'); if (b) { b.disabled = false; b.textContent = 'Guardar cambios'; } });
  }

  // ---------------- eventos de la vista ----------------
  function bindView() {
    D.$$('[data-open]').forEach(function (el) {
      var open = function (e) { if (e.target.closest('a,button') && e.target.closest('a,button') !== el) return; S.tab = 'resumen'; go('project', { pid: el.dataset.open }); };
      el.addEventListener('click', open);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(e); });
    });
    D.$$('[data-new-client]').forEach(function (b) { b.addEventListener('click', function () { clientModal(); }); });
    D.$$('[data-new-project]').forEach(function (b) { b.addEventListener('click', function () { projectModal(); }); });
    D.$$('[data-zoom]').forEach(function (b) { b.addEventListener('click', function () { D.lightbox(b.dataset.zoom); }); });

    var pq = D.$('#pq'); if (pq) pq.addEventListener('input', function () { S.q = pq.value; render(); });
    D.$$('[data-pf]').forEach(function (b) { b.addEventListener('click', function () { S.pf = b.dataset.pf; render(); }); });
    var cq = D.$('#cq'); if (cq) cq.addEventListener('input', function () { S.cq = cq.value; render(); });
    D.$$('[data-cedit]').forEach(function (b) { b.addEventListener('click', function () { clientModal(S.clients.find(function (c) { return c.id === b.dataset.cedit; })); }); });
    D.$$('[data-creset]').forEach(function (b) { b.addEventListener('click', function () { resetAccess(S.clients.find(function (c) { return c.id === b.dataset.creset; })); }); });

    if (S.view !== 'project') return;
    var p = proj(S.pid), E = S.edit.f;

    D.$$('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.tab = b.dataset.tab; render();
        if (S.tab === 'mensajes') { markRead(p); var m = D.$('#msgs'); if (m) m.scrollTop = m.scrollHeight; }
      });
    });

    // resumen
    D.$$('[data-f]').forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', function () {
        E[el.dataset.f] = el.value;
        if (el.dataset.f === 'plan' && !E.dueDate) E.dueDate = addBusinessDays(DAYS[el.value] || 10);
        dirty();
      });
    });
    D.$$('[data-prog]').forEach(function (b) {
      b.addEventListener('click', function () { E.progressOverride = b.dataset.prog === 'auto' ? null : (typeof E.progressOverride === 'number' ? E.progressOverride : p.progress); dirty(); render(); });
    });
    var pr = D.$('#f-prog');
    if (pr) pr.addEventListener('input', function () { E.progressOverride = Number(pr.value); D.$('#f-prog-v').textContent = pr.value + '%'; dirty(); });
    var dp = D.$('[data-delproj]');
    if (dp) dp.addEventListener('click', function () {
      D.confirm('Eliminar “' + p.name + '”', 'Se borran etapas, novedades, mensajes, pagos y archivos de este proyecto. No se puede deshacer.', 'Eliminar definitivamente', true).then(function (ok) {
        if (!ok) return;
        D.api('admin/projects/' + p.id, { method: 'DELETE' }).then(function () { S.edit = null; D.toast('Proyecto eliminado', 'ok'); S.view = 'projects'; load(); }).catch(function (e) { D.toast(e.message, 'bad'); });
      });
    });

    // etapas
    D.$$('[data-st]').forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { E.stages[+el.dataset.st][el.dataset.k] = el.value; dirty(); });
    });
    D.$$('[data-stmv]').forEach(function (b) {
      b.addEventListener('click', function () { var a = b.dataset.stmv.split(':'), i = +a[0], j = i + (+a[1]); var t = E.stages[i]; E.stages[i] = E.stages[j]; E.stages[j] = t; dirty(); render(); });
    });
    D.$$('[data-stdel]').forEach(function (b) { b.addEventListener('click', function () { E.stages.splice(+b.dataset.stdel, 1); dirty(); render(); }); });
    var sa = D.$('[data-stadd]'); if (sa) sa.addEventListener('click', function () { E.stages.push({ id: 'n' + Date.now(), name: 'Nueva etapa', status: 'pendiente', note: '' }); dirty(); render(); var ins = D.$$('[data-st][data-k=name]'); var last = ins[ins.length - 1]; if (last) { last.focus(); last.select(); } });

    // pendientes
    D.$$('[data-tk]').forEach(function (el) {
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () { var t = E.tasks[+el.dataset.tk]; if (el.type === 'checkbox') { t.done = el.checked; if (!el.checked) t.doneBy = null; } else t.text = el.value; dirty(); });
    });
    D.$$('[data-tkdel]').forEach(function (b) { b.addEventListener('click', function () { E.tasks.splice(+b.dataset.tkdel, 1); dirty(); render(); }); });
    var ta = D.$('[data-tkadd]'); if (ta) ta.addEventListener('click', function () { E.tasks.push({ id: 'n' + Date.now(), text: '', done: false }); dirty(); render(); var ins = D.$$('[data-tk][data-k=text]'); var l = ins[ins.length - 1]; if (l) l.focus(); });

    // pagos
    D.$$('[data-py]').forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', function () { E.payments[+el.dataset.py][el.dataset.k] = el.value; dirty(); if (el.tagName === 'SELECT' || el.dataset.k === 'amount') updateSums(); });
    });
    D.$$('[data-pydel]').forEach(function (b) { b.addEventListener('click', function () { E.payments.splice(+b.dataset.pydel, 1); dirty(); render(); }); });
    var pa = D.$('[data-pyadd]'); if (pa) pa.addEventListener('click', function () { E.payments.push({ id: 'n' + Date.now(), label: 'Pago', amount: 0, currency: (E.payments[0] || {}).currency || 'UYU', status: 'pendiente', dueDate: '' }); dirty(); render(); });

    // novedades
    D.$$('[data-c]').forEach(function (el) { el.addEventListener('input', function () { S.compose[el.dataset.c] = el.value; }); });
    D.$$('[data-cimg]').forEach(function (el) {
      el.addEventListener('change', function () { var a = S.compose.images, i = a.indexOf(el.dataset.cimg); if (el.checked && i < 0) a.push(el.dataset.cimg); if (!el.checked && i >= 0) a.splice(i, 1); });
    });
    var cd = D.$('#cdrop');
    if (cd) D.dropzone(cd, function (files) {
      uploadFiles(p, files.filter(function (f) { return /^image\//.test(f.type); }), cd).then(function (ids) { ids.forEach(function (id) { S.compose.images.push(id); }); load(); });
    });
    var pb = D.$('[data-publish]');
    if (pb) pb.addEventListener('click', function () {
      var C = S.compose;
      if (!C.title.trim()) { D.$('#c-title').focus(); D.toast('Poné un título', 'bad'); return; }
      pb.disabled = true;
      D.api('admin/projects/' + p.id + '/updates', { method: 'POST', body: C }).then(function () {
        S.compose = { title: '', body: '', link: '', images: [] }; D.toast('Novedad publicada · el cliente ya la ve', 'ok'); load();
      }).catch(function (e) { pb.disabled = false; D.toast(e.message, 'bad'); });
    });
    D.$$('[data-delupd]').forEach(function (b) {
      b.addEventListener('click', function () {
        D.confirm('Eliminar novedad', 'El cliente dejará de verla.', 'Eliminar', true).then(function (ok) { if (ok) D.api('admin/projects/' + p.id + '/updates/' + b.dataset.delupd, { method: 'DELETE' }).then(function () { load(); }); });
      });
    });

    // mensajes
    var cf = D.$('#chatF'), tx = D.$('#chatTxt');
    if (cf) {
      tx.addEventListener('input', function () { S.drafts[p.id] = tx.value; autosize(tx); });
      tx.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); cf.requestSubmit(); } });
      cf.addEventListener('submit', function (e) {
        e.preventDefault();
        var t = tx.value.trim(); if (!t) return;
        tx.value = ''; S.drafts[p.id] = ''; autosize(tx);
        D.api('admin/projects/' + p.id + '/comment', { method: 'POST', body: { text: t } }).then(function () { load(); }).catch(function (er) { tx.value = t; D.toast(er.message, 'bad'); });
      });
      if (S.tab === 'mensajes') markRead(p);
    }

    // archivos
    var ad = D.$('#adrop');
    if (ad) D.dropzone(ad, function (files) { uploadFiles(p, files, ad).then(function (ids) { if (ids.length) D.toast(ids.length === 1 ? 'Archivo subido' : ids.length + ' archivos subidos', 'ok'); load(); }); });
    D.$$('[data-fdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        D.confirm('Eliminar archivo', 'Se borra del proyecto y de las novedades donde aparezca.', 'Eliminar', true).then(function (ok) { if (ok) D.api('admin/projects/' + p.id + '/files/' + b.dataset.fdel, { method: 'DELETE' }).then(function () { load(); }); });
      });
    });
  }

  function updateSums() {
    // recalcula totales sin perder el foco
    var E = S.edit.f, t = {};
    E.payments.forEach(function (x) { t[x.currency] = t[x.currency] || { a: 0, p: 0 }; t[x.currency].a += Number(x.amount) || 0; if (x.status === 'pagado') t[x.currency].p += Number(x.amount) || 0; });
    D.$$('.sum-row').forEach(function (r) { r.remove(); });
    var card = D.$('[data-pyadd]'); if (!card) return;
    var html = Object.keys(t).map(function (k) { return '<div class="sum-row"><span>Total ' + k + ': <b>' + D.money(t[k].a, k) + '</b></span><span>Cobrado: <b style="color:var(--ok)">' + D.money(t[k].p, k) + '</b></span><span>Pendiente: <b style="color:var(--warn)">' + D.money(t[k].a - t[k].p, k) + '</b></span></div>'; }).join('');
    card.insertAdjacentHTML('afterend', html);
  }

  var reading = false;
  function markRead(p) {
    if (!p || reading || !unread(p)) return;
    reading = true;
    D.api('admin/projects/' + p.id + '/read', { method: 'POST' }).catch(function () {}).then(function () { reading = false; });
  }
  function autosize(t) { t.style.height = '46px'; t.style.height = Math.min(t.scrollHeight + 2, 160) + 'px'; }

  function uploadFiles(p, files, dropEl) {
    var ids = [];
    if (!files.length) return Promise.resolve(ids);
    var orig = dropEl.innerHTML;
    dropEl.innerHTML = '<div class="spin" style="width:22px;height:22px;border-width:2px"></div><span>Subiendo ' + files.length + '…</span>';
    return files.reduce(function (pr, f) {
      return pr.then(function () {
        return D.readFile(f).then(function (d) { return D.api('admin/projects/' + p.id + '/upload', { method: 'POST', body: d }); })
          .then(function (r) { ids.push(r.file.id); }).catch(function (e) { D.toast(e.message, 'bad'); });
      });
    }, Promise.resolve()).then(function () { dropEl.innerHTML = orig; return ids; });
  }

  // ---------------- modales ----------------
  function clientModal(c) {
    var isNew = !c; c = c || { name: '', email: '', company: '', phone: '', active: true };
    var m = D.modal({ title: isNew ? 'Nuevo cliente' : 'Editar cliente',
      body: '<div class="grid2"><label class="field"><span>Nombre y apellido *</span><input class="input" id="m-name" value="' + esc(c.name) + '"></label><label class="field"><span>Empresa / negocio</span><input class="input" id="m-co" value="' + esc(c.company) + '"></label></div>' +
        '<div class="grid2"><label class="field"><span>Email *</span><input class="input" type="email" id="m-email" value="' + esc(c.email) + '"></label><label class="field"><span>WhatsApp</span><input class="input" type="tel" id="m-phone" placeholder="09X XXX XXX" value="' + esc(c.phone) + '"></label></div>' +
        (isNew ? '<label class="check" style="cursor:pointer"><input type="checkbox" id="m-proj" checked><span class="box">' + ic('check') + '</span><span class="t">Crear su proyecto a continuación</span></label><div class="note info">Se genera una contraseña segura que vas a poder copiar o enviar por WhatsApp.</div>'
          : '<label class="check" style="cursor:pointer"><input type="checkbox" id="m-active" ' + (c.active ? 'checked' : '') + '><span class="box">' + ic('check') + '</span><span class="t">Acceso al panel habilitado</span></label>') +
        '<div class="form-err" id="m-err"></div>',
      foot: (isNew ? '' : '<button class="btn btn-danger" id="m-del" style="margin-right:auto">' + ic('trash') + 'Eliminar</button>') + '<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" id="m-ok">' + (isNew ? 'Crear cliente' : 'Guardar') + '</button>' });
    var g = function (id) { return D.$('#' + id, m.el); };
    g('m-ok').addEventListener('click', function () {
      var body = { name: g('m-name').value, company: g('m-co').value, email: g('m-email').value, phone: g('m-phone').value };
      if (!isNew) body.active = g('m-active').checked;
      this.disabled = true; var btn = this;
      D.api(isNew ? 'admin/clients' : 'admin/clients/' + c.id, { method: isNew ? 'POST' : 'PATCH', body: body }).then(function (r) {
        var wantProj = isNew && g('m-proj').checked;
        m.close();
        if (isNew) {
          return load().then(function () { showAccess(r.client, r.password, wantProj ? function () { projectModal(r.client.id); } : null); });
        }
        D.toast('Cliente actualizado', 'ok'); load();
      }).catch(function (e) { g('m-err').textContent = e.message; btn.disabled = false; });
    });
    if (!isNew) g('m-del').addEventListener('click', function () {
      D.confirm('Eliminar a ' + c.name, 'Se elimina su acceso al panel. Si tiene proyectos, primero eliminalos.', 'Eliminar', true).then(function (ok) {
        if (!ok) return;
        D.api('admin/clients/' + c.id, { method: 'DELETE' }).then(function () { m.close(); D.toast('Cliente eliminado', 'ok'); load(); }).catch(function (e) { D.toast(e.message, 'bad'); });
      });
    });
  }

  function showAccess(c, password, then) {
    var msg = access(c) + password;
    var m = D.modal({ title: 'Acceso de ' + c.name,
      body: '<p class="muted" style="margin:0">Enviale estos datos al cliente. <b style="color:var(--text)">La contraseña se muestra una sola vez</b>; si la pierde, generás una nueva.</p>' +
        '<div class="cred"><div><span>Panel</span><b>' + esc(PANEL_URL) + '</b></div><div><span>Email</span><b>' + esc(c.email) + '</b></div><div><span>Contraseña</span><b>' + esc(password) + '</b></div></div>',
      foot: '<button class="btn" id="a-copy">' + ic('copy') + 'Copiar mensaje</button>' + (c.phone ? '<a class="btn" id="a-wa" href="' + esc(waLink(c.phone, msg)) + '" target="_blank" rel="noopener">' + ic('wa') + 'Enviar por WhatsApp</a>' : '') + '<button class="btn btn-primary" data-x>' + (then ? 'Continuar' : 'Listo') + '</button>',
      onClose: then || null });
    D.$('#a-copy', m.el).addEventListener('click', function () { D.copy(msg); });
  }

  function resetAccess(c) {
    D.confirm('Nueva contraseña para ' + c.name, 'Se genera una contraseña nueva y la anterior deja de funcionar.', 'Generar').then(function (ok) {
      if (!ok) return;
      D.api('admin/clients/' + c.id + '/reset', { method: 'POST' }).then(function (r) { showAccess(c, r.password); }).catch(function (e) { D.toast(e.message, 'bad'); });
    });
  }

  function projectModal(preClient) {
    if (!S.clients.length) { D.toast('Primero creá un cliente', 'bad'); return clientModal(); }
    var plans = Object.keys(S.plans), first = plans[1] || plans[0];
    var m = D.modal({ title: 'Nuevo proyecto', wide: true,
      body: '<div class="grid2"><label class="field"><span>Cliente *</span><select class="select" id="n-client">' + S.clients.map(function (c) { return opt(c.id, c.name + (c.company ? ' · ' + c.company : ''), preClient); }).join('') + '</select></label>' +
        '<label class="field"><span>Nombre del proyecto</span><input class="input" id="n-name" placeholder="Ej.: Web de La Fonda"></label></div>' +
        '<div class="grid3"><label class="field"><span>Plan</span><select class="select" id="n-plan">' + plans.map(function (k) { return opt(k, k, first); }).join('') + '</select></label>' +
        '<label class="field"><span>Moneda</span><select class="select" id="n-cur">' + opt('UYU', 'Pesos (UYU)', 'UYU') + opt('USD', 'Dólares (USD)', 'UYU') + '</select></label>' +
        '<label class="field"><span>Precio total</span><input class="input" type="number" min="0" id="n-amt"></label></div>' +
        '<div class="grid3"><label class="field"><span>Inicio</span><input class="input" type="date" id="n-start" value="' + today() + '"></label>' +
        '<label class="field"><span>Entrega estimada</span><input class="input" type="date" id="n-due"></label>' +
        '<label class="field"><span>Vista previa (opcional)</span><input class="input" type="url" id="n-prev" placeholder="https://…"></label></div>' +
        '<div class="note info" id="n-info"></div><div class="form-err" id="n-err"></div>',
      foot: '<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" id="n-ok">' + ic('plus') + 'Crear proyecto</button>' });
    var g = function (id) { return D.$('#' + id, m.el); };
    function sync() {
      var pl = S.plans[g('n-plan').value], cur = g('n-cur').value;
      g('n-amt').value = cur === 'USD' ? pl.usd : pl.uyu;
      g('n-due').value = addBusinessDays(DAYS[g('n-plan').value] || 10);
      g('n-info').innerHTML = 'Se crean automáticamente <b>' + pl.stages.length + ' etapas</b> (' + pl.stages.map(esc).join(' → ') + '), la lista de materiales que necesitás del cliente y los pagos 50% / 50%.';
    }
    g('n-plan').addEventListener('change', sync); g('n-cur').addEventListener('change', sync); sync();
    g('n-ok').addEventListener('click', function () {
      var btn = this; btn.disabled = true;
      D.api('admin/projects', { method: 'POST', body: { clientId: g('n-client').value, name: g('n-name').value, plan: g('n-plan').value, currency: g('n-cur').value, amount: g('n-amt').value, startDate: g('n-start').value, dueDate: g('n-due').value, previewUrl: g('n-prev').value } })
        .then(function (r) { m.close(); D.toast('Proyecto creado', 'ok'); return load().then(function () { S.tab = 'resumen'; go('project', { pid: r.project.id }); }); })
        .catch(function (e) { g('n-err').textContent = e.message; btn.disabled = false; });
    });
  }

  // avisar antes de salir con cambios sin guardar
  window.addEventListener('beforeunload', function (e) { if (S.edit && S.edit.dirty) { e.preventDefault(); e.returnValue = ''; } });
})();
