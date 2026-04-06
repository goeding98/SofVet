/**
 * fixClientDocuments.js
 * Backfills the `document` (cédula) column for all existing clients in Supabase
 * by reading sofvet_payload.json (already generated).
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=<key> node backend/scripts/fixClientDocuments.js
 * Or if backend/.env has SUPABASE_SERVICE_KEY:
 *   node backend/scripts/fixClientDocuments.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL         = 'https://lddksdszpwonsqaavjyd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_KEY no está definida en backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const PAYLOAD_PATH = path.join(__dirname, '../data/sofvet_payload.json');

async function main() {
  if (!fs.existsSync(PAYLOAD_PATH)) {
    console.error('❌  No se encontró sofvet_payload.json. Ejecuta primero generateStoragePayload.js');
    process.exit(1);
  }

  console.log('📂 Leyendo sofvet_payload.json...');
  const payload = JSON.parse(fs.readFileSync(PAYLOAD_PATH, 'utf-8'));
  const clients = payload.sofvet_clients || [];

  const withDoc = clients.filter(c => c.document && c.document.trim() !== '' && c.document !== 'null');
  console.log(`   ${clients.length} clientes en payload, ${withDoc.length} tienen cédula.`);

  if (withDoc.length === 0) {
    console.log('⚠️  No hay cédulas que actualizar.');
    return;
  }

  let updated = 0;
  let errors  = 0;

  for (const c of withDoc) {
    const { error } = await supabase
      .from('clients')
      .update({ document: c.document })
      .eq('id', c.id);

    if (error) {
      console.error(`  ❌ id=${c.id} (${c.name}): ${error.message}`);
      errors++;
    } else {
      updated++;
      if (updated % 100 === 0) process.stdout.write(`  ⏳ ${updated}/${withDoc.length}\r`);
    }
  }

  console.log(`\n✅ Cédulas actualizadas: ${updated}`);
  if (errors > 0) console.log(`⚠️  Errores: ${errors}`);
}

main().catch(err => {
  console.error('\n💥 Error:', err.message);
  process.exit(1);
});
