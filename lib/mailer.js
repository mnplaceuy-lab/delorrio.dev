// Emails de Delorrio.dev (Resend) — sin dependencias.
//
// Variables de entorno (Railway → Variables):
//   RESEND_API_KEY   clave de https://resend.com (con el dominio delorrio.dev verificado)
//   MAIL_FROM        remitente, ej.: "Santiago · Delorrio.dev <hola@delorrio.dev>"
//   MAIL_REPLY_TO    (opcional) a dónde llegan las respuestas. Por defecto ADMIN_EMAIL
//   SITE_URL         (opcional) por defecto https://delorrio.dev

const dns = require('dns').promises;

const SITE = (process.env.SITE_URL || 'https://delorrio.dev').replace(/\/$/, '');
const FROM = process.env.MAIL_FROM || 'Santiago · Delorrio.dev <hola@delorrio.dev>';
const WA = '59892555045';
// las respuestas de los clientes llegan a tu email personal
const REPLY_TO = (process.env.MAIL_REPLY_TO || process.env.ADMIN_EMAIL || '').trim();

function enabled() { return !!process.env.RESEND_API_KEY; }

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ¿El dominio del email recibe correos? (descarta emails inventados tipo juan@asdasd.xyz)
let dnsOk = { at: 0, ok: true };
async function dnsWorks() { // si ni gmail.com resuelve, el DNS del servidor falla: no bloquear a nadie
  if (Date.now() - dnsOk.at < 10 * 60e3) return dnsOk.ok;
  let ok = true;
  try { await dns.resolveMx('gmail.com'); } catch (_) { ok = false; }
  dnsOk = { at: Date.now(), ok };
  return ok;
}
async function domainReceivesMail(email) {
  const r = await domainCheck(email);
  return r ? true : !(await dnsWorks());
}
async function domainCheck(email) {
  const domain = String(email).split('@')[1];
  if (!domain) return false;
  const withTimeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })), 4000))]);
  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    if (mx && mx.length && !(mx.length === 1 && mx[0].exchange === '')) return true;
  } catch (e) {
    if (!['ENOTFOUND', 'ENODATA', 'ESERVFAIL', 'ENONAME'].includes(e.code)) return true; // red caída o timeout: no bloquear
  }
  try { // sin MX: algunos dominios reciben en el registro A
    const a = await withTimeout(dns.resolve4(domain));
    return !!(a && a.length);
  } catch (e) {
    return !['ENOTFOUND', 'ENODATA', 'ESERVFAIL', 'ENONAME'].includes(e.code);
  }
}

