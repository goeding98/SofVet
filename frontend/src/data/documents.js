/**
 * SofVet – Plantillas de documentos veterinarios
 * Placeholders: {{fecha}} {{nombre_cliente}} {{cedula_cliente}} {{telefono_cliente}}
 *               {{correo_cliente}} {{direccion_cliente}} {{nombre_mascota}} {{especie}}
 *               {{raza}} {{sexo}} {{edad}} {{peso}} {{esterilizado}} {{caracter}}
 *               {{microchip}} {{numero_historia}}
 */

const documents = [
  /* ── 1. Anestesia ─────────────────────────────────────────────────────── */
  {
    id: 1,
    nombre: 'Consentimiento Anestesia',
    icono: '💉',
    descripcion: 'Autorización para aplicar anestesia general o sedación profunda.',
    template: `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#1a1a1a;">
  <div style="text-align:center;border-bottom:3px solid #316d74;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#316d74;margin:0 0 4px;">AUTORIZACIÓN PARA ANESTESIA</h1>
    <p style="margin:0;font-size:13px;color:#666;">Fecha: <strong>{{fecha}}</strong></p>
  </div>
  <p>Yo <strong>{{nombre_cliente}}</strong>, C.C. <strong>{{cedula_cliente}}</strong>, autorizo al equipo médico veterinario para realizar en el(la) paciente <strong>{{nombre_mascota}}</strong>, especie <strong>{{especie}}</strong>, raza <strong>{{raza}}</strong>, sexo <strong>{{sexo}}</strong>, edad <strong>{{edad}}</strong>, peso <strong>{{peso}}</strong> kg, esterilizado: <strong>{{esterilizado}}</strong>, carácter: <strong>{{caracter}}</strong>, N° microchip <strong>{{microchip}}</strong>, historia clínica <strong>{{numero_historia}}</strong>, el procedimiento de <strong>ANESTESIA GENERAL</strong>.</p>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">Riesgos informados</h3>
  <p>Después de la evaluación clínica practicada y los exámenes complementarios pertinentes, se me ha explicado la naturaleza, propósito, ventajas, complicaciones y riesgos del procedimiento:</p>
  <ul><li>Shock anafiláctico</li><li>Muerte súbita</li><li>Paro cardiorrespiratorio</li><li>Dehiscencia de herida postquirúrgica</li><li>Hipotermia perioperatoria</li><li>Complicaciones respiratorias en la recuperación</li></ul>
  <p>Se me han explicado las alternativas disponibles y he podido hacer preguntas, las cuales fueron contestadas satisfactoriamente.</p>
  <p>Reconozco que hay riesgos para la vida asociados con estos procedimientos. El médico no será responsable por reacciones individuales adversas si los procedimientos fueron aplicados correctamente (Ley 576/2000, Cap. II, Art. 23).</p>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">En caso de arresto cardiopulmonar autorizo:</h3>
  <ul><li>☐ Resucitación cardiopulmonar con tórax cerrado</li><li>☐ Resucitación cardiopulmonar con tórax abierto</li><li>☐ No realizar maniobras de resucitación</li></ul>
  <p>Certifico que he leído y comprendido perfectamente lo anterior y que me encuentro en capacidad de expresar mi libre decisión.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>{{nombre_cliente}}</strong><br>C.C. {{cedula_cliente}}<br>Firma del Propietario</p></div>
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>Médico Veterinario</strong><br>T.P. _______________<br>Firma y Sello</p></div>
  </div></div>`,
  },

  /* ── 2. Cirugía ───────────────────────────────────────────────────────── */
  {
    id: 2,
    nombre: 'Consentimiento Cirugía',
    icono: '🔬',
    descripcion: 'Autorización para procedimiento quirúrgico y manejo postoperatorio.',
    template: `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#1a1a1a;">
  <div style="text-align:center;border-bottom:3px solid #316d74;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#316d74;margin:0 0 4px;">AUTORIZACIÓN PARA PROCEDIMIENTO QUIRÚRGICO</h1>
    <p style="margin:0;font-size:13px;color:#666;">Fecha: <strong>{{fecha}}</strong></p>
  </div>
  <p>Yo <strong>{{nombre_cliente}}</strong>, C.C. <strong>{{cedula_cliente}}</strong>, domicilio en <strong>{{direccion_cliente}}</strong>, tel. <strong>{{telefono_cliente}}</strong>, propietario/responsable del paciente <strong>{{nombre_mascota}}</strong>, especie <strong>{{especie}}</strong>, raza <strong>{{raza}}</strong>, sexo <strong>{{sexo}}</strong>, edad <strong>{{edad}}</strong>, peso <strong>{{peso}}</strong> kg, esterilizado: <strong>{{esterilizado}}</strong>, carácter: <strong>{{caracter}}</strong>, historia clínica <strong>{{numero_historia}}</strong>, autorizo voluntariamente al equipo médico veterinario a realizar el procedimiento quirúrgico indicado.</p>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">Declaración del Propietario</h3>
  <p>1. He sido informado sobre la naturaleza, alcance y propósito del procedimiento quirúrgico programado, las alternativas disponibles, los beneficios esperados y los riesgos potenciales.</p>
  <p>2. Entiendo que los riesgos incluyen:</p>
  <ul><li>Reacciones adversas a medicamentos o materiales</li><li>Infección del sitio quirúrgico o sepsis</li><li>Dehiscencia de la herida quirúrgica</li><li>Hemorragia intraoperatoria o postoperatoria</li><li>Lesiones de estructuras adyacentes</li><li>Complicaciones anestésicas incluyendo paro cardiorrespiratorio y muerte</li></ul>
  <p>3. Autorizo al médico a realizar tratamientos adicionales que estime necesarios si surgen situaciones imprevistas.</p>
  <p>4. Me comprometo a seguir las instrucciones postoperatorias y a reportar cualquier complicación.</p>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">En caso de arresto cardiopulmonar:</h3>
  <ul><li>☐ Resucitación cardiopulmonar con tórax cerrado</li><li>☐ Resucitación cardiopulmonar con tórax abierto</li><li>☐ No realizar maniobras de resucitación</li></ul>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>{{nombre_cliente}}</strong><br>C.C. {{cedula_cliente}}<br>Firma del Propietario</p></div>
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>Médico Veterinario</strong><br>T.P. _______________<br>Firma y Sello</p></div>
  </div></div>`,
  },

  /* ── 3. Sedación ──────────────────────────────────────────────────────── */
  {
    id: 3,
    nombre: 'Consentimiento Sedación',
    icono: '😴',
    descripcion: 'Autorización para sedación ligera en procedimientos diagnósticos o manejo.',
    template: `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#1a1a1a;">
  <div style="text-align:center;border-bottom:3px solid #316d74;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#316d74;margin:0 0 4px;">AUTORIZACIÓN PARA SEDACIÓN</h1>
    <p style="margin:0;font-size:13px;color:#666;">Fecha: <strong>{{fecha}}</strong></p>
  </div>
  <p>Yo <strong>{{nombre_cliente}}</strong>, C.C. <strong>{{cedula_cliente}}</strong>, tel. <strong>{{telefono_cliente}}</strong>, propietario/responsable del paciente <strong>{{nombre_mascota}}</strong>, especie <strong>{{especie}}</strong>, raza <strong>{{raza}}</strong>, sexo <strong>{{sexo}}</strong>, edad <strong>{{edad}}</strong>, peso <strong>{{peso}}</strong> kg, esterilizado: <strong>{{esterilizado}}</strong>, carácter: <strong>{{caracter}}</strong>, historia clínica <strong>{{numero_historia}}</strong>.</p>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">Descripción del Procedimiento</h3>
  <p>La sedación es un estado de reducción de la conciencia y la respuesta al dolor inducido farmacológicamente, de menor profundidad que la anestesia general. Se utiliza para facilitar procedimientos diagnósticos (radiografías, ecografías, toma de muestras) o terapéuticos menores que requieren inmovilización o analgesia.</p>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">Riesgos informados</h3>
  <ul>
    <li>Hipotensión arterial transitoria</li>
    <li>Depresión respiratoria leve</li>
    <li>Hipotermia perioperatoria</li>
    <li>Reacciones de hipersensibilidad a los fármacos sedantes</li>
    <li>En casos excepcionales: profundización no deseada hacia plano anestésico</li>
    <li>Náuseas y vómitos en la fase de recuperación</li>
  </ul>
  <p>1. He sido informado(a) sobre las características de la sedación, su diferencia con la anestesia general y los riesgos asociados.</p>
  <p>2. Entiendo que mi mascota será monitoreada durante todo el procedimiento por personal médico capacitado.</p>
  <p>3. El médico veterinario podrá profundizar el plano de sedación si las circunstancias clínicas lo requieren, previa notificación cuando sea posible.</p>
  <p>4. Me comprometo a seguir las indicaciones de ayuno previo y las instrucciones postprocedimiento.</p>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">En caso de complicación grave:</h3>
  <ul><li>☐ Autorizo intervención médica de emergencia incluyendo anestesia general si fuera necesario</li><li>☐ Deseo ser contactado antes de cualquier cambio de protocolo</li></ul>
  <p>Certifico que he leído y acepto libremente los términos de este documento.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>{{nombre_cliente}}</strong><br>C.C. {{cedula_cliente}}<br>Tel: {{telefono_cliente}}<br>Firma del Propietario</p></div>
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>Médico Veterinario</strong><br>T.P. _______________<br>Firma y Sello</p></div>
  </div></div>`,
  },

  /* ── 4. Hospitalización ───────────────────────────────────────────────── */
  {
    id: 4,
    nombre: 'Consentimiento Hospitalización',
    icono: '🏥',
    descripcion: 'Consentimiento para ingreso, hospitalización y manejo médico del paciente.',
    template: `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#1a1a1a;">
  <div style="text-align:center;border-bottom:3px solid #316d74;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#316d74;margin:0 0 4px;">AUTORIZACIÓN PARA HOSPITALIZACIÓN</h1>
    <p style="margin:0;font-size:13px;color:#666;">Fecha de ingreso: <strong>{{fecha}}</strong></p>
  </div>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">Datos del Paciente</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;width:35%;">Nombre</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{nombre_mascota}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Especie / Raza</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{especie}} / {{raza}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Sexo / Edad / Peso</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{sexo}} / {{edad}} / {{peso}} kg</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Esterilizado / Carácter</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{esterilizado}} / {{caracter}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">N° Historia Clínica</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{numero_historia}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Propietario / C.C.</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{nombre_cliente}} / {{cedula_cliente}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Teléfono</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{telefono_cliente}}</td></tr>
  </table>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">Consentimiento</h3>
  <p>Yo <strong>{{nombre_cliente}}</strong>, autorizo el ingreso y hospitalización de mi mascota <strong>{{nombre_mascota}}</strong> y declaro:</p>
  <p>1. Autorizo al personal médico a realizar los procedimientos diagnósticos y terapéuticos necesarios para la estabilización y recuperación de mi mascota.</p>
  <p>2. Proporcionaré un número de contacto activo las 24 horas y responderé oportunamente las comunicaciones del personal médico.</p>
  <p>3. Autorizo en caso de emergencia:</p>
  <ul><li>☐ Transfusiones sanguíneas</li><li>☐ No autorizo transfusiones sanguíneas</li></ul>
  <p>4. En caso de arresto cardiopulmonar:</p>
  <ul><li>☐ Resucitación cardiopulmonar básica</li><li>☐ Resucitación cardiopulmonar avanzada</li><li>☐ No realizar maniobras de resucitación (DNR)</li></ul>
  <p>5. Me comprometo a cubrir los costos de hospitalización conforme a las políticas del establecimiento.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>{{nombre_cliente}}</strong><br>C.C. {{cedula_cliente}}<br>Tel: {{telefono_cliente}}<br>Firma del Propietario</p></div>
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>Médico Veterinario</strong><br>T.P. _______________<br>Firma y Sello</p></div>
  </div></div>`,
  },

  /* ── 5. Procedimiento General ─────────────────────────────────────────── */
  {
    id: 5,
    nombre: 'Consentimiento Procedimiento General',
    icono: '🩺',
    descripcion: 'Autorización genérica para procedimientos diagnósticos o terapéuticos varios.',
    template: `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#1a1a1a;">
  <div style="text-align:center;border-bottom:3px solid #316d74;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#316d74;margin:0 0 4px;">CONSENTIMIENTO INFORMADO — PROCEDIMIENTO MÉDICO</h1>
    <p style="margin:0;font-size:13px;color:#666;">Fecha: <strong>{{fecha}}</strong></p>
  </div>
  <p>Yo <strong>{{nombre_cliente}}</strong>, C.C. <strong>{{cedula_cliente}}</strong>, tel. <strong>{{telefono_cliente}}</strong>, dirección <strong>{{direccion_cliente}}</strong>, en calidad de propietario/responsable del paciente <strong>{{nombre_mascota}}</strong>, especie <strong>{{especie}}</strong>, raza <strong>{{raza}}</strong>, sexo <strong>{{sexo}}</strong>, edad <strong>{{edad}}</strong>, peso <strong>{{peso}}</strong> kg, esterilizado: <strong>{{esterilizado}}</strong>, carácter: <strong>{{caracter}}</strong>, historia clínica <strong>{{numero_historia}}</strong>.</p>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">Procedimientos autorizados</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
    <tr style="background:#f4f7f6;"><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;width:55%;">Procedimiento</td><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;text-align:center;">Autoriza</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Hemograma / Bioquímica sanguínea</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Uroanálisis / Coprológico</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Radiografía (indicar zona): _______</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Ecografía abdominal / cardiaca</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Electrocardiograma (ECG)</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Citología / Biopsia / Histopatología</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Cultivo y antibiograma</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Tratamiento tópico / vendaje</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Fluidoterapia intravenosa</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;">Otro: ____________________________</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐ Sí &nbsp; ☐ No</td></tr>
  </table>
  <p>1. He sido informado sobre los procedimientos indicados, su propósito, técnica, posibles molestias y riesgos asociados.</p>
  <p>2. Autorizo la toma de muestras necesarias y la realización de los exámenes indicados por el médico veterinario.</p>
  <p>3. He sido informado sobre los costos estimados y manifiesto mi conformidad.</p>
  <p>4. Entiendo que los resultados serán utilizados para establecer el diagnóstico y plan terapéutico más adecuado.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>{{nombre_cliente}}</strong><br>C.C. {{cedula_cliente}}<br>Firma del Propietario</p></div>
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>Médico Veterinario</strong><br>T.P. _______________<br>Firma y Sello</p></div>
  </div></div>`,
  },

  /* ── 6. Disposición de Cadáver ────────────────────────────────────────── */
  {
    id: 6,
    nombre: 'Autorización Disposición de Cadáver',
    icono: '🕊️',
    descripcion: 'Autorización y disposición del propietario sobre los restos mortales del paciente.',
    template: `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#1a1a1a;">
  <div style="text-align:center;border-bottom:3px solid #316d74;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#316d74;margin:0 0 4px;">AUTORIZACIÓN PARA DISPOSICIÓN DE CADÁVER</h1>
    <p style="margin:0;font-size:13px;color:#666;">Fecha: <strong>{{fecha}}</strong></p>
  </div>
  <p>Yo <strong>{{nombre_cliente}}</strong>, C.C. <strong>{{cedula_cliente}}</strong>, domicilio en <strong>{{direccion_cliente}}</strong>, tel. <strong>{{telefono_cliente}}</strong>, correo <strong>{{correo_cliente}}</strong>, en calidad de propietario/responsable legal del paciente <strong>{{nombre_mascota}}</strong>, especie <strong>{{especie}}</strong>, raza <strong>{{raza}}</strong>, sexo <strong>{{sexo}}</strong>, edad <strong>{{edad}}</strong>, peso <strong>{{peso}}</strong> kg, historia clínica <strong>{{numero_historia}}</strong>.</p>
  <h3 style="color:#316d74;border-bottom:1px solid #dde8e6;padding-bottom:6px;">Declaración</h3>
  <p>En pleno uso de mis facultades y con conocimiento del fallecimiento de mi mascota, autorizo la siguiente disposición de sus restos mortales (marque la opción elegida):</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
    <tr style="background:#f4f7f6;"><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;width:10%;">Opción</td><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;">Descripción</td><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;text-align:center;width:15%;">Selección</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;">A</td><td style="padding:8px 12px;border:1px solid #dde8e6;">Retiro del cuerpo por el propietario para disposición final por su cuenta</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;">B</td><td style="padding:8px 12px;border:1px solid #dde8e6;">Cremación individual — cenizas entregadas al propietario en urna</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;">C</td><td style="padding:8px 12px;border:1px solid #dde8e6;">Cremación colectiva — sin entrega de cenizas</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;">D</td><td style="padding:8px 12px;border:1px solid #dde8e6;">Disposición por la clínica conforme a normativa sanitaria vigente</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐</td></tr>
    <tr><td style="padding:8px 12px;border:1px solid #dde8e6;font-weight:bold;">E</td><td style="padding:8px 12px;border:1px solid #dde8e6;">Donación para fines científicos o educativos (previa aceptación)</td><td style="padding:8px 12px;border:1px solid #dde8e6;text-align:center;">☐</td></tr>
  </table>
  <p>Adicionalmente, declaro:</p>
  <p>1. Acepto los costos de la opción de disposición seleccionada conforme a la tarifa vigente del establecimiento.</p>
  <p>2. Entiendo que en caso de no seleccionar ninguna opción y no retirar el cuerpo en el plazo acordado (máx. 48 horas), la clínica procederá con la disposición sanitaria según normativa vigente.</p>
  <p>3. Eximo de responsabilidad al establecimiento veterinario por cualquier acción realizada conforme a la opción autorizada en este documento.</p>
  <p>4. Este documento no exime al propietario de las obligaciones económicas pendientes con el establecimiento.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>{{nombre_cliente}}</strong><br>C.C. {{cedula_cliente}}<br>Tel: {{telefono_cliente}}<br>Firma del Propietario</p></div>
    <div style="text-align:center;"><div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div><p style="margin:0;font-size:13px;"><strong>Personal Autorizado</strong><br>Cargo: _______________<br>Firma y Sello</p></div>
  </div></div>`,
  },

  /* ── 7. Deslinde Informado ────────────────────────────────────────────── */
  {
    id: 7,
    nombre: 'Deslinde Informado',
    icono: '⚠️',
    descripcion: 'Retiro voluntario del paciente de hospitalización contra indicación médica.',
    template: `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#1a1a1a;">
  <div style="text-align:center;border-bottom:3px solid #c0392b;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#c0392b;margin:0 0 4px;">DESLINDE INFORMADO</h1>
    <p style="margin:0;font-size:13px;color:#666;">Fecha: <strong>{{fecha}}</strong></p>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;width:35%;">Procedimiento / Actividad / Tratamiento</td><td style="padding:6px 10px;border:1px solid #dde8e6;">_______________________________________________</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Nombre del propietario</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{nombre_cliente}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Documento</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{cedula_cliente}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Paciente</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{nombre_mascota}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Especie / Raza</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{especie}} / {{raza}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">Edad / Sexo</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{edad}} / {{sexo}}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #dde8e6;background:#f4f7f6;font-weight:bold;">N° Historia Clínica</td><td style="padding:6px 10px;border:1px solid #dde8e6;">{{numero_historia}}</td></tr>
  </table>
  <div style="background:#fff8f8;border:1px solid #f5c6c2;border-radius:6px;padding:16px 20px;margin-bottom:24px;font-size:13px;line-height:1.7;">
    <p style="margin:0;">Entiendo que este procedimiento hace parte del plan de tratamiento instaurado para mi mascota y que el médico posee la idoneidad y el entrenamiento suficiente. Me han sido explicadas las implicaciones y posibles complicaciones por su no realización. No obstante, <strong>me niego al mismo</strong>, asumiendo los riesgos bajo mi propia responsabilidad y en constancia de ello firmo.</p>
  </div>
  <div style="margin-bottom:32px;">
    <p style="font-size:13px;font-weight:bold;margin-bottom:4px;">FIRMA DEL TUTOR</p>
    <div style="border-bottom:1px solid #333;height:50px;max-width:400px;margin-bottom:8px;"></div>
    <p style="margin:0;font-size:12px;color:#555;"><strong>{{nombre_cliente}}</strong> &nbsp;·&nbsp; C.C. {{cedula_cliente}}</p>
  </div>
  <div style="border-top:1px solid #dde8e6;padding-top:20px;">
    <p style="font-size:13px;margin-bottom:16px;">Certifico que he explicado la naturaleza, propósito, ventajas y riesgos del procedimiento y he contestado todas las preguntas. Considero que el propietario comprende todo lo explicado.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;">
      <div>
        <p style="font-size:13px;font-weight:bold;margin-bottom:4px;">FIRMA DEL MÉDICO VETERINARIO</p>
        <div style="border-bottom:1px solid #333;height:50px;margin-bottom:8px;"></div>
        <p style="margin:0;font-size:12px;color:#555;">Matrícula Profesional: _______________</p>
      </div>
      <div style="display:flex;align-items:flex-end;">
        <p style="font-size:11px;color:#888;font-style:italic;margin:0;">Este documento exime de responsabilidad al médico veterinario y al establecimiento por las consecuencias derivadas del retiro voluntario del paciente contra indicación médica (Ley 576/2000).</p>
      </div>
    </div>
  </div>
</div>`,
  },
];

export default documents;
