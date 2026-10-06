import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

// Contrato firmado de cada mascota afiliada, en PDF o en fotos. No hay tabla:
// los archivos viven en Storage bajo prepagada-contratos/<afiliadoId>/ y la
// lista se lee de la carpeta. Mismo bucket que los reportes de laboratorio.
// La política del bucket permite subir y listar pero no borrar desde la app,
// así que un contrato subido queda guardado (para corregir, se sube otro).
const BUCKET = 'laboratorios-reports';
const carpeta = id => `prepagada-contratos/${id}`;

// Storage rechaza tildes, espacios y varios símbolos en las llaves.
const limpiarNombre = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').slice(-80);

// Prefijo de fecha y hora para que la lista salga en orden y no se pisen dos
// fotos con el mismo nombre ("IMG_0001.jpg" de dos celulares distintos).
const sello = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);

const nombreVisible = n => n.replace(/^\d{8}_\d{6}_/, '');
const esImagen = n => /\.(jpe?g|png|webp|heic|gif)$/i.test(n);

export default function ContratosPrepagada({ afiliadoId }) {
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase.storage.from(BUCKET).list(carpeta(afiliadoId), {
      limit: 100, sortBy: { column: 'name', order: 'desc' },
    });
    if (error) setErr('No se pudo leer la lista de contratos: ' + error.message);
    else setArchivos((data || []).filter(f => f.id && f.name !== '.emptyFolderPlaceholder'));
    setCargando(false);
  }, [afiliadoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const subir = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setSubiendo(true);
    setErr('');
    const fallidos = [];
    for (const file of files) {
      const path = `${carpeta(afiliadoId)}/${sello()}_${limpiarNombre(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
      if (error) fallidos.push(`${file.name} (${error.message})`);
    }
    if (fallidos.length) setErr('No se pudieron subir: ' + fallidos.join(', '));
    setSubiendo(false);
    cargar();
  };

  const urlDe = n => supabase.storage.from(BUCKET).getPublicUrl(`${carpeta(afiliadoId)}/${n}`).data.publicUrl;

  return (
    <div style={{ background: 'white', border: '1px solid #e2e6ef', borderRadius: 14, padding: '1.2rem 1.5rem', marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: archivos.length || err ? '0.9rem' : 0 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5c6470', textTransform: 'uppercase' }}>
          Contrato {archivos.length > 0 && `· ${archivos.length} ${archivos.length === 1 ? 'archivo' : 'archivos'}`}
        </span>
        {!cargando && archivos.length === 0 && (
          <span style={{ fontSize: '0.8rem', color: '#b8860b', fontWeight: 600 }}>Aún no se ha subido el contrato firmado</span>
        )}
        <input ref={input} type="file" accept="application/pdf,image/*" multiple onChange={subir} style={{ display: 'none' }} />
        <button
          onClick={() => input.current?.click()}
          disabled={subiendo}
          title="PDF o fotos del contrato firmado. Puedes elegir varias fotos a la vez."
          style={{ marginLeft: 'auto', padding: '0.45rem 0.9rem', background: '#eef6f6', color: '#316d74', border: '1.5px solid #316d74', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: subiendo ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: subiendo ? 0.6 : 1 }}
        >
          📎 {subiendo ? 'Subiendo…' : 'Subir contrato'}
        </button>
      </div>

      {err && <div style={{ color: '#c0392b', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.6rem' }}>⚠️ {err}</div>}

      {archivos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem' }}>
          {archivos.map(f => (
            <a
              key={f.id}
              href={urlDe(f.name)}
              target="_blank"
              rel="noreferrer"
              title="Abrir"
              style={{ width: 120, border: '1px solid #e2e6ef', borderRadius: 10, overflow: 'hidden', textDecoration: 'none', color: '#2d2d2d', background: '#fafbfc' }}
            >
              <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f6' }}>
                {esImagen(f.name)
                  ? <img src={urlDe(f.name)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '2rem' }}>📄</span>}
              </div>
              <div style={{ padding: '0.35rem 0.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombreVisible(f.name)}</div>
                <div style={{ fontSize: '0.68rem', color: '#8A8076' }}>{(f.created_at || '').slice(0, 10)}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
