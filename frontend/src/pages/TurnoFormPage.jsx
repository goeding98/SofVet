import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const C = {
  bg: '#FFF9F4', teal: '#316d74', tealDark: '#1e4e54', tealLight: '#e8f5f6',
  cream: '#FDF6EE', border: '#E8D9C8',
  text: '#2D2D2D', muted: '#8A8076', danger: '#C0392B',
  success: '#1e7d45', successBg: '#eafaf0',
};
const inp = {
  width: '100%', padding: '0.85rem 1rem', border: `1.5px solid ${C.border}`,
  borderRadius: 12, fontSize: '1rem', fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: 'white', color: C.text,
};
const label = { fontWeight: 600, color: C.text, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' };
const field = { marginBottom: '1rem' };

export default function TurnoFormPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [turno, setTurno] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [mascota, setMascota] = useState('');
  const [especie, setEspecie] = useState('Perro');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('turnos_espera').select('*').eq('id', id).single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setTurno(data);
      setMascota(data.mascota_nombre || '');
      setMotivo(data.motivo_consulta || '');
      if (data.motivo_consulta) setDone(true);
      setLoading(false);
    })();
  }, [id]);

  const handleSubmitExistente = async () => {
    if (!motivo.trim()) return setErr('Cuéntanos brevemente el motivo de tu visita.');
    setSaving(true); setErr('');
    const { error } = await supabase.from('turnos_espera').update({
      motivo_consulta: motivo.trim(),
      mascota_nombre: turno.mascota_nombre || mascota.trim() || null,
    }).eq('id', id);
    setSaving(false);
    if (error) return setErr('No se pudo guardar: ' + error.message);
    setDone(true);
  };

  const handleSubmitNuevo = async () => {
    if (!nombre.trim() || !telefono.trim() || !mascota.trim()) {
      return setErr('Por favor completa nombre, teléfono y nombre de tu mascota.');
    }
    setSaving(true); setErr('');
    const { data: newClient, error: e1 } = await supabase.from('clients').insert({
      name: nombre.trim(),
      document: turno.tutor_cedula,
      cedula: turno.tutor_cedula,
      phone: telefono.trim(),
      email: '',
      address: '',
      sede_id: turno.sede_id,
      created_at: new Date().toISOString().slice(0, 10),
    }).select().single();
    if (e1) { setSaving(false); return setErr('No se pudo crear tu ficha: ' + e1.message); }

    const { data: newPatient, error: e2 } = await supabase.from('patients').insert({
      name: mascota.trim(),
      species: especie,
      client_id: newClient.id,
      status: 'activo',
    }).select().single();
    if (e2) { setSaving(false); return setErr('No se pudo registrar tu mascota: ' + e2.message); }

    const { error: e3 } = await supabase.from('turnos_espera').update({
      client_id: newClient.id,
      patient_id: newPatient.id,
      tutor_nombre: nombre.trim(),
      mascota_nombre: mascota.trim(),
      motivo_consulta: motivo.trim() || 'Consulta general',
    }).eq('id', id);
    setSaving(false);
    if (e3) return setErr('No se pudo actualizar el turno: ' + e3.message);
    setDone(true);
  };

  if (loading) {
    return <Wrap><p style={{ color: C.muted }}>Cargando…</p></Wrap>;
  }

  if (notFound) {
    return <Wrap><p style={{ color: C.danger, fontWeight: 600 }}>No encontramos este turno. Puede que el código ya haya expirado.</p></Wrap>;
  }

  if (turno.estado === 'atendido' || turno.estado === 'cancelado') {
    return <Wrap>
      <p style={{ fontWeight: 700, color: C.text }}>Turno {turno.numero}</p>
      <p style={{ color: C.muted }}>Este turno ya no está activo. ¡Gracias por tu visita!</p>
    </Wrap>;
  }

  if (done) {
    return <Wrap>
      <div style={{ fontSize: '2.4rem' }}>✅</div>
      <p style={{ fontWeight: 800, color: C.success, fontSize: '1.1rem' }}>¡Listo, gracias!</p>
      <p style={{ color: C.muted }}>Ya registramos tu información. Sigue tu turno <strong>{turno.numero}</strong> en la pantalla de la sala de espera.</p>
    </Wrap>;
  }

  return (
    <Wrap>
      <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
        <div style={{ fontSize: '0.85rem', color: C.muted }}>Tu turno</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: C.tealDark }}>{turno.numero}</div>
      </div>

      {turno.es_cliente_nuevo ? (
        <div style={{ textAlign: 'left' }}>
          <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: '1rem' }}>
            Completa estos datos para crear tu ficha y la de tu mascota. Es opcional, pero nos ayuda a atenderte mejor y más rápido.
          </p>
          <div style={field}><span style={label}>Tu nombre completo</span>
            <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido" /></div>
          <div style={field}><span style={label}>Tu teléfono</span>
            <input style={inp} type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Número de celular" /></div>
          <div style={field}><span style={label}>Nombre de tu mascota</span>
            <input style={inp} value={mascota} onChange={e => setMascota(e.target.value)} placeholder="Ej: Rex" /></div>
          <div style={field}><span style={label}>Especie</span>
            <select style={inp} value={especie} onChange={e => setEspecie(e.target.value)}>
              <option>Perro</option><option>Gato</option><option>Otro</option>
            </select></div>
          <div style={field}><span style={label}>Motivo de la visita</span>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: vómito desde ayer, control de vacunas, etc." /></div>
          {err && <p style={{ color: C.danger, fontSize: '0.85rem' }}>{err}</p>}
          <button onClick={handleSubmitNuevo} disabled={saving}
            style={{ width: '100%', padding: '0.9rem', background: saving ? '#ccc' : C.teal, color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Enviar'}
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'left' }}>
          <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: '1rem' }}>
            Cuéntanos brevemente el motivo de tu visita para que el equipo se prepare antes de atenderte.
          </p>
          {!turno.mascota_nombre && (
            <div style={field}><span style={label}>Nombre de tu mascota</span>
              <input style={inp} value={mascota} onChange={e => setMascota(e.target.value)} placeholder="Ej: Rex" /></div>
          )}
          <div style={field}><span style={label}>Motivo de la visita</span>
            <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: vómito desde ayer, control de vacunas, etc." /></div>
          {err && <p style={{ color: C.danger, fontSize: '0.85rem' }}>{err}</p>}
          <button onClick={handleSubmitExistente} disabled={saving}
            style={{ width: '100%', padding: '0.9rem', background: saving ? '#ccc' : C.teal, color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Enviar'}
          </button>
        </div>
      )}
    </Wrap>
  );
}

function Wrap({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 420, background: C.cream, border: `1px solid ${C.border}`, borderRadius: 22, padding: '1.8rem 1.6rem', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        {children}
      </div>
    </div>
  );
}
