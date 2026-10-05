// Genera la guía impresa del Plan Prepagado para el personal de caja y recepción.
// Uso: node scripts/generar_pptx_guia_personal.mjs
// Sale en Prepagada/PetsPets_Prepagada_Guia_Personal.pptx
import PptxGenJS from 'pptxgenjs';
import { fileURLToPath } from 'url';
import path from 'path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const L = path.join(AQUI, 'assets', 'logos');
const LOGO_W_TEAL = path.join(L, 'wordmark_teal.png');
const LOGO_W_WHITE = path.join(L, 'wordmark_white.png');
const LOGO_I_TEAL = path.join(L, 'icon_teal_trim.png');
const LOGO_I_WHITE = path.join(L, 'icon_white_trim.png');

const C = {
  blue: '316D74', deep: '1E4E54', brown: 'A6785B', well: '99B2AA',
  beige: 'F9E7D4', cream: 'FDF6EE', white: 'FFFFFF', ink: '2D2D2D',
  muted: '6B7A7D', line: 'E3E9E9', green: '1E7D45', amber: 'B8873A',
  red: 'C0392B', gray: 'F7F9FC', border: 'DFE3EA', softGray: 'ECEFF3',
  linkBlue: '2A4D9E', linkBg: 'EEF4FF', purple: '6B4BBF', purpleBg: 'F3F0FF',
  orange: 'C05621', orangeBg: 'FFF1E6', gold: '8A6D00', goldBg: 'FFF7E6',
};

// ── Precios: copia de frontend/src/utils/prepagadaPrecios.js ─────────────────
// Si cambian allá, cambiarlos acá y volver a generar la guía.
const PRECIOS = { urgencias: 30000, total: 70000 };
const DESC_MASCOTA = [0, 0.05, 0.10];
const DESC_TARJETA = 0.10;
function totalConIva(base) {
  const servicio = Math.round(base * 0.5 / 100) * 100;
  return base + (servicio * 19) / 100;
}
const precio = (plan, n, tarjeta) => {
  const b = Math.round(PRECIOS[plan] * (1 - DESC_MASCOTA[n]));
  return tarjeta ? Math.round(b * (1 - DESC_TARJETA)) : b;
};
const cop = (n) => '$' + Math.round(n).toLocaleString('es-CO').replace(/,/g, '.');

const W = 13.333, H = 7.5;
const M = 0.75;
const CW = W - M * 2;

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Pets & Pets';
pptx.company = 'Pets &amp; Pets';
pptx.title = 'Guía paso a paso — Plan Prepagado (personal)';

let pageNo = 0;

function content(kicker, title, sub) {
  pageNo++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.09, fill: { color: C.blue } });

  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: M, y: 0.34, w: CW - 1.4, h: 0.25,
      fontSize: 11, bold: true, color: C.brown, charSpacing: 2, fontFace: 'Calibri',
    });
  }
  s.addText(title, {
    x: M, y: kicker ? 0.6 : 0.45, w: CW - 1.4, h: 0.5,
    fontSize: 26, bold: true, color: C.deep, fontFace: 'Calibri',
  });
  if (sub) {
    s.addText(sub, {
      x: M, y: 1.1, w: CW - 1.0, h: 0.4,
      fontSize: 13, color: C.muted, fontFace: 'Calibri', valign: 'top',
    });
  }
  s.addImage({ path: LOGO_I_TEAL, x: W - M - 0.38, y: 0.34, w: 0.38, h: 0.47 });
  s.addText('Guía Prepagada · Pets & Pets · v2.0 octubre 2026', {
    x: M, y: H - 0.42, w: 6, h: 0.22, fontSize: 9, color: C.muted, fontFace: 'Calibri',
  });
  s.addText('Pág. ' + pageNo, {
    x: W - M - 0.9, y: H - 0.42, w: 0.9, h: 0.22,
    fontSize: 9, color: C.muted, align: 'right', fontFace: 'Calibri',
  });
  return s;
}

// ── Helpers de mockup de interfaz ────────────────────────────────────────────
function screenFrame(s, x, y, w, h, titulo) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: 'F0F2F6' }, line: { color: C.border, width: 1 },
    shadow: { type: 'outer', color: '999999', blur: 8, offset: 2, angle: 90, opacity: 0.22 },
  });
  if (titulo) {
    s.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.3, fill: { color: 'E1E5EC' } });
    s.addText(titulo, {
      x: x + 0.15, y, w: w - 0.3, h: 0.3,
      fontSize: 9.5, color: '5C6470', italic: true, valign: 'middle', fontFace: 'Calibri',
    });
  }
}
function phoneFrame(s, x, y, w, h) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.25,
    fill: { color: '22272E' }, line: { color: '22272E', width: 1 },
    shadow: { type: 'outer', color: '999999', blur: 8, offset: 2, angle: 90, opacity: 0.25 },
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: x + 0.12, y: y + 0.3, w: w - 0.24, h: h - 0.5, rectRadius: 0.08,
    fill: { color: C.white }, line: { type: 'none' },
  });
}
function card(s, x, y, w, h, fill = C.white) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: fill }, line: { color: 'E2E6EF', width: 0.75 },
  });
}
function btn(s, x, y, w, h, labelTxt, bg, color = 'FFFFFF', opts = {}) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: bg },
    line: opts.borderColor ? { color: opts.borderColor, width: 1, dashType: opts.dash ? 'dash' : 'solid' } : { type: 'none' },
  });
  s.addText(labelTxt, {
    x, y, w, h, fontSize: opts.fontSize || 9.5, bold: true, color,
    align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0,
  });
}
function input(s, x, y, w, h, texto, opts = {}) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: C.white }, line: { color: opts.focus ? C.blue : C.border, width: opts.focus ? 1.5 : 1 },
  });
  s.addText(texto, {
    x: x + 0.1, y, w: w - 0.2, h,
    fontSize: opts.fontSize || 9.5, color: opts.placeholder ? 'A8B0B8' : C.ink, valign: 'middle',
    align: opts.align || 'left', fontFace: 'Calibri', margin: 0,
  });
}
function label(s, x, y, w, texto) {
  s.addText(texto.toUpperCase(), {
    x, y, w, h: 0.2, fontSize: 7.5, bold: true, color: '5C6470', charSpacing: 0.6, fontFace: 'Calibri', margin: 0,
  });
}
function pill(s, x, y, w, h, texto, bg, color) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.5, fill: { color: bg } });
  s.addText(texto, { x, y, w, h, fontSize: 8, bold: true, color, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
}
// Marcador numerado sobre el mockup
function marca(s, n, x, y, size = 0.3) {
  s.addShape(pptx.ShapeType.ellipse, {
    x, y, w: size, h: size,
    fill: { color: C.amber }, line: { color: C.white, width: 1.5 },
  });
  s.addText(String(n), {
    x, y, w: size, h: size,
    fontSize: 11, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0,
  });
}
// Lista de pasos numerados (a la derecha del mockup)
function pasos(s, x, y, w, items, opts = {}) {
  let cy = y;
  items.forEach((it, i) => {
    marca(s, opts.start ? opts.start + i : i + 1, x, cy + 0.02, 0.28);
    s.addText(it.t, {
      x: x + 0.42, y: cy - 0.02, w: w - 0.42, h: 0.32,
      fontSize: opts.titleSize || 13, bold: true, color: C.deep, fontFace: 'Calibri', valign: 'middle',
    });
    const dh = it.d ? (it.h || opts.descH || 0.46) : 0;
    if (it.d) {
      s.addText(it.d, {
        x: x + 0.42, y: cy + 0.29, w: w - 0.42, h: dh,
        fontSize: opts.descSize || 11.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 15, valign: 'top',
      });
    }
    cy += 0.36 + dh + (opts.gap ?? 0.1);
  });
  return cy;
}
function nota(s, x, y, w, h, titulo, texto, color = C.amber, bg = 'FFF8E8') {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.06, fill: { color: bg }, line: { color, width: 1.25 } });
  s.addText(titulo.toUpperCase(), {
    x: x + 0.22, y: y + 0.1, w: w - 0.44, h: 0.24,
    fontSize: 9.5, bold: true, color, charSpacing: 1.2, fontFace: 'Calibri',
  });
  s.addText(texto, {
    x: x + 0.22, y: y + 0.34, w: w - 0.44, h: h - 0.42,
    fontSize: 11.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 15.5, valign: 'top',
  });
}
const bullets = (arr, size = 12, code = '25AA') =>
  arr.map(t => ({ text: t, options: { bullet: { code }, fontSize: size, color: C.ink, breakLine: true } }));
const th = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.blue }, fontSize: 11.5, align: 'center', valign: 'middle' } });
const td = (t, o = {}) => ({ text: t, options: { fontSize: 11.5, color: C.ink, valign: 'middle', ...o } });

// Cabecera de la ficha del afiliado, tal como se ve en SofVet. Devuelve las
// posiciones de los botones para poner marcas encima.
function fichaHeader(s, x, y, o) {
  s.addText('🐾 ' + o.mascota, { x, y, w: 1.7, h: 0.3, fontSize: 14, bold: true, color: C.ink, fontFace: 'Calibri', margin: 0 });
  const est = {
    activo: ['Activo', 'EAFAF0', C.green],
    pendiente: ['Pendiente de pago', C.orangeBg, C.orange],
  }[o.estado];
  pill(s, x + 1.65, y + 0.04, est[0].length > 8 ? 1.25 : 0.7, 0.22, est[0], est[1], est[2]);
  pill(s, x + (est[0].length > 8 ? 3.0 : 2.45), y + 0.04, 0.85, 0.22, 'Plan ' + o.plan, 'EEF6F6', C.deep);
  s.addText(o.linea, { x, y: y + 0.33, w: o.w, h: 0.22, fontSize: 8.5, color: C.muted, fontFace: 'Calibri', margin: 0 });
  const by = y + 0.66, bh = 0.34;
  const defs = [
    ['link', '💳 Generar link · ' + o.monto, 1.75, C.linkBg, C.linkBlue, C.linkBlue],
    ['tarjeta', o.conTarjeta ? '💳 Cambiar tarjeta' : '💳 Link de tarjeta', 1.3, o.conTarjeta ? 'EAFAF0' : C.white, o.conTarjeta ? C.green : '5C6470', o.conTarjeta ? C.green : C.border],
    ...(o.cobrarAhora ? [['cobrar', '⚡ Cobrar ahora', 1.15, C.purpleBg, C.purple, C.purple]] : []),
    ['pagado', '✅ Marcar pagado', 1.2, 'EAFAF0', C.green, C.green],
    ['facturar', o.yaFacturado ? '🧾 Ya facturado' : '🧾 Facturar', 1.1, o.yaFacturado || o.facturarGris ? 'F2F2F2' : C.goldBg, o.yaFacturado || o.facturarGris ? '999999' : C.gold, o.yaFacturado || o.facturarGris ? 'DDDDDD' : C.gold],
    ['recargar', '↻', 0.36, C.white, '5C6470', C.border],
  ];
  const pos = {};
  let bx = x;
  defs.forEach(([k, t, bw, bg, col, bc]) => {
    btn(s, bx, by, bw, bh, t, bg, col, { borderColor: bc, fontSize: 8 });
    pos[k] = { x: bx, y: by, w: bw };
    bx += bw + 0.08;
  });
  return pos;
}

// ═════════════════════════════════════════════════════════════════ PORTADA
{
  const s = pptx.addSlide();
  s.background = { color: C.deep };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.16, fill: { color: C.brown } });
  s.addImage({ path: LOGO_I_WHITE, x: W - 3.0, y: H - 3.4, w: 2.5, h: 3.1, transparency: 89 });
  s.addImage({ path: LOGO_W_WHITE, x: (W - 3.9) / 2, y: 1.3, w: 3.9, h: 0.61 });

  s.addText('PLAN PREPAGADO', {
    x: 0, y: 2.35, w: W, h: 0.65, fontSize: 38, bold: true, color: C.white, align: 'center', fontFace: 'Calibri',
  });
  s.addText('Guía paso a paso para el equipo', {
    x: 0, y: 3.02, w: W, h: 0.5, fontSize: 22, color: C.beige, align: 'center', fontFace: 'Calibri',
  });
  s.addText('Caja · Recepción · Auxiliares · Médicos veterinarios', {
    x: 0, y: 3.75, w: W, h: 0.35, fontSize: 14, color: C.well, align: 'center', fontFace: 'Calibri',
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: (W - 5.2) / 2, y: 4.45, w: 5.2, h: 0.95, rectRadius: 0.08,
    fill: { color: '2A5F66' }, line: { color: '3C7A82', width: 1 },
  });
  s.addText('Sede: __________________________', {
    x: (W - 5.2) / 2, y: 4.58, w: 5.2, h: 0.3, fontSize: 14, color: C.white, align: 'center', fontFace: 'Calibri',
  });
  s.addText('Mantener este documento impreso y a la mano en caja', {
    x: (W - 5.2) / 2, y: 4.92, w: 5.2, h: 0.3, fontSize: 10.5, color: C.well, align: 'center', italic: true, fontFace: 'Calibri',
  });
  s.addText('Versión 2.0 · Octubre 2026 · Reemplaza la versión de septiembre', {
    x: 0, y: H - 0.85, w: W, h: 0.3, fontSize: 11, color: C.well, align: 'center', fontFace: 'Calibri',
  });
}

