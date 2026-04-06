/**
 * importVetlogy.js
 * Importa datos desde VETLOGY_BACKUP_28_ENERO_2026.xlsx
 * y genera sofvet_import.json listo para cargar en localStorage o BD.
 *
 * Uso: node backend/scripts/importVetlogy.js
 */

const XLSX   = require('xlsx');
const fs     = require('fs');
const path   = require('path');

// ── Rutas ────────────────────────────────────────────────────────────────────
const EXCEL_PATH  = path.join(__dirname, '../data/VETLOGY BACKUP 28 ENERO 2026.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../data/sofvet_import.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte serial de Excel a "YYYY-MM-DD". Acepta también strings con fecha. */
function excelDateToISO(val) {
  if (!val || val === 'NULL') return null;
  if (typeof val === 'number') {
    // Excel serial: días desde 1900-01-00 (con bug de año bisiesto 1900)
    const date = XLSX.SSF.parse_date_code(val);
    if (!date) return null;
    const y = date.y;
    const m = String(date.m).padStart(2, '0');
    const d = String(date.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    // "2022-12-19 17:31:03" → "2022-12-19"
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  return null;
}

/** Convierte fechaHora a "YYYY-MM-DD HH:mm:ss". */
function parseDateTime(val) {
  if (!val || val === 'NULL') return null;
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (!date) return null;
    const y  = date.y;
    const mo = String(date.m).padStart(2, '0');
    const d  = String(date.d).padStart(2, '0');
    const h  = String(date.H || 0).padStart(2, '0');
    const mi = String(date.M || 0).padStart(2, '0');
    const s  = String(date.S || 0).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
  }
  if (typeof val === 'string' && val !== 'NULL') {
    return val.trim();
  }
  return null;
}

/** Limpia strings: quita &nbsp;, espacios dobles, recorta. */
function clean(val) {
  if (val === null || val === undefined || val === 'NULL') return null;
  if (typeof val === 'number') return val;
  return String(val)
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim() || null;
}

/** Convierte peso a número float. */
function toFloat(val) {
  if (val === null || val === undefined || val === 'NULL') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

/** sexo: 0 → "Hembra", 1 → "Macho" */
function parseSexo(val) {
  if (val === 0) return 'Hembra';
  if (val === 1) return 'Macho';
  return null;
}

/** Esterilizado: 0 → "No", 1 → "Sí" */
function parseEsterilizado(val) {
  if (val === 1) return 'Sí';
  if (val === 0) return 'No';
  return 'No';
}

/** estiloDeVida: 1=Doméstico, 2=Mixto, 3=Exterior */
function parseEstiloVida(val) {
  const map = { 1: 'Doméstico', 2: 'Mixto', 3: 'Exterior' };
  return map[val] || null;
}

/** Construye ubicación desde comuna, barrio, municipio */
function parseUbicacion(row) {
  const parts = [
    clean(row.municipio),
    clean(row.barrio),
    clean(row.comuna),
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

// ── Leer Excel ───────────────────────────────────────────────────────────────
console.log('📂 Leyendo archivo Excel...');
if (!fs.existsSync(EXCEL_PATH)) {
  console.error('❌ Archivo no encontrado:', EXCEL_PATH);
  process.exit(1);
}

const workbook = XLSX.readFile(EXCEL_PATH);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawRows   = XLSX.utils.sheet_to_json(worksheet, { defval: null });

console.log(`✅ ${rawRows.length} filas totales leídas`);

// ── Filtrar vivos ────────────────────────────────────────────────────────────
const rows = rawRows.filter(r => r.Vive === 1);
console.log(`🐾 ${rows.length} filas con Vive=1 (${rawRows.length - rows.length} descartadas)`);

// ── Construir CLIENTES ───────────────────────────────────────────────────────
console.log('\n👤 Procesando clientes...');

const clienteMap = new Map(); // cedula → { id, ...data }
let clientId = 1;

for (const row of rows) {
  const cedula = String(row.cedula).trim();
  if (!cedula || cedula === 'null' || cedula === 'NULL') continue;
  if (clienteMap.has(cedula)) continue;

  const ubicacion = parseUbicacion(row);
  const nombre    = clean(row.nombrePropietario);
  if (!nombre) continue;

  clienteMap.set(cedula, {
    id:        clientId++,
    cedula,
    nombre,
    telefono:  String(row.telefono || '').replace('.0', '').trim() || null,
    whatsapp:  String(row.whatsapp  || '').replace('.0', '').trim() || null,
    direccion: clean(row.direccion),
    ubicacion,
    created_at: new Date().toISOString().split('T')[0],
  });
}

const clientes = Array.from(clienteMap.values());
console.log(`   ✅ ${clientes.length} clientes únicos`);

// ── Construir PACIENTES ──────────────────────────────────────────────────────
console.log('\n🐾 Procesando pacientes...');

const pacienteMap = new Map(); // nhc → { id, ...data }
let pacienteId = 1;

for (const row of rows) {
  const nhc = String(row.nhc).trim();
  if (!nhc || nhc === 'null') continue;
  if (pacienteMap.has(nhc)) continue;

  const nombre  = clean(row.nombre);
  const especie = clean(row.Especie);
  if (!nombre || !especie) continue; // campos críticos

  const cedula   = String(row.cedula).trim();
  const cliente  = clienteMap.get(cedula);

  pacienteMap.set(nhc, {
    id:                      pacienteId++,
    cliente_id:              cliente ? cliente.id : null,
    numero_historia_clinica: nhc,
    nombre,
    fecha_nacimiento:        excelDateToISO(row.fechaDeNacimiento),
    especie,
    raza:                    clean(row.raza),
    peso:                    toFloat(row.peso),
    sexo:                    parseSexo(row.sexo),
    esterilizado:            parseEsterilizado(row.Esterilizado),
    color:                   clean(row.Color),
    estilo_vida:             parseEstiloVida(row.estiloDeVida),
    status:                  'activo',
    created_at:              new Date().toISOString().split('T')[0],
  });
}

const pacientes = Array.from(pacienteMap.values());
console.log(`   ✅ ${pacientes.length} pacientes únicos`);
console.log(`   ⚠️  ${rows.filter(r => !clean(r.nombre) || !clean(r.Especie)).length} filas omitidas (sin nombre/especie)`);

// ── Construir CONSULTAS ──────────────────────────────────────────────────────
console.log('\n📋 Procesando consultas...');

const consultas = [];
let consultaId  = 1;
let consultasOmitidas = 0;

// Agrupar filas por nhc para detectar consultas múltiples
const rowsByNhc = new Map();
for (const row of rows) {
  const nhc = String(row.nhc).trim();
  if (!rowsByNhc.has(nhc)) rowsByNhc.set(nhc, []);
  rowsByNhc.get(nhc).push(row);
}

// Procesar consultas: una por fila con fechaHora válida
const seenConsultas = new Set(); // nhc + fechaHora para deduplicar

for (const row of rows) {
  const fechaHora = parseDateTime(row.fechaHora);
  if (!fechaHora) { consultasOmitidas++; continue; }

  const nhc = String(row.nhc).trim();
  const key = `${nhc}_${fechaHora}`;
  if (seenConsultas.has(key)) continue;
  seenConsultas.add(key);

  const paciente = pacienteMap.get(nhc);
  if (!paciente) { consultasOmitidas++; continue; }

  const consulta = {
    id:                   consultaId++,
    paciente_id:          paciente.id,
    nhc,
    fecha:                fechaHora,
    motivo:               clean(row.motivoDeConsulta),
    anamnesis:            clean(row.anamnesis),
    antecedentes:         clean(row.antecedentesEnfermedadAcual),
    estilo_vida:          parseEstiloVida(row.estiloDeVida),
    temperatura:          toFloat(row.temperatura),
    frecuencia_cardiaca:  toFloat(row.frecuenciaCardiaca),
    frecuencia_respiratoria: toFloat(row.frecuenciaRespiratoria),
    pulso:                clean(row.pulso),
    condicion_corporal:   toFloat(row.condicionCorporal),
    color_mucosas:        clean(row.colorMucosas),
    diagnostico_presuntivo: clean(row.diagnosticoPresuntivo),
    diagnostico_final:    clean(row.diagnosticoFinal),
    medicamentos:         clean(row.medAplicados),
    observaciones:        clean(row.observaciones),
    plan_diagnostico:     clean(row.plan_diagnostico),
    lista_problemas:      clean(row.lista_problemas),
    veterinario:          clean(row.colega),
  };

  // Limpiar nulls para ahorrar espacio
  Object.keys(consulta).forEach(k => { if (consulta[k] === null) delete consulta[k]; });
  consultas.push(consulta);
}

console.log(`   ✅ ${consultas.length} consultas procesadas`);
console.log(`   ⚠️  ${consultasOmitidas} filas omitidas (sin fecha/paciente)`);

// ── Construir VACUNAS ────────────────────────────────────────────────────────
console.log('\n💉 Procesando vacunas...');

const vacunas = [];
let vacunaId  = 1;
const seenVacunas = new Set();

for (const row of rows) {
  const nombre = clean(row.vacuna);
  if (!nombre) continue;

  const nhc   = String(row.nhc).trim();
  const fecha = excelDateToISO(row.fecha_vacuna) || parseDateTime(row.fecha_vacuna)?.split(' ')[0];
  if (!fecha) continue;

  const key = `${nhc}_${nombre}_${fecha}`;
  if (seenVacunas.has(key)) continue;
  seenVacunas.add(key);

  const paciente = pacienteMap.get(nhc);
  if (!paciente) continue;

  const proxima = excelDateToISO(row.proximaVacuna) ||
    (typeof row.proximaVacuna === 'string' && row.proximaVacuna !== 'NULL'
      ? row.proximaVacuna.trim().split(' ')[0]
      : null);

  const v = {
    id:           vacunaId++,
    paciente_id:  paciente.id,
    nhc,
    fecha,
    vacuna:       nombre,
    lote:         clean(row.lote_vacuna),
    proxima_vacuna: proxima,
    observaciones: clean(row.observaciones_vacuna),
    veterinario:   String(row.veterinario_vacuna || '').replace('.0', '').trim() || null,
  };

  Object.keys(v).forEach(k => { if (v[k] === null) delete v[k]; });
  vacunas.push(v);
}

console.log(`   ✅ ${vacunas.length} vacunas procesadas`);

// ── Construir DESPARASITACIONES ──────────────────────────────────────────────
console.log('\n🦠 Procesando desparasitaciones...');

const desparasitaciones = [];
let despId = 1;
const seenDesp = new Set();

for (const row of rows) {
  const fecha = excelDateToISO(row.fecha_desparasitacion) ||
    (typeof row.fecha_desparasitacion === 'string' && row.fecha_desparasitacion !== 'NULL'
      ? row.fecha_desparasitacion.trim().split(' ')[0]
      : null);
  if (!fecha) continue;

  const nhc     = String(row.nhc).trim();
  const producto = clean(row.producto_desparasitacion);
  const tipo     = clean(row.tipo_desparasitacion);
  if (!producto && !tipo) continue;

  const key = `${nhc}_${fecha}_${producto}`;
  if (seenDesp.has(key)) continue;
  seenDesp.add(key);

  const paciente = pacienteMap.get(nhc);
  if (!paciente) continue;

  const proxima = excelDateToISO(row.proximaDesparasitacion) ||
    (typeof row.proximaDesparasitacion === 'string' && row.proximaDesparasitacion !== 'NULL'
      ? row.proximaDesparasitacion.trim().split(' ')[0]
      : null);

  const d = {
    id:          despId++,
    paciente_id: paciente.id,
    nhc,
    fecha,
    tipo,
    producto,
    proxima_desparasitacion: proxima,
    veterinario: clean(row.veterinario_desparasitacion),
  };

  Object.keys(d).forEach(k => { if (d[k] === null) delete d[k]; });
  desparasitaciones.push(d);
}

console.log(`   ✅ ${desparasitaciones.length} desparasitaciones procesadas`);

// ── Resumen final ────────────────────────────────────────────────────────────
const output = {
  _meta: {
    generado:     new Date().toISOString(),
    fuente:       'VETLOGY BACKUP 28 ENERO 2026.xlsx',
    filas_origen: rawRows.length,
    filas_vivas:  rows.length,
  },
  clientes,
  pacientes,
  consultas,
  vacunas,
  desparasitaciones,
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

const sizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2);

console.log('\n══════════════════════════════════════════');
console.log('✅ IMPORTACIÓN COMPLETADA');
console.log('══════════════════════════════════════════');
console.log(`  👤 Clientes:           ${clientes.length.toLocaleString()}`);
console.log(`  🐾 Pacientes:          ${pacientes.length.toLocaleString()}`);
console.log(`  📋 Consultas:          ${consultas.length.toLocaleString()}`);
console.log(`  💉 Vacunas:            ${vacunas.length.toLocaleString()}`);
console.log(`  🦠 Desparasitaciones:  ${desparasitaciones.length.toLocaleString()}`);
console.log(`  📁 Archivo: ${OUTPUT_PATH}`);
console.log(`  📦 Tamaño: ${sizeMB} MB`);
console.log('══════════════════════════════════════════\n');
