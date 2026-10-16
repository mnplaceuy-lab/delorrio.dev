// Portal de clientes de Delorrio.dev — API sin dependencias.
// Datos en un JSON dentro de un disco persistente (Railway Volume).
//
// Variables de entorno (Railway → Variables):
//   ADMIN_EMAIL      email con el que entrás al panel de administración
//   ADMIN_PASSWORD   contraseña del panel de administración (mínimo 10 caracteres)
//   DATA_DIR         (opcional) carpeta de datos. Si hay un Volume en Railway se usa solo.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function createPortal({ ROOT }) {
  const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(ROOT, 'data');
  const UPLOADS = path.join(DATA_DIR, 'uploads');
  const DB_FILE = path.join(DATA_DIR, 'portal.json');
  fs.mkdirSync(UPLOADS, { recursive: true });

  // ---------- base de datos ----------
  let db = { clients: [], projects: [], sessions: {} };
  try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (_) {}
  function save() {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }
  const id = (n = 10) => crypto.randomBytes(n).toString('base64url');
  const now = () => new Date().toISOString();

  // ---------- contraseñas ----------
  function hashPass(p) {
    const salt = crypto.randomBytes(16);
    const h = crypto.scryptSync(String(p), salt, 64);
    return 'scrypt$' + salt.toString('hex') + '$' + h.toString('hex');
  }
  function checkPass(p, stored) {
    try {
      const [, s, h] = String(stored).split('$');
      const calc = crypto.scryptSync(String(p), Buffer.from(s, 'hex'), 64);
      return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
    } catch (_) { return false; }
  }
  function safeEq(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
  }
  function genPassword() {
    const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 10; i++) s += A[crypto.randomInt(A.length)];
    return s.slice(0, 5) + '-' + s.slice(5);
  }

  // ---------- sesiones ----------
  const SESSION_DAYS = 30;
  const tokHash = (t) => crypto.createHash('sha256').update(t).digest('hex');
  function parseCookies(req) {
    const out = {};
    (req.headers.cookie || '').split(';').forEach((c) => {
      const i = c.indexOf('=');
      if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
    });
    return out;
  }
  function isHttps(req) { return (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'; }
  function setCookie(req, res, token, maxAge) {
    const parts = [`dsid=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
    if (isHttps(req)) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
  }
  function createSession(req, res, data) {
    const token = id(32);
    db.sessions[tokHash(token)] = Object.assign({ exp: Date.now() + SESSION_DAYS * 864e5 }, data);
    // limpiar sesiones vencidas
    for (const k in db.sessions) if (db.sessions[k].exp < Date.now()) delete db.sessions[k];
    save();
    setCookie(req, res, token, SESSION_DAYS * 86400);
  }
  function getSession(req) {
    const t = parseCookies(req).dsid;
    if (!t) return null;
    const s = db.sessions[tokHash(t)];
    if (!s || s.exp < Date.now()) return null;
    if (s.role === 'client') {
      const c = db.clients.find((x) => x.id === s.clientId);
      if (!c || !c.active) return null;
      return { role: 'client', client: c, key: tokHash(t) };
    }
    if (s.role === 'admin') return { role: 'admin', key: tokHash(t) };
    return null;
  }
  function adminConfigured() {
    return !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 10);
  }

  // ---------- límites de intentos ----------
  const tries = new Map();
  function tooMany(key) {
    const t = Date.now();
    const list = (tries.get(key) || []).filter((x) => t - x < 15 * 60 * 1000);
    tries.set(key, list);
    return list.length >= 8;
  }
  function addTry(key) { const l = tries.get(key) || []; l.push(Date.now()); tries.set(key, l); }

  // ---------- plantillas por plan ----------
  const PLANS = {
    'Web Start': { uyu: 8900, usd: 220, stages: ['Briefing', 'Diseño', 'Desarrollo', 'Revisión', 'Publicación'] },
    'Web Pro': { uyu: 27900, usd: 690, stages: ['Briefing', 'Diseño', 'Desarrollo', 'Panel y catálogo', 'Revisión', 'Publicación'] },
    'E-commerce': { uyu: 44900, usd: 1110, stages: ['Briefing', 'Diseño', 'Desarrollo de la tienda', 'Catálogo y pagos', 'Revisión', 'Publicación'] },
    'A medida': { uyu: 0, usd: 0, stages: ['Briefing', 'Diseño', 'Desarrollo', 'Revisión', 'Publicación'] },
  };
  const BASE_TASKS = ['Logo en buena calidad (PNG o SVG)', 'Textos de la web (quiénes somos, servicios)', 'Fotos de tus productos o servicios', 'Datos de contacto y redes sociales'];
  const SHOP_TASKS = ['Lista de productos con precios y categorías', 'Cuenta de Mercado Pago verificada'];

  // ---------- utilidades ----------
  const str = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
  const STAGE_ST = ['pendiente', 'en_curso', 'en_revision', 'aprobada'];
  const PROJ_ST = ['activo', 'pausado', 'finalizado'];
  const PAY_ST = ['pendiente', 'pagado'];
  function progressOf(p) {
    if (typeof p.progressOverride === 'number') return p.progressOverride;
    if (!p.stages.length) return 0;
    const w = { pendiente: 0, en_curso: 0.4, en_revision: 0.8, aprobada: 1 };
    return Math.round((p.stages.reduce((a, s) => a + (w[s.status] || 0), 0) / p.stages.length) * 100);
  }
  function log(p, type, text, by) {
    p.activity = p.activity || [];
    p.activity.unshift({ id: id(6), type, text, by, at: now() });
    if (p.activity.length > 300) p.activity.length = 300;
  }
  function publicClient(c) {
    return { id: c.id, name: c.name, email: c.email, company: c.company, phone: c.phone, active: c.active, createdAt: c.createdAt, lastLogin: c.lastLogin || null };
  }
  function clientView(p) {
    const files = p.files.map((f) => ({ id: f.id, name: f.name, size: f.size, type: f.type, by: f.by, createdAt: f.createdAt }));
    return {
      id: p.id, name: p.name, plan: p.plan, status: p.status, startDate: p.startDate, dueDate: p.dueDate,
      previewUrl: p.previewUrl, progress: progressOf(p), stages: p.stages, updates: p.updates,
      tasks: p.tasks, payments: p.payments, files,
      comments: p.comments.map((c) => ({ id: c.id, author: c.author, text: c.text, createdAt: c.createdAt, read: c.author === 'admin' ? !!c.readByClient : true })),
      activity: (p.activity || []).slice(0, 40),
    };
  }
  function adminView(p) {
    const v = clientView(p);
    v.clientId = p.clientId; v.internalNotes = p.internalNotes || ''; v.progressOverride = p.progressOverride ?? null;
    v.createdAt = p.createdAt; v.activity = (p.activity || []).slice(0, 150);
    v.comments = p.comments.map((c) => ({ id: c.id, author: c.author, text: c.text, createdAt: c.createdAt, readByAdmin: !!c.readByAdmin, readByClient: !!c.readByClient }));
    return v;
  }

  // ---------- tiempo real (SSE) ----------
  const streams = new Set();
  function broadcast(project, type) {
    const msg = `event: change\ndata: ${JSON.stringify({ type, projectId: project ? project.id : null })}\n\n`;
    for (const s of streams) {
      if (s.role === 'admin' || (project && s.clientId === project.clientId)) {
        try { s.res.write(msg); } catch (_) {}
      }
    }
  }
  setInterval(() => { for (const s of streams) { try { s.res.write(': ping\n\n'); } catch (_) {} } }, 25000).unref();

  // ---------- http ----------
  function send(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  }
  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too_big')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(new Error('bad_json')); } });
      req.on('error', reject);
    });
  }
  function sameOrigin(req) {
    const o = req.headers.origin;
    if (!o) return true;
    try { return new URL(o).host === req.headers.host; } catch (_) { return false; }
  }

  const ALLOWED_EXT = /\.(png|jpe?g|webp|gif|svg|pdf|zip|rar|docx?|xlsx?|pptx?|txt|csv|mp4|mov|ai|psd)$/i;
  const MAX_FILE = 15 * 1024 * 1024;
  function storeFile(p, body, by) {
    const name = str(body.name, 140).replace(/[\\/:*?"<>|]+/g, '_');
    if (!name || !ALLOWED_EXT.test(name)) throw Object.assign(new Error('Tipo de archivo no permitido'), { status: 400 });
    const buf = Buffer.from(String(body.data || ''), 'base64');
    if (!buf.length) throw Object.assign(new Error('Archivo vacío'), { status: 400 });
    if (buf.length > MAX_FILE) throw Object.assign(new Error('El archivo supera los 15 MB'), { status: 400 });
    const f = { id: id(12), name, size: buf.length, type: str(body.type, 100) || 'application/octet-stream', by, createdAt: now() };
    fs.writeFileSync(path.join(UPLOADS, f.id), buf);
    p.files.unshift(f);
    return f;
  }

  function findProject(pid) { return db.projects.find((x) => x.id === pid); }
  function err(status, message) { return Object.assign(new Error(message), { status }); }

  async function route(req, res, url) {
    const m = req.method;
    const parts = url.pathname.replace(/^\/api\/portal\/?/, '').split('/').filter(Boolean);
    const sess = getSession(req);

    if (m !== 'GET' && m !== 'HEAD' && !sameOrigin(req)) throw err(403, 'Origen no permitido');

    // --- sesión ---
    if (parts[0] === 'login' && m === 'POST') {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (tooMany(ip)) throw err(429, 'Demasiados intentos. Esperá 15 minutos.');
      const b = await readBody(req, 5000);
      const email = str(b.email, 200).toLowerCase(); const pass = String(b.password || '');
      const wantAdmin = b.mode === 'admin';
      if (wantAdmin) {
        if (!adminConfigured()) throw err(503, 'Falta configurar ADMIN_EMAIL y ADMIN_PASSWORD en Railway.');
        if (safeEq(email, process.env.ADMIN_EMAIL.toLowerCase()) & safeEq(pass, process.env.ADMIN_PASSWORD)) {
          createSession(req, res, { role: 'admin' });
          return send(res, 200, { ok: true, role: 'admin' });
        }
      } else {
        const c = db.clients.find((x) => x.email === email);
        if (c && c.active && checkPass(pass, c.passHash)) {
          c.lastLogin = now(); createSession(req, res, { role: 'client', clientId: c.id });
          return send(res, 200, { ok: true, role: 'client' });
        }
      }
      addTry(ip);
      throw err(401, 'Email o contraseña incorrectos');
    }
    if (parts[0] === 'logout' && m === 'POST') {
      if (sess) { delete db.sessions[sess.key]; save(); }
      setCookie(req, res, '', 0);
      return send(res, 200, { ok: true });
    }
    if (parts[0] === 'me' && m === 'GET') {
      if (!sess) return send(res, 200, { role: null, adminConfigured: adminConfigured() });
      if (sess.role === 'admin') return send(res, 200, { role: 'admin', email: process.env.ADMIN_EMAIL });
      return send(res, 200, { role: 'client', client: publicClient(sess.client) });
    }

    if (!sess) throw err(401, 'Sesión vencida. Volvé a ingresar.');

    // --- tiempo real ---
    if (parts[0] === 'stream' && m === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 4000\n\n');
      const s = { res, role: sess.role, clientId: sess.role === 'client' ? sess.client.id : null };
      streams.add(s);
      req.on('close', () => streams.delete(s));
      return;
    }

    // --- archivos (descarga) ---
    if (parts[0] === 'file' && parts[1] && m === 'GET') {
      const p = db.projects.find((x) => x.files.some((f) => f.id === parts[1]));
      if (!p || (sess.role === 'client' && p.clientId !== sess.client.id)) throw err(404, 'Archivo no encontrado');
      const f = p.files.find((x) => x.id === parts[1]);
      const fp = path.join(UPLOADS, f.id);
      if (!fs.existsSync(fp)) throw err(404, 'Archivo no encontrado');
      const inline = /^image\/(png|jpeg|webp|gif)$|^application\/pdf$/.test(f.type) && url.searchParams.get('dl') !== '1';
      res.writeHead(200, {
        'Content-Type': inline ? f.type : 'application/octet-stream',
        'Content-Length': f.size,
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      });
      return fs.createReadStream(fp).pipe(res);
    }

    // ================= CLIENTE =================
    if (sess.role === 'client') {
      const c = sess.client;
      if (parts[0] === 'password' && m === 'POST') {
        const b = await readBody(req, 5000);
        if (!checkPass(b.current, c.passHash)) throw err(400, 'La contraseña actual no es correcta');
        if (String(b.next || '').length < 8) throw err(400, 'La nueva contraseña debe tener al menos 8 caracteres');
        c.passHash = hashPass(b.next);
        for (const k in db.sessions) if (db.sessions[k].clientId === c.id && k !== sess.key) delete db.sessions[k];
        save();
        return send(res, 200, { ok: true });
      }
      if (parts[0] === 'projects' && m === 'GET') {
        return send(res, 200, { client: publicClient(c), projects: db.projects.filter((p) => p.clientId === c.id).map(clientView) });
      }
      if (parts[0] === 'p' && parts[1]) {
        const p = findProject(parts[1]);
        if (!p || p.clientId !== c.id) throw err(404, 'Proyecto no encontrado');
        const act = parts[2];
        if (act === 'approve' && m === 'POST') {
          const b = await readBody(req, 5000);
          const s = p.stages.find((x) => x.id === b.stageId);
          if (!s || s.status !== 'en_revision') throw err(400, 'Esta etapa no está para aprobar');
          s.status = 'aprobada'; s.approvedAt = now();
          log(p, 'approve', `Aprobó la etapa “${s.name}”`, 'client');
          // la siguiente etapa pendiente pasa a "en curso"
          const next = p.stages.slice(p.stages.indexOf(s) + 1).find((x) => x.status === 'pendiente');
          if (next && !p.stages.some((x) => x.status === 'en_curso')) next.status = 'en_curso';
          save(); broadcast(p, 'approve'); return send(res, 200, { ok: true });
        }
        if (act === 'changes' && m === 'POST') {
          const b = await readBody(req, 20000);
          const s = p.stages.find((x) => x.id === b.stageId);
          const text = str(b.text, 3000);
          if (!s || s.status !== 'en_revision') throw err(400, 'Esta etapa no está en revisión');
          if (!text) throw err(400, 'Contame qué cambios necesitás');
          s.status = 'en_curso';
          p.comments.push({ id: id(8), author: 'client', text: `Cambios pedidos en “${s.name}”:\n${text}`, createdAt: now(), readByAdmin: false, readByClient: true });
          log(p, 'changes', `Pidió cambios en “${s.name}”`, 'client');
          save(); broadcast(p, 'changes'); return send(res, 200, { ok: true });
        }
        if (act === 'comment' && m === 'POST') {
          const b = await readBody(req, 20000);
          const text = str(b.text, 3000);
          if (!text) throw err(400, 'Escribí un mensaje');
          p.comments.push({ id: id(8), author: 'client', text, createdAt: now(), readByAdmin: false, readByClient: true });
          log(p, 'comment', 'Envió un mensaje', 'client');
          save(); broadcast(p, 'comment'); return send(res, 200, { ok: true });
        }
        if (act === 'read' && m === 'POST') {
          let ch = false;
          p.comments.forEach((x) => { if (x.author === 'admin' && !x.readByClient) { x.readByClient = true; ch = true; } });
          if (ch) { save(); broadcast(p, 'read'); }
          return send(res, 200, { ok: true });
        }
        if (act === 'task' && parts[3] && m === 'POST') {
          const b = await readBody(req, 5000);
          const t = p.tasks.find((x) => x.id === parts[3]);
          if (!t) throw err(404, 'Pendiente no encontrado');
          t.done = !!b.done; t.doneAt = t.done ? now() : null; t.doneBy = t.done ? 'client' : null;
          log(p, 'task', `${t.done ? 'Marcó como enviado' : 'Desmarcó'}: “${t.text}”`, 'client');
          save(); broadcast(p, 'task'); return send(res, 200, { ok: true });
        }
        if (act === 'upload' && m === 'POST') {
          const b = await readBody(req, 22 * 1024 * 1024);
          const f = storeFile(p, b, 'client');
          log(p, 'file', `Subió el archivo “${f.name}”`, 'client');
          save(); broadcast(p, 'file'); return send(res, 200, { ok: true, file: f });
        }
      }
      throw err(404, 'No encontrado');
    }

    // ================= ADMIN =================
    const A = parts[0] === 'admin' ? parts.slice(1) : null;
    if (!A) throw err(404, 'No encontrado');

    if (A[0] === 'state' && m === 'GET') {
      return send(res, 200, { clients: db.clients.map(publicClient), projects: db.projects.map(adminView), plans: PLANS });
    }

    // --- clientes ---
    if (A[0] === 'clients') {
      if (!A[1] && m === 'POST') {
        const b = await readBody(req, 10000);
        const email = str(b.email, 200).toLowerCase();
        if (!str(b.name)) throw err(400, 'Falta el nombre');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw err(400, 'Email inválido');
        if (db.clients.some((x) => x.email === email)) throw err(400, 'Ya existe un cliente con ese email');
        const password = genPassword();
        const c = { id: id(8), name: str(b.name, 120), email, company: str(b.company, 120), phone: str(b.phone, 40), passHash: hashPass(password), active: true, createdAt: now() };
        db.clients.push(c); save(); broadcast(null, 'client');
        return send(res, 200, { ok: true, client: publicClient(c), password });
      }
      const c = db.clients.find((x) => x.id === A[1]);
      if (!c) throw err(404, 'Cliente no encontrado');
      if (A[2] === 'reset' && m === 'POST') {
        const password = genPassword();
        c.passHash = hashPass(password);
        for (const k in db.sessions) if (db.sessions[k].clientId === c.id) delete db.sessions[k];
        save(); return send(res, 200, { ok: true, password });
      }
      if (!A[2] && m === 'PATCH') {
        const b = await readBody(req, 10000);
        if (b.email !== undefined) {
          const email = str(b.email, 200).toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw err(400, 'Email inválido');
          if (db.clients.some((x) => x.email === email && x.id !== c.id)) throw err(400, 'Ese email ya está en uso');
          c.email = email;
        }
        ['name', 'company', 'phone'].forEach((k) => { if (b[k] !== undefined) c[k] = str(b[k], 120); });
        if (b.active !== undefined) {
          c.active = !!b.active;
          if (!c.active) for (const k in db.sessions) if (db.sessions[k].clientId === c.id) delete db.sessions[k];
        }
        save(); broadcast(null, 'client');
        return send(res, 200, { ok: true, client: publicClient(c) });
      }
      if (!A[2] && m === 'DELETE') {
        if (db.projects.some((p) => p.clientId === c.id)) throw err(400, 'Primero eliminá o reasigná sus proyectos');
        db.clients = db.clients.filter((x) => x.id !== c.id);
        for (const k in db.sessions) if (db.sessions[k].clientId === c.id) delete db.sessions[k];
        save(); broadcast(null, 'client');
        return send(res, 200, { ok: true });
      }
    }

    // --- proyectos ---
    if (A[0] === 'projects') {
      if (!A[1] && m === 'POST') {
        const b = await readBody(req, 20000);
        const c = db.clients.find((x) => x.id === b.clientId);
        if (!c) throw err(400, 'Elegí un cliente');
        const planName = PLANS[b.plan] ? b.plan : 'A medida';
        const plan = PLANS[planName];
        const cur = b.currency === 'USD' ? 'USD' : 'UYU';
        const total = Number(b.amount) > 0 ? Number(b.amount) : (cur === 'USD' ? plan.usd : plan.uyu);
        const half = Math.round(total / 2);
        const tasks = BASE_TASKS.concat(planName === 'E-commerce' ? SHOP_TASKS : []);
        const p = {
          id: id(8), clientId: c.id, name: str(b.name, 140) || `Web de ${c.company || c.name}`, plan: planName, status: 'activo',
          startDate: str(b.startDate, 10) || now().slice(0, 10), dueDate: str(b.dueDate, 10), previewUrl: str(b.previewUrl, 300),
          progressOverride: null, internalNotes: '', createdAt: now(),
          stages: plan.stages.map((n, i) => ({ id: id(6), name: n, status: i === 0 ? 'en_curso' : 'pendiente', note: '' })),
          updates: [], comments: [], files: [], activity: [],
          tasks: tasks.map((t) => ({ id: id(6), text: t, done: false })),
          payments: total ? [
            { id: id(6), label: 'Seña (50%) al inicio', amount: half, currency: cur, status: 'pendiente', dueDate: '', paidAt: null },
            { id: id(6), label: 'Saldo (50%) al aprobar la versión final', amount: total - half, currency: cur, status: 'pendiente', dueDate: '', paidAt: null },
          ] : [],
        };
        log(p, 'create', 'Proyecto creado', 'admin');
        db.projects.unshift(p); save(); broadcast(p, 'project');
        return send(res, 200, { ok: true, project: adminView(p) });
      }
      const p = findProject(A[1]);
      if (!p) throw err(404, 'Proyecto no encontrado');

      if (!A[2] && m === 'PATCH') {
        const b = await readBody(req, 200000);
        ['name', 'previewUrl', 'internalNotes'].forEach((k) => { if (b[k] !== undefined) p[k] = str(b[k], k === 'internalNotes' ? 10000 : 300); });
        ['startDate', 'dueDate'].forEach((k) => { if (b[k] !== undefined) p[k] = str(b[k], 10); });
        if (b.plan !== undefined && PLANS[b.plan]) p.plan = b.plan;
        if (b.clientId !== undefined && db.clients.some((x) => x.id === b.clientId)) p.clientId = b.clientId;
        if (b.status !== undefined && PROJ_ST.includes(b.status)) {
          if (b.status !== p.status) log(p, 'status', `Estado del proyecto: ${b.status}`, 'admin');
          p.status = b.status;
        }
        if (b.progressOverride !== undefined) {
          const v = b.progressOverride === null || b.progressOverride === '' ? null : Math.max(0, Math.min(100, Math.round(Number(b.progressOverride))));
          p.progressOverride = Number.isFinite(v) ? v : null;
        }
        if (Array.isArray(b.stages)) {
          const old = new Map(p.stages.map((s) => [s.id, s]));
          p.stages = b.stages.slice(0, 20).map((s) => {
            const prev = old.get(s.id);
            const st = STAGE_ST.includes(s.status) ? s.status : 'pendiente';
            if (prev && prev.status !== st) log(p, 'stage', `“${str(s.name, 80)}” → ${st.replace('_', ' ')}`, 'admin');
            return { id: prev ? prev.id : id(6), name: str(s.name, 80) || 'Etapa', status: st, note: str(s.note, 600), approvedAt: st === 'aprobada' ? (prev && prev.approvedAt) || now() : null };
          });
        }
        if (Array.isArray(b.tasks)) {
          const old = new Map(p.tasks.map((t) => [t.id, t]));
          p.tasks = b.tasks.slice(0, 60).map((t) => {
            const prev = old.get(t.id);
            const done = !!t.done;
            return { id: prev ? prev.id : id(6), text: str(t.text, 200) || 'Pendiente', done, doneAt: done ? (prev && prev.doneAt) || now() : null, doneBy: done ? (prev && prev.doneBy) || 'admin' : null };
          });
        }
        if (Array.isArray(b.payments)) {
          const old = new Map(p.payments.map((x) => [x.id, x]));
          p.payments = b.payments.slice(0, 30).map((x) => {
            const prev = old.get(x.id);
            const st = PAY_ST.includes(x.status) ? x.status : 'pendiente';
            if (prev && prev.status !== st && st === 'pagado') log(p, 'payment', `Pago registrado: ${str(x.label, 80)}`, 'admin');
            return { id: prev ? prev.id : id(6), label: str(x.label, 120) || 'Pago', amount: Math.max(0, Number(x.amount) || 0), currency: x.currency === 'USD' ? 'USD' : 'UYU', status: st, dueDate: str(x.dueDate, 10), paidAt: st === 'pagado' ? (prev && prev.paidAt) || now() : null };
          });
        }
        save(); broadcast(p, 'project');
        return send(res, 200, { ok: true, project: adminView(p) });
      }
      if (!A[2] && m === 'DELETE') {
        p.files.forEach((f) => { try { fs.unlinkSync(path.join(UPLOADS, f.id)); } catch (_) {} });
        db.projects = db.projects.filter((x) => x.id !== p.id);
        save(); broadcast(p, 'deleted');
        return send(res, 200, { ok: true });
      }
      if (A[2] === 'updates') {
        if (!A[3] && m === 'POST') {
          const b = await readBody(req, 50000);
          const title = str(b.title, 160), body = str(b.body, 8000);
          if (!title) throw err(400, 'Poné un título a la novedad');
          const images = (Array.isArray(b.images) ? b.images : []).filter((fid) => p.files.some((f) => f.id === fid)).slice(0, 8);
          const u = { id: id(8), title, body, images, link: str(b.link, 300), createdAt: now() };
          p.updates.unshift(u);
          log(p, 'update', `Nueva novedad: “${title}”`, 'admin');
          save(); broadcast(p, 'update'); return send(res, 200, { ok: true });
        }
        if (A[3] && m === 'DELETE') {
          p.updates = p.updates.filter((u) => u.id !== A[3]);
          save(); broadcast(p, 'update'); return send(res, 200, { ok: true });
        }
      }
      if (A[2] === 'comment' && m === 'POST') {
        const b = await readBody(req, 20000);
        const text = str(b.text, 3000);
        if (!text) throw err(400, 'Escribí un mensaje');
        p.comments.push({ id: id(8), author: 'admin', text, createdAt: now(), readByAdmin: true, readByClient: false });
        save(); broadcast(p, 'acomment'); return send(res, 200, { ok: true });
      }
      if (A[2] === 'read' && m === 'POST') {
        let ch = false;
        p.comments.forEach((x) => { if (x.author === 'client' && !x.readByAdmin) { x.readByAdmin = true; ch = true; } });
        if (ch) { save(); broadcast(p, 'read'); }
        return send(res, 200, { ok: true });
      }
      if (A[2] === 'upload' && m === 'POST') {
        const b = await readBody(req, 22 * 1024 * 1024);
        const f = storeFile(p, b, 'admin');
        save(); broadcast(p, 'afile'); return send(res, 200, { ok: true, file: f });
      }
      if (A[2] === 'files' && A[3] && m === 'DELETE') {
        p.files = p.files.filter((f) => f.id !== A[3]);
        p.updates.forEach((u) => { u.images = (u.images || []).filter((x) => x !== A[3]); });
        try { fs.unlinkSync(path.join(UPLOADS, A[3])); } catch (_) {}
        save(); broadcast(p, 'file'); return send(res, 200, { ok: true });
      }
    }
    throw err(404, 'No encontrado');
  }

  return {
    dataDir: DATA_DIR,
    handle(req, res) {
      const url = new URL(req.url, 'http://x');
      if (!url.pathname.startsWith('/api/portal')) return false;
      route(req, res, url).catch((e) => {
        const status = e.status || (e.message === 'too_big' ? 413 : e.message === 'bad_json' ? 400 : 500);
        if (status === 500) console.error('portal error', e);
        if (!res.headersSent) send(res, status, { ok: false, error: status === 413 ? 'El archivo es demasiado grande' : status === 500 ? 'Error del servidor' : e.message });
      });
      return true;
    },
  };
};
