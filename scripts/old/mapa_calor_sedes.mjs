/**
 * Mapa de calor de clientes por sede (todos los clientes, según sede_id de su
 * perfil), ubicados por la dirección de su ficha. Marca también la ubicación
 * de cada sede física. Vista de una sede a la vez (filtro, no "todas").
 *
 * Uso: node scripts/mapa_calor_sedes.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const D = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://lddksdszpwonsqaavjyd.supabase.co/rest/v1';
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZGtzZHN6cHdvbnNxYWF2anlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzI0NzYsImV4cCI6MjA5MDMwODQ3Nn0.-OL0V9cBOX4liRqHEB3_anAwKX8p9bWoWrMVr8T0pL0';
const H    = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const get  = p => fetch(new URL(p, BASE + '/'), { headers: H }).then(r => r.json());

const CACHE        = path.join(D, 'geocode_cache.json');
const APPROX_CACHE  = path.join(D, 'geocode_cache_approx.json');
const OUT           = path.join(D, 'mapa_calor_sedes.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } }

// OneDrive a veces bloquea el archivo un instante mientras sincroniza (EBUSY);
// reintenta en vez de tumbar todo el proceso a mitad de camino.
function saveJson(p, o) {
  const data = JSON.stringify(o, null, 2);
  for (let attempt = 0; attempt < 6; attempt++) {
    try { fs.writeFileSync(p, data); return; }
    catch (e) {
      if (e.code !== 'EBUSY' && e.code !== 'EPERM') throw e;
      const wait = 300 * (attempt + 1);
      const until = Date.now() + wait;
      while (Date.now() < until) { /* espera sincrónica breve */ }
    }
  }
  fs.writeFileSync(p, data); // último intento, deja que falle si sigue bloqueado
}

// Coordenadas de cada sede. Ninguna de las 3 direcciones exactas resolvió a
// nivel de casa en Nominatim, así que se usó el barrio/comuna correcto,
// verificado contra fuentes externas (no solo el primer resultado del
// geocoder, que para Colseguros inicialmente devolvió una "Calle 10" de la
// Comuna 17 — equivocada; el barrio Colseguros real está en la Comuna 10).
const SEDE_INFO = {
  1: { nombre: 'Santa Mónica',  color: '#2e5cbf', direccion: 'Avenida 8N #22-06',        lat: 3.4570001, lng: -76.5350282 }, // Comuna 2 ✓
  2: { nombre: 'Colseguros',    color: '#2e7d50', direccion: 'Calle 10 #31-143',          lat: 3.4264412, lng: -76.5296781 }, // Comuna 10 ✓ (corregido)
  3: { nombre: 'Ciudad Jardín', color: '#b8860b', direccion: 'Avenida Cajascal #106-74',  lat: 3.3663153, lng: -76.5361691 }, // Comuna 22 ✓
};

// Cuadro delimitador de Cali (con margen). Cualquier resultado de geocoding
// fuera de este rango se descarta — evita que una coincidencia de nombre de
// calle en otra ciudad/país termine marcada en el mapa como si fuera Cali.
const CALI_BOUNDS = { minLat: 3.28, maxLat: 3.62, minLng: -76.62, maxLng: -76.44 };
function inCali(coords) {
  return coords && coords.lat >= CALI_BOUNDS.minLat && coords.lat <= CALI_BOUNDS.maxLat &&
         coords.lng >= CALI_BOUNDS.minLng && coords.lng <= CALI_BOUNDS.maxLng;
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
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
  'tequendama', 'bosque municipal', 'unicentro', 'departamental', 'guabal',
  'el bosque', 'vipasa', 'pance', 'jamundi', 'valle del lili',
];

