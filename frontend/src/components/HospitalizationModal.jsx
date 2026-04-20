import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES } from '../utils/useSede';

const EMPTY_MED   = { medicamento: '', dosis: '', unidad: 'ml', via: 'IV', frecuencia: 'Cada 8 horas', observaciones: '' };
const UNIDADES    = ['ml', 'tabletas', 'paquetes', 'mg', 'comprimidos', 'gotas', 'otro'];
const FRECUENCIAS = ['Cada 2 horas', 'Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas', 'Cada 12 horas', 'Cada 24 horas', 'Una sola vez'];
const VIAS        = ['IV', 'IM', 'VO', 'SC', 'Tópica', 'Inhalada', 'Oftálmica', 'Ótica'];

export default function HospitalizationModal({ isOpen, onClose, pet, client, initialData }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { sedeActual, isAdmin } = useSede();
  const isDomicilio = session?.sede_id === 4;
  const { add: addHosp, edit: editHosp } = useStore('hospitalization');
  const { items: patients, edit: editPatient } = useStore('patients');
  const isEditing = !!initialData?.id;

  const [motivo,      setMotivo]      = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [meds,        setMeds]        = useState([{ ...EMPTY_MED }]);
  const [sedeId,      setSedeId]      = useState(sedeActual || 1);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setMotivo(initialData.motivo || '');
        setDiagnostico(initialData.diagnostico || '');
        setMeds(initialData.tratamiento?.length ? initialData.tratamiento : [{ ...EMPTY_MED }]);
        setSedeId(initialData.sede_id || sedeActual || 1);
      } else {
        setMotivo(''); setDiagnostico(''); setMeds([{ ...EMPTY_MED }]); setSedeId(sedeActual || 1);
      }
      setError('');
    }
  }, [isOpen, initialData, sedeActual]);

  if (!isOpen || !pet) return null;

  const addMed    = () => setMeds(m => [...m, { ...EMPTY_MED }]);
  const removeMed = (i) => setMeds(m => m.filter((_, idx) => idx !== i));
  const updateMed = (i, field, val) => setMeds(m => m.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const handleSave = () => {
    setError('');
    if (!motivo.trim()) return setError('El motivo de hospitalización es requerido.');

    if (isEditing) {
      editHosp(initialData.id, {
        motivo,
        diagnostico,
        tratamiento: meds.filter(m => m.medicamento.trim()),
        sede_id: sedeId,
      });
      onClose();
      return;
    }

    const now = new Date();
    addHosp({
      sede_id:         sedeId,
      patient_id:      pet.id,
      patient_name:    pet.name,
      species:         pet.species,
      breed:           pet.breed,
      weight:          pet.weight,
      age:             pet.age,
      client_id:       client?.id || null,
      client_name:     client?.name || '—',
      client_phone:    client?.phone || '—',
      motivo,
      diagnostico,
      tratamiento:     meds.filter(m => m.medicamento.trim()),
      ingreso_date:    now.toISOString().split('T')[0],
      ingreso_time:    now.toTimeString().slice(0, 5),
      responsible_vet: session?.nombre || 'Sin asignar',
      status:          'activo',
      aplicaciones:    [],
    });

    editPatient(pet.id, { status: 'hospitalizado' });

    onClose();
    navigate('/hospitalization');
  };

  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text)',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', backdropFilter: 'blur(2px)', overflowY: 'auto' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 680, overflow: 'hidden', margin: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-danger-bg)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-danger)', fontSize: '1.1rem', margin: 0 }}>{isEditing ? '✏️ Editar Hospitalización' : '🏥 Nueva Hospitalización'}</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {pet.name} · {pet.species} {pet.breed ? `(${pet.breed})` : ''} · {pet.weight} kg · {pet.age} años
            </p>
            <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>📍 Sede:</span>
              {(isAdmin || isDomicilio) ? (
                <select value={sedeId} onChange={e => setSedeId(parseInt(e.target.value))} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)' }}>
                  {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text)' }}>{SEDES.find(s => s.id === sedeId)?.nombre}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>

          {/* Motivo */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Motivo de hospitalización *</label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Describe el motivo de ingreso..."
              style={{ width: '100%', padding: '0.6rem 0.75rem', resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: '0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          {/* Diagnóstico */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Diagnóstico</label>
            <textarea
              value={diagnostico}
              onChange={e => setDiagnostico(e.target.value)}
              rows={2}
              placeholder="Diagnóstico preliminar..."
              style={{ width: '100%', padding: '0.6rem 0.75rem', resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: '0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          {/* Tratamiento table */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Plan de tratamiento</label>
              <button onClick={addMed} style={{ padding: '0.3rem 0.75rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                + Agregar fila
              </button>
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Medicamento / Tratamiento', 'Dosis', 'Unidad', 'Vía', 'Frecuencia', 'Observaciones', ''].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meds.map((m, i) => (
                    <tr key={i} style={{ borderBottom: i < meds.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <input value={m.medicamento} onChange={e => updateMed(i, 'medicamento', e.target.value)} placeholder="Nombre" style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <input value={m.dosis} onChange={e => updateMed(i, 'dosis', e.target.value)} placeholder="0" style={{ width: 60, padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <select value={m.unidad} onChange={e => updateMed(i, 'unidad', e.target.value)} style={{ padding: '0.4rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                          {UNIDADES.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <select value={m.via || 'IV'} onChange={e => updateMed(i, 'via', e.target.value)} style={{ padding: '0.4rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                          {VIAS.map(v => <option key={v}>{v}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <select value={m.frecuencia} onChange={e => updateMed(i, 'frecuencia', e.target.value)} style={{ padding: '0.4rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                          {FRECUENCIAS.map(f => <option key={f}>{f}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <input value={m.observaciones} onChange={e => updateMed(i, 'observaciones', e.target.value)} placeholder="Notas" style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        {meds.length > 1 && (
                          <button onClick={() => removeMed(i)} style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem', color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '0.6rem 1.25rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Cancelar
            </button>
            <button onClick={handleSave} style={{ padding: '0.6rem 1.5rem', background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600 }}>
              {isEditing ? '💾 Guardar cambios' : '🏥 Guardar y Hospitalizar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
