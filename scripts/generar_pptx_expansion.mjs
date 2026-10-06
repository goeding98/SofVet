// Presentación para inversionistas: ¿tiene sentido seguir abriendo sedes en Cali?
// Dos partes: el caso Movet en Bogotá y nuestra propia demografía (SofVet).
// Las imágenes de Expansion/img salen del mapa (scripts/mapa_origen_clientes.html)
// abierto con filtros fijos por URL y capturado con Edge en modo headless.
import PptxGenJS from 'pptxgenjs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = path.join(ROOT, 'scripts', 'assets', 'logos');
const IMG = path.join(ROOT, 'Expansion', 'img');
const LOGO_W_WHITE = L + '/wordmark_white.png';
const LOGO_I_TEAL = L + '/icon_teal_trim.png';
const LOGO_I_WHITE = L + '/icon_white_trim.png';

const C = {
  blue: '316D74', deep: '1E4E54', brown: 'A6785B', well: '99B2AA',
  cream: 'FDF6EE', white: 'FFFFFF', ink: '2D2D2D',
  muted: '7A8B8E', line: 'E3E9E9', green: '1E7D45', amber: 'B8860B', red: 'C0392B',
  sm: '2E5CBF', cls: '2E7D50', cj: 'B8860B', movet: '6B4BBF',
};

const W = 13.333, H = 7.5;
const M = 0.85;
const CW = W - M * 2;
const F = 'Calibri';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Pets & Pets';
// pptxgenjs escribe company sin escapar: un "&" pelado deja docProps/app.xml
// inválido y PowerPoint se niega a abrir el archivo.
pptx.company = 'Pets &amp; Pets';
pptx.title = '¿Más sedes en Cali? — Análisis de expansión';

let pageNo = 0;

function content(kicker, title) {
  pageNo++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.09, fill: { color: C.blue } });
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: M, y: 0.42, w: CW - 1.6, h: 0.26, fontSize: 11, bold: true, color: C.brown, charSpacing: 2, fontFace: F,
    });
  }
  s.addText(title, {
    x: M, y: kicker ? 0.7 : 0.55, w: CW - 1.0, h: 0.6, fontSize: 26, bold: true, color: C.deep, fontFace: F,
  });
  s.addImage({ path: LOGO_I_TEAL, x: W - M - 0.42, y: 0.42, w: 0.42, h: 0.52 });
  s.addText('Pets & Pets · Análisis de expansión · Confidencial', {
    x: M, y: H - 0.48, w: 6, h: 0.25, fontSize: 9, color: C.muted, fontFace: F,
  });
  s.addText(String(pageNo), {
    x: W - M - 0.5, y: H - 0.48, w: 0.5, h: 0.25, fontSize: 9, color: C.muted, align: 'right', fontFace: F,
  });
  return s;
}

function divider(num, title, subtitle) {
  pageNo++;
  const s = pptx.addSlide();
  s.background = { color: C.cream };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.28, h: H, fill: { color: C.blue } });
  s.addImage({ path: LOGO_I_TEAL, x: W - 2.5, y: H - 2.9, w: 1.9, h: 2.36, transparency: 88 });
  s.addText(num, { x: 1.5, y: 2.5, w: 1.2, h: 1.1, fontSize: 72, bold: true, color: C.well, fontFace: F });
  s.addText(title, { x: 2.75, y: 2.62, w: W - 4.2, h: 0.85, fontSize: 38, bold: true, color: C.deep, fontFace: F, valign: 'middle' });
  s.addShape(pptx.ShapeType.rect, { x: 2.82, y: 3.52, w: 1.3, h: 0.045, fill: { color: C.brown } });
  s.addText(subtitle, { x: 2.8, y: 3.72, w: W - 4.2, h: 0.8, fontSize: 15, color: C.muted, fontFace: F, valign: 'top' });
  return s;
}

function kpi(s, { x, y, w, h, label, value, sub, accent = C.blue, fill = C.cream }) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: C.line, width: 0.75 } });
  s.addShape(pptx.ShapeType.rect, { x, y, w: 0.055, h, fill: { color: accent } });
  s.addText(label.toUpperCase(), { x: x + 0.25, y: y + 0.14, w: w - 0.4, h: 0.26, fontSize: 9.5, bold: true, color: C.muted, charSpacing: 1, fontFace: F });
  s.addText(value, { x: x + 0.25, y: y + 0.42, w: w - 0.4, h: 0.55, fontSize: 26, bold: true, color: accent, fontFace: F });
  if (sub) s.addText(sub, { x: x + 0.25, y: y + 1.0, w: w - 0.4, h: h - 1.08, fontSize: 10.5, color: C.ink, fontFace: F, valign: 'top' });
}

// Recuadro de "lo que esto significa".
function callout(s, { x, y, w, h, titulo = 'LO QUE ESTO SIGNIFICA', texto, color = C.brown }) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: C.cream }, line: { color: C.well, width: 1 } });
  s.addShape(pptx.ShapeType.rect, { x, y, w: 0.07, h, fill: { color } });
  s.addText(titulo, { x: x + 0.3, y: y + 0.14, w: w - 0.5, h: 0.28, fontSize: 10.5, bold: true, color, charSpacing: 1.5, fontFace: F });
  s.addText(texto, { x: x + 0.3, y: y + 0.44, w: w - 0.5, h: h - 0.55, fontSize: 13, color: C.ink, fontFace: F, valign: 'top', lineSpacing: 19 });
}

