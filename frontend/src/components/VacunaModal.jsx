import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useSede, SEDES } from '../utils/useSede';

const VACUNAS = {
  Perro: ['Puppy Virbac', 'Quíntuple', 'Séxtuple', 'Anti-rabia'],
  Gato:  ['Triple Felina', 'Leucemia'],
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

export default function VacunaModal({ isOpen, onClose, onSave, pet }) {
  const { sedeActual, isAdmin } = useSede();
  const opciones = VACUNAS[pet?.species] || [];

  const [selected, setSelected] = useState(null);
  const [fecha,    setFecha]    = useState('');
  const [proxima,  setProxima]  = useState('');
  const [lote,     setLote]     = useState('');
  const [vet,      setVet]      = useState('');
  const [sedeId,   setSedeId]   = useState(sedeActual || 1);

  useEffect(() => {
    if (isOpen) {
      setSelected(null);
      setFecha(new Date().toISOString().split('T')[0]);
      setProxima('');
      setLote('');
      setVet('');
      setSedeId(sedeActual || 1);
    }
  }, [isOpen, sedeActual]);

  const handleSave = () => {
    if (!selected)     return alert('Selecciona una vacuna.');
    if (!fecha)        return alert('La fecha es requerida.');
    onSave({
      vaccine_name: selected,
      date_applied: fecha,
      next_dose:    proxima || null,
      batch:        lote    || null,
      vet:          vet     || null,
      sede_id:      sedeId  || null,
      dose:         '1ra dosis',
      status:       'vigente',
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`💉 Vacunar — ${pet?.name || ''}`}
      onSave={selected ? handleSave : null}
      saveLabel="Registrar vacuna"
      size="sm"
    >
      {/* Opciones de vacuna */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={lSt}>Vacuna *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {opciones.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No hay vacunas configuradas para {pet?.species || 'esta especie'}.
            </p>
          ) : opciones.map(v => (
            <button
              key={v}
              onClick={() => setSelected(v)}
              style={{
                padding: '0.65rem 1rem',
                border: `2px solid ${selected === v ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                background: selected === v ? 'var(--color-info-bg)' : 'var(--color-white)',
                color: selected === v ? 'var(--color-primary)' : 'var(--color-text)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                fontWeight: selected === v ? 700 : 400,
                textAlign: 'left',
                transition: 'var(--transition)',
              }}
            >
              {selected === v ? '✓ ' : ''}{v}
            </button>
          ))}
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
