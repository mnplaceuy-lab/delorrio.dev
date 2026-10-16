/* Panel de cliente · Delorrio.dev */
(function () {
  'use strict';
  var D = window.D, esc = D.esc, ic = D.ic;
  var app = document.getElementById('app');
  var WA = '59892555045';
  var S = { client: null, projects: [], cur: null, live: false, streaming: false };

  function cur() { return S.projects.find(function (p) { return p.id === S.cur; }) || S.projects[0]; }

  // ---------------- arranque ----------------
  D.api('me').then(function (me) {
    if (me.role === 'client') return load(true);
    renderLogin(me.role === 'admin');
  }).catch(function () { renderLogin(); });

  // ---------------- login ----------------
  function renderLogin(isAdmin) {
    document.title = 'Ingresar · Panel de cliente';
    app.innerHTML =
      '<main class="auth"><div class="auth-box"><div class="auth-card">' +
      '<a class="logo" href="/">Delorrio.dev<i></i><small>Clientes</small></a>' +
      '<h1>Tu proyecto, en vivo.</h1>' +
      '<p>Ingresá con el email y la contraseña que te envié al firmar el contrato.</p>' +
      (isAdmin ? '<div class="note info" style="margin-bottom:16px">Tenés abierta la sesión de administrador. <a href="/admin/">Ir al panel admin</a></div>' : '') +
      '<form id="lf" novalidate>' +
      '<label class="field"><span>Email</span><input class="input" type="email" name="email" autocomplete="username" required placeholder="tu@email.com"></label>' +
      '<label class="field"><span>Contraseña</span><div class="pw"><input class="input" type="password" name="password" autocomplete="current-password" required placeholder="••••••••"><button type="button" aria-label="Mostrar contraseña"></button></div></label>' +
      '<div class="form-err" id="lerr" role="alert"></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Ingresar al panel</button>' +
      '</form></div>' +
      '<p class="auth-foot">¿Olvidaste tu contraseña? <a href="https://wa.me/' + WA + '?text=' + encodeURIComponent('Hola Santiago, olvidé mi contraseña del panel de cliente.') + '" target="_blank" rel="noopener">Escribime por WhatsApp</a></p>' +
      '</div></main>';
    D.pwToggles(app);
    var f = D.$('#lf'), errEl = D.$('#lerr');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      errEl.textContent = '';
      var b = f.querySelector('button[type=submit]');
      if (!f.email.value.trim() || !f.password.value) { errEl.textContent = 'Completá email y contraseña'; return; }
      b.disabled = true; b.textContent = 'Ingresando…';
      D.api('login', { method: 'POST', body: { email: f.email.value, password: f.password.value } })
        .then(function () { return load(true); })
        .catch(function (er) { errEl.textContent = er.message; b.disabled = false; b.textContent = 'Ingresar al panel'; });
    });
    setTimeout(function () { f.email.focus(); }, 50);
  }

  // ---------------- datos ----------------
  var loading = false, again = false;
  function load(first) {
    if (loading) { again = true; return Promise.resolve(); }
    loading = true;
    return D.api('projects').then(function (d) {
      S.client = d.client; S.projects = d.projects;
      if (!S.cur || !S.projects.some(function (p) { return p.id === S.cur; })) {
        var act = S.projects.find(function (p) { return p.status === 'activo'; });
        S.cur = (act || S.projects[0] || {}).id || null;
      }
      render();
      if (first && !S.streaming) {
        S.streaming = true;
        var t;
        D.stream(function () { clearTimeout(t); t = setTimeout(function () { load(); }, 150); }, function (on) { S.live = on; var l = D.$('#live'); if (l) l.className = 'live' + (on ? '' : ' off'); });
      }
    }).catch(function (e) {
      if (e.status === 401) renderLogin(); else D.toast(e.message, 'bad');
    }).then(function () { loading = false; if (again) { again = false; load(); } });
  }

  // ---------------- render ----------------
  function render() {
    var p = cur();
    var draft = D.$('#chatTxt') ? D.$('#chatTxt').value : '';
    var hadFocus = document.activeElement && document.activeElement.id === 'chatTxt';
    var msgsEl = D.$('#msgs'), atBottom = !msgsEl || msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 40;

    document.title = (p ? p.name + ' · ' : '') + 'Panel de cliente';
    var first = String(S.client.name || '').split(' ')[0];
    var html = top() + '<main class="cl-main">' +
      '<div class="cl-hello"><div><h1>Hola, ' + esc(first) + '</h1><p>Acá ves en vivo cómo avanza tu proyecto.</p></div>' +
      (S.projects.length > 1 ? '<div class="proj-switch" role="tablist">' + S.projects.map(function (x) { return '<button role="tab" data-proj="' + x.id + '" class="' + (x.id === S.cur ? 'on' : '') + '">' + esc(x.name) + '</button>'; }).join('') + '</div>' : '') +
      '</div>';

    if (!p) {
      html += '<div class="card"><div class="empty">Todavía no hay un proyecto cargado en tu cuenta. En cuanto arranquemos lo vas a ver acá.</div></div></main>';
      app.innerHTML = html; bindTop(); return;
    }

    var rev = p.stages.filter(function (s) { return s.status === 'en_revision'; });
    if (rev.length) {
      html += '<div class="alert-rev"><p>' + ic('bell').replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px;margin-right:8px;color:var(--warn)"') +
        'Tenés <b>' + (rev.length === 1 ? 'una etapa lista' : rev.length + ' etapas listas') + ' para revisar</b>: ' + rev.map(function (s) { return esc(s.name); }).join(', ') + '.</p>' +
        '<button class="btn btn-sm" data-goto="stages">Revisar ahora</button></div>';
    }

    html += hero(p) + '<div class="cl-grid"><div class="cl-col">' + stagesCard(p) + updatesCard(p) + '</div>' +
      '<div class="cl-col">' + chatCard(p) + tasksCard(p) + paysCard(p) + filesCard(p) + activityCard(p) + '</div></div></main>';

    app.innerHTML = html;
    bindTop(); bind(p);

    var ta = D.$('#chatTxt');
    if (ta) { ta.value = draft; autosize(ta); if (hadFocus) ta.focus(); }
    var m = D.$('#msgs');
    if (m && atBottom) m.scrollTop = m.scrollHeight;
  }

  function top() {
    return '<header class="cl-top"><div class="cl-top-in">' +
      '<a class="logo" href="/">Delorrio.dev<i></i><small>Panel de cliente</small></a>' +
      '<div class="cl-top-r"><span id="live" class="live' + (S.live ? '' : ' off') + '" title="Las novedades aparecen solas, sin recargar"><i></i>En vivo</span>' +
      '<div style="position:relative"><button class="user-btn" id="ubtn" aria-haspopup="true" aria-expanded="false"><span class="avatar">' + esc(D.initials(S.client.name)) + '</span><span class="n">' + esc(S.client.name) + '</span></button>' +
      '<div class="menu" id="umenu" hidden><div style="padding:10px 12px 8px"><b style="display:block;font-size:14px">' + esc(S.client.name) + '</b><small class="dim">' + esc(S.client.email) + '</small></div><hr>' +
      '<button data-act="pass">' + ic('key') + 'Cambiar contraseña</button>' +
      '<a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">' + ic('wa') + 'WhatsApp con Santiago</a><hr>' +
      '<button data-act="logout">' + ic('logout') + 'Cerrar sesión</button></div></div></div></div></header>';
  }

  function hero(p) {
    var curStage = p.stages.find(function (s) { return s.status === 'en_revision'; }) || p.stages.find(function (s) { return s.status === 'en_curso'; }) || p.stages.find(function (s) { return s.status === 'pendiente'; });
    var dd = D.daysTo(p.dueDate);
    var due = p.dueDate ? D.date(p.dueDate) + (p.status !== 'finalizado' && dd !== null ? ' <span class="dim">(' + (dd > 1 ? 'faltan ' + dd + ' días' : dd === 1 ? 'mañana' : dd === 0 ? 'hoy' : 'vencida') + ')</span>' : '') : 'a definir';
    return '<section class="card hero-card">' + D.ring(p.progress, 'avance') +
      '<div class="hero-info"><div style="display:flex;gap:8px;flex-wrap:wrap">' + D.chip(D.PROJ, p.status) + '<span class="chip plain">' + esc(p.plan) + '</span></div>' +
      '<h2>' + esc(p.name) + '</h2>' +
      '<div class="hero-meta"><span>Inicio: <b>' + D.date(p.startDate) + '</b></span><span>Entrega estimada: <b>' + due + '</b></span></div>' +
      (p.status === 'finalizado' ? '<div class="hero-now">' + ic('rocket').replace('<svg', '<svg style="width:18px;height:18px;color:var(--ok)"') + '<span><b>¡Tu web está publicada!</b> Gracias por confiar en Delorrio.dev.</span></div>'
        : curStage ? '<div class="hero-now">' + ic('clock').replace('<svg', '<svg style="width:18px;height:18px;color:var(--accent)"') + '<span>Etapa actual: <b>' + esc(curStage.name) + '</b></span></div>' : '') +
      '</div><div class="hero-cta">' +
      (p.previewUrl ? '<a class="btn btn-primary" href="' + esc(p.previewUrl) + '" target="_blank" rel="noopener">' + ic('ext') + 'Ver vista previa</a>' : '') +
      '<button class="btn" data-goto="chat">' + ic('chat') + 'Escribirme</button></div></section>';
  }

  function stagesCard(p) {
    var done = p.stages.filter(function (s) { return s.status === 'aprobada'; }).length;
    var out = '<section class="card" id="stages"><div class="card-h"><h3>' + ic('steps') + 'Etapas del proyecto</h3><span class="muted" style="font-size:13.5px">' + done + ' de ' + p.stages.length + ' completas</span></div><div class="steps">';
    p.stages.forEach(function (s, i) {
      var cls = s.status === 'aprobada' ? 'done' : s.status === 'en_revision' ? 'rev' : s.status === 'en_curso' ? 'cur' : 'pend';
      var dot = s.status === 'aprobada' ? ic('check') : (i + 1);
      out += '<div class="step ' + cls + '"><div class="step-dot">' + dot + '</div><div class="step-b">' +
        '<strong>' + esc(s.name) + ' ' + D.chip(D.STAGE, s.status) + '</strong>' +
        (s.note ? '<p>' + D.rich(s.note) + '</p>' : '') +
        (s.status === 'aprobada' && s.approvedAt ? '<p class="dim" style="font-size:12.5px">Completada el ' + D.date(s.approvedAt) + '</p>' : '') +
        (s.status === 'en_revision' ? '<div class="step-act"><button class="btn btn-ok btn-sm" data-approve="' + s.id + '">' + ic('check') + 'Aprobar etapa</button><button class="btn btn-sm" data-changes="' + s.id + '">' + ic('edit') + 'Pedir cambios</button>' + (p.previewUrl ? '<a class="btn btn-ghost btn-sm" href="' + esc(p.previewUrl) + '" target="_blank" rel="noopener">' + ic('ext') + 'Ver vista previa</a>' : '') + '</div>' : '') +
        '</div></div>';
    });
    return out + '</div></section>';
  }

  function fileUrl(id) { return '/api/portal/file/' + encodeURIComponent(id); }

  function updatesCard(p) {
    var out = '<section class="card" id="updates"><div class="card-h"><h3>' + ic('news') + 'Novedades</h3>' + (p.updates.length ? '<span class="muted" style="font-size:13.5px">' + p.updates.length + '</span>' : '') + '</div>';
    if (!p.updates.length) return out + '<div class="empty">Acá vas a ver cada avance que publique: diseños, versiones y novedades.</div></section>';
    out += '<div class="feed">';
    p.updates.forEach(function (u) {
      out += '<article class="post"><div class="post-h"><h4>' + esc(u.title) + '</h4><time datetime="' + esc(u.createdAt) + '" title="' + esc(new Date(u.createdAt).toLocaleString('es-UY')) + '">' + D.ago(u.createdAt) + '</time></div>' +
        (u.body ? '<p>' + D.rich(u.body) + '</p>' : '') +
        ((u.images || []).length ? '<div class="shots">' + u.images.map(function (id) { return '<button data-zoom="' + fileUrl(id) + '" aria-label="Ampliar imagen"><img src="' + fileUrl(id) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '') +
        (u.link ? '<a class="btn btn-sm post-link" href="' + esc(u.link) + '" target="_blank" rel="noopener">' + ic('ext') + 'Abrir link</a>' : '') +
        '</article>';
    });
    return out + '</div></section>';
  }

  function chatCard(p) {
    var unread = p.comments.filter(function (c) { return c.author === 'admin' && !c.read; }).length;
    var out = '<section class="card" id="chat"><div class="card-h"><h3>' + ic('chat') + 'Mensajes ' + (unread ? '<span class="count">' + unread + '</span>' : '') + '</h3><span class="dim" style="font-size:12.5px">con Santiago</span></div><div class="chat"><div class="msgs" id="msgs" aria-live="polite">';
    if (!p.comments.length) out += '<div class="empty" style="margin:auto 0">¿Tenés una duda o una idea? Escribime acá y te respondo lo antes posible.</div>';
    var lastDay = '';
    p.comments.forEach(function (c) {
      var day = new Date(c.createdAt).toDateString();
      if (day !== lastDay) { out += '<span class="day-sep">' + (day === new Date().toDateString() ? 'Hoy' : D.date(c.createdAt)) + '</span>'; lastDay = day; }
      out += '<div class="msg ' + (c.author === 'client' ? 'me' : 'them') + '">' + D.rich(c.text) + '<time>' + D.time(c.createdAt) + '</time></div>';
    });
    return out + '</div><form class="chat-in" id="chatF"><label class="sr" for="chatTxt">Mensaje</label><textarea class="textarea" id="chatTxt" rows="1" placeholder="Escribí un mensaje…" maxlength="3000"></textarea><button class="btn btn-primary" type="submit" aria-label="Enviar">' + ic('send') + '</button></form></div></section>';
  }

  function tasksCard(p) {
    var pend = p.tasks.filter(function (t) { return !t.done; }).length;
    var out = '<section class="card" id="tasks"><div class="card-h"><h3>' + ic('list') + 'Lo que necesito de vos ' + (pend ? '<span class="count">' + pend + '</span>' : '') + '</h3></div>';
    if (!p.tasks.length) return out + '<div class="empty">Por ahora no necesito nada. ¡Gracias!</div></section>';
    out += '<ul class="checks">' + p.tasks.map(function (t) {
      return '<li><label class="check ' + (t.done ? 'is-done' : '') + '"><input type="checkbox" data-task="' + t.id + '" ' + (t.done ? 'checked' : '') + '><span class="box">' + ic('check') + '</span><span class="t">' + esc(t.text) + '</span></label></li>';
    }).join('') + '</ul><p class="dim" style="font-size:12.5px;margin:12px 0 0">Marcá cada punto cuando me lo envíes. Podés subir los archivos en “Archivos”.</p></section>';
    return out;
  }

  function paysCard(p) {
    if (!p.payments.length) return '';
    var byCur = {};
    p.payments.forEach(function (x) { byCur[x.currency] = byCur[x.currency] || { tot: 0, paid: 0 }; byCur[x.currency].tot += x.amount; if (x.status === 'pagado') byCur[x.currency].paid += x.amount; });
    var out = '<section class="card" id="pays"><div class="card-h"><h3>' + ic('card') + 'Pagos</h3></div><div class="pays">';
    p.payments.forEach(function (x) {
      out += '<div class="pay"><div><b>' + D.money(x.amount, x.currency) + '</b><small>' + esc(x.label) + (x.status === 'pagado' && x.paidAt ? ' · pagado el ' + D.date(x.paidAt) : x.dueDate ? ' · vence ' + D.date(x.dueDate) : '') + '</small></div>' +
        (x.status === 'pagado' ? '<span class="chip ok">Pagado</span>' : '<span class="chip warn">Pendiente</span>') + '</div>';
    });
    out += '</div>';
    Object.keys(byCur).forEach(function (k) {
      var v = byCur[k], pc = v.tot ? Math.round(v.paid / v.tot * 100) : 0;
      out += '<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span class="muted">Pagado</span><b>' + D.money(v.paid, k) + ' de ' + D.money(v.tot, k) + '</b></div><div class="bar"><i style="width:' + pc + '%"></i></div></div>';
    });
    return out + '</section>';
  }

  function filesCard(p) {
    var out = '<section class="card" id="files"><div class="card-h"><h3>' + ic('folder') + 'Archivos</h3>' + (p.files.length ? '<span class="muted" style="font-size:13.5px">' + p.files.length + '</span>' : '') + '</div>';
    out += '<div class="drop" id="drop" tabindex="0" role="button" aria-label="Subir archivos">' + ic('upload') + '<span><b>Subí tus archivos</b> o arrastralos acá</span><small>Logo, fotos, textos, PDF · hasta 15 MB cada uno</small></div>';
    if (p.files.length) {
      out += '<div class="files" style="margin-top:12px">' + p.files.map(function (f) {
        return '<div class="file"><span class="ic">' + (D.isImg(f) ? '<img src="' + fileUrl(f.id) + '" alt="" loading="lazy">' : esc(D.ext(f.name))) + '</span>' +
          '<div class="nm"><a href="' + fileUrl(f.id) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a><small>' + D.size(f.size) + ' · ' + (f.by === 'client' ? 'Subido por vos' : 'De Santiago') + ' · ' + D.date(f.createdAt) + '</small></div>' +
          '<a class="btn btn-ghost btn-icon" href="' + fileUrl(f.id) + '?dl=1" aria-label="Descargar ' + esc(f.name) + '">' + ic('download') + '</a></div>';
      }).join('') + '</div>';
    }
    return out + '</section>';
  }

  var ACT_IC = { approve: 'check', changes: 'edit', comment: 'chat', task: 'list', file: 'folder', update: 'news', stage: 'steps', payment: 'money', create: 'flag', status: 'flag' };
  function activityCard(p) {
    var a = (p.activity || []).slice(0, 8);
    if (!a.length) return '';
    return '<section class="card"><div class="card-h"><h3>' + ic('clock') + 'Actividad reciente</h3></div><ul class="acts">' + a.map(function (x) {
      return '<li class="act ' + (x.by === 'client' ? 'client' : '') + '"><span class="ai">' + ic(ACT_IC[x.type] || 'flag') + '</span><p>' + (x.by === 'client' ? '<b>Vos:</b> ' : '<b>Santiago:</b> ') + esc(x.text.charAt(0).toLowerCase() + x.text.slice(1)) + '</p><time>' + D.ago(x.at) + '</time></li>';
    }).join('') + '</ul></section>';
  }

  // ---------------- eventos ----------------
  function bindTop() {
    var ub = D.$('#ubtn'), um = D.$('#umenu');
    if (!ub) return;
    ub.addEventListener('click', function (e) { e.stopPropagation(); um.hidden = !um.hidden; ub.setAttribute('aria-expanded', String(!um.hidden)); });
    document.onclick = function (e) { if (um && !um.hidden && !um.contains(e.target)) { um.hidden = true; ub.setAttribute('aria-expanded', 'false'); } };
    um.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      um.hidden = true;
      if (b.dataset.act === 'logout') D.api('logout', { method: 'POST' }).then(function () { location.reload(); });
      if (b.dataset.act === 'pass') changePass();
    });
  }

  function bind(p) {
    D.$$('[data-proj]').forEach(function (b) { b.addEventListener('click', function () { S.cur = b.dataset.proj; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }); });
    D.$$('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () {
        var el = document.getElementById(b.dataset.goto); if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (b.dataset.goto === 'chat') setTimeout(function () { var t = D.$('#chatTxt'); if (t) t.focus({ preventScroll: true }); }, 500);
      });
    });
    D.$$('[data-zoom]').forEach(function (b) { b.addEventListener('click', function () { D.lightbox(b.dataset.zoom); }); });

    D.$$('[data-approve]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = p.stages.find(function (x) { return x.id === b.dataset.approve; });
        D.confirm('Aprobar “' + s.name + '”', 'Al aprobarla, paso a la siguiente etapa. Si necesitás algún ajuste, mejor elegí “Pedir cambios”.', 'Sí, aprobar').then(function (ok) {
          if (!ok) return;
          D.api('p/' + p.id + '/approve', { method: 'POST', body: { stageId: s.id } }).then(function () { D.toast('¡Etapa aprobada! Gracias.', 'ok'); load(); }).catch(function (e) { D.toast(e.message, 'bad'); });
        });
      });
    });
    D.$$('[data-changes]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = p.stages.find(function (x) { return x.id === b.dataset.changes; });
        var m = D.modal({ title: 'Pedir cambios en “' + s.name + '”',
          body: '<label class="field"><span>¿Qué te gustaría cambiar?</span><textarea class="textarea" id="chgTxt" rows="5" placeholder="Ej.: El color del menú más oscuro, cambiar la foto principal…"></textarea></label>',
          foot: '<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" id="chgOk">Enviar pedido</button>' });
        D.$('#chgOk', m.el).addEventListener('click', function () {
          var t = D.$('#chgTxt', m.el).value.trim();
          if (!t) { D.$('#chgTxt', m.el).focus(); return; }
          this.disabled = true;
          D.api('p/' + p.id + '/changes', { method: 'POST', body: { stageId: s.id, text: t } }).then(function () { m.close(); D.toast('Listo, recibí tu pedido de cambios', 'ok'); load(); }).catch(function (e) { D.toast(e.message, 'bad'); });
        });
      });
    });

    D.$$('[data-task]').forEach(function (i) {
      i.addEventListener('change', function () {
        i.closest('.check').classList.toggle('is-done', i.checked);
        D.api('p/' + p.id + '/task/' + i.dataset.task, { method: 'POST', body: { done: i.checked } }).catch(function (e) { D.toast(e.message, 'bad'); load(); });
      });
    });

    var drop = D.$('#drop');
    if (drop) D.dropzone(drop, function (files) { upload(p, files); });

    var cf = D.$('#chatF'), ta = D.$('#chatTxt');
    if (cf) {
      ta.addEventListener('input', function () { autosize(ta); });
      ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); cf.requestSubmit(); } });
      ta.addEventListener('focus', function () { markRead(p); });
      cf.addEventListener('submit', function (e) {
        e.preventDefault();
        var t = ta.value.trim(); if (!t) return;
        ta.value = ''; autosize(ta);
        D.api('p/' + p.id + '/comment', { method: 'POST', body: { text: t } }).then(function () { load(); }).catch(function (er) { ta.value = t; D.toast(er.message, 'bad'); });
      });
      // marcar como leído cuando el chat está a la vista
      if ('IntersectionObserver' in window && p.comments.some(function (c) { return c.author === 'admin' && !c.read; })) {
        var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(function () { markRead(p); }, 1200); } }, { threshold: 0.5 });
        io.observe(D.$('#chat'));
      }
    }
  }

  var reading = false;
  function markRead(p) {
    if (reading || !p.comments.some(function (c) { return c.author === 'admin' && !c.read; })) return;
    reading = true;
    D.api('p/' + p.id + '/read', { method: 'POST' }).catch(function () {}).then(function () { reading = false; });
  }

  function autosize(t) { t.style.height = '46px'; t.style.height = Math.min(t.scrollHeight + 2, 140) + 'px'; }

  function upload(p, files) {
    var drop = D.$('#drop');
    var n = files.length, ok = 0;
    if (drop) drop.innerHTML = '<div class="spin" style="width:22px;height:22px;border-width:2px"></div><span>Subiendo ' + n + (n === 1 ? ' archivo' : ' archivos') + '…</span>';
    files.reduce(function (pr, f) {
      return pr.then(function () {
        return D.readFile(f).then(function (data) { return D.api('p/' + p.id + '/upload', { method: 'POST', body: data }); })
          .then(function () { ok++; }).catch(function (e) { D.toast(e.message, 'bad'); });
      });
    }, Promise.resolve()).then(function () {
      if (ok) D.toast(ok === 1 ? 'Archivo subido' : ok + ' archivos subidos', 'ok');
      load();
    });
  }

  function changePass() {
    var m = D.modal({ title: 'Cambiar contraseña',
      body: '<label class="field"><span>Contraseña actual</span><div class="pw"><input class="input" type="password" id="pw1" autocomplete="current-password"><button type="button" aria-label="Mostrar contraseña"></button></div></label>' +
        '<label class="field"><span>Nueva contraseña</span><div class="pw"><input class="input" type="password" id="pw2" autocomplete="new-password" placeholder="Mínimo 8 caracteres"><button type="button" aria-label="Mostrar contraseña"></button></div></label>' +
        '<div class="form-err" id="pwErr" role="alert"></div>',
      foot: '<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" id="pwOk">Guardar</button>' });
    D.pwToggles(m.el);
    D.$('#pwOk', m.el).addEventListener('click', function () {
      var a = D.$('#pw1', m.el).value, b = D.$('#pw2', m.el).value, er = D.$('#pwErr', m.el);
      if (b.length < 8) { er.textContent = 'La nueva contraseña debe tener al menos 8 caracteres'; return; }
      D.api('password', { method: 'POST', body: { current: a, next: b } }).then(function () { m.close(); D.toast('Contraseña actualizada', 'ok'); }).catch(function (e) { er.textContent = e.message; });
    });
  }
})();
