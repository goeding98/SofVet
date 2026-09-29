/**
 * Mapa de calor de clientes — Pets & Pets Cali
 * Genera mapa_clientes.html con distribución por Colseguros y Ciudad Jardín
 *
 * Uso: node scripts/mapa_calor_clientes.mjs
 * Requiere Node 18+ (fetch nativo)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://lddksdszpwonsqaavjyd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZGtzZHN6cHdvbnNxYWF2anlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzI0NzYsImV4cCI6MjA5MDMwODQ3Nn0.-OL0V9cBOX4liRqHEB3_anAwKX8p9bWoWrMVr8T0pL0';
const CACHE_FILE  = path.join(__dirname, 'geocode_cache.json');
const OUT_FILE    = path.join(__dirname, 'mapa_clientes.html');

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function sbFetch(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}&limit=10000`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Supabase error on ${table}: ${await res.text()}`);
  return res.json();
}

// ── Geocoding (Nominatim, 1 req/sec) ─────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function geocode(address, cache) {
  const key = address.toLowerCase().trim();
  if (cache[key]) return cache[key];

  const q   = encodeURIComponent(`${address}, Cali, Valle del Cauca, Colombia`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=co`;

  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'SofVet-PetsPets/1.0 gerencia@dogspital.com' } });
    const data = await res.json();
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      cache[key] = result;
      saveCache(cache);
      return result;
    }
  } catch (e) {
    console.error('  geocode error:', e.message);
  }
  cache[key] = null; // cache the failure too
  saveCache(cache);
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📡 Descargando datos de Supabase...');

  const [clients, patients, consultations] = await Promise.all([
    sbFetch('clients',       'select=id,name,address,document,phone'),
    sbFetch('patients',      'select=id,client_id'),
    sbFetch('consultations', 'select=patient_id,sede_id&sede_id=in.(2,3)'),
  ]);

  console.log(`   ${clients.length} clientes | ${patients.length} pacientes | ${consultations.length} consultas (Colseguros + CJ)`);

  // patient_id → client_id
  const patientToClient = {};
  for (const p of patients) patientToClient[p.id] = p.client_id;

  // client_id → Set<sede_id>
  const clientSedes = {};
  for (const c of consultations) {
    const cid = patientToClient[c.patient_id];
    if (!cid) continue;
    if (!clientSedes[cid]) clientSedes[cid] = new Set();
    clientSedes[cid].add(c.sede_id);
  }

  // Filtrar clientes con dirección y con al menos una consulta en sede 2 o 3
  const relevant = clients.filter(c => c.address?.trim() && clientSedes[c.id]);
  console.log(`   ${relevant.length} clientes con dirección y consultas en Colseguros/CJ\n`);

  // Geocodificar
  const cache    = loadCache();
  const geocoded = [];
  let   i        = 0;

  for (const client of relevant) {
    i++;
    const cached = cache[client.address.toLowerCase().trim()];
    const status = cached !== undefined ? (cached ? '✓ cache' : '✗ no match') : '⏳ API';
    process.stdout.write(`\r[${i}/${relevant.length}] ${status.padEnd(10)} ${client.name.slice(0, 40).padEnd(40)}`);

    const coords = await geocode(client.address, cache);
    if (coords) {
      geocoded.push({
        name:    client.name,
        address: client.address,
        phone:   client.phone || '',
        sedes:   [...clientSedes[client.id]],
        lat:     coords.lat,
        lng:     coords.lng,
      });
    }

    // Solo delay si fue a la API
    if (cached === undefined) await sleep(1200);
  }

  console.log(`\n\n✅ ${geocoded.length} clientes geocodificados exitosamente.`);

  const colseguros   = geocoded.filter(c => c.sedes.includes(2));
  const ciudadJardin = geocoded.filter(c => c.sedes.includes(3));
  const ambos        = geocoded.filter(c => c.sedes.includes(2) && c.sedes.includes(3));

  console.log(`   🔵 Colseguros:    ${colseguros.length}`);
  console.log(`   🟡 Ciudad Jardín: ${ciudadJardin.length}`);
  console.log(`   🟣 Ambas sedes:   ${ambos.length}`);

  const html = generateHTML(colseguros, ciudadJardin, ambos);
  fs.writeFileSync(OUT_FILE, html, 'utf8');
  console.log(`\n📁 Mapa guardado en: ${OUT_FILE}`);
  console.log('   Ábrelo en tu navegador para verlo.');
}

// ── HTML generator ─────────────────────────────────────────────────────────────

function generateHTML(colseguros, ciudadJardin, ambos) {
  const toJson = arr => JSON.stringify(arr.map(c => ({
    lat: c.lat, lng: c.lng, name: c.name, address: c.address, phone: c.phone
  })));

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Mapa de Clientes — Pets & Pets Cali</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"><\/script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#0f1117; color:#eee; height:100vh; display:flex; flex-direction:column; }
  #header { padding:0.75rem 1.5rem; background:#16213e; border-bottom:2px solid #2a3a6e; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
  #header h1 { font-size:1.1rem; color:#a5c8ff; font-weight:700; }
  #stats { display:flex; gap:1.5rem; }
  .stat { text-align:center; }
  .stat .n { font-size:1.4rem; font-weight:800; line-height:1; }
  .stat .l { font-size:0.72rem; opacity:0.75; margin-top:2px; }
  .col  { color:#4fc3f7; }
  .cj   { color:#ffd54f; }
  .both { color:#ce93d8; }
  .tot  { color:#a5d6a7; }
  #controls { padding:0.5rem 1rem; background:#1a2035; border-bottom:1px solid #2a3a6e; display:flex; gap:0.75rem; align-items:center; flex-shrink:0; flex-wrap:wrap; }
  .ctrl-btn { padding:0.3rem 0.85rem; border:1px solid; border-radius:999px; cursor:pointer; font-size:0.75rem; font-weight:600; background:transparent; transition:all 0.15s; }
  .ctrl-btn.col  { color:#4fc3f7; border-color:#4fc3f7; }
  .ctrl-btn.cj   { color:#ffd54f; border-color:#ffd54f; }
  .ctrl-btn.col.active  { background:#4fc3f7; color:#000; }
  .ctrl-btn.cj.active   { background:#ffd54f; color:#000; }
  .ctrl-label { font-size:0.72rem; color:#888; }
  #map { flex:1; }
  .leaflet-popup-content-wrapper { border-radius:8px; font-size:0.82rem; }
  .popup-name { font-weight:700; margin-bottom:3px; }
  .popup-addr { color:#666; font-size:0.75rem; }
  .popup-phone { color:#999; font-size:0.72rem; margin-top:2px; }
  .popup-badge { display:inline-block; padding:1px 8px; border-radius:999px; font-size:0.68rem; font-weight:700; margin-top:4px; }
</style>
</head>
<body>

<div id="header">
  <h1>🐾 Mapa de Clientes — Pets & Pets Cali</h1>
  <div id="stats">
    <div class="stat"><div class="n col">${colseguros.length}</div><div class="l">Colseguros</div></div>
    <div class="stat"><div class="n cj">${ciudadJardin.length}</div><div class="l">Ciudad Jardín</div></div>
    <div class="stat"><div class="n both">${ambos.length}</div><div class="l">Ambas</div></div>
    <div class="stat"><div class="n tot">${new Set([...colseguros, ...ciudadJardin].map(c=>c.name)).size}</div><div class="l">Total únicos</div></div>
  </div>
</div>

<div id="controls">
  <span class="ctrl-label">Capas:</span>
  <button class="ctrl-btn col active"  id="btn-heat-c"  onclick="toggleLayer('heatC', this)">🔵 Calor Colseguros</button>
  <button class="ctrl-btn cj  active"  id="btn-heat-cj" onclick="toggleLayer('heatCJ',this)">🟡 Calor Ciudad Jardín</button>
  <button class="ctrl-btn col active"  id="btn-pts-c"   onclick="toggleLayer('ptsC', this)">🔵 Puntos Colseguros</button>
  <button class="ctrl-btn cj  active"  id="btn-pts-cj"  onclick="toggleLayer('ptsCJ',this)">🟡 Puntos Ciudad Jardín</button>
  <span class="ctrl-label" style="margin-left:0.5rem">Haz clic en un punto para ver el cliente</span>
</div>

<div id="map"></div>

<script>
const DATA_C  = ${toJson(colseguros)};
const DATA_CJ = ${toJson(ciudadJardin)};

const map = L.map('map', { zoomControl:true }).setView([3.4516, -76.5320], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution:'&copy; <a href="https://osm.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>',
  maxZoom: 19
}).addTo(map);

function makePopup(c, color, sede) {
  return \`<div class="popup-name">\${c.name}</div>
<div class="popup-addr">📍 \${c.address}</div>
\${c.phone ? '<div class="popup-phone">📞 ' + c.phone + '</div>' : ''}
<span class="popup-badge" style="background:\${color}22;color:\${color};">\${sede}</span>\`;
}

// ── Heat maps ─────────────────────────────────────────────────────────────────
const heatC = L.heatLayer(
  DATA_C.map(c => [c.lat, c.lng, 1]),
  { radius:30, blur:25, maxZoom:17, gradient:{ 0.2:'#01579b', 0.5:'#0288d1', 0.8:'#29b6f6', 1.0:'#80deea' } }
).addTo(map);

const heatCJ = L.heatLayer(
  DATA_CJ.map(c => [c.lat, c.lng, 1]),
  { radius:30, blur:25, maxZoom:17, gradient:{ 0.2:'#e65100', 0.5:'#f57c00', 0.8:'#ffb300', 1.0:'#fff176' } }
).addTo(map);

// ── Marker clusters ───────────────────────────────────────────────────────────
const ptsC = L.layerGroup(
  DATA_C.map(c => L.circleMarker([c.lat, c.lng], {
    radius:6, fillColor:'#4fc3f7', color:'#fff', weight:1.5, opacity:1, fillOpacity:0.85
  }).bindPopup(makePopup(c, '#4fc3f7', 'Colseguros')))
).addTo(map);

const ptsCJ = L.layerGroup(
  DATA_CJ.map(c => L.circleMarker([c.lat, c.lng], {
    radius:6, fillColor:'#ffd54f', color:'#fff', weight:1.5, opacity:1, fillOpacity:0.85
  }).bindPopup(makePopup(c, '#ffd54f', 'Ciudad Jardín')))
).addTo(map);

// ── Layer toggle ──────────────────────────────────────────────────────────────
const layers = { heatC, heatCJ, ptsC, ptsCJ };

function toggleLayer(name, btn) {
  const layer = layers[name];
  if (map.hasLayer(layer)) { map.removeLayer(layer); btn.classList.remove('active'); }
  else                     { map.addLayer(layer);    btn.classList.add('active'); }
}
<\/script>
</body>
</html>`;
}

main().catch(e => { console.error('\n❌ Error:', e.message); process.exit(1); });
