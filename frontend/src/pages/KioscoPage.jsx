import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../utils/supabaseClient';

// Fase 1: fijo a Santa Mónica. Cuando se active en más sedes, esto pasa a venir
// de la URL (?sede=2) o de un selector en pantalla.
const SEDE_ID = 1;
const MIN_POR_TURNO = 10; // estimado simple, sin datos históricos aún

const C = {
  bg: '#FFF9F4', teal: '#316d74', tealDark: '#1e4e54', tealLight: '#e8f5f6',
  cream: '#FDF6EE', border: '#E8D9C8', gold: '#B8873A',
  text: '#2D2D2D', muted: '#8A8076', danger: '#C0392B', dangerBg: '#FFF0EE',
  success: '#1e7d45', successBg: '#eafaf0',
};

const bigInp = {
  width: '100%', padding: '1.1rem 1.2rem', border: `2px solid ${C.border}`,
  borderRadius: 16, fontSize: '1.4rem', fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: 'white', color: C.text, textAlign: 'center',
};

const bigBtn = (bg, color = 'white') => ({
  padding: '1.3rem 1.5rem', background: bg, color, border: 'none', borderRadius: 18,
  cursor: 'pointer', fontWeight: 800, fontSize: '1.15rem', fontFamily: 'inherit',
  boxShadow: '0 6px 20px rgba(0,0,0,0.12)', width: '100%',
});

// Prefijo de numeración por tipo de servicio. Se combina con A- (agendado)
// o NA- (no agendado), ej: A-C-001, NA-LAB-001. Cada combinación tiene su
// propio contador que reinicia en 001 cada día.
const TIPO_PREFIJO = {
  'Urgencia': 'URG',
  'Consulta general': 'C',
  'Consulta especialista': 'CE',
  'Vacunación': 'VAC',
  'Laboratorio': 'LAB',
  'Imagenología (Rx / Ecografía)': 'IMAG',
  'Visita hospitalizado': 'VH',
  'Otro': 'OTR',
};
const AGENDADO_TIPOS = ['Consulta general', 'Consulta especialista', 'Vacunación', 'Laboratorio', 'Imagenología (Rx / Ecografía)', 'Visita hospitalizado', 'Otro'];
const NO_AGENDADO_TIPOS = ['Urgencia', 'Consulta general', 'Vacunación', 'Laboratorio', 'Imagenología (Rx / Ecografía)', 'Visita hospitalizado', 'Otro'];

function todayStartISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function KioscoPage() {
  // home | agendado | tipo | existente | nuevo | confirmado
  const [screen, setScreen] = useState('home');
  const [esClienteExistente, setEsClienteExistente] = useState(null);
  const [agendado, setAgendado] = useState(null);
  const [tipoTurno, setTipoTurno] = useState(null);
  const [otroDetalle, setOtroDetalle] = useState('');

  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [clienteEncontrado, setClienteEncontrado] = useState(null); // { id, name }
  const [mascotas, setMascotas] = useState(null); // lista para elegir si hay >1

  const [turno, setTurno] = useState(null); // { id, numero, personasAntes, mins }
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [countdown, setCountdown] = useState(15);

  const resetAll = () => {
    setScreen('home');
    setEsClienteExistente(null);
    setAgendado(null);
    setTipoTurno(null);
    setOtroDetalle('');
    setCedula('');
    setErr('');
    setClienteEncontrado(null);
    setMascotas(null);
    setTurno(null);
    setQrDataUrl('');
  };

  const irACedula = () => {
    setCedula('');
    setErr('');
    setMascotas(null);
    setScreen(esClienteExistente ? 'existente' : 'nuevo');
  };

  const elegirTipo = (t) => {
    setTipoTurno(t);
    if (t !== 'Otro') setScreen(esClienteExistente ? 'existente' : 'nuevo');
  };

  // Cuenta regresiva en la pantalla de confirmación → vuelve a home sola
  useEffect(() => {
    if (screen !== 'confirmado') return;
    setCountdown(15);
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(iv); resetAll(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [screen]);

  async function crearTurno({ clientId, patientId, tutorNombre, mascotaNombre, esClienteNuevo }) {
    setLoading(true);
    setErr('');
    try {
      const prefijo = `${agendado ? 'A' : 'NA'}-${TIPO_PREFIJO[tipoTurno]}`;

      const { count } = await supabase
        .from('turnos_espera')
        .select('id', { count: 'exact', head: true })
        .eq('sede_id', SEDE_ID)
        .gte('created_at', todayStartISO())
        .like('numero', `${prefijo}-%`);
      const numero = `${prefijo}-${String((count || 0) + 1).padStart(3, '0')}`;

      const { data, error } = await supabase.from('turnos_espera').insert({
        sede_id: SEDE_ID,
        numero,
        client_id: clientId || null,
        patient_id: patientId || null,
        tutor_nombre: tutorNombre || null,
        tutor_cedula: cedula.trim(),
        mascota_nombre: mascotaNombre || null,
        es_cliente_nuevo: !!esClienteNuevo,
        tipo_turno: tipoTurno,
        tiene_cita: !!agendado,
        otro_detalle: tipoTurno === 'Otro' ? (otroDetalle.trim() || null) : null,
        estado: 'esperando',
      }).select().single();

      if (error) { setErr('No se pudo crear el turno: ' + error.message); setLoading(false); return; }

      const { count: antes } = await supabase
        .from('turnos_espera')
        .select('id', { count: 'exact', head: true })
        .eq('sede_id', SEDE_ID)
        .eq('estado', 'esperando')
        .lt('created_at', data.created_at);

      const url = `${window.location.origin}/prueba/turno/${data.id}`;
      const qr = await QRCode.toDataURL(url, { width: 260, margin: 1, color: { dark: C.tealDark, light: '#ffffff' } });
      setQrDataUrl(qr);
      setTurno({ id: data.id, numero, personasAntes: antes || 0, mins: (antes || 0) * MIN_POR_TURNO });
      setScreen('confirmado');
    } finally {
      setLoading(false);
    }
  }

  async function buscarCliente() {
    const doc = cedula.trim();
    if (!doc) return;
    setLoading(true);
    setErr('');
    const { data: cls } = await supabase.from('clients').select('id,name').eq('document', doc);
    if (!cls?.length) {
      setLoading(false);
      setErr('No encontramos esa cédula. Si es tu primera vez con nosotros, elige "Soy nuevo" en la pantalla anterior.');
      return;
    }
    const cl = cls[0];
    const { data: pets } = await supabase.from('patients').select('id,name').eq('client_id', cl.id);
    setLoading(false);
    setClienteEncontrado(cl);
    if (!pets?.length) {
      crearTurno({ clientId: cl.id, tutorNombre: cl.name });
    } else if (pets.length === 1) {
      crearTurno({ clientId: cl.id, patientId: pets[0].id, tutorNombre: cl.name, mascotaNombre: pets[0].name });
    } else {
      setMascotas(pets);
    }
  }

  async function crearTurnoNuevo() {
    const doc = cedula.trim();
    if (!doc) return;
    await crearTurno({ esClienteNuevo: true });
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 560, background: C.cream, border: `1px solid ${C.border}`, borderRadius: 28, padding: '2.5rem 2.2rem', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>

        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{ fontSize: '2.4rem' }}>🐾</div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: C.tealDark }}>Pets &amp; Pets — Santa Mónica</div>
          <div style={{ color: C.muted, fontSize: '0.95rem' }}>Pide tu turno</div>
        </div>

        {screen === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button style={bigBtn(C.teal)} onClick={() => { setEsClienteExistente(true); setScreen('agendado'); }}>✅ Ya soy cliente</button>
            <button style={bigBtn('white', C.tealDark)} onClick={() => { setEsClienteExistente(false); setScreen('agendado'); }}>
              🆕 Soy nuevo
            </button>
          </div>
        )}

        {screen === 'agendado' && (
          <div>
            <p style={{ color: C.text, fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>¿Ya tienes una cita agendada?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button style={bigBtn(C.teal)} onClick={() => { setAgendado(true); setScreen('tipo'); }}>📅 Sí, estoy agendado</button>
              <button style={bigBtn('white', C.tealDark)} onClick={() => { setAgendado(false); setScreen('tipo'); }}>🚶 No, no tengo cita</button>
            </div>
            <button style={{ ...bigBtn('transparent', C.muted), boxShadow: 'none', marginTop: '1rem', fontSize: '0.9rem' }} onClick={resetAll}>← Atrás</button>
          </div>
        )}

        {screen === 'tipo' && (
          <div>
            <p style={{ color: C.text, fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>¿Qué necesitas hoy?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(agendado ? AGENDADO_TIPOS : NO_AGENDADO_TIPOS).map(t => (
                <button key={t}
                  style={bigBtn(tipoTurno === t ? C.teal : C.tealLight, tipoTurno === t ? 'white' : C.tealDark)}
                  onClick={() => elegirTipo(t)}>
                  {t}
                </button>
              ))}
            </div>

            {tipoTurno === 'Otro' && (
              <div style={{ marginTop: '1rem' }}>
                <input
                  style={bigInp}
                  value={otroDetalle}
                  onChange={e => setOtroDetalle(e.target.value)}
                  placeholder="Cuéntanos brevemente (opcional)"
                />
                <button style={{ ...bigBtn(C.teal), marginTop: '0.8rem' }} onClick={irACedula}>Continuar</button>
              </div>
            )}

            <button style={{ ...bigBtn('transparent', C.muted), boxShadow: 'none', marginTop: '1rem', fontSize: '0.9rem' }} onClick={() => setScreen('agendado')}>← Atrás</button>
          </div>
        )}

        {screen === 'existente' && (
          <div>
            <p style={{ color: C.text, fontWeight: 600, marginBottom: '0.8rem' }}>Escribe tu número de cédula</p>
            <input
              style={bigInp}
              type="tel"
              inputMode="numeric"
              autoFocus
              value={cedula}
              onChange={e => setCedula(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && buscarCliente()}
              placeholder="Número de cédula"
            />
            {err && <p style={{ color: C.danger, fontSize: '0.9rem', marginTop: '0.6rem' }}>{err}</p>}

            {mascotas && (
              <div style={{ marginTop: '1.2rem' }}>
                <p style={{ fontWeight: 600, color: C.text }}>¿A cuál mascota traes hoy?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {mascotas.map(m => (
                    <button key={m.id} style={bigBtn(C.tealLight, C.tealDark)}
                      onClick={() => crearTurno({ clientId: clienteEncontrado.id, patientId: m.id, tutorNombre: clienteEncontrado.name, mascotaNombre: m.name })}>
                      🐾 {m.name}
                    </button>
                  ))}
                  <button style={{ ...bigBtn('transparent', C.muted), boxShadow: 'none', fontSize: '0.9rem' }}
                    onClick={() => crearTurno({ clientId: clienteEncontrado.id, tutorNombre: clienteEncontrado.name })}>
                    Omitir, no importa cuál
                  </button>
                </div>
              </div>
            )}

            {!mascotas && (
              <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.4rem' }}>
                <button style={{ ...bigBtn('white', C.muted), flex: 1 }} onClick={() => setScreen('tipo')}>← Atrás</button>
                <button style={{ ...bigBtn(C.teal), flex: 2 }} disabled={loading || !cedula.trim()} onClick={buscarCliente}>
                  {loading ? 'Buscando…' : 'Continuar'}
                </button>
              </div>
            )}
          </div>
        )}

        {screen === 'nuevo' && (
          <div>
            <p style={{ color: C.text, fontWeight: 600, marginBottom: '0.4rem' }}>¡Bienvenido! Primero, tu cédula</p>
            <p style={{ color: C.muted, fontSize: '0.88rem', marginBottom: '0.8rem' }}>Con esto ya te damos tu turno. Después de esto podrás escanear un código QR con tu celular para contarnos el motivo de tu visita — pero si no puedes, no hay problema, igual te atendemos.</p>
            <input
              style={bigInp}
              type="tel"
              inputMode="numeric"
              autoFocus
              value={cedula}
              onChange={e => setCedula(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && crearTurnoNuevo()}
              placeholder="Número de cédula"
            />
            {err && <p style={{ color: C.danger, fontSize: '0.9rem', marginTop: '0.6rem' }}>{err}</p>}
            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.4rem' }}>
              <button style={{ ...bigBtn('white', C.muted), flex: 1 }} onClick={() => setScreen('tipo')}>← Atrás</button>
              <button style={{ ...bigBtn(C.teal), flex: 2 }} disabled={loading || !cedula.trim()} onClick={crearTurnoNuevo}>
                {loading ? 'Creando turno…' : 'Obtener mi turno'}
              </button>
            </div>
          </div>
        )}

        {screen === 'confirmado' && turno && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.95rem', color: C.muted, marginBottom: '0.3rem' }}>Tu turno es</div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: C.tealDark, lineHeight: 1 }}>{turno.numero}</div>
            <div style={{ marginTop: '0.8rem', background: C.successBg, color: C.success, borderRadius: 12, padding: '0.7rem 1rem', fontWeight: 700 }}>
              {turno.personasAntes === 0 ? 'Eres el siguiente' : `${turno.personasAntes} persona(s) antes de ti`}
              {' · '}~{turno.mins || MIN_POR_TURNO} min de espera aprox.
            </div>

            <div style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'white', borderRadius: 18, border: `1px solid ${C.border}` }}>
              <p style={{ fontWeight: 700, color: C.text, marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                📱 Escanea este código con tu celular
              </p>
              <p style={{ color: C.muted, fontSize: '0.82rem', marginBottom: '0.9rem' }}>
                Para contarnos el motivo de tu visita (opcional, nos ayuda a atenderte más rápido)
              </p>
              {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: 200, height: 200 }} />}
              <div style={{ marginTop: '0.8rem', color: C.muted, fontSize: '0.8rem' }}>
                Volviendo al inicio en {countdown}s…
              </div>
            </div>

            <button style={{ ...bigBtn('white', C.muted), marginTop: '1.2rem', fontSize: '0.9rem' }} onClick={resetAll}>
              Listo, terminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
