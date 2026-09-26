import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, BorderStyle } from 'docx';
import fs from 'fs';

const TEAL = '316d74', TEAL_DARK = '1e4e54', GOLD = 'B8873A', MUTED = '5c6470', RED = 'C0392B';

const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 340, after: 150 },
  children: [new TextRun({ text: t, bold: true, color: TEAL_DARK, size: 26 })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 90 },
  children: [new TextRun({ text: t, bold: true, color: TEAL, size: 22 })] });
const p = (t, o = {}) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: t, size: 20, ...o })] });
const bullet = (t, o = {}) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 },
  children: [new TextRun({ text: t, size: 20, ...o })] });
const cell = (t, o = {}) => new TableCell({
  width: { size: o.width || 25, type: WidthType.PERCENTAGE },
  shading: o.header ? { type: ShadingType.SOLID, color: TEAL, fill: TEAL } : undefined,
  margins: { top: 90, bottom: 90, left: 110, right: 110 },
  children: [new Paragraph({ children: [new TextRun({
    text: t, bold: !!o.header || !!o.bold,
    color: o.header ? 'FFFFFF' : (o.color || '000000'), size: 18 })] })],
});
const caja = (titulo, texto, color = GOLD, fill = 'FFF8E8') => ([
  new Paragraph({
    shading: { type: ShadingType.SOLID, color: fill, fill },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color }, bottom: { style: BorderStyle.SINGLE, size: 6, color },
              left: { style: BorderStyle.SINGLE, size: 6, color }, right: { style: BorderStyle.SINGLE, size: 6, color } },
    spacing: { before: 140, after: 60 },
    children: [new TextRun({ text: titulo, bold: true, size: 19, color })],
  }),
  new Paragraph({
    shading: { type: ShadingType.SOLID, color: fill, fill },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color },
              left: { style: BorderStyle.SINGLE, size: 6, color }, right: { style: BorderStyle.SINGLE, size: 6, color } },
    spacing: { after: 200 },
    children: [new TextRun({ text: texto, size: 19 })],
  }),
]);

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri' } } } },
  sections: [{ children: [

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [new TextRun({ text: 'PETS & PETS', bold: true, size: 40, color: TEAL_DARK })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [new TextRun({ text: 'TÉRMINOS Y CONDICIONES — PLAN PREPAGADO VETERINARIO', bold: true, size: 26, color: TEAL })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 280 },
      children: [new TextRun({ text: 'Versión borrador 2.0 — Septiembre 2026', italics: true, size: 18, color: MUTED })] }),

    ...caja('⚠ AVISO — BORRADOR SIN REVISIÓN LEGAL',
      'Este documento recoge las reglas comerciales y clínicas ya definidas del plan. NO ha sido revisado por un abogado y NO debe usarse para afiliar clientes ni publicarse hasta que un abogado colombiano lo valide — en particular: naturaleza jurídica del servicio (no es un seguro regulado por la Superintendencia Financiera), cláusulas de protección al consumidor (Ley 1480 de 2011), derecho de retracto, y tratamiento de datos personales (Ley 1581 de 2012).',
      RED, 'FDECEA'),

    p('Los presentes Términos y Condiciones (el "Contrato") regulan la relación entre PETS & PETS (marca comercial de Emergencias Veterinarias Dogspital S.A.S., "PETS & PETS" o "la Clínica") y el tutor que se afilia a uno de los planes de Medicina Prepagada Veterinaria aquí descritos (el "Afiliado" o el "Titular"), respecto de la mascota específica registrada en la afiliación (la "Mascota Registrada").'),

    h1('1. Objeto y naturaleza del servicio'),
    p('PETS & PETS ofrece acceso a servicios veterinarios de urgencia y, en el Plan Total, a un paquete de servicios preventivos incluidos y descuentos en procedimientos programados, a cambio de una cuota periódica, bajo las condiciones, coberturas, exclusiones y límites descritos en este documento.'),
    p('Este plan es un servicio de medicina prepagada veterinaria prestado directamente por PETS & PETS en sus propias sedes en Cali, Colombia. NO constituye un contrato de seguro, no está respaldado por una aseguradora y no está sujeto a la vigilancia de la Superintendencia Financiera de Colombia. No incluye reembolsos por atención en clínicas de terceros, salvo autorización previa y expresa de la gerencia.'),

    h1('2. Vigencia, renovación y terminación'),
    p('El Contrato tiene una VIGENCIA ANUAL contada desde la fecha de afiliación, independientemente de que el pago se realice de forma mensual, trimestral o semestral.'),
    ...[
      'Durante el año de vigencia, PETS & PETS no podrá dar por terminado el Contrato ni reducir las coberturas pactadas, salvo por mora en el pago, declaración inexacta o fraude del Titular.',
      'Al finalizar cada año de vigencia, el Contrato se renueva automáticamente, salvo que alguna de las partes manifieste lo contrario.',
      'PETS & PETS podrá, únicamente en la fecha de renovación, ajustar la cuota, los límites de cobertura y las condiciones del plan, o no renovar la afiliación. En cualquiera de estos casos informará al Titular con al menos treinta (30) días calendario de anticipación al vencimiento.',
      'Si la cobertura se mantiene de forma continua, las carencias NO se vuelven a aplicar en la renovación, y las condiciones que aparecieron durante la vigencia no se consideran preexistentes en los años siguientes.',
      'El Titular puede cancelar en cualquier momento. La cancelación surte efecto al terminar el período ya pagado.',
    ].map(t => bullet(t)),
    ...caja('Derecho de retracto — primeros 30 días',
      'Si el Titular cancela dentro de los treinta (30) días siguientes a la afiliación y no ha utilizado ningún beneficio ni servicio del plan, PETS & PETS devolverá la totalidad de lo pagado. Pasados los 30 días, la devolución es proporcional al tiempo no utilizado del período pagado.'),

    h1('3. Examen inicial obligatorio'),
    p('Para que la cobertura sea válida, la Mascota Registrada debe contar con un examen clínico completo realizado por un veterinario de PETS & PETS dentro de los doce (12) meses anteriores a la afiliación, o dentro de los treinta (30) días siguientes a ella. El costo de este examen corre por cuenta del Titular.'),
    ...[
      'Toda condición médica, signo clínico o enfermedad observada o registrada en el examen inicial queda automáticamente EXCLUIDA de la cobertura, así como toda condición que se derive de ella.',
      'Si la Mascota Registrada no cuenta con el examen inicial dentro del plazo señalado, PETS & PETS podrá reducir o negar la cobertura.',
    ].map(t => bullet(t)),
    p('El propósito de este requisito es proteger la viabilidad del plan para todos los afiliados, evitando que se afilien mascotas con enfermedades ya presentes al momento de la afiliación.'),

    h1('4. Planes disponibles'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [cell('Concepto', { header: true, width: 26 }), cell('Plan Urgencias', { header: true, width: 37 }), cell('Plan Total', { header: true, width: 37 })] }),
      new TableRow({ children: [cell('Cuota mensual (1ª mascota)', { bold: true }), cell('$25.000 COP'), cell('$70.000 COP')] }),
      new TableRow({ children: [cell('Cobertura', { bold: true }), cell('Urgencias y emergencias 24/7'), cell('Urgencias 24/7 + preventivo + descuentos')] }),
      new TableRow({ children: [cell('Copago del Afiliado', { bold: true }), cell('20% del costo del evento'), cell('20% del costo del evento')] }),
      new TableRow({ children: [cell('Bolsa anual', { bold: true }), cell('$4.000.000 COP/año'), cell('$4.000.000 COP/año')] }),
      new TableRow({ children: [cell('Preventivo', { bold: true }), cell('No incluido'), cell('Incluido desde el día 1 (Sección 7)')] }),
    ]}),
    p(''),

    h1('5. Carencias'),
    p('Las carencias se cuentan desde la fecha de afiliación y varían según el tipo de evento:'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [cell('Tipo de evento', { header: true, width: 40 }), cell('Carencia', { header: true, width: 22 }), cell('Desde cuándo hay cobertura', { header: true, width: 38 })] }),
      new TableRow({ children: [cell('Accidente (trauma, atropellamiento, intoxicación, cuerpo extraño)', { bold: true }), cell('Ninguna', { bold: true, color: '1E7D45' }), cell('Desde el mismo día de la afiliación')] }),
      new TableRow({ children: [cell('Enfermedad y eventos no traumáticos', { bold: true }), cell('15 días'), cell('A partir del día 16')] }),
      new TableRow({ children: [cell('Condiciones ortopédicas y de ligamento cruzado', { bold: true }), cell('30 días'), cell('A partir del día 31')] }),
      new TableRow({ children: [cell('Beneficios preventivos (solo Plan Total)', { bold: true }), cell('Ninguna', { bold: true, color: '1E7D45' }), cell('Desde el día 1')] }),
    ]}),
    p(''),
    p('Un accidente no puede preexistir ni anticiparse, razón por la cual no se le aplica carencia. Las enfermedades y las condiciones ortopédicas sí, por el riesgo de que existieran antes de la afiliación.'),

    h1('6. Cobertura de urgencias y funcionamiento de la bolsa'),
    p('En un evento calificado como urgencia cubierta, el Afiliado paga el 20% del costo (copago) y PETS & PETS asume el 80% restante, que se descuenta de la bolsa anual de $4.000.000 COP.'),
    p('Ejemplo: una urgencia por atropellamiento con costo de $3.500.000 genera un copago de $700.000 para el Afiliado; los $2.800.000 restantes los asume PETS & PETS y se descuentan de la bolsa.'),

    ...caja('La bolsa se consume con TODO, no solo con urgencias',
      'Además de las urgencias, la bolsa también se descuenta con la porción que PETS & PETS asume en los servicios programados con descuento (Sección 8). Ejemplo: una radiografía programada de $200.000 con 60% de descuento implica que el Afiliado paga $80.000 y los $120.000 que asume PETS & PETS se descuentan de su bolsa anual. La bolsa es el límite total de lo que PETS & PETS aporta por la Mascota Registrada en un año, sin importar el tipo de servicio.'),

    h2('6.1 Eventos que califican como urgencia (lista enunciativa)'),
    ...['Trauma físico: atropellamiento, caída de altura, mordedura grave, herida penetrante',
      'Dificultad respiratoria severa, disnea, cianosis u obstrucción de vías aéreas',
      'Colapso, pérdida de conciencia, convulsiones activas o shock',
      'Hemorragia activa no controlada',
      'Obstrucción urinaria, especialmente en felinos',
      'Parto distócico', 'Intoxicación o envenenamiento',
      'Dilatación-torsión gástrica (GDV)', 'Golpe de calor severo', 'Shock anafiláctico',
      'Cuerpo extraño con obstrucción quirúrgica', 'Prolapso de órganos',
      'Fracturas expuestas con compromiso vascular o neurológico',
    ].map(t => bullet(t)),
    p('La calificación de un evento como urgencia cubierta es una decisión estrictamente clínica del médico veterinario tratante de PETS & PETS, con base en criterios médicos objetivos. Dicha calificación no es apelable.'),

    h2('6.2 Bolsa agotada'),
    p('Una vez agotada la bolsa anual, los servicios se cobran a tarifa regular por el resto del año de vigencia. La bolsa se restablece en la fecha de renovación. En ningún caso PETS & PETS negará o suspenderá la atención estabilizadora de un animal por razones administrativas o económicas.'),

    h1('7. Beneficios preventivos — solo Plan Total'),
    p('Sin costo adicional y sin consumir la bolsa, por cada año de vigencia:'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [cell('Beneficio', { header: true, width: 62 }), cell('Cantidad por año', { header: true, width: 38 })] }),
      new TableRow({ children: [cell('Consultas médicas veterinarias'), cell('12 (una al mes)')] }),
      new TableRow({ children: [cell('Esquema de vacunación anual completo'), cell('1')] }),
      new TableRow({ children: [cell('Desparasitación interna'), cell('4')] }),
      new TableRow({ children: [cell('Panel básico de laboratorio (hemograma + química)'), cell('1')] }),
      new TableRow({ children: [cell('Imagen diagnóstica preventiva (Rx o ecografía)'), cell('1')] }),
      new TableRow({ children: [cell('Telemedicina / línea veterinaria'), cell('24/7 ilimitada')] }),
    ]}),
    p(''),
    p('Los beneficios no utilizados dentro del año NO son acumulables ni redimibles en dinero.'),

    h1('8. Descuentos en procedimientos programados — solo Plan Total'),
    p('Aplican sobre la tarifa regular, únicamente en procedimientos programados (nunca dentro de una urgencia). La porción que asume PETS & PETS se descuenta de la bolsa anual del Afiliado.'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [cell('Procedimiento', { header: true, width: 70 }), cell('Descuento', { header: true, width: 30 })] }),
      new TableRow({ children: [cell('Cirugía programada de tejidos blandos'), cell('60%')] }),
      new TableRow({ children: [cell('Radiografías adicionales (más de la incluida al año)'), cell('60%')] }),
      new TableRow({ children: [cell('Ecografías diagnósticas adicionales'), cell('60%')] }),
      new TableRow({ children: [cell('Esterilización / castración, SOLO bajo remisión médica'), cell('50%')] }),
      new TableRow({ children: [cell('Tomografía (TAC)'), cell('50%')] }),
      new TableRow({ children: [cell('Consulta con especialista (cardiología, neurología, oncología, etc.)'), cell('50%')] }),
      new TableRow({ children: [cell('Hospitalización programada'), cell('50%')] }),
      new TableRow({ children: [cell('Cirugía de especialista (ortopedia y similares)'), cell('40%')] }),
      new TableRow({ children: [cell('Limpieza dental / profilaxis'), cell('40%')] }),
      new TableRow({ children: [cell('Laboratorios adicionales (más del panel incluido al año)'), cell('40%')] }),
      new TableRow({ children: [cell('Medicamentos de farmacia PETS & PETS'), cell('10%')] }),
    ]}),
    p(''),
    p('La esterilización o castración solo tiene descuento cuando media indicación o remisión médica. Si el Titular la solicita de forma electiva, el descuento no aplica.'),

    h1('9. Descuento por múltiples mascotas'),
    p('Hasta 5 mascotas por Titular, cada una con su propia afiliación y su propia bolsa anual de $4.000.000. El descuento aplica mientras todas permanezcan activas:'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [cell('Mascota', { header: true }), cell('Descuento', { header: true }), cell('Plan Urgencias', { header: true }), cell('Plan Total', { header: true })] }),
      ...[['1ª','0%','$25.000','$70.000'],['2ª','20%','$20.000','$56.000'],['3ª','30%','$17.500','$49.000'],
         ['4ª','40%','$15.000','$42.000'],['5ª','50%','$12.500','$35.000']]
        .map(r => new TableRow({ children: r.map((v, i) => cell(v, { bold: i <= 1, color: i === 1 ? GOLD : '000000' })) })),
    ]}),
    p(''),
    p('Cada afiliación cubre exclusivamente a la mascota registrada (nombre, especie y raza). Si el Titular acude con una mascota distinta, esa atención se cobra a tarifa regular.'),

    h1('10. Exclusiones'),
    p('Este plan NO cubre:'),
    ...[
      'Condiciones preexistentes: toda enfermedad, lesión o signo clínico diagnosticado, tratado o documentado antes de la afiliación o durante el período de carencia, así como toda condición derivada de ellas.',
      'Toda condición médica observada o registrada en el examen inicial (Sección 3).',
      'Condiciones bilaterales: si la mascota presentó una condición ortopédica en un lado del cuerpo antes de la afiliación o durante la carencia, la misma condición en el lado contrario se considera preexistente. Aplica igualmente a la enfermedad de disco intervertebral (IVDD).',
      'Enfermedades crónicas o degenerativas y su manejo continuado, salvo por los descuentos de la Sección 8 cuando apliquen.',
      'Procedimientos electivos o programados que no constituyan una urgencia, salvo por los descuentos de la Sección 8.',
      'Condiciones menores sin riesgo vital.',
      'Tratamientos realizados en contra del concepto del médico veterinario, y las complicaciones derivadas de ellos, incluso cuando hayan sido solicitados por el Titular.',
      'Lesiones o enfermedades derivadas de maltrato, negligencia o abandono por parte del Titular o de cualquier miembro de su hogar.',
      'Lesiones derivadas de peleas, agresión o actividades de riesgo cuando la mascota hubiera mostrado conductas agresivas antes de la afiliación.',
      'Problemas de comportamiento preexistentes y sus consecuencias (por ejemplo, la mascota que ingería cuerpos extraños antes de afiliarse).',
      'Más de una extracción de cuerpo extraño bajo anestesia por año de vigencia.',
      'Reproducción, cría, gestación, parto programado y sus complicaciones, salvo el parto distócico de urgencia.',
      'Estética y cosmetología veterinaria, incluidos corte de orejas, corte de cola y retiro de uñas.',
      'Alimentos y dietas prescritas, aun cuando hayan sido indicadas por un veterinario.',
      'Tratamientos experimentales o de investigación, y aquellos no reconocidos como eficaces por la comunidad veterinaria.',
      'Grooming, baños, guardería y hospedaje no derivados de una urgencia cubierta.',
      'Costos de transporte, domicilio, envío, trámites y administración.',
      'Servicios prestados fuera de las sedes de PETS & PETS sin autorización previa y expresa de la gerencia.',
    ].map(t => bullet(t)),

    h2('10.1 Condiciones curables — período de exclusión de 12 meses'),
    p('Una condición preexistente CURABLE queda excluida durante los doce (12) meses siguientes a la afiliación. Si la condición no reaparece dentro de ese período, deja de considerarse preexistente y pasa a estar cubierta en adelante. Esta regla no aplica a condiciones crónicas, degenerativas, ortopédicas ni a la IVDD.'),

    h1('11. Pago de la cuota'),
    p('La cuota puede pagarse de forma mensual, o de forma anticipada por 3 o 6 meses con un descuento del 5% y del 15% respectivamente sobre el valor total. Estos descuentos aplican únicamente a través de los canales oficiales de pago y no son acumulables con otros beneficios.'),
    p('El Titular puede además registrar una tarjeta para pago automático. En ese caso PETS & PETS otorga como cortesía el cuarto (4º) y el octavo (8º) mes de la afiliación, sin costo. Este beneficio aplica exclusivamente al pago automático y no es acumulable con los descuentos por pago anticipado.'),

    h1('12. Mora, suspensión y cancelación por no pago'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [cell('Estado', { header: true, width: 26 }), cell('Cuándo aplica', { header: true, width: 34 }), cell('Efecto', { header: true, width: 40 })] }),
      new TableRow({ children: [cell('En gracia', { bold: true }), cell('Días 0 a 5 tras el vencimiento'), cell('El plan sigue activo. Se notifica al Titular.')] }),
      new TableRow({ children: [cell('Suspendido', { bold: true }), cell('Días 6 a 29 tras el vencimiento'), cell('Se suspenden las coberturas y beneficios hasta regularizar el pago.')] }),
      new TableRow({ children: [cell('Cancelado', { bold: true }), cell('Día 30 en adelante'), cell('Termina la afiliación. Reafiliarse implica nuevas carencias y nuevo examen inicial.')] }),
    ]}),
    p(''),
    p('El Titular puede reactivar su plan en cualquier momento antes de la cancelación definitiva, poniéndose al día con el pago pendiente.'),

    h1('13. Obligaciones del Titular'),
    ...[
      'Realizar el examen inicial de la Mascota Registrada en los términos de la Sección 3.',
      'Suministrar información veraz y completa sobre la mascota al momento de afiliarse.',
      'Procurar el cuidado adecuado de la mascota, incluyendo la atención preventiva recomendada por el veterinario.',
      'Pagar el copago antes del inicio de la atención en los eventos cubiertos.',
      'Informar a PETS & PETS cualquier cambio en sus datos de contacto o medio de pago.',
    ].map(t => bullet(t)),

    h1('14. Tratamiento de datos personales'),
    p('Al afiliarse, el Titular autoriza a PETS & PETS a recolectar, almacenar y tratar sus datos personales y los de la Mascota Registrada, incluida la información de salud del animal, para la administración del plan, facturación, comunicaciones del servicio y análisis interno, conforme a la Ley 1581 de 2012. El Titular puede solicitar en cualquier momento el acceso, corrección o eliminación de sus datos, sujeto a las obligaciones legales de conservación.'),

    h1('15. Resolución de conflictos'),
    p('Las controversias se buscarán resolver de manera directa entre las partes. De no lograrse acuerdo, las partes se someten a la jurisdicción de los jueces de Cali, Colombia, sin perjuicio de los mecanismos de protección al consumidor ante la Superintendencia de Industria y Comercio.'),

    h1('16. Aceptación'),
    p('La afiliación al plan, de forma presencial en cualquier sede de PETS & PETS o a través del Portal del Cliente, implica la aceptación plena de estos Términos y Condiciones.'),

    new Paragraph({ spacing: { before: 380 }, children: [new TextRun({ text: '— Fin del documento —', italics: true, color: MUTED, size: 18 })] }),
  ]}],
});

const OUT = 'C:/Users/goedi/OneDrive/Desktop/SofVet/Prepagada/PetsPets_Terminos_y_Condiciones_BORRADOR.docx';
const buf = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buf);
console.log('Contrato generado:', OUT);
