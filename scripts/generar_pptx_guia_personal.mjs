import PptxGenJS from 'pptxgenjs';

const L = 'C:/Users/goedi/AppData/Local/Temp/claude/c--Users-goedi-OneDrive-Desktop-SofVet/2baa7cb7-4704-4bbe-abb8-126b526d66a2/scratchpad/logos';
const LOGO_W_TEAL = L + '/wordmark_teal.png';
const LOGO_W_WHITE = L + '/wordmark_white.png';
const LOGO_I_TEAL = L + '/icon_teal_trim.png';
const LOGO_I_WHITE = L + '/icon_white_trim.png';

const C = {
  blue: '316D74', deep: '1E4E54', brown: 'A6785B', well: '99B2AA',
  beige: 'F9E7D4', cream: 'FDF6EE', white: 'FFFFFF', ink: '2D2D2D',
  muted: '7A8B8E', line: 'E3E9E9', green: '1E7D45', amber: 'B8873A',
  red: 'C0392B', gray: 'F7F9FC', border: 'DFE3EA', softGray: 'ECEFF3',
  linkBlue: '2A4D9E', linkBg: 'EEF4FF',
};

const W = 13.333, H = 7.5;
const M = 0.75;
const CW = W - M * 2;

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Pets & Pets';
pptx.company = 'Pets & Pets';
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
      x: M, y: 1.1, w: CW - 1.4, h: 0.32,
      fontSize: 13, color: C.muted, fontFace: 'Calibri',
    });
  }
  s.addImage({ path: LOGO_I_TEAL, x: W - M - 0.38, y: 0.34, w: 0.38, h: 0.47 });
  s.addText('Guía Prepagada · Pets & Pets', {
    x: M, y: H - 0.42, w: 5, h: 0.22, fontSize: 9, color: C.muted, fontFace: 'Calibri',
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
function card(s, x, y, w, h, fill = C.white) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: fill }, line: { color: 'E2E6EF', width: 0.75 },
  });
}
function btn(s, x, y, w, h, label, bg, color = 'FFFFFF', opts = {}) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: bg },
    line: opts.borderColor ? { color: opts.borderColor, width: 1, dashType: opts.dash ? 'dash' : 'solid' } : { type: 'none' },
  });
  s.addText(label, {
    x, y, w, h, fontSize: opts.fontSize || 9.5, bold: true, color,
    align: 'center', valign: 'middle', fontFace: 'Calibri',
  });
}
function input(s, x, y, w, h, texto, opts = {}) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: C.white }, line: { color: opts.focus ? C.blue : C.border, width: opts.focus ? 1.5 : 1 },
  });
  s.addText(texto, {
    x: x + 0.12, y, w: w - 0.24, h,
    fontSize: 9.5, color: opts.placeholder ? 'A8B0B8' : C.ink, valign: 'middle', fontFace: 'Calibri',
  });
}
function label(s, x, y, w, texto) {
  s.addText(texto.toUpperCase(), {
    x, y, w, h: 0.2, fontSize: 7.5, bold: true, color: '5C6470', charSpacing: 0.6, fontFace: 'Calibri',
  });
}
function pill(s, x, y, w, h, texto, bg, color) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.5, fill: { color: bg } });
  s.addText(texto, { x, y, w, h, fontSize: 8, bold: true, color, align: 'center', valign: 'middle', fontFace: 'Calibri' });
}
// Marcador numerado sobre el mockup
function marca(s, n, x, y, size = 0.3) {
  s.addShape(pptx.ShapeType.ellipse, {
    x, y, w: size, h: size,
    fill: { color: C.amber }, line: { color: C.white, width: 1.5 },
  });
  s.addText(String(n), {
    x, y, w: size, h: size,
    fontSize: 11, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri',
  });
}
// Lista de pasos numerados (a la derecha del mockup)
function pasos(s, x, y, w, items, opts = {}) {
  let cy = y;
  items.forEach((it, i) => {
    marca(s, i + 1, x, cy + 0.02, 0.28);
    s.addText(it.t, {
      x: x + 0.42, y: cy - 0.02, w: w - 0.42, h: 0.28,
      fontSize: opts.titleSize || 13, bold: true, color: C.deep, fontFace: 'Calibri', valign: 'middle',
    });
    const dh = it.d ? (opts.descH || 0.46) : 0;
    if (it.d) {
      s.addText(it.d, {
        x: x + 0.42, y: cy + 0.27, w: w - 0.42, h: dh,
        fontSize: opts.descSize || 11, color: C.ink, fontFace: 'Calibri', lineSpacing: 15, valign: 'top',
      });
    }
    cy += 0.34 + dh + (opts.gap ?? 0.1);
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
    x: x + 0.22, y: y + 0.34, w: w - 0.44, h: h - 0.44,
    fontSize: 11.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 16, valign: 'top',
  });
}
const th = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.blue }, fontSize: 11.5, align: 'center', valign: 'middle' } });
const td = (t, o = {}) => ({ text: t, options: { fontSize: 11.5, color: C.ink, valign: 'middle', ...o } });

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
  s.addShape(pptx.ShapeType.rect, { x: (W - 1.5) / 2, y: 3.62, w: 1.5, h: 0.04, fill: { color: C.brown } });
  s.addText('Recepción · Caja · Auxiliares · Médicos veterinarios', {
    x: 0, y: 3.85, w: W, h: 0.35, fontSize: 14, color: C.well, align: 'center', fontFace: 'Calibri',
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: (W - 5.2) / 2, y: 4.55, w: 5.2, h: 0.95, rectRadius: 0.08,
    fill: { color: '2A5F66' }, line: { color: '3C7A82', width: 1 },
  });
  s.addText('Sede: __________________________', {
    x: (W - 5.2) / 2, y: 4.68, w: 5.2, h: 0.3, fontSize: 14, color: C.white, align: 'center', fontFace: 'Calibri',
  });
  s.addText('Mantener este documento impreso y a la mano en recepción', {
    x: (W - 5.2) / 2, y: 5.02, w: 5.2, h: 0.3, fontSize: 10.5, color: C.well, align: 'center', italic: true, fontFace: 'Calibri',
  });
  s.addText('Versión 1.0 · Septiembre 2026', {
    x: 0, y: H - 0.85, w: W, h: 0.3, fontSize: 11, color: C.muted, align: 'center', fontFace: 'Calibri',
  });
}

