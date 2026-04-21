import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../utils/useAuth';

const fmt = (ts) => {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
};

export default function CertificadosViajePage() {
  const { session } = useAuth();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('pendiente');
  const [marking, setMarking] = useState(null);

  const load = async () => {
    setLoading(true);
    const q = supabase.from('certificados_viaje').select('*').order('created_at', { ascending: false });
    if (filter !== 'todos') q.eq('estado', filter);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleRemitido = async (id) => {
    setMarking(id);
    await supabase.from('certificados_viaje').update({
      estado:       'remitido',
      remitido_por: session?.nombre || 'Desconocido',
    }).eq('id', id);
    setMarking(null);
    load();
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.4rem', margin: '0 0 0.2rem' }}>Certificados de Viaje</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>Solicitudes recibidas desde el portal de clientes</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['pendiente', 'remitido', 'todos'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '0.4rem 1rem', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
                background: filter === f ? 'var(--color-primary)' : 'var(--color-bg-card)',
                color: filter === f ? 'white' : 'var(--color-text-muted)',
                boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
              }}>
              {f === 'pendiente' ? '⏳ Pendientes' : f === 'remitido' ? '✅ Remitidos' : '📋 Todos'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Cargando…</div>
      ) : rows.length === 0 ? (
        <div style={{ background: 'var(--color-bg-card)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✈️</div>
          <p style={{ margin: 0 }}>No hay solicitudes {filter !== 'todos' ? `con estado "${filter}"` : ''}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map(r => (
            <div key={r.id} style={{
              background: 'var(--color-bg-card)', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
              border: r.estado === 'pendiente' ? '1.5px solid #f5c84230' : '1.5px solid #2e7d5030',
            }}>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                {/* Left: main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>
                      {r.especie === 'Perro' ? '🐶' : '🐱'} {r.nombre_mascota}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.especie} · {r.edad_mascota}</span>
                    <span style={{
                      background: r.estado === 'pendiente' ? '#fff8e1' : '#e8f5f0',
                      color: r.estado === 'pendiente' ? '#b8860b' : '#2e7d50',
                      borderRadius: 999, fontSize: '0.67rem', fontWeight: 700, padding: '2px 9px',
                    }}>
                      {r.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Remitido'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.3rem 1.5rem', fontSize: '0.8rem' }}>
                    <div><span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Tutor:</span> {r.nombre_tutor}</div>
                    <div><span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Cédula:</span> {r.cedula_tutor}</div>
                    <div><span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Teléfono:</span> {r.telefono}</div>
                    <div><span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Destino:</span> {r.destino}</div>
                    <div><span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Fecha tentativa:</span> {r.fecha_tentativa}</div>
                    <div><span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Solicitud:</span> {fmt(r.created_at)}</div>
                    {r.estado === 'remitido' && r.remitido_por && (
                      <div><span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Remitido por:</span> {r.remitido_por}</div>
                    )}
                  </div>
                </div>

                {/* Right: action */}
                {r.estado === 'pendiente' && (
                  <button
                    onClick={() => handleRemitido(r.id)}
                    disabled={marking === r.id}
                    style={{
                      padding: '0.5rem 1.25rem', background: 'var(--color-primary)', color: 'white',
                      border: 'none', borderRadius: 'var(--radius-sm)', cursor: marking === r.id ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap',
                      opacity: marking === r.id ? 0.6 : 1,
                    }}>
                    {marking === r.id ? 'Guardando…' : '✅ Remitido'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
