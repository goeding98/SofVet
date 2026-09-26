import PptxGenJS from 'pptxgenjs';

const L = 'C:/Users/goedi/AppData/Local/Temp/claude/c--Users-goedi-OneDrive-Desktop-SofVet/2baa7cb7-4704-4bbe-abb8-126b526d66a2/scratchpad/logos';
const LOGO_W_TEAL = L + '/wordmark_teal.png';
const LOGO_W_WHITE = L + '/wordmark_white.png';
const LOGO_I_TEAL = L + '/icon_teal_trim.png';
const LOGO_I_WHITE = L + '/icon_white_trim.png';

const C = {
  blue: '316D74', deep: '1E4E54', brown: 'A6785B', well: '99B2AA',
  beige: 'F9E7D4', cream: 'FDF6EE', white: 'FFFFFF', ink: '2D2D2D',
  muted: '7A8B8E', line: 'E3E9E9', green: '1E7D45', amber: 'B8860B', red: 'C0392B',
};

const W = 13.333, H = 7.5;          // 16:9 widescreen
const M = 0.85;                      // margen lateral
const CW = W - M * 2;                // ancho de contenido

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Pets & Pets';
pptx.company = 'Pets & Pets';
pptx.title = 'Plan Prepagado Veterinario — Propuesta a Junta Directiva';

let pageNo = 0;

// ── Slide de contenido estándar ──────────────────────────────────────────────
function content(kicker, title) {
  pageNo++;
  const s = pptx.addSlide();
  s.background = { color: C.white };

  // Barra superior
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.09, fill: { color: C.blue } });

  // Kicker + título
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: M, y: 0.42, w: CW - 1.6, h: 0.26,
      fontSize: 11, bold: true, color: C.brown, charSpacing: 2, fontFace: 'Calibri',
    });
  }
  s.addText(title, {
    x: M, y: kicker ? 0.7 : 0.55, w: CW - 1.6, h: 0.6,
    fontSize: 28, bold: true, color: C.deep, fontFace: 'Calibri',
  });

  // Logo isotipo arriba a la derecha
  s.addImage({ path: LOGO_I_TEAL, x: W - M - 0.42, y: 0.42, w: 0.42, h: 0.52 });

  // Pie
  s.addText('Pets & Pets · Plan Prepagado Veterinario', {
    x: M, y: H - 0.48, w: 5, h: 0.25, fontSize: 9, color: C.muted, fontFace: 'Calibri',
  });
  s.addText(String(pageNo), {
    x: W - M - 0.5, y: H - 0.48, w: 0.5, h: 0.25,
    fontSize: 9, color: C.muted, align: 'right', fontFace: 'Calibri',
  });
  return s;
}

// ── Tarjeta KPI ──────────────────────────────────────────────────────────────
function kpi(s, { x, y, w, h, label, value, sub, accent = C.blue, fill = C.cream }) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: fill }, line: { color: C.line, width: 0.75 },
  });
  s.addShape(pptx.ShapeType.rect, { x, y, w: 0.055, h, fill: { color: accent } });
  s.addText(label.toUpperCase(), {
    x: x + 0.25, y: y + 0.16, w: w - 0.45, h: 0.24,
    fontSize: 9.5, bold: true, color: C.muted, charSpacing: 1, fontFace: 'Calibri',
  });
  s.addText(value, {
    x: x + 0.25, y: y + 0.42, w: w - 0.45, h: 0.52,
    fontSize: 26, bold: true, color: accent, fontFace: 'Calibri',
  });
  if (sub) {
    s.addText(sub, {
      x: x + 0.25, y: y + h - 0.52, w: w - 0.45, h: 0.42,
      fontSize: 10.5, color: C.ink, fontFace: 'Calibri', valign: 'top',
    });
  }
}

const money = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const th = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.blue }, fontSize: 12, align: 'center', valign: 'middle' } });
const td = (t, o = {}) => ({ text: t, options: { fontSize: 12, color: C.ink, valign: 'middle', ...o } });

