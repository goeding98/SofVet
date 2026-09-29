/**
 * Exporta a Excel los clientes de las 3 sedes físicas con dirección registrada,
 * para que se puedan usar directamente (Google My Maps, Power BI, etc.) sin
 * depender del mapa de calor generado en este repo.
 *
 * Uso: node scripts/exportar_datos_mapa_calor.mjs
 */

import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
const D = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://lddksdszpwonsqaavjyd.supabase.co/rest/v1';
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZGtzZHN6cHdvbnNxYWF2anlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzI0NzYsImV4cCI6MjA5MDMwODQ3Nn0.-OL0V9cBOX4liRqHEB3_anAwKX8p9bWoWrMVr8T0pL0';
const H    = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const get  = p => fetch(new URL(p, BASE + '/'), { headers: H }).then(r => r.json());

const SEDE_NOMBRE = { 1: 'Santa Mónica', 2: 'Colseguros', 3: 'Ciudad Jardín' };

console.log('Descargando clientes de las 3 sedes...');
const clients = await get('clients?select=name,document,address,sede_id&sede_id=in.(1,2,3)&limit=10000');

const rows = clients
  .filter(c => c.address?.trim())
  .map(c => ({
    Sede:      SEDE_NOMBRE[c.sede_id] || c.sede_id,
    Nombre:    c.name || '',
    Cedula:    c.document || '',
    Direccion: c.address.trim(),
  }))
  .sort((a, b) => a.Sede.localeCompare(b.Sede) || a.Nombre.localeCompare(b.Nombre));

console.log(`Total filas (con dirección): ${rows.length}`);

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows, { header: ['Sede', 'Nombre', 'Cedula', 'Direccion'] });
ws['!cols'] = [{ wch: 16 }, { wch: 32 }, { wch: 14 }, { wch: 45 }];
XLSX.utils.book_append_sheet(wb, ws, 'Datos mapa de calor');

const OUT = path.join(D, 'Datos mapa de calor.xlsx');
XLSX.writeFile(wb, OUT);
console.log(`✅ Excel generado: ${OUT}`);
