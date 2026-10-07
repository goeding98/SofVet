/**
 * Presentación para reclutar especialistas recién graduados a la nueva sede de
 * Ciudad Jardín. Cuatro diapositivas, dirigida a quien está empezando y no
 * tiene consultorio, equipos ni pacientes.
 *
 * Los números salen de SofVet (octubre 2026) y son reales: son el argumento.
 *
 * Uso: node scripts/generar_pptx_especialistas.mjs
 */

import path from 'path';
import { fileURLToPath } from 'url';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';

const D = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(D, '..');
const OUT = path.join(RAIZ, 'Otros', 'Prepagada', 'PetsPets_Especialistas_CiudadJardin.pptx');

// ── Identidad, medida de los activos de marca ───────────────────────────────
const C = {
  teal: '2A6B6B',
  tealOsc: '1D4C4C',
  crema: 'F5E6D3',
  salvia: 'A8C5C0',
  tinta: '22201E',
  gris: '6B6560',
  blanco: 'FFFFFF',
  oro: 'B8860B',
};
const SERIF = 'Georgia';
const SANS = 'Calibri';

const logo = await sharp(path.join(RAIZ, 'frontend/public/logos/pp-02.svg'))
  .resize({ width: 1200 }).png().toBuffer();
const logoB64 = 'data:image/png;base64,' + logo.toString('base64');

// El logotipo es negro; para los fondos oscuros se invierte.
const logoBlanco = await sharp(path.join(RAIZ, 'frontend/public/logos/pp-02.svg'))
  .resize({ width: 1200 }).negate({ alpha: false }).png().toBuffer();
const logoBlancoB64 = 'data:image/png;base64,' + logoBlanco.toString('base64');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';          // 13.333 x 7.5
pptx.author = 'Pets & Pets';
pptx.title = 'Sede de Especialidades · Ciudad Jardín';

const W = 13.333, H = 7.5, M = 0.9;
const CW = W - M * 2;