let nRejected = 0;
async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=co`;
  try {
    const data = await fetch(url, { headers: { 'User-Agent': 'SofVet/1.0 gerencia@dogspital.com' } }).then(r => r.json());
    if (!data.length) return null;
    const coords = { lat: +data[0].lat, lng: +data[0].lon };
    if (!inCali(coords)) { nRejected++; return null; } // coincidencia fuera de Cali, se descarta
    return coords;
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

const cache = loadJson(CACHE);
const approxCache = loadJson(APPROX_CACHE);
let nStaleFixed = 0;

// Una entrada de caché sirve solo si existe Y (es null, o cae dentro de Cali).
// Entradas viejas que quedaron fuera de Cali (de antes de existir esta
// validación) se tratan como "no calculadas" y se vuelven a intentar.
function cachedOrRetry(store, key) {
  if (!(key in store)) return undefined;
  const v = store[key];
  if (v && !inCali(v)) { nStaleFixed++; return undefined; }
  return v; // null válido, o coords válidas
}

async function geocode(addr) {
  const key = addr.toLowerCase().trim();
  let res = cachedOrRetry(cache, key);
  if (res === undefined) {
    const cleaned = cleanAddr(key);
    res = await nominatim(cleaned + ', Cali, Colombia');
    cache[key] = res;
    saveJson(CACHE, cache);
    await sleep(1100);
  }
  if (res) return { coords: res, approx: false };

  let approxRes = cachedOrRetry(approxCache, key);
  if (approxRes === undefined) {
    const normed = norm(addr);
    const barrio = extractBarrio(normed);
    if (barrio) { approxRes = await nominatim(barrio + ', Cali, Colombia'); await sleep(1100); }
    if (!approxRes) {
      const street = extractStreet(cleanAddr(key));
      if (street) { approxRes = await nominatim(street + ', Cali, Colombia'); await sleep(1100); }
    }
    approxCache[key] = approxRes || null;
    saveJson(APPROX_CACHE, approxCache);
  }
  return approxRes ? { coords: approxRes, approx: true } : null;
}

console.log('Descargando clientes de Santa Mónica, Colseguros y Ciudad Jardín...');
const clients = await get('clients?select=id,name,address,sede_id&sede_id=in.(1,2,3)&limit=10000');

const bySede = { 1: [], 2: [], 3: [] };
for (const c of clients) bySede[c.sede_id]?.push(c);

const stats = {};
const geocodedAll = [];

for (const sedeId of [1, 2, 3]) {
  const list = bySede[sedeId];
  const conDireccion = list.filter(c => c.address?.trim());
  console.log(`\n${SEDE_INFO[sedeId].nombre}: ${list.length} clientes, ${conDireccion.length} con dirección. Geocodificando...`);

  let nExact = 0, nApprox = 0;
  for (let i = 0; i < conDireccion.length; i++) {
    const c = conDireccion[i];
    process.stdout.write(`\r  [${i + 1}/${conDireccion.length}] ${c.name.slice(0, 35).padEnd(35)}`);
    const res = await geocode(c.address);
    if (res) {
      if (res.approx) nApprox++; else nExact++;
      geocodedAll.push({ lat: res.coords.lat, lng: res.coords.lng, n: c.name, a: c.address, s: sedeId, ap: res.approx });
    }
  }
  console.log(`\n  Geocodificados: ${nExact + nApprox}/${conDireccion.length} (${nExact} exactos, ${nApprox} aproximados)`);
  stats[sedeId] = { total: list.length, conDireccion: conDireccion.length, geocodificados: nExact + nApprox, exactos: nExact, aproximados: nApprox };
}

console.log(`\nControl de calidad: ${nRejected} coincidencias nuevas descartadas por caer fuera de Cali, ${nStaleFixed} entradas viejas de caché re-verificadas por el mismo motivo.`);

// Cinturón y tirantes: verifica que absolutamente nada (ni sedes ni clientes) quede fuera de Cali.
const badSedes = Object.entries(SEDE_INFO).filter(([, s]) => !inCali(s));
if (badSedes.length) throw new Error('Coordenadas de sede fuera de Cali: ' + badSedes.map(([id]) => SEDE_INFO[id].nombre).join(', '));
const beforeFilter = geocodedAll.length;
const geocodedFinal = geocodedAll.filter(inCali);
if (geocodedFinal.length !== beforeFilter) {
  console.log(`  ⚠️  ${beforeFilter - geocodedFinal.length} puntos se filtraron en la verificación final por quedar fuera de Cali.`);
}

// ── HTML ─────────────────────────────────────────────────────────────────────
const ptsJson = JSON.stringify(geocodedFinal);
const sedeInfoJson = JSON.stringify(SEDE_INFO);
const statsJson = JSON.stringify(stats);

const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Mapa de Calor por Sede — Pets &amp; Pets Cali</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;height:100vh;display:flex;flex-direction:column}
#hdr{padding:.7rem 1.5rem;background:#f4f5f7;border-bottom:2px solid #d8dbe2;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;flex-wrap:wrap;gap:.5rem}
h1{font-size:1rem;color:#1a3c6e;font-weight:700}
#sub{font-size:.7rem;color:#555;margin-top:2px}
#stats{display:flex;gap:1.25rem;text-align:center}
.stat .n{font-size:1.4rem;font-weight:800;line-height:1}
.stat .l{font-size:.62rem;color:#666;margin-top:2px}
#ctrl{padding:.55rem 1.25rem;background:#eceef2;border-bottom:1px solid #d8dbe2;display:flex;gap:.5rem;align-items:center;flex-shrink:0;flex-wrap:wrap}
.lbl{font-size:.68rem;color:#555;margin-right:.25rem}
.fb{padding:.4rem 1.1rem;border-radius:999px;cursor:pointer;font-size:.78rem;font-weight:700;border:2px solid;background:#fff;transition:all .15s}
.fb.on{color:#fff !important}
.sep{width:1px;height:20px;background:#ccc;margin:0 .25rem}
.tb{padding:.28rem .75rem;border-radius:999px;cursor:pointer;font-size:.7rem;font-weight:600;border:1px solid #999;color:#555;background:#fff;transition:all .15s}
.tb.on{border-color:#333;color:#fff;background:#333}
#map{flex:1}
.pn{font-weight:700;margin-bottom:2px}
.pa{color:#666;font-size:.75rem}
.legend{font-size:.65rem;color:#555;margin-left:auto}
#rings{padding:.45rem 1.25rem;background:#f4f5f7;border-bottom:1px solid #d8dbe2;display:flex;gap:0;flex-shrink:0;overflow:hidden}
.ring{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:.35rem 0;font-size:.68rem;color:#fff;font-weight:700;transition:width .25s;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.ring .pct{font-size:.95rem;font-weight:800}
.ring .lbl2{font-size:.6rem;font-weight:600;opacity:.9;margin-top:1px}
</style></head><body>

<div id="hdr">
  <div>
    <h1>🐾 Mapa de Calor por Sede — Pets &amp; Pets Cali</h1>
    <div id="sub">De dónde vienen los clientes, según dirección de su perfil</div>
  </div>
  <div id="stats"></div>
</div>

<div id="rings"></div>

<div id="ctrl">
  <span class="lbl">Sede:</span>
  <button class="fb" id="btn-1" onclick="setSede(1)">Santa Mónica</button>
  <button class="fb" id="btn-2" onclick="setSede(2)">Colseguros</button>
  <button class="fb" id="btn-3" onclick="setSede(3)">Ciudad Jardín</button>
  <div class="sep"></div>
  <span class="lbl">Vista:</span>
  <button class="tb on" id="tb-heat" onclick="setVista('heat',this)">🔥 Calor</button>
  <button class="tb"    id="tb-pts"  onclick="setVista('pts',this)">📍 Puntos</button>
  <button class="tb"    id="tb-both" onclick="setVista('both',this)">🔥+📍 Ambos</button>
  <span class="legend">🔵 dirección exacta &nbsp; 🟡 aproximada (barrio/calle)</span>
</div>

<div id="map"></div>

<script>
const DATA  = ${ptsJson};
const SEDES = ${sedeInfoJson};
const STATS = ${statsJson};

const map = L.map('map').setView([3.42, -76.53], 12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OSM &copy; CARTO', maxZoom: 19
}).addTo(map);

let heatLayer = null, ptsLayer = null, sedeMarker = null;
let currentSede = null;
let currentVista = 'heat';

function sedeIcon(color) {
  return L.divIcon({
    className: '',
    html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:' + color + ';border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>',
    iconSize: [26, 26], iconAnchor: [13, 26],
  });
}

function buildStats() {
  const el = document.getElementById('stats');
  el.innerHTML = [1,2,3].map(id => {
    const s = STATS[id], info = SEDES[id];
    return '<div class="stat"><div class="n" style="color:' + info.color + '">' + s.total + '</div><div class="l">' + info.nombre + '<br>(' + s.geocodificados + ' en mapa)</div></div>';
  }).join('');
}

// Agrupa puntos en una cuadrícula (~150m por celda) y cuenta clientes por celda.
// Sin esto, con miles de puntos sueltos el heat layer se satura (llega al color
// máximo) en casi toda el área poblada y no se distingue zona muy cubierta de
// zona poco cubierta — todo se ve "igual de caliente". Agrupando y calibrando
// el maximo a la celda mas densa real, la escala de color si refleja la densidad.
const CELL_DEG = 0.0013; // ~145m de lado en la latitud de Cali
function binPoints(points) {
  const cells = new Map();
  for (const p of points) {
    const key = Math.round(p.lat / CELL_DEG) + ',' + Math.round(p.lng / CELL_DEG);
    let c = cells.get(key);
    if (!c) { c = { lat: 0, lng: 0, n: 0 }; cells.set(key, c); }
    c.lat += p.lat; c.lng += p.lng; c.n += 1;
  }
  return Array.from(cells.values()).map(c => ({ lat: c.lat / c.n, lng: c.lng / c.n, n: c.n }));
}

let lastBins = [];

function buildLayers() {
  if (heatLayer)  { map.removeLayer(heatLayer);  heatLayer  = null; }
  if (ptsLayer)   { map.removeLayer(ptsLayer);   ptsLayer   = null; }
  if (sedeMarker) { map.removeLayer(sedeMarker); sedeMarker = null; }
  if (currentSede === null) return;

  const info = SEDES[currentSede];
  const d = DATA.filter(c => c.s === currentSede);
  const bins = binPoints(d);
  const maxCount = bins.reduce((m, b) => Math.max(m, b.n), 1);
  lastBins = bins;

  sedeMarker = L.marker([info.lat, info.lng], { icon: sedeIcon(info.color) })
    .bindPopup('<div class=pn>🏥 ' + info.nombre + '<\/div><div class=pa>' + info.direccion + '<\/div>')
    .addTo(map);

  if (currentVista === 'heat' || currentVista === 'both') {
    // Piso de ruido: con miles de clientes dispersos por toda la ciudad, hay
    // celdas sueltas de 1-2 clientes por pura casualidad geográfica — eso NO
    // es un patrón real, es ruido, y sumado entre sí (el heat layer acumula
    // contribuciones cercanas) es lo que pintaba ese lavado parejo en toda
    // Cali. Descontamos ese piso y las celdas que quedan en 0 ni se dibujan,
    // así que en el mapa solo aparece donde de verdad hay un cluster (3+
    // clientes en ~150m), no cada cliente aislado.
    const NOISE_FLOOR = 2;
    // Exponente >1: exagera la brecha entre celdas densas y flojas antes de
    // pintarlas (10 vs 100 clientes deja de ser "10x" y pasa a ser "~100x"
    // en intensidad visual) — así lo poco poblado se ve mucho más tenue y
    // lo muy poblado, mucho más profundo, en vez de un degradado parejo.
    const POWER = 1.7;
    const weighted = bins
      .map(b => ({ lat: b.lat, lng: b.lng, w: Math.pow(b.n - NOISE_FLOOR, POWER) }))
      .filter(b => b.w > 0);
    const maxW = weighted.reduce((m, b) => Math.max(m, b.w), 1);

    // A zoom 15 (~4.8 m/px), 16px ≈ 76m y blur 12px ≈ 57m — comparable al
    // tamaño real de una celda (~150m), suficiente para que un cluster real
    // se vea como un bloque sólido y visible, sin fusionarse con sus vecinas.
    //
    // Fondo BLANCO: entre más oscuro/saturado, más contraste y más "caliente"
    // se ve — al revés que sobre fondo negro. minOpacity bajo para que lo
    // poco denso se desvanezca de verdad; los stops del gradiente empujados
    // hacia la derecha para que el color base/oscuro solo aparezca cerca del
    // máximo real, no a mitad de camino.
    heatLayer = L.heatLayer(weighted.map(b => [b.lat, b.lng, b.w]), {
      radius: 16, blur: 12, maxZoom: 17, max: maxW, minOpacity: 0.12,
      gradient: {
        0.08: shade(info.color, 70), 0.25: shade(info.color, 55), 0.45: shade(info.color, 30),
        0.65: shade(info.color, 5), 0.8: info.color, 0.92: shade(info.color, -35), 1: shade(info.color, -60),
      },
    }).addTo(map);
  }

  if (currentVista === 'pts' || currentVista === 'both') {
    ptsLayer = L.layerGroup(d.map(c => {
      const color = c.ap ? '#ffca28' : '#2e93ff';
      return L.circleMarker([c.lat, c.lng], { radius: 6, fillColor: color, color: '#1a1a1a', weight: 1.2, fillOpacity: 0.9 })
        .bindPopup('<div class=pn>' + c.n + '<\/div><div class=pa>📍 ' + c.a + (c.ap ? ' <i>(aproximada)<\/i>' : '') + '<\/div>');
    })).addTo(map);
  }

  map.setView([info.lat, info.lng], 15);
  return maxCount;
}

function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + pct, g = (n >> 8 & 0xff) + pct, b = (n & 0xff) + pct;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

// Distancia en metros entre dos puntos (Haversine).
function distMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Densidad (clientes/km²) por anillo de distancia — NO el % bruto del total.
// El % bruto engaña: un anillo de 2-5km tiene 84x más área que el círculo de
// 500m, así que acumula más clientes en términos absolutos aunque la
// densidad real ahí sea mucho más baja. La densidad sí corrige por área y
// es la métrica correcta para responder "¿dónde está realmente concentrada
// mi base de clientes?".
const RINGS = [
  { label: '0-500m',   min: 0,    max: 500  },
  { label: '500m-1km', min: 500,  max: 1000 },
  { label: '1-2km',    min: 1000, max: 2000 },
  { label: '2-5km',    min: 2000, max: 5000 },
  { label: '5-10km',   min: 5000, max: 10000 },
];
function ringAreaKm2(min, max) { return Math.PI * (((max/1000)**2) - ((min/1000)**2)); }

function buildRings(id, d) {
  const info = SEDES[id];
  const counts = RINGS.map(() => 0);
  let masAllaCount = 0;
  for (const c of d) {
    const dist = distMeters(info.lat, info.lng, c.lat, c.lng);
    const idx = RINGS.findIndex(r => dist >= r.min && dist < r.max);
    if (idx === -1) masAllaCount++; else counts[idx]++;
  }
  const densities  = RINGS.map((r, i) => counts[i] / ringAreaKm2(r.min, r.max));
  const maxDens    = Math.max(...densities, 0.01);
  const densitySum = densities.reduce((a, b) => a + b, 0) || 1;
  const el = document.getElementById('rings');
  el.innerHTML = RINGS.map((r, i) => {
    const dens = densities[i];
    // Ancho = participación de ESTE anillo en la densidad total (así siempre suman ~100%,
    // como una barra apilada), no el % bruto de clientes — eso es lo que corrige el sesgo de área.
    const widthPct = Math.max(Math.round(dens / densitySum * 100), 3);
    const shadeAmt = -55 + Math.round((1 - dens / maxDens) * 60); // más denso = más brillante
    return '<div class="ring" style="width:' + widthPct + '%; background:' + shade(info.color, shadeAmt) + '">' +
      '<span class="pct">' + dens.toFixed(1) + '/km²<\/span><span class="lbl2">' + r.label + ' · n=' + counts[i] + '<\/span></div>';
  }).join('') + (masAllaCount ? '<div class="ring" style="width:5%; background:#1a2035; border-left:1px solid #333"><span class="pct" style="color:#888">n=' + masAllaCount + '<\/span><span class="lbl2" style="color:#888">&gt;10km<\/span></div>' : '');
}

function setSede(id) {
  currentSede = id;
  document.querySelectorAll('.fb').forEach(b => { b.classList.remove('on'); b.style.background = 'transparent'; });
  const btn = document.getElementById('btn-' + id);
  const color = SEDES[id].color;
  btn.classList.add('on'); btn.style.background = color; btn.style.borderColor = color; btn.style.color = '#000';
  document.querySelectorAll('.fb').forEach(b => { if (b !== btn) { b.style.borderColor = '#555'; b.style.color = '#aaa'; } });
  const maxCount = buildLayers();
  const d = DATA.filter(c => c.s === id);
  buildRings(id, d);
  document.getElementById('sub').textContent = SEDES[id].nombre + ' — ' + STATS[id].total + ' clientes registrados, ' + STATS[id].conDireccion + ' con dirección, ' + STATS[id].geocodificados + ' ubicados en el mapa — zona más densa: ' + maxCount + ' cliente' + (maxCount !== 1 ? 's' : '') + ' en ~150m';
}

function setVista(v, btn) {
  currentVista = v;
  document.querySelectorAll('.tb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  buildLayers();
}

buildStats();
setSede(1);
<\/script>
</body></html>`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`\n\n✅ Mapa generado: ${OUT}`);
