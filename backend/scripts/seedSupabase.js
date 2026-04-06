/**
 * seedSupabase.js
 * Inserts sofvet_payload.json into Supabase.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=<your-service-role-key> node seedSupabase.js
 *
 * Or set SUPABASE_SERVICE_KEY in backend/.env and run:
 *   node seedSupabase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL     = 'https://lddksdszpwonsqaavjyd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_KEY no está definida.');
  console.error('   Agrega SUPABASE_SERVICE_KEY=<tu-service-role-key> a backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const PAYLOAD_PATH = path.join(__dirname, '../data/sofvet_payload.json');
const BATCH_SIZE   = 500;

async function batchInsert(table, rows) {
  if (!rows || rows.length === 0) return;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`  ❌ Error en ${table} (batch ${i / BATCH_SIZE + 1}):`, error.message);
      throw error;
    }
    inserted += batch.length;
    process.stdout.write(`  ⏳ ${table}: ${inserted}/${rows.length}\r`);
  }
  console.log(`  ✅ ${table}: ${rows.length} registros insertados.      `);
}

async function resetSequences() {
  const tables = ['clients', 'patients', 'consultations', 'vaccines'];
  for (const t of tables) {
    const { error } = await supabase.rpc('reset_sequence', { table_name: t });
    if (error) {
      // RPC might not exist yet — print manual SQL instead
      console.warn(`  ⚠️  No se pudo resetear secuencia de ${t}. Ejecuta manualmente en Supabase SQL Editor:`);
      console.warn(`     SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT MAX(id) FROM ${t}));`);
    }
  }
}

async function clearTables() {
  // Delete in reverse FK order
  for (const t of ['vaccines', 'consultations', 'patients', 'clients']) {
    const { error } = await supabase.from(t).delete().neq('id', 0); // delete all
    if (error) console.warn(`  ⚠️  No se pudo limpiar ${t}:`, error.message);
    else console.log(`  🗑️  ${t} vaciada.`);
  }
}

async function main() {
  console.log('📦 Leyendo sofvet_payload.json...');
  const raw     = fs.readFileSync(PAYLOAD_PATH, 'utf8');
  const payload = JSON.parse(raw);

  const clients       = payload.sofvet_clients      || [];
  const patients      = payload.sofvet_patients     || [];
  const consultations = payload.sofvet_consultations || [];
  const vaccines      = payload.sofvet_vaccines     || [];

  console.log(`\n📊 Estadísticas del payload:`);
  console.log(`   Clientes:     ${clients.length}`);
  console.log(`   Pacientes:    ${patients.length}`);
  console.log(`   Consultas:    ${consultations.length}`);
  console.log(`   Vacunas:      ${vaccines.length}`);
  console.log('');

  // Confirm before proceeding
  console.log('⚠️  ATENCIÓN: Esto limpiará y reemplazará los datos existentes en Supabase.');
  console.log('   Presiona Ctrl+C para cancelar, o espera 5 segundos para continuar...\n');
  await new Promise(r => setTimeout(r, 5000));

  console.log('🗑️  Limpiando tablas existentes...');
  await clearTables();

  console.log('\n⬆️  Insertando datos...');

  // Clients — map cedula/document field
  const clientRows = clients.map(c => ({
    id:         c.id,
    name:       c.name,
    document:   c.document || c.cedula || null,
    phone:      c.phone  || null,
    email:      c.email  || null,
    address:    c.address || null,
    notes:      c.notes  || null,
    created_at: c.created_at || null,
  }));
  await batchInsert('clients', clientRows);

  // Patients
  const patientRows = patients.map(p => ({
    id:          p.id,
    name:        p.name,
    species:     p.species     || null,
    breed:       p.breed       || null,
    age:         p.age         || null,
    weight:      p.weight      || null,
    sex:         p.sex         || null,
    esterilizado:p.esterilizado || null,
    caracter:    p.caracter    || null,
    status:      p.status      || 'activo',
    client_id:   p.client_id   || null,
    owner:       p.owner       || null,
    owner_phone: p.owner_phone || null,
    owner_email: p.owner_email || null,
    created_at:  p.created_at  || null,
  }));
  await batchInsert('patients', patientRows);

  // Consultations
  const consultRows = consultations.map(c => ({
    id:                     c.id,
    patient_id:             c.patient_id,
    patient_name:           c.patient_name           || null,
    date:                   c.date                   || null,
    time:                   c.time                   || null,
    sede_id:                c.sede_id                || null,
    antecedentes:           c.antecedentes           || null,
    hallazgos:              c.hallazgos              || null,
    diagnostico_diferencial:c.diagnostico_diferencial|| null,
    diagnostico_final:      c.diagnostico_final      || null,
    plan_diagnostico:       c.plan_diagnostico       || null,
    observaciones:          c.observaciones          || null,
    medicamentos:           c.medicamentos           || [],
    created_at:             c.created_at             || null,
  }));
  await batchInsert('consultations', consultRows);

  // Vaccines
  const vaccineRows = vaccines.map(v => ({
    id:           v.id,
    patient_id:   v.patient_id,
    patient_name: v.patient_name || null,
    date:         v.date         || null,
    sede_id:      v.sede_id      || null,
    vaccine:      v.vaccine      || v.nombre || null,
    lot:          v.lot          || v.lote   || null,
    next_date:    v.next_date    || v.proxima_fecha || null,
    vet:          v.vet          || null,
    notes:        v.notes        || v.observaciones || null,
    created_at:   v.created_at   || null,
  }));
  await batchInsert('vaccines', vaccineRows);

  console.log('\n🔁 Reseteando secuencias de IDs...');
  await resetSequences();

  console.log('\n🎉 ¡Seed completado exitosamente!');
  console.log('   Si alguna secuencia no se reseteó automáticamente, ejecuta en Supabase SQL Editor:');
  console.log("   SELECT setval(pg_get_serial_sequence('clients', 'id'),       (SELECT MAX(id) FROM clients));");
  console.log("   SELECT setval(pg_get_serial_sequence('patients', 'id'),      (SELECT MAX(id) FROM patients));");
  console.log("   SELECT setval(pg_get_serial_sequence('consultations', 'id'), (SELECT MAX(id) FROM consultations));");
  console.log("   SELECT setval(pg_get_serial_sequence('vaccines', 'id'),      (SELECT MAX(id) FROM vaccines));");
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err.message);
  process.exit(1);
});
