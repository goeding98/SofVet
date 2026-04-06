/**
 * generateStoragePayload.js
 * Transforma sofvet_import.json al formato exacto que usa el frontend (localStorage).
 * Ejecutar DESPUÉS de importVetlogy.js
 *
 * Uso: node backend/scripts/generateStoragePayload.js
 */

const fs   = require('fs');
const path = require('path');

const INPUT_PATH  = path.join(__dirname, '../data/sofvet_import.json');
const OUTPUT_PATH = path.join(__dirname, '../data/sofvet_payload.json');

if (!fs.existsSync(INPUT_PATH)) {
  console.error('❌ Primero ejecuta: node backend/scripts/importVetlogy.js');
  process.exit(1);
}

console.log('📂 Leyendo sofvet_import.json...');
const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));

// ── Helpers ──────────────────────────────────────────────────────────────────

const ESPECIE_MAP = { Canino: 'Perro', Felino: 'Gato', otro: 'Otro' };

function calcAge(fechaNac) {
  if (!fechaNac) return 1;
  try {
    const birth = new Date(fechaNac);
    const now   = new Date('2026-01-28'); // fecha del backup
    const years = now.getFullYear() - birth.getFullYear();
    const m     = now.getMonth() - birth.getMonth();
    const adj   = m < 0 || (m === 0 && now.getDate() < birth.getDate()) ? 1 : 0;
    const age   = years - adj;
    return age > 0 ? age : 1;
  } catch { return 1; }
}

function vaccineStatus(nextDate) {
  if (!nextDate) return 'vigente';
  try {
    const next = new Date(nextDate);
    const now  = new Date();
    const diff = (next - now) / (1000 * 60 * 60 * 24);
    if (diff < 0)  return 'vencido';
    if (diff < 30) return 'próximo';
    return 'vigente';
  } catch { return 'vigente'; }
}


// ── Filtrar pacientes con actividad en 2024/2025/2026 ────────────────────────
console.log('🔍 Filtrando pacientes con actividad en 2024-2026...');

const AÑOS_ACTIVOS = ['2024', '2025', '2026'];

function esReciente(fecha) {
  if (!fecha) return false;
  return AÑOS_ACTIVOS.some(y => String(fecha).startsWith(y));
}

// Pacientes con al menos una consulta reciente
const nhcsConConsultaReciente = new Set(
  data.consultas
    .filter(c => esReciente(c.fecha))
    .map(c => String(c.paciente_id))
);

// Pacientes con al menos una vacuna reciente
const nhcsConVacunaReciente = new Set(
  data.vacunas
    .filter(v => esReciente(v.fecha))
    .map(v => String(v.paciente_id))
);

// Union: pacientes activos
const pacientesActivosIds = new Set([
  ...nhcsConConsultaReciente,
  ...nhcsConVacunaReciente,
]);

console.log(`   ✅ ${pacientesActivosIds.size} pacientes con actividad reciente (de ${data.pacientes.length} totales)`);

// Filtrar pacientes
const pacientesRaw = data.pacientes.filter(p => pacientesActivosIds.has(String(p.id)));

// Solo los clientes que tienen al menos un paciente activo
const clientesActivosIds = new Set(pacientesRaw.map(p => p.cliente_id).filter(Boolean));
const clientesRaw = data.clientes.filter(c => clientesActivosIds.has(c.id));
console.log(`   ✅ ${clientesRaw.length} clientes con pacientes activos (de ${data.clientes.length} totales)`);

// Reasignar IDs secuenciales para evitar huecos enormes
const clienteIdMap = {};
clientesRaw.forEach((c, i) => { clienteIdMap[c.id] = i + 1; });

const pacienteIdMap = {};
pacientesRaw.forEach((p, i) => { pacienteIdMap[p.id] = i + 1; });

// ── Transformar clientes (solo activos) ──────────────────────────────────────
console.log('👤 Transformando clientes...');
const clientes = clientesRaw.map(c => ({
  id:         clienteIdMap[c.id],
  name:       c.nombre,
  document:   c.cedula,
  phone:      String(c.telefono || '').replace(/\.0$/, ''),
  email:      '',
  address:    [c.direccion, c.ubicacion].filter(Boolean).join(' · ') || '',
  notes:      c.whatsapp ? `WhatsApp: ${String(c.whatsapp).replace(/\.0$/, '')}` : '',
  created_at: c.created_at,
}));

const clienteById = {};
clientes.forEach(c => { clienteById[c.id] = c; });

// ── Transformar pacientes ────────────────────────────────────────────────────
console.log('🐾 Transformando pacientes...');
const pacientes = pacientesRaw.map(p => {
  const newClienteId = clienteIdMap[p.cliente_id] || null;
  const cliente = newClienteId ? clienteById[newClienteId] : {};
  return {
    id:          pacienteIdMap[p.id],
    name:        p.nombre,
    species:     ESPECIE_MAP[p.especie] || p.especie || 'Otro',
    breed:       p.raza || '',
    age:         calcAge(p.fecha_nacimiento),
    weight:      p.peso || 0,
    sex:         p.sexo || 'Macho',
    esterilizado: p.esterilizado || 'No',
    caracter:    'Dócil',
    color:       p.color || '',
    fecha_nacimiento: p.fecha_nacimiento || '',
    numero_historia_clinica: p.numero_historia_clinica,
    client_id:   newClienteId,
    owner:       cliente?.name || '',
    owner_phone: cliente?.phone || '',
    owner_email: cliente?.email || '',
    status:      'activo',
    created_at:  p.created_at,
  };
});

// Mapa pacienteId → paciente (para vacunas/consultas)
const pacienteById = {};
pacientes.forEach(p => { pacienteById[p.id] = p; });