// ═════════════════════════════════════════════ 2 · LO MÍNIMO QUE DEBES SABER
{
  const s = content('Antes de empezar', 'Lo mínimo que tienes que saber');
  const cw = (CW - 0.35) / 2;

  card(s, M, 1.55, cw, 2.15, C.cream);
  s.addText('PLAN URGENCIAS — $25.000/mes', { x: M + 0.3, y: 1.72, w: cw - 0.6, h: 0.3, fontSize: 14, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText([
    'Cubre SOLO urgencias y emergencias',
    'El tutor paga 20% del evento, P&P cubre el 80% con cargo a la bolsa',
    'Tope: $4.000.000 al año (la "bolsa")',
    'No incluye consultas ni vacunas',
  ].map(t => ({ text: t, options: { bullet: { code: '25AA' }, fontSize: 11.5, color: C.ink, breakLine: true } })), {
    x: M + 0.3, y: 2.08, w: cw - 0.6, h: 1.5, fontFace: 'Calibri', lineSpacing: 16, valign: 'top',
  });

  card(s, M + cw + 0.35, 1.55, cw, 2.15, C.cream);
  s.addText('PLAN TOTAL — $70.000/mes', { x: M + cw + 0.65, y: 1.72, w: cw - 0.6, h: 0.3, fontSize: 14, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText([
    'Todo lo del Plan Urgencias, MÁS:',
    '12 consultas al año · vacunas · 4 desparasitaciones',
    '1 panel de laboratorio · 1 imagen diagnóstica al año',
    'Descuentos en cirugías y procedimientos programados',
  ].map(t => ({ text: t, options: { bullet: { code: '25AA' }, fontSize: 11.5, color: C.ink, breakLine: true } })), {
    x: M + cw + 0.65, y: 2.08, w: cw - 0.6, h: 1.5, fontFace: 'Calibri', lineSpacing: 16, valign: 'top',
  });

  const bw = (CW - 0.3 * 2) / 3;
  const datos = [
    { t: '20%', d: 'Es lo que paga el tutor\nen una urgencia cubierta', c: C.blue },
    { t: '$4.000.000', d: 'Tope anual de la bolsa\n(igual en los dos planes)', c: C.blue },
    { t: '0 / 15 / 30', d: 'Días de carencia:\naccidente / enfermedad / ortopédico', c: C.red },
  ];
  datos.forEach((d, i) => {
    const x = M + i * (bw + 0.3);
    card(s, x, 3.95, bw, 1.35);
    s.addShape(pptx.ShapeType.rect, { x, y: 3.95, w: bw, h: 0.05, fill: { color: d.c } });
    s.addText(d.t, { x, y: 4.15, w: bw, h: 0.45, fontSize: 24, bold: true, color: d.c, align: 'center', fontFace: 'Calibri' });
    s.addText(d.d, { x: x + 0.15, y: 4.6, w: bw - 0.3, h: 0.6, fontSize: 11, color: C.ink, align: 'center', fontFace: 'Calibri', lineSpacing: 15 });
  });

  nota(s, M, 5.55, CW, 1.05, '⚠ Lo más importante de esta guía',
    'Nunca se inicia una atención bajo el plan sin verificar la bolsa y cobrar el copago. Y al mismo tiempo: NUNCA se niega atención estabilizadora a un animal por un tema administrativo. Primero se estabiliza, lo administrativo se resuelve en paralelo.',
    C.red, 'FDECEA');
}

// ═══════════════════════════════════════════════════ 3 · LOS 4 MOMENTOS
{
  const s = content('Mapa general', '¿Cuándo vas a usar este módulo?', 'Son solo 4 momentos. El resto lo hace el sistema solo.');
  const momentos = [
    { n: '1', t: 'Afiliar a alguien', d: 'Cuando vendes el plan: en la clínica o a alguien que escribió por redes.', q: 'Caja / Recepción', c: C.blue },
    { n: '2', t: 'Cobrar el pago', d: 'Generas el link de pago y se lo mandas al tutor. Si paga en efectivo, lo marcas a mano.', q: 'Caja', c: C.green },
    { n: '3', t: 'Revisar antes de atender', d: 'Verificar que esté al día, que pasó la carencia y que tenga bolsa disponible.', q: 'Recepción', c: C.amber },
    { n: '4', t: 'Registrar lo que usó', d: 'Una urgencia, un servicio programado con descuento, o un beneficio preventivo. TODO consume bolsa.', q: 'Recepción / Auxiliar', c: C.red },
  ];
  const bw = (CW - 0.3 * 3) / 4;
  momentos.forEach((m, i) => {
    const x = M + i * (bw + 0.3);
    card(s, x, 1.9, bw, 3.3);
    s.addShape(pptx.ShapeType.rect, { x, y: 1.9, w: bw, h: 0.06, fill: { color: m.c } });
    s.addShape(pptx.ShapeType.ellipse, { x: x + (bw - 0.6) / 2, y: 2.18, w: 0.6, h: 0.6, fill: { color: m.c } });
    s.addText(m.n, { x: x + (bw - 0.6) / 2, y: 2.18, w: 0.6, h: 0.6, fontSize: 22, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addText(m.t, { x: x + 0.15, y: 2.92, w: bw - 0.3, h: 0.4, fontSize: 15, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri' });
    s.addText(m.d, { x: x + 0.2, y: 3.35, w: bw - 0.4, h: 1.0, fontSize: 11.5, color: C.ink, align: 'center', fontFace: 'Calibri', lineSpacing: 16, valign: 'top' });
    pill(s, x + (bw - 1.85) / 2, 4.62, 1.85, 0.3, m.q, C.gray, C.muted);
  });

  nota(s, M, 5.5, CW, 1.1, 'Lo que el sistema hace solo (no tienes que hacer nada)',
    'Cambiar el estado a "En gracia", "Suspendido" o "Cancelado" cuando alguien no paga  ·  Descontar la bolsa cuando registras un evento  ·  Reiniciar la bolsa y los beneficios cada año  ·  Extender la cobertura cuando el tutor paga por el link.',
    C.green, 'EAF7EF');
}

// ═══════════════════════════════════════════════════ 4 · CÓMO ENTRAR
{
  const s = content('Paso 0', 'Cómo entrar al módulo');

  screenFrame(s, M, 1.7, 7.4, 3.0, 'sofvetpp.netlify.app/prueba/prepagada');
  card(s, M + 0.25, 2.15, 6.9, 2.4);
  s.addText('💳 Prepagada', { x: M + 0.45, y: 2.32, w: 3, h: 0.32, fontSize: 15, bold: true, color: C.ink, fontFace: 'Calibri' });
  s.addText('23 afiliados · 14 activos · 5 en gracia · 4 suspendidos', {
    x: M + 0.45, y: 2.64, w: 4.5, h: 0.26, fontSize: 9.5, color: C.muted, fontFace: 'Calibri',
  });
  btn(s, M + 5.35, 2.32, 1.65, 0.36, '+ Afiliar mascota', C.blue);
  input(s, M + 0.45, 3.05, 3.4, 0.34, '🔍 Buscar por mascota, tutor o cédula...', { placeholder: true });

  s.addShape(pptx.ShapeType.rect, { x: M + 0.45, y: 3.55, w: 6.5, h: 0.3, fill: { color: 'F7F9FC' } });
  ['MASCOTA', 'TITULAR', 'PLAN', 'ESTADO', 'BOLSA', 'VENCE'].forEach((h, i) => {
    s.addText(h, { x: M + 0.55 + i * 1.08, y: 3.55, w: 1.05, h: 0.3, fontSize: 7, bold: true, color: C.muted, valign: 'middle', fontFace: 'Calibri' });
  });
  [['🐾 PAQUITO', 'GUILLERMO O.', 'Total', 'Activo', '$4.000.000', '21/10/26'],
  ['🐾 FIONA', 'RUBEN CUMBE', 'Total', 'En gracia', '$4.000.000', '08/12/26']].forEach((r, ri) => {
    const ry = 3.9 + ri * 0.32;
    r.forEach((v, i) => {
      s.addText(v, { x: M + 0.55 + i * 1.08, y: ry, w: 1.05, h: 0.3, fontSize: 7.5, color: C.ink, valign: 'middle', fontFace: 'Calibri' });
    });
  });
  marca(s, 1, M + 6.75, 2.28);
  marca(s, 2, M + 3.6, 3.0);
  marca(s, 3, M + 6.45, 3.88);

  const px = M + 8.0, pw = CW - 8.0;
  pasos(s, px, 1.95, pw, [
    { n: 1, t: 'Entra por el link directo', d: 'sofvetpp.netlify.app/prueba/prepagada\nGuárdalo en favoritos. Por ahora no aparece en el menú lateral.' },
    { n: 2, t: 'Busca al afiliado', d: 'Puedes buscar por nombre de la mascota, nombre del tutor o cédula.' },
    { n: 3, t: 'Haz clic en la fila', d: 'Te lleva a la ficha completa del afiliado: bolsa, beneficios y eventos.' },
  ], { descH: 0.62 });

  nota(s, M, 5.05, 7.4, 0.95, 'Si no te carga', 'Recarga con Ctrl + Shift + R. Si sigue sin cargar, avisa a gerencia antes de decirle al tutor que no tiene plan.', C.blue, 'EEF4FF');
}

// ═══════════════════════════════════ 5 · PASO 1 — AFILIAR (CLIENTE EXISTENTE)
{
  const s = content('Paso 1 · Afiliar', 'Afiliar a un cliente que YA está en SofVet');

  screenFrame(s, M, 1.65, 6.6, 4.3);
  card(s, M + 0.5, 1.95, 5.6, 3.75);
  s.addShape(pptx.ShapeType.rect, { x: M + 0.5, y: 1.95, w: 5.6, h: 0.45, fill: { color: C.white } });
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
    { t: 'Clic en "+ Afiliar mascota" y escribe el nombre o la cédula', d: 'Con escribir 2 letras ya empieza a buscar. Busca en TODOS los clientes de SofVet, de cualquier sede.' },
    { t: 'Selecciona al cliente correcto', d: 'Verifica la cédula, no solo el nombre — hay nombres repetidos. Si te equivocas, luego puedes darle "Cambiar".' },
    { t: 'Si no aparece, es cliente nuevo', d: 'Usa "+ Crear cliente nuevo" y sigue la página siguiente de esta guía.' },
  ], { descH: 0.75, gap: 0.16 });

  nota(s, px, 5.65, pw, 0.85, 'Ojo', 'Si el cliente aparece pero su mascota no, puedes registrarla sin salir de aquí (paso siguiente).', C.amber);
}

// ═══════════════════════════════════ 6 · PASO 1B — CLIENTE NUEVO
{
  const s = content('Paso 1 · Afiliar', 'Si el cliente NO existe todavía', 'Típico de alguien que escribió por Instagram o WhatsApp y nunca ha venido.');

  screenFrame(s, M, 1.85, 6.6, 4.4);
  card(s, M + 0.5, 2.1, 5.6, 3.95);
  s.addText('Cliente nuevo', { x: M + 0.7, y: 2.2, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.blue, fontFace: 'Calibri' });
  s.addText('← Volver a buscar', { x: M + 4.3, y: 2.2, w: 1.6, h: 0.3, fontSize: 8.5, bold: true, color: C.muted, align: 'right', fontFace: 'Calibri' });

  label(s, M + 0.7, 2.58, 3, 'Nombre completo *');
  input(s, M + 0.7, 2.78, 5.2, 0.34, 'MARCELA RIOS GÓMEZ');

  label(s, M + 0.7, 3.2, 2, 'Cédula *');
  input(s, M + 0.7, 3.4, 2.5, 0.34, '1144556677');
  label(s, M + 3.4, 3.2, 2, 'Teléfono *');
  input(s, M + 3.4, 3.4, 2.5, 0.34, '3155551234');

  label(s, M + 0.7, 3.82, 3, 'Correo');
  input(s, M + 0.7, 4.02, 5.2, 0.34, 'marcela@email.com');

  label(s, M + 0.7, 4.44, 3, '¿Cómo nos conoció? *');
  input(s, M + 0.7, 4.64, 5.2, 0.34, 'Instagram/Facebook/TikTok   ▾');

  btn(s, M + 0.7, 5.15, 5.2, 0.42, 'Crear cliente y continuar', C.blue);

  marca(s, 1, M + 5.55, 2.74);
  marca(s, 2, M + 5.55, 4.6);
  marca(s, 3, M + 5.55, 5.12);

  const px = M + 7.2, pw = CW - 7.2;
  pasos(s, px, 2.0, pw, [
    { t: 'Llena nombre, cédula y teléfono', d: 'Los tres son obligatorios. La cédula es la llave para encontrarlo después y para que él entre al portal.' },
    { t: 'No olvides "¿Cómo nos conoció?"', d: 'Es obligatorio y sirve para saber qué canal de venta funciona. Si eliges "Otro", escribe brevemente cuál.' },
    { t: 'Crear cliente y continuar', d: 'Queda creado en SofVet igual que desde el módulo de Clientes. Después te pide registrar la mascota.' },
  ], { descH: 0.75, gap: 0.16 });

  nota(s, px, 5.85, pw, 0.85, 'Antes de crear, busca bien', 'Si ya existe con otra escritura del nombre y lo creas de nuevo, quedan dos fichas del mismo tutor. El sistema te avisa si la cédula ya existe.', C.red, 'FDECEA');
}

// ═══════════════════════════════════ 7 · PASO 1C — PLAN Y CONFIRMAR
{
  const s = content('Paso 1 · Afiliar', 'Elegir la mascota, el plan y confirmar');

  screenFrame(s, M, 1.65, 6.6, 4.5);
  card(s, M + 0.5, 1.95, 5.6, 3.95);

  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.7, y: 2.1, w: 5.2, h: 0.45, rectRadius: 0.05, fill: { color: 'EEF6F6' }, line: { color: 'BFE0E0', width: 1 } });
  s.addText('ANA CAMPO MEJIA', { x: M + 0.85, y: 2.14, w: 3, h: 0.22, fontSize: 10, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText('CC 1144067890', { x: M + 0.85, y: 2.34, w: 3, h: 0.18, fontSize: 8, color: C.muted, fontFace: 'Calibri' });
  s.addText('Cambiar', { x: M + 5.1, y: 2.1, w: 0.7, h: 0.45, fontSize: 8.5, bold: true, color: C.blue, align: 'right', valign: 'middle', fontFace: 'Calibri' });

  label(s, M + 0.7, 2.66, 2, 'Mascota');
  btn(s, M + 0.7, 2.86, 5.2, 0.36, '🐾 LUNA — Perro', C.blue, C.white, { fontSize: 10 });
  btn(s, M + 0.7, 3.28, 5.2, 0.36, '🐾 MICHI — Gato', C.gray, C.ink, { borderColor: C.softGray, fontSize: 10 });
  btn(s, M + 0.7, 3.7, 5.2, 0.34, '+ Registrar mascota nueva', C.white, C.blue, { borderColor: C.blue, dash: true, fontSize: 9 });

  label(s, M + 0.7, 4.16, 2, 'Plan');
  btn(s, M + 0.7, 4.36, 2.5, 0.42, 'Urgencias', C.white, C.ink, { borderColor: C.border, fontSize: 11 });
  btn(s, M + 3.4, 4.36, 2.5, 0.42, 'Total', C.blue, C.white, { fontSize: 11 });

  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.7, y: 4.92, w: 5.2, h: 0.62, rectRadius: 0.05, fill: { color: 'FFF8E1' }, line: { color: 'F0D98C', width: 1 } });
  s.addText('PRECIO MENSUAL (MASCOTA #2 DEL TITULAR)', { x: M + 0.85, y: 4.96, w: 4.9, h: 0.2, fontSize: 7, bold: true, color: '8A6D00', fontFace: 'Calibri' });
  s.addText('$ 56.000', { x: M + 0.85, y: 5.14, w: 4.9, h: 0.34, fontSize: 17, bold: true, color: C.ink, fontFace: 'Calibri' });

  btn(s, M + 0.7, 5.62, 5.2, 0.4, 'Afiliar', C.blue);

  marca(s, 1, M + 5.55, 2.82);
  marca(s, 2, M + 5.55, 4.32);
  marca(s, 3, M + 5.55, 4.95);

  const px = M + 7.2, pw = CW - 7.2;
  pasos(s, px, 1.8, pw, [
    { t: 'Elige la mascota que se va a afiliar', d: 'Cada afiliación cubre UNA sola mascota. Si quiere afiliar dos, se hacen dos afiliaciones separadas.' },
    { t: 'Elige el plan: Urgencias o Total', d: 'Explícale bien la diferencia antes de elegir. El Plan Total es el que incluye consultas y vacunas.' },
    { t: 'Verifica el precio y dale "Afiliar"', d: 'El precio sale solo. Si el tutor ya tiene otra mascota afiliada, aplica el descuento automáticamente (2ª mascota 20%, 3ª 30%...).' },
  ], { descH: 0.85, gap: 0.14 });

  nota(s, px, 5.9, pw, 0.8, 'Después de afiliar', 'El sistema te lleva directo a la ficha del afiliado, donde vas a generar el link de pago.', C.green, 'EAF7EF');
}

// ═══════════════════════════════════ · EXAMEN INICIAL OBLIGATORIO
{
  const s = content('Paso 1 · Afiliar', 'El examen inicial es obligatorio',
    'Es lo que protege el plan de que se afilien mascotas que ya vienen enfermas. Sin él, la cobertura puede negarse.');

  const cw = (CW - 0.4) / 2;
  card(s, M, 1.95, cw, 2.5, C.cream);
  s.addText('LA REGLA', { x: M + 0.35, y: 2.15, w: cw - 0.7, h: 0.28, fontSize: 10.5, bold: true, color: C.brown, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText([
    'La mascota debe tener un examen clínico completo hecho en P&P',
    'Dentro de los 12 meses ANTES de afiliarse, o los 30 días DESPUÉS',
    'Lo paga el tutor — no va incluido en el plan',
    'Si no se hace, la cobertura se puede reducir o negar',
  ].map(t => ({ text: t, options: { bullet: { code: '25AA' }, fontSize: 12, color: C.ink, breakLine: true } })), {
    x: M + 0.35, y: 2.5, w: cw - 0.7, h: 1.8, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  card(s, M + cw + 0.4, 1.95, cw, 2.5, 'FDECEA');
  s.addText('LO QUE APAREZCA AHÍ, QUEDA EXCLUIDO', { x: M + cw + 0.75, y: 2.15, w: cw - 0.7, h: 0.28, fontSize: 10.5, bold: true, color: C.red, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText('Toda enfermedad, signo clínico o condición que el veterinario encuentre en ese examen queda por fuera de la cobertura para siempre, y también todo lo que se derive de ella.\n\nPor eso hay que explicárselo al tutor ANTES de que pague, no después.', {
    x: M + cw + 0.75, y: 2.5, w: cw - 0.7, h: 1.8, fontSize: 12, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  s.addText('Cómo se lo explicas al tutor:', { x: M, y: 4.65, w: CW, h: 0.3, fontSize: 13, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 5.0, w: CW, h: 1.0, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.blue, width: 1.25 } });
  s.addText('"Para activar el plan necesitamos hacerle un chequeo completo. Es una consulta normal que tú pagas aparte. Sirve para dejar por escrito cómo está hoy tu mascota: todo lo que ya tenga desde antes no entra en el plan, pero todo lo que le pase de aquí en adelante sí."', {
    x: M + 0.35, y: 5.12, w: CW - 0.7, h: 0.8, fontSize: 12.5, italic: true, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'middle',
  });

  nota(s, M, 6.15, CW, 0.8, 'Aprovéchalo', 'Ese examen es una consulta que factura normal. No es un costo del plan, es una venta más — y de paso te deja la historia clínica al día.', C.green, 'EAF7EF');
}

// ═══════════════════════════════════ 8 · PASO 2 — COBRAR EL PRIMER PAGO
{
  const s = content('Paso 2 · Cobrar', 'Cobrar el primer pago: generar el link', 'Este es el paso que más se olvida. Sin pago, el plan no arranca.');

  screenFrame(s, M, 1.9, 7.6, 2.75);
  card(s, M + 0.3, 2.2, 7.0, 2.2);

  s.addText('🐾 LUNA', { x: M + 0.5, y: 2.35, w: 1.5, h: 0.3, fontSize: 15, bold: true, color: C.ink, fontFace: 'Calibri' });
  pill(s, M + 1.85, 2.4, 0.75, 0.22, 'Activo', 'EAFAF0', C.green);
  pill(s, M + 2.7, 2.4, 0.9, 0.22, 'Plan Total', 'EEF6F6', C.deep);
  s.addText('Titular: ANA CAMPO MEJIA · $56.000/mes · Vence 22/10/2026', {
    x: M + 0.5, y: 2.68, w: 5, h: 0.24, fontSize: 9, color: C.muted, fontFace: 'Calibri',
  });

  btn(s, M + 3.75, 2.33, 1.75, 0.38, '💳 Generar link de pago', 'EEF4FF', C.linkBlue, { borderColor: C.linkBlue, fontSize: 9 });
  btn(s, M + 5.6, 2.33, 1.15, 0.38, '✅ Marcar pagado', 'EAFAF0', C.green, { borderColor: C.green, fontSize: 8 });

  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.5, y: 3.1, w: 6.6, h: 0.65, rectRadius: 0.06, fill: { color: C.linkBg }, line: { color: C.linkBlue, width: 1 } });
  s.addText('Link de pago:', { x: M + 0.65, y: 3.1, w: 1.0, h: 0.65, fontSize: 9, bold: true, color: C.linkBlue, valign: 'middle', fontFace: 'Calibri' });
  s.addText('checkout.wompi.co/p/?public-key=pub_prod_5PzCK...&amount-in-cents=5600000', {
    x: M + 1.65, y: 3.1, w: 4.4, h: 0.65, fontSize: 8, color: C.linkBlue, valign: 'middle', fontFace: 'Calibri',
  });
  btn(s, M + 6.15, 3.25, 0.8, 0.35, 'Copiar', C.linkBlue, C.white, { fontSize: 9 });

  marca(s, 1, M + 4.45, 2.16);
  marca(s, 2, M + 6.25, 3.02);

  const px = M + 8.4, pw = CW - 8.4;
  pasos(s, px, 2.0, pw, [
    { t: 'Clic en "💳 Generar link de pago"', d: 'El link se crea con el valor exacto del plan del afiliado. No tienes que escribir el monto.' },
    { t: 'Copia el link y mándaselo', d: 'Por WhatsApp, correo, o muéstraselo en pantalla para que pague ahí mismo con el celular.' },
  ], { descH: 0.7, gap: 0.18 });

  s.addText('El tutor puede pagar con:', { x: px, y: 4.55, w: pw, h: 0.28, fontSize: 12, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText([
    'Tarjeta débito o crédito', 'Nequi', 'DaviPlata', 'QR de su banco', 'Transferencia Bancolombia / PSE',
  ].map(t => ({ text: t, options: { bullet: { code: '25AA' }, fontSize: 11.5, color: C.ink, breakLine: true } })), {
    x: px, y: 4.85, w: pw, h: 1.3, fontFace: 'Calibri', lineSpacing: 16, valign: 'top',
  });

  nota(s, M, 4.95, 7.6, 1.3, '✓ Cuando el tutor paga, no tienes que hacer NADA más',
    'La pasarela le avisa sola a SofVet y el sistema extiende la cobertura de una vez. No tienes que marcar nada a mano ni avisarle a nadie. Si quieres confirmar, recarga la ficha y mira que la fecha de "Vence" se haya corrido un mes.',
    C.green, 'EAF7EF');
}

// ═══════════════════════════════════ 9 · PASO 2B — EFECTIVO
{
  const s = content('Paso 2 · Cobrar', 'Si el tutor paga en efectivo o transferencia directa');

  const cw = (CW - 0.4) / 2;
  card(s, M, 1.7, cw, 2.5, C.cream);
  s.addText('Cuándo usar "✅ Marcar pagado"', { x: M + 0.35, y: 1.9, w: cw - 0.7, h: 0.35, fontSize: 15, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText([
    'El tutor llegó a caja y pagó en efectivo',
    'Hizo una transferencia directa a la cuenta de P&P',
    'Hubo un problema con la pasarela y ya te confirmó el pago por otro medio',
  ].map(t => ({ text: t, options: { bullet: { code: '2713' }, fontSize: 12, color: C.ink, breakLine: true } })), {
    x: M + 0.35, y: 2.32, w: cw - 0.7, h: 1.6, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  card(s, M + cw + 0.4, 1.7, cw, 2.5, 'FDECEA');
  s.addText('Cuándo NO usarlo', { x: M + cw + 0.75, y: 1.9, w: cw - 0.7, h: 0.35, fontSize: 15, bold: true, color: C.red, fontFace: 'Calibri' });
  s.addText([
    'Porque el tutor "dijo" que ya pagó pero no lo confirmaste',
    'Para darle unos días mientras consigue la plata',
    'Como atajo para no mandar el link',
  ].map(t => ({ text: t, options: { bullet: { code: '2715' }, fontSize: 12, color: C.ink, breakLine: true } })), {
    x: M + cw + 0.75, y: 2.32, w: cw - 0.7, h: 1.6, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  s.addText('Qué hace el botón exactamente:', { x: M, y: 4.45, w: CW, h: 0.3, fontSize: 14, bold: true, color: C.deep, fontFace: 'Calibri' });
  const bw = (CW - 0.3 * 2) / 3;
  [
    { t: 'Corre el vencimiento 1 mes', d: 'Desde la fecha de vencimiento actual, o desde hoy si ya estaba vencido.' },
    { t: 'Pone el estado en "Activo"', d: 'Aunque estuviera en gracia o suspendido.' },
    { t: 'No genera factura', d: 'La factura la haces aparte en SIIGO, como siempre.' },
  ].forEach((it, i) => {
    const x = M + i * (bw + 0.3);
    card(s, x, 4.85, bw, 1.15);
    s.addText(it.t, { x: x + 0.2, y: 5.0, w: bw - 0.4, h: 0.3, fontSize: 12.5, bold: true, color: C.blue, fontFace: 'Calibri' });
    s.addText(it.d, { x: x + 0.2, y: 5.3, w: bw - 0.4, h: 0.6, fontSize: 11, color: C.ink, fontFace: 'Calibri', lineSpacing: 15, valign: 'top' });
  });

  nota(s, M, 6.25, CW, 0.75, 'Meta', 'Que este botón casi no se use. Lo normal debe ser que el tutor pague solo por el link o desde su portal.', C.amber);
}

// ═══════════════════════════════════ 10 · PASO 3 — REVISAR ESTADO Y BOLSA
{
  const s = content('Paso 3 · Revisar', 'Revisar el estado y la bolsa antes de atender');

  screenFrame(s, M, 1.65, 7.3, 4.6);
  card(s, M + 0.3, 1.95, 6.7, 4.15);

  s.addText('🐾 LUNA', { x: M + 0.5, y: 2.1, w: 1.5, h: 0.3, fontSize: 14, bold: true, color: C.ink, fontFace: 'Calibri' });
  pill(s, M + 1.75, 2.15, 0.75, 0.22, 'Activo', 'EAFAF0', C.green);
  s.addText('Titular: ANA CAMPO · $56.000/mes · Afiliado desde 22/09/2026 · Vence 22/10/2026', {
    x: M + 0.5, y: 2.42, w: 5.6, h: 0.22, fontSize: 8.5, color: C.muted, fontFace: 'Calibri',
  });

  // Bolsa
  card(s, M + 0.5, 2.78, 6.3, 0.85);
  s.addText('BOLSA DE URGENCIAS 2026', { x: M + 0.65, y: 2.88, w: 3, h: 0.22, fontSize: 8, bold: true, color: '5C6470', fontFace: 'Calibri' });
  s.addText('$2.920.000 disponibles de $4.000.000', { x: M + 3.7, y: 2.88, w: 3.0, h: 0.22, fontSize: 8.5, bold: true, color: C.ink, align: 'right', fontFace: 'Calibri' });
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.65, y: 3.18, w: 6.0, h: 0.16, rectRadius: 0.08, fill: { color: C.softGray } });
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.65, y: 3.18, w: 1.62, h: 0.16, rectRadius: 0.08, fill: { color: C.blue } });

  // Beneficios
  card(s, M + 0.5, 3.76, 6.3, 1.55);
  s.addText('BENEFICIOS PREVENTIVOS 2026', { x: M + 0.65, y: 3.85, w: 3, h: 0.22, fontSize: 8, bold: true, color: '5C6470', fontFace: 'Calibri' });
  [['Consultas médicas', '3/12'], ['Vacunas anuales', '1/1 AGOTADO'], ['Desparasitaciones', '1/4']].forEach((r, i) => {
    const ry = 4.12 + i * 0.38;
    const agot = r[1].includes('AGOTADO');
    s.addShape(pptx.ShapeType.roundRect, { x: M + 0.65, y: ry, w: 6.0, h: 0.32, rectRadius: 0.05, fill: { color: agot ? 'FDECEA' : C.gray } });
    s.addText(r[0], { x: M + 0.8, y: ry, w: 3, h: 0.32, fontSize: 9, bold: true, color: C.ink, valign: 'middle', fontFace: 'Calibri' });
    s.addText(r[1], { x: M + 4.3, y: ry, w: 1.5, h: 0.32, fontSize: 9, bold: true, color: agot ? C.red : C.ink, align: 'right', valign: 'middle', fontFace: 'Calibri' });
    s.addShape(pptx.ShapeType.ellipse, { x: M + 5.95, y: ry + 0.05, w: 0.22, h: 0.22, fill: { color: C.white }, line: { color: C.border, width: 0.75 } });
    s.addText('−', { x: M + 5.95, y: ry + 0.05, w: 0.22, h: 0.22, fontSize: 9, color: C.ink, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addShape(pptx.ShapeType.ellipse, { x: M + 6.25, y: ry + 0.05, w: 0.22, h: 0.22, fill: { color: agot ? 'CCCCCC' : C.blue } });
    s.addText('+', { x: M + 6.25, y: ry + 0.05, w: 0.22, h: 0.22, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri' });
  });

  marca(s, 1, M + 2.3, 2.1);
  marca(s, 2, M + 6.5, 2.82);
  marca(s, 3, M + 6.55, 4.05);

  const px = M + 8.15, pw = CW - 8.15;
  pasos(s, px, 1.8, pw, [
    { t: 'Mira el estado (la etiqueta de color)', d: 'Solo "Activo" y "En gracia" tienen cobertura. Ver la tabla de estados más adelante.' },
    { t: 'Mira cuánta bolsa le queda', d: 'Si el evento cuesta más de lo que queda, aplica el procedimiento de bolsa agotada.' },
    { t: 'Revisa los beneficios (Plan Total)', d: 'Si dice AGOTADO, ese beneficio ya lo usó este año y se cobra a tarifa regular.' },
  ], { descH: 0.72, gap: 0.14 });

  nota(s, px, 5.5, pw, 1.1, 'También revisa la carencia',
    'Mira "Afiliado desde". Accidentes cubren desde el día 1; enfermedad desde el día 16; ortopédico desde el día 31. El preventivo del Plan Total aplica desde el día 1.',
    C.red, 'FDECEA');
}

// ═══════════════════════════════════ 11 · PASO 4 — REGISTRAR EVENTO
{
  const s = content('Paso 4 · Registrar', 'Registrar un evento de urgencia y cobrar el copago');

  screenFrame(s, M, 1.65, 5.9, 4.7);
  card(s, M + 0.55, 1.95, 4.8, 4.15);
  s.addShape(pptx.ShapeType.rect, { x: M + 0.55, y: 1.95, w: 4.8, h: 0.55, fill: { color: C.white } });
  s.addText('🚨 Registrar evento de urgencia', { x: M + 0.75, y: 2.0, w: 4, h: 0.28, fontSize: 11.5, bold: true, color: C.red, fontFace: 'Calibri' });
  s.addText('LUNA', { x: M + 0.75, y: 2.26, w: 4, h: 0.2, fontSize: 8.5, color: C.muted, fontFace: 'Calibri' });
  s.addShape(pptx.ShapeType.line, { x: M + 0.55, y: 2.5, w: 4.8, h: 0, line: { color: C.softGray, width: 1 } });

  label(s, M + 0.75, 2.62, 3, 'Motivo / tipo de evento');
  input(s, M + 0.75, 2.82, 4.4, 0.34, 'Trauma por atropello');

  label(s, M + 0.75, 3.26, 3, 'Costo total del evento *');
  input(s, M + 0.75, 3.46, 4.4, 0.34, '500000', { focus: true });

  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.75, y: 3.92, w: 4.4, h: 0.98, rectRadius: 0.05, fill: { color: C.gray } });
  [['Paga el tutor (20%)', '$100.000'], ['Asume P&P (80%) — sale de la bolsa', '$400.000'], ['Bolsa después de este evento', '$2.520.000']].forEach((r, i) => {
    const ry = 4.0 + i * 0.3;
    s.addText(r[0], { x: M + 0.9, y: ry, w: 2.9, h: 0.26, fontSize: 8.5, color: C.ink, valign: 'middle', fontFace: 'Calibri' });
    s.addText(r[1], { x: M + 3.7, y: ry, w: 1.3, h: 0.26, fontSize: 8.5, bold: true, color: i === 0 ? C.red : C.ink, align: 'right', valign: 'middle', fontFace: 'Calibri' });
  });

  label(s, M + 0.75, 5.0, 3, 'Factura del copago (opcional)');
  input(s, M + 0.75, 5.2, 4.4, 0.32, 'FV-10234');

  btn(s, M + 0.75, 5.62, 1.4, 0.36, 'Cancelar', C.white, C.ink, { borderColor: C.border, fontSize: 9 });
  btn(s, M + 2.3, 5.62, 2.85, 0.36, 'Registrar evento', C.red, C.white, { fontSize: 9.5 });

  marca(s, 2, M + 4.85, 3.4);
  marca(s, 3, M + 4.85, 3.86);
  marca(s, 4, M + 4.85, 5.56);

  const px = M + 6.5, pw = CW - 6.5;
  s.addText('Orden correcto — no te lo saltes:', { x: px, y: 1.72, w: pw, h: 0.3, fontSize: 13, bold: true, color: C.deep, fontFace: 'Calibri' });
  pasos(s, px, 2.05, pw, [
    { t: 'Pídele al veterinario el presupuesto', d: 'Él es el único que decide si el caso es una urgencia cubierta por el plan, y cuánto va a costar.' },
    { t: 'Marca si fue urgencia o programado', d: 'Urgencia = copago 20%. Programado = el descuento que aplique. Escribe el costo TOTAL; el sistema calcula el resto.' },
    { t: 'Cobra al tutor ANTES de la atención', d: 'Efectivo, tarjeta o transferencia. Factura en SIIGO con el código COPAGO-PREP.' },
    { t: 'Guarda con "Registrar evento"', d: 'La bolsa se descuenta sola. Avisa al veterinario que ya puede iniciar.' },
  ], { descH: 0.52, gap: 0.05 });

  nota(s, px, 5.8, pw, 0.8, 'Si la bolsa no alcanza', 'El recuadro te muestra el saldo en rojo. Aplica el procedimiento de bolsa agotada (ver página de casos especiales).', C.amber);
}

// ═══════════════════════════════════ · PASO 4B — SERVICIOS PROGRAMADOS
{
  const s = content('Paso 4 · Registrar', 'Servicios programados: también consumen bolsa',
    'Esto es nuevo y es fácil de olvidar. Cuando le das un descuento del plan a un servicio NO urgente, esa plata también sale de la bolsa del afiliado.');

  const bw = (CW - 0.25 * 3) / 4;
  [
    { n: '1', t: 'Atiendes el servicio', d: 'Una radiografía programada, consulta con especialista, profilaxis, hospitalización programada, etc.' },
    { n: '2', t: 'Facturas en SIIGO', d: 'Como siempre, con el descuento del plan aplicado. El tutor paga solo su parte.' },
    { n: '3', t: 'Entras a Prepagada en SofVet', d: 'Buscas al paciente y le das a "+ Registrar evento" en su ficha.' },
    { n: '4', t: 'Marcas "📅 Programado"', d: 'Eliges el % de descuento que aplicaste y escribes el costo total. La bolsa se descuenta sola.' },
  ].forEach((p, i) => {
    const x = M + i * (bw + 0.25);
    card(s, x, 2.0, bw, 2.35);
    s.addShape(pptx.ShapeType.ellipse, { x: x + (bw - 0.55) / 2, y: 2.25, w: 0.55, h: 0.55, fill: { color: C.blue } });
    s.addText(p.n, { x: x + (bw - 0.55) / 2, y: 2.25, w: 0.55, h: 0.55, fontSize: 19, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addText(p.t, { x: x + 0.15, y: 2.88, w: bw - 0.3, h: 0.45, fontSize: 12.5, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri' });
    s.addText(p.d, { x: x + 0.18, y: 3.35, w: bw - 0.36, h: 0.9, fontSize: 11, color: C.ink, align: 'center', fontFace: 'Calibri', lineSpacing: 15, valign: 'top' });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 4.55, w: CW, h: 1.15, rectRadius: 0.08, fill: { color: C.gray }, line: { color: C.border, width: 1 } });
  s.addText('EJEMPLO', { x: M + 0.35, y: 4.68, w: 2, h: 0.24, fontSize: 9.5, bold: true, color: C.muted, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText([
    { text: 'Radiografía programada de $200.000 con 60% de descuento del plan  →  ', options: { fontSize: 13, color: C.ink } },
    { text: 'el tutor paga $80.000', options: { fontSize: 13, bold: true, color: C.deep } },
    { text: '  y los  ', options: { fontSize: 13, color: C.ink } },
    { text: '$120.000 que asume P&P se descuentan de su bolsa anual.', options: { fontSize: 13, bold: true, color: C.red } },
  ], { x: M + 0.35, y: 4.95, w: CW - 0.7, h: 0.65, fontFace: 'Calibri', lineSpacing: 18, valign: 'middle' });

  nota(s, M, 5.9, CW, 1.05, '¿Por qué importa que lo registres?',
    'La bolsa de $4.000.000 es el tope de TODO lo que P&P aporta por esa mascota en el año, sea urgencia o no. Si no registras los servicios programados, la bolsa se ve con más saldo del que realmente tiene, y terminamos regalando plata que ya se había consumido.',
    C.amber);
}

// ═══════════════════════════════════ 12 · PASO 5 — BENEFICIOS PREVENTIVOS
{
  const s = content('Paso 5 · Registrar', 'Marcar un beneficio preventivo usado (solo Plan Total)', 'Cada vez que un afiliado del Plan Total usa una consulta, vacuna, desparasitación, laboratorio o imagen.');

  const cw = (CW - 0.45) / 2;
  screenFrame(s, M, 1.95, cw, 2.5);
  card(s, M + 0.3, 2.25, cw - 0.6, 2.0);
  s.addText('BENEFICIOS PREVENTIVOS 2026', { x: M + 0.5, y: 2.38, w: 3, h: 0.22, fontSize: 8.5, bold: true, color: '5C6470', fontFace: 'Calibri' });
  [['Consultas médicas', '3/12', false], ['Vacunas anuales', '1/1 AGOTADO', true], ['Desparasitaciones', '1/4', false], ['Panel de laboratorio', '0/1', false]].forEach((r, i) => {
    const ry = 2.66 + i * 0.37;
    s.addShape(pptx.ShapeType.roundRect, { x: M + 0.5, y: ry, w: cw - 1.0, h: 0.31, rectRadius: 0.05, fill: { color: r[2] ? 'FDECEA' : C.gray } });
    s.addText(r[0], { x: M + 0.65, y: ry, w: 2.2, h: 0.31, fontSize: 9.5, bold: true, color: C.ink, valign: 'middle', fontFace: 'Calibri' });
    s.addText(r[1], { x: M + 2.9, y: ry, w: 1.5, h: 0.31, fontSize: 9.5, bold: true, color: r[2] ? C.red : C.ink, align: 'right', valign: 'middle', fontFace: 'Calibri' });
    s.addShape(pptx.ShapeType.ellipse, { x: M + cw - 1.15, y: ry + 0.045, w: 0.22, h: 0.22, fill: { color: C.white }, line: { color: C.border, width: 0.75 } });
    s.addText('−', { x: M + cw - 1.15, y: ry + 0.045, w: 0.22, h: 0.22, fontSize: 9, color: C.ink, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addShape(pptx.ShapeType.ellipse, { x: M + cw - 0.85, y: ry + 0.045, w: 0.22, h: 0.22, fill: { color: r[2] ? 'CCCCCC' : C.blue } });
    s.addText('+', { x: M + cw - 0.85, y: ry + 0.045, w: 0.22, h: 0.22, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri' });
  });
  marca(s, 1, M + cw - 0.9, 2.58);
  marca(s, 2, M + cw - 1.2, 3.35);

  const px = M + cw + 0.45, pw = CW - cw - 0.45;
  pasos(s, px, 2.05, pw, [
    { t: 'Dale "+" al beneficio que acaba de usar', d: 'Se suma 1 al contador. Ejemplo: si vino a consulta preventiva, "+" en Consultas médicas.' },
    { t: 'Si te equivocas, dale "−"', d: 'Resta 1. No hay problema en corregir.' },
  ], { descH: 0.62, gap: 0.16 });

  card(s, px, 4.4, pw, 1.75, C.cream);
  s.addText('Los topes del Plan Total al año:', { x: px + 0.3, y: 4.55, w: pw - 0.6, h: 0.3, fontSize: 13, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText([
    '12 consultas médicas', '1 esquema de vacunación anual', '4 desparasitaciones',
    '1 panel de laboratorio', '1 imagen diagnóstica (Rx o ecografía)',
  ].map(t => ({ text: t, options: { bullet: { code: '25AA' }, fontSize: 12, color: C.ink, breakLine: true } })), {
    x: px + 0.3, y: 4.9, w: pw - 0.6, h: 1.2, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  nota(s, M, 4.7, cw, 1.35, 'Cuando dice AGOTADO',
    'Ese beneficio ya se usó completo este año. De ahí en adelante ese servicio se cobra a tarifa regular (o con el descuento del plan si aplica). Los beneficios se reinician solos el 1 de enero.',
    C.amber);
}

// ═══════════════════════════════════ · DESCUENTOS SERVICIO POR SERVICIO
{
  const s = content('Referencia', 'Descuentos del Plan Total, servicio por servicio',
    'Solo aplican al PLAN TOTAL · solo en procedimientos PROGRAMADOS (nunca dentro de una urgencia) · se calculan sobre la tarifa regular de P&P.');

  const dto = (t) => td(t, { align: 'center', bold: true, color: C.blue, fontSize: 13 });
  const rows = [
    [th('Servicio'), th('Dto.'), th('Ojo con esto')],
    [td('Cirugía programada de tejidos blandos', { bold: true }), dto('60%'), td('Programada, no la que sale de una urgencia.')],
    [td('Radiografías adicionales', { bold: true }), dto('60%'), td('Solo de la 2ª en adelante: la 1ª del año ya es gratis por beneficio preventivo.')],
    [td('Ecografías diagnósticas adicionales', { bold: true }), dto('60%'), td('Igual que las Rx: la primera imagen del año entra como beneficio.')],
    [td('Esterilización / castración', { bold: true }), dto('50%'), td('SOLO con remisión médica. Si el tutor la pide por su cuenta, NO aplica descuento.', { color: C.red })],
    [td('Tomografía (TAC)', { bold: true }), dto('50%'), td('—')],
    [td('Consulta con especialista', { bold: true }), dto('50%'), td('Cardiología, neurología, etc. No confundir con las 12 consultas generales incluidas.')],
    [td('Hospitalización programada', { bold: true }), dto('50%'), td('Programada. Si es por urgencia, va por copago del 20%.')],
    [td('Cirugía de especialista (ortopedia)', { bold: true }), dto('40%'), td('Aunque el trauma haya sido una urgencia, la cirugía de especialista va con descuento, no al 80%.', { color: C.red })],
    [td('Limpieza dental / profilaxis', { bold: true }), dto('40%'), td('—')],
    [td('Laboratorios adicionales', { bold: true }), dto('40%'), td('Del 2º panel del año en adelante: el 1º es gratis por beneficio preventivo.')],
    [td('Medicamentos de farmacia P&P', { bold: true }), dto('10%'), td('Aplica a la farmacia de la clínica. No hay descuento en petshop ni alimentos.')],
  ];
  s.addTable(rows, {
    x: M, y: 1.62, w: CW, colW: [3.9, 1.1, 6.83],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.4, valign: 'middle', autoPage: false,
  });

  s.addText('OJO: el descuento que da P&P también se descuenta de la bolsa del afiliado — por eso hay que registrarlo en SofVet. El Plan Urgencias no tiene ninguno de estos descuentos.', {
    x: M, y: 6.55, w: CW, h: 0.3, fontSize: 12, bold: true, color: C.red, fontFace: 'Calibri',
  });
}

// ═══════════════════════════════════ 13 · ESTADOS DEL AFILIADO
{
  const s = content('Referencia', 'Los estados del afiliado: qué significan y qué haces');
  const rows = [
    [th('Estado'), th('Qué pasó'), th('¿Tiene cobertura?'), th('Qué haces tú')],
    [td('🟢  Activo', { bold: true, color: C.green }), td('Está al día con el pago.'), td('SÍ', { align: 'center', bold: true, color: C.green }), td('Atender normal (verificando carencia y bolsa).')],
    [td('🟡  En gracia', { bold: true, color: C.amber }), td('Se le venció y van 5 días o menos.'), td('SÍ', { align: 'center', bold: true, color: C.green }), td('Atender normal, pero avísale que se le venció y ofrécele el link de pago.')],
    [td('🔴  Suspendido', { bold: true, color: C.red }), td('Lleva entre 6 y 29 días sin pagar.'), td('NO', { align: 'center', bold: true, color: C.red }), td('Se cobra tarifa regular. Si se pone al día hoy mismo, vuelve a quedar activo de inmediato.')],
    [td('⚫  Cancelado', { bold: true, color: C.muted }), td('Pasaron 30 días sin pago, o se dio de baja.'), td('NO', { align: 'center', bold: true, color: C.red }), td('Tarifa regular. Si quiere volver, se afilia de nuevo, con nuevas carencias y nuevo examen inicial.')],
  ];
  s.addTable(rows, {
    x: M, y: 1.6, w: CW, colW: [1.9, 3.1, 1.6, 5.23],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.72, valign: 'middle',
  });

  nota(s, M, 5.6, CW, 1.15, 'El estado cambia solo — no lo cambies a mano',
    'El sistema mueve el estado según la fecha de vencimiento, sin que nadie haga nada. El selector de estado de la ficha es solo para casos excepcionales autorizados por gerencia (por ejemplo, cancelar a alguien que pidió retirarse).',
    C.blue, 'EEF4FF');
}

// ═══════════════════════════════════ 14 · CASOS ESPECIALES
{
  const s = content('Referencia', 'Casos que te van a pasar');
  const rows = [
    [th('Situación'), th('Qué haces')],
    [td('"Yo tengo plan" pero no aparece en el módulo', { bold: true }), td('Búscalo por cédula, no por nombre. Si de verdad no está, se atiende como paciente regular y se escala a la coordinación de prepagada. No le prometas cobertura.')],
    [td('Recién afiliado y llega por urgencia', { bold: true }), td('Depende del tipo: un ACCIDENTE (atropello, intoxicación, cuerpo extraño) está cubierto desde el día 1. Una enfermedad necesita 15 días, y lo ortopédico 30. El preventivo del Plan Total aplica desde el día 1.')],
    [td('La bolsa no alcanza para el evento', { bold: true }), td('Explícale con calma que ya usó el tope anual. Ofrécele: pagar a tarifa regular, o pagar y descontarlo del próximo año. Si no puede pagar, escala a gerencia — el animal se estabiliza igual.')],
    [td('El veterinario dice que NO es urgencia cubierta', { bold: true }), td('Se cobra tarifa regular y él documenta el motivo en la historia. Si es Plan Total y le quedan consultas, puede ir como beneficio preventivo.')],
    [td('Llega con una mascota distinta a la afiliada', { bold: true }), td('El plan cubre solo a la mascota registrada. Se atiende a tarifa regular y le ofreces afiliar a esa otra mascota con descuento multimascota.')],
  ];
  s.addTable(rows, {
    x: M, y: 1.55, w: CW, colW: [3.9, 7.93],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.62, valign: 'middle', autoPage: false,
  });
  s.addText('Regla general: la decisión clínica la toma el veterinario, la decisión comercial se escala. Recepción nunca la resuelve por su cuenta.', {
    x: M, y: 5.75, w: CW, h: 0.4, fontSize: 12, color: C.muted, italic: true, fontFace: 'Calibri',
  });
}

// ═══════════════════════════════════ 15 · EL TUTOR PAGA SOLO
{
  const s = content('Para que sepas qué decirle', 'El tutor también puede pagar solo, desde su portal');

  screenFrame(s, M, 1.85, 6.4, 3.5, 'sofvetpp.netlify.app/portal');
  card(s, M + 0.35, 2.3, 5.7, 2.8);
  s.addText('🐾 LUNA', { x: M + 0.55, y: 2.45, w: 2, h: 0.3, fontSize: 13, bold: true, color: C.deep, fontFace: 'Calibri' });
  // tabs
  ['Resumen', '💳 Mi Plan', 'Consultas', 'Vacunas'].forEach((t, i) => {
    const tx = M + 0.55 + i * 1.3;
    s.addText(t, { x: tx, y: 2.8, w: 1.25, h: 0.3, fontSize: 9, bold: i === 1, color: i === 1 ? C.blue : C.muted, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    if (i === 1) s.addShape(pptx.ShapeType.rect, { x: tx, y: 3.07, w: 1.25, h: 0.035, fill: { color: C.blue } });
  });
  s.addShape(pptx.ShapeType.line, { x: M + 0.55, y: 3.1, w: 5.3, h: 0, line: { color: C.softGray, width: 1 } });

  pill(s, M + 0.55, 3.25, 0.8, 0.24, 'Al día', 'EAFAF0', C.green);
  s.addText('Plan Total · $56.000/mes · Vence 22 de octubre de 2026', {
    x: M + 1.45, y: 3.25, w: 4.2, h: 0.24, fontSize: 8.5, color: C.muted, valign: 'middle', fontFace: 'Calibri',
  });
  s.addText('PAGAR MI PLAN', { x: M + 0.55, y: 3.6, w: 3, h: 0.22, fontSize: 8, bold: true, color: C.deep, fontFace: 'Calibri' });
  [['1 mes', '$56.000', ''], ['3 meses', '$159.600', '5% dto.'], ['6 meses', '$285.600', '15% dto.']].forEach((o, i) => {
    const ox = M + 0.55 + i * 1.8;
    s.addShape(pptx.ShapeType.roundRect, { x: ox, y: 3.85, w: 1.65, h: 0.95, rectRadius: 0.06, fill: { color: C.white }, line: { color: i === 2 ? C.green : C.blue, width: i === 2 ? 1.75 : 1 } });
    s.addText(o[0], { x: ox, y: 3.95, w: 1.65, h: 0.22, fontSize: 9.5, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri' });
    s.addText(o[1], { x: ox, y: 4.17, w: 1.65, h: 0.3, fontSize: 13, bold: true, color: i === 2 ? C.green : C.blue, align: 'center', fontFace: 'Calibri' });
    if (o[2]) s.addText(o[2], { x: ox, y: 4.48, w: 1.65, h: 0.22, fontSize: 8, bold: true, color: C.green, align: 'center', fontFace: 'Calibri' });
  });

  const px = M + 7.0, pw = CW - 7.0;
  s.addText('Qué le dices al tutor:', { x: px, y: 1.95, w: pw, h: 0.3, fontSize: 14, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText([
    { text: '"Entras a sofvetpp.netlify.app/portal con tu cédula, le das a la pestaña Mi Plan de tu mascota, y ahí mismo pagas. Si pagas 3 o 6 meses de una, te sale más barato."', options: { fontSize: 13, italic: true, color: C.ink } },
  ], { x: px, y: 2.35, w: pw, h: 1.5, fontFace: 'Calibri', lineSpacing: 19, valign: 'top' });

  card(s, px, 3.95, pw, 1.75, C.cream);
  s.addText('Descuentos por pagar adelantado', { x: px + 0.25, y: 4.1, w: pw - 0.5, h: 0.3, fontSize: 12.5, bold: true, color: C.deep, fontFace: 'Calibri' });
  s.addText([
    '1 mes — sin descuento',
    '3 meses — 5% de descuento',
    '6 meses — 15% de descuento',
  ].map(t => ({ text: t, options: { bullet: { code: '25AA' }, fontSize: 12, color: C.ink, breakLine: true } })), {
    x: px + 0.25, y: 4.45, w: pw - 0.5, h: 1.1, fontFace: 'Calibri', lineSpacing: 18, valign: 'top',
  });

  nota(s, M, 5.6, CW, 1.1, 'Esto te quita trabajo',
    'Mientras más tutores paguen solos desde el portal, menos links tienes que generar y menos cobros tienes que perseguir. Cuando un afiliado se queje de que no sabe cómo pagar, enséñale el portal — es el camino más fácil para los dos.',
    C.green, 'EAF7EF');
}

// ═══════════════════════════════════ 16 · CIERRE / PEGAR EN CAJA
{
  pageNo++;
  const s = pptx.addSlide();
  s.background = { color: C.cream };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.16, fill: { color: C.brown } });
  s.addImage({ path: LOGO_I_TEAL, x: W - 2.3, y: H - 2.6, w: 1.7, h: 2.11, transparency: 90 });

  s.addText('RESUMEN PARA PEGAR EN CAJA', {
    x: 0, y: 0.5, w: W, h: 0.4, fontSize: 12, bold: true, color: C.brown, align: 'center', charSpacing: 2.5, fontFace: 'Calibri',
  });
  s.addText('Las 6 cosas que no se te pueden olvidar', {
    x: 0, y: 0.88, w: W, h: 0.55, fontSize: 30, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri',
  });

  const reglas = [
    { n: '1', t: 'Verifica siempre por cédula', d: 'Nombre no basta: hay tutores con nombres parecidos.' },
    { n: '2', t: 'Revisa carencia y bolsa antes', d: 'Accidente día 0 · enfermedad 15 d · ortopédico 30 d · tope $4.000.000 al año.' },
    { n: '3', t: 'Cobra el copago ANTES de atender', d: '20% del costo total, factura con código COPAGO-PREP.' },
    { n: '4', t: 'Registra TODO el mismo día', d: 'Urgencias y también los servicios programados con descuento: los dos consumen bolsa.' },
    { n: '5', t: 'Manda el link de pago, no esperes', d: 'Y si el tutor sabe usar el portal, mejor: que pague él solo.' },
    { n: '6', t: 'Nunca niegues atención estabilizadora', d: 'Lo administrativo se resuelve después. El animal primero, siempre.' },
  ];
  const bw = (CW - 0.35 * 2) / 3, bh = 1.5;
  reglas.forEach((r, i) => {
    const x = M + (i % 3) * (bw + 0.35);
    const y = 1.75 + Math.floor(i / 3) * (bh + 0.35);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: bw, h: bh, rectRadius: 0.08,
      fill: { color: C.white }, line: { color: C.border, width: 1 },
    });
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.25, y: y + 0.25, w: 0.45, h: 0.45, fill: { color: C.blue } });
    s.addText(r.n, { x: x + 0.25, y: y + 0.25, w: 0.45, h: 0.45, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addText(r.t, { x: x + 0.82, y: y + 0.26, w: bw - 1.05, h: 0.45, fontSize: 13.5, bold: true, color: C.deep, fontFace: 'Calibri', valign: 'middle' });
    s.addText(r.d, { x: x + 0.28, y: y + 0.78, w: bw - 0.56, h: 0.6, fontSize: 11, color: C.ink, fontFace: 'Calibri', lineSpacing: 15, valign: 'top' });
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 5.3, w: CW, h: 0.9, rectRadius: 0.08,
    fill: { color: C.white }, line: { color: C.blue, width: 1.5 },
  });
  s.addText([
    { text: '¿Dudas?  ', options: { bold: true, fontSize: 14, color: C.deep } },
    { text: 'Llama a la coordinación de prepagada. En horario nocturno, al jefe de turno. Si es una decisión clínica, decide el veterinario. Si es comercial o una excepción, la autoriza gerencia.', options: { fontSize: 13, color: C.ink } },
  ], { x: M + 0.35, y: 5.42, w: CW - 0.7, h: 0.7, fontFace: 'Calibri', valign: 'middle', lineSpacing: 18 });

  s.addImage({ path: LOGO_W_TEAL, x: (W - 2.2) / 2, y: 6.45, w: 2.2, h: 0.34 });
  s.addText('Guía Prepagada · Pets & Pets', {
    x: M, y: H - 0.42, w: 5, h: 0.22, fontSize: 9, color: C.muted, fontFace: 'Calibri',
  });
  s.addText('Pág. ' + pageNo, {
    x: W - M - 0.9, y: H - 0.42, w: 0.9, h: 0.22, fontSize: 9, color: C.muted, align: 'right', fontFace: 'Calibri',
  });
}

const OUT = 'C:/Users/goedi/OneDrive/Desktop/SofVet/Prepagada/PetsPets_Prepagada_Guia_Personal.pptx';
await pptx.writeFile({ fileName: OUT });
console.log('Guía generada:', OUT);
console.log('Diapositivas:', pageNo + 1);