// Viñetas con texto enriquecido: cada item es string o arreglo de runs.
function bullets(s, items, { x, y, w, h, fontSize = 14, gap = 8 }) {
  const runs = [];
  items.forEach((it, i) => {
    const parts = Array.isArray(it) ? it : [{ text: it }];
    parts.forEach((p, j) => runs.push({
      text: p.text,
      options: {
        bold: p.bold, color: p.color || C.ink, fontSize,
        ...(j === 0 ? { bullet: { code: '25CF' }, paraSpaceBefore: i ? gap : 0 } : {}),
        ...(j === parts.length - 1 ? { breakLine: true } : {}),
      },
    }));
  });
  s.addText(runs, { x, y, w, h, fontFace: F, valign: 'top', lineSpacing: fontSize * 1.38 });
}

const th = (t, o = {}) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.blue }, fontSize: 12, align: 'center', valign: 'middle', ...o } });
const td = (t, o = {}) => ({ text: t, options: { fontSize: 12, color: C.ink, valign: 'middle', ...o } });
const B = t => ({ text: t, bold: true });
const N = t => ({ text: t });

// Imagen de mapa con borde y pie de foto.
function mapa(s, file, { x, y, w, h, pie }) {
  s.addShape(pptx.ShapeType.rect, { x: x - 0.03, y: y - 0.03, w: w + 0.06, h: h + 0.06, fill: { color: C.ink }, line: { color: C.ink } });
  s.addImage({ path: path.join(IMG, file), x, y, w, h });
  if (pie) s.addText(pie, { x, y: y + h + 0.05, w, h: 0.3, fontSize: 9.5, italic: true, color: C.muted, fontFace: F });
}

// Leyenda de sedes sobre el mapa.
function leyendaSedes(s, x, y, extra = []) {
  const items = [['S', 'Santa Mónica', C.sm], ['C', 'Colseguros', C.cls], ['C', 'Ciudad Jardín', C.cj], ...extra];
  items.forEach(([l, n, c], i) => {
    s.addShape(pptx.ShapeType.ellipse, { x, y: y + i * 0.3, w: 0.2, h: 0.2, fill: { color: c }, line: { color: C.white, width: 1 } });
    s.addText(n, { x: x + 0.27, y: y + i * 0.3 - 0.04, w: 2.4, h: 0.28, fontSize: 10.5, color: C.ink, fontFace: F });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTADA
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.deep };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.16, fill: { color: C.brown } });
  s.addImage({ path: LOGO_I_WHITE, x: W - 3.1, y: H - 3.5, w: 2.6, h: 3.23, transparency: 88 });
  s.addImage({ path: LOGO_W_WHITE, x: (W - 4.2) / 2, y: 1.35, w: 4.2, h: 0.65 });
  s.addText('¿MÁS SEDES EN CALI?', { x: 0, y: 2.45, w: W, h: 0.8, fontSize: 42, bold: true, color: C.white, align: 'center', fontFace: F });
  s.addShape(pptx.ShapeType.rect, { x: (W - 1.6) / 2, y: 3.36, w: 1.6, h: 0.045, fill: { color: C.brown } });
  s.addText('Lo que nos dicen Movet en Bogotá y nuestros propios datos', {
    x: 0, y: 3.6, w: W, h: 0.45, fontSize: 18, color: C.well, align: 'center', fontFace: F,
  });
  s.addText('Presentación a inversionistas  ·  Cali, octubre 2026', { x: 0, y: H - 1.15, w: W, h: 0.3, fontSize: 12, color: C.well, align: 'center', fontFace: F });
  s.addText('Confidencial', { x: 0, y: H - 0.82, w: W, h: 0.3, fontSize: 9.5, color: C.muted, align: 'center', italic: true, fontFace: F });
}

