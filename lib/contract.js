// Contratos de Delorrio.dev: plantilla por plan + PDF sin dependencias.
// Formato del texto: "## Título de cláusula", "- ítem", párrafos separados por línea en blanco.

const FEATURES = {
  'Web Start': ['Landing page (página única pensada para convertir)', 'Diseño 100% a medida', 'Integración con redes sociales y WhatsApp', 'Diseño adaptable a celulares y tablets', 'Hosting, dominio y certificado SSL por 1 año', 'Mantenimiento y soporte por 1 año'],
  'Web Pro': ['Todo lo incluido en el plan Web Start', 'Registro e inicio de sesión de usuarios', 'Panel con estadísticas y contactos', 'Catálogo de productos o servicios', 'Hosting, dominio y certificado SSL por 1 año', 'Mantenimiento y soporte por 1 año'],
  'E-commerce': ['Todo lo incluido en el plan Web Pro', 'Tienda online con carrito de compras', 'Pagos con Mercado Pago y otros medios', 'Gestión de productos y pedidos', 'Hosting, dominio y certificado SSL por 1 año', 'Mantenimiento y soporte por 1 año'],
  'A medida': ['Diseño y desarrollo según lo acordado entre las partes', 'Hosting, dominio y certificado SSL por 1 año', 'Mantenimiento y soporte por 1 año'],
};
const DAYS = { 'Web Start': '1 a 2', 'Web Pro': '7 a 10', 'E-commerce': '10 a 15', 'A medida': 'a acordar' };
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fdate(iso) {
  if (!iso) return 'a definir';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return d.getDate() + ' de ' + MES[d.getMonth()] + ' de ' + d.getFullYear();
}
function money(n, cur) { return (cur === 'USD' ? 'US$ ' : '$ ') + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (cur === 'USD' ? ' (dólares)' : ' (pesos uruguayos)'); }

