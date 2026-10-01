import { useEffect, useMemo, useRef, useState } from 'react';
import { siigo } from '../utils/siigo';

// El catálogo de Siigo son ~2.900 productos activos, así que no cabe en un
// select. Se carga una sola vez por sesión —la función de Netlify además lo
// cachea una hora— y se filtra en memoria mientras el cajero escribe.
let _catalogo = null;
let _cargando = null;

// La primera carga después de que expira la caché del servidor puede pasarse
// del tiempo límite: son ~2.900 productos que el proxy pagina de 200 en 200
// contra Siigo. Esa llamada igual deja la caché caliente, así que el reintento
// casi siempre entra de una.
async function traerConReintento(intentos = 3) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await siigo.getAllProducts();
      return r.results || [];
    } catch (e) {
      ultimo = e;
      if (i < intentos - 1) await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw ultimo;
}

function cargarCatalogo() {
  if (_catalogo) return Promise.resolve(_catalogo);
  if (!_cargando) {
    _cargando = traerConReintento()
      .then((lista) => { _catalogo = lista; return _catalogo; })
      .catch((e) => { _cargando = null; throw e; });
  }
  return _cargando;
}

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const fmtCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

/**
 * Buscador de conceptos de Siigo. Al elegir uno devuelve su código, nombre,
 * precio e impuesto, para que quien factura no tenga que teclear nada de eso.
 */
export default function SiigoConceptoPicker({ valor, onElegir, placeholder = 'Buscar concepto en Siigo…', autoFocus }) {
  const [texto, setTexto] = useState(valor || '');
  const [abierto, setAbierto] = useState(false);
  const [catalogo, setCatalogo] = useState(_catalogo);
  const [error, setError] = useState('');
  const caja = useRef(null);

  useEffect(() => { setTexto(valor || ''); }, [valor]);

  useEffect(() => {
    if (_catalogo) return;
    cargarCatalogo().then(setCatalogo).catch((e) => setError(e.message || 'No se pudo cargar el catálogo de Siigo.'));
  }, []);

  // Cerrar al hacer clic por fuera
  useEffect(() => {
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const resultados = useMemo(() => {
    const q = norm(texto).trim();
    if (!catalogo || q.length < 2) return [];
    const palabras = q.split(/\s+/);
    // Se exigen todas las palabras, en cualquier orden: "consulta especialista"
    // encuentra "CONSULTA CON ESPECIALISTA".
    return catalogo
      .filter((p) => {
        const h = norm(p.name) + ' ' + (p.code || '');
        return palabras.every((w) => h.includes(w));
      })
      .slice(0, 40);
  }, [texto, catalogo]);

  const elegir = (p) => {
    onElegir({
      code: p.code,
      nombre: p.name,
      precio: Math.round(Number(p.price) || 0),
      taxId: p.tax_id ?? null,
      taxPct: Number(p.tax_pct) || 0,
    });
    setTexto(p.name);
    setAbierto(false);
  };

  const inp = {
    width: '100%', padding: '0.5rem 0.6rem', borderRadius: 8,
    border: '1.5px solid #dfe3ea', fontSize: '0.85rem', fontFamily: 'inherit',
  };

  return (
    <div ref={caja} style={{ position: 'relative' }}>
      <input
        value={texto}
        autoFocus={autoFocus}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        placeholder={catalogo ? placeholder : 'Cargando catálogo de Siigo…'}
        disabled={!catalogo && !error}
        style={inp}
      />

      {error && (
        <div style={{ fontSize: '0.72rem', color: '#c0392b', marginTop: 2 }}>
          ⚠️ {error}{' '}
          <button
            onClick={() => { setError(''); _cargando = null; cargarCatalogo().then(setCatalogo).catch(e => setError(e.message)); }}
            style={{ background: 'none', border: 'none', color: '#c0392b', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.72rem', padding: 0 }}
          >Reintentar</button>
        </div>
      )}

      {abierto && texto.trim().length >= 2 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 2,
          background: 'white', border: '1px solid #dfe3ea', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 260, overflowY: 'auto',
        }}>
          {resultados.length === 0 ? (
            <div style={{ padding: '0.6rem 0.7rem', fontSize: '0.8rem', color: '#8A8076' }}>
              Sin resultados en Siigo para «{texto}»
            </div>
          ) : resultados.map((p) => (
            <button
              key={p.code}
              onClick={() => elegir(p)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.7rem',
                background: 'white', border: 'none', borderBottom: '1px solid #f2f4f7',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f4f8f7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1c2333' }}>{p.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#8A8076' }}>
                {p.code} · {fmtCOP(p.price)}
                {p.tax_pct > 0 ? ` · IVA ${p.tax_pct}%` : ' · sin IVA'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
