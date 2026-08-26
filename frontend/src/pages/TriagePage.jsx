import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../utils/useAuth';

const SEDE_ID = 1; // Fase 1: fijo a Santa Mónica

// Bandas según la "Guía de Referencia" del Excel de la directora médica.
// OJO: la fórmula de clasificación del Excel original tenía un bug (usaba
// >=5 para "semi-urgente" en vez de >=11, lo que contradecía la propia
// guía y el tiempo de respuesta). Aquí se usan las bandas de la guía.
function clasificar(puntos) {
  if (puntos >= 36) return { nivel: 'EMERGENCIA', label: '🔴 Emergencia', tiempo: 'Ahora (0-15 min)', prioridad: 1, color: '#c0392b', bg: '#fdecea' };
  if (puntos >= 21) return { nivel: 'URGENTE', label: '🟠 Urgente', tiempo: '30-60 minutos', prioridad: 2, color: '#c2740c', bg: '#fff3e0' };
  if (puntos >= 11) return { nivel: 'SEMI-URGENTE', label: '🟡 Semi-urgente', tiempo: '2-4 horas', prioridad: 3, color: '#a3830a', bg: '#fffbe6' };
  return { nivel: 'RUTINA', label: '🟢 Rutina', tiempo: 'Cita programada', prioridad: 4, color: '#1e7d45', bg: '#eafaf0' };
}

const FACTORES = [
  { key: 'temp_anormal',      label: 'Temperatura anormal (>39.5°C o <37°C)', puntos: 5 },
  { key: 'fc_anormal',        label: 'Frecuencia cardíaca anormal', puntos: 3 },
  { key: 'fr_anormal',        label: 'Frecuencia respiratoria anormal', puntos: 3 },
  { key: 'hipo_hipertenso',   label: 'Paciente hipo/hipertenso', puntos: 20 },
  { key: 'deshidr_leve',      label: 'Deshidratación 5-10%', puntos: 4 },
  { key: 'deshidr_shock',     label: 'Deshidratación >10% (shock)', puntos: 8 },
  { key: 'mucosas_palidas',   label: 'Mucosas pálidas', puntos: 2 },
  { key: 'mucosas_cianoticas',label: 'Mucosas cianóticas', puntos: 40 },
  { key: 'dolor_moderado',    label: 'Dolor moderado presente', puntos: 10 },
  { key: 'dolor_severo',      label: 'Dolor severo presente', puntos: 20 },
  { key: 'disnea_moderada',   label: 'Dificultad respiratoria moderada', puntos: 20 },
  { key: 'disnea_severa',     label: 'Distrés respiratorio severo', puntos: 40 },
  { key: 'trauma_leve',       label: 'Herida/traumatismo leve', puntos: 30 },
  { key: 'trauma_grave',      label: 'Herida/traumatismo grave', puntos: 40 },
  { key: 'letargo',           label: 'Letargo', puntos: 25 },
  { key: 'inconciencia',      label: 'Inconciencia', puntos: 40 },
  { key: 'convulsiones',      label: 'Convulsiones / colapso', puntos: 50 },
];

const RANGOS = [
  { esp: 'Perro cachorro', temp: '37.5 – 39.2 °C', fc: '120 – 180 LPM', fr: '15 – 40 RPM' },
  { esp: 'Perro adulto',   temp: '37.8 – 39.5 °C', fc: '60 – 180 LPM',  fr: '10 – 30 RPM' },
  { esp: 'Gato cachorro',  temp: '37.7 – 39.1 °C', fc: '160 – 240 LPM', fr: '20 – 40 RPM' },
  { esp: 'Gato adulto',    temp: '37.8 – 39.5 °C', fc: '140 – 220 LPM', fr: '20 – 40 RPM' },
];

const MUCOSAS_OPTS = ['Rosadas húmedas', 'Pálidas', 'Congestivas', 'Cianóticas', 'Ictéricas', 'Secas'];

const EMPTY_INTAKE = {
  tutorNombre: '', tutorTelefono: '', tutorDireccion: '',
  mascotaNombre: '', especie: 'Perro', raza: '', edad: '', sexo: 'Macho', esterilizado: 'No', pesoSignalment: '',
};

