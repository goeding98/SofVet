/**
 * Excel de los clientes atendidos en Santa Mónica, con su dirección y con el
 * estado de geolocalización de cada uno.
 *
 * La columna "Ubicación" es la parte útil para limpiar datos: dice si la
 * dirección resolvió a nivel de casa, solo de calle, solo de barrio, o si no
 * se pudo ubicar. Los clientes que no salen en el mapa de calor son justamente
 * los marcados "SIN DIRECCIÓN" y "NO SE PUDO UBICAR".
 *
 * Uso: node scripts/clientes_santamonica_excel.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
const D = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://lddksdszpwonsqaavjyd.supabase.co/rest/v1';
const KEY  = 'sb_publishable__jLFrmIPagVkl7OM_-v6LA_GZQog5SZ';
const H    = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const SEDE = 1;                        // Santa Mónica
const OUT  = path.join(D, 'Clientes_SantaMonica.xlsx');

async function getAll(p) {
  const PAGE = 1000;
  let all = [], from = 0;
  while (true) {
    const r = await fetch(BASE + '/' + p, { headers: { ...H, Range: `${from}-${from + PAGE - 1}` } });
    const d = await r.json();
    if (!Array.isArray(d)) throw new Error(p + ' -> ' + JSON.stringify(d).slice(0, 200));
    if (!d.length) break;
    all = all.concat(d);
    if (d.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Mismas ventanas que el mapa, para que los números cuadren entre los dos.
const HOY    = new Date('2026-09-28T23:59:59');
const INICIO = new Date('2026-03-01T00:00:00');
const desdeN = n => { const d = new Date(HOY); d.setMonth(d.getMonth() - n); return d; };
const C6 = desdeN(6), C3 = desdeN(3);

console.log('Descargando...');
const [clients, patients] = await Promise.all([
  getAll('clients?select=id,name,cedula,document,phone,email,address,origen,created_at'),
  getAll('patients?select=id,client_id,name'),
]);
const p2c   = new Map(patients.map(p => [p.id, p.client_id]));
const cById = new Map(clients.map(c => [c.id, c]));

const mascotas = new Map();
for (const p of patients) {
  if (!p.client_id) continue;
  if (!mascotas.has(p.client_id)) mascotas.set(p.client_id, []);
  mascotas.get(p.client_id).push(p.name);
}

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const homonimos = new Map();
for (const c of clients) {
  const k = norm(c.name);
  if (!k) continue;
  if (!homonimos.has(k)) homonimos.set(k, []);
  homonimos.get(k).push(c);
}
const tieneDir = c => (c.address || '').trim().length > 5;
const porNombre = new Map();
for (const [k, g] of homonimos) {
  if (g.length === 1) { porNombre.set(k, g[0].id); continue; }
  const dirs = new Set(g.filter(tieneDir).map(c => c.address.toLowerCase().trim()));
  if (dirs.size === 1) porNombre.set(k, g.find(tieneDir).id);
}

const FUENTES = [
  { q: 'consultations?select=patient_id,date,sede_id',                         f: 'date',         res: r => p2c.get(r.patient_id), tipo: 'Consulta' },
  { q: 'hospitalization?select=client_id,patient_id,ingreso_date,sede_id',     f: 'ingreso_date', res: r => r.client_id || p2c.get(r.patient_id), tipo: 'Hospitalización' },
  { q: 'procedimientos?select=patient_id,fecha,sede_id',                       f: 'fecha',        res: r => p2c.get(r.patient_id), tipo: 'Procedimiento' },
  { q: 'grooming?select=client_id,patient_id,owner,date,sede_id,status',       f: 'date',         res: r => r.client_id || p2c.get(r.patient_id) || porNombre.get(norm(r.owner)), tipo: 'Peluquería', st: true },
  { q: 'appointments?select=client_id,patient_id,owner,date,sede_id,status',   f: 'date',         res: r => r.client_id || p2c.get(r.patient_id) || porNombre.get(norm(r.owner)), tipo: 'Cita', st: true },
];

// Una visita es un cliente en un día: la consulta y la cita del mismo día son
// la misma ida a la clínica.
const reg = new Map();
const vistos = new Set();
let sinCliente = 0;
for (const F of FUENTES) {
  const rows = await getAll(`${F.q}&${F.f}=gte.2026-03-01&sede_id=eq.${SEDE}`);
  for (const r of rows) {
    if (F.st && /cancel/i.test(r.status || '')) continue;
    const dia = String(r[F.f]).slice(0, 10);
    const d = new Date(dia);
    if (isNaN(d) || d > HOY || d < INICIO) continue;
    const cid = F.res(r);
    if (!cid) { sinCliente++; continue; }
    let o = reg.get(cid);
    if (!o) { o = { v12: 0, v6: 0, v3: 0, ultima: null, tipos: new Set() }; reg.set(cid, o); }
    o.tipos.add(F.tipo);
    if (!o.ultima || dia > o.ultima) o.ultima = dia;
    const k = cid + '|' + dia;
    if (vistos.has(k)) continue;
    vistos.add(k);
    o.v12++;
    if (d >= C6) o.v6++;
    if (d >= C3) o.v3++;
  }
}
console.log(`${reg.size} clientes atendidos en Santa Mónica desde 2026-03-01 (${sinCliente} registros sin cliente identificable)`);

// Estado de geolocalización, leído del mapa ya generado para que los dos
// documentos cuenten exactamente lo mismo.
const NIVEL = ['Casa exacta', 'Solo calle', 'Solo barrio'];
const ubic = new Map();
try {
  const html = fs.readFileSync(path.join(D, 'mapa_origen_clientes.html'), 'utf8');
  const PTS = JSON.parse(html.match(/const PTS   = (\[.*?\]);\nconst SEDES/s)[1]);
  for (const p of PTS) ubic.set(p[2], { lat: p[0], lng: p[1], nivel: p[4] });
} catch { console.log('Aviso: no se encontró mapa_origen_clientes.html, la columna Ubicación saldrá vacía.'); }

const filas = [...reg.entries()].map(([cid, o]) => {
  const c = cById.get(cid) || {};
  const dir = (c.address || '').trim();
  const u = ubic.get(c.name);
  const estado = !dir || dir.length <= 5 ? 'SIN DIRECCIÓN'
    : u ? NIVEL[u.nivel] : 'NO SE PUDO UBICAR';
  return {
    'Cliente': c.name || '',
    'Cédula': c.cedula || c.document || '',
    'Teléfono': c.phone || '',
    'Email': c.email || '',
    'Dirección': dir,
    'Ubicación': estado,
    'Latitud': u ? u.lat : '',
    'Longitud': u ? u.lng : '',
    'Mascotas': (mascotas.get(cid) || []).join(', '),
    'Visitas (3 meses)': o.v3,
    'Visitas (6 meses)': o.v6,
    'Visitas (desde marzo)': o.v12,
    'Última visita': o.ultima || '',
    'Tipos de atención': [...o.tipos].join(', '),
    'Cómo nos conoció': c.origen || '',
    'Cliente desde': (c.created_at || '').slice(0, 10),
  };
}).sort((a, b) => b['Visitas (desde marzo)'] - a['Visitas (desde marzo)'] ||
                  a.Cliente.localeCompare(b.Cliente, 'es'));

const resumen = [
  ['Clientes atendidos en Santa Mónica desde 2026-03-01', filas.length],
  ['Visitas totales', filas.reduce((s, f) => s + f['Visitas (desde marzo)'], 0)],
  ['Visitas últimos 3 meses', filas.reduce((s, f) => s + f['Visitas (3 meses)'], 0)],
  [],
  ['ESTADO DE LA DIRECCIÓN', 'Clientes', '% '],
  ...['Casa exacta', 'Solo calle', 'Solo barrio', 'NO SE PUDO UBICAR', 'SIN DIRECCIÓN'].map(e => {
    const n = filas.filter(f => f.Ubicación === e).length;
    return [e, n, (100 * n / filas.length).toFixed(1) + '%'];
  }),
  [],
  ['Registros de atención sin cliente identificable', sinCliente],
  ['(nombre del dueño vacío o que no existe en la tabla de clientes)'],
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(filas);
ws['!cols'] = [
  { wch: 32 }, { wch: 13 }, { wch: 14 }, { wch: 28 }, { wch: 46 }, { wch: 18 },
  { wch: 11 }, { wch: 11 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 20 },
  { wch: 13 }, { wch: 34 }, { wch: 20 }, { wch: 13 },
];
ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filas.length, c: 15 } }) };
ws['!freeze'] = { xSplit: 1, ySplit: 1 };
XLSX.utils.book_append_sheet(wb, ws, 'Clientes Santa Mónica');

const wsR = XLSX.utils.aoa_to_sheet(resumen);
wsR['!cols'] = [{ wch: 52 }, { wch: 12 }, { wch: 8 }];
XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

XLSX.writeFile(wb, OUT);
console.log(`\nListo: ${OUT}`);
for (const [e, n, p] of resumen.slice(5, 10)) console.log(`   ${String(e).padEnd(20)} ${String(n).padStart(4)}  ${p}`);