// ═════════════════════════════════════════════ LO MÍNIMO QUE DEBES SABER
{
  const s = content('Antes de empezar', 'Lo mínimo que tienes que saber');
  const cw = (CW - 0.35) / 2;

  card(s, M, 1.45, cw, 2.2, C.cream);
  s.addText('PLAN URGENCIAS — $30.000/mes + IVA', { x: M + 0.3, y: 1.6, w: cw - 0.6, h: 0.32, fontSize: 15, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText(bullets([
    'Cubre SOLO urgencias y emergencias',
    'En una urgencia el tutor paga el 20% y P&P el 80%',
    'Bolsa: hasta $4.000.000 al año por mascota',
    'No incluye consultas, vacunas ni descuentos',
  ]), { x: M + 0.3, y: 1.98, w: cw - 0.6, h: 1.55, fontFace: 'Calibri', lineSpacing: 17, valign: 'top' });

  card(s, M + cw + 0.35, 1.45, cw, 2.2, C.cream);
  s.addText('PLAN TOTAL — $70.000/mes + IVA', { x: M + cw + 0.65, y: 1.6, w: cw - 0.6, h: 0.32, fontSize: 15, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText(bullets([
    'Todo lo del Plan Urgencias, MÁS:',
    '12 consultas al año · vacunas · 4 desparasitaciones',
    '1 panel de laboratorio · 1 imagen diagnóstica al año',
    'Descuentos en procedimientos programados',
  ]), { x: M + cw + 0.65, y: 1.98, w: cw - 0.6, h: 1.55, fontFace: 'Calibri', lineSpacing: 17, valign: 'top' });

  const datos = [
    { t: '20%', d: 'Lo que paga el tutor\nen una urgencia cubierta', c: C.blue },
    { t: '$4.000.000', d: 'Bolsa anual por mascota\n(igual en los dos planes)', c: C.blue },
    { t: '0 / 30', d: 'Días de carencia:\nurgencias / todo lo demás', c: C.red },
    { t: '10%', d: 'Menos cada mes si deja\nla tarjeta en cobro automático', c: C.green },
  ];
  const bw = (CW - 0.3 * 3) / 4;
  datos.forEach((d, i) => {
    const x = M + i * (bw + 0.3);
    card(s, x, 3.9, bw, 1.4);
    s.addText(d.t, { x, y: 4.05, w: bw, h: 0.5, fontSize: 26, bold: true, color: d.c, align: 'center', fontFace: 'Calibri' });
    s.addText(d.d, { x: x + 0.15, y: 4.58, w: bw - 0.3, h: 0.62, fontSize: 11.5, color: C.ink, align: 'center', fontFace: 'Calibri', lineSpacing: 15 });
  });

  nota(s, M, 5.55, CW, 1.1, '⚠ Lo más importante de esta guía',
    'Nunca se inicia una atención bajo el plan sin revisar el estado y la bolsa, y sin cobrar lo que le toca al tutor. Y al mismo tiempo: NUNCA se niega atención estabilizadora a un animal por un tema administrativo. Primero se estabiliza; lo administrativo se resuelve en paralelo.',
    C.red, 'FDECEA');
}

// ═════════════════════════════════════════════ CUÁNTO SE COBRA
{
  const s = content('Antes de empezar', '¿Cuánto se le cobra al tutor cada mes?',
    'Valores finales, con IVA incluido. Es lo que el tutor ve en el link y en su factura. SofVet los calcula solo: nunca escribas un monto a mano.');

  const fila = (n, etiqueta, dto) => [
    td(etiqueta, { bold: true }),
    td(dto, { align: 'center' }),
    td(cop(totalConIva(precio('urgencias', n, false))), { align: 'center' }),
    td(cop(totalConIva(precio('urgencias', n, true))), { align: 'center', bold: true, color: C.green }),
    td(cop(totalConIva(precio('total', n, false))), { align: 'center' }),
    td(cop(totalConIva(precio('total', n, true))), { align: 'center', bold: true, color: C.green }),
  ];
  const rows = [
    [th(''), th(''), { text: 'PLAN URGENCIAS', options: { bold: true, color: C.white, fill: { color: C.deep }, fontSize: 11.5, align: 'center', colspan: 2 } },
      { text: 'PLAN TOTAL', options: { bold: true, color: C.white, fill: { color: C.deep }, fontSize: 11.5, align: 'center', colspan: 2 } }],
    [th('Mascota del titular'), th('Descuento'), th('Paga mes a mes'), th('Con tarjeta (−10%)'), th('Paga mes a mes'), th('Con tarjeta (−10%)')],
    fila(0, '1ª mascota', '—'),
    fila(1, '2ª mascota', '5%'),
    fila(2, '3ª en adelante', '10%'),
  ];
  s.addTable(rows, {
    x: M, y: 1.75, w: CW, colW: [2.6, 1.45, 1.95, 1.95, 1.95, 1.93],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.5, valign: 'middle', autoPage: false,
  });

  const cw = (CW - 0.35) / 2;
  nota(s, M, 4.6, cw, 1.95, 'Por qué no es un 19% exacto',
    'El plan se factura en dos partes: la mitad es servicio (lleva IVA) y la otra mitad son insumos (no lleva IVA). Por eso el IVA queda cerca del 9,5% del valor del plan. Las tarifas publicadas ($30.000 y $70.000) son antes de IVA.',
    C.blue, 'EEF4FF');
  nota(s, M + cw + 0.35, 4.6, cw, 1.95, 'El descuento por tarjeta se suma',
    'El 10% por cobro automático se aplica encima del descuento por varias mascotas, todos los meses mientras la tarjeta siga activa. Si el tutor quita la tarjeta, desde el mes siguiente paga la tarifa completa.',
    C.green, 'EAF7EF');
}

// ═══════════════════════════════════════════════════ LOS 4 MOMENTOS
{
  const s = content('Mapa general', '¿Cuándo vas a usar este módulo?', 'Son solo 4 momentos. Los cobros de cada mes y las facturas los hace el sistema solo.');
  const momentos = [
    { n: '1', t: 'Afiliar', d: 'Cuando vendes el plan: en la clínica, o a alguien que escribió por redes.', q: 'Caja / Recepción', p: 'Págs. 5 a 8', c: C.blue },
    { n: '2', t: 'Cobrar el primer mes', d: 'Con tarjeta automática, con link de pago, o en efectivo. Sin este pago el plan NO arranca.', q: 'Caja', p: 'Págs. 9 a 14', c: C.green },
    { n: '3', t: 'Revisar antes de atender', d: 'Que esté al día, que pasó la carencia y que le quede bolsa.', q: 'Recepción', p: 'Pág. 15', c: C.amber },
    { n: '4', t: 'Registrar lo que usó', d: 'Una urgencia, un servicio programado con descuento o un beneficio preventivo.', q: 'Caja / Recepción', p: 'Págs. 16 a 20', c: C.red },
  ];
  const bw = (CW - 0.3 * 3) / 4;
  momentos.forEach((m, i) => {
    const x = M + i * (bw + 0.3);
    card(s, x, 1.75, bw, 3.45);
    s.addShape(pptx.ShapeType.ellipse, { x: x + (bw - 0.6) / 2, y: 2.0, w: 0.6, h: 0.6, fill: { color: m.c } });
    s.addText(m.n, { x: x + (bw - 0.6) / 2, y: 2.0, w: 0.6, h: 0.6, fontSize: 22, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
    s.addText(m.t, { x: x + 0.15, y: 2.72, w: bw - 0.3, h: 0.4, fontSize: 15, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri' });
    s.addText(m.d, { x: x + 0.2, y: 3.15, w: bw - 0.4, h: 1.05, fontSize: 12, color: C.ink, align: 'center', fontFace: 'Calibri', lineSpacing: 16, valign: 'top' });
    pill(s, x + (bw - 1.85) / 2, 4.3, 1.85, 0.3, m.q, C.gray, C.muted);
    s.addText(m.p, { x, y: 4.7, w: bw, h: 0.3, fontSize: 10.5, italic: true, color: m.c, align: 'center', fontFace: 'Calibri' });
  });

  nota(s, M, 5.45, CW, 1.2, 'Lo que el sistema hace solo (no tienes que hacer nada)',
    'Cobrar la tarjeta los primeros días de cada mes  ·  Activar el plan y emitir la factura en Siigo cuando entra un pago por Wompi  ·  Cambiar el estado a "En gracia", "Suspendido" o "Cancelado" cuando alguien no paga  ·  Descontar la bolsa cuando registras un consumo  ·  Reiniciar la bolsa y los beneficios cada año.',
    C.green, 'EAF7EF');
}

// ═══════════════════════════════════════════════════ CÓMO ENTRAR
{
  const s = content('Paso 0', 'Cómo entrar al módulo');

  screenFrame(s, M, 1.6, 7.4, 3.1, 'sofvetpp.netlify.app/prueba/prepagada');
  card(s, M + 0.25, 2.05, 6.9, 2.5);
  s.addText('💳 Prepagada', { x: M + 0.45, y: 2.2, w: 3, h: 0.32, fontSize: 15, bold: true, color: C.ink, fontFace: 'Calibri' });
  s.addText('23 afiliados · 14 activos · 5 en gracia · 4 suspendidos', {
    x: M + 0.45, y: 2.52, w: 4.5, h: 0.26, fontSize: 9.5, color: C.muted, fontFace: 'Calibri',
  });
  btn(s, M + 5.35, 2.2, 1.65, 0.36, '+ Afiliar mascota', C.blue);
  input(s, M + 0.45, 2.95, 3.4, 0.34, '🔍 Buscar por mascota, tutor o cédula...', { placeholder: true });

  s.addShape(pptx.ShapeType.rect, { x: M + 0.45, y: 3.45, w: 6.5, h: 0.3, fill: { color: 'F7F9FC' } });
  ['MASCOTA', 'TITULAR', 'PLAN', 'ESTADO', 'BOLSA', 'VENCE'].forEach((h, i) => {
    s.addText(h, { x: M + 0.55 + i * 1.08, y: 3.45, w: 1.05, h: 0.3, fontSize: 7, bold: true, color: C.muted, valign: 'middle', fontFace: 'Calibri' });
  });
  [['🐾 PAQUITO', 'GUILLERMO O.', 'Total', 'Activo', '$4.000.000', '31/10/26'],
    ['🐾 FIONA', 'RUBEN CUMBE', 'Urgencias', 'En gracia', '$3.150.000', '30/09/26'],
    ['🐾 LUNA', 'ANA CAMPO', 'Total', 'Pendiente de pago', '$4.000.000', '—']].forEach((r, ri) => {
    const ry = 3.8 + ri * 0.3;
    r.forEach((v, i) => {
      s.addText(v, { x: M + 0.55 + i * 1.08, y: ry, w: 1.05, h: 0.28, fontSize: 7.5, color: C.ink, valign: 'middle', fontFace: 'Calibri' });
    });
  });
  marca(s, 1, M + 6.75, 2.16);
  marca(s, 2, M + 3.6, 2.9);
  marca(s, 3, M + 6.45, 3.78);

  const px = M + 8.0, pw = CW - 8.0;
  pasos(s, px, 1.75, pw, [
    { t: 'Entra por el link directo', d: 'sofvetpp.netlify.app/prueba/prepagada\nGuárdalo en favoritos. Por ahora no aparece en el menú lateral.', h: 0.65 },
    { t: 'Busca al afiliado', d: 'Por nombre de la mascota, nombre del tutor o cédula. Lo más seguro: la cédula.' },
    { t: 'Haz clic en la fila', d: 'Abre la ficha del afiliado. Ahí está TODO: cobros, factura, bolsa, beneficios y consumos.', h: 0.65 },
  ], { gap: 0.18 });

  nota(s, M, 5.0, 7.4, 1.0, 'Si no te carga', 'Recarga con Ctrl + Shift + R. Si sigue sin cargar, avisa a gerencia antes de decirle al tutor que no tiene plan.', C.blue, 'EEF4FF');
}

// ═══════════════════════════════════ PASO 1 — AFILIAR (CLIENTE EXISTENTE)
{
  const s = content('Paso 1 · Afiliar', 'Afiliar a un cliente que YA está en SofVet');

  screenFrame(s, M, 1.65, 6.6, 4.3);
  card(s, M + 0.5, 1.95, 5.6, 3.75);
  s.addText('Afiliar mascota', { x: M + 0.7, y: 1.95, w: 3, h: 0.45, fontSize: 13, bold: true, color: C.blue, valign: 'middle', fontFace: 'Calibri' });
  s.addText('×', { x: M + 5.6, y: 1.95, w: 0.35, h: 0.45, fontSize: 14, color: C.muted, align: 'center', valign: 'middle', fontFace: 'Calibri' });
  s.addShape(pptx.ShapeType.line, { x: M + 0.5, y: 2.4, w: 5.6, h: 0, line: { color: C.softGray, width: 1 } });

  label(s, M + 0.75, 2.55, 4, 'Buscar cliente (nombre o cédula)');
  input(s, M + 0.75, 2.78, 5.1, 0.38, 'Ana Campo', { focus: true });

  [['ANA CAMPO MEJIA', 'CC 1144067890'], ['ANA MARÍA CAMPO', 'CC 31998210']].forEach((r, i) => {
    const ry = 3.28 + i * 0.52;
    s.addShape(pptx.ShapeType.roundRect, { x: M + 0.75, y: ry, w: 5.1, h: 0.45, rectRadius: 0.05, fill: { color: C.gray }, line: { color: C.softGray, width: 0.75 } });
    s.addText(r[0], { x: M + 0.9, y: ry + 0.04, w: 4, h: 0.22, fontSize: 10, bold: true, color: C.ink, fontFace: 'Calibri' });
    s.addText(r[1], { x: M + 0.9, y: ry + 0.24, w: 4, h: 0.18, fontSize: 8, color: C.muted, fontFace: 'Calibri' });
  });

  btn(s, M + 0.75, 4.42, 5.1, 0.42, '+ Crear cliente nuevo', C.white, C.blue, { borderColor: C.blue, dash: true, fontSize: 10 });

  marca(s, 1, M + 5.5, 2.72);
  marca(s, 2, M + 5.5, 3.3);
  marca(s, 3, M + 5.5, 4.4);

  const px = M + 7.2, pw = CW - 7.2;
  pasos(s, px, 1.8, pw, [
    { t: 'Clic en "+ Afiliar mascota"', d: 'Botón verde arriba a la derecha. Escribe el nombre o la cédula: con 2 letras ya busca, en TODOS los clientes de SofVet de cualquier sede.' },
    { t: 'Selecciona al cliente correcto', d: 'Verifica la cédula, no solo el nombre: hay nombres repetidos. Si te equivocas, luego le das "Cambiar".' },
    { t: 'Si no aparece, es cliente nuevo', d: 'Usa "+ Crear cliente nuevo" y sigue la página siguiente.' },
  ], { descH: 0.78, gap: 0.14 });

  nota(s, px, 5.65, pw, 0.9, 'Ojo', 'Si el cliente aparece pero su mascota no, puedes registrarla sin salir de aquí (pág. 7).', C.amber);
}

// ═══════════════════════════════════ PASO 1B — CLIENTE NUEVO
{
  const s = content('Paso 1 · Afiliar', 'Si el cliente NO existe todavía', 'Típico de alguien que escribió por Instagram o WhatsApp y nunca ha venido.');

  screenFrame(s, M, 1.75, 6.6, 4.5);
  card(s, M + 0.5, 2.0, 5.6, 4.05);
  s.addText('Cliente nuevo', { x: M + 0.7, y: 2.1, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.blue, fontFace: 'Calibri' });
  s.addText('← Volver a buscar', { x: M + 4.3, y: 2.1, w: 1.6, h: 0.3, fontSize: 8.5, bold: true, color: C.muted, align: 'right', fontFace: 'Calibri' });

  label(s, M + 0.7, 2.5, 3, 'Nombre completo *');
  input(s, M + 0.7, 2.7, 5.2, 0.34, 'MARCELA RIOS GÓMEZ');
  label(s, M + 0.7, 3.12, 2, 'Cédula *');
  input(s, M + 0.7, 3.32, 2.5, 0.34, '1144556677');
  label(s, M + 3.4, 3.12, 2, 'Teléfono *');
  input(s, M + 3.4, 3.32, 2.5, 0.34, '3155551234');
  label(s, M + 0.7, 3.74, 3, 'Correo');
  input(s, M + 0.7, 3.94, 5.2, 0.34, 'marcela@email.com');
  label(s, M + 0.7, 4.36, 3, '¿Cómo nos conoció? *');
  input(s, M + 0.7, 4.56, 5.2, 0.34, 'Instagram/Facebook/TikTok   ▾');
  btn(s, M + 0.7, 5.1, 5.2, 0.42, 'Crear cliente y continuar', C.blue);

  marca(s, 1, M + 5.55, 2.66);
  marca(s, 2, M + 5.55, 3.9);
  marca(s, 3, M + 5.55, 5.07);

  const px = M + 7.2, pw = CW - 7.2;
  pasos(s, px, 1.9, pw, [
    { t: 'Llena nombre, cédula y teléfono', d: 'Son obligatorios. La cédula es la llave para encontrarlo después y para que entre al portal.' },
    { t: 'Pon el CORREO aunque no sea obligatorio', d: 'Ahí le llegan las facturas electrónicas de cada mes. Sin correo, el tutor no recibe su factura.' },
    { t: '"¿Cómo nos conoció?" y continuar', d: 'Sirve para saber qué canal de venta funciona. Luego dale "Crear cliente y continuar".' },
  ], { descH: 0.72, gap: 0.14 });

  nota(s, px, 5.55, pw, 1.0, 'Antes de crear, busca bien', 'Si ya existe con otra escritura del nombre y lo creas de nuevo, quedan dos fichas del mismo tutor. El sistema te avisa si la cédula ya existe.', C.red, 'FDECEA');
}

// ═══════════════════════════════════ PASO 1C — PLAN Y CONFIRMAR
{
  const s = content('Paso 1 · Afiliar', 'Elegir la mascota, el plan y confirmar');

  screenFrame(s, M, 1.55, 6.6, 4.6);
  card(s, M + 0.5, 1.8, 5.6, 4.15);

  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.7, y: 1.95, w: 5.2, h: 0.45, rectRadius: 0.05, fill: { color: 'EEF6F6' }, line: { color: 'BFE0E0', width: 1 } });
  s.addText('ANA CAMPO MEJIA', { x: M + 0.85, y: 1.99, w: 3, h: 0.22, fontSize: 10, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText('CC 1144067890', { x: M + 0.85, y: 2.19, w: 3, h: 0.18, fontSize: 8, color: C.muted, fontFace: 'Calibri' });
  s.addText('Cambiar', { x: M + 5.1, y: 1.95, w: 0.7, h: 0.45, fontSize: 8.5, bold: true, color: C.blue, align: 'right', valign: 'middle', fontFace: 'Calibri' });

  label(s, M + 0.7, 2.52, 2, 'Mascota');
  btn(s, M + 0.7, 2.72, 5.2, 0.36, '🐾 LUNA — Perro', C.blue, C.white, { fontSize: 10 });
  btn(s, M + 0.7, 3.14, 5.2, 0.36, '🐾 MICHI — Gato', C.gray, C.ink, { borderColor: C.softGray, fontSize: 10 });
  btn(s, M + 0.7, 3.56, 5.2, 0.34, '+ Registrar mascota nueva', C.white, C.blue, { borderColor: C.blue, dash: true, fontSize: 9 });

  label(s, M + 0.7, 4.02, 2, 'Plan');
  btn(s, M + 0.7, 4.22, 2.5, 0.42, 'Urgencias', C.white, C.ink, { borderColor: C.border, fontSize: 11 });
  btn(s, M + 3.4, 4.22, 2.5, 0.42, 'Total', C.blue, C.white, { fontSize: 11 });

  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.7, y: 4.78, w: 5.2, h: 0.62, rectRadius: 0.05, fill: { color: 'FFF8E1' }, line: { color: 'F0D98C', width: 1 } });
  s.addText('PRECIO MENSUAL (MASCOTA #2 DEL TITULAR)', { x: M + 0.85, y: 4.82, w: 4.9, h: 0.2, fontSize: 7, bold: true, color: C.gold, fontFace: 'Calibri' });
  s.addText('$ 66.500', { x: M + 0.85, y: 5.0, w: 4.9, h: 0.34, fontSize: 17, bold: true, color: C.ink, fontFace: 'Calibri' });

  btn(s, M + 0.7, 5.5, 5.2, 0.38, 'Afiliar', C.blue);

  marca(s, 1, M + 5.55, 2.68);
  marca(s, 2, M + 5.55, 4.18);
  marca(s, 3, M + 5.55, 5.46);

  const px = M + 7.2, pw = CW - 7.2;
  pasos(s, px, 1.7, pw, [
    { t: 'Elige la mascota', d: 'Cada afiliación cubre UNA sola mascota. Si quiere afiliar dos, se hacen dos afiliaciones. Si la mascota no está, "+ Registrar mascota nueva".', h: 0.8 },
    { t: 'Elige el plan: Urgencias o Total', d: 'Explícale la diferencia ANTES (pág. 1). El Plan Total es el que incluye consultas, vacunas y descuentos.' },
    { t: 'Revisa el precio y dale "Afiliar"', d: 'El precio sale solo, ANTES de IVA. Si el tutor ya tiene otra mascota afiliada, el descuento se aplica solo.' },
  ], { descH: 0.62, gap: 0.12 });

  nota(s, px, 5.15, pw, 1.4, 'Queda en "Pendiente de pago"',
    'Después de "Afiliar" se abre la ficha del afiliado con la etiqueta naranja "Pendiente de pago". Todavía NO tiene cobertura: se activa cuando entra el primer pago. Sigue de una vez con el paso 2 (pág. 9).',
    C.orange, C.orangeBg);
}

// ═══════════════════════════════════ EXAMEN INICIAL OBLIGATORIO
{
  const s = content('Paso 1 · Afiliar', 'El examen inicial es obligatorio y GRATIS',
    'Es lo que protege el plan de que se afilien mascotas que ya vienen enfermas. Sin él, la cobertura puede negarse.');

  const cw = (CW - 0.4) / 2;
  card(s, M, 1.75, cw, 2.55, C.cream);
  s.addText('LA REGLA', { x: M + 0.35, y: 1.92, w: cw - 0.7, h: 0.28, fontSize: 10.5, bold: true, color: C.brown, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText(bullets([
    'Examen clínico completo hecho por un veterinario de P&P',
    'Dentro de los 30 días siguientes a la afiliación',
    'NO tiene costo para el tutor',
    'Si no se hace a tiempo, la cobertura se puede reducir o negar',
  ]), { x: M + 0.35, y: 2.25, w: cw - 0.7, h: 1.95, fontFace: 'Calibri', lineSpacing: 18, valign: 'top' });

  card(s, M + cw + 0.4, 1.75, cw, 2.55, 'FDECEA');
  s.addText('LO QUE APAREZCA AHÍ, QUEDA EXCLUIDO', { x: M + cw + 0.75, y: 1.92, w: cw - 0.7, h: 0.28, fontSize: 10.5, bold: true, color: C.red, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText('Toda enfermedad, signo clínico o condición que el veterinario encuentre en ese examen queda por fuera de la cobertura, y también todo lo que se derive de ella.\n\nPor eso hay que explicárselo al tutor ANTES de que pague, no después.', {
    x: M + cw + 0.75, y: 2.25, w: cw - 0.7, h: 1.95, fontSize: 12, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  s.addText('Cómo se lo explicas al tutor:', { x: M, y: 4.48, w: CW, h: 0.3, fontSize: 13, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 4.82, w: CW, h: 1.0, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.blue, width: 1.25 } });
  s.addText('"Para que el plan quede bien, en este primer mes le hacemos un chequeo completo, sin costo. Sirve para dejar por escrito cómo está hoy tu mascota: lo que ya tenga desde antes no entra en el plan, pero todo lo que le pase de aquí en adelante sí."', {
    x: M + 0.35, y: 4.92, w: CW - 0.7, h: 0.8, fontSize: 12.5, italic: true, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'middle',
  });

  nota(s, M, 6.0, CW, 0.85, 'Agéndalo de una vez', 'Antes de que el tutor se vaya, déjale la cita del examen agendada en la Agenda (/appointments). Si se va sin cita, casi nunca vuelve a tiempo.', C.green, 'EAF7EF');
}

// ═══════════════════════════════════ PASO 2 — CÓMO VA A PAGAR
{
  const s = content('Paso 2 · Cobrar el primer mes', '¿Cómo va a pagar el tutor?',
    'Hay 3 formas. Pregúntale y sigue la página que corresponda. Ofrece SIEMPRE primero la opción A.');

  const ops = [
    { l: 'A', t: 'Tarjeta con cobro automático', tag: 'RECOMENDADA', d: [
      'Paga 10% menos, todos los meses',
      'Registra la tarjeta en SU celular, con un enlace',
      'Desde el 2º mes se cobra solo',
    ], b: ['💳 Link de tarjeta', '⚡ Cobrar ahora'], bc: C.purple, bbg: C.purpleBg, c: C.green, pg: 'Págs. 10 y 11' },
    { l: 'B', t: 'Link de pago (mes a mes)', tag: '', d: [
      'Paga con tarjeta, Nequi, PSE, QR…',
      'Paga la tarifa completa, sin el 10%',
      'Cada mes hay que mandarle un link nuevo',
    ], b: ['💳 Generar link · $…'], bc: C.linkBlue, bbg: C.linkBg, c: C.linkBlue, pg: 'Pág. 12' },
    { l: 'C', t: 'Efectivo o transferencia en caja', tag: '', d: [
      'Paga en el mostrador',
      'Tú activas el plan y emites la factura',
      'Cada mes tiene que volver a pagar',
    ], b: ['✅ Marcar pagado', '🧾 Facturar'], bc: C.green, bbg: 'EAFAF0', c: C.amber, pg: 'Pág. 13' },
  ];
  const bw = (CW - 0.35 * 2) / 3;
  ops.forEach((o, i) => {
    const x = M + i * (bw + 0.35);
    card(s, x, 1.8, bw, 3.75, i === 0 ? 'F2FAF5' : C.white);
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.3, y: 2.0, w: 0.6, h: 0.6, fill: { color: o.c } });
    s.addText(o.l, { x: x + 0.3, y: 2.0, w: 0.6, h: 0.6, fontSize: 24, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
    if (o.tag) pill(s, x + bw - 1.55, 2.12, 1.3, 0.28, o.tag, C.green, C.white);
    s.addText(o.t, { x: x + 0.3, y: 2.72, w: bw - 0.6, h: 0.4, fontSize: 15, bold: true, color: C.deep, fontFace: 'Calibri' });
    s.addText(bullets(o.d, 12), { x: x + 0.3, y: 3.15, w: bw - 0.6, h: 1.2, fontFace: 'Calibri', lineSpacing: 17, valign: 'top' });
    s.addText('BOTONES', { x: x + 0.3, y: 4.38, w: 2, h: 0.2, fontSize: 8, bold: true, color: C.muted, charSpacing: 1, fontFace: 'Calibri' });
    let bx = x + 0.3;
    o.b.forEach((t, bi) => {
      const ww = (bw - 0.6 - 0.25 * (o.b.length - 1)) / o.b.length;
      btn(s, bx, 4.62, ww, 0.38, t, o.bbg, o.bc, { borderColor: o.bc, fontSize: 9.5 });
      if (bi < o.b.length - 1) s.addText('→', { x: bx + ww, y: 4.62, w: 0.25, h: 0.38, fontSize: 12, bold: true, color: C.muted, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
      bx += ww + 0.25;
    });
    s.addText(o.pg, { x: x + 0.3, y: 5.1, w: bw - 0.6, h: 0.3, fontSize: 11, italic: true, bold: true, color: o.c, fontFace: 'Calibri' });
  });

  nota(s, M, 5.8, CW, 0.85, 'Cómo se lo ofreces',
    '"Si dejas tu tarjeta registrada, te descontamos el 10% todos los meses y no tienes que estar pendiente de pagar. La registras tú mismo desde tu celular; nosotros nunca vemos los números."',
    C.green, 'EAF7EF');
}

// ═══════════════════════════════════ OPCIÓN A (1/2) — LINK DE TARJETA
{
  const s = content('Paso 2 · Opción A · Tarjeta', 'Mandarle al tutor el enlace para registrar su tarjeta (1 de 2)');

  screenFrame(s, M, 1.55, 8.0, 2.55, 'Ficha del afiliado');
  card(s, M + 0.2, 1.95, 7.6, 1.95);
  const pos = fichaHeader(s, M + 0.35, 2.05, {
    mascota: 'LUNA', estado: 'pendiente', plan: 'Total', w: 7.2, monto: '$72.827',
    linea: 'Titular: ANA CAMPO · $66.500/mes · Vence —',
    facturarGris: true,
  });
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.35, y: 3.15, w: 7.3, h: 0.6, rectRadius: 0.06, fill: { color: C.purpleBg }, line: { color: C.purple, width: 1 } });
  s.addText('Enlace de tarjeta:', { x: M + 0.48, y: 3.15, w: 1.3, h: 0.4, fontSize: 9, bold: true, color: C.purple, valign: 'middle', fontFace: 'Calibri', margin: 0 });
  s.addText('sofvetpp.netlify.app/tarjeta/8f3a91c0…', { x: M + 1.8, y: 3.15, w: 4.4, h: 0.4, fontSize: 9, color: C.purple, valign: 'middle', fontFace: 'Calibri', margin: 0 });
  btn(s, M + 6.75, 3.22, 0.8, 0.3, 'Copiar', C.purple, C.white, { fontSize: 9 });
  s.addText('Sirve una sola vez y vence en 48 horas.', { x: M + 0.48, y: 3.5, w: 5, h: 0.22, fontSize: 8, color: C.purple, fontFace: 'Calibri', margin: 0 });

  marca(s, 1, pos.tarjeta.x + pos.tarjeta.w - 0.2, pos.tarjeta.y - 0.24);
  marca(s, 2, M + 7.4, 2.98);

  const px = M + 8.4, pw = CW - 8.4;
  pasos(s, px, 1.55, pw, [
    { t: 'Clic en "💳 Link de tarjeta"', d: 'Aparece el recuadro morado y el enlace queda copiado solo.' },
    { t: 'Pégalo en WhatsApp al tutor', d: 'Si no se copió, dale "Copiar". Sirve UNA vez y vence en 48 horas.' },
    { t: 'Espera a que te diga "¡Listo!"', d: 'Él abre el enlace en su celular y registra la tarjeta (página siguiente).' },
  ], { descH: 0.5, gap: 0.1 });

  nota(s, M, 4.35, 8.0, 1.15, 'Nunca le pidas los datos de la tarjeta',
    'Ni el número, ni la fecha, ni el código de atrás: ni por WhatsApp, ni en voz alta, ni escritos en papel. La tarjeta la escribe el tutor en su celular, en la página de Wompi. Nosotros nunca vemos ni guardamos esos datos.',
    C.red, 'FDECEA');

  nota(s, M, 5.7, 8.0, 0.95, 'Si el tutor está en la clínica',
    'Mándale el enlace a su WhatsApp ahí mismo y que lo haga desde su celular frente a ti. Toma un minuto.',
    C.blue, 'EEF4FF');

  nota(s, px, 4.65, pw, 2.0, '¿Ya tenía tarjeta?',
    'Si el tutor ya registró una tarjeta antes, el botón dice "💳 Cambiar tarjeta" (en verde). Sirve para lo mismo: el enlace nuevo reemplaza la tarjeta vieja.\n\nÚsalo cuando le rechacen la tarjeta o cuando cambie de banco.',
    C.green, 'EAF7EF');
}

// ═══════════════════════════════════ OPCIÓN A (2/2) — COBRAR AHORA
{
  const s = content('Paso 2 · Opción A · Tarjeta', 'Lo que ve el tutor, y cómo cobras el primer mes (2 de 2)');

  // Celular del tutor
  phoneFrame(s, M, 1.5, 2.9, 5.15);
  const cx = M + 0.25, cw = 2.4;
  s.addText('Pets & Pets', { x: cx, y: 1.95, w: cw, h: 0.25, fontSize: 10, bold: true, color: C.blue, align: 'center', fontFace: 'Calibri' });
  s.addText('Plan Total de LUNA', { x: cx, y: 2.22, w: cw, h: 0.3, fontSize: 12, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri' });
  s.addText('Paga 10% menos, todos los meses', { x: cx, y: 2.5, w: cw, h: 0.22, fontSize: 8.5, color: C.muted, align: 'center', fontFace: 'Calibri' });
  s.addText([
    { text: cop(totalConIva(66500)) + '  ', options: { fontSize: 9, strike: 'sngStrike', color: C.muted } },
    { text: cop(totalConIva(59850)), options: { fontSize: 15, bold: true, color: C.green } },
    { text: ' / mes', options: { fontSize: 8, color: C.muted } },
  ], { x: cx, y: 2.8, w: cw, h: 0.4, align: 'center', fontFace: 'Calibri' });
  s.addText('Tu plan se cobra solo cada mes y no tienes que estar pendiente.', { x: cx + 0.1, y: 3.25, w: cw - 0.2, h: 0.5, fontSize: 8, color: C.muted, align: 'center', fontFace: 'Calibri' });
  btn(s, cx + 0.1, 3.85, cw - 0.2, 0.42, '💳 Registrar mi tarjeta', C.blue, C.white, { fontSize: 10 });
  s.addText('🔒 Los datos los pide Wompi directamente.', { x: cx, y: 4.32, w: cw, h: 0.3, fontSize: 7.5, color: C.muted, align: 'center', fontFace: 'Calibri' });
  s.addShape(pptx.ShapeType.line, { x: cx + 0.2, y: 4.75, w: cw - 0.4, h: 0, line: { color: C.softGray, width: 1, dashType: 'dash' } });
  s.addText('Al terminar le sale:', { x: cx, y: 4.85, w: cw, h: 0.22, fontSize: 8, italic: true, color: C.muted, align: 'center', fontFace: 'Calibri' });
  s.addText('¡Listo!', { x: cx, y: 5.1, w: cw, h: 0.35, fontSize: 16, bold: true, color: C.green, align: 'center', fontFace: 'Calibri' });
  s.addText('Visa •••• 4242\nSe cobrará solo cada mes, con 10% de descuento.', { x: cx + 0.1, y: 5.45, w: cw - 0.2, h: 0.6, fontSize: 8, color: C.ink, align: 'center', fontFace: 'Calibri' });

  // Ficha con el botón Cobrar ahora
  const fx = M + 3.3, fw = CW - 3.3;
  screenFrame(s, fx, 1.5, fw, 1.75, 'Tu pantalla, después de que el tutor registró la tarjeta');
  const pos = fichaHeader(s, fx + 0.2, 1.95, {
    mascota: 'LUNA', estado: 'pendiente', plan: 'Total', w: fw - 0.4, monto: '$65.531',
    linea: 'Titular: ANA CAMPO MEJIA · $66.500  $59.850/mes (−10% por tarjeta) · Vence —',
    conTarjeta: true, cobrarAhora: true, facturarGris: true,
  });
  marca(s, 4, pos.recargar.x + 0.04, pos.recargar.y - 0.3);
  marca(s, 5, pos.cobrar.x + pos.cobrar.w - 0.2, pos.cobrar.y - 0.3);

  pasos(s, fx, 3.5, fw, [
    { t: 'Dale "↻" (recargar) cuando el tutor te diga "¡Listo!"', d: 'Aparecen el precio con −10% y el botón morado "⚡ Cobrar ahora".', h: 0.32 },
    { t: 'Clic en "⚡ Cobrar ahora" y luego "Aceptar"', d: 'Te muestra el valor exacto que se le va a cobrar. Revísalo con el tutor y acepta.', h: 0.32 },
    { t: 'Espera unos 10 segundos', d: 'La ficha se recarga sola: pasa a "Activo", aparece la fecha de "Vence" y la factura (pág. 14).', h: 0.32 },
  ], { start: 4, gap: 0.12 });

  nota(s, fx, 5.75, fw, 0.9, 'Solo el primer mes',
    '"⚡ Cobrar ahora" aparece únicamente para el primer cobro. Del 2º mes en adelante la tarjeta se cobra sola los primeros días de cada mes, y la factura le llega al correo.',
    C.purple, C.purpleBg);
}

// ═══════════════════════════════════ OPCIÓN B — LINK DE PAGO
{
  const s = content('Paso 2 · Opción B · Link de pago', 'Cobrar con un link de pago de Wompi');

  screenFrame(s, M, 1.55, 8.0, 2.55, 'Ficha del afiliado');
  card(s, M + 0.2, 1.95, 7.6, 1.95);
  const pos = fichaHeader(s, M + 0.35, 2.05, {
    mascota: 'LUNA', estado: 'pendiente', plan: 'Total', w: 7.2, monto: '$72.827',
    linea: 'Titular: ANA CAMPO',
    facturarGris: true,
  });
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.35, y: 3.15, w: 7.3, h: 0.55, rectRadius: 0.06, fill: { color: C.linkBg }, line: { color: C.linkBlue, width: 1 } });
  s.addText('Link por 1 mes · $72.827', { x: M + 0.48, y: 3.15, w: 1.9, h: 0.55, fontSize: 9, bold: true, color: C.linkBlue, valign: 'middle', fontFace: 'Calibri', margin: 0 });
  s.addText('checkout.wompi.co/l/xYz12…', { x: M + 2.4, y: 3.15, w: 3.6, h: 0.55, fontSize: 9, color: C.linkBlue, valign: 'middle', fontFace: 'Calibri', margin: 0 });
  btn(s, M + 6.75, 3.27, 0.8, 0.3, 'Copiar', C.linkBlue, C.white, { fontSize: 9 });

  marca(s, 1, pos.link.x + pos.link.w - 0.2, pos.link.y - 0.24);
  marca(s, 2, M + 7.4, 2.98);

  const px = M + 8.4, pw = CW - 8.4;
  pasos(s, px, 1.6, pw, [
    { t: 'Clic en "💳 Generar link · $…"', d: 'El botón ya muestra el valor exacto, con IVA. No escribes ningún monto.' },
    { t: 'Dale "Copiar" y mándalo', d: 'Por WhatsApp o correo, o que lo abra ahí mismo en su celular.' },
    { t: 'El tutor paga', d: 'El plan se activa y se factura solo. No tienes que hacer nada más.' },
  ], { descH: 0.5, gap: 0.1 });

  card(s, M, 4.35, 3.9, 2.3, C.cream);
  s.addText('El tutor puede pagar con:', { x: M + 0.3, y: 4.5, w: 3.4, h: 0.3, fontSize: 13, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText(bullets(['Tarjeta débito o crédito', 'Nequi', 'DaviPlata', 'QR de su banco', 'Bancolombia / PSE'], 12),
    { x: M + 0.3, y: 4.85, w: 3.4, h: 1.7, fontFace: 'Calibri', lineSpacing: 17, valign: 'top' });

  nota(s, M + 4.2, 4.35, 3.8, 2.3, 'Cómo confirmo que pagó',
    'Mientras el link esté abierto, la ficha se actualiza sola cada 15 segundos. Cuando entra el pago pasa a "Activo" y aparece "Última factura". Si tienes afán, dale "↻".',
    C.green, 'EAF7EF');

  nota(s, px, 4.65, pw, 2.0, 'El link es por UN mes',
    'Cada mes hay que mandarle un link nuevo, o que el tutor pague solo desde su portal (pág. 24). Por eso conviene más la opción A: con la tarjeta no hay que perseguir a nadie.',
    C.amber);
}

// ═══════════════════════════════════ OPCIÓN C — EFECTIVO
{
  const s = content('Paso 2 · Opción C · En caja', 'Si el tutor paga en efectivo o transferencia directa');

  const cw = (CW - 0.4) / 2;
  card(s, M, 1.5, cw, 2.15, C.cream);
  s.addText('Cuándo usar "✅ Marcar pagado"', { x: M + 0.35, y: 1.65, w: cw - 0.7, h: 0.35, fontSize: 15, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText(bullets([
    'El tutor pagó en efectivo en la caja',
    'Hizo una transferencia directa y YA la viste reflejada',
    'La pasarela falló y ya confirmaste el pago por otro medio',
  ], 12, '2713'), { x: M + 0.35, y: 2.05, w: cw - 0.7, h: 1.5, fontFace: 'Calibri', lineSpacing: 17, valign: 'top' });

  card(s, M + cw + 0.4, 1.5, cw, 2.15, 'FDECEA');
  s.addText('Cuándo NO usarlo', { x: M + cw + 0.75, y: 1.65, w: cw - 0.7, h: 0.35, fontSize: 15, bold: true, color: C.red, fontFace: 'Calibri' });
  s.addText(bullets([
    'El tutor "dijo" que pagó pero no lo confirmaste',
    'Para darle unos días mientras consigue la plata',
    'Para un pago con link o tarjeta: esos entran solos',
  ], 12, '2715'), { x: M + cw + 0.75, y: 2.05, w: cw - 0.7, h: 1.5, fontFace: 'Calibri', lineSpacing: 17, valign: 'top' });

  s.addText('En este orden:', { x: M, y: 3.85, w: CW, h: 0.32, fontSize: 14, bold: true, color: C.deep, fontFace: 'Calibri' });
  const bw = (CW - 0.35 * 2) / 3;
  [
    { n: '1', t: 'Cobra el valor con IVA', d: 'Usa la tabla de la pág. 2 (columna "Paga mes a mes"). Es el mismo valor que muestra el botón "Generar link".', c: C.blue },
    { n: '2', t: 'Clic en "✅ Marcar pagado"', d: 'El plan pasa a "Activo" y corre el vencimiento un mes. Acepta la confirmación.', c: C.green },
    { n: '3', t: 'Clic en "🧾 Facturar"', d: 'Emite la factura electrónica en Siigo y le llega al correo del tutor. Revisa el valor y acepta.', c: C.gold },
  ].forEach((it, i) => {
    const x = M + i * (bw + 0.35);
    card(s, x, 4.25, bw, 1.45);
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.2, y: 4.4, w: 0.42, h: 0.42, fill: { color: it.c } });
    s.addText(it.n, { x: x + 0.2, y: 4.4, w: 0.42, h: 0.42, fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
    s.addText(it.t, { x: x + 0.75, y: 4.4, w: bw - 0.95, h: 0.42, fontSize: 13, bold: true, color: C.deep, valign: 'middle', fontFace: 'Calibri' });
    s.addText(it.d, { x: x + 0.2, y: 4.9, w: bw - 0.4, h: 0.75, fontSize: 11.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 15, valign: 'top' });
  });

  nota(s, M, 5.9, CW, 0.8, 'Nunca le des "Facturar" a un pago por link o tarjeta',
    'Esos se facturan solos: el botón aparece en gris como "🧾 Ya facturado". Si insistes, sale una SEGUNDA factura ante la DIAN y solo se deshace con nota crédito.',
    C.red, 'FDECEA');
}

// ═══════════════════════════════════ CÓMO SÉ QUE ENTRÓ EL PAGO
{
  const s = content('Paso 2 · Confirmar', '¿Cómo sé que el pago entró y quedó facturado?');

  screenFrame(s, M, 1.5, 7.6, 2.55, 'Así se ve la ficha cuando todo salió bien');
  card(s, M + 0.2, 1.9, 7.2, 1.95);
  const pos = fichaHeader(s, M + 0.35, 2.0, {
    mascota: 'LUNA', estado: 'activo', plan: 'Total', w: 6.9, monto: '$65.531',
    linea: 'Titular: ANA CAMPO MEJIA · $59.850/mes (−10% por tarjeta) · Afiliado desde 2026-10-05 · Vence 2026-10-31',
    conTarjeta: true, yaFacturado: true,
  });
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.35, y: 3.1, w: 6.9, h: 0.5, rectRadius: 0.06, fill: { color: C.goldBg }, line: { color: C.gold, width: 1 } });
  s.addText([
    { text: '🧾 Última factura: FED-4311 · 2026-10-05 · ', options: { color: C.gold, bold: true } },
    { text: 'Ver factura', options: { color: C.gold, bold: true, underline: { style: 'sng' } } },
  ], { x: M + 0.5, y: 3.1, w: 6.6, h: 0.5, fontSize: 9.5, valign: 'middle', fontFace: 'Calibri', margin: 0 });

  marca(s, 1, M + 2.05, 1.72);
  marca(s, 2, M + 5.55, 2.0);
  marca(s, 3, M + 7.0, 2.95);

  const px = M + 8.0, pw = CW - 8.0;
  pasos(s, px, 1.55, pw, [
    { t: 'La etiqueta dice "Activo"', d: 'En verde. Ya tiene cobertura.' },
    { t: '"Vence" tiene fecha', d: 'Siempre el último día del mes. Si se afilió del 16 en adelante, el resto del mes va de regalo y vence a fin del mes siguiente.', h: 0.85 },
    { t: 'Aparece "Última factura"', d: 'Con su número. "Ver factura" la abre. Al tutor le llega sola al correo.' },
  ], { descH: 0.48, gap: 0.12 });

  s.addText('Si algo no sale como debe:', { x: M, y: 4.3, w: CW, h: 0.3, fontSize: 13.5, bold: true, color: C.deep, fontFace: 'Calibri' });
  const rows = [
    [th('Lo que ves'), th('Qué hacer')],
    [td('Sigue en "Pendiente de pago" después de 1 minuto', { bold: true }), td('Dale "↻". Si sigue igual, pregúntale al tutor si el pago le salió aprobado. Si a él le salió rechazado, prueba otra tarjeta o la opción B.')],
    [td('Mensaje rojo: tarjeta rechazada / fondos insuficientes', { bold: true, color: C.red }), td('El cobro no pasó. Mándale "💳 Cambiar tarjeta" para que registre otra, o cóbrale con link o en caja.')],
    [td('Mensaje "Ya se cobró hoy"', { bold: true }), td('Ya hubo un cobro hoy a esa tarjeta. NO insistas: dale "↻" y espera. Si no se activa, avisa a gerencia.')],
    [td('Activo, pero sin "Última factura"', { bold: true }), td('El plan quedó bien; falló solo la factura. Avisa a gerencia. NO le des "Facturar" a un pago por Wompi.')],
  ];
  s.addTable(rows, {
    x: M, y: 4.65, w: CW, colW: [4.0, 7.83],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.42, valign: 'middle', autoPage: false, fontSize: 11,
  });
}

// ═══════════════════════════════════ PASO 3 — REVISAR ESTADO Y BOLSA
{
  const s = content('Paso 3 · Revisar', 'Revisar el estado y la bolsa antes de atender');

  screenFrame(s, M, 1.5, 7.3, 4.75);
  card(s, M + 0.3, 1.8, 6.7, 4.3);

  s.addText('🐾 LUNA', { x: M + 0.5, y: 1.95, w: 1.5, h: 0.3, fontSize: 14, bold: true, color: C.ink, fontFace: 'Calibri' });
  pill(s, M + 1.75, 2.0, 0.75, 0.22, 'Activo', 'EAFAF0', C.green);
  pill(s, M + 2.6, 2.0, 0.85, 0.22, 'Plan Total', 'EEF6F6', C.deep);
  s.addText('Titular: ANA CAMPO · $59.850/mes · Afiliado desde 2026-10-05 · Vence 2026-10-31', {
    x: M + 0.5, y: 2.27, w: 6.3, h: 0.22, fontSize: 8.5, color: C.muted, fontFace: 'Calibri',
  });

  card(s, M + 0.5, 2.62, 6.3, 0.85);
  s.addText('BOLSA ANUAL 2026 — URGENCIAS Y SERVICIOS PROGRAMADOS', { x: M + 0.65, y: 2.72, w: 3.9, h: 0.22, fontSize: 7.5, bold: true, color: '5C6470', fontFace: 'Calibri' });
  s.addText('$2.920.000 disponibles de $4.000.000', { x: M + 4.5, y: 2.72, w: 2.2, h: 0.22, fontSize: 8, bold: true, color: C.ink, align: 'right', fontFace: 'Calibri' });
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.65, y: 3.02, w: 6.0, h: 0.16, rectRadius: 0.08, fill: { color: C.softGray } });
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.65, y: 3.02, w: 1.62, h: 0.16, rectRadius: 0.08, fill: { color: C.blue } });

  card(s, M + 0.5, 3.6, 6.3, 1.55);
  s.addText('BENEFICIOS PREVENTIVOS 2026', { x: M + 0.65, y: 3.69, w: 3, h: 0.22, fontSize: 8, bold: true, color: '5C6470', fontFace: 'Calibri' });
  [['Consultas médicas', '3/12'], ['Vacunas anuales', '1/1 AGOTADO'], ['Desparasitaciones', '1/4']].forEach((r, i) => {
    const ry = 3.96 + i * 0.38;
    const agot = r[1].includes('AGOTADO');
    s.addShape(pptx.ShapeType.roundRect, { x: M + 0.65, y: ry, w: 6.0, h: 0.32, rectRadius: 0.05, fill: { color: agot ? 'FDECEA' : C.gray } });
    s.addText(r[0], { x: M + 0.8, y: ry, w: 3, h: 0.32, fontSize: 9, bold: true, color: C.ink, valign: 'middle', fontFace: 'Calibri' });
    s.addText(r[1], { x: M + 4.3, y: ry, w: 1.5, h: 0.32, fontSize: 9, bold: true, color: agot ? C.red : C.ink, align: 'right', valign: 'middle', fontFace: 'Calibri' });
    s.addShape(pptx.ShapeType.ellipse, { x: M + 5.95, y: ry + 0.05, w: 0.22, h: 0.22, fill: { color: C.white }, line: { color: C.border, width: 0.75 } });
    s.addText('−', { x: M + 5.95, y: ry + 0.05, w: 0.22, h: 0.22, fontSize: 9, color: C.ink, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
    s.addShape(pptx.ShapeType.ellipse, { x: M + 6.25, y: ry + 0.05, w: 0.22, h: 0.22, fill: { color: agot ? 'CCCCCC' : C.blue } });
    s.addText('+', { x: M + 6.25, y: ry + 0.05, w: 0.22, h: 0.22, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
  });

  card(s, M + 0.5, 5.28, 6.3, 0.62);
  s.addText('CONSUMOS DE LA BOLSA (2)', { x: M + 0.65, y: 5.32, w: 3, h: 0.22, fontSize: 8, bold: true, color: '5C6470', fontFace: 'Calibri' });
  s.addText('Urgencias y también servicios programados con descuento', { x: M + 0.65, y: 5.52, w: 4, h: 0.2, fontSize: 7.5, color: C.muted, fontFace: 'Calibri' });
  btn(s, M + 5.1, 5.38, 1.55, 0.36, '+ Registrar consumo', C.blue, C.white, { fontSize: 8.5 });

  marca(s, 1, M + 1.9, 1.75);
  marca(s, 2, M + 6.55, 2.42);
  marca(s, 3, M + 6.55, 3.85);
  marca(s, 4, M + 3.6, 2.0);

  const px = M + 8.0, pw = CW - 8.0;
  pasos(s, px, 1.55, pw, [
    { t: 'Mira el estado (la etiqueta de color)', d: 'Solo "Activo" y "En gracia" tienen cobertura. Ver la tabla de estados (pág. 22).' },
    { t: 'Mira cuánta bolsa le queda', d: 'Si lo que va a costar es más de lo que queda, aplica "bolsa agotada" (pág. 23).' },
    { t: 'Revisa los beneficios (solo Plan Total)', d: 'Si dice AGOTADO, ese beneficio ya lo usó este año y se cobra aparte.' },
    { t: 'Revisa la carencia', d: 'Mira "Afiliado desde". Urgencias: desde el día 1. Todo lo demás: desde el día 31.' },
  ], { descH: 0.5, gap: 0.1 });

  nota(s, px, 5.4, pw, 1.25, 'Ojo con el plan',
    'El Plan Urgencias no tiene beneficios preventivos ni descuentos: esa sección no aparece en su ficha.',
    C.blue, 'EEF4FF');
}

// ═══════════════════════════════════ QUÉ ES UNA URGENCIA
{
  const s = content('Paso 4 · Antes de registrar', '¿Qué cuenta como urgencia?',
    'Lo decide SOLO el veterinario de turno, al momento de atender. Es una decisión médica y no se discute. Esta página es para que puedas explicárselo al tutor.');

  const lw = 4.6;
  card(s, M, 1.8, lw, 2.35, C.cream);
  s.addText('ES URGENCIA CUANDO…', { x: M + 0.3, y: 1.95, w: lw - 0.6, h: 0.28, fontSize: 10.5, bold: true, color: C.brown, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText(bullets([
    'Aparece de golpe, no poco a poco',
    'Pone en riesgo la vida, compromete un órgano vital o causa dolor severo',
    'Necesita atención en las primeras 6 horas para evitar daño grave o la muerte',
  ], 12), { x: M + 0.3, y: 2.28, w: lw - 0.6, h: 1.8, fontFace: 'Calibri', lineSpacing: 17, valign: 'top' });

  const rx = M + lw + 0.35, rw = CW - lw - 0.35;
  card(s, rx, 1.8, rw, 2.35);
  s.addText('EJEMPLOS QUE SÍ SON URGENCIA', { x: rx + 0.3, y: 1.95, w: rw - 0.6, h: 0.28, fontSize: 10.5, bold: true, color: C.green, charSpacing: 1.2, fontFace: 'Calibri' });
  const ev = [
    'Atropellamiento, caída, mordida grave', 'Dificultad para respirar', 'Convulsiones activas',
    'Intoxicación o envenenamiento', 'Torsión gástrica', 'Gato que no puede orinar',
    'Sangrado que no para', 'Parto complicado', 'Golpe de calor severo',
    'Reacción alérgica grave', 'Cuerpo extraño que obstruye', 'Prolapso de un órgano',
    'Fractura expuesta',
  ];
  const colW = (rw - 0.6) / 2;
  [ev.slice(0, 7), ev.slice(7)].forEach((col, ci) => {
    s.addText(bullets(col, 11.5), { x: rx + 0.3 + ci * colW, y: 2.28, w: colW - 0.1, h: 1.8, fontFace: 'Calibri', lineSpacing: 15, valign: 'top' });
  });

  card(s, M, 4.35, CW, 1.45, 'FDECEA');
  s.addText('NO ES URGENCIA (se cobra a tarifa normal, sin cobertura de urgencia)', { x: M + 0.3, y: 4.48, w: CW - 0.6, h: 0.28, fontSize: 10.5, bold: true, color: C.red, charSpacing: 1, fontFace: 'Calibri' });
  s.addText(bullets([
    'Enfermedades crónicas o que avanzan poco a poco: cáncer, riñón, hígado o corazón crónicos, diabetes, displasia, alergias…',
    'Lo que se puede programar: esterilización, limpieza dental, cirugías estéticas',
    'Molestias menores: un vómito o diarrea aislados, otitis, dermatitis, cojera leve, infección urinaria sin obstrucción',
  ], 11.5), { x: M + 0.3, y: 4.8, w: CW - 0.6, h: 0.95, fontFace: 'Calibri', lineSpacing: 15, valign: 'top' });

  nota(s, M, 6.0, CW, 0.75, 'Si el veterinario dice que no es urgencia',
    'Se cobra a la tarifa normal. Si es Plan Total, aplican sus beneficios y descuentos (consulta incluida, descuentos de la pág. 21). Caja nunca califica urgencias.',
    C.amber);
}

// ═══════════════════════════════════ QUÉ CUBRE UNA URGENCIA
{
  const s = content('Paso 4 · Antes de registrar', 'Qué cubre una urgencia, y cómo van las cirugías');

  const lw = 5.3;
  card(s, M, 1.5, lw, 3.15, C.cream);
  s.addText('DENTRO DE UNA MISMA URGENCIA SE CUBRE', { x: M + 0.3, y: 1.65, w: lw - 0.6, h: 0.28, fontSize: 10.5, bold: true, color: C.brown, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText(bullets([
    'La consulta de urgencia y el triage',
    'La estabilización inicial',
    'La hospitalización por ese evento',
    'Los exámenes que hagan falta: laboratorios, radiografías, ecografías',
    'Los medicamentos aplicados durante la hospitalización',
  ], 12.5, '2713'), { x: M + 0.3, y: 2.0, w: lw - 0.6, h: 2.0, fontFace: 'Calibri', lineSpacing: 18, valign: 'top' });
  s.addText('El tutor paga el 20% de todo eso. No hay límite de urgencias al año mientras quede bolsa.', {
    x: M + 0.3, y: 4.0, w: lw - 0.6, h: 0.55, fontSize: 11.5, bold: true, color: C.deep, fontFace: 'Calibri', lineSpacing: 15, valign: 'top',
  });

  const rx = M + lw + 0.35, rw = CW - lw - 0.35;
  s.addText('Cirugías que salen de una urgencia:', { x: rx, y: 1.5, w: rw, h: 0.3, fontSize: 13.5, bold: true, color: C.deep, fontFace: 'Calibri' });
  const rows = [
    [th('Cirugía'), th('Paga el tutor')],
    [td('Tejidos blandos, en las primeras 12 horas del suceso', { bold: true }), td('20%', { align: 'center', bold: true, color: C.green, fontSize: 15 })],
    [td('Tejidos blandos, entre 12 y 24 horas después', { bold: true }), td('50%', { align: 'center', bold: true, color: C.amber, fontSize: 15 })],
    [td('Cirugía de especialista (ortopedia y similares)', { bold: true }), td('No se cubre como urgencia. Si es Plan Total, tiene 40% de descuento como servicio programado.', { color: C.red, fontSize: 10.5 })],
  ];
  s.addTable(rows, {
    x: rx, y: 1.88, w: rw, colW: [rw * 0.52, rw * 0.48],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.62, valign: 'middle', autoPage: false,
  });

  nota(s, M, 4.9, CW, 0.82, 'No entra en la urgencia',
    'Los medicamentos, alimentos o suplementos para la casa después del alta se cobran aparte, a tarifa normal (Plan Total: 10% en farmacia).',
    C.amber);
  nota(s, M, 5.9, CW, 0.82, 'Solo lo que podamos hacer nosotros',
    'Si hace falta un equipo o especialista que no tenemos, se orienta al tutor, pero el plan NO cubre la atención externa ni los traslados.',
    C.blue, 'EEF4FF');
}

// ═══════════════════════════════════ PASO 4 — REGISTRAR URGENCIA
{
  const s = content('Paso 4 · Registrar', 'Registrar una urgencia y cobrar lo que le toca al tutor');

  screenFrame(s, M, 1.45, 6.1, 5.3);
  card(s, M + 0.3, 1.6, 5.5, 5.0);
  s.addText('🚨 Registrar urgencia', { x: M + 0.5, y: 1.68, w: 4, h: 0.28, fontSize: 11.5, bold: true, color: C.red, fontFace: 'Calibri' });
  s.addText('LUNA', { x: M + 0.5, y: 1.93, w: 4, h: 0.18, fontSize: 8, color: C.muted, fontFace: 'Calibri' });
  label(s, M + 0.5, 2.18, 4, '¿Qué tipo de servicio fue?');
  btn(s, M + 0.5, 2.38, 2.5, 0.42, '🚨 Urgencia · Copago 20%', C.red, C.white, { fontSize: 9 });
  btn(s, M + 3.1, 2.38, 2.5, 0.42, '📅 Programado · Con descuento', C.white, C.ink, { borderColor: C.border, fontSize: 9 });

  label(s, M + 0.5, 2.92, 4, 'Conceptos de la urgencia');
  const item = (y, concepto, valor, tutor, bolsa) => {
    s.addShape(pptx.ShapeType.roundRect, { x: M + 0.5, y, w: 5.1, h: 0.72, rectRadius: 0.05, fill: { color: 'FBFCFD' }, line: { color: 'E8ECF2', width: 1 } });
    input(s, M + 0.6, y + 0.07, 4.55, 0.28, concepto, { fontSize: 8.5 });
    btn(s, M + 5.22, y + 0.07, 0.28, 0.28, '✕', 'FDECEA', C.red, { fontSize: 8 });
    s.addText('Valor', { x: M + 0.6, y: y + 0.4, w: 0.4, h: 0.26, fontSize: 7.5, color: C.muted, valign: 'middle', fontFace: 'Calibri', margin: 0 });
    input(s, M + 1.0, y + 0.4, 1.0, 0.26, valor, { fontSize: 8.5, align: 'right' });
    s.addText([{ text: 'Paga el tutor ', options: { color: C.muted } }, { text: tutor, options: { bold: true, color: C.ink } }],
      { x: M + 2.9, y: y + 0.37, w: 2.6, h: 0.17, fontSize: 7.5, align: 'right', fontFace: 'Calibri', margin: 0 });
    s.addText([{ text: 'Sale de bolsa ', options: { color: C.muted } }, { text: bolsa, options: { bold: true, color: C.blue } }],
      { x: M + 2.9, y: y + 0.53, w: 2.6, h: 0.17, fontSize: 7.5, align: 'right', fontFace: 'Calibri', margin: 0 });
  };
  item(3.12, 'Consulta de urgencia', '180000', '$36.000', '$144.000');
  item(3.92, 'Radiografía', '200000', '$40.000', '$160.000');
  btn(s, M + 0.5, 4.72, 5.1, 0.3, '+ Agregar otro ítem', C.white, C.blue, { borderColor: C.blue, dash: true, fontSize: 8.5 });

  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.5, y: 5.1, w: 5.1, h: 1.0, rectRadius: 0.05, fill: { color: C.gray } });
  [['Costo total de la visita', '$380.000', C.ink], ['Paga el tutor (antes de IVA)', '$76.000', C.ink], ['IVA sobre lo que paga el tutor', '$14.440', C.muted],
    ['TOTAL A COBRAR EN CAJA', '$90.440', C.green], ['Bolsa después de esta visita', '$3.696.000', C.ink]].forEach((r, i) => {
    const ry = 5.13 + i * 0.19;
    s.addText(r[0], { x: M + 0.62, y: ry, w: 3, h: 0.19, fontSize: 7.5, bold: i === 3, color: r[2] === C.muted ? C.muted : C.ink, fontFace: 'Calibri', margin: 0, valign: 'middle' });
    s.addText(r[1], { x: M + 3.6, y: ry, w: 1.9, h: 0.19, fontSize: i === 3 ? 9 : 7.5, bold: true, color: r[2], align: 'right', fontFace: 'Calibri', margin: 0, valign: 'middle' });
  });
  btn(s, M + 0.5, 6.18, 1.4, 0.32, 'Cancelar', C.white, C.ink, { borderColor: C.border, fontSize: 8.5 });
  btn(s, M + 2.0, 6.18, 3.6, 0.32, 'Registrar 2 ítems', C.red, C.white, { fontSize: 9 });

  marca(s, 2, M + 2.85, 2.24);
  marca(s, 3, M + 5.42, 2.98);
  marca(s, 4, M + 5.62, 5.6);
  marca(s, 5, M + 5.42, 6.04);

  const px = M + 6.45, pw = CW - 6.45;
  pasos(s, px, 1.5, pw, [
    { t: 'En la ficha, clic en "+ Registrar consumo"', d: 'Botón verde, abajo, en "Consumos de la bolsa". Primero el veterinario confirma que ES urgencia y te da el presupuesto.', h: 0.62 },
    { t: 'Elige "🚨 Urgencia"', d: 'El tutor paga el 20%. En el Plan Urgencias es la única opción que aparece.' },
    { t: 'Busca cada concepto en Siigo, uno por fila', d: 'Escribe "consulta", "radiografía"… y elígelo. El valor sale solo: ajústalo al presupuesto del veterinario. Para otro concepto, "+ Agregar otro ítem".', h: 0.8 },
    { t: 'Cobra el "TOTAL A COBRAR EN CAJA"', d: 'Es lo que le toca al tutor, con IVA. Cóbralo ANTES de empezar la atención.' },
    { t: 'Clic en "Registrar"', d: 'Sale la factura electrónica, le llega al correo y la bolsa se descuenta sola. Avísale al veterinario que ya puede seguir.', h: 0.62 },
  ], { descH: 0.46, gap: 0.04, descSize: 11 });
}

// ═══════════════════════════════════ PASO 4B — SERVICIOS PROGRAMADOS
{
  const s = content('Paso 4 · Registrar', 'Servicios programados con descuento (solo Plan Total)',
    'Cuando le das el descuento del plan a un servicio que NO es urgencia, lo que P&P descuenta también sale de la bolsa. Se registra en el mismo botón.');

  screenFrame(s, M, 1.8, 5.9, 3.05);
  card(s, M + 0.3, 1.95, 5.3, 2.75);
  s.addText('📅 Registrar servicio programado', { x: M + 0.5, y: 2.02, w: 4.5, h: 0.28, fontSize: 11.5, bold: true, color: C.blue, fontFace: 'Calibri' });
  btn(s, M + 0.5, 2.36, 2.4, 0.38, '🚨 Urgencia · Copago 20%', C.white, C.ink, { borderColor: C.border, fontSize: 8.5 });
  btn(s, M + 3.0, 2.36, 2.4, 0.38, '📅 Programado · Con descuento', C.blue, C.white, { fontSize: 8.5 });
  label(s, M + 0.5, 2.86, 4, 'Servicios prestados en esta visita');
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.5, y: 3.06, w: 4.9, h: 0.78, rectRadius: 0.05, fill: { color: 'FBFCFD' }, line: { color: 'E8ECF2', width: 1 } });
  input(s, M + 0.6, 3.12, 4.7, 0.28, 'Radiografía', { fontSize: 8.5 });
  input(s, M + 0.6, 3.47, 2.6, 0.28, 'Radiografía adicional — 60%   ▾', { fontSize: 8, focus: true });
  input(s, M + 3.3, 3.47, 0.8, 0.28, '200000', { fontSize: 8, align: 'right' });
  s.addText([{ text: 'Tutor ', options: { color: C.muted } }, { text: '$80.000', options: { bold: true } }], { x: M + 4.1, y: 3.45, w: 1.25, h: 0.16, fontSize: 7.5, align: 'right', fontFace: 'Calibri', margin: 0 });
  s.addText([{ text: 'Bolsa ', options: { color: C.muted } }, { text: '$120.000', options: { bold: true, color: C.blue } }], { x: M + 4.1, y: 3.6, w: 1.25, h: 0.16, fontSize: 7.5, align: 'right', fontFace: 'Calibri', margin: 0 });
  btn(s, M + 0.5, 4.0, 4.9, 0.32, 'Registrar servicio', C.blue, C.white, { fontSize: 9 });
  marca(s, 1, M + 5.1, 2.25);
  marca(s, 2, M + 2.95, 3.33);

  const px = M + 6.3, pw = CW - 6.3;
  pasos(s, px, 1.85, pw, [
    { t: '"+ Registrar consumo" → "📅 Programado"', d: 'Esta opción solo aparece si es Plan Total y ya pasaron los 30 días de carencia.' },
    { t: 'Busca el servicio y elige la "Cobertura del plan"', d: 'Ese menú dice qué % descuenta el plan (tabla de la pág. 21). Si la fila sale en ROJO, te falta elegirla.', h: 0.62 },
    { t: 'Cobra y dale "Registrar servicio"', d: 'Igual que en la urgencia: cobras el "TOTAL A COBRAR EN CAJA", sale la factura y se descuenta la bolsa.' },
  ], { descH: 0.48, gap: 0.08 });

  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 5.05, w: CW, h: 0.75, rectRadius: 0.08, fill: { color: C.gray }, line: { color: C.border, width: 1 } });
  s.addText([
    { text: 'EJEMPLO   ', options: { fontSize: 10, bold: true, color: C.muted } },
    { text: 'Radiografía programada de $200.000 con 60% de descuento  →  ', options: { fontSize: 13, color: C.ink } },
    { text: 'el tutor paga $80.000', options: { fontSize: 13, bold: true, color: C.deep } },
    { text: '  y  ', options: { fontSize: 13, color: C.ink } },
    { text: '$120.000 salen de su bolsa.', options: { fontSize: 13, bold: true, color: C.red } },
  ], { x: M + 0.3, y: 5.05, w: CW - 0.6, h: 0.75, fontFace: 'Calibri', valign: 'middle' });

  nota(s, M, 5.95, CW, 0.8, 'Siempre elige el concepto de Siigo',
    'Si una fila dice "⚠️ Sin concepto de Siigo", se registra en la bolsa pero NO se factura. Búscalo y elígelo antes de guardar.',
    C.amber);
}

// ═══════════════════════════════════ PASO 5 — BENEFICIOS PREVENTIVOS
{
  const s = content('Paso 4 · Registrar', 'Marcar un beneficio preventivo usado (solo Plan Total)', 'Cada vez que un afiliado del Plan Total usa una consulta, vacuna, desparasitación, laboratorio o imagen incluida.');

  const cw = (CW - 0.45) / 2;
  screenFrame(s, M, 1.85, cw, 2.6);
  card(s, M + 0.3, 2.1, cw - 0.6, 2.15);
  s.addText('BENEFICIOS PREVENTIVOS 2026', { x: M + 0.5, y: 2.2, w: 3, h: 0.22, fontSize: 8.5, bold: true, color: '5C6470', fontFace: 'Calibri' });
  [['Consultas médicas', '3/12', false], ['Vacunas anuales', '1/1 AGOTADO', true], ['Desparasitaciones', '1/4', false], ['Panel de laboratorio', '0/1', false], ['Imagen diagnóstica', '0/1', false]].forEach((r, i) => {
    const ry = 2.47 + i * 0.35;
    s.addShape(pptx.ShapeType.roundRect, { x: M + 0.5, y: ry, w: cw - 1.0, h: 0.3, rectRadius: 0.05, fill: { color: r[2] ? 'FDECEA' : C.gray } });
    s.addText(r[0], { x: M + 0.65, y: ry, w: 2.2, h: 0.3, fontSize: 9.5, bold: true, color: C.ink, valign: 'middle', fontFace: 'Calibri' });
    s.addText(r[1], { x: M + 2.9, y: ry, w: 1.5, h: 0.3, fontSize: 9.5, bold: true, color: r[2] ? C.red : C.ink, align: 'right', valign: 'middle', fontFace: 'Calibri' });
    s.addShape(pptx.ShapeType.ellipse, { x: M + cw - 1.15, y: ry + 0.04, w: 0.22, h: 0.22, fill: { color: C.white }, line: { color: C.border, width: 0.75 } });
    s.addText('−', { x: M + cw - 1.15, y: ry + 0.04, w: 0.22, h: 0.22, fontSize: 9, color: C.ink, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
    s.addShape(pptx.ShapeType.ellipse, { x: M + cw - 0.85, y: ry + 0.04, w: 0.22, h: 0.22, fill: { color: r[2] ? 'CCCCCC' : C.blue } });
    s.addText('+', { x: M + cw - 0.85, y: ry + 0.04, w: 0.22, h: 0.22, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
  });
  marca(s, 1, M + cw - 0.9, 2.18);
  marca(s, 2, M + cw - 1.2, 3.15);

  const px = M + cw + 0.45, pw = CW - cw - 0.45;
  pasos(s, px, 1.9, pw, [
    { t: 'Dale "+" al beneficio que acaba de usar', d: 'Suma 1. Ejemplo: vino a consulta preventiva → "+" en Consultas médicas. No se cobra y NO toca la bolsa.' },
    { t: 'Si te equivocas, dale "−"', d: 'Resta 1. No hay problema en corregir.' },
  ], { descH: 0.62, gap: 0.16 });

  card(s, px, 4.0, pw, 1.75, C.cream);
  s.addText('Lo que incluye el Plan Total al año:', { x: px + 0.3, y: 4.12, w: pw - 0.6, h: 0.3, fontSize: 13, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText(bullets([
    '12 consultas médicas (una al mes)', '1 esquema de vacunación anual', '4 desparasitaciones',
    '1 panel de laboratorio (hemograma + química)', '1 imagen diagnóstica (Rx o ecografía)',
  ]), { x: px + 0.3, y: 4.45, w: pw - 0.6, h: 1.25, fontFace: 'Calibri', lineSpacing: 16, valign: 'top' });

  nota(s, M, 4.65, cw, 1.1, 'Cuando dice AGOTADO',
    'Ese beneficio ya se usó completo este año. De ahí en adelante se cobra aparte (con el descuento del plan si aplica). Se reinician solos cada año.',
    C.amber);
  nota(s, M, 5.85, CW, 1.0, 'Si no aparecen los contadores',
    'Si en vez de la lista sale "Aún no hay registro de beneficios para este año", dale el botón "Iniciar beneficios" y ya aparecen en cero. Teleorientación veterinaria: se agenda según disponibilidad, no tiene contador.',
    C.blue, 'EEF4FF');
}

// ═══════════════════════════════════ DESCUENTOS SERVICIO POR SERVICIO
{
  const s = content('Referencia', 'Descuentos del Plan Total, servicio por servicio',
    'Solo PLAN TOTAL · solo servicios PROGRAMADOS (nunca dentro de una urgencia) · desde el día 31 · sobre la tarifa normal de P&P.');

  const dto = (t) => td(t, { align: 'center', bold: true, color: C.blue, fontSize: 13 });
  const rows = [
    [th('Servicio (así sale en "Cobertura del plan")'), th('Dto.'), th('Ojo con esto')],
    [td('Cirugía programada de tejidos blandos', { bold: true }), dto('60%'), td('Programada, no la que sale de una urgencia.')],
    [td('Radiografía adicional', { bold: true }), dto('60%'), td('De la 2ª en adelante: la 1ª imagen del año es beneficio preventivo.')],
    [td('Ecografía diagnóstica adicional', { bold: true }), dto('60%'), td('Igual que las Rx: la primera imagen del año es beneficio.')],
    [td('Esterilización / castración (con remisión médica)', { bold: true }), dto('50%'), td('SOLO con remisión médica. Si el tutor la pide por su cuenta, NO aplica.', { color: C.red })],
    [td('Tomografía (TAC)', { bold: true }), dto('50%'), td('—')],
    [td('Consulta con especialista', { bold: true }), dto('50%'), td('Cardiología, neurología… No son las 12 consultas generales incluidas.')],
    [td('Hospitalización programada', { bold: true }), dto('50%'), td('Si la hospitalización viene de una urgencia, va con el 20% de urgencia.')],
    [td('Otros procedimientos y tratamientos médicos', { bold: true }), dto('50%'), td('Quimioterapia, tratamientos largos, enfermedades crónicas y lo que no esté en otra fila.')],
    [td('Cirugía de especialista (ortopedia y similares)', { bold: true }), dto('40%'), td('Aunque venga de una urgencia, va con este descuento, no al 80%.', { color: C.red })],
    [td('Limpieza dental / profilaxis', { bold: true }), dto('40%'), td('—')],
    [td('Laboratorios adicionales', { bold: true }), dto('40%'), td('Del 2º panel del año en adelante: el 1º es beneficio preventivo.')],
    [td('Medicamentos de farmacia', { bold: true }), dto('10%'), td('Farmacia de la clínica. No aplica en petshop ni alimentos.')],
  ];
  s.addTable(rows, {
    x: M, y: 1.65, w: CW, colW: [4.4, 0.9, 6.53],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.37, valign: 'middle', autoPage: false,
  });

  s.addText('El Plan Urgencias NO tiene ninguno de estos descuentos. · Lo que descuenta P&P sale de la bolsa: por eso se registra SIEMPRE en "+ Registrar consumo".', {
    x: M, y: 6.55, w: CW, h: 0.45, fontSize: 11.5, bold: true, color: C.red, fontFace: 'Calibri', lineSpacing: 15,
  });
}

// ═══════════════════════════════════ ESTADOS DEL AFILIADO
{
  const s = content('Referencia', 'Los estados del afiliado: qué significan y qué haces');
  const rows = [
    [th('Estado'), th('Qué pasó'), th('¿Tiene cobertura?'), th('Qué haces tú')],
    [td('🟠  Pendiente de pago', { bold: true, color: C.orange }), td('Se afilió, pero no ha entrado el primer pago.'), td('NO', { align: 'center', bold: true, color: C.red }), td('Cobrar el primer mes (pág. 9). Hasta que pague, se atiende a tarifa normal.')],
    [td('🟢  Activo', { bold: true, color: C.green }), td('Está al día.'), td('SÍ', { align: 'center', bold: true, color: C.green }), td('Atender normal, revisando carencia y bolsa.')],
    [td('🟡  En gracia', { bold: true, color: C.amber }), td('Se le venció hace 5 días o menos.'), td('SÍ', { align: 'center', bold: true, color: C.green }), td('Atender normal. Avísale que se le venció y cóbrale (link, tarjeta o caja).')],
    [td('🔴  Suspendido', { bold: true, color: C.red }), td('Lleva entre 6 y 29 días sin pagar.'), td('NO', { align: 'center', bold: true, color: C.red }), td('Tarifa normal. Si paga hoy, vuelve a "Activo" de inmediato.')],
    [td('⚫  Cancelado', { bold: true, color: C.muted }), td('30 días sin pagar, o pidió la baja.'), td('NO', { align: 'center', bold: true, color: C.red }), td('Tarifa normal. Si quiere volver, se afilia de nuevo: nuevas carencias y nuevo examen.')],
  ];
  s.addTable(rows, {
    x: M, y: 1.5, w: CW, colW: [2.3, 3.0, 1.55, 4.98],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.62, valign: 'middle', autoPage: false,
  });

  nota(s, M, 5.55, CW, 1.15, 'El estado cambia solo — no lo cambies a mano',
    'El sistema mueve el estado según los pagos y la fecha de vencimiento. El menú de estado de la ficha (a la derecha de los botones) es solo para casos excepcionales autorizados por gerencia, por ejemplo cancelar a alguien que pidió retirarse.',
    C.blue, 'EEF4FF');
}

// ═══════════════════════════════════ CASOS ESPECIALES
{
  const s = content('Referencia', 'Casos que te van a pasar');
  const rows = [
    [th('Situación'), th('Qué haces')],
    [td('"Yo tengo plan" pero no aparece', { bold: true }), td('Búscalo por cédula, no por nombre. Si de verdad no está, se atiende como paciente normal y se escala a la coordinación de prepagada. No le prometas cobertura.')],
    [td('Recién afiliado y llega por urgencia', { bold: true }), td('Si ya pagó (Activo), la urgencia está cubierta desde el día 1. Si sigue "Pendiente de pago", primero que pague: ahí mismo con la opción A, B o C.')],
    [td('La bolsa no alcanza', { bold: true }), td('Explícale con calma que ya usó el tope del año. Lo que pase del tope se cobra a tarifa normal. Si no puede pagar, escala a gerencia: el animal se estabiliza igual.')],
    [td('El veterinario dice que NO es urgencia', { bold: true }), td('Tarifa normal, sin cobertura de urgencia. Si es Plan Total, aplican sus beneficios y descuentos.')],
    [td('Viene con otra mascota', { bold: true }), td('El plan cubre solo a la mascota afiliada. Tarifa normal, y ofrécele afiliarla con descuento por segunda mascota.')],
    [td('Le rechazaron la tarjeta', { bold: true }), td('Mándale "💳 Cambiar tarjeta" para que registre otra, o cóbrale ese mes con link o en caja.')],
    [td('Quiere quitar la tarjeta', { bold: true }), td('Lo hace él mismo en su portal, con "Pagar yo cada mes". Pierde el 10% desde el mes siguiente.')],
  ];
  s.addTable(rows, {
    x: M, y: 1.45, w: CW, colW: [3.5, 8.33],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.58, valign: 'middle', autoPage: false, fontSize: 11.5,
  });
  s.addText('Regla general: la decisión clínica la toma el veterinario; la comercial se escala. Caja nunca la resuelve por su cuenta.', {
    x: M, y: 6.25, w: CW, h: 0.4, fontSize: 12, color: C.muted, italic: true, fontFace: 'Calibri',
  });
}

// ═══════════════════════════════════ EL TUTOR DESDE SU PORTAL
{
  const s = content('Para que sepas qué decirle', 'El tutor también puede pagar solo, desde su portal');

  screenFrame(s, M, 1.55, 6.4, 4.0, 'sofvetpp.netlify.app/portal');
  card(s, M + 0.35, 1.95, 5.7, 3.4);
  s.addText('🐾 LUNA', { x: M + 0.55, y: 2.05, w: 2, h: 0.3, fontSize: 13, bold: true, color: C.deep, fontFace: 'Calibri' });
  ['Resumen', '💳 Mi Plan', 'Consultas', 'Vacunas'].forEach((t, i) => {
    const tx = M + 0.55 + i * 1.3;
    s.addText(t, { x: tx, y: 2.4, w: 1.25, h: 0.3, fontSize: 9, bold: i === 1, color: i === 1 ? C.blue : C.muted, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    if (i === 1) s.addShape(pptx.ShapeType.rect, { x: tx, y: 2.67, w: 1.25, h: 0.035, fill: { color: C.blue } });
  });
  s.addShape(pptx.ShapeType.line, { x: M + 0.55, y: 2.7, w: 5.3, h: 0, line: { color: C.softGray, width: 1 } });
  pill(s, M + 0.55, 2.85, 0.8, 0.24, 'Al día', 'EAFAF0', C.green);
  s.addText('Plan Total · Vence 31 de octubre de 2026', { x: M + 1.45, y: 2.85, w: 4.2, h: 0.24, fontSize: 8.5, color: C.muted, valign: 'middle', fontFace: 'Calibri' });
  s.addText('PAGAR MI PLAN', { x: M + 0.55, y: 3.2, w: 3, h: 0.22, fontSize: 8, bold: true, color: C.deep, fontFace: 'Calibri' });
  btn(s, M + 0.55, 3.45, 5.3, 0.45, 'Pagar este mes', C.blue, C.white, { fontSize: 10.5 });
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.55, y: 4.0, w: 5.3, h: 1.2, rectRadius: 0.06, fill: { color: 'F2FAF5' }, line: { color: C.green, width: 1 } });
  s.addText('Activa el pago automático y te descontamos 10% de cada mes, desde el primero.', { x: M + 0.7, y: 4.05, w: 5.0, h: 0.5, fontSize: 9, color: C.ink, fontFace: 'Calibri' });
  btn(s, M + 0.7, 4.6, 5.0, 0.45, '💳 Activar pago automático', C.green, C.white, { fontSize: 10 });
  marca(s, 1, M + 5.6, 3.38);
  marca(s, 2, M + 5.45, 4.53);

  const px = M + 7.0, pw = CW - 7.0;
  s.addText('Qué le dices al tutor:', { x: px, y: 1.6, w: pw, h: 0.3, fontSize: 14, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText('"Entras a sofvetpp.netlify.app/portal con tu cédula y abres la pestaña Mi Plan de tu mascota. Ahí pagas el mes, o mejor: activas el pago automático y te descontamos el 10% todos los meses."', {
    x: px, y: 1.95, w: pw, h: 1.3, fontSize: 13, italic: true, color: C.ink, fontFace: 'Calibri', lineSpacing: 18, valign: 'top',
  });
  pasos(s, px, 3.4, pw, [
    { t: '"Pagar este mes"', d: 'Abre el pago de Wompi por un mes (igual que el link de la opción B).' },
    { t: '"Activar pago automático"', d: 'Registra su tarjeta ahí mismo y queda con 10% menos. Desde ahí también puede quitarla.' },
  ], { descH: 0.48, gap: 0.12 });

  nota(s, M, 5.8, CW, 0.9, 'Esto te quita trabajo',
    'Mientras más tutores paguen solos (y mejor si es con tarjeta automática), menos links mandas y menos cobros persigues. Cuando un afiliado diga que no sabe cómo pagar, enséñale el portal.',
    C.green, 'EAF7EF');
}

// ═══════════════════════════════════ CIERRE / PEGAR EN CAJA
{
  pageNo++;
  const s = pptx.addSlide();
  s.background = { color: C.cream };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.16, fill: { color: C.brown } });
  s.addImage({ path: LOGO_I_TEAL, x: W - 2.3, y: H - 2.6, w: 1.7, h: 2.11, transparency: 90 });

  s.addText('RESUMEN PARA PEGAR EN CAJA', {
    x: 0, y: 0.45, w: W, h: 0.4, fontSize: 12, bold: true, color: C.brown, align: 'center', charSpacing: 2.5, fontFace: 'Calibri',
  });
  s.addText('Las 6 cosas que no se te pueden olvidar', {
    x: 0, y: 0.82, w: W, h: 0.55, fontSize: 30, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri',
  });

  const reglas = [
    { n: '1', t: 'Busca siempre por cédula', d: 'El nombre no basta: hay tutores con nombres parecidos.' },
    { n: '2', t: 'Cobra el primer mes el mismo día', d: 'Ofrece primero la tarjeta (10% menos). Sin pago queda "Pendiente" y no tiene cobertura.' },
    { n: '3', t: 'Agenda el examen inicial gratis', d: 'Dentro de los primeros 30 días. Lo que salga ahí queda excluido.' },
    { n: '4', t: 'Revisa estado, carencia y bolsa', d: 'Urgencias desde el día 1 · lo demás desde el día 31 · tope $4.000.000 al año.' },
    { n: '5', t: 'Todo va por "+ Registrar consumo"', d: 'Urgencias y programados. Cobra el "TOTAL A COBRAR EN CAJA" antes de atender.' },
    { n: '6', t: 'Nunca niegues atención estabilizadora', d: 'Lo administrativo se resuelve después. El animal primero, siempre.' },
  ];
  const bw = (CW - 0.35 * 2) / 3, bh = 1.55;
  reglas.forEach((r, i) => {
    const x = M + (i % 3) * (bw + 0.35);
    const y = 1.65 + Math.floor(i / 3) * (bh + 0.3);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: bw, h: bh, rectRadius: 0.08,
      fill: { color: C.white }, line: { color: C.border, width: 1 },
    });
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.25, y: y + 0.25, w: 0.45, h: 0.45, fill: { color: C.blue } });
    s.addText(r.n, { x: x + 0.25, y: y + 0.25, w: 0.45, h: 0.45, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
    s.addText(r.t, { x: x + 0.82, y: y + 0.24, w: bw - 1.05, h: 0.5, fontSize: 13.5, bold: true, color: C.deep, fontFace: 'Calibri', valign: 'middle' });
    s.addText(r.d, { x: x + 0.28, y: y + 0.82, w: bw - 0.56, h: 0.65, fontSize: 11.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 15, valign: 'top' });
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 5.3, w: CW, h: 0.9, rectRadius: 0.08,
    fill: { color: C.white }, line: { color: C.blue, width: 1.5 },
  });
  s.addText([
    { text: '¿Dudas?  ', options: { bold: true, fontSize: 14, color: C.deep } },
    { text: 'Llama a la coordinación de prepagada. En la noche, al jefe de turno. Si es una decisión clínica, decide el veterinario. Si es comercial o una excepción, la autoriza gerencia.', options: { fontSize: 13, color: C.ink } },
  ], { x: M + 0.35, y: 5.42, w: CW - 0.7, h: 0.7, fontFace: 'Calibri', valign: 'middle', lineSpacing: 18 });

  s.addImage({ path: LOGO_W_TEAL, x: (W - 2.2) / 2, y: 6.45, w: 2.2, h: 0.34 });
  s.addText('Guía Prepagada · Pets & Pets · v2.0 octubre 2026', {
    x: M, y: H - 0.42, w: 6, h: 0.22, fontSize: 9, color: C.muted, fontFace: 'Calibri',
  });
  s.addText('Pág. ' + pageNo, {
    x: W - M - 0.9, y: H - 0.42, w: 0.9, h: 0.22, fontSize: 9, color: C.muted, align: 'right', fontFace: 'Calibri',
  });
}

const OUT = path.join(AQUI, '..', 'Prepagada', 'PetsPets_Prepagada_Guia_Personal.pptx');
await pptx.writeFile({ fileName: OUT });
console.log('Guía generada:', OUT);
console.log('Diapositivas:', pageNo + 1);
