/**
 * Mapa de origen de clientes — de dónde viene la gente que nos visita.
 *
 * A diferencia de los mapas anteriores (carpeta scripts/old/), este NO agrupa
 * por el `sede_id` del perfil del cliente sino por la sede donde realmente lo
 * atendimos, leyendo las visitas reales. Un cliente que aparece en dos sedes
 * pinta en las dos.
 *
 * Salida: mapa_origen_clientes.html — autocontenido, con filtros de sede,
 * de período (todo / 6 / 3 meses) y de vista (puntos / mapa de calor).
 *
 * Uso: node scripts/mapa_origen_clientes.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const D = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://lddksdszpwonsqaavjyd.supabase.co/rest/v1';
const KEY  = 'sb_publishable__jLFrmIPagVkl7OM_-v6LA_GZQog5SZ';
const H    = { apikey: KEY, Authorization: 'Bearer ' + KEY };

// PostgREST corta silenciosamente cada request — sin paginar, una tabla
// grande se trunca sin ningún error visible y quedan clientes sin visitas.
async function getAll(p) {
  const PAGE = 1000;
  let all = [], from = 0;
  while (true) {
    const res = await fetch(new URL(p, BASE + '/'), { headers: { ...H, Range: `${from}-${from + PAGE - 1}` } });
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error(`${p} -> ${JSON.stringify(data).slice(0, 300)}`);
    if (data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

const CACHE        = path.join(D, 'geocode_cache.json');
const QUERY_CACHE  = path.join(D, 'geocode_cache_consultas.json');
const OUT          = path.join(D, 'mapa_origen_clientes.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } }

// OneDrive bloquea el archivo un instante mientras sincroniza (EBUSY);
// reintenta en vez de tumbar el proceso a mitad del geocoding.
function saveJson(p, o) {
  const data = JSON.stringify(o, null, 2);
  for (let attempt = 0; attempt < 6; attempt++) {
    try { fs.writeFileSync(p, data); return; }
    catch (e) {
      if (e.code !== 'EBUSY' && e.code !== 'EPERM') throw e;
      const until = Date.now() + 300 * (attempt + 1);
      while (Date.now() < until) { /* espera corta */ }
    }
  }
  fs.writeFileSync(p, data);
}

const SEDE_INFO = {
  1: { nombre: 'Santa Mónica',  color: '#2e5cbf', direccion: 'Avenida 8N #22-06',           lat: 3.4570001, lng: -76.5350282 },
  2: { nombre: 'Colseguros',    color: '#2e7d50', direccion: 'Calle 10 #31-143',            lat: 3.4264412, lng: -76.5296781 },
  3: { nombre: 'Ciudad Jardín', color: '#b8860b', direccion: 'Avenida Cañasgordas #106-74', lat: 3.3663153, lng: -76.5361691 },
  4: { nombre: 'Domicilio',     color: '#7c5cbf', direccion: null, lat: null, lng: null },
};

// Cualquier resultado de geocoding fuera de este rango se descarta — evita que
// una calle con el mismo nombre en otra ciudad termine marcada como si fuera Cali.
// El límite sur llega hasta Jamundí (3.26) a propósito: hay clientes reales
// allá y con el corte anterior en 3.28 el pueblo quedaba fuera, así que sus
// direcciones terminaban cayendo en el río Jamundí, que sí entraba por poco.
const CALI_BOUNDS = { minLat: 3.20, maxLat: 3.62, minLng: -76.62, maxLng: -76.44 };
const inCali = c => c && c.lat >= CALI_BOUNDS.minLat && c.lat <= CALI_BOUNDS.maxLat &&
                         c.lng >= CALI_BOUNDS.minLng && c.lng <= CALI_BOUNDS.maxLng;

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

