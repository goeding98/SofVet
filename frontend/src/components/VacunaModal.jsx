import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useSede, SEDES } from '../utils/useSede';
import { useAuth } from '../utils/useAuth';
import { nowDate, nowTime } from '../utils/nowLocal';

const VACUNAS = {
  Perro: ['Puppy', 'Quíntuple', 'Anti-rabia', 'Tos de Perreras'],
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

  const [selected,      setSelected]      = useState(isEditing ? null : []);
  const [fecha,         setFecha]         = useState('');
  const [proxima,       setProxima]       = useState('');
  const [lotes,         setLotes]         = useState({});   // { vacunaName: lote }
  const [vet,           setVet]           = useState('');
  const [sedeId,        setSedeId]        = useState(sedeActual || 1);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSelected(initialData.vaccine_name || null);
        setFecha(initialData.date_applied || nowDate());
        setProxima(initialData.next_dose || '');
        setLotes(initialData.vaccine_name ? { [initialData.vaccine_name]: initialData.batch || '' } : {});
        setVet(initialData.vet || '');
        setSedeId(initialData.sede_id || sedeActual || 1);
        setObservaciones(initialData.observaciones || '');
      } else {
        setSelected([]);
        setFecha(nowDate());
        setProxima('');
        setLotes({});
        setVet('');
        setSedeId(sedeActual || 1);
        setObservaciones('');
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

  const setLote = (v, val) => setLotes(prev => ({ ...prev, [v]: val }));

  const handleSave = () => {
    if (!fecha) return alert('La fecha es requerida.');
    const horaAhora = nowTime();
    const hoy = nowDate();
    if (isEditing) {
      if (!selected) return alert('Selecciona una vacuna.');
      onSave({
        id:            initialData.id,
        vaccine_name:  selected,
        date_applied:  fecha,
        next_dose:     proxima       || null,
        batch:         lotes[selected] || null,
        vet:           vet           || null,
        sede_id:       sedeId        || null,
        observaciones: observaciones || null,
        dose:          '1ra dosis',
        status:        'vigente',
        editado_por:   session?.nombre || null,
        hora_edicion:  horaAhora,
        fecha_edicion: hoy,
      });
    } else {
      if (!selected.length) return alert('Selecciona al menos una vacuna.');
      onSave(selected.map(v => ({
        vaccine_name:  v,
        date_applied:  fecha,
        next_dose:     proxima    || null,
        batch:         lotes[v]  || null,
        vet:           vet       || null,
        sede_id:       sedeId    || null,
        observaciones: observaciones || null,
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
              <div key={v}>
                <button
                  onClick={() => toggleVacuna(v)}
                  style={{
                    width: '100%',
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
                {active && (
                  <input
                    value={lotes[v] || ''}
                    onChange={e => setLote(v, e.target.value)}
                    placeholder={`Nº lote — ${v}`}
                    style={{ ...iSt, marginTop: '0.3rem', fontSize: '0.8rem', borderColor: 'var(--color-primary)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fechas */}
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

      {/* Veterinario + Sede */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={lSt}>Veterinario</label>
          <input value={vet} onChange={e => setVet(e.target.value)} placeholder="Nombre del veterinario" style={iSt} />
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

      {/* Observaciones */}
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={lSt}>Observaciones</label>
        <textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          placeholder="Notas adicionales sobre la vacunación..."
          rows={3}
          style={{ ...iSt, resize: 'vertical' }}
        />
      </div>
    </Modal>
  );
}
