import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import OnScreenKeyboard from '../components/OnScreenKeyboard';

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

// Campo de texto que abre el teclado en pantalla en vez de depender del
// teclado nativo del tablet (no siempre aparece confiable en modo kiosco).
function CampoConTeclado({ label, value, activo, onActivar, multiline, placeholder }) {
  const InputTag = multiline ? 'textarea' : 'input';
  return (
    <div style={{ marginBottom: '0.9rem', textAlign: 'left' }}>
      {label && <span style={{ fontWeight: 600, color: C.text, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' }}>{label}</span>}
      <InputTag
        readOnly
        onClick={onActivar}
        value={value}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        style={{
          ...bigInp, textAlign: 'left', fontSize: '1.1rem', cursor: 'pointer',
          border: `2px solid ${activo ? C.teal : C.border}`,
          resize: multiline ? 'none' : undefined,
        }}
      />
    </div>
  );
}

export default function KioscoPage() {
  // home | agendado | tipo | existente | nuevo | datos | confirmado
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
  const [mascotaConocida, setMascotaConocida] = useState(null); // { id, name } si ya se sabe cuál es

  // Datos que se llenan directo en la tablet (reemplaza el QR)
  const [datos, setDatos] = useState({ nombre: '', telefono: '', mascota: '', especie: 'Perro', motivo: '' });
  const [campoActivo, setCampoActivo] = useState(null); // 'nombre'|'telefono'|'mascota'|'motivo'|null

  const [turno, setTurno] = useState(null); // { id, numero, personasAntes, mins }
  const [countdown, setCountdown] = useState(8);

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
    setMascotaConocida(null);
    setDatos({ nombre: '', telefono: '', mascota: '', especie: 'Perro', motivo: '' });
    setCampoActivo(null);
    setTurno(null);
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
    setCountdown(8);
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(iv); resetAll(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [screen]);

  async function finalizarTurno() {
    setLoading(true);
    setErr('');
    try {
      let clientId = clienteEncontrado?.id || null;
      let patientId = mascotaConocida?.id || null;
      let tutorNombre = clienteEncontrado?.name || null;
      let mascotaNombre = mascotaConocida?.name || null;

      // Cliente nuevo: creamos la ficha del tutor y de la mascota ahora, con
      // lo que se llenó en la tablet.
      if (!esClienteExistente) {
        const { data: newClient, error: e1 } = await supabase.from('clients').insert({
          name: datos.nombre.trim(),
          document: cedula.trim(),
          cedula: cedula.trim(),
          phone: datos.telefono.trim(),
          email: '',
          address: '',
          sede_id: SEDE_ID,
          created_at: new Date().toISOString().slice(0, 10),
        }).select().single();
        if (e1) { setErr('No se pudo crear tu ficha: ' + e1.message); setLoading(false); return; }

        const { data: newPatient, error: e2 } = await supabase.from('patients').insert({
          name: datos.mascota.trim(),
          species: datos.especie,
          client_id: newClient.id,
          status: 'activo',
        }).select().single();
        if (e2) { setErr('No se pudo registrar tu mascota: ' + e2.message); setLoading(false); return; }

        clientId = newClient.id;
        patientId = newPatient.id;
        tutorNombre = newClient.name;
        mascotaNombre = newPatient.name;
      } else if (!mascotaNombre && datos.mascota.trim()) {
        mascotaNombre = datos.mascota.trim();
      }

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
        client_id: clientId,
        patient_id: patientId,
        tutor_nombre: tutorNombre,
        tutor_cedula: cedula.trim(),
        mascota_nombre: mascotaNombre,
        es_cliente_nuevo: !esClienteExistente,
        tipo_turno: tipoTurno,
        tiene_cita: !!agendado,
        otro_detalle: tipoTurno === 'Otro' ? (otroDetalle.trim() || null) : null,
        motivo_consulta: datos.motivo.trim() || null,
        estado: 'esperando',
      }).select().single();

      if (error) { setErr('No se pudo crear el turno: ' + error.message); setLoading(false); return; }

      const { count: antes } = await supabase
        .from('turnos_espera')
        .select('id', { count: 'exact', head: true })
        .eq('sede_id', SEDE_ID)
        .eq('estado', 'esperando')
        .lt('created_at', data.created_at);

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
      setMascotaConocida(null);
      setScreen('datos');
    } else if (pets.length === 1) {
      setMascotaConocida(pets[0]);
      setScreen('datos');
    } else {
      setMascotas(pets);
    }
  }

  const elegirMascotaExistente = (m) => {
    setMascotaConocida(m);
    setScreen('datos');
  };

  const omitirMascotaExistente = () => {
    setMascotaConocida(null);
    setScreen('datos');
  };

  const irADatosNuevo = () => {
    if (!cedula.trim()) return;
    setErr('');
    setScreen('datos');
  };

  const setDato = (campo, val) => setDatos(d => ({ ...d, [campo]: val }));

  const validarYFinalizar = () => {
    if (!esClienteExistente) {
      if (!datos.nombre.trim() || !datos.telefono.trim() || !datos.mascota.trim()) {
        return setErr('Por favor completa nombre, teléfono y nombre de tu mascota.');
      }
    } else if (!mascotaConocida && !datos.mascota.trim()) {
      return setErr('Por favor escribe el nombre de tu mascota.');
    }
    setErr('');
    setCampoActivo(null);
    finalizarTurno();
  };

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
                <CampoConTeclado
                  value={otroDetalle}
                  activo={campoActivo === 'otro'}
                  onActivar={() => setCampoActivo('otro')}
                  placeholder="Cuéntanos brevemente (opcional)"
                />
                {campoActivo === 'otro' && (
                  <OnScreenKeyboard mode="text" value={otroDetalle} onChange={setOtroDetalle} onDone={() => setCampoActivo(null)} />
                )}
                <button style={{ ...bigBtn(C.teal), marginTop: '0.8rem' }} onClick={irACedula}>Continuar</button>
              </div>
            )}

            <button style={{ ...bigBtn('transparent', C.muted), boxShadow: 'none', marginTop: '1rem', fontSize: '0.9rem' }} onClick={() => setScreen('agendado')}>← Atrás</button>
          </div>
        )}

        {screen === 'existente' && (
          <div>
            <p style={{ color: C.text, fontWeight: 600, marginBottom: '0.8rem' }}>Escribe tu número de cédula</p>
            <CampoConTeclado
              value={cedula}
              activo={campoActivo === 'cedula'}
              onActivar={() => setCampoActivo('cedula')}
              placeholder="Número de cédula"
            />
            {campoActivo === 'cedula' && (
              <OnScreenKeyboard mode="numeric" value={cedula} onChange={v => setCedula(v.replace(/\D/g, ''))} onDone={() => setCampoActivo(null)} />
            )}
            {err && <p style={{ color: C.danger, fontSize: '0.9rem', marginTop: '0.6rem' }}>{err}</p>}

            {mascotas && (
              <div style={{ marginTop: '1.2rem' }}>
                <p style={{ fontWeight: 600, color: C.text }}>¿A cuál mascota traes hoy?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {mascotas.map(m => (
                    <button key={m.id} style={bigBtn(C.tealLight, C.tealDark)} onClick={() => elegirMascotaExistente(m)}>
                      🐾 {m.name}
                    </button>
                  ))}
                  <button style={{ ...bigBtn('transparent', C.muted), boxShadow: 'none', fontSize: '0.9rem' }} onClick={omitirMascotaExistente}>
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
            <CampoConTeclado
              value={cedula}
              activo={campoActivo === 'cedula'}
              onActivar={() => setCampoActivo('cedula')}
              placeholder="Número de cédula"
            />
            {campoActivo === 'cedula' && (
              <OnScreenKeyboard mode="numeric" value={cedula} onChange={v => setCedula(v.replace(/\D/g, ''))} onDone={() => setCampoActivo(null)} />
            )}
            {err && <p style={{ color: C.danger, fontSize: '0.9rem', marginTop: '0.6rem' }}>{err}</p>}
            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.4rem' }}>
              <button style={{ ...bigBtn('white', C.muted), flex: 1 }} onClick={() => setScreen('tipo')}>← Atrás</button>
              <button style={{ ...bigBtn(C.teal), flex: 2 }} disabled={loading || !cedula.trim()} onClick={irADatosNuevo}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {screen === 'datos' && (
          <div>
            <p style={{ color: C.text, fontWeight: 600, marginBottom: '0.3rem' }}>
              {esClienteExistente ? 'Cuéntanos de tu visita' : 'Ya casi — completa tus datos'}
            </p>
            <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: '1rem' }}>
              El motivo es opcional, el resto es obligatorio.
            </p>

            {!esClienteExistente && (
              <>
                <CampoConTeclado label="Tu nombre completo" value={datos.nombre} activo={campoActivo === 'nombre'} onActivar={() => setCampoActivo('nombre')} placeholder="Nombre y apellido" />
                {campoActivo === 'nombre' && <OnScreenKeyboard mode="text" value={datos.nombre} onChange={v => setDato('nombre', v)} onDone={() => setCampoActivo(null)} />}

                <CampoConTeclado label="Tu teléfono" value={datos.telefono} activo={campoActivo === 'telefono'} onActivar={() => setCampoActivo('telefono')} placeholder="Número de celular" />
                {campoActivo === 'telefono' && <OnScreenKeyboard mode="numeric" value={datos.telefono} onChange={v => setDato('telefono', v.replace(/\D/g, ''))} onDone={() => setCampoActivo(null)} />}

                <CampoConTeclado label="Nombre de tu mascota" value={datos.mascota} activo={campoActivo === 'mascota'} onActivar={() => setCampoActivo('mascota')} placeholder="Ej: Rex" />
                {campoActivo === 'mascota' && <OnScreenKeyboard mode="text" value={datos.mascota} onChange={v => setDato('mascota', v)} onDone={() => setCampoActivo(null)} />}

                <div style={{ marginBottom: '0.9rem', textAlign: 'left' }}>
                  <span style={{ fontWeight: 600, color: C.text, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' }}>Especie</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['Perro', 'Gato', 'Otro'].map(sp => (
                      <button key={sp} type="button" onClick={() => setDato('especie', sp)}
                        style={{ flex: 1, padding: '0.8rem', borderRadius: 12, border: `2px solid ${datos.especie === sp ? C.teal : C.border}`, background: datos.especie === sp ? C.teal : 'white', color: datos.especie === sp ? 'white' : C.text, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {esClienteExistente && !mascotaConocida && (
              <>
                <CampoConTeclado label="Nombre de tu mascota" value={datos.mascota} activo={campoActivo === 'mascota'} onActivar={() => setCampoActivo('mascota')} placeholder="Ej: Rex" />
                {campoActivo === 'mascota' && <OnScreenKeyboard mode="text" value={datos.mascota} onChange={v => setDato('mascota', v)} onDone={() => setCampoActivo(null)} />}
              </>
            )}

            <CampoConTeclado label="Motivo de la visita (opcional)" value={datos.motivo} activo={campoActivo === 'motivo'} onActivar={() => setCampoActivo('motivo')} multiline placeholder="Ej: vómito desde ayer, control de vacunas..." />
            {campoActivo === 'motivo' && <OnScreenKeyboard mode="text" value={datos.motivo} onChange={v => setDato('motivo', v)} onDone={() => setCampoActivo(null)} />}

            {err && <p style={{ color: C.danger, fontSize: '0.9rem', marginTop: '0.6rem' }}>{err}</p>}

            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.2rem' }}>
              <button style={{ ...bigBtn('white', C.muted), flex: 1 }} onClick={() => { setCampoActivo(null); setScreen(esClienteExistente ? 'existente' : 'nuevo'); }}>← Atrás</button>
              <button style={{ ...bigBtn(C.teal), flex: 2 }} disabled={loading} onClick={validarYFinalizar}>
                {loading ? 'Guardando…' : 'Obtener mi turno'}
              </button>
            </div>
          </div>
        )}

        {screen === 'confirmado' && turno && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.6rem' }}>✅</div>
            <div style={{ fontSize: '0.95rem', color: C.muted, marginBottom: '0.3rem' }}>Tu turno es</div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: C.tealDark, lineHeight: 1 }}>{turno.numero}</div>
            <div style={{ marginTop: '0.8rem', background: C.successBg, color: C.success, borderRadius: 12, padding: '0.7rem 1rem', fontWeight: 700 }}>
              {turno.personasAntes === 0 ? 'Eres el siguiente' : `${turno.personasAntes} persona(s) antes de ti`}
              {' · '}~{turno.mins || MIN_POR_TURNO} min de espera aprox.
            </div>
            <p style={{ color: C.muted, fontSize: '0.85rem', marginTop: '1rem' }}>
              Ya registramos tus datos, no necesitas hacer nada más. Sigue tu turno en la pantalla de la sala de espera.
            </p>
            <div style={{ marginTop: '0.6rem', color: C.muted, fontSize: '0.8rem' }}>
              Volviendo al inicio en {countdown}s…
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