// ════════════════════════════════════════════════════════════════════════════
// 1 · Portada
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.teal };

  s.addImage({ data: logoBlancoB64, x: M, y: 0.75, w: 2.5, h: 0.42 });

  s.addText('Tu consultorio de especialista,\nsin montar una clínica.', {
    x: M, y: 1.9, w: CW * 0.68, h: 2.1,
    fontSize: 42, bold: true, color: C.blanco, fontFace: SERIF, lineSpacing: 48,
  });

  s.addText(
    'Abrimos la sede de Ciudad Jardín como centro de especialidades. '
    + 'Te damos el espacio, los equipos, el software y los pacientes. '
    + 'Tú pones tu conocimiento y una mañana a la semana.',
    { x: M, y: 4.1, w: CW * 0.62, h: 1.1, fontSize: 15, color: 'D9E8E8', fontFace: SANS, lineSpacing: 23 }
  );

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 5.5, w: 4.3, h: 0.62, fill: { color: C.crema }, rectRadius: 0.31,
  });
  s.addText('Convocatoria abierta · Cali, 2026', {
    x: M, y: 5.5, w: 4.3, h: 0.62, align: 'center', valign: 'middle',
    fontSize: 13, bold: true, color: C.tealOsc, fontFace: SANS,
  });

  // Bloque de cifra, a la derecha
  s.addShape(pptx.ShapeType.roundRect, {
    x: W - M - 3.9, y: 1.9, w: 3.9, h: 3.1, fill: { color: C.tealOsc }, rectRadius: 0.18,
  });
  s.addText('104', {
    x: W - M - 3.9, y: 2.25, w: 3.9, h: 1.3, align: 'center',
    fontSize: 72, bold: true, color: C.crema, fontFace: SERIF,
  });
  s.addText('pacientes que remitimos\na especialistas externos', {
    x: W - M - 3.9, y: 3.5, w: 3.9, h: 0.8, align: 'center',
    fontSize: 14, color: C.blanco, fontFace: SANS, lineSpacing: 20,
  });
  s.addText('Esa es la agenda que te estamos ofreciendo.', {
    x: W - M - 3.9, y: 4.3, w: 3.9, h: 0.5, align: 'center',
    fontSize: 12, italic: true, color: C.salvia, fontFace: SANS,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 2 · Quiénes somos
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.blanco };
  s.addImage({ data: logoB64, x: W - M - 1.9, y: 0.42, w: 1.9, h: 0.32 });

  s.addText('Quiénes somos', {
    x: M, y: 0.6, w: CW * 0.6, h: 0.6, fontSize: 32, bold: true, color: C.teal, fontFace: SERIF,
  });
  s.addText(
    'Tres clínicas veterinarias propias en Cali, con urgencias 24 horas. '
    + 'No somos un consultorio que arrienda espacio: somos una operación con pacientes, equipos y volumen.',
    { x: M, y: 1.25, w: CW * 0.78, h: 0.75, fontSize: 14.5, color: C.gris, fontFace: SANS, lineSpacing: 21 }
  );

  const cifras = [
    ['6.180', 'clientes activos'],
    ['7.023', 'mascotas en\nnuestra base'],
    ['5.212', 'consultas en\nel último año'],
    ['734', 'hospitalizaciones\nen 7 meses'],
  ];
  const cw = (CW - 0.45 * 3) / 4;
  cifras.forEach(([n, t], i) => {
    const x = M + i * (cw + 0.45);
    s.addShape(pptx.ShapeType.roundRect, { x, y: 2.25, w: cw, h: 1.65, fill: { color: C.crema }, rectRadius: 0.14 });
    s.addText(n, { x, y: 2.42, w: cw, h: 0.7, align: 'center', fontSize: 34, bold: true, color: C.tealOsc, fontFace: SERIF });
    s.addText(t, { x, y: 3.12, w: cw, h: 0.7, align: 'center', fontSize: 12, color: C.gris, fontFace: SANS, lineSpacing: 16 });
  });

  s.addText('Tres sedes · Urgencias 24/7', {
    x: M, y: 4.25, w: CW, h: 0.35, fontSize: 13, bold: true, color: C.teal, fontFace: SANS,
  });

  const sedes = [
    ['Santa Mónica', 'Avenida 8N #22-06'],
    ['Colseguros', 'Calle 10 #31-143'],
    ['Ciudad Jardín', 'Tu nueva sede de especialidades'],
  ];
  const sw = (CW - 0.45 * 2) / 3;
  sedes.forEach(([n, d], i) => {
    const x = M + i * (sw + 0.45);
    const esNueva = i === 2;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 4.7, w: sw, h: 1.05,
      fill: { color: esNueva ? C.salvia : C.blanco },
      line: { color: esNueva ? C.teal : 'E2D9CD', width: esNueva ? 1.5 : 1 },
      rectRadius: 0.12,
    });
    s.addText(n, { x: x + 0.2, y: 4.85, w: sw - 0.4, h: 0.3, fontSize: 14, bold: true, color: C.tealOsc, fontFace: SERIF });
    s.addText(d, { x: x + 0.2, y: 5.16, w: sw - 0.4, h: 0.4, fontSize: 11, color: esNueva ? C.tealOsc : C.gris, fontFace: SANS, italic: esNueva });
  });

  s.addText(
    'Cardiología, neurología, ortopedia, dermatología, oftalmología: hoy esos pacientes los remitimos afuera. '
    + 'Cada remisión es un cliente que sale de nuestra clínica y una consulta que alguien más factura.',
    { x: M, y: 6.1, w: CW, h: 0.7, fontSize: 13, color: C.tinta, fontFace: SANS, italic: true, lineSpacing: 19 }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3 · Lo que te damos
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.crema };
  s.addImage({ data: logoB64, x: W - M - 1.9, y: 0.42, w: 1.9, h: 0.32 });

  s.addText('Lo que te damos', {
    x: M, y: 0.6, w: CW * 0.6, h: 0.6, fontSize: 32, bold: true, color: C.teal, fontFace: SERIF,
  });
  s.addText('Sin contrato laboral, sin arriendo, sin inversión tuya.', {
    x: M, y: 1.25, w: CW, h: 0.4, fontSize: 15, color: C.gris, fontFace: SANS,
  });

  const items = [
    ['Tu consultorio', 'Un espacio moderno y propio para tus citas: mesa de acero inoxidable, computador, bata, y tu nombre en la puerta. Le dices a tu paciente «nos vemos en mi consultorio».'],
    ['Todos los equipos', 'Ecografía, radiografía, laboratorio clínico, hospitalización. Tu paciente necesita un examen y se lo haces ahí mismo, el mismo día, sin mandarlo a otro lado.'],
    ['Nuestros pacientes', 'Más de 6.000 clientes y 7.000 mascotas. Cuando una necesita tu especialidad, la agenda es la tuya. No empiezas de cero.'],
    ['Nuestro software', 'SofVet, el sistema con el que operamos: historias clínicas, agenda, laboratorios e imágenes. Tuyo para tus pacientes, sin costo.'],
  ];

  const iw = (CW - 0.5) / 2;
  items.forEach(([t, d], i) => {
    const x = M + (i % 2) * (iw + 0.5);
    const y = 1.95 + Math.floor(i / 2) * 2.1;
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: iw, h: 1.85, fill: { color: C.blanco }, rectRadius: 0.14 });
    s.addShape(pptx.ShapeType.rect, { x, y: y + 0.28, w: 0.055, h: 0.42, fill: { color: C.teal } });
    s.addText(t, { x: x + 0.32, y: y + 0.24, w: iw - 0.6, h: 0.42, fontSize: 18, bold: true, color: C.tealOsc, fontFace: SERIF });
    s.addText(d, { x: x + 0.32, y: y + 0.74, w: iw - 0.62, h: 1.0, fontSize: 12.5, color: C.gris, fontFace: SANS, lineSpacing: 18 });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 6.25, w: CW, h: 0.72, fill: { color: C.tealOsc }, rectRadius: 0.14 });
  s.addText(
    'Esto no es para quien ya tiene quince años de consultorio lleno. Es para quien está empezando y necesita dónde ejercer, con qué y a quién atender.',
    { x: M + 0.3, y: 6.25, w: CW - 0.6, h: 0.72, valign: 'middle', fontSize: 13.5, color: C.crema, fontFace: SANS, italic: true }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4 · Cómo funciona
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.blanco };
  s.addImage({ data: logoB64, x: W - M - 1.9, y: 0.42, w: 1.9, h: 0.32 });

  s.addText('Cómo funciona', {
    x: M, y: 0.6, w: CW * 0.6, h: 0.6, fontSize: 32, bold: true, color: C.teal, fontFace: SERIF,
  });
  s.addText('Eliges una franja fija a la semana y esa franja es tuya.', {
    x: M, y: 1.25, w: CW, h: 0.4, fontSize: 15, color: C.gris, fontFace: SANS,
  });

  // Ejemplo de agenda semanal
  const dias = ['Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const esp = ['Cardiología', 'Neurología', 'Ortopedia', 'Dermatología'];
  const dw = (CW - 0.4 * 3) / 4;
  dias.forEach((d, i) => {
    const x = M + i * (dw + 0.4);
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.95, w: dw, h: 1.5, fill: { color: C.salvia }, rectRadius: 0.12 });
    s.addText(d, { x, y: 2.1, w: dw, h: 0.32, align: 'center', fontSize: 13, bold: true, color: C.tealOsc, fontFace: SANS });
    s.addText('8:00 a 12:00', { x, y: 2.42, w: dw, h: 0.28, align: 'center', fontSize: 11, color: C.tealOsc, fontFace: SANS });
    s.addText(esp[i], { x, y: 2.78, w: dw, h: 0.42, align: 'center', fontSize: 14, bold: true, color: C.tealOsc, fontFace: SERIF });
  });
  s.addText('Ejemplo. La franja la acordamos contigo según tu disponibilidad.', {
    x: M, y: 3.52, w: CW, h: 0.3, fontSize: 11, color: C.gris, fontFace: SANS, italic: true,
  });

  const pasos = [
    ['1', 'Acordamos tu franja', 'Un día fijo a la semana, en la jornada que te sirva.'],
    ['2', 'Te montamos el consultorio', 'Espacio, equipos, software y tu acceso a SofVet.'],
    ['3', 'Te llenamos la agenda', 'Nuestros pacientes que necesitan tu especialidad entran directo a tu agenda.'],
  ];
  const pw = (CW - 0.5 * 2) / 3;
  pasos.forEach(([n, t, d], i) => {
    const x = M + i * (pw + 0.5);
    s.addShape(pptx.ShapeType.ellipse, { x, y: 4.1, w: 0.44, h: 0.44, fill: { color: C.teal } });
    s.addText(n, { x, y: 4.1, w: 0.44, h: 0.44, align: 'center', valign: 'middle', fontSize: 15, bold: true, color: C.blanco, fontFace: SANS });
    s.addText(t, { x: x + 0.6, y: 4.12, w: pw - 0.6, h: 0.36, fontSize: 15, bold: true, color: C.tealOsc, fontFace: SERIF });
    s.addText(d, { x, y: 4.68, w: pw, h: 0.9, fontSize: 12.5, color: C.gris, fontFace: SANS, lineSpacing: 18 });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 5.85, w: CW, h: 1.05, fill: { color: C.teal }, rectRadius: 0.14 });
  s.addText('¿Te interesa una franja?', {
    x: M + 0.4, y: 5.98, w: CW * 0.5, h: 0.4, fontSize: 19, bold: true, color: C.blanco, fontFace: SERIF,
  });
  s.addText('Escríbenos y coordinamos una visita a la sede de Ciudad Jardín.', {
    x: M + 0.4, y: 6.38, w: CW * 0.5, h: 0.35, fontSize: 13, color: 'D9E8E8', fontFace: SANS,
  });
  s.addText('administrativo@dogspital.com\n+57 315 294 6916  ·  petspets.co', {
    x: W - M - 4.2, y: 5.98, w: 3.8, h: 0.8, align: 'right',
    fontSize: 13, bold: true, color: C.crema, fontFace: SANS, lineSpacing: 20,
  });
}

await pptx.writeFile({ fileName: OUT });
console.log('Presentación generada:', OUT);
