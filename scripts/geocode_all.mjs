import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const D = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://lddksdszpwonsqaavjyd.supabase.co/rest/v1';
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZGtzZHN6cHdvbnNxYWF2anlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzI0NzYsImV4cCI6MjA5MDMwODQ3Nn0.-OL0V9cBOX4liRqHEB3_anAwKX8p9bWoWrMVr8T0pL0';
const H    = { apikey:KEY, Authorization:'Bearer '+KEY };
const CACHE = path.join(D,'geocode_cache.json');
const OUT   = path.join(D,'mapa_clientes.html');
const sleep = ms => new Promise(r=>setTimeout(r,ms));

function loadCache() { try{return JSON.parse(fs.readFileSync(CACHE,'utf8'));}catch{return{};} }
function saveCache(c){ fs.writeFileSync(CACHE,JSON.stringify(c,null,2)); }

function cleanAddr(a) {
  return a.replace(/·.*/g,'').replace(/,\s*(apto|torre|piso|ap|local|of|conj|bloque)\b.*/gi,'')
    .replace(/\bapto?\b.*$/gi,'').replace(/\btorre\b.*$/gi,'')
    .replace(/\bcra\b/gi,'carrera').replace(/\bcr\b/gi,'carrera')
    .replace(/\bcll?\b/gi,'calle').replace(/\bav\b/gi,'avenida')
    .replace(/\bdiag\b/gi,'diagonal').replace(/carrerta/gi,'carrera')
    .replace(/#/g,' # ').replace(/\s+/g,' ').trim();
}

async function geocode(addr, cache) {
  const key = addr.toLowerCase().trim();
  if (key in cache) return cache[key];
  const cleaned = cleanAddr(key);
  const q = encodeURIComponent(cleaned + ', Cali, Colombia');
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=co`;
  try {
    const data = await fetch(url,{headers:{'User-Agent':'SofVet/1.0 gerencia@dogspital.com'}}).then(r=>r.json());
    const res  = data.length ? {lat:+data[0].lat,lng:+data[0].lon} : null;
    cache[key] = res; return res;
  } catch(e) { cache[key]=null; return null; }
}

function buildHTML(geocoded, total) {
  const pts = JSON.stringify(geocoded.map(c=>({lat:c.lat,lng:c.lng,n:c.name,a:c.address})));
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Mapa Clientes Pets & Pets</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0f1117;color:#eee;height:100vh;display:flex;flex-direction:column}
#hdr{padding:.65rem 1.25rem;background:#16213e;border-bottom:2px solid #2a3a6e;display:flex;justify-content:space-between;align-items:center}
h1{font-size:1rem;color:#a5c8ff;font-weight:700}#sub{font-size:.68rem;color:#777;margin-top:2px}
.n{font-size:1.4rem;font-weight:800;color:#4fc3f7;text-align:center}.nl{font-size:.65rem;color:#888}
#ctrl{padding:.4rem 1rem;background:#1a2035;border-bottom:1px solid #2a3a6e;display:flex;gap:.5rem;align-items:center}
.cb{padding:.22rem .7rem;border:1px solid #4fc3f7;color:#4fc3f7;border-radius:999px;cursor:pointer;font-size:.7rem;font-weight:700;background:transparent}
.cb.on{background:#4fc3f7;color:#000}#map{flex:1}
.pn{font-weight:700}.pa{color:#666;font-size:.75rem}</style></head><body>
<div id="hdr">
  <div><h1>🐾 Mapa de Clientes — Pets & Pets Cali</h1><div id="sub">Geocodificados: ${geocoded.length} de ${total} clientes con dirección</div></div>
  <div><div class="n">${geocoded.length}</div><div class="nl">en mapa</div></div>
</div>
<div id="ctrl">
  <span style="font-size:.65rem;color:#666">Capas:</span>
  <button class="cb on" onclick="tog('heat',this)">🔥 Calor</button>
  <button class="cb on" onclick="tog('pts',this)">📍 Puntos</button>
</div>
<div id="map"></div>
<script>
const D=${pts};
const map=L.map('map').setView([3.4516,-76.5320],12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; OSM &copy; CARTO',maxZoom:19}).addTo(map);
const heat=L.heatLayer(D.map(c=>[c.lat,c.lng,1]),{radius:30,blur:25,maxZoom:17,gradient:{0.2:'#1a237e',0.5:'#0288d1',0.8:'#26c6da',1:'#80deea'}}).addTo(map);
const pts=L.layerGroup(D.map(c=>L.circleMarker([c.lat,c.lng],{radius:6,fillColor:'#4fc3f7',color:'#fff',weight:1.5,fillOpacity:.8}).bindPopup('<div class=pn>'+c.n+'</div><div class=pa>'+c.a+'</div>'))).addTo(map);
const layers={heat,pts};
function tog(n,b){const l=layers[n];if(map.hasLayer(l)){map.removeLayer(l);b.classList.remove('on');}else{map.addLayer(l);b.classList.add('on');}}
<\/script></body></html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const clients = await fetch(new URL('clients?select=id,name,address,phone&limit=10000',BASE+'/'),{headers:H}).then(r=>r.json());
const withAddr = clients.filter(c=>c.address?.trim());
console.log(`${withAddr.length} clientes con dirección. Geocodificando (puede tomar ~${Math.ceil(withAddr.length*1.2/60)} min)...`);

const cache    = loadCache();
const geocoded = [];
let   newReqs  = 0;

for (let i=0; i<withAddr.length; i++) {
  const c   = withAddr[i];
  const key = c.address.toLowerCase().trim();
  const was = key in cache;
  
  process.stdout.write(`\r[${i+1}/${withAddr.length}] ok:${geocoded.length} | ${c.name.slice(0,35).padEnd(35)}`);
  
  const coords = await geocode(c.address, cache);
  if (coords) geocoded.push({name:c.name,address:c.address,lat:coords.lat,lng:coords.lng});
  
  if (!was) {
    newReqs++;
    saveCache(cache);
    await sleep(1200);
    // Regenerar HTML cada 50 nuevos
    if (newReqs % 50 === 0) {
      fs.writeFileSync(OUT, buildHTML(geocoded, withAddr.length));
      console.log(`\n  → Mapa actualizado: ${geocoded.length} puntos`);
    }
  }
}

saveCache(cache);
fs.writeFileSync(OUT, buildHTML(geocoded, withAddr.length));
console.log(`\n\n✅ Listo. ${geocoded.length} clientes en el mapa.`);
console.log(`   Abre: ${OUT}`);