const lbl = { fontWeight: 700, fontSize: '0.78rem', color: '#5c6470', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '0.3rem' };
const inp = { width: '100%', padding: '0.55rem 0.7rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' };
const field = { marginBottom: '0.9rem' };
const sectionTitle = { fontSize: '0.95rem', fontWeight: 800, color: '#1c2333', margin: '1.6rem 0 0.9rem', paddingBottom: '0.4rem', borderBottom: '2px solid #316d74' };

export default function TriagePage() {
  const { session } = useAuth();
  const [pendientes, setPendientes] = useState([]);
  const [activo, setActivo] = useState(null); // turno seleccionado para triar
  const [pacienteExistente, setPacienteExistente] = useState(null); // datos actuales del patient si ya existe
  const [intake, setIntake] = useState(EMPTY_INTAKE);
  const [motivo, setMotivo] = useState('');
  const [antecedentes, setAntecedentes] = useState('');
  const [vitals, setVitals] = useState({ temperatura: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '', peso: '', condicion_corporal: '', mucosas: '', tiempo_llenado_capilar: '', pulso: '', glicemia: '', presion_arterial: '' });
  const [factores, setFactores] = useState({});
  const [showGuia, setShowGuia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('turnos_espera')
      .select('*')
      .eq('sede_id', SEDE_ID)
      .eq('estado', 'esperando')
      .is('triage_id', null)
      .order('created_at', { ascending: true });
    setPendientes(data || []);
  }, []);

  useEffect(() => {
    cargar();
    const channel = supabase
      .channel('triage_pendientes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos_espera', filter: `sede_id=eq.${SEDE_ID}` }, cargar)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [cargar]);

  const abrirTriage = async (turno) => {
    setErr('');
    setActivo(turno);
    setMotivo(turno.motivo_consulta || '');
    setAntecedentes('');
    setVitals({ temperatura: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '', peso: '', condicion_corporal: '', mucosas: '', tiempo_llenado_capilar: '', pulso: '', glicemia: '', presion_arterial: '' });
    setFactores({});
    setIntake({ ...EMPTY_INTAKE, tutorNombre: turno.tutor_nombre || '', mascotaNombre: turno.mascota_nombre || '' });

    if (turno.patient_id) {
      const { data } = await supabase.from('patients').select('*').eq('id', turno.patient_id).single();
      setPacienteExistente(data || null);
      if (data) {
        setIntake(i => ({ ...i, especie: data.species || 'Perro', raza: data.breed || '', edad: data.age || '', sexo: data.sex || 'Macho', esterilizado: data.esterilizado || 'No', pesoSignalment: data.weight || '' }));
      }
    } else {
      setPacienteExistente(null);
    }
  };

  const puntaje = FACTORES.reduce((sum, f) => sum + (factores[f.key] ? f.puntos : 0), 0);
  const clasif = clasificar(puntaje);

  const toggleFactor = (key) => setFactores(f => ({ ...f, [key]: !f[key] }));
  const setV = (key, val) => setVitals(v => ({ ...v, [key]: val }));
  const setI = (key, val) => setIntake(i => ({ ...i, [key]: val }));

  const guardar = async () => {
    if (!activo) return;
    setErr('');

    let clientId = activo.client_id;
    let patientId = activo.patient_id;
    let tutorNombre = activo.tutor_nombre;
    let mascotaNombre = activo.mascota_nombre;

    setSaving(true);
    try {
      if (!patientId) {
        // Cliente nuevo que no completó el QR — el auxiliar crea la ficha completa aquí
        if (!intake.tutorNombre.trim() || !intake.mascotaNombre.trim()) {
          setErr('Falta el nombre del tutor o de la mascota para crear la ficha.');
          setSaving(false);
          return;
        }
        const { data: newClient, error: e1 } = await supabase.from('clients').insert({
          name: intake.tutorNombre.trim(),
          document: activo.tutor_cedula,
          cedula: activo.tutor_cedula,
          phone: intake.tutorTelefono.trim(),
          email: '',
          address: intake.tutorDireccion.trim(),
          sede_id: activo.sede_id,
          created_at: new Date().toISOString().slice(0, 10),
        }).select().single();
        if (e1) throw new Error('No se pudo crear el cliente: ' + e1.message);

        const { data: newPatient, error: e2 } = await supabase.from('patients').insert({
          name: intake.mascotaNombre.trim(),
          species: intake.especie,
          breed: intake.raza.trim(),
          age: intake.edad.trim(),
          sex: intake.sexo,
          esterilizado: intake.esterilizado,
          weight: intake.pesoSignalment.trim(),
          status: 'activo',
          client_id: newClient.id,
        }).select().single();
        if (e2) throw new Error('No se pudo crear la mascota: ' + e2.message);

        clientId = newClient.id;
        patientId = newPatient.id;
        tutorNombre = intake.tutorNombre.trim();
        mascotaNombre = intake.mascotaNombre.trim();
      } else if (pacienteExistente) {
        // Completa datos faltantes del paciente ya existente (no sobreescribe lo que ya tenía)
        const patch = {};
        if (!pacienteExistente.breed && intake.raza.trim()) patch.breed = intake.raza.trim();
        if (!pacienteExistente.age && intake.edad.trim()) patch.age = intake.edad.trim();
        if (!pacienteExistente.weight && intake.pesoSignalment.trim()) patch.weight = intake.pesoSignalment.trim();
        if (Object.keys(patch).length) {
          await supabase.from('patients').update(patch).eq('id', patientId);
        }
      }

      const { data: triage, error: e3 } = await supabase.from('triages').insert({
        turno_id: activo.id,
        patient_id: patientId,
        client_id: clientId,
        sede_id: activo.sede_id,
        motivo_consulta: motivo.trim() || null,
        antecedentes: antecedentes.trim() || null,
        temperatura: vitals.temperatura || null,
        frecuencia_cardiaca: vitals.frecuencia_cardiaca || null,
        frecuencia_respiratoria: vitals.frecuencia_respiratoria || null,
        peso: vitals.peso || null,
        condicion_corporal: vitals.condicion_corporal || null,
        mucosas: vitals.mucosas || null,
        tiempo_llenado_capilar: vitals.tiempo_llenado_capilar || null,
        pulso: vitals.pulso || null,
        glicemia: vitals.glicemia || null,
        presion_arterial: vitals.presion_arterial || null,
        factores,
        puntaje_total: puntaje,
        clasificacion: clasif.nivel,
        tiempo_respuesta: clasif.tiempo,
        realizado_por: session?.username || null,
      }).select().single();
      if (e3) throw new Error('No se pudo guardar el triage: ' + e3.message);

      const { error: e4 } = await supabase.from('turnos_espera').update({
        client_id: clientId,
        patient_id: patientId,
        tutor_nombre: tutorNombre,
        mascota_nombre: mascotaNombre,
        motivo_consulta: motivo.trim() || activo.motivo_consulta,
        prioridad: clasif.prioridad,
        triage_id: triage.id,
      }).eq('id', activo.id);
      if (e4) throw new Error('No se pudo actualizar el turno: ' + e4.message);

      setActivo(null);
      cargar();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  };

  if (activo) {
    return (
      <div style={{ padding: '1.5rem 2rem', maxWidth: 760 }}>
        <button onClick={() => setActivo(null)} style={{ background: 'none', border: 'none', color: '#316d74', fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: '1rem' }}>← Volver a la lista</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Triage — Turno {activo.numero}</h1>
          <span style={{ padding: '0.3rem 0.8rem', borderRadius: 999, fontWeight: 800, fontSize: '0.85rem', color: clasif.color, background: clasif.bg }}>
            {clasif.label} · {puntaje} pts
          </span>
        </div>
        <p style={{ color: '#8A8076', fontSize: '0.85rem', marginBottom: '1.2rem' }}>Tiempo de respuesta sugerido: <strong>{clasif.tiempo}</strong></p>

        {!activo.patient_id ? (
          <>
            <div style={sectionTitle}>👤 Datos del tutor y la mascota (cliente nuevo)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
              <div style={field}><span style={lbl}>Nombre del tutor</span><input style={inp} value={intake.tutorNombre} onChange={e => setI('tutorNombre', e.target.value)} /></div>
              <div style={field}><span style={lbl}>Teléfono</span><input style={inp} value={intake.tutorTelefono} onChange={e => setI('tutorTelefono', e.target.value)} /></div>
              <div style={{ ...field, gridColumn: '1 / -1' }}><span style={lbl}>Dirección (opcional)</span><input style={inp} value={intake.tutorDireccion} onChange={e => setI('tutorDireccion', e.target.value)} /></div>
              <div style={field}><span style={lbl}>Nombre de la mascota</span><input style={inp} value={intake.mascotaNombre} onChange={e => setI('mascotaNombre', e.target.value)} /></div>
              <div style={field}><span style={lbl}>Especie</span>
                <select style={inp} value={intake.especie} onChange={e => setI('especie', e.target.value)}><option>Perro</option><option>Gato</option><option>Otro</option></select>
              </div>
              <div style={field}><span style={lbl}>Raza</span><input style={inp} value={intake.raza} onChange={e => setI('raza', e.target.value)} /></div>
              <div style={field}><span style={lbl}>Edad</span><input style={inp} value={intake.edad} onChange={e => setI('edad', e.target.value)} placeholder="Ej: 2 años" /></div>
              <div style={field}><span style={lbl}>Sexo</span>
                <select style={inp} value={intake.sexo} onChange={e => setI('sexo', e.target.value)}><option>Macho</option><option>Hembra</option></select>
              </div>
              <div style={field}><span style={lbl}>Esterilizado</span>
                <select style={inp} value={intake.esterilizado} onChange={e => setI('esterilizado', e.target.value)}><option>Sí</option><option>No</option></select>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={sectionTitle}>👤 Cliente</div>
            <p style={{ marginTop: 0 }}>
              <strong>{activo.tutor_nombre || '—'}</strong> · 🐾 {activo.mascota_nombre || pacienteExistente?.name || '—'}
              {pacienteExistente && <span style={{ color: '#8A8076' }}> · {pacienteExistente.species} {pacienteExistente.breed ? `(${pacienteExistente.breed})` : ''}</span>}
            </p>
            {pacienteExistente && (!pacienteExistente.breed || !pacienteExistente.age || !pacienteExistente.weight) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.9rem', background: '#f7f9fc', padding: '0.9rem', borderRadius: 12 }}>
                {!pacienteExistente.breed && <div style={field}><span style={lbl}>Raza (falta en ficha)</span><input style={inp} value={intake.raza} onChange={e => setI('raza', e.target.value)} /></div>}
                {!pacienteExistente.age && <div style={field}><span style={lbl}>Edad (falta en ficha)</span><input style={inp} value={intake.edad} onChange={e => setI('edad', e.target.value)} /></div>}
                {!pacienteExistente.weight && <div style={field}><span style={lbl}>Peso (falta en ficha)</span><input style={inp} value={intake.pesoSignalment} onChange={e => setI('pesoSignalment', e.target.value)} /></div>}
              </div>
            )}
          </>
        )}

        <div style={sectionTitle}>📋 Motivo y anamnesis</div>
        <div style={field}><span style={lbl}>Motivo de consulta</span><input style={inp} value={motivo} onChange={e => setMotivo(e.target.value)} /></div>
        <div style={field}><span style={lbl}>Anamnesis</span><textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={antecedentes} onChange={e => setAntecedentes(e.target.value)} placeholder="Antecedentes relevantes, evolución del problema..." /></div>

        <div style={sectionTitle}>🩺 Examen físico</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.9rem' }}>
          <div style={field}><span style={lbl}>Temperatura (°C)</span><input style={inp} value={vitals.temperatura} onChange={e => setV('temperatura', e.target.value)} placeholder="38.5" /></div>
          <div style={field}><span style={lbl}>F. cardíaca (lpm)</span><input style={inp} value={vitals.frecuencia_cardiaca} onChange={e => setV('frecuencia_cardiaca', e.target.value)} /></div>
          <div style={field}><span style={lbl}>F. respiratoria (rpm)</span><input style={inp} value={vitals.frecuencia_respiratoria} onChange={e => setV('frecuencia_respiratoria', e.target.value)} /></div>
          <div style={field}><span style={lbl}>Pulso</span><input style={inp} value={vitals.pulso} onChange={e => setV('pulso', e.target.value)} placeholder="Ej: fuerte, regular" /></div>
          <div style={field}><span style={lbl}>Peso (kg)</span><input style={inp} value={vitals.peso} onChange={e => setV('peso', e.target.value)} /></div>
          <div style={field}><span style={lbl}>Cond. corporal (1-9)</span><input style={inp} value={vitals.condicion_corporal} onChange={e => setV('condicion_corporal', e.target.value)} /></div>
          <div style={field}><span style={lbl}>Mucosas</span>
            <select style={inp} value={vitals.mucosas} onChange={e => setV('mucosas', e.target.value)}>
              <option value="">—</option>
              {MUCOSAS_OPTS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={field}><span style={lbl}>Llenado capilar (seg)</span><input style={inp} value={vitals.tiempo_llenado_capilar} onChange={e => setV('tiempo_llenado_capilar', e.target.value)} /></div>
          <div style={field}><span style={lbl}>Glicemia (mg/dL)</span><input style={inp} value={vitals.glicemia} onChange={e => setV('glicemia', e.target.value)} /></div>
          <div style={field}><span style={lbl}>Presión arterial</span><input style={inp} value={vitals.presion_arterial} onChange={e => setV('presion_arterial', e.target.value)} placeholder="120/80" /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.6rem', marginBottom: '0.9rem' }}>
          <div style={{ ...sectionTitle, margin: 0, borderBottom: 'none' }}>🚦 Checklist de urgencia (marca lo que esté presente)</div>
          <button onClick={() => setShowGuia(s => !s)} style={{ background: 'none', border: '1px solid #dfe3ea', borderRadius: 8, padding: '0.3rem 0.7rem', fontSize: '0.78rem', color: '#5c6470', cursor: 'pointer' }}>
            {showGuia ? 'Ocultar' : 'Ver'} rangos normales
          </button>
        </div>

        {showGuia && (
          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr>{['Especie/edad', 'Temperatura', 'F. cardíaca', 'F. respiratoria'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.4rem 0.6rem', background: '#f0f2f6', color: '#5c6470' }}>{h}</th>)}</tr></thead>
              <tbody>
                {RANGOS.map(r => (
                  <tr key={r.esp}><td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{r.esp}</td><td style={{ padding: '0.4rem 0.6rem' }}>{r.temp}</td><td style={{ padding: '0.4rem 0.6rem' }}>{r.fc}</td><td style={{ padding: '0.4rem 0.6rem' }}>{r.fr}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.2rem' }}>
          {FACTORES.map(f => (
            <label key={f.key} style={{
              display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.55rem 0.8rem',
              borderRadius: 10, cursor: 'pointer', background: factores[f.key] ? '#eef6f6' : 'transparent',
              border: `1px solid ${factores[f.key] ? '#316d74' : '#eceff3'}`,
            }}>
              <input type="checkbox" checked={!!factores[f.key]} onChange={() => toggleFactor(f.key)} style={{ width: 18, height: 18 }} />
              <span style={{ flex: 1, fontSize: '0.88rem' }}>{f.label}</span>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#8A8076' }}>{f.puntos} pts</span>
            </label>
          ))}
        </div>

        {err && <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>{err}</p>}

        <button onClick={guardar} disabled={saving} style={{
          width: '100%', padding: '0.9rem', background: saving ? '#ccc' : '#316d74', color: 'white',
          border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? 'Guardando…' : `Guardar triage (${clasif.label})`}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 760 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.3rem' }}>🚦 Triage — Santa Mónica</h1>
      <p style={{ color: '#8A8076', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Página de prueba (fase 2). Pendientes de triage: {pendientes.length}</p>

      {pendientes.length === 0 && <p style={{ color: '#8A8076' }}>No hay turnos pendientes de triage.</p>}
      {pendientes.map(t => (
        <div key={t.id} onClick={() => abrirTriage(t)} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
          background: 'white', border: '1px solid #e2e6ef', borderRadius: 14,
          padding: '1rem 1.2rem', marginBottom: '0.7rem', cursor: 'pointer',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{t.numero} — {t.tutor_nombre || 'Sin nombre'} {t.es_cliente_nuevo && <span style={{ fontSize: '0.7rem', background: '#e8f0ff', color: '#2e5cbf', padding: '2px 8px', borderRadius: 999, marginLeft: 6 }}>nuevo</span>}</div>
            <div style={{ fontSize: '0.85rem', color: '#8A8076' }}>🐾 {t.mascota_nombre || '—'} · CC {t.tutor_cedula || '—'}</div>
            {t.motivo_consulta && <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>💬 {t.motivo_consulta}</div>}
          </div>
          <button style={{ padding: '0.55rem 1.1rem', background: '#316d74', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Hacer triage</button>
        </div>
      ))}
    </div>
  );
}
