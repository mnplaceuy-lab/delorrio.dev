// Servidor de Delorrio.dev (sin dependencias).
// - Sirve los archivos estáticos del sitio.
// - POST /api/contact → envía el formulario por email (Resend) + respuesta automática al que escribe.
//
// Variables de entorno (Railway → Variables):
//   RESEND_API_KEY   clave de https://resend.com (obligatoria para el formulario)
//   CONTACT_TO       correo que recibe los mensajes (por defecto santiagodelorrio2013@gmail.com)
//   CONTACT_FROM     remitente (por defecto "Delorrio.dev <onboarding@resend.dev>")
//   ADMIN_EMAIL      email para entrar a delorrio.dev/admin
//   ADMIN_PASSWORD   contraseña de delorrio.dev/admin (mínimo 10 caracteres)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const TO = process.env.CONTACT_TO || 'santiagodelorrio2013@gmail.com';
const FROM = process.env.CONTACT_FROM || 'Delorrio.dev <onboarding@resend.dev>';
const portal = require('./lib/portal')({ ROOT });
const mail = require('./lib/mailer');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};
// carpetas/archivos que nunca se sirven
const PRIVATE = /^\/(node_modules|scene|lib|data|\.git)(\/|$)|^\/(server\.js|package(-lock)?\.json|\.gitignore|\.env)$/;

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (PRIVATE.test(urlPath)) return send(res, 404, 'Not found', 'text/plain');
  let file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    else if (err) {
      // archivos que no existen → 404 (así una demo faltante no muestra la home rota)
      if (path.extname(urlPath)) return send(res, 404, 'Not found', 'text/plain');
      file = path.join(ROOT, 'index.html'); // rutas sin extensión → la home
    }
    fs.readFile(file, (e, data) => {
      if (e) return send(res, 404, 'Not found', 'text/plain');
      const ext = path.extname(file).toLowerCase();
      const cache = ext === '.html' ? 'no-cache' : 'public, max-age=86400';
      res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache });
      res.end(data);
    });
  });
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// límite simple anti-abuso: 5 envíos por IP cada 10 minutos
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}

function handleContact(req, res) {
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 20000) req.destroy(); });
  req.on('end', async () => {
    let d;
    try { d = JSON.parse(raw || '{}'); } catch { return send(res, 400, { ok: false, error: 'Datos inválidos' }); }
    if (d.botcheck) return send(res, 200, { ok: true }); // bot: se ignora en silencio
    const name = String(d.nombre || '').trim().slice(0, 120);
    const email = String(d.email || '').trim().toLowerCase().slice(0, 200);
    const message = String(d.mensaje || '').trim().slice(0, 5000);
    const business = String(d.negocio || '').trim().slice(0, 160);
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return send(res, 400, { ok: false, error: 'Completá nombre, email válido y mensaje' });
    }
    if (!mail.enabled()) return send(res, 503, { ok: false, error: 'Correo no configurado', fallback: true });
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (limited(ip)) return send(res, 429, { ok: false, error: 'Demasiados envíos, probá más tarde' });
    if (!(await mail.domainReceivesMail(email))) return send(res, 400, { ok: false, error: 'Revisá tu email: ese dominio no recibe correos' });

    const lead = { name, email, business, message };
    const to = (process.env.CONTACT_TO || process.env.ADMIN_EMAIL || 'santiagodelorrio2013@gmail.com').trim();
    const [s1, o1] = mail.T.lead(lead);
    const r = await mail.send(to, s1, o1, { reply_to: email });
    if (!r.ok) return send(res, 502, { ok: false, error: r.error, fallback: true });
    const [s2, o2] = mail.T.leadReply(lead);
    mail.send(email, s2, o2); // respuesta automática (no bloquea)
    send(res, 200, { ok: true });
  });
}

http.createServer((req, res) => {
  if (portal.handle(req, res)) return;
  if (req.url.split('?')[0] === '/api/contact') {
    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Método no permitido' });
    return handleContact(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');
  serveStatic(req, res);
}).listen(PORT, () => console.log(`Delorrio.dev en puerto ${PORT} · datos del portal en ${portal.dataDir}`));