function template(p, c, prov) {
  const P = prov || {};
  const provName = P.name || 'Santiago Delorrio';
  const provDoc = P.doc ? `, documento ${P.doc}` : '';
  const city = P.city || 'Uruguay';
  const cur = (p.payments[0] || {}).currency || 'UYU';
  const total = p.payments.filter((x) => x.currency === cur).reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const pays = p.payments.map((x) => `- ${x.label}: ${money(x.amount, x.currency)}${x.dueDate ? ', con vencimiento el ' + fdate(x.dueDate) : ''}.`).join('\n');
  const feats = (FEATURES[p.plan] || FEATURES['A medida']).map((f) => '- ' + f + '.').join('\n');
  return `## 1. Partes
Por una parte, ${provName}${provDoc}, que trabaja bajo la marca Delorrio.dev (en adelante, "el Prestador"). Por otra parte, ${c.name}${c.company ? ', en representación de ' + c.company : ''}, con email ${c.email} (en adelante, "el Cliente"). Los datos de identificación del Cliente se completan al momento de la firma.

## 2. Objeto
El Prestador se compromete a diseñar y desarrollar el proyecto "${p.name}", correspondiente al plan ${p.plan}, que incluye:
${feats}

Cualquier funcionalidad no listada se considera un trabajo adicional y se presupuesta por separado.

## 3. Plazos
El plazo estimado de entrega es de ${DAYS[p.plan] || 'a acordar'} días hábiles${p.dueDate ? ', con fecha estimada el ' + fdate(p.dueDate) : ''}. El plazo comienza a correr cuando el Prestador recibe la seña y todos los materiales solicitados (logo, textos, fotos y datos de contacto). Las demoras en la entrega de materiales o en las aprobaciones del Cliente extienden el plazo en la misma medida.

## 4. Precio y forma de pago
El precio total del proyecto es de ${money(total, cur)}, pago único, que se abona de la siguiente forma:
${pays || '- 50% al inicio y 50% al aprobar la versión final.'}

La web se publica en su dominio definitivo una vez abonado el total.

## 5. Revisiones y cambios
El Cliente puede revisar cada etapa desde su panel de cliente y aprobarla o pedir cambios. Durante los 30 días posteriores a la entrega, los ajustes menores están incluidos. Los cambios posteriores o que modifiquen el alcance acordado tienen un costo de US$ 25 por hora de trabajo, previa aprobación del Cliente.

## 6. Hosting, dominio y mantenimiento
El hosting, el dominio, el certificado SSL, el mantenimiento y el soporte están incluidos durante el primer año desde la publicación. A partir del segundo año, la renovación cuesta US$ 200 anuales. Si el Cliente decide no renovar, el Prestador le entrega los archivos del sitio para que pueda alojarlo donde prefiera.

## 7. Obligaciones del Cliente
El Cliente se compromete a entregar los materiales necesarios en tiempo y forma, a responder las consultas y revisiones dentro de un plazo razonable, y garantiza que tiene los derechos de uso de los textos, imágenes, logos y marcas que entrega para el proyecto.

## 8. Propiedad intelectual
Una vez abonado el precio total, el Cliente es titular del diseño final y de los contenidos de su sitio. El Prestador conserva la titularidad de las herramientas, componentes y código genérico que reutiliza en otros trabajos, y puede mostrar el proyecto en su portfolio, salvo que el Cliente indique lo contrario por escrito.

## 9. Confidencialidad
Ambas partes se comprometen a no divulgar información confidencial de la otra parte a la que accedan con motivo de este contrato, como accesos, datos de clientes o información comercial.

## 10. Cancelación
Si el Cliente cancela el proyecto una vez iniciado, la seña abonada no se reintegra, ya que cubre el trabajo realizado y la reserva de agenda. Si el Prestador no pudiera completar el proyecto por causas propias, reintegra al Cliente los importes correspondientes al trabajo no realizado.

## 11. Comunicaciones y firma electrónica
Las partes acuerdan comunicarse por el panel de cliente de delorrio.dev, por email y por WhatsApp. Este contrato se firma electrónicamente: al firmar, se registran el nombre y documento del firmante, su firma, la fecha y hora, y la dirección IP desde la que firma, junto con una huella digital (hash) del texto aceptado. Las partes reconocen esta firma como válida, conforme a la Ley N.º 18.600 de documento electrónico y firma electrónica.

## 12. Jurisdicción
Para cualquier diferencia derivada de este contrato, las partes intentarán primero una solución amistosa. De no lograrse, se someten a los tribunales competentes de ${city}, República Oriental del Uruguay.`;
}

