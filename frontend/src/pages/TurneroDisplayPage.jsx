import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const SEDE_ID = 1; // Fase 1: fijo a Santa Mónica
const SEDE_COLOR = '#316d74';
const SEDE_COLOR_DARK = '#1e4e54';

const C = {
  bg: '#f4f6fb',
  panel: '#ffffff',
  border: '#e2e6ef',
  text: '#1c2333',
  muted: '#7c869c',
};

// El logo es un SVG con fill="currentColor" — se inyecta inline (no <img>)
// para poder colorearlo vía CSS `color` según el fondo donde vaya.
function Logo({ color, height = 40 }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    fetch('/logos/pp-02.svg').then(r => r.text()).then(txt => {
      if (!alive) return;
      setSvg(txt.replace('<svg ', '<svg style="height:100%;width:auto;display:block" '));
    });
    return () => { alive = false; };
  }, []);
  return <div style={{ height, color, display: 'inline-flex', alignItems: 'center' }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

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
    const clock = setInterval(() => setNow(new Date()), 15000);
    return () => { supabase.removeChannel(channel); clearInterval(clock); };
  }, [cargar]);

  const principal = llamados[0] || null;
  const otrosLlamados = llamados.slice(1);

  return (
    <div style={{ height: '100vh', width: '100vw', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.1rem 2.2rem', background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo color={SEDE_COLOR} height={40} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: C.text, letterSpacing: '-0.01em' }}>Sala de espera</div>
            <div style={{ color: C.muted, fontSize: '0.95rem', fontWeight: 600 }}>Pets &amp; Pets · Santa Mónica</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
            {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ color: C.muted, fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize' }}>
            {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: '1.4rem', padding: '1.4rem 2.2rem', minHeight: 0 }}>

        {/* Lista de espera */}
        <div style={{ width: '34%', minWidth: 340, background: C.panel, borderRadius: 20, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', padding: '0.9rem 1.4rem', background: '#eef1f8', fontWeight: 700, fontSize: '0.85rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <div style={{ width: 90 }}>Turno</div>
            <div>Paciente</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {esperando.length === 0 ? (
              <div style={{ padding: '2rem 1.4rem', color: C.muted, fontSize: '1rem' }}>No hay nadie más en fila 🎉</div>
            ) : esperando.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', padding: '0.9rem 1.4rem',
                background: i % 2 === 0 ? '#ffffff' : '#f7f9fc',
                borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ width: 90, fontWeight: 800, fontSize: '1.1rem', color: SEDE_COLOR }}>{t.numero}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text }}>{t.tutor_nombre || 'Sin nombre'}</div>
                  <div style={{ fontSize: '0.85rem', color: C.muted }}>🐾 {t.mascota_nombre || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel de llamado */}
        <div style={{
          flex: 1, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          background: `linear-gradient(155deg, ${SEDE_COLOR}, ${SEDE_COLOR_DARK})`, position: 'relative',
        }}>
          <div style={{ padding: '1.1rem 1.8rem', background: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            Puede pasar
          </div>

          {principal ? (
            <div key={principal.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.4s ease' }}>
              <div style={{ fontSize: 'min(11vw, 8rem)', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.02em' }}>
                {principal.numero}
              </div>
              <div style={{ marginTop: '1.2rem', fontSize: '2.1rem', fontWeight: 800, color: 'white', textAlign: 'center', padding: '0 2rem' }}>
                {principal.tutor_nombre || 'Sin nombre'}
              </div>
              <div style={{ marginTop: '0.4rem', fontSize: '1.3rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                🐾 {principal.mascota_nombre || '—'}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <Logo color="rgba(255,255,255,0.35)" height={90} />
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.3rem', fontWeight: 700 }}>Bienvenido a Pets &amp; Pets</div>
            </div>
          )}

          {otrosLlamados.length > 0 && (
            <div style={{ display: 'flex', gap: '0.8rem', padding: '1.2rem 1.8rem', background: 'rgba(0,0,0,0.15)', overflowX: 'auto' }}>
              {otrosLlamados.map(t => (
                <div key={t.id} style={{
                  background: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: '0.6rem 1.1rem',
                  color: 'white', flexShrink: 0, textAlign: 'center',
                }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{t.numero}</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>{t.tutor_nombre}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
