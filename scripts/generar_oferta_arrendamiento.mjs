/**
 * Oferta de arrendamiento para el local de la nueva sede.
 *
 * Documento de una sola página: los términos en una tabla y la cláusula de la
 * reforma aparte, que es la parte que hay que explicar bien.
 *
 * Uso: node scripts/generar_oferta_arrendamiento.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

const D = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(D, '..');
const OUT = path.join(RAIZ, 'Prepagada', 'PetsPets_Oferta_Arrendamiento.pdf');

// ── Identidad ───────────────────────────────────────────────────────────────
const TEAL = '#2a6b6b';
const TINTA = '#22201e';
const GRIS = '#6b6560';
const LINEA = '#dfe3ea';
const CREMA = '#f5e6d3';

const EMPRESA = {
  razon: 'EMERGENCIAS VETERINARIAS DOGSPITAL S.A.S.',
  nit: 'NIT 901.489.476-1',
  dir: 'Calle 10 # 31-143 · Cali, Colombia',
  tel: 'Tel. (602) 316 7631663',
  mail: 'administrativo@dogspital.com',
};

const hoyLargo = () => {
  const m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const d = new Date();
  return `Cali, ${d.getDate()} de ${m[d.getMonth()]} de ${d.getFullYear()}`;
};

// El logo es SVG y pdfkit solo admite PNG o JPG, así que se rasteriza al vuelo.
const logoPng = await sharp(path.join(RAIZ, 'frontend/public/logos/pp-02.svg'))
  .resize({ width: 900 })
  .png()
  .toBuffer();

const doc = new PDFDocument({ size: 'LETTER', margins: { top: 54, bottom: 54, left: 62, right: 62 } });
doc.pipe(fs.createWriteStream(OUT));

const ANCHO = doc.page.width - 62 * 2;
const X = 62;

// ── Membrete ────────────────────────────────────────────────────────────────
doc.image(logoPng, X, 46, { width: 132 });
doc.font('Helvetica').fontSize(7.5).fillColor(GRIS);
doc.text(EMPRESA.razon, X + 150, 48, { width: ANCHO - 150, align: 'right' });
doc.text(`${EMPRESA.nit}  ·  ${EMPRESA.dir}`, { width: ANCHO - 150, align: 'right' });
doc.text(`${EMPRESA.tel}  ·  ${EMPRESA.mail}`, { width: ANCHO - 150, align: 'right' });

doc.moveTo(X, 92).lineTo(X + ANCHO, 92).lineWidth(0.8).strokeColor(TEAL).stroke();

// ── Encabezado ──────────────────────────────────────────────────────────────
doc.font('Helvetica').fontSize(8.5).fillColor(GRIS).text(hoyLargo(), X, 108, { width: ANCHO });

// Sello de confidencialidad, alineado con el título
const SELLO = 'CONFIDENCIAL';
doc.font('Helvetica-Bold').fontSize(7.5);
const anchoSello = doc.widthOfString(SELLO) + 16;
doc.roundedRect(X + ANCHO - anchoSello, 132, anchoSello, 15, 7.5)
  .fillColor('#9b2226').fill();
doc.fillColor('#ffffff').text(SELLO, X + ANCHO - anchoSello, 136.5,
  { width: anchoSello, align: 'center', characterSpacing: 0.6 });

doc.font('Helvetica-Bold').fontSize(17).fillColor(TEAL)
  .text('Oferta de arrendamiento', X, 130, { width: ANCHO - anchoSello - 10 });
doc.font('Helvetica').fontSize(9).fillColor(GRIS)
  .text('Local comercial para nueva sede veterinaria', X, 152, { width: ANCHO });

doc.moveDown(1.6);
doc.font('Helvetica').fontSize(9.5).fillColor(TINTA).text(
  'Respetado propietario:', X, doc.y, { width: ANCHO });
doc.moveDown(0.5);
doc.text(
  'Con el propósito de establecer una nueva sede de atención veterinaria, presentamos '
  + 'formalmente nuestra propuesta de arrendamiento sobre el inmueble de su propiedad, '
  + 'en los términos que se detallan a continuación.',
  { width: ANCHO, align: 'justify', lineGap: 2.5 });

// ── Tabla de condiciones ────────────────────────────────────────────────────
doc.moveDown(1.2);
doc.font('Helvetica-Bold').fontSize(10).fillColor(TEAL)
  .text('Condiciones económicas', X, doc.y, { width: ANCHO });
doc.moveDown(0.5);

const filas = [
  ['Canon mensual', '$8.000.000 COP más IVA'],
  ['Duración del contrato', 'Tres (3) años'],
  ['Incremento anual', 'IPC certificado por el DANE del año inmediatamente anterior'],
  ['Período de gracia', 'Tres (3) meses desde la entrega del inmueble'],
];

const COL1 = 148;
let y = doc.y;
for (const [k, v] of filas) {
  const alto = Math.max(
    doc.font('Helvetica').fontSize(9).heightOfString(v, { width: ANCHO - COL1 - 14 }),
    11
  ) + 11;
  doc.rect(X, y, ANCHO, alto).fillColor('#fbfcfd').fill();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(TINTA)
    .text(k, X + 10, y + 5.5, { width: COL1 - 14 });
  doc.font('Helvetica').fontSize(9).fillColor(TINTA)
    .text(v, X + COL1, y + 5.5, { width: ANCHO - COL1 - 12 });
  y += alto;
  doc.moveTo(X, y).lineTo(X + ANCHO, y).lineWidth(0.5).strokeColor(LINEA).stroke();
}
doc.y = y + 16;

// ── Reforma ─────────────────────────────────────────────────────────────────
doc.font('Helvetica-Bold').fontSize(10).fillColor(TEAL)
  .text('Reforma del inmueble', X, doc.y, { width: ANCHO });
doc.moveDown(0.5);

doc.font('Helvetica').fontSize(9.5).fillColor(TINTA).text(
  'PETS & PETS asumirá la ejecución y el costo de la reforma necesaria para adecuar el '
  + 'local, con una inversión estimada entre $170.000.000 y $220.000.000 COP, sujeta a la '
  + 'cotización formal de los arquitectos.',
  { width: ANCHO, align: 'justify', lineGap: 2.5 });

doc.moveDown(0.7);

// Recuadro con lo que se descuenta: es el punto que hay que dejar clarísimo.
// Se arma como una lista de párrafos para poder medir la altura de la caja antes
// de pintarla.
const PARRAFOS = [
  'Una vez se cuente con la cotización formal, se discriminará qué parte de la obra '
  + 'corresponde a mejoras que valorizan el inmueble de manera permanente —entre otras, redes '
  + 'eléctricas, aires acondicionados, baños y redes hidrosanitarias— y cuál corresponde a '
  + 'adecuaciones propias de la operación veterinaria, como caniles y equipamiento clínico.',

  'De acuerdo con nuestra estimación preliminar, las mejoras que valorizan el inmueble '
  + 'ascenderían a un valor de entre $40.000.000 y $60.000.000 COP. Esta cifra es indicativa y '
  + 'queda enteramente condicionada a la cotización formal de los arquitectos.',

  'Antes de ejecutar la obra, PETS & PETS presentará al propietario el detalle de estas '
  + 'mejoras para revisarlas una por una y acordar de común acuerdo cuáles se reconocen como '
  + 'valorización del inmueble. Únicamente se descontarán las que hayan sido aceptadas por el '
  + 'propietario.',

  'El valor así acordado, por quedar en beneficio del propietario al término del contrato, será '
  + 'descontado del canon mensual de arrendamiento en veinticuatro (24) cuotas iguales. Las '
  + 'adecuaciones propias de la operación veterinaria serán asumidas en su totalidad por '
  + 'PETS & PETS, sin descuento alguno.',
];

doc.font('Helvetica').fontSize(8.5);
const ESPACIO = 6;
const alturas = PARRAFOS.map(s => doc.heightOfString(s, { width: ANCHO - 26, lineGap: 2 }));
const hCaja = alturas.reduce((a, b) => a + b, 0) + ESPACIO * (PARRAFOS.length - 1) + 22;

const yCaja = doc.y;
doc.rect(X, yCaja, ANCHO, hCaja).fillColor(CREMA).fill();
doc.rect(X, yCaja, 3, hCaja).fillColor(TEAL).fill();

let yP = yCaja + 11;
PARRAFOS.forEach((s, i) => {
  doc.font('Helvetica').fontSize(8.5).fillColor(TINTA)
    .text(s, X + 14, yP, { width: ANCHO - 26, align: 'justify', lineGap: 2 });
  yP += alturas[i] + ESPACIO;
});
doc.y = yCaja + hCaja + 14;

// ── Cierre ──────────────────────────────────────────────────────────────────
doc.font('Helvetica').fontSize(9.5).fillColor(TINTA).text(
  'La presente oferta se formula de buena fe y está sujeta a la suscripción del contrato de '
  + 'arrendamiento correspondiente. Quedamos atentos a sus comentarios.',
  X, doc.y, { width: ANCHO, align: 'justify', lineGap: 2.5 });

doc.moveDown(3.4);
doc.moveTo(X, doc.y).lineTo(X + 210, doc.y).lineWidth(0.6).strokeColor(TINTA).stroke();
doc.moveDown(0.4);
doc.font('Helvetica-Bold').fontSize(9.5).fillColor(TINTA)
  .text('Guillermo Oeding', X, doc.y, { width: 240 });
doc.font('Helvetica').fontSize(8.5).fillColor(GRIS)
  .text('Representante Legal', X, doc.y, { width: 240 });
doc.text(EMPRESA.razon, X, doc.y, { width: 300 });

// ── Pie de confidencialidad ─────────────────────────────────────────────────
// Va anclado al fondo de la página y no al flujo del texto, para que quede
// siempre en el mismo sitio aunque el cuerpo crezca.
const yPie = doc.page.height - 92;
doc.moveTo(X, yPie).lineTo(X + ANCHO, yPie).lineWidth(0.5).strokeColor(LINEA).stroke();
doc.font('Helvetica-Bold').fontSize(7).fillColor('#9b2226')
  .text('DOCUMENTO CONFIDENCIAL', X, yPie + 8, { width: ANCHO, characterSpacing: 0.5 });
doc.font('Helvetica').fontSize(7).fillColor(GRIS).text(
  'Este documento es confidencial y se entrega únicamente a su destinatario para evaluar la presente '
  + 'oferta. Queda prohibida su reproducción o divulgación sin autorización escrita de EMERGENCIAS '
  + 'VETERINARIAS DOGSPITAL S.A.S.',
  X, yPie + 19, { width: ANCHO, align: 'justify', lineGap: 1, lineBreak: true, height: 46 });

doc.end();
console.log('Oferta generada:', OUT);
