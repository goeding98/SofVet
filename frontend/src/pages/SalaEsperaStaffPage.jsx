import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../utils/useAuth';

const SEDE_ID = 1; // Fase 1: fijo a Santa Mónica

export default function SalaEsperaStaffPage() {
  const { session } = useAuth();
  const [esperando, setEsperando] = useState([]);
  const [llamados, setLlamados] = useState([]);
  const [busy, setBusy] = useState(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('turnos_espera')
      .select('*')
      .eq('sede_id', SEDE_ID)
      .in('estado', ['esperando', 'llamado'])
      .order('created_at', { ascending: true });
    if (!data) return;
    const porPrioridad = (a, b) => (a.prioridad || 99) - (b.prioridad || 99) || new Date(a.created_at) - new Date(b.created_at);
    setEsperando(data.filter(t => t.estado === 'esperando').sort(porPrioridad));
    setLlamados(data.filter(t => t.estado === 'llamado'));
  }, []);

  useEffect(() => {
    cargar();
    const channel = supabase
      .channel('turnero_staff')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos_espera', filter: `sede_id=eq.${SEDE_ID}` }, cargar)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [cargar]);

  const llamar = async (id) => {
    setBusy(id);
    await supabase.from('turnos_espera').update({ estado: 'llamado', llamado_at: new Date().toISOString() }).eq('id', id);
    setBusy(null);
  };
  const atender = async (id) => {
    setBusy(id);
    await supabase.from('turnos_espera').update({ estado: 'atendido', atendido_at: new Date().toISOString() }).eq('id', id);
    setBusy(null);
  };
  const devolver = async (id) => {
    setBusy(id);
    await supabase.from('turnos_espera').update({ estado: 'esperando', llamado_at: null }).eq('id', id);
    setBusy(null);
  };
  const cancelar = async (id) => {
    if (!confirm('¿Cancelar este turno?')) return;
    setBusy(id);
    await supabase.from('turnos_espera').update({ estado: 'cancelado' }).eq('id', id);
    setBusy(null);
  };

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.3rem' }}>🎫 Sala de espera — Santa Mónica</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Página de prueba. Sesión: {session?.username} · {session?.rol}
          </p>
        </div>
        <Link to="/prueba/triage" style={{ flexShrink: 0, padding: '0.55rem 1.1rem', background: '#316d74', color: 'white', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
          🚦 Ir a Triage
        </Link>
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.8rem' }}>Llamados ({llamados.length})</h2>
        {llamados.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Nadie llamado en este momento.</p>}
        {llamados.map(t => (
          <Card key={t.id} t={t}>
            {!t.triage_id && <Link to={`/prueba/triage?turno=${t.id}`} style={btnTriageLink}>🚦 Comenzar triage</Link>}
            <button onClick={() => atender(t.id)} disabled={busy === t.id} style={btnPrimary}>✅ Marcar atendido</button>
            <button onClick={() => devolver(t.id)} disabled={busy === t.id} style={btnGhost}>↩️ Volver a fila</button>
          </Card>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.8rem' }}>En espera ({esperando.length})</h2>
        {esperando.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No hay nadie en fila.</p>}
        {esperando.map(t => (
          <Card key={t.id} t={t}>
            {!t.triage_id && <Link to={`/prueba/triage?turno=${t.id}`} style={btnTriageLink}>🚦 Comenzar triage</Link>}
            <button onClick={() => llamar(t.id)} disabled={busy === t.id} style={btnPrimary}>📢 Llamar</button>
            <button onClick={() => cancelar(t.id)} disabled={busy === t.id} style={btnGhost}>✕ Cancelar</button>
          </Card>
        ))}
      </section>
    </div>
  );
}

const PRIORIDAD_BADGE = {
  1: { label: '🔴 Emergencia', color: '#c0392b', bg: '#fdecea' },
  2: { label: '🟠 Urgente', color: '#c2740c', bg: '#fff3e0' },
  3: { label: '🟡 Semi-urgente', color: '#a3830a', bg: '#fffbe6' },
  4: { label: '🟢 Rutina', color: '#1e7d45', bg: '#eafaf0' },
};

function Card({ t, children }) {
  const badge = PRIORIDAD_BADGE[t.prioridad];
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
      background: 'white', border: '1px solid var(--color-border)', borderRadius: 14,
      padding: '1rem 1.2rem', marginBottom: '0.7rem',
    }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
          {t.numero} — {t.tutor_nombre || 'Sin nombre'}
          {t.es_cliente_nuevo && <span style={{ fontSize: '0.7rem', background: '#e8f0ff', color: '#2e5cbf', padding: '2px 8px', borderRadius: 999, marginLeft: 6 }}>nuevo</span>}
          {badge && <span style={{ fontSize: '0.7rem', fontWeight: 800, background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 999, marginLeft: 6 }}>{badge.label}</span>}
          {!badge && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#f0f2f6', color: '#8A8076', padding: '2px 8px', borderRadius: 999, marginLeft: 6 }}>sin triage</span>}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          🐾 {t.mascota_nombre || '—'} · CC {t.tutor_cedula || '—'}
        </div>
        {t.motivo_consulta && <div style={{ fontSize: '0.85rem', color: '#2D2D2D', marginTop: '0.3rem' }}>💬 {t.motivo_consulta}</div>}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const btnPrimary = {
  padding: '0.55rem 1rem', background: '#316d74', color: 'white', border: 'none',
  borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
};
const btnGhost = {
  padding: '0.55rem 1rem', background: 'white', color: '#8A8076', border: '1px solid var(--color-border)',
  borderRadius: 10, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
};
const btnTriageLink = {
  padding: '0.55rem 1rem', background: '#fff8e6', color: '#a3830a', border: '1px solid #f0d98c',
  borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none',
  display: 'inline-flex', alignItems: 'center',
};