// ═══════════════════════════════════════════════════════════════════════════
// RESUMEN
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Resumen', 'Con 3 hospitales 24 horas, Cali ya está cubierta');
  s.addText(
    'Evaluamos abrir una cuarta sede 24 horas en Cali (el caso concreto: Calle 13 #72, entre Colseguros y Ciudad Jardín). ' +
    'Lo comparamos con lo que ha hecho Movet, nuestro competidor directo, en Bogotá, y con los datos reales de nuestros clientes en SofVet.',
    { x: M, y: 1.45, w: CW, h: 0.75, fontSize: 14, color: C.ink, fontFace: F, lineSpacing: 21 });

  const cw = (CW - 0.3 * 3) / 4;
  [
    { label: 'Movet en Bogotá', value: '1 × 720 mil', sub: 'Un hospital 24h por cada ~720 mil habitantes, en la ciudad más rica del país', accent: C.movet },
    { label: 'Pets & Pets en Cali', value: '1 × 770 mil', sub: 'Ya tenemos la misma densidad, con un PIB por persona 34% menor', accent: C.blue },
    { label: 'Urgencias de noche', value: '5,4', sub: 'Consultas por noche entre 8 pm y 8 am, sumando las 3 sedes', accent: C.amber },
    { label: 'Sede en Calle 13 #72', value: '75–84%', sub: 'De su volumen tendría que ser cliente nuevo; hay 7 veterinarias "24h" a menos de 2 km', accent: C.red },
  ].forEach((it, i) => kpi(s, { x: M + i * (cw + 0.3), y: 2.35, w: cw, h: 1.9, ...it }));

  callout(s, {
    x: M, y: 4.55, w: CW, h: 1.6, titulo: 'NUESTRA RECOMENDACIÓN',
    texto: [
      { text: 'No abrir un cuarto hospital 24 horas en Cali. ', options: { bold: true } },
      { text: 'Una sede nueva redistribuye clientes que ya son nuestros y reparte un volumen nocturno que no alcanza para otro turno de noche. ' +
        'El crecimiento en Cali debe venir de llenar las 3 sedes (Prepagada, especialistas, domicilio). Si hay que cubrir un hueco, el norte, con un formato satélite de día, como el Movet Express.' },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 1 · MOVET
// ═══════════════════════════════════════════════════════════════════════════
divider('01', 'El caso Movet', 'Cómo ha crecido nuestro competidor directo en Bogotá, y qué nos enseña su ritmo de aperturas');

{
  const s = content('Movet · Quién es', 'Una cadena con capital de riesgo y foco en urgencias 24h');
  bullets(s, [
    [B('Origen: '), N('nace en 2021 como telemedicina veterinaria con membresía. En julio de 2022 abre su primera clínica física en Bogotá.')],
    [B('Capital: '), N('US$7 millones en 2022, liderados por el fondo estadounidense 8VC. En octubre de 2024, US$5 millones de Wivet (Chile, Grupo Ibáñez Atkinson).')],
    [B('Modelo: '), N('clínicas 24 horas de alta complejidad (urgencias, hospitalización, cirugía, laboratorio, imágenes) más puntos "Movet Express" de atención ambulatoria.')],
    [B('Hoy (octubre 2026): '), N('16 sedes abiertas en 4 ciudades. 12 son 24 horas y 4 son Express.')],
    [B('Cali: '), N('su página la lista como "próximamente". Tienen planeado abrir aquí antes de cerrar 2026.')],
  ], { x: M, y: 1.5, w: 7.3, h: 4.9, fontSize: 14.5, gap: 12 });

  const x = M + 7.7, w = CW - 7.7;
  kpi(s, { x, y: 1.55, w, h: 1.35, label: 'Capital levantado', value: '≈ US$12 M', sub: '2022 (8VC) + 2024 (Wivet)', accent: C.movet });
  kpi(s, { x, y: 3.05, w, h: 1.35, label: 'Sedes abiertas', value: '16', sub: '13 en Bogotá · 1 Medellín · Manizales · Pereira', accent: C.movet });
  kpi(s, { x, y: 4.55, w, h: 1.35, label: 'En Bogotá', value: '11 + 2', sub: '11 hospitales 24h + 2 Express', accent: C.movet });
}

{
  const s = content('Movet · Promesa vs. realidad', 'Ni con US$12 millones pudieron abrir al ritmo que anunciaron');
  // Línea de tiempo
  const y0 = 2.35;
  s.addShape(pptx.ShapeType.line, { x: M + 0.3, y: y0, w: CW - 0.6, h: 0, line: { color: C.well, width: 3 } });
  const hitos = [
    { f: 'Julio 2022', t: 'Primera clínica', d: 'Anuncian 21 clínicas en 12 meses: 15 en Bogotá, 3 en Cali y 3 en Medellín. Meta: 500 en Latinoamérica.' },
    { f: 'Octubre 2024', t: '5 clínicas', d: 'Llega Wivet con US$5 M. Nuevo plan: una clínica por mes durante 3 años (36 en total).' },
    { f: 'Octubre 2026', t: '16 sedes', d: 'En 2 años abrieron 11, la mitad del ritmo anunciado. Cali, prometida en 2022, sigue sin abrir.' },
  ];
  const cw = (CW - 0.6) / 3;
  hitos.forEach((h, i) => {
    const cx = M + 0.3 + cw * i + cw / 2;
    s.addShape(pptx.ShapeType.ellipse, { x: cx - 0.17, y: y0 - 0.17, w: 0.34, h: 0.34, fill: { color: C.movet }, line: { color: C.white, width: 2 } });
    s.addText(h.f, { x: cx - cw / 2, y: y0 - 0.75, w: cw, h: 0.35, fontSize: 13, bold: true, color: C.movet, align: 'center', fontFace: F });
    s.addText(h.t, { x: cx - cw / 2 + 0.15, y: y0 + 0.3, w: cw - 0.3, h: 0.45, fontSize: 20, bold: true, color: C.deep, align: 'center', fontFace: F });
    s.addText(h.d, { x: cx - cw / 2 + 0.2, y: y0 + 0.8, w: cw - 0.4, h: 1.15, fontSize: 12.5, color: C.ink, align: 'center', fontFace: F, valign: 'top' });
  });

  s.addTable([
    [th('Plan anunciado'), th('Prometido'), th('Logrado'), th('Cumplimiento')],
    [td('2022: clínicas en 12 meses'), td('21', { align: 'center' }), td('5 a oct 2024', { align: 'center' }), td('Muy por debajo', { align: 'center', color: C.red, bold: true })],
    [td('2024: una por mes por 3 años (a mitad de camino)'), td('≈ 24 a oct 2026', { align: 'center' }), td('11 nuevas', { align: 'center' }), td('≈ 46%', { align: 'center', color: C.red, bold: true })],
    [td('2022: sedes en Cali'), td('3', { align: 'center' }), td('0', { align: 'center' }), td('0%', { align: 'center', color: C.red, bold: true })],
  ], { x: M, y: 4.55, w: 7.4, colW: [3.4, 1.4, 1.4, 1.2], rowH: 0.38, border: { type: 'solid', color: C.line, pt: 0.75 }, fontFace: F });

  callout(s, { x: M + 7.7, y: 4.55, w: CW - 7.7, h: 1.95, texto:
    'Abrir hospitales 24h es lento y caro incluso con capital de riesgo. El cuello de botella no es el dinero: son el personal médico de noche y la demanda que cada sede necesita para sostenerse.' });
}

{
  const s = content('Movet · Dónde está en Bogotá', 'Se concentró en el norte y luego cambió de formato');
  const rows = [
    [th('Localidad'), th('Zona'), th('24 horas'), th('Express')],
    [td('Suba (Acuarela, Bulevar Niza, Colina, Calle 170)'), td('Norte'), td('3', { align: 'center' }), td('1', { align: 'center' })],
    [td('Usaquén (Calle 109, Cedritos, Homecenter 153)'), td('Norte'), td('2', { align: 'center' }), td('1', { align: 'center' })],
    [td('Chapinero'), td('Centro-norte'), td('1', { align: 'center' }), td('—', { align: 'center' })],
    [td('Teusaquillo (Parkway)'), td('Centro'), td('1', { align: 'center' }), td('—', { align: 'center' })],
    [td('Engativá (Calle 80)'), td('Occidente'), td('1', { align: 'center' }), td('—', { align: 'center' })],
    [td('Fontibón (Salitre)'), td('Occidente'), td('1', { align: 'center' }), td('—', { align: 'center' })],
    [td('Kennedy (Castilla)'), td('Suroccidente'), td('1', { align: 'center' }), td('—', { align: 'center' })],
    [td('Puente Aranda (Ciudad Montes)'), td('Centro-sur'), td('1', { align: 'center' }), td('—', { align: 'center' })],
    [td('Bosa, Usme, Ciudad Bolívar, San Cristóbal, Rafael Uribe…', { color: C.muted, italic: true }), td('Sur', { color: C.muted }), td('0', { align: 'center', color: C.red, bold: true }), td('0', { align: 'center', color: C.red, bold: true })],
    [td('Total Bogotá', { bold: true }), td(''), td('11', { align: 'center', bold: true }), td('2', { align: 'center', bold: true })],
  ];
  s.addTable(rows, { x: M, y: 1.5, w: 7.4, colW: [4.2, 1.3, 0.95, 0.95], rowH: 0.36, border: { type: 'solid', color: C.line, pt: 0.75 }, fontFace: F, fontSize: 11.5 });

  bullets(s, [
    [B('Siguen el ingreso: '), N('7 de sus 13 sedes están en Suba y Usaquén. En el sur de Bogotá, donde vive cerca de un tercio de la ciudad, no tienen ninguna.')],
    [B('Después de 11 hospitales dejaron de abrir 24h en Bogotá: '), N('los últimos puntos fueron "Express", más pequeños y de día, al lado de sus hospitales.')],
    [B('El crecimiento se fue a otras ciudades: '), N('Medellín, Manizales, Pereira y, próximamente, Cali.')],
  ], { x: M + 7.75, y: 1.5, w: CW - 7.75, h: 4.9, fontSize: 13.5, gap: 14 });
}

{
  const s = content('Movet vs. Pets & Pets', 'Cali ya tiene la densidad 24h de Movet en Bogotá');
  const rows = [
    [th(''), th('Movet en Bogotá', { fill: { color: C.movet } }), th('Pets & Pets en Cali')],
    [td('Población', { bold: true }), td('≈ 7,9 millones', { align: 'center' }), td('≈ 2,3 millones', { align: 'center' })],
    [td('Hospitales 24 horas', { bold: true }), td('11', { align: 'center' }), td('3', { align: 'center' })],
    [td('Habitantes por hospital 24h', { bold: true }), td('≈ 720 mil', { align: 'center' }), td('≈ 770 mil', { align: 'center', bold: true, color: C.blue })],
    [td('Perros y gatos estimados (MinSalud)', { bold: true }), td('1,28 millones', { align: 'center' }), td('211 mil', { align: 'center' })],
    [td('Mascotas por hospital 24h', { bold: true }), td('≈ 116 mil', { align: 'center' }), td('≈ 70 mil', { align: 'center', bold: true, color: C.blue })],
    [td('PIB por persona (DANE 2024)', { bold: true }), td('$49,7 millones', { align: 'center' }), td('$32,9 millones (Valle)', { align: 'center' })],
  ];
  s.addTable(rows, { x: M, y: 1.5, w: 7.2, colW: [3.0, 2.1, 2.1], rowH: 0.45, border: { type: 'solid', color: C.line, pt: 0.75 }, fontFace: F, fontSize: 12.5 });
  s.addText('Movet es solo un jugador en Bogotá: esta proporción no mide el tamaño del mercado, sino a qué densidad llegó una cadena bien financiada antes de cambiar de estrategia.', {
    x: M, y: 4.85, w: 7.2, h: 0.6, fontSize: 10.5, italic: true, color: C.muted, fontFace: F,
  });

  const x = M + 7.55, w = CW - 7.55;
  s.addText('¿Cuántos hospitales 24h le caben a Cali con la proporción de Movet?', { x, y: 1.5, w, h: 0.6, fontSize: 14, bold: true, color: C.deep, fontFace: F });
  const barras = [['Por población', 3.2], ['Por población, ajustado por ingreso', 2.1], ['Por número de mascotas', 1.8]];
  barras.forEach(([l, v], i) => {
    const y = 2.25 + i * 0.78;
    s.addText(l, { x, y, w, h: 0.28, fontSize: 11.5, color: C.ink, fontFace: F });
    const maxW = w - 0.8;
    s.addShape(pptx.ShapeType.rect, { x, y: y + 0.3, w: maxW * v / 3.5, h: 0.3, fill: { color: C.well } });
    s.addText(v.toLocaleString('es-CO'), { x: x + maxW * v / 3.5 + 0.08, y: y + 0.28, w: 0.7, h: 0.34, fontSize: 13, bold: true, color: C.deep, fontFace: F });
  });
  // Línea de "lo que tenemos"
  const maxW = w - 0.8;
  s.addShape(pptx.ShapeType.line, { x: x + maxW * 3 / 3.5, y: 2.45, w: 0, h: 2.3, line: { color: C.red, width: 2, dashType: 'dash' } });
  s.addText('Tenemos 3', { x: x + maxW * 3 / 3.5 - 0.6, y: 4.75, w: 1.2, h: 0.28, fontSize: 11, bold: true, color: C.red, align: 'center', fontFace: F });
  callout(s, { x, y: 5.15, w, h: 1.4, titulo: 'CONCLUSIÓN', texto: 'Con cualquier medida, Cali soporta entre 2 y 3 hospitales 24h. Ya tenemos 3.' });
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 2 · NUESTRA DEMOGRAFÍA
// ═══════════════════════════════════════════════════════════════════════════
divider('02', 'Nuestra propia demografía', 'De dónde vienen nuestros clientes, a qué hora llegan y qué pasaría con una sede nueva. Datos reales de SofVet, julio a octubre de 2026');

{
  const s = content('Mapa de clientes', 'Nuestros clientes vienen de toda la ciudad');
  const h = 5.2, w = h * 900 / 940;
  mapa(s, 'general.png', { x: M, y: 1.4, w, h, pie: 'Mapa de calor: cada cliente atendido en los últimos 3 meses, ubicado por la dirección de su ficha.' });
  const x = M + w + 0.45, ww = CW - w - 0.45;
  leyendaSedes(s, x, 1.5);
  bullets(s, [
    [B('Rojo = muchos clientes. '), N('Azul = pocos. Cada cliente cuenta una vez, aunque haya venido 20 veces.')],
    [B('Círculos punteados: '), N('2,8 km alrededor de cada sede. Ahí vive la mitad de los clientes de esa sede.')],
    [B('La otra mitad viene de más lejos: '), N('de todas las comunas. El cliente de Pets & Pets elige la marca, no solo la cercanía.')],
    [B('Los círculos de Santa Mónica y Colseguros se tocan: '), N('ya compiten por el mismo barrio.')],
  ], { x, y: 2.55, w: ww, h: 3.9, fontSize: 13.5, gap: 12 });
}

{
  const s = content('Radio de atracción', 'La mitad de nuestros clientes vive a más de 2,5 km de su sede');
  s.addTable([
    [th('Sede'), th('Distancia típica\n(mediana)'), th('3 de cada 4\nviven a menos de'), th('9 de cada 10\nviven a menos de'), th('Viven a menos\nde 1 km')],
    [td('Santa Mónica', { bold: true, color: C.sm }), td('2,6 km', { align: 'center' }), td('4,7 km', { align: 'center' }), td('6,6 km', { align: 'center' }), td('21%', { align: 'center' })],
    [td('Colseguros', { bold: true, color: C.cls }), td('2,8 km', { align: 'center' }), td('4,9 km', { align: 'center' }), td('6,7 km', { align: 'center' }), td('19%', { align: 'center' })],
    [td('Ciudad Jardín', { bold: true, color: C.cj }), td('2,4 km', { align: 'center' }), td('4,0 km', { align: 'center' }), td('8,0 km', { align: 'center' }), td('10%', { align: 'center' })],
  ], { x: M, y: 1.5, w: CW, colW: [2.6, 2.1, 2.2, 2.2, 2.53], rowH: [0.65, 0.48, 0.48, 0.48], border: { type: 'solid', color: C.line, pt: 0.75 }, fontFace: F, fontSize: 13 });

  const cw = (CW - 0.3 * 2) / 3;
  kpi(s, { x: M, y: 3.85, w: cw, h: 1.5, label: 'Santa Mónica ↔ Colseguros', value: '3,5 km', sub: 'En línea recta (6,8 km por calle). Menos que la distancia típica de un cliente.', accent: C.sm });
  kpi(s, { x: M + cw + 0.3, y: 3.85, w: cw, h: 1.5, label: 'Colseguros ↔ Ciudad Jardín', value: '6,7 km', sub: 'En línea recta. Cualquier punto en medio queda a ~3,3 km de una sede.', accent: C.cls });
  kpi(s, { x: M + (cw + 0.3) * 2, y: 3.85, w: cw, h: 1.5, label: 'Calle → carro', value: '× 2', sub: 'En Cali, 1 km en línea recta equivale a unos 2 km manejando.', accent: C.amber });
  s.addText('Distancias en línea recta entre la dirección del cliente y la sede donde se atendió. Últimos 3 meses, clientes ubicados a nivel de casa o cuadra.', {
    x: M, y: 5.6, w: CW, h: 0.35, fontSize: 10, italic: true, color: C.muted, fontFace: F,
  });
  s.addText('Una sede nueva a 3–4 km de una existente cae dentro del área que esa sede ya atiende.', {
    x: M, y: 6.0, w: CW, h: 0.45, fontSize: 15, bold: true, color: C.deep, fontFace: F,
  });
}

{
  const s = content('Día vs. noche', 'De noche, el corredor del sur casi no genera urgencias');
  const h = 4.6, w = h * 760 / 940;
  mapa(s, 'dia.png', { x: M, y: 1.75, w, h });
  mapa(s, 'noche.png', { x: M + w + 0.25, y: 1.75, w, h });
  s.addText('8 am – 8 pm', { x: M, y: 1.38, w, h: 0.32, fontSize: 13, bold: true, color: C.deep, align: 'center', fontFace: F });
  s.addText('8 pm – 8 am', { x: M + w + 0.25, y: 1.38, w, h: 0.32, fontSize: 13, bold: true, color: C.deep, align: 'center', fontFace: F });
  s.addText('Visitas de los últimos 3 meses según la hora registrada en SofVet.', { x: M, y: 6.4, w: w * 2 + 0.25, h: 0.3, fontSize: 9.5, italic: true, color: C.muted, fontFace: F });

  const x = M + w * 2 + 0.6, ww = CW - w * 2 - 0.6;
  s.addTable([
    [th('Por noche', { fontSize: 11 }), th('Consultas', { fontSize: 11 }), th('Ingresos hosp.', { fontSize: 11 })],
    [td('Santa Mónica', { color: C.sm, bold: true, fontSize: 11.5 }), td('1,4', { align: 'center' }), td('0,5', { align: 'center' })],
    [td('Colseguros', { color: C.cls, bold: true, fontSize: 11.5 }), td('2,6', { align: 'center' }), td('1,1', { align: 'center' })],
    [td('Ciudad Jardín', { color: C.cj, bold: true, fontSize: 11.5 }), td('1,3', { align: 'center' }), td('0,5', { align: 'center' })],
    [td('Total red', { bold: true, fontSize: 11.5 }), td('5,4', { align: 'center', bold: true }), td('2,1', { align: 'center', bold: true })],
  ], { x, y: 1.5, w: ww, colW: [ww * 0.42, ww * 0.27, ww * 0.31], rowH: 0.4, border: { type: 'solid', color: C.line, pt: 0.75 }, fontFace: F });
  callout(s, { x, y: 3.75, w: ww, h: 2.65, texto:
    'Entre 8 pm y 8 am llegan unas 5 consultas por noche a toda la red. Un cuarto hospital no crearía urgencias nuevas: se repartiría esas mismas, y pagaríamos un turno de noche más.' });
}

{
  const s = content('Caso concreto · Calle 13 #72', 'La zona ya tiene 7 veterinarias que se anuncian como 24 horas');
  const h = 5.1, w = h * 1000 / 905;
  mapa(s, 'propuesta.png', { x: M, y: 1.4, w, h, pie: 'N = sede propuesta (Pasoancho con Carrera 72). Círculo rojo: 2,8 km. Puntos grises: competidores 24h.' });
  const x = M + w + 0.4, ww = CW - w - 0.4;
  leyendaSedes(s, x, 1.5, [['N', 'Propuesta Calle 13 #72', C.red], ['', 'Competidor "24h"', '9CA3AF']]);
  bullets(s, [
    [B('3,9 km de Colseguros y 2,9 km de Ciudad Jardín '), N('en línea recta: dentro de su área de clientes.')],
    [B('Competencia encima: '), N('CMA Urgencias a 400 m; Servivet (24h con hospitalización) a 1,7 km; otras 5 a menos de 1,5 km.')],
    [B('Movet también llega a Cali: '), N('la competencia por la urgencia nocturna va a subir, no a bajar.')],
  ], { x, y: 3.2, w: ww, h: 3.4, fontSize: 13, gap: 12 });
}

{
  const s = content('Caso concreto · Calle 13 #72', 'Para llenarse, 3 de cada 4 clientes tendrían que ser nuevos');
  s.addText('Meta: que la sede nueva madure al nivel de Colseguros hoy (julio a octubre de 2026).', {
    x: M, y: 1.4, w: CW, h: 0.35, fontSize: 13.5, color: C.ink, fontFace: F,
  });
  const cw = (CW - 0.3 * 3) / 4;
  kpi(s, { x: M, y: 1.9, w: cw, h: 1.55, label: 'Meta cada 3 meses', value: '800', sub: '591 consultas + 209 hospitalizaciones (~267 al mes)', accent: C.blue });
  kpi(s, { x: M + (cw + 0.3), y: 1.9, w: cw, h: 1.55, label: 'De nuestras sedes', value: '130–200', sub: 'Clientes que hoy atendemos y les quedaría más cerca', accent: C.amber });
  kpi(s, { x: M + (cw + 0.3) * 2, y: 1.9, w: cw, h: 1.55, label: 'Tendrían que ser nuevos', value: '600–670', sub: '75–84% del volumen, quitado a la competencia', accent: C.red });
  kpi(s, { x: M + (cw + 0.3) * 3, y: 1.9, w: cw, h: 1.55, label: 'De noche, canibalizado', value: '0,7', sub: 'Atenciones por noche que se moverían desde las 3 sedes', accent: C.muted });

  s.addTable([
    [th('Saldría de…'), th('Escenario probable'), th('Escenario conservador'), th('% del volumen de esa sede')],
    [td('Colseguros', { bold: true, color: C.cls }), td('111', { align: 'center' }), td('70', { align: 'center' }), td('9–14%', { align: 'center' })],
    [td('Ciudad Jardín', { bold: true, color: C.cj }), td('67', { align: 'center' }), td('44', { align: 'center' }), td('9–13%', { align: 'center' })],
    [td('Santa Mónica', { bold: true, color: C.sm }), td('21', { align: 'center' }), td('17', { align: 'center' }), td('4%', { align: 'center' })],
    [td('Total canibalizado', { bold: true }), td('≈ 200', { align: 'center', bold: true }), td('≈ 130', { align: 'center', bold: true }), td('')],
  ], { x: M, y: 3.75, w: 7.6, colW: [2.0, 1.8, 1.9, 1.9], rowH: 0.4, border: { type: 'solid', color: C.line, pt: 0.75 }, fontFace: F, fontSize: 12.5 });
  s.addText('Consultas + hospitalizaciones cada 3 meses. Probable: el cliente se pasa si la sede nueva le queda más cerca. Conservador: solo si le queda a menos de 2,8 km y le ahorra más de 1 km.', {
    x: M, y: 5.85, w: 7.6, h: 0.6, fontSize: 10, italic: true, color: C.muted, fontFace: F,
  });
  callout(s, { x: M + 7.95, y: 3.75, w: CW - 7.95, h: 2.7, texto:
    'A Colseguros y Ciudad Jardín les quitaría entre 9% y 14% cada una. Y el resto del volumen habría que ganárselo a 7 competidores que ya están en la zona.' });
}

// ═══════════════════════════════════════════════════════════════════════════
// OTRA OPCIÓN · PALMIRA
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Otra opción · Palmira', 'Movet entró por Bello, pero Bello no es Palmira');
  s.addText('Antes de abrir en Medellín, Movet abrió su primera clínica de Antioquia en el C.C. Parque Fabricato, en Bello. Movet no ha explicado públicamente por qué. Nuestra lectura:', {
    x: M, y: 1.4, w: 5.6, h: 0.95, fontSize: 13, color: C.ink, fontFace: F, valign: 'top', lineSpacing: 18,
  });
  bullets(s, [
    [B('Bello es Medellín en la práctica: '), N('está pegado a la ciudad, sobre la línea A del Metro y la Autopista Norte. La clínica atiende a Bello y al norte de Medellín.')],
    [B('Mucha gente en poco espacio: '), N('600 mil habitantes, 12 veces la densidad de Palmira.')],
    [B('Un centro comercial ancla: '), N('parqueadero, visibilidad y tráfico propio.')],
    [B('Después fue por el ingreso: '), N('sus siguientes sedes son Laureles y Envigado.')],
  ], { x: M, y: 2.4, w: 5.6, h: 4.2, fontSize: 13, gap: 10 });

  const x = M + 6.0, w = CW - 6.0;
  s.addTable([
    [th(''), th('Bello', { fill: { color: C.movet } }), th('Palmira')],
    [td('Población 2025', { bold: true }), td('601.916', { align: 'center' }), td('380.980\n(296 mil urbana)', { align: 'center' })],
    [td('Habitantes por km²', { bold: true }), td('3.947', { align: 'center' }), td('320', { align: 'center' })],
    [td('Relación con la ciudad grande', { bold: true }), td('Pegada a Medellín (Metro)', { align: 'center' }), td('Ciudad aparte, ~30 km de Cali', { align: 'center' })],
    [td('Viviendas estrato 4 o más', { bold: true }), td('≈ 4%', { align: 'center' }), td('≈ 11%', { align: 'center', bold: true, color: C.green })],
    [td('PIB por habitante 2024', { bold: true }), td('≈ $16 M', { align: 'center' }), td('≈ $29 M (como Cali)', { align: 'center', bold: true, color: C.green })],
    [td('Perros y gatos (MinSalud 2017)', { bold: true }), td('23.600*', { align: 'center' }), td('39.000', { align: 'center' })],
  ], { x, y: 1.45, w, colW: [w * 0.38, w * 0.3, w * 0.32], rowH: 0.52, border: { type: 'solid', color: C.line, pt: 0.75 }, fontFace: F, fontSize: 11.5 });
  s.addText('* La cifra oficial de Bello parece subestimada. Estratos: Bello, Gobernación de Antioquia (2004); Palmira, POT (2021). PIB: DANE 2024 dividido por la población.', {
    x, y: 5.25, w, h: 0.5, fontSize: 9.5, italic: true, color: C.muted, fontFace: F,
  });
  s.addText('Palmira tiene mejor ingreso que Bello, pero no tiene lo que buscó Movet: una masa de gente pegada a la ciudad grande.', {
    x, y: 5.85, w, h: 0.65, fontSize: 13, bold: true, color: C.deep, fontFace: F,
  });
}

{
  const s = content('Otra opción · Palmira', 'Palmira da para un punto pequeño, no para un hospital 24h');
  const cw = (CW - 0.3 * 3) / 4;
  kpi(s, { x: M, y: 1.45, w: cw, h: 1.75, label: 'Proporción Movet', value: '0,3–0,5', sub: 'Hospitales 24h que soporta Palmira (por mascotas y por población)', accent: C.movet });
  kpi(s, { x: M + (cw + 0.3), y: 1.45, w: cw, h: 1.75, label: 'Lo que hizo Movet', value: 'Express', sub: 'En Manizales (472 mil hab.) y Pereira (487 mil), más grandes que Palmira, no abrió 24h', accent: C.movet });
  kpi(s, { x: M + (cw + 0.3) * 2, y: 1.45, w: cw, h: 1.75, label: 'Competencia "24h"', value: '4', sub: 'La Merced, San Martín, TodoCan y Vital Pet se anuncian como 24h', accent: C.red });
  kpi(s, { x: M + (cw + 0.3) * 3, y: 1.45, w: cw, h: 1.75, label: 'Demanda que ya vemos', value: '4', sub: 'Clientes en SofVet con dirección en Palmira, de 6.222. 11 atenciones desde marzo', accent: C.amber });

  const half = (CW - 0.4) / 2;
  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 3.45, w: half, h: 2.75, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.line, width: 0.75 } });
  s.addText('A FAVOR', { x: M + 0.3, y: 3.57, w: half - 0.6, h: 0.3, fontSize: 11, bold: true, color: C.green, charSpacing: 1.5, fontFace: F });
  bullets(s, [
    'Segunda ciudad del Valle (8% del departamento).',
    'Ingreso por habitante similar al de Cali y más estrato 4 que Bello.',
    'Mercado distinto: no le quita clientes a nuestras sedes de Cali.',
  ], { x: M + 0.3, y: 3.93, w: half - 0.6, h: 2.2, fontSize: 13, gap: 8 });

  const x2 = M + half + 0.4;
  s.addShape(pptx.ShapeType.roundRect, { x: x2, y: 3.45, w: half, h: 2.75, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.line, width: 0.75 } });
  s.addText('EN CONTRA', { x: x2 + 0.3, y: 3.57, w: half - 0.6, h: 0.3, fontSize: 11, bold: true, color: C.red, charSpacing: 1.5, fontFace: F });
  bullets(s, [
    'Pequeña para un 24h: un tercio a la mitad de lo que Movet le pide a un hospital.',
    'Ya hay 4 veterinarias que se anuncian como 24h.',
    'Casi no tenemos clientes allá: hay que construir la marca desde cero.',
    'A ~30 km, el soporte desde Cali (traslados, personal) es más difícil.',
  ], { x: x2 + 0.3, y: 3.93, w: half - 0.6, h: 2.2, fontSize: 13, gap: 8 });

  s.addText([
    { text: 'Si vamos a Palmira: ', options: { bold: true, color: C.deep } },
    { text: 'primero probar la demanda con el servicio a domicilio y pauta local; si responde, un punto de día (estilo Movet Express) que remita las hospitalizaciones a Cali. No un hospital 24h.', options: { color: C.ink } },
  ], { x: M, y: 6.3, w: CW, h: 0.6, fontSize: 12.5, fontFace: F, valign: 'top' });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONCLUSIONES
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Conclusiones', 'Por qué no tiene sentido seguir abriendo hospitales 24h en Cali');
  const items = [
    ['1', 'La densidad ya está', 'Tenemos un hospital 24h por cada ~770 mil caleños, igual que Movet en Bogotá, en una ciudad con 34% menos ingreso por persona.'],
    ['2', 'Una sede nueva redistribuye', 'La mitad de nuestros clientes ya viaja más de 2,5 km. Entre sedes a 3–7 km, la nueva atiende sobre todo a gente que ya es nuestra.'],
    ['3', 'La noche no alcanza', '5,4 consultas por noche en toda la red. Un cuarto turno de noche reparte la misma demanda con un costo fijo más.'],
    ['4', 'Hasta Movet frenó', 'Con US$12 M abrió la mitad de lo que prometió y, tras 11 hospitales en Bogotá, cambió a formato Express y a otras ciudades.'],
  ];
  const cw = (CW - 0.3) / 2, ch = 2.35;
  items.forEach(([n, t, d], i) => {
    const x = M + (i % 2) * (cw + 0.3), y = 1.5 + Math.floor(i / 2) * (ch + 0.25);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.08, fill: { color: C.cream }, line: { color: C.line, width: 0.75 } });
    s.addText(n, { x: x + 0.25, y: y + 0.2, w: 0.7, h: 0.7, fontSize: 36, bold: true, color: C.well, fontFace: F });
    s.addText(t, { x: x + 1.0, y: y + 0.25, w: cw - 1.2, h: 0.5, fontSize: 18, bold: true, color: C.deep, fontFace: F });
    s.addText(d, { x: x + 1.0, y: y + 0.8, w: cw - 1.25, h: ch - 0.95, fontSize: 13.5, color: C.ink, fontFace: F, valign: 'top', lineSpacing: 19 });
  });
}

