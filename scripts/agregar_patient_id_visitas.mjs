import { createClient } from '@supabase/supabase-js';

const SERVICE = createClient(
  'https://lddksdszpwonsqaavjyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZGtzZHN6cHdvbnNxYWF2anlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczMjQ3NiwiZXhwIjoyMDkwMzA4NDc2fQ.-oQulewunczumyACrAMEI18BeTpSJkfBhOdR2Bsb1Uo'
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
