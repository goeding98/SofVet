/**
 * assignSedeToPatients.js
 * Asigna sede_id = 2 (Colseguros) a todos los pacientes en Supabase.
 *
 * Uso:
 *   node backend/scripts/assignSedeToPatients.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL         = 'https://lddksdszpwonsqaavjyd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_KEY no está definida en backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Colseguros = sede_id 2
const SEDE_ID = 2;
const SEDE_NOMBRE = 'Colseguros';

async function main() {
  console.log(`📍 Asignando sede_id=${SEDE_ID} (${SEDE_NOMBRE}) a todos los pacientes...\n`);

  // Update all patients in one query (no need to loop)
  const { data, error, count } = await supabase
    .from('patients')
    .update({ sede_id: SEDE_ID })
    .neq('id', 0)   // matches all rows
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('❌  Error al actualizar:', error.message);
    process.exit(1);
  }

  // Verify by counting updated rows
  const { count: total, error: countError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('sede_id', SEDE_ID);

  if (countError) {
    console.error('⚠️  No se pudo verificar el conteo:', countError.message);
  } else {
    console.log(`✅  ${total} pacientes actualizados con sede ${SEDE_NOMBRE}`);
  }
}

main().catch(err => {
  console.error('💥 Error fatal:', err.message);
  process.exit(1);
});