// ── Separador de sección ─────────────────────────────────────────────────────
function divider(num, title, subtitle) {
  pageNo++;
  const s = pptx.addSlide();
  s.background = { color: C.cream };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.28, h: H, fill: { color: C.blue } });
  s.addImage({ path: LOGO_I_TEAL, x: W - 2.5, y: H - 2.9, w: 1.9, h: 2.36, transparency: 88 });

  s.addText(num, {
    x: 1.5, y: 2.5, w: 1.2, h: 1.1,
    fontSize: 72, bold: true, color: C.well, fontFace: 'Calibri',
  });
  s.addText(title, {
    x: 2.75, y: 2.62, w: W - 4.2, h: 0.85,
    fontSize: 38, bold: true, color: C.deep, fontFace: 'Calibri', valign: 'middle',
  });
  s.addShape(pptx.ShapeType.rect, { x: 2.82, y: 3.52, w: 1.3, h: 0.045, fill: { color: C.brown } });
  s.addText(subtitle, {
    x: 2.8, y: 3.72, w: W - 4.2, h: 0.5,
    fontSize: 15, color: C.muted, fontFace: 'Calibri',
  });
  return s;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · PORTADA
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.deep };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.16, fill: { color: C.brown } });
  // Marca de agua
  s.addImage({ path: LOGO_I_WHITE, x: W - 3.1, y: H - 3.5, w: 2.6, h: 3.23, transparency: 88 });

  s.addImage({ path: LOGO_W_WHITE, x: (W - 4.2) / 2, y: 1.45, w: 4.2, h: 0.65 });

  s.addText('PLAN PREPAGADO VETERINARIO', {
    x: 0, y: 2.5, w: W, h: 0.75,
    fontSize: 40, bold: true, color: C.white, align: 'center', fontFace: 'Calibri',
  });
  s.addShape(pptx.ShapeType.rect, { x: (W - 1.6) / 2, y: 3.36, w: 1.6, h: 0.045, fill: { color: C.brown } });
  s.addText('Propuesta de implementación · Junta Directiva', {
    x: 0, y: 3.62, w: W, h: 0.4,
    fontSize: 17, color: C.well, align: 'center', fontFace: 'Calibri',
  });
  s.addText('Cali, Colombia  ·  Septiembre 2026', {
    x: 0, y: H - 1.15, w: W, h: 0.3,
    fontSize: 12, color: C.well, align: 'center', fontFace: 'Calibri',
  });
  s.addText('Confidencial — uso interno', {
    x: 0, y: H - 0.82, w: W, h: 0.3,
    fontSize: 9.5, color: C.muted, align: 'center', italic: true, fontFace: 'Calibri',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · RESUMEN EJECUTIVO
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Resumen ejecutivo', 'Qué estamos proponiendo');
  s.addText(
    'Lanzar dos planes de medicina prepagada veterinaria sobre nuestra propia red 24/7 en Cali, ' +
    'con cobro automatizado y gestión integrada en SofVet. El módulo tecnológico ya está construido y probado.',
    { x: M, y: 1.5, w: CW, h: 0.6, fontSize: 14.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 22 }
  );

  const cw = (CW - 0.3 * 3) / 4;
  const items = [
    { label: 'Ingresos año 1', value: '$155 M', sub: 'Con 563 afiliados a mes 12', accent: C.blue },
    { label: 'EBITDA año 1', value: '$30,4 M', sub: 'Margen 19,6%, neto de pasarela', accent: C.green },
    { label: 'Break-even', value: '164', sub: 'Afiliados (mix 60/40)', accent: C.brown },
    { label: 'Capital en riesgo', value: '$4,9 M', sub: 'Máximo acumulado negativo', accent: C.amber },
  ];
  items.forEach((it, i) => kpi(s, { x: M + i * (cw + 0.3), y: 2.35, w: cw, h: 1.55, ...it }));

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 4.25, w: CW, h: 1.75, rectRadius: 0.08,
    fill: { color: C.cream }, line: { color: C.well, width: 1 },
  });
  s.addText('LA DECISIÓN QUE PEDIMOS A LA JUNTA', {
    x: M + 0.4, y: 4.45, w: CW - 0.8, h: 0.3,
    fontSize: 11, bold: true, color: C.brown, charSpacing: 1.5, fontFace: 'Calibri',
  });
  s.addText([
    { text: 'Aprobar el lanzamiento comercial del plan prepagado, con un presupuesto operativo de ', options: { fontSize: 14, color: C.ink } },
    { text: '$3.000.000/mes', options: { fontSize: 14, bold: true, color: C.deep } },
    { text: ' (coordinación, marketing, software y administración) y un capital de trabajo máximo estimado de ', options: { fontSize: 14, color: C.ink } },
    { text: '$4.900.000', options: { fontSize: 14, bold: true, color: C.deep } },
    { text: ' hasta alcanzar flujo positivo en el mes 7.', options: { fontSize: 14, color: C.ink } },
  ], { x: M + 0.4, y: 4.8, w: CW - 0.8, h: 1.0, fontFace: 'Calibri', lineSpacing: 21, valign: 'top' });
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · POR QUÉ AHORA
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Oportunidad', 'Por qué Pets & Pets y por qué ahora');
  const cards = [
    { t: 'Somos red propia', d: 'Única prepagada veterinaria en Cali operada sobre clínicas propias 24/7. SURA y los demás dependen de clínicas aliadas.', icon: '🏥' },
    { t: 'Ingreso recurrente', d: 'Convierte pacientes esporádicos de urgencia en ingreso mensual predecible, y reduce la estacionalidad del negocio.', icon: '🔁' },
    { t: 'Fideliza y ancla', d: 'El afiliado vuelve a nosotros por preventivo y urgencia. Aumenta frecuencia de visita y valor de vida del cliente.', icon: '🔗' },
    { t: 'Datos propios', d: 'Ticket promedio real de $567.763 sobre 209 eventos de urgencia (agosto 2026). No modelamos a ciegas.', icon: '📊' },
  ];
  const cw = (CW - 0.35) / 2, ch = 1.85;
  cards.forEach((c, i) => {
    const x = M + (i % 2) * (cw + 0.35);
    const y = 1.65 + Math.floor(i / 2) * (ch + 0.35);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: cw, h: ch, rectRadius: 0.08,
      fill: { color: C.white }, line: { color: C.line, width: 1 },
      shadow: { type: 'outer', color: 'AAAAAA', blur: 8, offset: 1, angle: 90, opacity: 0.18 },
    });
    s.addShape(pptx.ShapeType.rect, { x, y, w: cw, h: 0.055, fill: { color: C.blue } });
    s.addText(c.icon, { x: x + 0.3, y: y + 0.28, w: 0.6, h: 0.5, fontSize: 24 });
    s.addText(c.t, {
      x: x + 0.95, y: y + 0.32, w: cw - 1.25, h: 0.4,
      fontSize: 17, bold: true, color: C.deep, fontFace: 'Calibri',
    });
    s.addText(c.d, {
      x: x + 0.95, y: y + 0.78, w: cw - 1.3, h: 0.85,
      fontSize: 12.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 18, valign: 'top',
    });
  });
}

divider('01', 'El producto', 'Qué le vendemos al tutor y bajo qué condiciones');

// ═══════════════════════════════════════════════════════════════════════════
// 4 · LOS DOS PLANES
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Producto', 'Los dos planes');
  const rows = [
    [th('Concepto'), th('Plan Urgencias'), th('Plan Total')],
    [td('Prima mensual (1ª mascota)', { bold: true }), td('$25.000', { align: 'center', bold: true, color: C.blue }), td('$70.000', { align: 'center', bold: true, color: C.blue })],
    [td('Cobertura', { bold: true }), td('Urgencias y emergencias 24/7', { align: 'center' }), td('Urgencias 24/7 + preventivo completo', { align: 'center' })],
    [td('Copago del afiliado', { bold: true }), td('20%', { align: 'center' }), td('20%', { align: 'center' })],
    [td('Bolsa anual de urgencias', { bold: true }), td('$4.000.000', { align: 'center' }), td('$4.000.000', { align: 'center' })],
    [td('Carencia', { bold: true }), td('Accidente 0 d · enfermedad 15 d · ortopédico 30 d', { align: 'center' }), td('Accidente 0 d · enfermedad 15 d · ortopédico 30 d', { align: 'center' })],
    [td('Preventivo incluido', { bold: true }), td('No', { align: 'center', color: C.muted })], // completado abajo
  ];
  rows[6].push(td('Sí — 12 consultas, vacunas, 4 desparasitaciones, panel de laboratorio e imagen diagnóstica', { align: 'center', color: C.green, bold: true }));

  s.addTable(rows, {
    x: M, y: 1.6, w: CW, colW: [3.6, 3.5, 4.53],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.46, valign: 'middle',
    fill: { color: C.white },
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 5.35, w: CW, h: 0.72, rectRadius: 0.06,
    fill: { color: C.beige }, line: { color: C.brown, width: 0.75 },
  });
  s.addText([
    { text: 'Cómo funciona la bolsa:  ', options: { bold: true, color: C.deep, fontSize: 13 } },
    { text: 'el afiliado paga el 20% y P&P asume el 80%, que sale de su bolsa anual. La bolsa también se consume con lo que P&P descuenta en servicios programados: es el tope de todo lo que aportamos por esa mascota en un año, venga de donde venga.', options: { color: C.ink, fontSize: 13 } },
  ], { x: M + 0.3, y: 5.45, w: CW - 0.6, h: 0.55, fontFace: 'Calibri', valign: 'middle' });
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · MULTIMASCOTA
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Producto', 'Descuento multimascota');
  s.addText('Hasta 5 mascotas por titular. Cada afiliación mantiene su propia bolsa anual de $4.000.000, y el descuento aplica mientras todas permanezcan activas.', {
    x: M, y: 1.5, w: CW, h: 0.45, fontSize: 14, color: C.ink, fontFace: 'Calibri',
  });

  const rows = [
    [th('Mascota'), th('Descuento'), th('Plan Urgencias'), th('Plan Total')],
    ...[['1ª', '0%', '$25.000', '$70.000'], ['2ª', '20%', '$20.000', '$56.000'],
    ['3ª', '30%', '$17.500', '$49.000'], ['4ª', '40%', '$15.000', '$42.000'],
    ['5ª', '50%', '$12.500', '$35.000']].map((r, i) => r.map((v, j) => td(v, {
      align: 'center', bold: j === 0 || j === 1,
      color: j === 1 ? C.brown : C.ink,
      fill: { color: i % 2 ? C.white : C.cream },
    }))),
  ];
  s.addTable(rows, {
    x: M + 1.4, y: 2.15, w: CW - 2.8, colW: [2.38, 2.38, 2.38, 2.39],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.52, valign: 'middle',
  });

  s.addText('Estrategia: el descuento multimascota es más agresivo que el de SURA y eleva el ticket por hogar sin aumentar proporcionalmente el riesgo, porque la frecuencia de siniestro es por mascota, no por hogar.', {
    x: M, y: 5.6, w: CW, h: 0.6, fontSize: 12.5, color: C.muted, italic: true, fontFace: 'Calibri', lineSpacing: 18,
  });
}

