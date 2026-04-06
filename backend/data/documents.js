/**
 * SofVet – Plantillas de documentos veterinarios
 * Placeholders disponibles:
 *   {{fecha}} {{nombre_cliente}} {{cedula_cliente}} {{telefono_cliente}}
 *   {{correo_cliente}} {{direccion_cliente}} {{nombre_mascota}} {{especie}}
 *   {{raza}} {{sexo}} {{edad}} {{peso}} {{microchip}} {{numero_historia}}
 */

const documents = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 1,
    nombre: 'Consentimiento para Anestesia',
    icono: '💉',
    descripcion: 'Autorización del propietario para aplicar anestesia general o sedación al paciente.',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #1a1a1a;">
        <div style="text-align: center; border-bottom: 3px solid #316d74; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; color: #316d74; margin: 0 0 4px;">AUTORIZACIÓN PARA ANESTESIA</h1>
          <p style="margin: 0; font-size: 13px; color: #666;">Fecha: <strong>{{fecha}}</strong></p>
        </div>

        <p>1. Yo <strong>{{nombre_cliente}}</strong>, identificado(a) con la C.C. <strong>{{cedula_cliente}}</strong>,
        en pleno uso de mis facultades mentales, autorizo al equipo médico veterinario y a su equipo de trabajo, para
        realizar en el(la) paciente <strong>{{nombre_mascota}}</strong>, especie <strong>{{especie}}</strong>, raza
        <strong>{{raza}}</strong>, sexo <strong>{{sexo}}</strong>, edad <strong>{{edad}}</strong>, peso
        <strong>{{peso}}</strong> kg, N° microchip <strong>{{microchip}}</strong>, con número de historia clínica
        <strong>{{numero_historia}}</strong>, el procedimiento de <strong>ANESTESIA</strong>.</p>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">Riesgos informados</h3>

        <p>2. Después de la evaluación clínica practicada por el médico tratante y los exámenes complementarios pertinentes,
        se me ha explicado la naturaleza y el propósito de la intervención, así como las ventajas, complicaciones y riesgos
        que puedan producirse, en particular los siguientes:</p>

        <ul>
          <li>Shock anafiláctico</li>
          <li>Muerte súbita</li>
          <li>Paro cardiorrespiratorio</li>
          <li>Dehiscencia de herida (en caso de procedimiento quirúrgico asociado)</li>
          <li>Hipotermia perioperatoria</li>
          <li>Complicaciones respiratorias durante la recuperación anestésica</li>
        </ul>

        <p>3. Se me han explicado las posibles alternativas al tratamiento propuesto y se me ha dado la oportunidad de
        hacer preguntas; todas han sido contestadas satisfactoriamente.</p>

        <p>4. Reconozco que hay riesgos para la vida y la salud asociados con estos procedimientos y sustancias. Tales
        riesgos me han sido explicados por el médico veterinario.</p>

        <p>5. Entiendo que en el curso de la intervención pueden presentarse situaciones imprevistas que requieran
        procedimientos y medicamentos adicionales. Autorizo la realización de dichos procedimientos si el médico y sus
        asistentes los juzgan necesarios.</p>

        <p>6. Certifico que los médicos veterinarios no serán responsables por reacciones individuales, inmediatas o
        tardías producidas por efectos del tratamiento, mientras hayan sido aplicados correctamente (Ley 576 de 2000,
        Cap. II, Art. 23).</p>

        <p>7. Reconozco que no se me han garantizado los resultados esperados de la intervención, por tratarse de una
        actividad médica de medios y no de resultados (Ley 23 de 1981, Res. 1995/99).</p>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">En caso de arresto cardiopulmonar, autorizo:</h3>
        <ul>
          <li>☐ Resucitación cardiopulmonar con tórax cerrado</li>
          <li>☐ Resucitación cardiopulmonar con tórax abierto</li>
          <li>☐ No realizar maniobras de resucitación</li>
        </ul>

        <p>8. Certifico que he leído y comprendido perfectamente lo anterior; que todos los espacios en blanco de este
        documento han sido completados antes de mi firma y que me encuentro en capacidad de expresar mi libre decisión.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px;">
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>{{nombre_cliente}}</strong><br>
            C.C. {{cedula_cliente}}<br>Firma del Propietario/Responsable</p>
          </div>
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>Médico Veterinario</strong><br>
            T.P. _______________<br>Firma y Sello</p>
          </div>
        </div>
      </div>
    `,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 2,
    nombre: 'Consentimiento para Cirugía',
    icono: '🔪',
    descripcion: 'Autorización para realización de procedimiento quirúrgico y manejo postoperatorio.',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #1a1a1a;">
        <div style="text-align: center; border-bottom: 3px solid #316d74; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; color: #316d74; margin: 0 0 4px;">AUTORIZACIÓN PARA PROCEDIMIENTO QUIRÚRGICO</h1>
          <p style="margin: 0; font-size: 13px; color: #666;">Fecha: <strong>{{fecha}}</strong></p>
        </div>

        <p>Yo <strong>{{nombre_cliente}}</strong>, identificado(a) con C.C. <strong>{{cedula_cliente}}</strong>,
        con domicilio en <strong>{{direccion_cliente}}</strong>, teléfono <strong>{{telefono_cliente}}</strong>, en
        calidad de propietario/responsable del paciente <strong>{{nombre_mascota}}</strong>, especie
        <strong>{{especie}}</strong>, raza <strong>{{raza}}</strong>, sexo <strong>{{sexo}}</strong>, edad
        <strong>{{edad}}</strong>, peso <strong>{{peso}}</strong> kg, N° historia clínica
        <strong>{{numero_historia}}</strong>, autorizo voluntariamente al equipo médico veterinario a realizar el
        procedimiento quirúrgico indicado.</p>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">Declaración del Propietario</h3>

        <p>1. He sido informado(a) sobre la naturaleza, alcance y propósito del procedimiento quirúrgico programado,
        las alternativas disponibles, los beneficios esperados y los riesgos potenciales.</p>

        <p>2. Entiendo que los riesgos asociados con el procedimiento incluyen, entre otros:</p>
        <ul>
          <li>Reacciones adversas a medicamentos o materiales utilizados</li>
          <li>Infección del sitio quirúrgico o sepsis</li>
          <li>Dehiscencia de la herida quirúrgica</li>
          <li>Hemorragia intraoperatoria o postoperatoria</li>
          <li>Lesiones de estructuras adyacentes</li>
          <li>Complicaciones anestésicas incluyendo paro cardiorrespiratorio y muerte</li>
          <li>Necesidad de procedimientos adicionales no previstos</li>
        </ul>

        <p>3. Autorizo al médico veterinario a proceder con tratamientos o procedimientos adicionales que estime
        necesarios si surgen situaciones imprevistas durante la intervención.</p>

        <p>4. Me comprometo a seguir estrictamente las instrucciones postoperatorias indicadas y a informar de
        inmediato cualquier complicación que observe en el paciente.</p>

        <p>5. Entiendo que el resultado de la cirugía depende de factores que pueden estar fuera del control del
        médico veterinario y que no se me garantizan resultados específicos.</p>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">En caso de arresto cardiopulmonar, autorizo:</h3>
        <ul>
          <li>☐ Resucitación cardiopulmonar con tórax cerrado</li>
          <li>☐ Resucitación cardiopulmonar con tórax abierto</li>
          <li>☐ No realizar maniobras de resucitación</li>
        </ul>

        <p>6. Certifico que he leído, entendido y acepto los términos de este documento, el cual firmo de manera
        libre y voluntaria.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px;">
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>{{nombre_cliente}}</strong><br>
            C.C. {{cedula_cliente}}<br>Firma del Propietario/Responsable</p>
          </div>
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>Médico Veterinario</strong><br>
            T.P. _______________<br>Firma y Sello</p>
          </div>
        </div>
      </div>
    `,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 3,
    nombre: 'Consentimiento para Eutanasia',
    icono: '🕊️',
    descripcion: 'Solicitud y autorización voluntaria e informada del propietario para eutanasia humanitaria.',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #1a1a1a;">
        <div style="text-align: center; border-bottom: 3px solid #316d74; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; color: #316d74; margin: 0 0 4px;">AUTORIZACIÓN Y SOLICITUD DE EUTANASIA</h1>
          <p style="margin: 0; font-size: 13px; color: #666;">Fecha: <strong>{{fecha}}</strong></p>
        </div>

        <p>Yo <strong>{{nombre_cliente}}</strong>, identificado(a) con C.C. <strong>{{cedula_cliente}}</strong>,
        domiciliado(a) en <strong>{{direccion_cliente}}</strong>, teléfono <strong>{{telefono_cliente}}</strong>,
        en mi calidad de propietario/responsable legal del paciente <strong>{{nombre_mascota}}</strong>, especie
        <strong>{{especie}}</strong>, raza <strong>{{raza}}</strong>, sexo <strong>{{sexo}}</strong>, edad
        <strong>{{edad}}</strong>, peso <strong>{{peso}}</strong> kg, N° historia clínica
        <strong>{{numero_historia}}</strong>.</p>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">Declaro y Manifiesto</h3>

        <p>1. Solicito de manera libre, voluntaria e informada la aplicación del procedimiento de eutanasia humanitaria
        para mi mascota, habiendo comprendido y evaluado su estado actual de salud y calidad de vida.</p>

        <p>2. He sido informado(a) por el médico veterinario sobre el estado clínico del paciente, las opciones de
        tratamiento disponibles, el pronóstico de su condición y las implicaciones de la decisión que tomo.</p>

        <p>3. Entiendo que la eutanasia es un procedimiento irreversible que consiste en la administración de una dosis
        letal de fármacos que produce la muerte del animal de manera rápida, pacífica e indolora.</p>

        <p>4. Eximo de toda responsabilidad legal y civil al médico veterinario y al personal que intervenga en este
        procedimiento, el cual se realiza conforme a la Ley 576 de 2000 (Código de Ética del Médico Veterinario) y sus
        principios de bienestar animal.</p>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">Disposiciones adicionales</h3>

        <p>5. Respecto a mi presencia durante el procedimiento:</p>
        <ul>
          <li>☐ Deseo estar presente durante la eutanasia</li>
          <li>☐ No deseo estar presente durante la eutanasia</li>
        </ul>

        <p>6. Respecto a los restos mortales del animal:</p>
        <ul>
          <li>☐ Retiraré el cuerpo de mi mascota para su disposición final</li>
          <li>☐ Autorizo al establecimiento para la disposición final conforme a la normativa vigente</li>
          <li>☐ Solicito cremación individual — cenizas entregadas al propietario</li>
          <li>☐ Solicito cremación colectiva</li>
        </ul>

        <p>7. Certifico que la presente solicitud se hace con pleno conocimiento de causa, sin coacción alguna y en
        ejercicio de mi responsabilidad como propietario del animal. Manifiesto que esta es una decisión meditada y
        tomada en beneficio del bienestar de mi mascota.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px;">
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>{{nombre_cliente}}</strong><br>
            C.C. {{cedula_cliente}}<br>Tel: {{telefono_cliente}}<br>Firma del Propietario/Responsable</p>
          </div>
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>Médico Veterinario</strong><br>
            T.P. _______________<br>Firma y Sello</p>
          </div>
        </div>
      </div>
    `,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 4,
    nombre: 'Autorización para Hospitalización',
    icono: '🏥',
    descripcion: 'Consentimiento para ingreso, hospitalización y manejo médico del paciente.',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #1a1a1a;">
        <div style="text-align: center; border-bottom: 3px solid #316d74; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; color: #316d74; margin: 0 0 4px;">AUTORIZACIÓN PARA HOSPITALIZACIÓN</h1>
          <p style="margin: 0; font-size: 13px; color: #666;">Fecha de ingreso: <strong>{{fecha}}</strong></p>
        </div>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">Datos del Paciente</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold; width: 35%;">Nombre del paciente</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{nombre_mascota}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Especie / Raza</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{especie}} / {{raza}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Sexo / Edad / Peso</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{sexo}} / {{edad}} / {{peso}} kg</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">N° Historia Clínica</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{numero_historia}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Propietario / C.C.</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{nombre_cliente}} / {{cedula_cliente}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Teléfono de contacto</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{telefono_cliente}}</td>
          </tr>
        </table>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">Consentimiento</h3>

        <p>Yo <strong>{{nombre_cliente}}</strong>, autorizo el ingreso y hospitalización de mi mascota
        <strong>{{nombre_mascota}}</strong> en las instalaciones de esta clínica veterinaria, bajo el cuidado del
        equipo médico, y declaro lo siguiente:</p>

        <p>1. Autorizo al personal médico a realizar los procedimientos diagnósticos y terapéuticos que consideren
        necesarios para la estabilización y recuperación de mi mascota durante su hospitalización.</p>

        <p>2. Entiendo que seré notificado(a) ante cualquier cambio significativo en el estado de salud del paciente
        y que mi consentimiento será requerido para procedimientos de alto riesgo o de costo elevado.</p>

        <p>3. Me comprometo a proporcionar un número de contacto activo durante las 24 horas y a responder
        oportunamente a las comunicaciones del personal médico.</p>

        <p>4. Reconozco que la clínica hará su mejor esfuerzo por el bienestar del paciente, pero no puede garantizar
        resultados específicos dada la naturaleza de la enfermedad.</p>

        <p>5. Autorizo el uso de medios de contraste, transfusiones sanguíneas u otros procedimientos de urgencia si
        el médico los considera indispensables para preservar la vida del paciente:</p>
        <ul>
          <li>☐ Sí autorizo transfusiones sanguíneas en caso de emergencia</li>
          <li>☐ No autorizo transfusiones sanguíneas</li>
        </ul>

        <p>6. En caso de que mi paciente presente arresto cardiopulmonar durante la hospitalización, autorizo:</p>
        <ul>
          <li>☐ Resucitación cardiopulmonar básica</li>
          <li>☐ Resucitación cardiopulmonar avanzada</li>
          <li>☐ No realizar maniobras de resucitación (DNR)</li>
        </ul>

        <p>7. He sido informado(a) sobre los costos estimados de hospitalización y me comprometo a cubrirlos conforme
        a las políticas de pago del establecimiento.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px;">
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>{{nombre_cliente}}</strong><br>
            C.C. {{cedula_cliente}}<br>Tel: {{telefono_cliente}}<br>Firma del Propietario/Responsable</p>
          </div>
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>Médico Veterinario</strong><br>
            T.P. _______________<br>Firma y Sello</p>
          </div>
        </div>
      </div>
    `,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 5,
    nombre: 'Autorización Procedimientos Diagnósticos',
    icono: '🧪',
    descripcion: 'Consentimiento para toma de muestras, laboratorio, radiología y ecografía.',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #1a1a1a;">
        <div style="text-align: center; border-bottom: 3px solid #316d74; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; color: #316d74; margin: 0 0 4px;">AUTORIZACIÓN PARA PROCEDIMIENTOS DIAGNÓSTICOS</h1>
          <p style="margin: 0; font-size: 13px; color: #666;">Fecha: <strong>{{fecha}}</strong></p>
        </div>

        <p>Yo <strong>{{nombre_cliente}}</strong>, identificado(a) con C.C. <strong>{{cedula_cliente}}</strong>,
        teléfono <strong>{{telefono_cliente}}</strong>, en mi calidad de propietario/responsable del paciente
        <strong>{{nombre_mascota}}</strong>, especie <strong>{{especie}}</strong>, raza <strong>{{raza}}</strong>,
        sexo <strong>{{sexo}}</strong>, edad <strong>{{edad}}</strong>, peso <strong>{{peso}}</strong> kg,
        N° historia clínica <strong>{{numero_historia}}</strong>.</p>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">Procedimientos autorizados</h3>
        <p>Autorizo la realización de los siguientes procedimientos diagnósticos (marque los que apliquen):</p>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <tr style="background: #f4f7f6;">
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; font-weight: bold; width: 50%;">Procedimiento</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; font-weight: bold; text-align: center;">Autoriza</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Hemograma completo (KBC)</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Perfil bioquímico (función renal/hepática)</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Uroanálisis completo</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Coprológico / Coproparasitológico</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Radiografía torácica / abdominal</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Ecografía abdominal</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Electrocardiograma (ECG)</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Cultivo y antibiograma</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Citología / Histopatología</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6;">Otro: _________________________</td>
            <td style="padding: 8px 12px; border: 1px solid #dde8e6; text-align: center;">☐ Sí &nbsp; ☐ No</td>
          </tr>
        </table>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">Declaración</h3>

        <p>1. He sido informado(a) sobre los procedimientos diagnósticos indicados, su propósito, técnica, posibles
        molestias y riesgos menores asociados.</p>

        <p>2. Autorizo la toma de las muestras necesarias (sangre, orina, heces, tejido, etc.) para la realización de
        los exámenes indicados por el médico veterinario.</p>

        <p>3. Entiendo que los resultados de los exámenes se utilizarán para establecer un diagnóstico y plan
        terapéutico adecuado para mi mascota.</p>

        <p>4. He sido informado(a) sobre los costos estimados de los procedimientos y manifiesto mi conformidad.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px;">
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>{{nombre_cliente}}</strong><br>
            C.C. {{cedula_cliente}}<br>Firma del Propietario/Responsable</p>
          </div>
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>Médico Veterinario</strong><br>
            T.P. _______________<br>Firma y Sello</p>
          </div>
        </div>
      </div>
    `,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 6,
    nombre: 'Ficha de Ingreso del Paciente',
    icono: '📋',
    descripcion: 'Registro completo de admisión con datos del paciente, propietario y motivo de consulta.',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #1a1a1a;">
        <div style="text-align: center; border-bottom: 3px solid #316d74; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; color: #316d74; margin: 0 0 4px;">FICHA DE INGRESO DEL PACIENTE</h1>
          <p style="margin: 0; font-size: 13px; color: #666;">Fecha de registro: <strong>{{fecha}}</strong> &nbsp;|&nbsp; N° Historia: <strong>{{numero_historia}}</strong></p>
        </div>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">I. Datos del Propietario</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold; width: 35%;">Nombre completo</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{nombre_cliente}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">C.C. / Documento</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{cedula_cliente}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Teléfono</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{telefono_cliente}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Correo electrónico</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{correo_cliente}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Dirección</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{direccion_cliente}}</td>
          </tr>
        </table>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">II. Datos del Paciente</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold; width: 35%;">Nombre de la mascota</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{nombre_mascota}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Especie</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{especie}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Raza</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{raza}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Sexo</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{sexo}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Edad</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{edad}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Peso</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{peso}} kg</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">N° Microchip</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">{{microchip}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">¿Esterilizado(a)?</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">☐ Sí &nbsp; ☐ No &nbsp; ☐ No sabe</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">¿Vacunado(a)?</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">☐ Sí &nbsp; ☐ No &nbsp; ☐ No sabe</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">¿Desparasitado(a)?</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">☐ Sí &nbsp; ☐ No &nbsp; ☐ No sabe — Última vez: ____________</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Alergias conocidas</td>
            <td style="padding: 6px 10px; border: 1px solid #dde8e6;">☐ Ninguna &nbsp; ☐ Sí: ____________________________</td>
          </tr>
        </table>

        <h3 style="color: #316d74; border-bottom: 1px solid #dde8e6; padding-bottom: 6px;">III. Motivo de Consulta</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold; width: 35%;">Motivo principal</td>
            <td style="padding: 8px 10px; border: 1px solid #dde8e6; height: 40px;">_______________________________________________________</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Tiempo de evolución</td>
            <td style="padding: 8px 10px; border: 1px solid #dde8e6;">_______________________________________________________</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Tratamientos previos</td>
            <td style="padding: 8px 10px; border: 1px solid #dde8e6;">_______________________________________________________</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #dde8e6; background: #f4f7f6; font-weight: bold;">Observaciones adicionales</td>
            <td style="padding: 8px 10px; border: 1px solid #dde8e6; height: 50px;">_______________________________________________________</td>
          </tr>
        </table>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px;">
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>{{nombre_cliente}}</strong><br>
            C.C. {{cedula_cliente}}<br>Firma del Propietario/Responsable</p>
          </div>
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #333; height: 50px; margin-bottom: 8px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>Personal de Admisión</strong><br>
            Cargo: _______________<br>Firma</p>
          </div>
        </div>
      </div>
    `,
  },
];

module.exports = documents;
