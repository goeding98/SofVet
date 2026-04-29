import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useSede, SEDES } from '../utils/useSede';
import { useAuth } from '../utils/useAuth';

const VACUNAS = {
  Perro: ['Puppy Virbac', 'Quíntuple', 'Séxtuple', 'Anti-rabia', 'KC'],
  Gato:  ['Triple Felina', 'Leucemia', 'Anti-rabia'],
};

const lSt = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700,
  marginBottom: '0.3rem', textTransform: 'uppercase',
  letterSpacing: '0.04em', color: 'var(--color-text)',
};
const iSt = {
  width: '100%', padding: '0.5rem 0.65rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-body)', fontSize: '0.85rem',
};

export default function VacunaModal({ isOpen, onClose, onSave, pet, initialData }) {
  const { sedeActual, isAdmin } = useSede();
  const { session } = useAuth();
  const opciones  = VACUNAS[pet?.species] || [];
  const isEditing = !!initialData?.id;

  // When editing: single string. When creating: array.
  const [selected, setSelected] = useState(isEditing ? null : []);
  const [fecha,    setFecha]    = useState('');
  const [proxima,  setProxima]  = useState('');
  const [lote,     setLote]     = useState('');
  const [vet,      setVet]      = useState('');
  const [sedeId,   setSedeId]   = useState(sedeActual || 1);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSelected(initialData.vaccine_name || null);
        setFecha(initialData.date_applied || new Date().toISOString().split('T')[0]);
        setProxima(initialData.next_dose || '');
        setLote(initialData.batch || '');
        setVet(initialData.vet || '');
        setSedeId(initialData.sede_id || sedeActual || 1);
      } else {
        setSelected([]);
        setFecha(new Date().toISOString().split('T')[0]);
        setProxima('');
        setLote('');
        setVet('');
        setSedeId(sedeActual || 1);
      }
    }
  }, [isOpen, sedeActual, initialData]);

  const toggleVacuna = (v) => {
    setSelected(prev =>
      Array.isArray(prev)
        ? prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
        : v
    );
  };

  const isActive = (v) => Array.isArray(selected) ? selected.includes(v) : selected === v;

  const handleSave = () => {
    if (!fecha) return alert('La fecha es requerida.');
    const now = new Date();
    const horaAhora = now.toTimeString().slice(0, 5);
    const hoy = now.toISOString().split('T')[0];
    if (isEditing) {
      if (!selected) return alert('Selecciona una vacuna.');
      onSave({
        id:           initialData.id,
        vaccine_name: selected,
        date_applied: fecha,
        next_dose:    proxima || null,
        batch:        lote    || null,
        vet:          vet     || null,
        sede_id:      sedeId  || null,
        dose:         '1ra dosis',
        status:       'vigente',
        editado_por:  session?.nombre || null,
        hora_edicion: horaAhora,
        fecha_edicion: hoy,
      });
    } else {
      if (!selected.length) return alert('Selecciona al menos una vacuna.');
      onSave(selected.map(v => ({
        vaccine_name:  v,
        date_applied:  fecha,
        next_dose:     proxima || null,
        batch:         lote    || null,
        vet:           vet     || null,
        sede_id:       sedeId  || null,
        dose:          '1ra dosis',
        status:        'vigente',
        hora_creacion: horaAhora,
      })));
    }
  };

  const hasSelection = isEditing ? !!selected : (Array.isArray(selected) && selected.length > 0);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `✏️ Editar Vacuna — ${pet?.name || ''}` : `💉 Vacunar — ${pet?.name || ''}`}
      onSave={hasSelection ? handleSave : null}
      saveLabel={isEditing ? 'Guardar cambios' : `Registrar${Array.isArray(selected) && selected.length > 1 ? ` ${selected.length} vacunas` : ' vacuna'}`}
      size="sm"
    >
      {/* Opciones de vacuna */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={lSt}>
          Vacuna{!isEditing ? 's' : ''} *
          {!isEditing && <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: '0.4rem', color: 'var(--color-text-muted)' }}>(puedes seleccionar varias)</span>}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {opciones.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No hay vacunas configuradas para {pet?.species || 'esta especie'}.
            </p>
          ) : opciones.map(v => {
            const active = isActive(v);
            return (
              <button
                key={v}
                onClick={() => toggleVacuna(v)}
                style={{
                  padding: '0.65rem 1rem',
                  border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--color-info-bg)' : 'var(--color-white)',
                  color: active ? 'var(--color-primary)' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  fontWeight: active ? 700 : 400,
                  textAlign: 'left',
                  transition: 'var(--transition)',
                }}
              >
                {active ? '✓ ' : ''}{v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={lSt}>Fecha aplicación *</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={iSt} />
        </div>
        <div>
          <label style={lSt}>Próxima dosis</label>
          <input type="date" value={proxima} onChange={e => setProxima(e.target.value)} style={iSt} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={lSt}>Lote (opcional)</label>
          <input value={lote} onChange={e => setLote(e.target.value)} placeholder="Nº lote" style={iSt} />
        </div>
        <div>
          <label style={lSt}>Sede</label>
          {isAdmin ? (
            <select value={sedeId} onChange={e => setSedeId(parseInt(e.target.value))} style={iSt}>
              {SEDES.filter(s => !s.domicilio).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          ) : (
            <input readOnly value={SEDES.find(s => s.id === sedeId)?.nombre || '—'} style={{ ...iSt, background: 'var(--color-bg)', color: 'var(--color-text-muted)' }} />
          )}
        </div>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <label style={lSt}>Veterinario</label>
        <input value={vet} onChange={e => setVet(e.target.value)} placeholder="Nombre del veterinario" style={iSt} />
      </div>
    </Modal>
  );
}
