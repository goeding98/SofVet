import { useState } from 'react';

const lSt = { display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text)' };
const iSt = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', boxSizing: 'border-box' };

export default function RemitirModal({ aliados, pet, servicio, recordType, recordId, sedeId, fecha, onClose, onSave, session }) {
  const [aliadoId, setAliadoId] = useState('');
  const [vet,      setVet]      = useState('');
  const [obs,      setObs]      = useState('');
  const [err,      setErr]      = useState('');

  const handleSave = () => {
    if (!aliadoId) { setErr('Selecciona la clínica aliada.'); return; }
    onSave({
      aliado_id:          parseInt(aliadoId),
      veterinario_aliado: vet.trim() || null,
      paciente_nombre:    pet?.name || '',
      especie:            pet?.species || null,
      servicio:           servicio || '',
      valor_facturado:    null,
      comision_pct:       null,
      observaciones:      obs.trim() || null,
      fecha:              fecha || new Date().toISOString().split('T')[0],
      tipo_registro:      'automatico',
      record_type:        recordType,
      record_id:          recordId,
      sede_id:            sedeId || null,
      registrado_por:     session?.nombre || null,
    });
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: '#f5f8ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-title)', color: '#2e5cbf', fontSize: '0.95rem' }}>🔗 Registrar remisión</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {pet?.name} · {servicio}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '0.95rem' }}>×</button>
        </div>

        <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={lSt}>Clínica aliada *</label>
            <select value={aliadoId} onChange={e => setAliadoId(e.target.value)} style={iSt}>
              <option value="">— Seleccionar —</option>
              {aliados.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={lSt}>Veterinario en clínica aliada</label>
            <input value={vet} onChange={e => setVet(e.target.value)} style={iSt} placeholder="Nombre del veterinario" />
          </div>
          <div>
            <label style={lSt}>Observaciones</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} style={{ ...iSt, resize: 'vertical' }} placeholder="Anotaciones sobre esta remisión..." />
          </div>
          {err && <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}>⚠️ {err}</div>}
          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding: '0.5rem 1.1rem', background: '#2e5cbf', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600 }}>
              🔗 Remitir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
