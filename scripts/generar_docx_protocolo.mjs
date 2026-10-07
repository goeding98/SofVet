// Genera el Protocolo Operativo de la Prepagada (médicos, coordinación y gerencia).
// Uso: node scripts/generar_docx_protocolo.mjs
// Sale en Otros/Prepagada/PetsPets_Protocolo_Operativo_v2.0.docx
// El paso a paso de caja vive en la guía impresa (generar_pptx_guia_personal.mjs);
// este documento no lo repite.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, Footer, PageNumber, ImageRun,
} from 'docx';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(AQUI, '..', 'Otros', 'Prepagada', 'PetsPets_Protocolo_Operativo_v2.0.docx');
const LOGO = fs.readFileSync(path.join(AQUI, 'assets', 'logos', 'wordmark_teal.png'));

const C = { teal: '1E4E54', blue: '316D74', cream: 'F5E6D3', line: 'D8D0C4', red: 'C0392B', amber: '8A6D00', amberBg: 'FFF7E6', redBg: 'FDECEA', greenBg: 'EAF7EF', green: '1E7D45' };
const ANCHO = 9360; // carta con márgenes de 1": 12240 − 2×1440

const p = (text, o = {}) => new Paragraph({ spacing: { after: 100 }, ...o, children: runs(text, o.run) });
function runs(text, base = {}) {
  // **negrita** dentro del texto
  return String(text).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(t =>
    t.startsWith('**') ? new TextRun({ text: t.slice(2, -2), bold: true, ...base }) : new TextRun({ text: t, ...base }));
}
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, keepLines: true, spacing: { before: 320, after: 120 }, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, keepLines: true, spacing: { before: 200, after: 80 }, children: [new TextRun(t)] });
const bullets = (items, ref = 'vineta') => items.map(t => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: runs(t) }));
const pasos = (items) => bullets(items, 'numeros');

function caja(titulo, texto, color = C.amber, fondo = C.amberBg) {
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA }, columnWidths: [ANCHO],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: ANCHO, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: fondo },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      borders: { top: { style: BorderStyle.SINGLE, size: 6, color }, bottom: { style: BorderStyle.SINGLE, size: 6, color }, left: { style: BorderStyle.SINGLE, size: 6, color }, right: { style: BorderStyle.SINGLE, size: 6, color } },
      children: [
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: titulo.toUpperCase(), bold: true, color, size: 19 })] }),
        ...[].concat(texto).map(t => new Paragraph({ spacing: { after: 40 }, children: runs(t) })),
      ],
    })] })],
  });
}

function tabla(encabezados, filas, anchos) {
  const total = anchos.reduce((a, b) => a + b, 0);
  const fila = (cells, head) => new TableRow({
    tableHeader: head,
    children: cells.map((t, i) => new TableCell({
      width: { size: anchos[i], type: WidthType.DXA },
      shading: head ? { type: ShadingType.CLEAR, color: 'auto', fill: C.cream } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [].concat(t).map(x => new Paragraph({ spacing: { after: 20 }, children: runs(x, head ? { bold: true } : {}) })),
    })),
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: anchos,
    rows: [fila(encabezados, true), ...filas.map(f => fila(f, false))],
  });
}
const esp = () => new Paragraph({ spacing: { after: 80 }, children: [] });

