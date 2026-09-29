/**
 * Mapa de calor de clientes atendidos en Santa Mónica durante julio 2026,
 * ubicados según la dirección de su perfil (tabla clients).
 *
 * Las citas (appointments) no tienen client_id poblado en los datos históricos,
 * así que se cruza por nombre (owner <-> clients.name) normalizado.
 *
 * Uso: node scripts/mapa_santamonica_julio.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const D = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://lddksdszpwonsqaavjyd.supabase.co/rest/v1';
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZGtzZHN6cHdvbnNxYWF2anlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzI0NzYsImV4cCI6MjA5MDMwODQ3Nn0.-OL0V9cBOX4liRqHEB3_anAwKX8p9bWoWrMVr8T0pL0';
const H    = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const get  = p => fetch(new URL(p, BASE + '/'), { headers: H }).then(r => r.json());

const CACHE = path.join(D, 'geocode_cache.json');
const OUT   = path.join(D, 'mapa_santamonica_julio2026.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadCache() { try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { return {}; } }
function saveCache(c) { fs.writeFileSync(CACHE, JSON.stringify(c, null, 2)); }

function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanAddr(a) {
  return a.replace(/·.*/g, '').replace(/,\s*(apto|torre|piso|ap|local|of|conj|bloque)\b.*/gi, '')
    .replace(/\bapto?\b.*$/gi, '').replace(/\btorre\b.*$/gi, '')
    .replace(/\bcra\b/gi, 'carrera').replace(/\bcr\b/gi, 'carrera')
    .replace(/\bcll?\b/gi, 'calle').replace(/\bav\b/gi, 'avenida')
    .replace(/\bdiag\b/gi, 'diagonal').replace(/carrerta/gi, 'carrera')
    .replace(/#/g, ' # ').replace(/\s+/g, ' ').trim();
}

const BARRIOS = [
  'santa monica residencial', 'santa monica', 'prados del norte', 'la flora',
  'normandia', 'versalles', 'cristales', 'alfonso bonilla', 'san fernando',
  'granada', 'el penon', 'ciudad jardin', 'colseguros', 'nueva tequendama',
  'santa teresita', 'el ingenio', 'chipichape', 'menga', 'la campina',
  'san vicente', 'el limonar', 'el refugio', 'la merced', 'juanambu',
];