// ═══════════════════════════════════ · VIGENCIA ANUAL Y CONTROL DE EXPOSICIÓN
{
  const s = content('Producto', 'Vigencia anual: la válvula de escape del modelo');
  s.addText('El contrato es anual aunque el pago sea mensual. Esta es la decisión que nos permite cubrir casos caros sin quedar atrapados con ellos para siempre.', {
    x: M, y: 1.4, w: CW, h: 0.4, fontSize: 14, color: C.ink, fontFace: 'Calibri',
  });

  const cw = (CW - 0.4) / 2;
  const panel = (x, titulo, color, items) => {
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.95, w: cw, h: 2.2, rectRadius: 0.08, fill: { color: C.cream }, line: { color: C.line, width: 1 } });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.95, w: cw, h: 0.06, fill: { color } });
    s.addText(titulo, { x: x + 0.3, y: 2.15, w: cw - 0.6, h: 0.3, fontSize: 10.5, bold: true, color, charSpacing: 1.2, fontFace: 'Calibri' });
    s.addText(items.map(t => ({ text: t, options: { bullet: { code: '25AA' }, fontSize: 12.5, color: C.ink, breakLine: true } })), {
      x: x + 0.3, y: 2.5, w: cw - 0.6, h: 1.5, fontFace: 'Calibri', lineSpacing: 18, valign: 'top',
    });
  };
  panel(M, 'DURANTE EL AÑO — NOS COMPROMETEMOS', C.green, [
    'No podemos soltar al afiliado ni reducirle coberturas',
    'Las únicas causales son mora y fraude',
    'Es lo que hace el producto creíble y vendible',
  ]);
  panel(M + cw + 0.4, 'AL VENCIMIENTO — PODEMOS SALIRNOS', C.brown, [
    'Reajustar la cuota de ese afiliado',
    'Cambiar límites y condiciones del plan',
    'No renovar, con 30 días de aviso previo',
  ]);

  const box = (y, h, titulo, texto, color, fill) => {
    s.addShape(pptx.ShapeType.roundRect, { x: M, y, w: CW, h, rectRadius: 0.08, fill: { color: fill }, line: { color, width: 1.25 } });
    s.addText(titulo.toUpperCase(), { x: M + 0.35, y: y + 0.12, w: CW - 0.7, h: 0.26, fontSize: 10, bold: true, color, charSpacing: 1.2, fontFace: 'Calibri' });
    s.addText(texto, { x: M + 0.35, y: y + 0.38, w: CW - 0.7, h: h - 0.5, fontSize: 12.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'top' });
  };
  box(4.35, 1.2, 'Por qué esto importa para la junta',
    'Sin vigencia anual, una mascota que desarrolla una enfermedad costosa nos acompaña indefinidamente y no hay forma de reajustar. Con vigencia anual la cubrimos hasta terminar el año — que es lo correcto y lo que se le prometió — y en la renovación decidimos con información real. Es el mismo mecanismo que usan las aseguradoras de mascotas en Estados Unidos.',
    C.blue, 'EEF4FF');
  box(5.7, 1.1, 'Segundo control: la bolsa ahora se consume con todo',
    'Los $4.000.000 anuales ya no son solo para urgencias: la porción que P&P descuenta en procedimientos programados también sale de ahí. Nuestra exposición máxima por mascota y por año queda acotada a esa cifra, venga el gasto de donde venga.',
    C.green, 'EAF7EF');
}

divider('02', 'La operación', 'Cómo se gestiona el plan en el día a día de la clínica');

