import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const SEDE_ID = 1; // Fase 1: fijo a Santa Mónica

const C = {
  bg: '#FFF9F4', teal: '#316d74', tealDark: '#1e4e54',
  cream: '#FDF6EE', border: '#E8D9C8',
  text: '#2D2D2D', muted: '#8A8076',
  llamadoBg: '#fff4d6', llamadoBorder: '#e0a92b',
};

export default function TurneroDisplayPage() {
  const [llamados, setLlamados] = useState([]);
  const [esperando, setEsperando] = useState([]);
  const [now, setNow] = useState(new Date());

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('turnos_espera')
      .select('*')
      .eq('sede_id', SEDE_ID)
      .in('estado', ['esperando', 'llamado'])
      .order('created_at', { ascending: true });
    if (!data) return;
    setLlamados(data.filter(t => t.estado === 'llamado').sort((a, b) => new Date(b.llamado_at) - new Date(a.llamado_at)));
    setEsperando(data.filter(t => t.estado === 'esperando'));
  }, []);

  useEffect(() => {
    cargar();
    const channel = supabase
      .channel('turnero_display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos_espera', filter: `sede_id=eq.${SEDE_ID}` }, cargar)
      .subscribe();
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => { supabase.removeChannel(channel); clearInterval(clock); };
  }, [cargar]);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '2.5rem 3rem', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.6rem' }}>🐾</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '2rem', color: C.tealDark }}>Sala de espera — Santa Mónica</div>
            <div style={{ color: C.muted, fontSize: '1.1rem' }}>Pets &amp; Pets</div>
          </div>
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: C.text }}>
          {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {llamados.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.text, marginBottom: '1rem' }}>👉 Pueden pasar</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {llamados.map(t => (
              <div key={t.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: C.llamadoBg, border: `3px solid ${C.llamadoBorder}`, borderRadius: 24,
                padding: '1.4rem 2rem', animation: 'pulse 2s infinite',
              }}>
                <div style={{ fontSize: '2.6rem', fontWeight: 900, color: C.tealDark }}>{t.numero}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.7rem', fontWeight: 800, color: C.text }}>{t.tutor_nombre || 'Sin nombre'}</div>
                  <div style={{ fontSize: '1.2rem', color: C.muted }}>🐾 {t.mascota_nombre || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.text, marginBottom: '1rem' }}>En espera</div>
        {esperando.length === 0 ? (
          <div style={{ color: C.muted, fontSize: '1.2rem' }}>No hay nadie más en fila 🎉</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {esperando.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'white', border: `2px solid ${C.border}`, borderRadius: 18, padding: '1rem 1.3rem',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: C.teal, minWidth: 70 }}>{t.numero}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: C.text }}>{t.tutor_nombre || 'Sin nombre'}</div>
                  <div style={{ fontSize: '0.95rem', color: C.muted }}>🐾 {t.mascota_nombre || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,169,43,0.4); }
          50% { box-shadow: 0 0 0 14px rgba(224,169,43,0); }
        }
      `}</style>
    </div>
  );
}