// ── Transformar consultas (solo pacientes activos) ───────────────────────────
console.log('📋 Transformando consultas...');
const consultas = data.consultas
  .filter(c => pacienteIdMap[c.paciente_id])
  .map(c => {
  const newPacienteId = pacienteIdMap[c.paciente_id];
  const paciente = pacienteById[newPacienteId] || {};
  const [date, time] = (c.fecha || '').split(' ');

  // Medicamentos: guardar como array de objetos para compatibilidad con ConsultationModal
  const meds = c.medicamentos
    ? [{ nombre: c.medicamentos, dosis: '', frecuencia: '' }]
    : [];

  return {
    id:              c.id,
    patient_id:      newPacienteId,
    patient_name:    paciente.name || '',
    date:            date || '',
    time:            time ? time.slice(0, 5) : '',
    motivo:          c.motivo || '',
    antecedentes:    c.antecedentes || '',
    anamnesis:       c.anamnesis || '',
    hallazgos:       [
      c.temperatura  ? `Temp: ${c.temperatura}°C` : '',
      c.frecuencia_cardiaca ? `FC: ${c.frecuencia_cardiaca}` : '',
      c.frecuencia_respiratoria ? `FR: ${c.frecuencia_respiratoria}` : '',
      c.pulso        ? `Pulso: ${c.pulso}` : '',
      c.color_mucosas ? `Mucosas: ${c.color_mucosas}` : '',
      c.condicion_corporal ? `CC: ${c.condicion_corporal}` : '',
    ].filter(Boolean).join(' · ') || '',
    diagnostico_presuntivo: c.diagnostico_presuntivo || '',
    diagnostico_final:      c.diagnostico_final || '',
    plan_diagnostico:       c.plan_diagnostico || '',
    lista_problemas:        c.lista_problemas || '',
    medicamentos:           meds,
    observaciones:          c.observaciones || '',
    veterinario:            c.veterinario || '',
    // Vitales por separado (para posible uso futuro)
    temperatura:            c.temperatura || null,
    frecuencia_cardiaca:    c.frecuencia_cardiaca || null,
    frecuencia_respiratoria: c.frecuencia_respiratoria || null,
    created_at:             date || '',
  };
});

// ── Transformar vacunas (solo pacientes activos) ─────────────────────────────
console.log('💉 Transformando vacunas...');
const vacunas = data.vacunas
  .filter(v => pacienteIdMap[v.paciente_id])
  .map(v => {
  const newPacienteId = pacienteIdMap[v.paciente_id];
  const paciente = pacienteById[newPacienteId] || {};
  return {
    id:           v.id,
    patient_id:   newPacienteId,
    patient_name: paciente.name || '',
    vaccine_name: v.vacuna || '',
    dose:         '1ra dosis',
    date_applied: v.fecha || '',
    next_dose:    v.proxima_vacuna || '',
    vet:          v.veterinario || '',
    batch:        v.lote || '',
    status:       vaccineStatus(v.proxima_vacuna),
  };
});

// ── Transformar desparasitaciones (solo pacientes activos) ───────────────────
console.log('🦠 Transformando desparasitaciones...');
const desparasitaciones = (data.desparasitaciones || [])
  .filter(d => pacienteIdMap[d.paciente_id])
  .map(d => {
  const newPacienteId = pacienteIdMap[d.paciente_id];
  const paciente = pacienteById[newPacienteId] || {};
  return {
    id:           d.id,
    patient_id:   newPacienteId,
    patient_name: paciente.name || '',
    tipo:         d.tipo || '',
    producto:     d.producto || '',
    fecha:        d.fecha || '',
    proxima:      d.proxima_desparasitacion || '',
    veterinario:  d.veterinario || '',
  };
});

// ── Calcular nextId para cada colección ──────────────────────────────────────
const nextIds = {
  clients:         clientes.length   + 1,
  patients:        pacientes.length  + 1,
  consultations:   consultas.length  + 1,
  vaccines:        vacunas.length    + 1,
};

// ── Output ───────────────────────────────────────────────────────────────────
const payload = {
  _meta: {
    generado:    new Date().toISOString(),
    clientes:    clientes.length,
    pacientes:   pacientes.length,
    consultas:   consultas.length,
    vacunas:     vacunas.length,
    desparasitaciones: desparasitaciones.length,
  },
  // Clave localStorage → datos
  sofvet_clients:         clientes,
  sofvet_patients:        pacientes,
  sofvet_consultations:   consultas,
  sofvet_vaccines:        vacunas,
  // nextIds para que useStore no colisione
  sofvet_clients_nid:         nextIds.clients,
  sofvet_patients_nid:        nextIds.patients,
  sofvet_consultations_nid:   nextIds.consultations,
  sofvet_vaccines_nid:        nextIds.vaccines,
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload), 'utf-8');

const sizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2);

console.log('\n══════════════════════════════════════════');
console.log('✅ PAYLOAD GENERADO');
console.log('══════════════════════════════════════════');
console.log(`  👤 Clientes:          ${clientes.length.toLocaleString()}`);
console.log(`  🐾 Pacientes:         ${pacientes.length.toLocaleString()}`);
console.log(`  📋 Consultas:         ${consultas.length.toLocaleString()}`);
console.log(`  💉 Vacunas:           ${vacunas.length.toLocaleString()}`);
console.log(`  🦠 Desparasitaciones: ${desparasitaciones.length.toLocaleString()}`);
console.log(`  📁 ${OUTPUT_PATH}`);
console.log(`  📦 Tamaño: ${sizeMB} MB`);
console.log('══════════════════════════════════════════\n');
console.log('Siguiente paso: node backend/server.js → ve a /import en el navegador');