// ===================== PDF =====================
// Anchos de Helvetica (AFM) para 32..126
const W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const BASE = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n', 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ñ': 'N', 'º': 'o', 'ª': 'a' };
const WIN = { '“': 0x93, '”': 0x94, '‘': 0x91, '’': 0x92, '–': 0x96, '—': 0x97, '…': 0x85, '•': 0x95, '€': 0x80 };
function charW(ch, bold) {
  let w;
  if (ch === '¿' || ch === '¡') w = ch === '¿' ? 611 : 333;
  else if (WIN[ch]) w = ch === '—' ? 1000 : ch === '…' ? 1000 : ch === '•' ? 350 : ch === '–' ? 556 : 333;
  else {
    const b = BASE[ch] || ch;
    const code = b.charCodeAt(0);
    w = code >= 32 && code <= 126 ? W[code - 32] : 556;
  }
  return bold ? w * 1.07 : w;
}
function textW(s, size, bold) { let t = 0; for (const ch of s) t += charW(ch, bold); return (t * size) / 1000; }
function enc(s) { // a bytes WinAnsi escapados para un string PDF
  const out = [];
  for (const ch of s) {
    let b = WIN[ch];
    if (b === undefined) { const cp = ch.codePointAt(0); b = cp < 256 ? cp : 63; }
    if (b === 40 || b === 41 || b === 92) out.push(92);
    out.push(b);
  }
  return Buffer.from(out).toString('latin1');
}
function wrap(text, size, bold, maxW) {
  const words = text.split(/\s+/).filter(Boolean), lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (textW(t, size, bold) <= maxW || !line) line = t;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

function renderPdf({ title, subtitle, body, meta, signature, footer }) {
  const PW = 595.28, PH = 841.89, M = 56, CW = PW - M * 2;
  const pages = []; let ops = []; let y = PH - M;
  const newPage = () => { if (ops.length) pages.push(ops); ops = []; y = PH - M; };
  const need = (h) => { if (y - h < M + 30) newPage(); };
  const color = (r, g, b) => `${r} ${g} ${b} rg`;
  const text = (str, x, yy, size, bold, rgb) => ops.push(`BT ${rgb || color(0.06, 0.09, 0.16)} /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${enc(str)}) Tj ET`);

  // encabezado
  ops.push(`${color(0.02, 0.04, 0.09)} 0 ${PH - 70} ${PW} 70 re f`);
  text('Delorrio.dev', M, PH - 44, 16, true, color(0.96, 0.97, 0.98));
  ops.push(`${color(0.22, 0.71, 1)} ${(M + textW('Delorrio.dev', 16, true) + 6).toFixed(2)} ${PH - 45} 5 5 re f`);
  text('Diseño y desarrollo web', PW - M - textW('Diseño y desarrollo web', 9, false), PH - 42, 9, false, color(0.58, 0.65, 0.76));
  y = PH - 110;
  for (const l of wrap(title, 17, true, CW)) { text(l, M, y, 17, true); y -= 22; }
  if (subtitle) { for (const l of wrap(subtitle, 10, false, CW)) { text(l, M, y, 10, false, color(0.39, 0.45, 0.55)); y -= 14; } }
  y -= 10;
  ops.push(`${color(0.89, 0.91, 0.94)} ${M} ${y} ${CW} 0.8 re f`);
  y -= 22;

  // cuerpo
  const blocks = String(body).replace(/\r/g, '').split(/\n/);
  for (const raw of blocks) {
    const line = raw.trimEnd();
    if (!line.trim()) { y -= 6; continue; }
    if (line.startsWith('## ')) {
      need(40); y -= 6;
      for (const l of wrap(line.slice(3), 11.5, true, CW)) { text(l, M, y, 11.5, true); y -= 16; }
      y -= 2; continue;
    }
    if (/^- /.test(line)) {
      const ls = wrap(line.slice(2), 10, false, CW - 16);
      ls.forEach((l, i) => { need(15); if (i === 0) text('•', M + 4, y, 10, false); text(l, M + 16, y, 10, false, color(0.2, 0.25, 0.33)); y -= 14.5; });
      continue;
    }
    for (const l of wrap(line, 10, false, CW)) { need(15); text(l, M, y, 10, false, color(0.2, 0.25, 0.33)); y -= 14.5; }
    y -= 3;
  }

  // firmas
  let img = null;
  if (signature) {
    const buf = Buffer.from(String(signature).replace(/^data:image\/jpeg;base64,/, ''), 'base64');
    const sz = jpegSize(buf);
    if (sz) img = { buf, w: sz.w, h: sz.h };
  }
  need(175); y -= 18;
  ops.push(`${color(0.89, 0.91, 0.94)} ${M} ${y} ${CW} 0.8 re f`); y -= 22;
  text('FIRMAS', M, y, 9, true, color(0.39, 0.45, 0.55)); y -= 18;
  const colW = (CW - 24) / 2, x2 = M + colW + 24, top = y;
  // cliente
  text('El Cliente', M, y, 10, true);
  let yy = y - 8;
  if (img) {
    const h = 56, w = Math.min(colW, (img.w / img.h) * h);
    ops.push(`q ${w.toFixed(2)} 0 0 ${h} ${M} ${(yy - h).toFixed(2)} cm /Im1 Do Q`);
  }
  yy -= 64;
  ops.push(`${color(0.6, 0.65, 0.72)} ${M} ${yy} ${colW} 0.6 re f`); yy -= 14;
  (meta.client || []).forEach((l) => { for (const w of wrap(l, 8.5, false, colW)) { text(w, M, yy, 8.5, false, color(0.2, 0.25, 0.33)); yy -= 12; } });
  // prestador
  let y2 = top;
  text('El Prestador', x2, y2, 10, true); y2 -= 8;
  text(meta.providerSign || '', x2, y2 - 38, 20, false, color(0.05, 0.25, 0.5)); y2 -= 64;
  ops.push(`${color(0.6, 0.65, 0.72)} ${x2} ${y2} ${colW} 0.6 re f`); y2 -= 14;
  (meta.provider || []).forEach((l) => { for (const w of wrap(l, 8.5, false, colW)) { text(w, x2, y2, 8.5, false, color(0.2, 0.25, 0.33)); y2 -= 12; } });
  y = Math.min(yy, y2) - 10;
  if (footer) { for (const l of wrap(footer, 7.5, false, CW)) { need(11); text(l, M, y, 7.5, false, color(0.45, 0.5, 0.58)); y -= 10; } }
  pages.push(ops);

  // numeración
  pages.forEach((p, i) => {
    const s = `Página ${i + 1} de ${pages.length}`;
    p.push(`BT ${color(0.58, 0.63, 0.7)} /F1 8 Tf ${(PW - M - textW(s, 8, false)).toFixed(2)} 28 Td (${enc(s)}) Tj ET`);
    p.push(`BT ${color(0.58, 0.63, 0.7)} /F1 8 Tf ${M} 28 Td (${enc('delorrio.dev')}) Tj ET`);
  });

  // ensamblado
  const objs = [];
  const add = (o) => { objs.push(o); return objs.length; };
  const catalog = add(null), pagesId = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  let imId = null;
  if (img) imId = add({ dict: `<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.buf.length} >>`, stream: img.buf });
  const res = `<< /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${imId ? ` /XObject << /Im1 ${imId} 0 R >>` : ''} >>`;
  const kids = [];
  pages.forEach((p) => {
    const content = Buffer.from(p.join('\n'), 'latin1');
    const cId = add({ dict: `<< /Length ${content.length} >>`, stream: content });
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources ${res} /Contents ${cId} 0 R >>`));
  });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const info = add(`<< /Title (${enc(title)}) /Producer (Delorrio.dev) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z) >>`);

  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  let off = chunks[0].length; const xref = [];
  objs.forEach((o, i) => {
    xref.push(off);
    let b;
    if (o && o.stream) b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n${o.dict}\nstream\n`, 'latin1'), o.stream, Buffer.from('\nendstream\nendobj\n', 'latin1')]);
    else b = Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1');
    chunks.push(b); off += b.length;
  });
  let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  xref.forEach((o) => { x += String(o).padStart(10, '0') + ' 00000 n \n'; });
  x += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${off}\n%%EOF\n`;
  chunks.push(Buffer.from(x, 'latin1'));
  return Buffer.concat(chunks);
}

function contractPdf(p, c, prov) {
  const k = p.contract || {};
  const signed = k.status === 'signed';
  const s = k.signer || {};
  const P = prov || {};
  const dt = (iso) => iso ? new Date(iso).toLocaleString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'long', timeStyle: 'short' }) : '';
  return renderPdf({
    title: 'Contrato de servicios de diseño y desarrollo web',
    subtitle: `${p.name} · Plan ${p.plan} · ${signed ? 'Firmado el ' + dt(k.signedAt) : k.status === 'pending' ? 'Pendiente de firma' : 'BORRADOR — sin validez hasta su firma'}`,
    body: k.body || '',
    signature: signed ? k.signature : null,
    meta: {
      client: signed ? [s.name, 'Documento: ' + s.doc, c.company ? 'Empresa: ' + c.company : '', 'Firmado: ' + dt(k.signedAt), 'IP: ' + s.ip].filter(Boolean) : ['Pendiente de firma'],
      providerSign: P.name || 'Santiago Delorrio',
      provider: [P.name || 'Santiago Delorrio', P.doc ? 'Documento: ' + P.doc : '', 'Delorrio.dev', k.sentAt ? 'Emitido: ' + dt(k.sentAt) : ''].filter(Boolean),
    },
    footer: signed ? `Firma electrónica registrada por delorrio.dev. Huella SHA-256 del texto aceptado: ${k.hash}. Cualquier modificación del texto cambia esta huella.` : '',
  });
}

module.exports = { template, contractPdf, renderPdf };