async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=co`;
  try {
    const data = await fetch(url, { headers: { 'User-Agent': 'SofVet/1.0 gerencia@dogspital.com' } }).then(r => r.json());
    return data.length ? { lat: +data[0].lat, lng: +data[0].lon } : null;
  } catch { return null; }
}

function extractBarrio(addrNorm) {
  for (const b of BARRIOS) if (addrNorm.includes(b)) return b;
  const m = addrNorm.match(/\bb\/\s*([a-z ]+)$/);
  return m ? m[1].trim() : null;
}

function extractStreet(cleaned) {
  const m = cleaned.match(/\b(avenida|calle|carrera|diagonal|transversal)\s+[\w]+(\s+[a-z])?\s*(norte|oeste)?\b/);
  return m ? m[0].trim() : null;
}

// Cache namespace aparte para las geocodificaciones "aproximadas" (barrio/calle en vez de dirección exacta),
// para no confundirlas con resultados exactos en geocode_cache.json.
const APPROX_CACHE = path.join(D, 'geocode_cache_approx.json');
function loadApprox() { try { return JSON.parse(fs.readFileSync(APPROX_CACHE, 'utf8')); } catch { return {}; } }
function saveApprox(c) { fs.writeFileSync(APPROX_CACHE, JSON.stringify(c, null, 2)); }
const approxCache = loadApprox();

async function geocode(addr, cache) {
  const key = addr.toLowerCase().trim();
  let res = key in cache ? cache[key] : null;
  if (!(key in cache)) {
    const cleaned = cleanAddr(key);
    res = await nominatim(cleaned + ', Cali, Colombia');
    cache[key] = res;
  }
  if (res) return { coords: res, approx: false };

  // Fallback: geocodificación aproximada por barrio o por calle
  if (key in approxCache) return approxCache[key] ? { coords: approxCache[key], approx: true } : null;
  const normed = norm(addr);
  const barrio = extractBarrio(normed);
  let approxRes = null;
  if (barrio) {
    await sleep(1200);
    approxRes = await nominatim(barrio + ', Cali, Colombia');
  }
  if (!approxRes) {
    const street = extractStreet(cleanAddr(key));
    if (street) {
      await sleep(1200);
      approxRes = await nominatim(street + ', Cali, Colombia');
    }
  }
  approxCache[key] = approxRes;
  saveApprox(approxCache);
  return approxRes ? { coords: approxRes, approx: true } : null;
}

console.log('Descargando citas de Santa Mónica (sede_id=1) en julio 2026...');
const appts = await get('appointments?select=id,client_id,owner,patient_name,service,date&sede_id=eq.1&date=gte.2026-07-01&date=lte.2026-07-31');
console.log(`  ${appts.length} citas encontradas.`);

console.log('Descargando clientes...');
const clients = await get('clients?select=id,name,address,sede_id&limit=10000');
const byName = new Map();
for (const c of clients) {
  const k = norm(c.name);
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(c);
}

// Cruce por nombre (owner de la cita <-> nombre del cliente)
const matched = [];
const sinMatch = [];
const seenClientIds = new Set(); // evita contar 2 veces al mismo cliente si tuvo varias citas en julio

for (const a of appts) {
  const k = norm(a.owner);
  const candidates = byName.get(k) || [];
  const withAddr = candidates.find(c => c.address?.trim());
  if (withAddr) {
    if (!seenClientIds.has(withAddr.id)) {
      seenClientIds.add(withAddr.id);
      matched.push({ name: withAddr.name, address: withAddr.address, apptId: a.id });
    }
  } else {
    sinMatch.push(a.owner);
  }
}

console.log(`  Clientes únicos con dirección cruzados: ${matched.length}`);
console.log(`  Citas sin match de cliente/dirección: ${sinMatch.length}`);
if (sinMatch.length) console.log('  Ejemplos sin match:', sinMatch.slice(0, 8));

console.log('Geocodificando direcciones (usa cache existente cuando puede)...');
const cache = loadCache();
const geocoded = [];
let newReqs = 0;
let nApprox = 0;

for (let i = 0; i < matched.length; i++) {
  const c = matched[i];
  const key = c.address.toLowerCase().trim();
  const was = key in cache;
  process.stdout.write(`\r  [${i + 1}/${matched.length}] ${c.name.slice(0, 35).padEnd(35)}`);
  const res = await geocode(c.address, cache);
  if (res) {
    if (res.approx) nApprox++;
    geocoded.push({ name: c.name, address: c.address, lat: res.coords.lat, lng: res.coords.lng, approx: res.approx });
  }
  if (!was) { newReqs++; saveCache(cache); await sleep(1200); }
}
saveCache(cache);
console.log(`\n  Geocodificados: ${geocoded.length}/${matched.length} (${nApprox} aproximados por barrio/calle)`);

const pts = JSON.stringify(geocoded.map(c => ({ lat: c.lat, lng: c.lng, n: c.name, a: c.address, ap: !!c.approx })));

const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Mapa de Calor — Santa Mónica — Julio 2026</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#0f1117;color:#eee;height:100vh;display:flex;flex-direction:column}
#hdr{padding:.7rem 1.5rem;background:#16213e;border-bottom:2px solid #2a3a6e;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
h1{font-size:1rem;color:#2e5cbf;font-weight:700}
#sub{font-size:.68rem;color:#777;margin-top:2px}
.n{font-size:1.4rem;font-weight:800;color:#5b8def;text-align:center}
.nl{font-size:.65rem;color:#888}
#ctrl{padding:.4rem 1rem;background:#1a2035;border-bottom:1px solid #2a3a6e;display:flex;gap:.5rem;align-items:center;flex-shrink:0}
.cb{padding:.22rem .7rem;border:1px solid #5b8def;color:#5b8def;border-radius:999px;cursor:pointer;font-size:.7rem;font-weight:700;background:transparent}
.cb.on{background:#5b8def;color:#000}
#map{flex:1}
.pn{font-weight:700}.pa{color:#666;font-size:.75rem}
</style></head><body>
<div id="hdr">
  <div>
    <h1>🐾 Mapa de Calor — Santa Mónica</h1>
    <div id="sub">Clientes atendidos en julio 2026, geocodificados: ${geocoded.length} de ${matched.length} (${nApprox} aproximados por barrio/calle)</div>
  </div>
  <div><div class="n">${geocoded.length}</div><div class="nl">en mapa</div></div>
</div>
<div id="ctrl">
  <span style="font-size:.65rem;color:#666">Capas:</span>
  <button class="cb on" onclick="tog('heat',this)">🔥 Calor</button>
  <button class="cb on" onclick="tog('pts',this)">📍 Puntos</button>
  <span style="font-size:.65rem;color:#666;margin-left:1rem">🔵 exacta &nbsp; 🟡 aproximada (barrio/calle)</span>
</div>
<div id="map"></div>
<script>
const D = ${pts};
const map = L.map('map').setView([3.4516, -76.5320], 12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OSM &copy; CARTO', maxZoom: 19
}).addTo(map);
const heat = L.heatLayer(D.map(c => [c.lat, c.lng, 1]), {
  radius: 30, blur: 25, maxZoom: 17,
  gradient: { 0.2:'#0d2a5c', 0.5:'#2e5cbf', 0.8:'#5b8def', 1:'#a8c5ff' }
}).addTo(map);
const pts = L.layerGroup(D.map(c =>
  L.circleMarker([c.lat, c.lng], { radius:6, fillColor: c.ap ? '#ffca28' : '#2e5cbf', color:'#fff', weight:1.5, fillOpacity:.85 })
    .bindPopup('<div class=pn>' + c.n + '<\/div><div class=pa>📍 ' + c.a + (c.ap ? ' <i>(ubicación aproximada)<\/i>' : '') + '<\/div>')
)).addTo(map);
const layers = { heat, pts };
function tog(n, b) {
  const l = layers[n];
  if (map.hasLayer(l)) { map.removeLayer(l); b.classList.remove('on'); }
  else { map.addLayer(l); b.classList.add('on'); }
}
<\/script>
</body></html>`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`\n✅ Mapa generado: ${OUT}`);
