/**
 * Genera mapa_clientes.html con filtros por sede.
 * Corre esto después de: 1) el SQL de sede_id, 2) que geocode_all.mjs termine (o avance suficiente).
 *
 * Uso: node scripts/generar_mapa.mjs
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
const OUT   = path.join(D, 'mapa_clientes.html');

console.log('Cargando cache de geocoding...');
const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));

console.log('Descargando clientes de Supabase...');
const clients = await get('clients?select=id,name,address,phone,sede_id&limit=10000');

// Cruzar clientes con coordenadas del cache
const geocoded = [];
for (const c of clients) {
  if (!c.address?.trim()) continue;
  const key    = c.address.toLowerCase().trim();
  const coords = cache[key];
  if (coords) {
    geocoded.push({
      name:    c.name,
      address: c.address,
      phone:   c.phone || '',
      sede_id: c.sede_id || 0,
      lat:     coords.lat,
      lng:     coords.lng,
    });
  }
}

const total   = geocoded.length;
const nC      = geocoded.filter(c => c.sede_id === 2).length;
const nCJ     = geocoded.filter(c => c.sede_id === 3).length;
const nOther  = geocoded.filter(c => c.sede_id !== 2 && c.sede_id !== 3).length;

console.log(`Total en mapa: ${total} | Colseguros: ${nC} | Ciudad Jardín: ${nCJ} | Sin sede: ${nOther}`);

const toJson = arr => JSON.stringify(arr.map(c => ({
  lat: c.lat, lng: c.lng, n: c.name, a: c.address, s: c.sede_id
})));

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Mapa Clientes — Pets & Pets Cali</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#0f1117;color:#eee;height:100vh;display:flex;flex-direction:column}
#hdr{padding:.7rem 1.5rem;background:#16213e;border-bottom:2px solid #2a3a6e;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
h1{font-size:1rem;color:#a5c8ff;font-weight:700}
#sub{font-size:.68rem;color:#777;margin-top:2px}
#stats{display:flex;gap:1.25rem;text-align:center}
.stat .n{font-size:1.3rem;font-weight:800;line-height:1}
.stat .l{font-size:.65rem;color:#888;margin-top:2px}
#ctrl{padding:.5rem 1.25rem;background:#1a2035;border-bottom:1px solid #2a3a6e;display:flex;gap:.5rem;align-items:center;flex-shrink:0;flex-wrap:wrap}
.lbl{font-size:.68rem;color:#666;margin-right:.25rem}
.fb{padding:.28rem .9rem;border-radius:999px;cursor:pointer;font-size:.73rem;font-weight:700;border:1px solid;background:transparent;transition:all .15s}
.fb-all{color:#a5c8ff;border-color:#a5c8ff}.fb-all.on{background:#a5c8ff;color:#000}
.fb-c{color:#4fc3f7;border-color:#4fc3f7}.fb-c.on{background:#4fc3f7;color:#000}
.fb-cj{color:#ffd54f;border-color:#ffd54f}.fb-cj.on{background:#ffd54f;color:#000}
.sep{width:1px;height:20px;background:#333;margin:0 .25rem}
.tb{padding:.28rem .75rem;border-radius:999px;cursor:pointer;font-size:.7rem;font-weight:600;border:1px solid #555;color:#aaa;background:transparent;transition:all .15s}
.tb.on{border-color:#888;color:#fff;background:#333}
#map{flex:1}
.pn{font-weight:700;margin-bottom:2px}
.pa{color:#666;font-size:.75rem}
.ps{display:inline-block;padding:1px 7px;border-radius:999px;font-size:.65rem;font-weight:700;margin-top:3px}
</style></head><body>

<div id="hdr">
  <div>
    <h1>🐾 Mapa de Clientes — Pets & Pets Cali</h1>
    <div id="sub">Mostrando <span id="cnt">${total}</span> de ${total} clientes geocodificados</div>
  </div>
  <div id="stats">
    <div class="stat"><div class="n" style="color:#4fc3f7">${nC}</div><div class="l">Colseguros</div></div>
    <div class="stat"><div class="n" style="color:#ffd54f">${nCJ}</div><div class="l">Ciudad Jardín</div></div>
    <div class="stat"><div class="n" style="color:#aaa">${nOther}</div><div class="l">Sin sede</div></div>
    <div class="stat"><div class="n" style="color:#a5d6a7">${total}</div><div class="l">Total</div></div>
  </div>
</div>

<div id="ctrl">
  <span class="lbl">Sede:</span>
  <button class="fb fb-all on" id="btn-all" onclick="setSede(0, this)">Todas</button>
  <button class="fb fb-c"      id="btn-c"   onclick="setSede(2, this)">Colseguros</button>
  <button class="fb fb-cj"     id="btn-cj"  onclick="setSede(3, this)">Ciudad Jardín</button>
  <div class="sep"></div>
  <span class="lbl">Vista:</span>
  <button class="tb on" id="tb-heat" onclick="setVista('heat',this)">🔥 Calor</button>
  <button class="tb"    id="tb-pts"  onclick="setVista('pts',this)">📍 Puntos</button>
  <button class="tb"    id="tb-both" onclick="setVista('both',this)">🔥+📍 Ambos</button>
</div>

<div id="map"></div>

<script>
const DATA = ${toJson(geocoded)};

const map = L.map('map').setView([3.4516, -76.5320], 12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OSM &copy; CARTO', maxZoom: 19
}).addTo(map);

// ── Capas ─────────────────────────────────────────────────────────────────────
let heatLayer = null, ptsLayer = null;
let currentSede = 0; // 0=todas, 2=Colseguros, 3=CJ
let currentVista = 'heat';

function sedeColor(s) {
  if (s === 2) return '#4fc3f7';
  if (s === 3) return '#ffd54f';
  return '#aaa';
}

function sedeLabel(s) {
  if (s === 2) return 'Colseguros';
  if (s === 3) return 'Ciudad Jardín';
  return 'Sin sede';
}

function getFiltered() {
  if (currentSede === 0) return DATA;
  return DATA.filter(d => d.s === currentSede);
}

function buildLayers() {
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
  if (ptsLayer)  { map.removeLayer(ptsLayer);  ptsLayer  = null; }

  const d = getFiltered();
  document.getElementById('cnt').textContent = d.length;

  if (currentVista === 'heat' || currentVista === 'both') {
    heatLayer = L.heatLayer(
      d.map(c => [c.lat, c.lng, 1]),
      { radius: 28, blur: 22, maxZoom: 17,
        gradient: currentSede === 3
          ? { 0.2:'#7b3f00', 0.5:'#f57c00', 0.8:'#ffb300', 1:'#fff176' }
          : currentSede === 2
          ? { 0.2:'#01579b', 0.5:'#0288d1', 0.8:'#29b6f6', 1:'#80deea' }
          : { 0.2:'#1a237e', 0.5:'#0288d1', 0.8:'#26c6da', 1:'#b2ebf2' }
      }
    ).addTo(map);
  }

  if (currentVista === 'pts' || currentVista === 'both') {
    ptsLayer = L.layerGroup(d.map(c => {
      const color = sedeColor(c.s);
      return L.circleMarker([c.lat, c.lng], {
        radius: 6, fillColor: color, color: '#fff', weight: 1.5, fillOpacity: 0.85
      }).bindPopup(
        '<div class=pn>' + c.n + '<\/div>' +
        '<div class=pa>📍 ' + c.a + '<\/div>' +
        '<span class=ps style="background:' + color + '22;color:' + color + '">' + sedeLabel(c.s) + '<\/span>'
      );
    })).addTo(map);
  }
}

function setSede(s, btn) {
  currentSede = s;
  document.querySelectorAll('.fb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  buildLayers();
}

function setVista(v, btn) {
  currentVista = v;
  document.querySelectorAll('.tb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  buildLayers();
}

buildLayers();
<\/script>
</body></html>`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`\n✅ Mapa generado: scripts/mapa_clientes.html`);
console.log('   Ábrelo en el navegador. Filtra por Todas / Colseguros / Ciudad Jardín.');
