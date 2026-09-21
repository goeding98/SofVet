import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../backend/.env') });

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY no está definida en backend/.env');
  process.exit(1);
}

const SERVICE = createClient(
  'https://lddksdszpwonsqaavjyd.supabase.co',
  SUPABASE_SERVICE_KEY
);

const { error } = await SERVICE.rpc('exec_sql', {
  sql: `
    ALTER TABLE visitas_hospitalizacion
      ADD COLUMN IF NOT EXISTS patient_id bigint,
      ADD COLUMN IF NOT EXISTS client_id  bigint;
    NOTIFY pgrst, 'reload schema';
  `
});

if (error) {
  console.log('❌ No se pudo usar rpc — probando vía SQL directo...');
  const { data, error: e2 } = await SERVICE.from('visitas_hospitalizacion').select('*').limit(1);
  if (!e2 && data?.[0]) {
    const cols = Object.keys(data[0]);
    console.log('Columnas actuales en visitas_hospitalizacion:', cols.join(', '));
    const faltantes = ['patient_id', 'client_id'].filter(c => !cols.includes(c));
    if (faltantes.length) {
      console.log('\n⚠️  Columnas faltantes:', faltantes.join(', '));
      console.log('\nEjecuta este SQL en el editor de Supabase:');
      console.log(`
ALTER TABLE visitas_hospitalizacion
  ADD COLUMN IF NOT EXISTS patient_id bigint,
  ADD COLUMN IF NOT EXISTS client_id  bigint;

NOTIFY pgrst, 'reload schema';
      `);
    } else {
      console.log('✅ Todas las columnas ya existen');
    }
  }
} else {
  console.log('✅ Columnas patient_id y client_id agregadas correctamente a visitas_hospitalizacion');
}