// Plantilla HTML compatible con clientes de correo
function layout({ preheader, title, intro, body, cta, note }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a">
<span style="display:none!important;opacity:0;color:transparent;max-height:0;overflow:hidden">${esc(preheader || intro || '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="background:#050b16;border-radius:18px 18px 0 0;padding:22px 28px">
  <span style="font:700 19px/1 Helvetica,Arial,sans-serif;color:#f4f7fb">Delorrio.dev</span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#37b6ff;margin-left:6px;vertical-align:middle"></span>
</td></tr>
<tr><td style="background:#ffffff;padding:32px 28px 28px;border-radius:0 0 18px 18px">
  <h1 style="margin:0 0 12px;font:700 22px/1.3 Helvetica,Arial,sans-serif;color:#0f172a">${esc(title)}</h1>
  ${intro ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155">${intro}</p>` : ''}
  ${body || ''}
  ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="border-radius:12px;background:#0ea5e9;background-image:linear-gradient(135deg,#37b6ff,#22c3e6)">
    <a href="${esc(cta.url)}" style="display:inline-block;padding:14px 26px;font:700 15px/1 Helvetica,Arial,sans-serif;color:#031521;text-decoration:none;border-radius:12px">${esc(cta.label)}</a></td></tr></table>
    <p style="margin:10px 0 0;font-size:12.5px;line-height:1.5;color:#64748b">Si el botón no funciona, copiá este link:<br><a href="${esc(cta.url)}" style="color:#0284c7;word-break:break-all">${esc(cta.url)}</a></p>` : ''}
  ${note ? `<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.55;color:#64748b">${note}</p>` : ''}
</td></tr>
<tr><td style="padding:18px 28px;text-align:center;font-size:12px;line-height:1.6;color:#94a3b8">
  Delorrio.dev · Diseño y desarrollo web<br><a href="${SITE}" style="color:#64748b">delorrio.dev</a> · <a href="https://wa.me/${WA}" style="color:#64748b">WhatsApp</a>
</td></tr></table></td></tr></table></body></html>`;
}

function textOf(o) {
  const strip = (h) => String(h || '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return [o.title, '', strip(o.intro), strip(o.body), o.cta ? `${o.cta.label}: ${o.cta.url}` : '', o.note ? '\n' + strip(o.note) : '', '\n— Delorrio.dev · ' + SITE].filter((x) => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');
}

async function send(to, subject, o, opts) {
  if (!enabled()) return { ok: false, skipped: true, error: 'Emails no configurados (falta RESEND_API_KEY)' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ from: FROM, to: [to], subject, html: layout(o), text: textOf(o) },
        REPLY_TO && REPLY_TO !== to ? { reply_to: REPLY_TO } : {}, opts || {})),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('[mail] Resend rechazó el envío', r.status, t);
      return { ok: false, error: 'El servicio de correo rechazó el envío' };
    }
    return { ok: true };
  } catch (e) {
    console.error('[mail] error', e.message);
    return { ok: false, error: 'No se pudo contactar al servicio de correo' };
  }
}

const first = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const quote = (t) => `<div style="margin:0 0 6px;padding:14px 16px;border-radius:12px;background:#f1f5f9;border-left:3px solid #37b6ff;font-size:14.5px;line-height:1.55;color:#0f172a;white-space:pre-wrap">${esc(t)}</div>`;

const T = {
  invite: (c, link) => ['Tu panel de cliente en Delorrio.dev', {
    preheader: 'Creá tu contraseña y seguí tu proyecto en vivo.',
    title: `¡Hola ${first(c.name)}! Bienvenido a tu panel`,
    intro: 'Desde tu panel vas a poder seguir <b>en vivo</b> cómo avanza tu web: etapas, novedades, archivos, pagos y mensajes directos conmigo.',
    body: '<p style="margin:0;font-size:15px;line-height:1.6;color:#334155">Para entrar, creá tu contraseña con el botón de abajo.</p>',
    cta: { label: 'Crear mi contraseña', url: link },
    note: `El link vence en 3 días. Tu usuario es <b>${esc(c.email)}</b>. Si no esperabas este correo, podés ignorarlo.`,
  }],
  reset: (c, link) => ['Cambiá tu contraseña · Delorrio.dev', {
    preheader: 'Link para crear una nueva contraseña.',
    title: 'Creá una nueva contraseña',
    intro: `Hola ${esc(first(c.name))}, recibimos un pedido para cambiar la contraseña de tu panel de cliente.`,
    cta: { label: 'Crear nueva contraseña', url: link },
    note: 'El link vence en 1 hora. Si no lo pediste vos, ignorá este correo: tu contraseña actual sigue funcionando.',
  }],
  update: (c, p, u) => [`Novedad en tu proyecto: ${u.title}`, {
    preheader: u.title,
    title: u.title,
    intro: `Hola ${esc(first(c.name))}, hay una novedad en <b>${esc(p.name)}</b>.`,
    body: u.body ? quote(u.body.length > 600 ? u.body.slice(0, 600) + '…' : u.body) : '',
    cta: { label: 'Ver en mi panel', url: SITE + '/panel/' },
  }],
  message: (c, p, text) => ['Santiago te escribió · ' + p.name, {
    preheader: text.slice(0, 120),
    title: 'Tenés un mensaje nuevo',
    intro: `Hola ${esc(first(c.name))}, te escribí sobre <b>${esc(p.name)}</b>:`,
    body: quote(text.length > 800 ? text.slice(0, 800) + '…' : text),
    cta: { label: 'Responder en el panel', url: SITE + '/panel/#chat' },
  }],
  review: (c, p, stages) => [`Lista para revisar: ${stages.join(', ')}`, {
    preheader: 'Revisala y aprobala o pedime cambios.',
    title: stages.length === 1 ? `“${stages[0]}” está lista para revisar` : 'Hay etapas listas para revisar',
    intro: `Hola ${esc(first(c.name))}, terminé ${stages.length === 1 ? 'una etapa' : 'algunas etapas'} de <b>${esc(p.name)}</b>. Mirala y aprobala, o pedime los cambios que necesites.`,
    cta: { label: 'Revisar ahora', url: SITE + '/panel/#stages' },
  }],
  done: (c, p) => ['¡Tu web está publicada! 🚀', {
    title: '¡Tu web está publicada!',
    intro: `Hola ${esc(first(c.name))}, <b>${esc(p.name)}</b> ya está en línea. Gracias por confiar en Delorrio.dev.`,
    body: p.previewUrl ? `<p style="margin:0;font-size:15px;color:#334155">Mirala acá: <a href="${esc(p.previewUrl)}" style="color:#0284c7">${esc(p.previewUrl)}</a></p>` : '',
    cta: { label: 'Ir a mi panel', url: SITE + '/panel/' },
  }],
  contract: (c, p, reminder) => [(reminder ? 'Recordatorio: ' : '') + 'Tu contrato está listo para firmar · ' + p.name, {
    preheader: 'Leelo y firmalo desde tu panel en un par de minutos.',
    title: reminder ? 'Tu contrato sigue esperando tu firma' : 'Tu contrato está listo para firmar',
    intro: `Hola ${esc(first(c.name))}, ya podés leer y firmar el contrato de <b>${esc(p.name)}</b> desde tu panel. Es rápido: lo leés, completás tus datos y firmás con el dedo o el mouse.`,
    body: '<p style="margin:0;font-size:15px;line-height:1.6;color:#334155">Apenas lo firmes arrancamos, y te llega una copia en PDF a este email.</p>',
    cta: { label: 'Leer y firmar el contrato', url: SITE + '/panel/' },
  }],
  signedClient: (c, p) => ['Contrato firmado · ' + p.name, {
    preheader: 'Te adjunto tu copia en PDF.',
    title: '¡Contrato firmado! Arrancamos',
    intro: `Gracias ${esc(first(c.name))}. Te adjunto tu copia del contrato de <b>${esc(p.name)}</b> en PDF. También la podés descargar cuando quieras desde tu panel.`,
    cta: { label: 'Ir a mi panel', url: SITE + '/panel/' },
  }],
  signedAdmin: (c, p, s) => [`${c.name} firmó el contrato · ${p.name}`, {
    title: `${c.name} firmó el contrato`,
    intro: `Proyecto: <b>${esc(p.name)}</b>. Firmó ${esc(s.name)} (documento ${esc(s.doc)}) desde la IP ${esc(s.ip)}. Va adjunto el PDF.`,
    cta: { label: 'Abrir el panel admin', url: SITE + '/admin/' },
  }],
  admin: (c, p, what, detail) => [`${c.name} ${what} · ${p.name}`, {
    preheader: detail ? String(detail).slice(0, 120) : what,
    title: `${c.name} ${what}`,
    intro: `Proyecto: <b>${esc(p.name)}</b>${c.company ? ' · ' + esc(c.company) : ''}`,
    body: detail ? quote(detail) : '',
    cta: { label: 'Abrir el panel admin', url: SITE + '/admin/' },
  }],
};

module.exports = { enabled, send, T, SITE, FROM, domainReceivesMail };