// ═══════════════════════════════════════════════════════════════════════════
// · ROLES Y RESPONSABILIDADES
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Operación', 'Quién hace qué');
  const roles = [
    {
      t: 'Recepción / Caja', c: C.blue,
      d: ['Verifica afiliación y carencia en SofVet', 'Consulta el saldo de bolsa del afiliado', 'Cobra el copago antes de la atención', 'Registra el evento en el sistema', 'Afilia clientes nuevos y genera el link de pago'],
    },
    {
      t: 'Médico veterinario', c: C.brown,
      d: ['Única autoridad para calificar si un evento es urgencia cubierta', 'Entrega el presupuesto estimado para calcular el copago', 'Documenta diagnóstico y justificación en la historia clínica', 'Emite la remisión que habilita descuentos programados'],
    },
    {
      t: 'Coordinador de prepagada', c: C.well,
      d: ['Reporte mensual a gerencia el día 5', 'Seguimiento de afiliados en mora y recuperación', 'Resuelve casos dudosos escalados por recepción', 'Controla beneficios preventivos y bolsas por agotarse'],
    },
    {
      t: 'Gerencia', c: C.deep,
      d: ['Aprueba excepciones y casos de bolsa agotada', 'Revisa el loss ratio mensual contra el modelo', 'Decide ajustes de prima o de criterios de cobertura'],
    },
  ];
  const cw = (CW - 0.28 * 3) / 4;
  roles.forEach((r, i) => {
    const x = M + i * (cw + 0.28);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.7, w: cw, h: 3.9, rectRadius: 0.08,
      fill: { color: C.white }, line: { color: C.line, width: 1 },
      shadow: { type: 'outer', color: 'AAAAAA', blur: 7, offset: 1, angle: 90, opacity: 0.14 },
    });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.7, w: cw, h: 0.62, fill: { color: r.c } });
    s.addText(r.t, {
      x: x + 0.12, y: 1.7, w: cw - 0.24, h: 0.62,
      fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri',
    });
    s.addText(r.d.map(t => ({ text: t, options: { bullet: { code: '25AA' }, fontSize: 11.5, color: C.ink, breakLine: true } })), {
      x: x + 0.22, y: 2.48, w: cw - 0.44, h: 2.95,
      fontFace: 'Calibri', lineSpacing: 16, valign: 'top',
    });
  });
  s.addText('La coordinación de prepagada es el único rol nuevo que se requiere contratar. Los demás son funciones que se suman a roles que ya existen en la operación.', {
    x: M, y: 5.75, w: CW, h: 0.45, fontSize: 12.5, color: C.muted, italic: true, fontFace: 'Calibri',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// · FLUJO OPERATIVO EN URGENCIAS
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Operación', 'Llega un afiliado por urgencia: los 5 pasos');
  const pasos = [
    { n: '1', t: 'Verificar afiliación', d: 'Recepción busca por cédula en SofVet. El sistema muestra el estado del plan y si ya se cumplieron los 30 días de carencia.' },
    { n: '2', t: 'Confirmar saldo de bolsa', d: 'SofVet muestra cuánto queda de los $4.000.000 anuales. Si no alcanza, se aplica el procedimiento de bolsa agotada.' },
    { n: '3', t: 'Cobrar el copago', d: 'El veterinario entrega el presupuesto estimado. Caja cobra el 20% antes de iniciar la atención y factura en SofVet.' },
    { n: '4', t: 'Registrar el evento', d: 'Se registra tipo de evento, costo total y copago. SofVet descuenta el consumo de la bolsa automáticamente.' },
    { n: '5', t: 'Autorizar la atención', d: 'Con copago cobrado y evento registrado, se informa al veterinario que puede iniciar bajo cobertura del plan.' },
  ];
  const bw = (CW - 0.22 * 4) / 5;
  pasos.forEach((p, i) => {
    const x = M + i * (bw + 0.22);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.72, w: bw, h: 2.55, rectRadius: 0.08,
      fill: { color: C.white }, line: { color: C.line, width: 1 },
    });
    s.addShape(pptx.ShapeType.ellipse, { x: x + (bw - 0.56) / 2, y: 1.96, w: 0.56, h: 0.56, fill: { color: C.blue } });
    s.addText(p.n, {
      x: x + (bw - 0.56) / 2, y: 1.96, w: 0.56, h: 0.56,
      fontSize: 20, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri',
    });
    s.addText(p.t, {
      x: x + 0.12, y: 2.62, w: bw - 0.24, h: 0.5,
      fontSize: 13, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri',
    });
    s.addText(p.d, {
      x: x + 0.16, y: 3.14, w: bw - 0.32, h: 1.0,
      fontSize: 10.5, color: C.ink, align: 'center', fontFace: 'Calibri', lineSpacing: 15, valign: 'top',
    });
  });

  const hw = (CW - 0.35) / 2;
  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 4.55, w: hw, h: 1.45, rectRadius: 0.08, fill: { color: 'FDECEA' }, line: { color: C.red, width: 1.25 } });
  s.addText('REGLA INNEGOCIABLE — ADMINISTRATIVA', { x: M + 0.3, y: 4.72, w: hw - 0.6, h: 0.3, fontSize: 10.5, bold: true, color: C.red, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText('Nunca se inicia una atención bajo cobertura del plan sin haber verificado el saldo de bolsa y cobrado el copago. Es lo que protege la viabilidad financiera del programa.', {
    x: M + 0.3, y: 5.04, w: hw - 0.6, h: 0.85, fontSize: 12, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M + hw + 0.35, y: 4.55, w: hw, h: 1.45, rectRadius: 0.08, fill: { color: 'EAF7EF' }, line: { color: C.green, width: 1.25 } });
  s.addText('REGLA INNEGOCIABLE — CLÍNICA', { x: M + hw + 0.65, y: 4.72, w: hw - 0.6, h: 0.3, fontSize: 10.5, bold: true, color: C.green, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText('Nunca se niega ni se suspende la atención estabilizadora de un animal por un tema administrativo o económico. Primero se estabiliza; lo administrativo se resuelve en paralelo.', {
    x: M + hw + 0.65, y: 5.04, w: hw - 0.6, h: 0.85, fontSize: 12, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// · CASOS ESPECIALES
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Operación', 'Casos especiales que el equipo debe saber manejar');
  const rows = [
    [th('Situación'), th('Cómo se resuelve')],
    [td('Afiliado en carencia\n(menos de 30 días)', { bold: true }), td('La cobertura de urgencias no aplica: se cobra tarifa regular. En Plan Total, el preventivo sí aplica desde el día 1. Recepción informa la fecha exacta en que inicia la cobertura.')],
    [td('Bolsa anual agotada', { bold: true }), td('Se informa con empatía y se ofrecen dos opciones: pagar tarifa regular, o pagar y descontarlo del siguiente año de plan. Si el tutor no puede pagar, se escala a gerencia — nunca se deja al animal sin atención.')],
    [td('El veterinario determina\nque no es urgencia', { bold: true }), td('Se documenta el motivo en la historia clínica. Si es Plan Total y le quedan consultas preventivas disponibles, puede cubrirse por esa vía. De lo contrario, tarifa regular.')],
    [td('Condición preexistente', { bold: true }), td('Si la causa ya estaba diagnosticada en la historia clínica antes de la afiliación, se cobra tarifa regular. Si es una condición nueva sin registro previo, se cubre normalmente.')],
    [td('Llega con una mascota\ndistinta a la afiliada', { bold: true }), td('Cada afiliación cubre una sola mascota registrada. Se atiende a tarifa regular y se ofrece afiliar a esa mascota con el descuento multimascota correspondiente.')],
  ];
  s.addTable(rows, {
    x: M, y: 1.58, w: CW, colW: [3.5, 8.13],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.6, valign: 'middle', autoPage: false,
  });
  s.addText('En cualquier caso dudoso, la decisión clínica la toma el veterinario y la decisión comercial se escala a la coordinación de prepagada o a gerencia. Nunca la resuelve recepción por su cuenta.', {
    x: M, y: 5.72, w: CW, h: 0.45, fontSize: 12.5, color: C.muted, italic: true, fontFace: 'Calibri',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · CÓMO SE COBRA
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Operación', 'Cómo se cobra: automatizado de punta a punta');
  const steps = [
    { n: '1', t: 'El tutor paga', d: 'Desde el Portal del Cliente o con link enviado por caja. Pasarela Wompi (Bancolombia): tarjeta, Nequi, PSE, DaviPlata o QR.' },
    { n: '2', t: 'Wompi confirma', d: 'La pasarela notifica automáticamente a SofVet vía webhook, con verificación criptográfica de la firma del evento.' },
    { n: '3', t: 'SofVet actualiza', d: 'Se extiende la fecha de vencimiento del afiliado y se registra el pago. Sin intervención manual de nadie.' },
    { n: '4', t: 'Estado automático', d: 'Si no paga: 6 días de gracia → suspendido → cancelado al día 30. El sistema lo hace solo, sin depender de revisión manual.' },
  ];
  const bw = (CW - 0.3 * 3) / 4;
  steps.forEach((st, i) => {
    const x = M + i * (bw + 0.3);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.75, w: bw, h: 2.5, rectRadius: 0.08,
      fill: { color: C.white }, line: { color: C.line, width: 1 },
      shadow: { type: 'outer', color: 'AAAAAA', blur: 8, offset: 1, angle: 90, opacity: 0.15 },
    });
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + (bw - 0.62) / 2, y: 2.02, w: 0.62, h: 0.62, fill: { color: C.blue },
    });
    s.addText(st.n, {
      x: x + (bw - 0.62) / 2, y: 2.02, w: 0.62, h: 0.62,
      fontSize: 22, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri',
    });
    s.addText(st.t, {
      x: x + 0.18, y: 2.78, w: bw - 0.36, h: 0.35,
      fontSize: 15, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri',
    });
    s.addText(st.d, {
      x: x + 0.22, y: 3.18, w: bw - 0.44, h: 0.95,
      fontSize: 11.5, color: C.ink, align: 'center', fontFace: 'Calibri', lineSpacing: 16, valign: 'top',
    });
    if (i < 3) {
      s.addText('›', {
        x: x + bw + 0.02, y: 2.85, w: 0.26, h: 0.4,
        fontSize: 26, bold: true, color: C.well, align: 'center', fontFace: 'Calibri',
      });
    }
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 4.6, w: CW, h: 1.35, rectRadius: 0.08,
    fill: { color: C.cream }, line: { color: C.green, width: 1 },
  });
  s.addText('✓  YA PROBADO EN AMBIENTE REAL', {
    x: M + 0.35, y: 4.78, w: CW - 0.7, h: 0.3,
    fontSize: 11, bold: true, color: C.green, charSpacing: 1.5, fontFace: 'Calibri',
  });
  s.addText('La integración con Wompi está construida y validada de punta a punta en ambiente de pruebas: se ejecutó un pago real con Nequi y el sistema actualizó solo la fecha de vencimiento del afiliado, sin intervención humana. Solo falta la aprobación del comercio por parte de Wompi para operar con dinero real.', {
    x: M + 0.35, y: 5.1, w: CW - 0.7, h: 0.75,
    fontSize: 12.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 18, valign: 'top',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 · CÓMO PAGA EL CLIENTE
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Operación', 'Cómo paga el cliente');
  s.addText('El tutor entra a su portal, ve el estado de su plan y paga sin depender de que nadie lo llame. También puede pagar por adelantado con descuento.', {
    x: M, y: 1.5, w: CW, h: 0.45, fontSize: 14, color: C.ink, fontFace: 'Calibri',
  });

  const opts = [
    { t: '1 mes', p: '$70.000', d: 'Sin descuento', accent: C.muted, fill: C.white },
    { t: '3 meses', p: '$199.500', d: '5% de descuento', accent: C.blue, fill: C.cream },
    { t: '6 meses', p: '$357.000', d: '15% de descuento', accent: C.green, fill: C.cream },
  ];
  const ow = 2.85;
  const startX = (W - (ow * 3 + 0.4 * 2)) / 2;
  opts.forEach((o, i) => {
    const x = startX + i * (ow + 0.4);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.25, w: ow, h: 1.85, rectRadius: 0.1,
      fill: { color: o.fill }, line: { color: o.accent, width: i === 2 ? 2.25 : 1 },
    });
    s.addText(o.t, {
      x, y: 2.45, w: ow, h: 0.35, fontSize: 16, bold: true, color: C.deep, align: 'center', fontFace: 'Calibri',
    });
    s.addText(o.p, {
      x, y: 2.85, w: ow, h: 0.6, fontSize: 30, bold: true, color: o.accent, align: 'center', fontFace: 'Calibri',
    });
    s.addText(o.d, {
      x, y: 3.5, w: ow, h: 0.35, fontSize: 12.5, color: C.ink, align: 'center', fontFace: 'Calibri',
    });
  });
  s.addText('Valores mostrados sobre el Plan Total de 1ª mascota', {
    x: 0, y: 4.18, w: W, h: 0.3, fontSize: 10.5, color: C.muted, align: 'center', italic: true, fontFace: 'Calibri',
  });

  const canales = [
    { t: 'Portal del Cliente', d: 'El tutor entra con su cédula, ve si está al día o en mora, y paga en dos clics. Es el canal principal.' },
    { t: 'Caja / venta en clínica', d: 'Para la primera venta o quien prefiere atención personal: el cajero afilia y genera el link de pago en el momento.' },
    { t: 'Efectivo o transferencia', d: 'Vía de excepción: caja registra el pago manualmente y el sistema extiende la cobertura igual.' },
  ];
  const cw2 = (CW - 0.3 * 2) / 3;
  canales.forEach((c, i) => {
    const x = M + i * (cw2 + 0.3);
    s.addShape(pptx.ShapeType.rect, { x, y: 4.72, w: cw2, h: 0.045, fill: { color: C.brown } });
    s.addText(c.t, { x, y: 4.85, w: cw2, h: 0.3, fontSize: 13.5, bold: true, color: C.deep, fontFace: 'Calibri' });
    s.addText(c.d, { x, y: 5.18, w: cw2, h: 0.8, fontSize: 11.5, color: C.ink, fontFace: 'Calibri', lineSpacing: 16, valign: 'top' });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// · GESTIÓN DIARIA Y CONTROL
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Operación', 'Gestión diaria y control del programa');

  const cw = (CW - 0.35) / 2;
  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.6, w: cw, h: 2.0, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.green, width: 1.25 } });
  s.addText('LO QUE HACE SOFVET SOLO', { x: M + 0.3, y: 1.78, w: cw - 0.6, h: 0.3, fontSize: 10.5, bold: true, color: C.green, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText([
    'Cambia el estado del afiliado por vencimiento (gracia, suspensión, cancelación)',
    'Descuenta el consumo de la bolsa anual al registrar cada evento',
    'Reinicia la bolsa y los beneficios al cambiar el año',
    'Registra el pago y extiende la cobertura cuando Wompi confirma',
  ].map(t => ({ text: t, options: { bullet: { code: '2713' }, fontSize: 11.5, color: C.ink, breakLine: true } })), {
    x: M + 0.3, y: 2.12, w: cw - 0.6, h: 1.35, fontFace: 'Calibri', lineSpacing: 16, valign: 'top',
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M + cw + 0.35, y: 1.6, w: cw, h: 2.0, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.brown, width: 1.25 } });
  s.addText('LO QUE REQUIERE PERSONA', { x: M + cw + 0.65, y: 1.78, w: cw - 0.6, h: 0.3, fontSize: 10.5, bold: true, color: C.brown, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText([
    'Registrar el evento de urgencia y el copago cobrado (recepción, en el momento)',
    'Marcar el uso de beneficios preventivos del Plan Total',
    'Reporte mensual a gerencia el día 5 (coordinación)',
    'Gestión de cobro a quien entra en mora',
  ].map(t => ({ text: t, options: { bullet: { code: '25AA' }, fontSize: 11.5, color: C.ink, breakLine: true } })), {
    x: M + cw + 0.65, y: 2.12, w: cw - 0.6, h: 1.35, fontFace: 'Calibri', lineSpacing: 16, valign: 'top',
  });

  s.addText('Alertas que obligan a escalar a gerencia', {
    x: M, y: 3.78, w: CW, h: 0.35, fontSize: 15, bold: true, color: C.deep, fontFace: 'Calibri',
  });
  const rows = [
    [th('Indicador'), th('Umbral'), th('Acción')],
    [td('Loss ratio mensual'), td('> 80%', { align: 'center', bold: true, color: C.red }), td('Revisar criterios de cobertura con gerencia y evaluar ajuste de prima')],
    [td('Afiliados que agotan bolsa'), td('> 3 al mes', { align: 'center', bold: true, color: C.amber }), td('Evaluar si el tope de bolsa es suficiente o si hay selección adversa')],
    [td('Urgencias de un mismo afiliado'), td('> 3 al año', { align: 'center', bold: true, color: C.amber }), td('Revisar historial: posible preexistencia no declarada')],
    [td('Cancelaciones mensuales'), td('> 5%', { align: 'center', bold: true, color: C.amber }), td('Encuesta de salida y revisión de la percepción de valor del plan')],
  ];
  s.addTable(rows, {
    x: M, y: 4.2, w: CW, colW: [3.6, 1.8, 6.23],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.44, valign: 'middle',
  });
}

divider('03', 'Los números', 'Supuestos, unit economics y proyección a 12 meses');

// ═══════════════════════════════════════════════════════════════════════════
// 8 · SUPUESTOS DEL MODELO
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Modelo financiero', 'Supuestos — construidos sobre datos reales');
  const cw = (CW - 0.35) / 2;

  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.6, w: cw, h: 2.15, rectRadius: 0.08, fill: { color: C.cream }, line: { color: C.line, width: 1 } });
  s.addText('COSTO DE SINIESTRO', { x: M + 0.3, y: 1.78, w: cw - 0.6, h: 0.28, fontSize: 10.5, bold: true, color: C.brown, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText([
    { text: '$567.763', options: { fontSize: 24, bold: true, color: C.deep } },
    { text: '   ticket promedio por urgencia', options: { fontSize: 12.5, color: C.ink } },
  ], { x: M + 0.3, y: 2.1, w: cw - 0.6, h: 0.45, fontFace: 'Calibri' });
  s.addText('Fuente: 209 eventos reales de urgencia facturados en agosto de 2026 (Siigo). P&P asume el 80% → costo neto de $454.210 por evento.', {
    x: M + 0.3, y: 2.62, w: cw - 0.6, h: 0.95, fontSize: 12, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M + cw + 0.35, y: 1.6, w: cw, h: 2.15, rectRadius: 0.08, fill: { color: C.cream }, line: { color: C.line, width: 1 } });
  s.addText('FRECUENCIA DE SINIESTRO', { x: M + cw + 0.65, y: 1.78, w: cw - 0.6, h: 0.28, fontSize: 10.5, bold: true, color: C.brown, charSpacing: 1.2, fontFace: 'Calibri' });
  s.addText([
    { text: '20%', options: { fontSize: 24, bold: true, color: C.deep } },
    { text: '   de afiliados con 1+ evento al año', options: { fontSize: 12.5, color: C.ink } },
  ], { x: M + cw + 0.65, y: 2.1, w: cw - 0.6, h: 0.45, fontFace: 'Calibri' });
  s.addText('Escenario base. Benchmarks de industria (Petplan UK, NAPHIA US) están en 15%. Usamos 20% por prudencia: somos hospital de urgencias y hay riesgo de selección adversa.', {
    x: M + cw + 0.65, y: 2.62, w: cw - 0.6, h: 0.95, fontSize: 12, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  const rows = [
    [th('Concepto'), th('Valor'), th('Nota')],
    [td('Costo preventivo anual (Plan Total)'), td('$456.000', { align: 'center', bold: true }), td('Costo marginal real al 40% del arancel')],
    [td('Costo preventivo mensual (Plan Total)'), td('$38.000', { align: 'center', bold: true }), td('12 consultas, vacunas, desparasitación, labs e imagen')],
    [td('Costos fijos operativos mensuales'), td('$3.000.000', { align: 'center', bold: true }), td('Coordinadora $1,5M · marketing $800K · software $300K · admin $400K')],
    [td('Mix de ventas proyectado'), td('60 / 40', { align: 'center', bold: true }), td('60% Plan Urgencias · 40% Plan Total')],
  ];
  s.addTable(rows, {
    x: M, y: 4.0, w: CW, colW: [4.2, 2.0, 5.43],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.42, valign: 'middle',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 9 · UNIT ECONOMICS
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Modelo financiero', 'Unit economics por afiliado — escenario base (20%)');
  const rows = [
    [th('Por afiliado / mes'), th('Plan Urgencias'), th('Plan Total')],
    [td('Prima mensual', { bold: true }), td('$25.000', { align: 'center' }), td('$70.000', { align: 'center' })],
    [td('(−) Pérdida esperada por urgencia'), td('$7.570', { align: 'center', color: C.red }), td('$7.570', { align: 'center', color: C.red })],
    [td('(−) Costo preventivo'), td('—', { align: 'center', color: C.muted }), td('$38.000', { align: 'center', color: C.red })],
    [td('(−) Comisión de pasarela (Wompi)'), td('$1.363', { align: 'center', color: C.red }), td('$2.555', { align: 'center', color: C.red })],
    [td('Margen neto mensual', { bold: true }), td('$16.067', { align: 'center', bold: true, color: C.green }), td('$21.875', { align: 'center', bold: true, color: C.green })],
    [td('Margen neto anual', { bold: true }), td('$192.804', { align: 'center', bold: true, color: C.green }), td('$262.500', { align: 'center', bold: true, color: C.green })],
    [td('Loss ratio', { bold: true }), td('30,3%', { align: 'center', bold: true }), td('65,1%', { align: 'center', bold: true })],
  ];
  s.addTable(rows, {
    x: M, y: 1.6, w: CW, colW: [5.2, 3.2, 3.23],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.45, valign: 'middle',
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 4.85, w: CW, h: 1.15, rectRadius: 0.08, fill: { color: C.cream }, line: { color: C.well, width: 1 } });
  s.addText([
    { text: 'Lectura clave:  ', options: { bold: true, color: C.deep, fontSize: 13.5 } },
    { text: 'ambos planes son rentables por unidad, ya netos de la comisión de la pasarela. El Plan Total deja más margen absoluto ($21.875 vs $16.067) pero con loss ratio más alto (65,1%) porque incluye el preventivo. Referencia de industria: bajo 70% es saludable, sobre 80% es alerta.', options: { color: C.ink, fontSize: 13.5 } },
  ], { x: M + 0.35, y: 4.98, w: CW - 0.7, h: 0.9, fontFace: 'Calibri', lineSpacing: 19, valign: 'middle' });
}

// ═══════════════════════════════════════════════════════════════════════════
// 10 · PROYECCIÓN 12 MESES (gráfico)
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Modelo financiero', 'Proyección 12 meses — escenario base');
  const labels = ['Oct-26', 'Nov-26', 'Dic-26', 'Ene-27', 'Feb-27', 'Mar-27', 'Abr-27', 'May-27', 'Jun-27', 'Jul-27', 'Ago-27', 'Sep-27'];
  const ingresos = [0.86, 3.22, 5.56, 7.76, 9.98, 12.12, 14.20, 16.30, 18.28, 20.29, 22.24, 24.18];
  const ebitda = [-2.63, -1.62, -0.63, 0.33, 1.27, 2.19, 3.09, 3.97, 4.83, 5.68, 6.53, 7.35];

  s.addChart(
    [
      { type: pptx.ChartType.bar, data: [{ name: 'Ingresos mensuales ($M)', labels, values: ingresos }] },
      { type: pptx.ChartType.line, data: [{ name: 'EBITDA mensual ($M)', labels, values: ebitda }] },
    ],
    {
      x: M, y: 1.55, w: CW, h: 3.45,
      barDir: 'col', chartColors: [C.blue], chartColorsOpacity: 90,
      lineDataSymbol: 'circle', lineDataSymbolSize: 6, lineSize: 3,
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
      catAxisLabelColor: C.muted, valAxisLabelColor: C.muted,
      valAxisTitle: 'Millones COP', showValAxisTitle: true, valAxisTitleFontSize: 10, valAxisTitleColor: C.muted,
      showLegend: true, legendPos: 'b', legendFontSize: 11, legendColor: C.ink,
      valGridLine: { color: 'EEEEEE', size: 1 },
      serGridLine: { style: 'none' },
      dataBorder: { pt: 0, color: 'FFFFFF' },
    }
  );

  const cw = (CW - 0.3 * 3) / 4;
  [
    { label: 'Afiliados a mes 12', value: '563', sub: '338 Urgencias · 225 Total', accent: C.blue },
    { label: 'Ingresos año 1', value: '$155 M', sub: 'Primas recaudadas', accent: C.blue },
    { label: 'EBITDA año 1', value: '$30,4 M', sub: 'Margen 19,6%', accent: C.green },
    { label: 'Loss ratio promedio', value: '53,0%', sub: 'Zona saludable (<70%)', accent: C.green },
  ].forEach((it, i) => kpi(s, { x: M + i * (cw + 0.3), y: 5.2, w: cw, h: 1.25, ...it, fill: C.white }));
}

// ═══════════════════════════════════════════════════════════════════════════
// 11 · BREAK-EVEN
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Modelo financiero', 'Break-even y capital en riesgo');

  s.addText('Afiliados necesarios para cubrir los $3.000.000 de costos fijos mensuales:', {
    x: M, y: 1.5, w: CW, h: 0.35, fontSize: 14, color: C.ink, fontFace: 'Calibri',
  });
  const rows = [
    [th('Escenario de frecuencia'), th('Solo Plan Urgencias'), th('Solo Plan Total'), th('Mix 60 / 40')],
    [td('Conservador — 15%/año', { bold: true }), td('168', { align: 'center' }), td('127', { align: 'center' }), td('148', { align: 'center', bold: true, color: C.green })],
    [td('Base — 20%/año', { bold: true }), td('187', { align: 'center' }), td('138', { align: 'center' }), td('164', { align: 'center', bold: true, color: C.green })],
    [td('Agresivo — 25%/año', { bold: true }), td('212', { align: 'center' }), td('151', { align: 'center' }), td('182', { align: 'center', bold: true, color: C.amber })],
  ];
  s.addTable(rows, {
    x: M, y: 1.95, w: CW, colW: [4.0, 2.55, 2.54, 2.54],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.48, valign: 'middle',
  });

  const cw = (CW - 0.35 * 2) / 3;
  [
    { label: 'EBITDA mensual positivo', value: 'Mes 4', sub: 'Enero 2027, con ~181 afiliados', accent: C.green },
    { label: 'Flujo acumulado positivo', value: 'Mes 7', sub: 'Abril 2027 — se recupera lo invertido', accent: C.green },
    { label: 'Capital máximo en riesgo', value: '$4,9 M', sub: 'Punto más bajo del acumulado (dic-26)', accent: C.amber },
  ].forEach((it, i) => kpi(s, { x: M + i * (cw + 0.35), y: 4.15, w: cw, h: 1.55, ...it }));

  s.addText('Incluso en el escenario agresivo (25% de frecuencia), el break-even del mix es de 182 afiliados — una meta alcanzable en el primer año según la proyección de adquisición.', {
    x: M, y: 5.88, w: CW, h: 0.45, fontSize: 12, color: C.muted, italic: true, fontFace: 'Calibri',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 12 · COMPARACIÓN SURA
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Competencia', 'Plan Total vs SURA Clásico');
  const ok = { color: C.green, bold: true, align: 'center' };
  const no = { color: C.muted, align: 'center' };
  const rows = [
    [th('Dimensión'), th('Pets & Pets — Plan Total'), th('SURA Clásico')],
    [td('Prima mensual', { bold: true }), td('$70.000', { align: 'center', bold: true, color: C.green }), td('$96.200', { align: 'center' })],
    [td('Copago en urgencias', { bold: true }), td('20%', { align: 'center', color: C.red }), td('15%', { align: 'center', color: C.green, bold: true })],
    [td('Consultas preventivas / año', { bold: true }), td('12', ok), td('1', no)],
    [td('Panel de laboratorio anual', { bold: true }), td('Incluido', ok), td('No incluido', no)],
    [td('Microchip', { bold: true }), td('Incluido', ok), td('No incluido', no)],
    [td('Cirugías programadas', { bold: true }), td('60% de descuento', ok), td('No cubre', no)],
    [td('Red de atención', { bold: true }), td('Propia, 24/7 en Cali', ok), td('Clínicas aliadas', no)],
    [td('Descuento multimascota', { bold: true }), td('Hasta 50%', ok), td('Menor', no)],
  ];
  s.addTable(rows, {
    x: M, y: 1.55, w: CW, colW: [4.4, 3.8, 3.43],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.42, valign: 'middle',
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 5.5, w: CW, h: 0.82, rectRadius: 0.06, fill: { color: C.beige }, line: { color: C.brown, width: 0.75 } });
  s.addText([
    { text: '27% más barato que SURA  ', options: { bold: true, fontSize: 15, color: C.deep } },
    { text: 'y gana en 11 de 18 dimensiones. El copago es la única donde SURA nos gana, y la compensamos con precio, preventivo y red propia 24/7 — somos la única prepagada veterinaria en Cali con clínicas propias.', options: { fontSize: 13.5, color: C.ink } },
  ], { x: M + 0.35, y: 5.6, w: CW - 0.7, h: 0.62, fontFace: 'Calibri', valign: 'middle' });
}

divider('04', 'Implementación', 'Qué está listo, qué falta y cómo salimos al mercado');

// ═══════════════════════════════════════════════════════════════════════════
// 13 · ESTADO DE IMPLEMENTACIÓN
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Implementación', 'Qué ya está construido');
  s.addText('El módulo tecnológico no es un proyecto por hacer: ya está desarrollado, probado y funcionando en ambiente de pruebas.', {
    x: M, y: 1.5, w: CW, h: 0.4, fontSize: 14, color: C.ink, fontFace: 'Calibri',
  });

  const listo = [
    'Módulo de afiliados en SofVet: alta, planes, precios y descuento multimascota automático',
    'Control de bolsa anual y registro de eventos de urgencia con cálculo de copago',
    'Checklist de beneficios preventivos del Plan Total, con topes por año',
    'Cambio de estado automático por vencimiento: gracia, suspensión y cancelación',
    'Pasarela Wompi integrada y validada con un pago real en ambiente de pruebas',
    'Portal del Cliente: el tutor consulta su estado y paga 1, 3 o 6 meses',
    'Flujo de venta en clínica, incluyendo alta de tutor y mascota nuevos',
  ];
  const pend = [
    'Aprobación del comercio por parte de Wompi (en revisión, trámite externo)',
    'Revisión legal del contrato y términos y condiciones (borrador ya redactado)',
    'WhatsApp Business API para recordatorios automáticos de cobro',
    'Habilitación del módulo para el personal de caja y definición de permisos',
  ];

  const cw = (CW - 0.4) / 2;
  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 2.05, w: cw, h: 3.75, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.green, width: 1.25 } });
  s.addText('LISTO Y PROBADO', { x: M + 0.3, y: 2.22, w: cw - 0.6, h: 0.3, fontSize: 11.5, bold: true, color: C.green, charSpacing: 1.5, fontFace: 'Calibri' });
  s.addText(listo.map(t => ({ text: t, options: { bullet: { code: '2713' }, fontSize: 12, color: C.ink, breakLine: true } })), {
    x: M + 0.3, y: 2.6, w: cw - 0.6, h: 3.0, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M + cw + 0.4, y: 2.05, w: cw, h: 3.75, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.amber, width: 1.25 } });
  s.addText('PENDIENTE', { x: M + cw + 0.7, y: 2.22, w: cw - 0.6, h: 0.3, fontSize: 11.5, bold: true, color: C.amber, charSpacing: 1.5, fontFace: 'Calibri' });
  s.addText(pend.map(t => ({ text: t, options: { bullet: { code: '25CB' }, fontSize: 12, color: C.ink, breakLine: true } })), {
    x: M + cw + 0.7, y: 2.6, w: cw - 0.6, h: 3.0, fontFace: 'Calibri', lineSpacing: 17, valign: 'top',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 14 · RIESGOS
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Gestión de riesgo', 'Riesgos principales y cómo los controlamos');
  const rows = [
    [th('Riesgo'), th('Impacto'), th('Control')],
    [td('Selección adversa: se afilian mascotas ya enfermas', { bold: true }), td('Alto', { align: 'center', color: C.red, bold: true }), td('Examen inicial obligatorio: todo lo que aparezca ahí queda excluido. Más carencias escalonadas y exclusión de preexistentes documentadas en la historia clínica')],
    [td('Siniestralidad por encima de lo modelado', { bold: true }), td('Alto', { align: 'center', color: C.red, bold: true }), td('Bolsa anual tope de $4.000.000 por afiliado; monitoreo mensual de loss ratio con alerta sobre 80%')],
    [td('Mora y cartera', { bold: true }), td('Medio', { align: 'center', color: C.amber, bold: true }), td('Cobro automatizado por pasarela y suspensión automática de cobertura al día 6 de mora')],
    [td('Uso excesivo del preventivo (Plan Total)', { bold: true }), td('Medio', { align: 'center', color: C.amber, bold: true }), td('Topes explícitos por beneficio y control de consumo en SofVet, visible para el equipo y para el tutor')],
    [td('Adquisición más lenta de lo proyectado', { bold: true }), td('Medio', { align: 'center', color: C.amber, bold: true }), td('Costos fijos acotados a $3M/mes; el gasto de marketing es la variable de ajuste más rápida')],
  ];
  s.addTable(rows, {
    x: M, y: 1.6, w: CW, colW: [4.0, 1.5, 6.13],
    border: { type: 'solid', color: C.line, pt: 1 },
    fontFace: 'Calibri', rowH: 0.6, valign: 'middle',
  });
  s.addText('El modelo no contempla todavía un evento de cola: varios siniestros de alto costo concentrados en pocos meses. Se propone revisar la sensibilidad de la bolsa una vez superemos los 200 afiliados.', {
    x: M, y: 5.6, w: CW, h: 0.5, fontSize: 12, color: C.muted, italic: true, fontFace: 'Calibri', lineSpacing: 17,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 15 · ROADMAP
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Plan de acción', 'Roadmap de lanzamiento');
  const fases = [
    { t: 'Fase 1 · Habilitación', p: 'Semanas 1–2', d: 'Aprobación de Wompi y paso a producción. Revisión legal del contrato. Apertura del módulo al equipo de caja.', color: C.blue },
    { t: 'Fase 2 · Piloto', p: 'Semanas 3–6', d: 'Venta solo en sede Colseguros. Migración de los 23 afiliados actuales. Meta: 50 afiliados y ajuste del guion de venta.', color: C.brown },
    { t: 'Fase 3 · Escala', p: 'Meses 2–4', d: 'Apertura a las tres sedes y campaña digital. Automatización de recordatorios por WhatsApp. Meta: superar el break-even de 156.', color: C.well },
    { t: 'Fase 4 · Optimización', p: 'Meses 5–12', d: 'Revisión de loss ratio real contra el modelo, ajuste de primas si aplica, y evaluación de nuevos beneficios.', color: C.green },
  ];
  const bw = (CW - 0.3 * 3) / 4;
  fases.forEach((f, i) => {
    const x = M + i * (bw + 0.3);
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.75, w: bw, h: 3.4, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.line, width: 1 } });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.75, w: bw, h: 0.42, fill: { color: f.color } });
    s.addText(f.t, { x: x + 0.15, y: 1.75, w: bw - 0.3, h: 0.42, fontSize: 13, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addText(f.p, { x: x + 0.15, y: 2.32, w: bw - 0.3, h: 0.3, fontSize: 11.5, bold: true, color: f.color, align: 'center', fontFace: 'Calibri' });
    s.addText(f.d, { x: x + 0.22, y: 2.7, w: bw - 0.44, h: 2.2, fontSize: 12, color: C.ink, fontFace: 'Calibri', lineSpacing: 17, valign: 'top' });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 5.45, w: CW, h: 0.85, rectRadius: 0.06, fill: { color: C.cream }, line: { color: C.well, width: 1 } });
  s.addText([
    { text: 'Hito de control:  ', options: { bold: true, fontSize: 13.5, color: C.deep } },
    { text: 'al cierre del mes 4 se presenta a la Junta el loss ratio real contra el modelado. Si supera el 80%, se revisan primas y criterios de cobertura antes de seguir escalando.', options: { fontSize: 13.5, color: C.ink } },
  ], { x: M + 0.35, y: 5.55, w: CW - 0.7, h: 0.65, fontFace: 'Calibri', valign: 'middle' });
}

// ═══════════════════════════════════════════════════════════════════════════
// 16 · CIERRE
// ═══════════════════════════════════════════════════════════════════════════
{
  pageNo++;
  const s = pptx.addSlide();
  s.background = { color: C.deep };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.16, fill: { color: C.brown } });
  s.addImage({ path: LOGO_I_WHITE, x: W - 2.9, y: H - 3.2, w: 2.2, h: 2.73, transparency: 90 });

  s.addText('LA DECISIÓN', {
    x: 0, y: 1.15, w: W, h: 0.4, fontSize: 12, bold: true, color: C.brown, align: 'center', charSpacing: 3, fontFace: 'Calibri',
  });
  s.addText('Aprobar el lanzamiento del\nPlan Prepagado Veterinario', {
    x: 0, y: 1.62, w: W, h: 1.2, fontSize: 32, bold: true, color: C.white, align: 'center', fontFace: 'Calibri', lineSpacing: 40,
  });
  s.addShape(pptx.ShapeType.rect, { x: (W - 1.6) / 2, y: 3.0, w: 1.6, h: 0.045, fill: { color: C.brown } });

  const cw = (CW - 0.4 * 2) / 3;
  [
    { v: '$3,0 M', l: 'Presupuesto operativo mensual' },
    { v: '$4,9 M', l: 'Capital de trabajo máximo' },
    { v: '$30,4 M', l: 'EBITDA proyectado año 1' },
  ].forEach((it, i) => {
    const x = M + i * (cw + 0.4);
    s.addShape(pptx.ShapeType.roundRect, { x, y: 3.45, w: cw, h: 1.5, rectRadius: 0.08, fill: { color: '2A5F66' }, line: { color: '3C7A82', width: 1 } });
    s.addText(it.v, { x, y: 3.68, w: cw, h: 0.6, fontSize: 30, bold: true, color: C.white, align: 'center', fontFace: 'Calibri' });
    s.addText(it.l, { x: x + 0.2, y: 4.32, w: cw - 0.4, h: 0.5, fontSize: 12, color: C.well, align: 'center', fontFace: 'Calibri', lineSpacing: 16 });
  });

  s.addImage({ path: LOGO_W_WHITE, x: (W - 2.6) / 2, y: 5.55, w: 2.6, h: 0.4 });
  s.addText('Gracias', { x: 0, y: 6.1, w: W, h: 0.4, fontSize: 15, color: C.well, align: 'center', italic: true, fontFace: 'Calibri' });
}

const OUT = 'C:/Users/goedi/OneDrive/Desktop/SofVet/Prepagada/PetsPets_Prepagada_Junta_Directiva.pptx';
await pptx.writeFile({ fileName: OUT });
console.log('Presentación generada:', OUT);
console.log('Diapositivas:', pageNo + 1);
