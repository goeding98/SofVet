/**
 * Propuesta de arrendamiento (ajustada) para el local de la sede satélite.
 * Sale en "clinica satelite/PetsPets_Propuesta_Arrendamiento_Satelite.docx";
 * el PDF se exporta desde Word.
 *
 * Uso: node scripts/generar_propuesta_arriendo_satelite.cjs
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, Footer, Header, TabStopType,
  LevelFormat, VerticalAlign, TableLayoutType,
} = require('docx');

const RAIZ = path.join(__dirname, '..');
const OUT = path.join(RAIZ, 'clinica satelite', 'PetsPets_Propuesta_Arrendamiento_Satelite.docx');

const TEAL = '2A6B6B', TINTA = '22201E', GRIS = '6B6560', CREMA = 'F5E6D3', LINEA = 'DFE3EA', ROJO = '9B2226', SUAVE = 'F7F9FA';
const FONT = 'Calibri';
const EMPRESA = {
  razon: 'EMERGENCIAS VETERINARIAS DOGSPITAL S.A.S.',
  nit: 'NIT 901.489.476-1',
  dir: 'Calle 10 # 31-143 · Cali, Colombia',
  tel: 'Tel. (602) 316 7631663',
  mail: 'administrativo@dogspital.com',
};

const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const hoy = new Date();
const FECHA = `Cali, ${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

// Página carta, márgenes de 2 cm aprox.
const W = 12240, MARGEN = 1150, ANCHO = W - MARGEN * 2;

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 19, color: o.color || TINTA, bold: o.bold, italics: o.italics, characterSpacing: o.spacing });
const p = (runs, o = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [typeof runs === 'string' ? t(runs) : runs],
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { before: o.before ?? 0, after: o.after ?? 120, line: o.line || 276 },
  ...(o.border ? { border: o.border } : {}),
  ...(o.numbering ? { numbering: o.numbering } : {}),
  ...(o.indent ? { indent: o.indent } : {}),
  keepNext: o.keepNext,
});
const titulo = (num, text) => p([t(`${num}. `, { bold: true, color: TEAL, size: 22 }), t(text, { bold: true, color: TEAL, size: 22 })],
  { before: 170, after: 70, align: AlignmentType.LEFT, keepNext: true });

const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const lineaInf = { style: BorderStyle.SINGLE, size: 4, color: LINEA };
function celda(contenido, ancho, o = {}) {
  const parrafos = (Array.isArray(contenido) ? contenido : [contenido]).map(c =>
    c instanceof Paragraph ? c : p(typeof c === 'string' ? [t(c, { bold: o.bold, color: o.color, size: o.size })] : c,
      { align: o.align || AlignmentType.LEFT, after: 0 }));
  return new TableCell({
    children: parrafos,
    width: { size: ancho, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    margins: { top: 50, bottom: 50, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    borders: { top: sinBorde, left: sinBorde, right: sinBorde, bottom: o.noLine ? sinBorde : lineaInf },
    columnSpan: o.span,
  });
}
function tabla(filas, anchos) {
  return new Table({
    width: { size: anchos.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    rows: filas,
  });
}
const encab = (textos, anchos, aligns = []) => new TableRow({
  tableHeader: true,
  children: textos.map((x, i) => celda(x, anchos[i], { bold: true, color: 'FFFFFF', fill: TEAL, size: 18, align: aligns[i], noLine: true })),
});

(async () => {
  const logo = await sharp(path.join(RAIZ, 'frontend/public/logos/pp-02.svg')).resize({ width: 900 }).png().toBuffer();
  const meta = await sharp(logo).metadata();
  const anchoLogo = 150, altoLogo = Math.round(anchoLogo * meta.height / meta.width);

  // ── Membrete ───────────────────────────────────────────────────────────────
  const nuevoMembrete = () => tabla([new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new ImageRun({ type: 'png', data: logo, transformation: { width: anchoLogo, height: altoLogo } })] })],
        width: { size: 3200, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
        borders: { top: sinBorde, left: sinBorde, right: sinBorde, bottom: sinBorde },
      }),
      new TableCell({
        children: [EMPRESA.razon, `${EMPRESA.nit}  ·  ${EMPRESA.dir}`, `${EMPRESA.tel}  ·  ${EMPRESA.mail}`].map(s =>
          new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [t(s, { size: 15, color: GRIS })] })),
        width: { size: ANCHO - 3200, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
        borders: { top: sinBorde, left: sinBorde, right: sinBorde, bottom: sinBorde },
      }),
    ],
  })], [3200, ANCHO - 3200]);

  const nuevaRegla = () => p([t('')], { after: 120, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 1 } } });

  // ── Condiciones generales ──────────────────────────────────────────────────
  const A2 = [2900, ANCHO - 2900];
  const fila2 = (k, v) => new TableRow({ children: [celda(k, A2[0], { bold: true, size: 19 }), celda(v, A2[1], { size: 19 })] });
  const tGenerales = tabla([
    fila2('Arrendatario', `${EMPRESA.razon} (marca Pets & Pets), ${EMPRESA.nit}`),
    fila2('Destinación', 'Clínica veterinaria'),
    fila2('Duración', 'Tres (3) años, contados desde la entrega material del inmueble'),
  ], A2);

  // ── Canon ──────────────────────────────────────────────────────────────────
  const A3 = [2300, 3400, ANCHO - 5700];
  const fila3 = (a, b, c, o = {}) => new TableRow({ children: [
    celda(a, A3[0], { bold: true, size: 19, fill: o.fill }),
    celda(b, A3[1], { bold: true, size: 19, color: TEAL, align: AlignmentType.RIGHT, fill: o.fill }),
    celda(c, A3[2], { size: 18, color: GRIS, fill: o.fill }),
  ] });
  const tCanon = tabla([
    encab(['Período', 'Canon mensual', 'Base'], A3, [AlignmentType.LEFT, AlignmentType.RIGHT, AlignmentType.LEFT]),
    fila3('Año 1', '$9.000.000', 'Valor fijo'),
    fila3('Año 2', '$11.000.000', 'Valor fijo'),
    fila3('Año 3', '$11.000.000 + IPC', 'Canon del Año 2 incrementado en el IPC certificado por el DANE para el año inmediatamente anterior'),
  ], A3);

  // ── Meses de gracia: comparación ───────────────────────────────────────────
  const A4 = [3000, (ANCHO - 3000) / 2, (ANCHO - 3000) / 2];
  const tGracia = tabla([
    encab(['', 'Propuesta inicial', 'Propuesta ajustada'], A4, [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER]),
    new TableRow({ children: [
      celda('Meses de gracia (sin canon)', A4[0], { bold: true, size: 19 }),
      celda('Meses 4 y 8', A4[1], { size: 19, color: GRIS, align: AlignmentType.CENTER }),
      celda('Meses 6 y 12', A4[2], { size: 20, bold: true, color: TEAL, align: AlignmentType.CENTER, fill: 'E8F1F1' }),
    ] }),
  ], A4);

  const recuadroGracia = new Table({
    width: { size: ANCHO, type: WidthType.DXA }, columnWidths: [ANCHO], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [new TableCell({
      width: { size: ANCHO, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: CREMA },
      margins: { top: 100, bottom: 100, left: 220, right: 220 },
      borders: { top: sinBorde, right: sinBorde, bottom: sinBorde, left: { style: BorderStyle.SINGLE, size: 24, color: TEAL } },
      children: [
        p([t('Nos movimos de nuestra propuesta inicial', { bold: true, color: TEAL, size: 21 })], { after: 80, align: AlignmentType.LEFT }),
        p([t('En atención a sus comentarios, trasladamos los meses de gracia de los meses 4 y 8 a los '),
          t('meses 6 y 12', { bold: true }),
          t(' del contrato. Así, el propietario recibe cinco (5) meses de canon continuo antes del primer mes de gracia, dos más que en la propuesta inicial. Es una concesión que hacemos para construir una relación de largo plazo.')],
          { after: 0, line: 260 }),
      ],
    })] })],
  });

  // ── Flujo para el propietario ──────────────────────────────────────────────
  const A5 = [2300, 2500, 2400, ANCHO - 7200];
  const fila5 = (a, b, c, d, o = {}) => new TableRow({ children: [
    celda(a, A5[0], { bold: true, size: 19, fill: o.fill }),
    celda(b, A5[1], { size: 19, align: AlignmentType.CENTER, fill: o.fill }),
    celda(c, A5[2], { size: 19, align: AlignmentType.RIGHT, fill: o.fill }),
    celda(d, A5[3], { size: 19, bold: true, color: TEAL, align: AlignmentType.RIGHT, fill: o.fill }),
  ] });
  const tFlujo = tabla([
    encab(['Período', 'Meses con canon', 'Canon mensual', 'Total del año'], A5, [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.RIGHT, AlignmentType.RIGHT]),
    fila5('Año 1', '10 de 12', '$9.000.000', '$90.000.000'),
    fila5('Año 2', '12 de 12', '$11.000.000', '$132.000.000'),
    fila5('Año 3', '12 de 12', '$11.000.000 + IPC', '$132.000.000 + IPC'),
    fila5('Total 3 años', '34 meses', '', '$354.000.000 + IPC', { fill: SUAVE }),
  ], A5);

  // ── Página 1: quiénes somos ────────────────────────────────────────────────
  // Cifras de SofVet: promedio mensual jul–sep 2026 (consultas 463, hospitalizaciones
  // 131, laboratorios 400 + imágenes 120, ~1.540 atenciones), 6.238 clientes,
  // 7.098 pacientes, 39 usuarios activos (16 con rol Médico).
  const propsPagina = { page: { size: { width: W, height: 15840 }, margin: { top: 600, bottom: 1000, left: MARGEN, right: MARGEN, footer: 500 } } };
  const nuevoPie = () => new Footer({ children: [
    p([t('DOCUMENTO CONFIDENCIAL', { bold: true, color: ROJO, size: 14, spacing: 10 })], { after: 20, align: AlignmentType.LEFT, border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINEA, space: 6 } } }),
    p([t(`Este documento es confidencial y se entrega únicamente a su destinatario para evaluar la presente propuesta. Queda prohibida su reproducción o divulgación sin autorización escrita de ${EMPRESA.razon}`, { size: 14, color: GRIS })], { after: 0, line: 240 }),
  ] });

  // Tarjetas de cifras: número grande + etiqueta.
  const KW = Math.floor(ANCHO / 4);
  const blanco = { style: BorderStyle.SINGLE, size: 18, color: 'FFFFFF' };
  const kpi = (num, lab) => new TableCell({
    width: { size: KW, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: CREMA },
    margins: { top: 130, bottom: 130, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    borders: { top: blanco, bottom: blanco, left: blanco, right: blanco },
    children: [
      p([t(num, { bold: true, size: 36, color: TEAL })], { align: AlignmentType.CENTER, after: 20 }),
      p([t(lab, { size: 16 })], { align: AlignmentType.CENTER, after: 0, line: 240 }),
    ],
  });
  const filaKpi = arr => new TableRow({ children: arr.map(([n, l]) => kpi(n, l)) });
  const tKpi = tabla([
    filaKpi([['3', 'sedes en Cali con urgencias 24 horas'], ['+6.200', 'familias registradas como clientes'], ['+7.000', 'pacientes con historia clínica'], ['+1.500', 'atenciones al mes']]),
    filaKpi([['+460', 'consultas al mes'], ['+130', 'hospitalizaciones al mes'], ['+500', 'exámenes de laboratorio e imágenes al mes'], ['+35', 'colaboradores, más de 15 médicos veterinarios']]),
  ], [KW, KW, KW, KW]);

  const AS = [KW, KW, KW, ANCHO - 3 * KW];
  const sede = (n, z, d, a, trayectoria) => new TableCell({
    width: { size: a, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    borders: { top: { style: BorderStyle.SINGLE, size: 12, color: TEAL }, bottom: sinBorde, left: sinBorde, right: sinBorde },
    children: [
      p([t(n, { bold: true, size: 20, color: TEAL })], { align: AlignmentType.LEFT, after: 0 }),
      p([t(z, { size: 16, color: GRIS })], { align: AlignmentType.LEFT, after: 30 }),
      p([t(d, { size: 17 })], { align: AlignmentType.LEFT, after: trayectoria ? 50 : 0, line: 240 }),
      ...(trayectoria ? [p([t(trayectoria, { size: 17, bold: true, color: TEAL })], { align: AlignmentType.LEFT, after: 0, line: 240 })] : []),
    ],
  });
  const tSedes = tabla([new TableRow({ children: [
    sede('Santa Mónica', 'Norte de Cali', 'Urgencias 24 horas, hospitalización y consulta', AS[0], 'Abierta hace 3 meses, con contrato de arrendamiento a 3 años'),
    sede('Colseguros', 'Centro de Cali', 'Urgencias 24 horas, hospitalización y consulta', AS[1], '5 años en el mismo inmueble'),
    sede('Ciudad Jardín', 'Sur de Cali', 'Urgencias 24 horas, hospitalización y consulta', AS[2], '5 años en el mismo inmueble'),
    sede('Domicilio', 'Toda la ciudad', 'Consulta y vacunación en casa', AS[3]),
  ] })], AS);

  const vin = (negrita, texto) => p([t(negrita, { bold: true }), t(texto)], { align: AlignmentType.LEFT, after: 40, numbering: { reference: 'vinetas', level: 0 } });

  const paginaNosotros = [
    nuevoMembrete(),
    nuevaRegla(),
    p([t('Quiénes somos', { bold: true, size: 32, color: TEAL })], { align: AlignmentType.LEFT, before: 100, after: 20 }),
    p([t('Pets & Pets  ·  Red de clínicas veterinarias en Cali', { size: 19, color: GRIS })], { align: AlignmentType.LEFT, after: 160 }),
    p([t('Pets & Pets es una red caleña de clínicas veterinarias de alta complejidad. A través de '), t('Emergencias Veterinarias Dogspital S.A.S.', { bold: true }), t(' operamos tres sedes con urgencias las 24 horas, todos los días del año, y un servicio de atención a domicilio. Cuidamos a perros y gatos en todas las etapas de su vida: desde la primera vacuna hasta la cirugía y la hospitalización.')], { after: 160 }),
    tKpi,
    p([t('Cifras de nuestro sistema de gestión clínica; promedio mensual de julio a septiembre de 2026.', { size: 15, color: GRIS, italics: true })], { before: 60, after: 0 }),
    p([t('Nuestras sedes', { bold: true, color: TEAL, size: 22 })], { align: AlignmentType.LEFT, before: 220, after: 80 }),
    tSedes,
    p([t('Lo que hacemos', { bold: true, color: TEAL, size: 22 })], { align: AlignmentType.LEFT, before: 220, after: 80 }),
    vin('Urgencias y hospitalización 24/7: ', 'cuidados intensivos, cirugía y monitoreo permanente.'),
    vin('Diagnóstico: ', 'laboratorio clínico e imágenes diagnósticas.'),
    vin('Especialistas: ', 'cardiología, dermatología, neurología, oftalmología, oncología, ortopedia, endocrinología, gastroenterología, nefrología y odontología.'),
    vin('Medicina preventiva y spa: ', 'consulta general, vacunación, desparasitación, peluquería y baño.'),
    vin('Medicina prepagada propia: ', 'planes mensuales que fidelizan a nuestros clientes.'),
    vin('Tecnología: ', 'sistema de gestión clínica propio y portal web donde cada cliente consulta la historia de su mascota.'),
    p([t('')], { after: 0, line: 200 }),
    new Table({
      width: { size: ANCHO, type: WidthType.DXA }, columnWidths: [ANCHO], layout: TableLayoutType.FIXED,
      rows: [new TableRow({ children: [new TableCell({
        width: { size: ANCHO, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E8F1F1' },
        margins: { top: 120, bottom: 120, left: 220, right: 220 },
        borders: { top: sinBorde, right: sinBorde, bottom: sinBorde, left: { style: BorderStyle.SINGLE, size: 24, color: TEAL } },
        children: [
          p([t('Un arrendatario estable y de largo plazo', { bold: true, color: TEAL, size: 21 })], { align: AlignmentType.LEFT, after: 60 }),
          p('Operamos con nómina formal, facturación electrónica y procesos administrativos organizados. Cada sede que abrimos implica una inversión importante en adecuación y dotación; por eso buscamos relaciones de arrendamiento duraderas y cuidamos los inmuebles como propios.', { after: 0, line: 260 }),
        ],
      })] })],
    }),
  ];

  // ── Documento ──────────────────────────────────────────────────────────────
  const doc = new Document({
    creator: 'Pets & Pets', title: 'Propuesta de arrendamiento — sede satélite',
    styles: { default: { document: { run: { font: FONT, size: 19, color: TINTA } } } },
    numbering: { config: [{ reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
    sections: [{ properties: propsPagina, footers: { default: nuevoPie() }, children: paginaNosotros }, {
      properties: propsPagina,
      footers: { default: nuevoPie() },
      children: [
        nuevoMembrete(),
        nuevaRegla(),
        p([t(FECHA, { size: 18, color: GRIS })], { align: AlignmentType.LEFT, after: 160 }),
        p([t('Propuesta de arrendamiento', { bold: true, size: 32, color: TEAL })], { align: AlignmentType.LEFT, after: 20 }),
        p([t('Local comercial para sede satélite Pets & Pets  ·  Propuesta ajustada', { size: 19, color: GRIS })], { align: AlignmentType.LEFT, after: 160 }),

        p('Respetado propietario:', { align: AlignmentType.LEFT, after: 80 }),
        p('Agradecemos sus comentarios a nuestra propuesta. Con base en ellos, presentamos nuestra propuesta ajustada para el arrendamiento de su inmueble, donde proyectamos abrir una sede satélite de Pets & Pets.', { after: 40 }),

        titulo(1, 'Condiciones generales'),
        tGenerales,

        titulo(2, 'Canon de arrendamiento'),
        
        tCanon,
        p([t('Valores en pesos colombianos, más IVA en caso de que el arrendador sea responsable de este impuesto.', { size: 16, color: GRIS, italics: true })], { before: 80, after: 0 }),

        titulo(3, 'Meses de gracia'),
        
        tGracia,
        p([t('')], { after: 0, line: 160 }),
        recuadroGracia,

        titulo(4, 'Renovación y derecho de preferencia'),
        p([t('Vencido el plazo inicial de tres (3) años, '), t('el arrendatario tendrá prioridad para renovar', { bold: true }), t(' el contrato sobre cualquier otro interesado en el inmueble. Si el arrendatario decide renovar, el canon del Año 4 será igual al canon del Año 3 incrementado en un '), t('diez por ciento (10%)', { bold: true }), t('. Los años siguientes se acordarán de buena fe al renovar.')], { after: 40 }),

        p('La presente propuesta se formula de buena fe y está sujeta a la suscripción del contrato de arrendamiento, en el que se detallarán las demás condiciones usuales. Quedamos atentos a sus comentarios.', { before: 160, after: 40 }),

        p([t('Cordialmente,')], { before: 60, after: 320, align: AlignmentType.LEFT }),
        p([t('')], { after: 40, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TINTA, space: 1 } }, indent: { right: ANCHO - 3600 } }),
        p([t('Guillermo Oeding', { bold: true })], { align: AlignmentType.LEFT, after: 0 }),
        p([t('Representante Legal', { size: 18, color: GRIS })], { align: AlignmentType.LEFT, after: 0 }),
        p([t(EMPRESA.razon, { size: 18, color: GRIS })], { align: AlignmentType.LEFT, after: 0 }),
      ],
    }],
  });

  fs.writeFileSync(OUT, await Packer.toBuffer(doc));
  console.log('Propuesta generada:', OUT);
})();