const contenido = [
  new Paragraph({ children: [new ImageRun({ type: 'png', data: LOGO, transformation: { width: 190, height: 30 } })], spacing: { after: 200 } }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'PREPAGADA VETERINARIA', bold: true, color: 'A6785B', size: 22 })] }),
  new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 80 }, children: [new TextRun('Protocolo Operativo')] }),
  p('Para médicos veterinarios, coordinación de prepagada y gerencia', { run: { size: 26, color: C.teal } }),
  p('Versión 2.0 · Octubre 2026 · Uso interno · Reemplaza la versión 1.0 de septiembre de 2026', { run: { color: '6B6560', size: 19 } }),
  esp(),
  caja('Cómo se usa este documento', [
    'El paso a paso de caja y recepción (afiliar, cobrar, revisar, registrar consumos) está en la **Guía paso a paso para el equipo** (impresa en cada caja). Este protocolo no lo repite.',
    'Aquí está lo que le toca al **médico veterinario** (calificar urgencias, examen inicial, documentación), a la **coordinación** (reportes y alertas) y a **gerencia** (excepciones).',
    'Las reglas del plan son las de los **Términos y Condiciones publicados** en petspets.co/terminos-medicina-prepagada. Si algo de aquí no cuadra con ellos, mandan los términos.',
  ], C.blue, 'EEF4FF'),

  h1('1. Los dos planes en una página'),
  tabla(['', 'Plan Urgencias', 'Plan Total'], [
    ['Cuota mensual (1ª mascota)', '$30.000 + IVA', '$70.000 + IVA'],
    ['Cubre', 'Solo urgencias y emergencias 24/7', 'Urgencias + preventivo + descuentos en programados'],
    ['En una urgencia', 'Tutor 20% · P&P 80%', 'Tutor 20% · P&P 80%'],
    ['Bolsa anual por mascota', '$4.000.000', '$4.000.000'],
    ['Carencia', 'Urgencias: día 1', 'Urgencias: día 1 · todo lo demás: día 31'],
    ['Preventivo', 'No', '12 consultas, vacunación, 4 desparasitaciones, 1 laboratorio, 1 imagen, teleorientación'],
  ], [2600, 3200, 3560]),
  esp(),
  ...bullets([
    '**Descuento multimascota:** 2ª mascota 5%, de la 3ª en adelante 10%. **Tarjeta en cobro automático:** 10% adicional cada mes.',
    '**La bolsa la consume todo:** las urgencias (80% de P&P) y la porción que P&P descuenta en servicios programados del Plan Total.',
    '**Estado del afiliado:** "Pendiente de pago" (sin cobertura hasta el primer pago) · "Activo" · "En gracia" (días 0 a 5 tras vencer, con cobertura) · "Suspendido" (6 a 29, sin cobertura) · "Cancelado" (30+).',
  ]),

  h1('2. Quién hace qué'),
  tabla(['Rol', 'Responsabilidad'], [
    ['Caja / recepción', 'Busca al afiliado por cédula en SofVet, revisa estado, carencia y bolsa, cobra lo que le toca al tutor y registra el consumo en "+ Registrar consumo" (la factura y el descuento de bolsa salen solos). Ver la guía impresa.'],
    ['Médico veterinario', 'Es el ÚNICO que califica si un caso es urgencia cubierta. Da el presupuesto a caja, documenta la calificación en la historia clínica y hace el examen inicial de los afiliados nuevos.'],
    ['Coordinación de prepagada', 'Revisa a diario los afiliados suspendidos y los cobros rechazados, prepara el reporte mensual y escala las alertas de la sección 8.'],
    ['Gerencia', 'Autoriza excepciones comerciales, cambios manuales de estado y casos donde el tutor no puede pagar. Decide ajustes de tarifa en la renovación.'],
  ], [2400, 6960]),

  h1('3. Flujo de una urgencia de un afiliado'),
  ...pasos([
    '**Caja verifica en SofVet** (módulo Prepagada): que el estado sea "Activo" o "En gracia" y cuánta bolsa le queda. Si está "Pendiente de pago", el tutor paga primero el mes (lo puede hacer ahí mismo).',
    '**El veterinario evalúa al paciente y califica** si es urgencia cubierta con los criterios de la sección 4. Primero se estabiliza; la parte administrativa va en paralelo.',
    '**El veterinario le da a caja el presupuesto** por conceptos (consulta, hospitalización, exámenes, cirugía…), y le dice si es urgencia o no.',
    '**Caja cobra la parte del tutor** (20% + IVA de esa porción) y registra el consumo. La factura electrónica le llega al tutor y la bolsa se descuenta sola.',
    '**Si el caso crece** (más días de hospitalización, otra cirugía), caja registra un consumo adicional con lo nuevo, antes de hacerlo. Nunca al final todo junto.',
  ]),
  caja('Regla que no se negocia', 'Nunca se niega ni se suspende la atención estabilizadora de un animal por razones administrativas o económicas. Si el tutor no puede pagar su parte o no le alcanza la bolsa, se estabiliza y se escala a gerencia.', C.red, C.redBg),

  h1('4. Criterios clínicos: ¿qué es una urgencia cubierta?'),
  p('Con base en los estándares de triage de la AAHA y el ACVECC, es **urgencia veterinaria verdadera** toda condición que cumpla a la vez:'),
  ...bullets([
    'Aparición **aguda** (súbita, no gradual).',
    'Riesgo inminente para la vida, compromiso grave de un órgano o sistema vital, o dolor severo que requiere intervención inmediata.',
    'Necesita atención en las **primeras 6 horas** desde su aparición para evitar deterioro irreversible, muerte o sufrimiento severo.',
  ]),
  h2('4.1 Eventos que califican (lista enunciativa, no taxativa)'),
  ...bullets([
    'Trauma por atropellamiento, caída de altura, agresión por otro animal o accidente que comprometa la integridad física.',
    'Dificultad respiratoria aguda (disnea severa, cianosis, obstrucción de vías aéreas).',
    'Convulsiones activas o estado epiléptico.',
    'Intoxicación o envenenamiento comprobado o altamente sospechado.',
    'Dilatación-torsión gástrica (GDV) sospechada o confirmada.',
    'Obstrucción urinaria (especialmente felinos machos) con signos sistémicos.',
    'Hemorragia activa incontrolable (externa, o interna con signos de shock).',
    'Parto distócico con riesgo para la madre o las crías.',
    'Golpe de calor (hipertermia > 41 °C con compromiso multiorgánico).',
    'Shock anafiláctico o reacción alérgica severa con compromiso respiratorio o cardiovascular.',
    'Cuerpo extraño con obstrucción intestinal comprobada que requiere cirugía de emergencia.',
    'Prolapso de órganos (ocular, rectal, uterino).',
    'Fracturas expuestas o luxaciones con compromiso vascular o neurológico.',
  ]),
  h2('4.2 No califican como urgencia'),
  ...bullets([
    '**Crónicas y degenerativas:** neoplasias, enfermedad renal crónica, hepatopatías y cardiopatías progresivas, displasia, endocrinopatías (diabetes, hipotiroidismo, hiperadrenocorticismo), autoinmunes, y todo lo que a criterio del veterinario no tuvo inicio agudo. En el Plan Total acceden a los descuentos de programados.',
    '**Electivos:** esterilización, cirugías estéticas, limpieza dental, todo lo que se puede programar.',
    '**Menores sin riesgo vital:** vómito o diarrea aislados sin deshidratación severa, dermatitis, otitis, conjuntivitis, cojera leve sin fractura, infección urinaria sin obstrucción.',
  ]),
  h2('4.3 Qué cubre la urgencia y cómo van las cirugías'),
  p('Dentro de un mismo evento: consulta de urgencia y triage, estabilización, hospitalización derivada, exámenes necesarios (laboratorio, Rx, ecografía) y medicamentos durante la hospitalización. **No** entran los medicamentos, alimentos o suplementos para la casa después del alta.'),
  tabla(['Cirugía derivada de la urgencia', 'Paga el tutor'], [
    ['Tejidos blandos, dentro de las primeras 12 horas del suceso', '20%'],
    ['Tejidos blandos, entre 12 y 24 horas después del suceso', '50%'],
    ['Cirugía de especialista (ortopedia y similares)', 'No se cubre como urgencia. En Plan Total: 40% de descuento como programado.'],
  ], [6000, 3360]),
  h2('4.4 Calificación y documentación'),
  ...bullets([
    'La calificación la hace **solo el médico veterinario de turno**, al momento de la atención. Es una decisión clínica e inapelable. Caja nunca califica.',
    'Dejar en la historia clínica de SofVet: **diagnóstico principal, hora aproximada de inicio del cuadro y si se calificó como urgencia cubierta o no, con el motivo.** Es lo que respalda la decisión si el tutor reclama.',
    'Si **no** califica: se cobra a tarifa vigente sin cobertura de urgencia. Si es Plan Total, aplican su consulta incluida y los descuentos de programados.',
    'En casos dudosos decide el veterinario; si hay conflicto con el tutor, se escala a la coordinación o a gerencia, no se resuelve en el mostrador.',
  ]),

  h1('5. Examen inicial y preexistencias'),
  ...bullets([
    'Todo afiliado nuevo tiene un **examen clínico completo GRATIS dentro de los 30 días siguientes a la afiliación**. Caja lo agenda el mismo día que afilia.',
    'El veterinario debe dejar escrito en la historia clínica **todo** lo que encuentre: enfermedades, signos clínicos, condiciones ortopédicas (indicando el lado), soplos, masas, alergias, conductas agresivas o de ingestión de cuerpos extraños. **Todo lo que quede registrado ahí queda excluido** de la cobertura, junto con lo que se derive de ello.',
    'Si al momento de una urgencia la causa es una condición preexistente documentada (antes de la afiliación o en el examen inicial), se cobra a tarifa regular.',
    '**Bilaterales:** si una condición ortopédica apareció en un lado antes de afiliarse, la del lado contrario también se considera preexistente (aplica a IVDD).',
    '**Curables:** una preexistencia curable sale de la exclusión si no reaparece en los 12 meses siguientes a la afiliación (no aplica a crónicas, degenerativas, ortopédicas ni IVDD).',
  ]),

  h1('6. Plan Total: preventivo y programados'),
  ...bullets([
    '**Preventivo incluido** (desde el día 31, sin costo y sin tocar la bolsa): 12 consultas/año, esquema de vacunación anual, 4 desparasitaciones, 1 panel de laboratorio (hemograma + química), 1 imagen diagnóstica (Rx o eco), teleorientación agendada. Caja lo marca con "+" en la ficha.',
    '**Programados con descuento** (desde el día 31, consumen bolsa):',
  ]),
  tabla(['Servicio programado', 'Descuento'], [
    ['Cirugía programada de tejidos blandos · Rx adicional · Ecografía adicional', '60%'],
    ['Esterilización/castración con remisión médica · TAC · Especialista · Hospitalización programada · Otros tratamientos (oncología, crónicos, prolongados)', '50%'],
    ['Cirugía de especialista (ortopedia) · Limpieza dental · Laboratorios adicionales', '40%'],
    ['Medicamentos de la farmacia de P&P', '10%'],
  ], [7400, 1960]),
  esp(),
  p('La esterilización solo tiene descuento con **remisión médica**: si el veterinario la indica por razón clínica, debe quedar escrito en la historia. Si el tutor la pide por su cuenta, no aplica.'),

  h1('7. Casos especiales'),
  tabla(['Situación', 'Qué se hace'], [
    ['Bolsa agotada', 'Lo que pase del tope se cobra a tarifa regular por el resto del año de vigencia; la bolsa se restablece en la renovación. Si el tutor no puede pagar: estabilizar y escalar a gerencia.'],
    ['Afiliado en "Pendiente de pago"', 'No tiene cobertura todavía. Que pague el primer mes ahí mismo (tarjeta, link o caja) y desde ese momento la urgencia queda cubierta.'],
    ['El veterinario dice que no es urgencia', 'Tarifa vigente sin cobertura de urgencia, documentando el motivo. En Plan Total aplican sus beneficios y descuentos.'],
    ['Llega con otra mascota', 'El plan cubre solo a la mascota registrada. Tarifa regular, y ofrecerle afiliar la otra con descuento multimascota.'],
    ['Necesita algo que no hacemos', 'Se orienta al tutor sobre dónde hacerlo. El plan no cubre la atención externa ni traslados.'],
    ['Tarjeta rechazada en el cobro mensual', 'Coordinación contacta al tutor ese mismo día: que registre otra tarjeta con el enlace o pague con link. El sistema reintenta solo cada mañana.'],
  ], [2600, 6760]),

  h1('8. Control de siniestralidad y reportes'),
  p('Todo queda en SofVet: cada consumo (urgencia o programado) con su costo total, lo que pagó el tutor, lo que cubrió P&P y la factura. **Ya no se lleva ningún Excel de control**; el archivo Control_Afiliados_Prepagada.xlsx de la versión 1.0 queda descontinuado.'),
  h2('8.1 Revisión diaria (coordinación)'),
  ...bullets([
    'Afiliados en "Suspendido" y cobros automáticos rechazados: contactar al tutor.',
    'Afiliados nuevos sin examen inicial agendado.',
    'Consumos registrados el día anterior sin factura (alerta "Sin concepto de Siigo").',
  ]),
  h2('8.2 Reporte mensual (coordinación → gerencia, día 5 de cada mes)'),
  ...bullets([
    'Afiliados por plan y por estado; nuevos y cancelados en el mes (churn).',
    'Cuotas recaudadas en el mes (antes de IVA).',
    'Número de consumos: urgencias y programados.',
    'Costo cubierto por P&P (lo que salió de las bolsas) y copagos pagados por los tutores.',
    '**Loss ratio del mes = costo cubierto por P&P ÷ cuotas recaudadas.** Por debajo de 70% es saludable; por encima de 80% es alerta (referente: PetsPets_Modelo_Siniestralidad.xlsx).',
    'Afiliados con menos de $500.000 de bolsa disponible.',
  ]),
  h2('8.3 Alertas y escalamiento'),
  tabla(['Situación', 'Indicador', 'Acción'], [
    ['Loss ratio alto', '> 80% en el mes', 'Revisar con gerencia los criterios de calificación y la tarifa para la renovación.'],
    ['Bolsas agotadas', '> 3 afiliados en el mes', 'Revisar si la bolsa es suficiente o si hay selección adversa.'],
    ['Afiliado recurrente', '> 3 urgencias en el año', 'Revisar historial: posible preexistencia no declarada.'],
    ['Cancelaciones altas', '> 5% de churn mensual', 'Llamada de salida y revisión de la percepción de valor.'],
    ['Posible fraude', 'Urgencias justo antes de vencer el año o recién afiliado', 'Documentar y escalar a gerencia caso por caso.'],
  ], [2300, 2500, 4560]),

  h1('9. Lo que hace el sistema solo'),
  ...bullets([
    'Todos los días a las 8:00 a.m. cobra la tarjeta de los afiliados con cobro automático que ya vencieron; si se rechaza, reintenta al día siguiente.',
    'Cuando entra un pago por Wompi (tarjeta o link) activa el plan, corre el vencimiento al fin de mes y emite la factura en Siigo, que le llega al tutor por correo.',
    'Mueve el estado del afiliado según la fecha de vencimiento (gracia, suspendido, cancelado). El cambio manual de estado es solo con autorización de gerencia.',
    'Descuenta la bolsa cuando caja registra un consumo, y la reinicia cada año.',
  ]),
  esp(),
  caja('Dudas', 'Clínicas: decide el veterinario de turno. Comerciales o excepciones: coordinación de prepagada; en la noche, jefe de turno; si hace falta, gerencia.', C.green, C.greenBg),
];

const doc = new Document({
  creator: 'Pets & Pets', title: 'Protocolo Operativo — Prepagada Veterinaria v2.0',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 21, color: '22201E' } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: 'Cambria', size: 52, bold: true, color: C.teal } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { font: 'Cambria', size: 30, bold: true, color: C.teal }, paragraph: { outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9D6D4', space: 2 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: { size: 23, bold: true, color: C.blue }, paragraph: { outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'vineta', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] },
    { reference: 'numeros', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
      new TextRun({ text: 'Protocolo Operativo Prepagada · v2.0 octubre 2026 · Pág. ', size: 16, color: '6B6560' }),
      new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '6B6560' }),
    ] })] }) },
    children: contenido,
  }],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log('Protocolo generado:', OUT);