function cleanAddr(a) {
  return a.replace(/·.*/g, '').replace(/,\s*(apto|torre|piso|ap|local|of|conj|bloque)\b.*/gi, '')
    .replace(/\bapto?\b.*$/gi, '').replace(/\btorre\b.*$/gi, '')
    .replace(/\bcra\b/gi, 'carrera').replace(/\bcr\b/gi, 'carrera')
    .replace(/\bcll?\b/gi, 'calle').replace(/\bav\b/gi, 'avenida')
    .replace(/\bdiag\b/gi, 'diagonal').replace(/carrerta/gi, 'carrera')
    .replace(/\baveni[ad]a?\b/gi, 'avenida').replace(/\bcalles\b/gi, 'calle')
    // "avenida 8norte", "calle 64norte": separa el cardinal pegado al número.
    .replace(/(\d)\s*(norte|sur|oeste|este)\b/gi, '$1 $2')
    // "calle 5ta b" -> "calle 5 b"; "avenida 9na" -> "avenida 9". De paso se
    // come el "no" de "número", que para ubicar la vía sobra.
    .replace(/(\d+)\s*(ra|ro|da|do|ta|to|va|vo|ma|mo|na|no)\b/gi, '$1')
    // En Cali la O suelta después del número de la vía significa Oeste.
    .replace(/\b(calle|carrera|avenida|diagonal|transversal)\s+(\d+\s*[a-z]?)\s+o\b/gi, '$1 $2 oeste')
    .replace(/#/g, ' # ').replace(/\s+/g, ' ').trim();
}

const BARRIOS = [
  'santa monica popular', 'santa monica residencial', 'santa monica',
  'colseguros andes', 'colseguros', 'prados del norte', 'la flora',
  'normandia', 'versalles', 'cristales', 'alfonso bonilla', 'san fernando',
  'granada', 'el penon', 'ciudad jardin', 'nueva tequendama',
  'santa teresita', 'el ingenio', 'chipichape', 'menga', 'la campina',
  'san vicente', 'el limonar', 'el refugio', 'la merced', 'juanambu',
  'tequendama', 'bosque municipal', 'unicentro', 'departamental', 'guabal',
  'el bosque', 'vipasa', 'pance', 'jamundi', 'valle del lili',
];

// Nominatim se equivoca en estos y hay que fijarlos a mano. El caso grave es
// "santa monica": la consulta suelta devuelve Santa Mónica Popular (comuna 8,
// al oriente), no el barrio Santa Mónica de la comuna 2 que está al lado de la
// sede — y ese barrio no existe como tal en OpenStreetMap, así que no hay
// centroide bueno que usar. Se deja en null para que esas direcciones caigan
// al nivel de calle, que para el norte de Cali ubica bien.
// "jamundi" devolvía el Río Jamundi en vez del pueblo.
const CENTROIDES = {
  'santa monica':             null,
  'santa monica residencial': null,
  'jamundi':          { lat: 3.2618, lng: -76.5408 },  // cabecera de Jamundí
  'santa monica popular': { lat: 3.4386, lng: -76.5098 },  // comuna 8, verificado
  'colseguros andes': { lat: 3.4264, lng: -76.5297 },  // comuna 10, verificado
};

// Prefiere el nombre más largo que aparezca en la dirección: sin esto,
// "santa monica popular" hace match con "santa monica" y se va 4 km al oeste.
const BARRIOS_ORD = [...BARRIOS].sort((a, b) => b.length - a.length);

let nRejected = 0;
async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=co`;
  try {
    const data = await fetch(url, { headers: { 'User-Agent': 'SofVet/1.0 gerencia@dogspital.com' } }).then(r => r.json());
    if (!data.length) return null;
    const coords = { lat: +data[0].lat, lng: +data[0].lon };
    if (!inCali(coords)) { nRejected++; return null; }
    return coords;
  } catch { return null; }
}

function extractBarrio(addrNorm) {
  for (const b of BARRIOS_ORD) if (addrNorm.includes(b)) return b;
  const m = addrNorm.match(/\bb\/\s*([a-z ]+)$/);
  return m ? m[1].trim() : null;
}
// Normaliza la vía al formato que Nominatim sí encuentra. Dos trampas:
//   · "avenida 9 a norte" no devuelve nada; "avenida 9a norte" sí. El espacio
//     entre el número y la letra rompe la búsqueda, y así estaba quedando la
//     mayor parte del norte de Cali — justo la zona de Santa Mónica.
//   · En Cali una N o una O sueltas después del número son Norte y Oeste, no
//     un sufijo de letra: "calle 28 n" es "calle 28 norte". Sin esto caía en
//     una Calle 28 de Lili, al otro extremo de la ciudad.
function extractStreet(cleaned) {
  // El \b después de la letra evita que "oeste" se parta en "o" + "este".
  const m = cleaned.match(/\b(avenida|calle|carrera|diagonal|transversal)\s+(\d+)(?:\s*([a-z])\b)?\s*(norte|oeste|sur|este)?\b/);
  if (!m) return null;
  const via = m[1], num = m[2];
  let letra = m[3] || '', card = m[4] || '';
  if (!card && (letra === 'n' || letra === 'o')) { card = letra === 'n' ? 'norte' : 'oeste'; letra = ''; }
  return `${via} ${num}${letra}${card ? ' ' + card : ''}`;
}

const cache = loadJson(CACHE);
// Las consultas de respaldo (una calle, un barrio) se cachean por la consulta
// misma y no por la dirección del cliente: cientos de clientes comparten la
// misma calle, así que así se resuelve una sola vez en vez de una por cliente.
const qCache = loadJson(QUERY_CACHE);

// Entradas viejas que quedaron fuera del rango válido (de antes de existir esta
// validación) se tratan como "no calculadas" y se vuelven a intentar.
function cachedOrRetry(store, key) {
  if (!(key in store)) return undefined;
  const v = store[key];
  if (v && !inCali(v)) return undefined;
  return v;
}

async function consultar(q) {
  let v = cachedOrRetry(qCache, q);
  if (v === undefined) {
    v = await nominatim(q + ', Cali, Colombia');
    qCache[q] = v;
    saveJson(QUERY_CACHE, qCache);
    await sleep(1100);
  }
  return v;
}

// Tres niveles de precisión, de mejor a peor:
//   0 = la dirección completa resolvió a nivel de casa
//   1 = solo resolvió la calle
//   2 = solo resolvió el barrio
// La calle va ANTES que el barrio: el 97% de las direcciones traen calle
// utilizable, y una calle ubica mucho mejor que el centroide de un barrio.
// Hacerlo al revés era lo que mandaba a los clientes de Santa Mónica (norte)
// al centroide de Santa Mónica Popular, 4 km al oriente.
async function geocode(addr) {
  const key = addr.toLowerCase().trim();

  let res = cachedOrRetry(cache, key);
  if (res === undefined) {
    res = await nominatim(cleanAddr(key) + ', Cali, Colombia');
    cache[key] = res;
    saveJson(CACHE, cache);
    await sleep(1100);
  }
  if (res) return { coords: res, nivel: 0 };

  const street = extractStreet(cleanAddr(key));
  if (street) {
    const v = await consultar(street);
    if (v) return { coords: v, nivel: 1 };
  }

  const barrio = extractBarrio(norm(addr));
  if (barrio) {
    // Centroide fijado a mano porque Nominatim se equivoca; null significa
    // "no hay centroide confiable", así que la dirección se descarta.
    if (barrio in CENTROIDES) {
      const c = CENTROIDES[barrio];
      if (c) return { coords: c, nivel: 2 };
    } else {
      const v = await consultar(barrio);
      if (v) return { coords: v, nivel: 2 };
    }
  }
  return null;
}

// ── 1. Ventanas de tiempo ───────────────────────────────────────────────────
// SofVet solo empezó a guardar la sede de cada atención en marzo de 2026:
// appointments, grooming, hospitalization y procedimientos no tienen ni una
// fila anterior, y las consultas que sí las hay traen sede_id en null. Todo lo
// de antes queda fuera a propósito — no hay forma de saber dónde se atendió.
const INICIO = new Date('2026-03-01T00:00:00');
const hoy = new Date();
const desdeN = n => { const d = new Date(hoy); d.setMonth(d.getMonth() - n); return d; };
const CORTES = [INICIO, desdeN(6), desdeN(3)];   // 0=toda la historia, 1=6m, 2=3m
const DESDE_ISO = '2026-03-01';

// Devuelve el índice de la ventana más restrictiva en la que cabe la fecha
// (0 = solo la historia completa, 2 = también los últimos 3 meses), o -1.
function ventana(fechaStr) {
  if (!fechaStr) return -1;
  const d = new Date(String(fechaStr).slice(0, 10));
  if (isNaN(d) || d < CORTES[0] || d > hoy) return -1;
  if (d >= CORTES[2]) return 2;
  if (d >= CORTES[1]) return 1;
  return 0;
}

console.log(`Ventana: desde ${DESDE_ISO} hasta ${hoy.toISOString().slice(0, 10)}\n`);

// ── 2. Descarga ─────────────────────────────────────────────────────────────
console.log('Descargando clientes y pacientes...');
const [clients, patients] = await Promise.all([
  getAll('clients?select=id,name,address,sede_id'),
  getAll('patients?select=id,client_id'),
]);
const patientToClient = new Map(patients.map(p => [p.id, p.client_id]));
console.log(`  ${clients.length} clientes, ${patients.length} pacientes`);

// En appointments y grooming las columnas client_id y patient_id quedaron en
// null en la práctica: el único vínculo con el cliente es el nombre del dueño.
const nombreNorm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const homonimos = new Map();
for (const c of clients) {
  const k = nombreNorm(c.name);
  if (!k) continue;
  if (!homonimos.has(k)) homonimos.set(k, []);
  homonimos.get(k).push(c);
}
// Dos clientes con el mismo nombre son ambiguos y se descartan, salvo que
// compartan dirección: como el mapa ubica direcciones y no personas, ahí da
// igual cuál de los dos sea (suelen ser el mismo tutor registrado dos veces).
const tieneDir = c => (c.address || '').trim().length > 5;
const porNombre = new Map();
for (const [k, g] of homonimos) {
  if (g.length === 1) { porNombre.set(k, g[0].id); continue; }
  const dirs = new Set(g.filter(tieneDir).map(c => c.address.toLowerCase().trim()));
  if (dirs.size === 1) porNombre.set(k, g.find(tieneDir).id);
}

const FUENTES = [
  {
    label: 'consultas',
    q: `consultations?select=patient_id,date,sede_id&date=gte.${DESDE_ISO}`,
    map: r => [patientToClient.get(r.patient_id), r.sede_id, r.date],
  },
  {
    label: 'hospitalizaciones',
    q: `hospitalization?select=client_id,patient_id,ingreso_date,sede_id&ingreso_date=gte.${DESDE_ISO}`,
    map: r => [r.client_id || patientToClient.get(r.patient_id), r.sede_id, r.ingreso_date],
  },
  {
    label: 'procedimientos',
    q: `procedimientos?select=patient_id,fecha,sede_id&fecha=gte.${DESDE_ISO}`,
    map: r => [patientToClient.get(r.patient_id), r.sede_id, r.fecha],
  },
  {
    label: 'peluquería',
    q: `grooming?select=client_id,patient_id,owner,date,sede_id,status&date=gte.${DESDE_ISO}`,
    map: r => /cancel/i.test(r.status || '') ? null
      : [r.client_id || patientToClient.get(r.patient_id) || porNombre.get(nombreNorm(r.owner)), r.sede_id, r.date],
  },
  {
    label: 'citas',
    q: `appointments?select=client_id,patient_id,owner,date,sede_id,status&date=gte.${DESDE_ISO}`,
    map: r => /cancel/i.test(r.status || '') ? null
      : [r.client_id || patientToClient.get(r.patient_id) || porNombre.get(nombreNorm(r.owner)), r.sede_id, r.date],
  },
];
// `vaccines` queda fuera a propósito: date, date_applied y next_date están en
// null en toda la tabla, así que no aporta ninguna fecha utilizable.

// Una "visita" es un cliente en una sede en un día. La cita, la consulta y el
// procedimiento del mismo día son la misma ida a la clínica: se deduplican en
// vez de contarse tres veces.
// counts.get(clientId)[sede] = [n12m, n6m, n3m]
const counts = new Map();
const vistos = new Set();
function registrar(clientId, sede, fecha) {
  const w = ventana(fecha);
  if (w < 0 || !clientId || !SEDE_INFO[sede]) return false;
  const k = `${clientId}|${sede}|${String(fecha).slice(0, 10)}`;
  if (vistos.has(k)) return false;
  vistos.add(k);
  let porSede = counts.get(clientId);
  if (!porSede) { porSede = {}; counts.set(clientId, porSede); }
  if (!porSede[sede]) porSede[sede] = [0, 0, 0];
  porSede[sede][0]++;                  // toda visita válida cuenta en el año
  if (w >= 1) porSede[sede][1]++;
  if (w >= 2) porSede[sede][2]++;
  return true;
}

let totalVisitas = 0, descartados = 0;
for (const { label, q, map } of FUENTES) {
  const rows = await getAll(q);
  let ok = 0, desc = 0, rep = 0;
  for (const r of rows) {
    const m = map(r);
    if (!m) continue;                                  // cancelada
    const [cid, sede, fecha] = m;
    if (ventana(fecha) < 0) continue;                  // fuera de ventana o a futuro
    if (!cid || !sede) { desc++; continue; }           // no se pudo ubicar
    if (registrar(cid, sede, fecha)) ok++; else rep++; // rep = mismo cliente/sede/día
  }
  totalVisitas += ok;
  descartados  += desc;
  console.log(`  ${label.padEnd(18)} ${String(rows.length).padStart(5)} filas -> ${String(ok).padStart(5)} visitas` +
    `${rep ? `  (${rep} del mismo día ya contadas)` : ''}${desc ? `  (${desc} sin cliente o sin sede)` : ''}`);
}
console.log(`\n${totalVisitas} visitas de ${counts.size} clientes distintos`);
if (descartados) console.log(`  ${descartados} registros descartados por no tener cliente o sede identificable`);

// ── 3. Geocoding ────────────────────────────────────────────────────────────
const activos = clients.filter(c => counts.has(c.id) && (c.address || '').trim().length > 5);
const sinDireccion = counts.size - activos.length;

const faltan = activos.filter(c => cachedOrRetry(cache, c.address.toLowerCase().trim()) === undefined).length;
console.log(`\n${activos.length} clientes con dirección (${sinDireccion} sin dirección utilizable)`);
console.log(`${faltan} direcciones sin resolver a nivel de casa; las de respaldo se cachean por calle\n`);

const puntos = [];
const porNivel = [0, 0, 0];
let hechos = 0, fallidos = 0;
for (const c of activos) {
  const r = await geocode(c.address);
  hechos++;
  if (!r) fallidos++;
  else {
    porNivel[r.nivel]++;
    puntos.push([
      +r.coords.lat.toFixed(6),
      +r.coords.lng.toFixed(6),
      c.name || 'Sin nombre',
      counts.get(c.id),
      r.nivel,
    ]);
  }
  if (hechos % 200 === 0) console.log(`  ${hechos}/${activos.length} (casa ${porNivel[0]}, calle ${porNivel[1]}, barrio ${porNivel[2]}, sin ubicar ${fallidos})`);
}
console.log(`\nUbicados: ${porNivel[0]} a nivel de casa, ${porNivel[1]} de calle, ${porNivel[2]} de barrio = ${puntos.length} / ${activos.length}`);
if (fallidos)  console.log(`  ${fallidos} sin ubicar`);
if (nRejected) console.log(`  ${nRejected} resultados descartados por caer fuera de Cali`);

// ── 4. HTML ─────────────────────────────────────────────────────────────────
const META = {
  generado: hoy.toISOString().slice(0, 10),
  desde: DESDE_ISO,
  sedes: SEDE_INFO,
  totalVisitas,
  clientesConVisita: counts.size,
  ubicados: puntos.length,
  sinUbicar: fallidos,
  sinDireccion,
  porNivel,
};

fs.writeFileSync(OUT, HTML(puntos, META));
console.log(`\nListo: ${OUT}`);

function HTML(pts, meta) {
return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Origen de Clientes — Pets &amp; Pets</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js"><\/script>
<style>
  :root{--bg:#0f1115;--panel:#181c24;--line:#2a3140;--txt:#e8ecf3;--dim:#8b95a7;--accent:#4a9eff}
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--txt)}
  #map{position:absolute;inset:0}
  .panel{position:absolute;top:16px;left:16px;z-index:1000;width:292px;max-height:calc(100% - 32px);overflow-y:auto;
    background:rgba(24,28,36,.96);border:1px solid var(--line);border-radius:12px;padding:16px;backdrop-filter:blur(8px);
    box-shadow:0 8px 32px rgba(0,0,0,.5)}
  h1{margin:0 0 2px;font-size:16px;font-weight:650}
  .sub{font-size:11px;color:var(--dim);margin-bottom:14px}
  .grupo{margin-bottom:14px}
  .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.9px;color:var(--dim);margin-bottom:6px;font-weight:600}
  .chips{display:flex;flex-wrap:wrap;gap:5px}
  .chip{padding:6px 10px;border:1px solid var(--line);border-radius:7px;background:#11151c;color:var(--dim);
    font-size:12px;cursor:pointer;user-select:none;transition:.12s;line-height:1.2}
  .chip:hover{border-color:#3d4759;color:var(--txt)}
  .chip.on{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
  .chip.on[data-color]{background:var(--c);border-color:var(--c)}
  .stats{border-top:1px solid var(--line);padding-top:12px;margin-top:4px}
  .row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}
  .row span:first-child{color:var(--dim)}
  .row b{font-variant-numeric:tabular-nums;font-weight:600}
  .nota{font-size:10px;color:var(--dim);line-height:1.5;border-top:1px solid var(--line);padding-top:10px;margin-top:12px}
  .leaflet-popup-content-wrapper{background:#181c24;color:var(--txt);border-radius:8px}
  .leaflet-popup-tip{background:#181c24}
  .leaflet-popup-content{margin:10px 12px;font-size:12px;line-height:1.6}
  .leaflet-container{background:#0f1115}
  .leaflet-control-attribution{background:rgba(15,17,21,.8)!important;color:var(--dim)!important}
  .leaflet-control-attribution a{color:var(--dim)!important}
  @media(max-width:600px){.panel{width:calc(100% - 32px)}}
</style>
</head>
<body>
<div id="map"></div>
<div class="panel">
  <h1>Origen de clientes</h1>
  <div class="sub">Visitas atendidas desde ${meta.desde} · datos al ${meta.generado}</div>

  <div class="grupo">
    <div class="lbl">Sede donde se atendió</div>
    <div class="chips" id="fSede"></div>
  </div>

  <div class="grupo">
    <div class="lbl">Período</div>
    <div class="chips" id="fPeriodo">
      <div class="chip on" data-w="0">Toda la historia</div>
      <div class="chip" data-w="1">6 meses</div>
      <div class="chip" data-w="2">3 meses</div>
    </div>
  </div>

  <div class="grupo">
    <div class="lbl">Vista</div>
    <div class="chips" id="fVista">
      <div class="chip on" data-v="heat">Mapa de calor</div>
      <div class="chip" data-v="dots">Puntos</div>
    </div>
  </div>

  <div class="grupo">
    <div class="lbl">Precisión de la ubicación</div>
    <div class="chips" id="fPrec">
      <div class="chip on" data-p="2">Toda</div>
      <div class="chip" data-p="1">Casa y calle</div>
      <div class="chip" data-p="0">Solo casa exacta</div>
    </div>
  </div>

  <div class="stats">
    <div class="row"><span>Clientes en el mapa</span><b id="sCli">–</b></div>
    <div class="row"><span>Visitas</span><b id="sVis">–</b></div>
    <div class="row"><span>Visitas por cliente</span><b id="sProm">–</b></div>
  </div>

  <div class="nota">
    Cada punto es la dirección de un cliente, no la clínica. Una visita es un
    cliente en una sede en un día, así que la consulta y la cita del mismo día
    cuentan una sola vez. Un cliente atendido en dos sedes aparece en ambos filtros.<br><br>
    ${meta.ubicados} de ${meta.clientesConVisita} clientes ubicados:
    ${meta.porNivel[0]} a nivel de casa, ${meta.porNivel[1]} solo de calle y
    ${meta.porNivel[2]} solo de barrio. ${meta.sinDireccion} sin dirección en su ficha
    y ${meta.sinUbicar} que no se pudieron geocodificar quedan fuera.<br><br>
    <b>Usa el filtro de precisión para verificar un foco.</b> Los de nivel de barrio
    caen todos en el mismo centroide, así que pueden inventar un punto caliente
    donde en realidad hay gente repartida. Si el foco aguanta en "solo casa exacta",
    es real.<br><br>
    <b>"Toda la historia" arranca en marzo de 2026</b>, que es desde cuando SofVet
    guarda en qué sede se atendió a cada paciente. Lo anterior no está en el mapa.
  </div>
</div>

<script>
const PTS   = ${JSON.stringify(pts)};
const SEDES = ${JSON.stringify(meta.sedes)};
let fSede = 'all', fWin = 0, fVista = 'heat', fPrec = 2;

const map = L.map('map', { zoomControl: true }).setView([3.42, -76.53], 12);
// Esri Dark Gray Canvas: sin API key, con CORS abierto y — a diferencia de los
// otros dos que probamos — funciona abriendo el archivo con doble clic. CARTO
// empezó a estampar "API KEY REQUIRED" sobre cada baldosa, y OpenStreetMap
// responde 403 a las peticiones desde file://. Ojo: Esri ordena la URL
// {z}/{y}/{x}, no {z}/{x}/{y}.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
L.tileLayer(ESRI + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors', maxZoom: 16,
}).addTo(map);
// Capa aparte de nombres de calles y barrios, para poder ubicar cada mancha.
L.tileLayer(ESRI + 'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16, opacity: .8,
}).addTo(map);

// Marcadores de las sedes físicas (Domicilio no tiene dirección fija).
for (const [id, s] of Object.entries(SEDES)) {
  if (s.lat == null) continue;
  L.marker([s.lat, s.lng], {
    icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13], html:
      '<div style="width:26px;height:26px;border-radius:50%;background:' + s.color +
      ';border:3px solid #fff;box-shadow:0 0 0 2px ' + s.color + ',0 2px 8px rgba(0,0,0,.6);' +
      'display:flex;align-items:center;justify-content:center;font:700 12px sans-serif;color:#fff">' +
      s.nombre[0] + '</div>' }),
    zIndexOffset: 1000,
  }).addTo(map).bindPopup('<b>Sede ' + s.nombre + '</b><br>' + s.direccion);
}

let capa = null;

// Visitas de un punto según los filtros activos: suma las sedes seleccionadas
// dentro de la ventana de tiempo elegida.
function peso(p) {
  const porSede = p[3];
  let n = 0;
  if (fSede === 'all') { for (const k in porSede) n += porSede[k][fWin]; }
  else if (porSede[fSede]) n = porSede[fSede][fWin];
  return n;
}

// Color del punto: la sede que más veces atendió a ese cliente en la ventana.
function colorDe(p) {
  if (fSede !== 'all') return SEDES[fSede].color;
  let best = null, max = 0;
  for (const k in p[3]) if (p[3][k][fWin] > max) { max = p[3][k][fWin]; best = k; }
  return best ? SEDES[best].color : '#888';
}

function render() {
  if (capa) { map.removeLayer(capa); capa = null; }

  const vis = [];
  // p[4] es el nivel de precisión: 0 casa, 1 calle, 2 barrio. El filtro deja
  // pasar solo lo que sea igual o mejor que el nivel elegido, para poder
  // comprobar si un foco se sostiene con direcciones exactas o si lo está
  // inflando un montón de gente apilada en el centroide de un barrio.
  for (const p of PTS) {
    if (p[4] > fPrec) continue;
    const n = peso(p);
    if (n > 0) vis.push([p, n]);
  }

  const totalVis = vis.reduce((s, x) => s + x[1], 0);
  document.getElementById('sCli').textContent  = vis.length.toLocaleString('es-CO');
  document.getElementById('sVis').textContent  = totalVis.toLocaleString('es-CO');
  document.getElementById('sProm').textContent = vis.length ? (totalVis / vis.length).toFixed(1) : '–';

  if (!vis.length) return;

  if (fVista === 'heat') {
    // El peso se satura a 10 visitas: sin tope, un cliente con 60 visitas
    // aplasta la escala y el resto del mapa queda en frío.
    capa = L.heatLayer(vis.map(x => [x[0][0], x[0][1], Math.min(x[1], 10) / 10]), {
      radius: 26, blur: 20, maxZoom: 15, minOpacity: .25,
      gradient: { .2: '#1e3a8a', .4: '#0891b2', .6: '#facc15', .8: '#f97316', 1: '#dc2626' },
    }).addTo(map);
  } else {
    capa = L.layerGroup(vis.map(x => {
      const p = x[0], n = x[1], col = colorDe(p);
      const sedesTxt = Object.entries(p[3])
        .filter(e => e[1][fWin] > 0)
        .sort((a, b) => b[1][fWin] - a[1][fWin])
        .map(e => SEDES[e[0]].nombre + ': ' + e[1][fWin])
        .join('<br>');
      return L.circleMarker([p[0], p[1]], {
        radius: Math.min(3 + Math.sqrt(n) * 1.6, 12),
        color: col, weight: 1.2, fillColor: col, fillOpacity: .55,
      }).bindPopup('<b>' + p[2] + '</b><br>' + n + (n === 1 ? ' visita' : ' visitas') +
        '<br><span style="color:#8b95a7">' + sedesTxt + '</span>' +
        (p[4] ? '<br><i style="color:#8b95a7;font-size:11px">Ubicación aproximada: nivel de ' +
          (p[4] === 1 ? 'calle' : 'barrio') + '</i>' : ''));
    })).addTo(map);
  }
}

// ── Controles ───────────────────────────────────────────────────────────────
const cSede = document.getElementById('fSede');
cSede.innerHTML = '<div class="chip on" data-s="all">Todas</div>' +
  Object.entries(SEDES).map(e =>
    '<div class="chip" data-s="' + e[0] + '" data-color style="--c:' + e[1].color + '">' + e[1].nombre + '</div>').join('');

function grupo(el, attr, set) {
  el.addEventListener('click', ev => {
    const chip = ev.target.closest('.chip');
    if (!chip) return;
    el.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    set(chip.dataset[attr]);
    render();
  });
}
grupo(cSede, 's', v => fSede = v);
grupo(document.getElementById('fPeriodo'), 'w', v => fWin = +v);
grupo(document.getElementById('fVista'),   'v', v => fVista = v);
grupo(document.getElementById('fPrec'),    'p', v => fPrec = +v);

render();
<\/script>
</body>
</html>`;
}