{
  const s = content('Qué sí proponemos', 'Crecer llenando las 3 sedes, no sumando una cuarta');
  const items = [
    ['Más ingreso por cliente', 'Medicina Prepagada: ingreso recurrente mensual y clientes que vuelven. Especialistas, laboratorio e imágenes en las 3 sedes.', C.blue],
    ['Cubrir huecos sin un hospital', 'El único hueco real está en el norte: ~105 clientes viven a más de 2,5 km de cualquier sede. Si se cubre, con un satélite de día (como el Movet Express) que remita a Santa Mónica.', C.green],
    ['Prepararnos para Movet', 'Su llegada a Cali está anunciada para 2026. Defender la base actual (Prepagada, servicio, tiempos de urgencia) vale más que dividirla.', C.movet],
    ['Si hay capital para expandir', 'En otra ciudad o formato, con el mismo análisis de demanda. Palmira: probar primero con domicilio y, si responde, un punto de día.', C.brown],
  ];
  items.forEach(([t, d, c], i) => {
    const y = 1.5 + i * 1.22;
    s.addShape(pptx.ShapeType.roundRect, { x: M, y, w: CW, h: 1.05, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.line, width: 0.75 } });
    s.addShape(pptx.ShapeType.rect, { x: M, y, w: 0.08, h: 1.05, fill: { color: c } });
    s.addText(t, { x: M + 0.35, y: y + 0.1, w: 3.4, h: 0.85, fontSize: 16, bold: true, color: c, fontFace: F, valign: 'middle' });
    s.addText(d, { x: M + 3.9, y: y + 0.1, w: CW - 4.1, h: 0.85, fontSize: 13, color: C.ink, fontFace: F, valign: 'middle' });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// METODOLOGÍA Y FUENTES
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = content('Anexo', 'Metodología y fuentes');
  bullets(s, [
    [B('Datos propios: '), N('SofVet, 5 de julio a 5 de octubre de 2026. Consultas, ingresos a hospitalización, procedimientos y citas, con la sede y la hora registradas. La hora es la del registro, no necesariamente la de llegada.')],
    [B('Ubicación de clientes: '), N('dirección de la ficha geocodificada con OpenStreetMap, a nivel de casa o de cuadra. Los clientes sin dirección ubicable (35–50%) se asumen repartidos igual que los ubicados.')],
    [B('Distancias: '), N('en línea recta. La canibalización asume que el cliente prefiere la sede más cercana; en la práctica muchos siguen con su médico, por eso el escenario conservador.')],
    [B('Movet: '), N('movet.co/clinicas (consultado en octubre de 2026); Portafolio (jul 2022 y 2026); La República (oct 2024); Diario Financiero de Chile (oct 2024).')],
    [B('Población y PIB: '), N('DANE, proyecciones de población y PIB departamental 2024 (Bogotá $49,7 M; Valle del Cauca $32,9 M por persona).')],
    [B('Mascotas: '), N('Ministerio de Salud, estimación de perros y gatos por municipio (2017): Bogotá 1.277.230; Cali 211.056. Es la cifra oficial más reciente comparable entre ciudades.')],
    [B('Competidores (Calle 13 #72 y Palmira): '), N('directorios web y OpenStreetMap. No todos están verificados como 24h hoy; se recomienda confirmarlos por teléfono.')],
    [B('Bello y Palmira: '), N('DANE, proyecciones 2025 y PIB municipal 2024; estratos de la Gobernación de Antioquia (2004) y del POT de Palmira (2021). Manizales y Pereira: DANE 2025.')],
  ], { x: M, y: 1.45, w: CW, h: 5.3, fontSize: 12.5, gap: 9 });
}

const OUT = process.env.OUT || path.join(ROOT, 'Expansion', 'PetsPets_Analisis_Expansion_Cali.pptx');
await pptx.writeFile({ fileName: OUT });
console.log('Presentación generada:', OUT);
console.log('Diapositivas:', pageNo + 1);
