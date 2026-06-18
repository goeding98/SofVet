import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES } from '../utils/useSede';
import { ageLabel } from '../utils/ageLabel';
import { nowDate, nowTime } from '../utils/nowLocal';

const MEDICAMENTOS_LISTA = [
  'ACIDO TRANEXAMICO AMPOLLA (5 ML)',
  'ADRENALINA AMPOLLA (1 ML)',
  'AMIKACINA AMPOLLA (2 ML)',
  'AMINOLYTE X 500 ML',
  'AMPICILINA AMPOLLA (5 ML)',
  'AMPICILINA + SULBACTAM AMPOLLA (5 ML)',
  'ASCORVEX X 20 ML',
  'ATROPINA X 50 ML',
  'BRONQUIVET',
  'BROXICLIN X 100 ML',
  'BUPIVACAINA X 10 ML',
  'CEFALOTINA AMPOLLA (5 ML)',
  'CERENIA X 20 ML',
  'CEFTRIAXONA AMPOLLA (5 ML)',
  'CIPROFLOXACINA X 10 ML',
  'CLINDAMICINA AMPOLLA (4 ML)',
  'CLORURO DE POTASIO X 10 ML',
  'COLIVET (DIPIRONA) X 50 ML',
  'COMPLELAND X 100 ML',
  'DEXAMETASONA AMPOLLA (2 ML)',
  'DEXMEDETOMIDINA AMPOLLA (2 ML)',
  'DIAZEPAM AMPOLLA (2 ML)',
  'DIURIVET X 50 ML',
  'DOMOSYN X 120 ML',
  'ENROFLOXACINA X 100 ML',
  'ERITROPOYETINA AMPOLLA (2 ML)',
  'EUTHANEX X 50 ML',
  'FENTANILO X 10 ML',
  'FLUIMUCIL AMPOLLA (3 ML)',
  'GENTAMICINA AMPOLLA (2 ML)',
  'GLUCONATO DE CALCIO 10% (10 ML)',
  'HEPATOGAN X 250 ML',
  'HIOSCINA AMPOLLA (1 ML)',
  'INFLACOR X 20 ML',
  'KAVITEX 20/20 X 20 ML',
  'KETAMINA X 50 ML',
  'KETOBEST X 50 ML',
  'LIDOCAINA X 50 ML',
  'MELOXICAM 0.5% X 10 ML',
  'MELOXICAME 2% X 50 ML',
  'METILPREDNISOLONA AMPOLLA (4 ML)',
  'METOCLOPRAMIDA AMPOLLA (2 ML)',
  'METRONIDAZOL X 100 ML',
  'MIDAZOLAN AMPOLLA (5 ML)',
  'NEODOXIL INYEC X 50 ML',
  'OMEPRAZOL AMPOLLA (10 ML)',
  'ONDANSETRON AMPOLLA (4 ML)',
  'OXITETRACICLINA X 100 ML',
  'PENTHAL X 20 ML',
  'PROPOFOL X 20 ML',
  'QUERCETOL X 50 ML',
  'RANIDIN X 20 ML',
  'REMIFENTANILO AMPOLLA (1 ML)',
  'RESUPRAM X 10 ML',
  'RESTADERM X 100 ML',
  'ROXICAINA X 100 ML',
  'SEDOLAX X 10 ML',
  'TRAMADOL AMPOLLA (2 ML)',
  'TRANQUILAN X 10 ML',
  'TRISEPTIL X 100 ML',
  'UNITRAL X 100 ML',
  'VETHISTAM X 50 ML',
  'XILACINA X 20 ML',
  'EUTHANEX X 50 ML',
  'ZOLETIL X 5 ML',
  'GLOMAX X 50 ML',
];

// Deduplicar y ordenar
const MEDS_SORTED = [...new Set(MEDICAMENTOS_LISTA)].sort();

function MedAutoComplete({ value, isOtro, onChange, onOtroToggle }) {
  const [search,   setSearch]   = useState('');
  const [open,     setOpen]     = useState(false);
  const [dropRect, setDropRect] = useState(null);
  const containerRef = useRef(null);
  const inputRef     = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    // Cerrar si el usuario hace scroll (el input se mueve pero el dropdown fixed no)
    const closeOnScroll = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [open]);

  const handleFocus = () => {
    if (inputRef.current) setDropRect(inputRef.current.getBoundingClientRect());
    setSearch('');
    setOpen(true);
  };

  const filtered = MEDS_SORTED.filter(m =>
    !search || m.toLowerCase().includes(search.toLowerCase())
  );

  if (isOtro) {
    return (
      <div ref={containerRef}>
        <button
          type="button"
          onClick={() => { onOtroToggle(false); onChange(''); }}
          style={{ fontSize: '0.7rem', padding: '1px 6px', background: '#fff8e1', border: '1px solid #f5c842', borderRadius: 3, cursor: 'pointer', marginBottom: '0.3rem', color: '#92400e', fontWeight: 600 }}
        >
          ← Catálogo
        </button>
        <input
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Escribir nombre del medicamento..."
          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid #f59e0b', borderRadius: 'var(--radius-sm)', outline: 'none' }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={open ? search : (value || '')}
        onChange={e => setSearch(e.target.value)}
        onFocus={handleFocus}
        placeholder="Buscar medicamento..."
        style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', outline: 'none' }}
      />
      {open && dropRect && (
        <div style={{
          position: 'fixed',
          top:      dropRect.bottom + 2,
          left:     dropRect.left,
          width:    Math.max(dropRect.width, 300),
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          maxHeight: 240,
          overflowY: 'auto',
          zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
        }} onMouseDown={e => e.preventDefault()}>
          {filtered.length === 0 && (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#999' }}>Sin coincidencias</div>
          )}
          {filtered.map(med => (
            <div
              key={med}
              onMouseDown={e => { e.preventDefault(); onChange(med); setSearch(''); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', lineHeight: 1.35 }}
            >
              {med}
            </div>
          ))}
          <div
            onMouseDown={e => { e.preventDefault(); onOtroToggle(true); onChange(''); setSearch(''); setOpen(false); }}
            onMouseEnter={e => e.currentTarget.style.background = '#fef3cd'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff8e1'}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer', background: '#fff8e1', color: '#92400e', fontWeight: 700, borderTop: '2px solid #f5c842', position: 'sticky', bottom: 0 }}
          >
            ✏️ Otro (escribir manualmente)
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_MED   = { medicamento: '', dosis: '', unidad: 'ml', via: 'IV', frecuencia: 'Cada 8 horas', observaciones: '', _isOtro: false };
const UNIDADES    = ['ml', 'tabletas', 'paquetes', 'mg', 'comprimidos', 'gotas', 'otro'];
const FRECUENCIAS = ['Cada 2 horas', 'Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas', 'Cada 12 horas', 'Cada 24 horas', 'Una sola vez'];
const VIAS        = ['IV', 'IM', 'VO', 'SC', 'Tópica', 'Inhalada', 'Oftálmica', 'Ótica'];

export default function HospitalizationModal({ isOpen, onClose, pet, client, initialData, tipo = 'completa' }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { sedeActual, isAdmin } = useSede();
  const isDomicilio = session?.sede_id === 4;
  const { add: addHosp, edit: editHosp, items: allHosps } = useStore('hospitalization');
  const { items: patients, edit: editPatient } = useStore('patients');
  const isEditing = !!initialData?.id;

  const [motivo,      setMotivo]      = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [meds,        setMeds]        = useState([{ ...EMPTY_MED }]);
  const [sedeId,      setSedeId]      = useState(sedeActual || 1);
  const [viral,       setViral]       = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setMotivo(initialData.motivo || '');
        setDiagnostico(initialData.diagnostico || '');
        setMeds(
          initialData.tratamiento?.length
            ? initialData.tratamiento.map(m => ({ ...m, _isOtro: false }))
            : [{ ...EMPTY_MED }]
        );
        setSedeId(initialData.sede_id || sedeActual || 1);
        setViral(initialData.viral || false);
      } else {
        setMotivo(''); setDiagnostico(''); setMeds([{ ...EMPTY_MED }]); setSedeId(sedeActual || 1); setViral(false);
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

    if (!isEditing) {
      const existente = allHosps.find(h => h.patient_id === pet.id && h.status === 'activo');
      if (existente) return setError(`${pet.name} ya tiene una hospitalización activa desde el ${existente.ingreso_date}. Debe darse de alta antes de crear una nueva.`);
    }

    // Strip UI-only flag before saving
    const tratamientoClean = meds
      .filter(m => m.medicamento.trim())
      .map(({ _isOtro, ...rest }) => rest);

    if (isEditing) {
      editHosp(initialData.id, {
        motivo,
        diagnostico,
        tratamiento:   tratamientoClean,
        sede_id:       sedeId,
        ...(tipo !== 'semi' ? { viral } : {}),
        editado_por:   session?.nombre || null,
        hora_edicion:  nowTime(),
        fecha_edicion: nowDate(),
      });
      onClose();
      return;
    }

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
      tratamiento:     tratamientoClean,
      ingreso_date:    nowDate(),
      ingreso_time:    nowTime(),
      responsible_vet: session?.nombre || 'Sin asignar',
      status:          'activo',
      aplicaciones:    [],
      tipo,
      ...(tipo !== 'semi' ? { viral } : {}),
      conectar_inventario: sedeId === 2,
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
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 900, overflow: 'hidden', margin: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-danger-bg)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-danger)', fontSize: '1.1rem', margin: 0 }}>
              {isEditing
                ? (tipo === 'semi' ? '✏️ Editar Semi-hospitalización' : '✏️ Editar Hospitalización')
                : (tipo === 'semi' ? '🏥 Nueva Semi-hospitalización' : '🏥 Nueva Hospitalización')}
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {pet.name} · {pet.species} {pet.breed ? `(${pet.breed})` : ''} · {pet.weight} kg · {ageLabel(pet.birth_date || pet.fecha_nacimiento, pet.age)}
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

          {/* Viral — solo hospitalización completa */}
          {tipo !== 'semi' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={viral}
                  onChange={e => setViral(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#dc2626', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: viral ? '#dc2626' : 'var(--color-text)' }}>
                  🦠 Paciente viral
                </span>
                {viral && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                    VIRAL
                  </span>
                )}
              </label>
              <p style={{ margin: '0.3rem 0 0 1.6rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Aparecerá en rojo y primero en la lista de hospitalizados.
              </p>
            </div>
          )}

          {/* Tratamiento table */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Plan de tratamiento</label>
              <button onClick={addMed} style={{ padding: '0.3rem 0.75rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                + Agregar fila
              </button>
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Medicamento / Tratamiento', 'Dosis', 'Unidad', 'Vía', 'Frecuencia', 'Observaciones', ''].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meds.map((m, i) => (
                    <tr key={i} style={{ borderBottom: i < meds.length - 1 ? '1px solid var(--color-border)' : 'none', verticalAlign: 'top' }}>
                      <td style={{ padding: '0.5rem 0.5rem', minWidth: 240 }}>
                        <MedAutoComplete
                          value={m.medicamento}
                          isOtro={m._isOtro}
                          onChange={val => updateMed(i, 'medicamento', val)}
                          onOtroToggle={val => updateMed(i, '_isOtro', val)}
                        />
                      </td>
                      <td style={{ padding: '0.5rem 0.5rem' }}>
                        <input value={m.dosis} onChange={e => updateMed(i, 'dosis', e.target.value.replace(',', '.'))} placeholder="0" style={{ width: 60, padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
                      </td>
                      <td style={{ padding: '0.5rem 0.5rem' }}>
                        <select value={m.unidad} onChange={e => updateMed(i, 'unidad', e.target.value)} style={{ padding: '0.4rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                          {UNIDADES.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem 0.5rem' }}>
                        <select value={m.via || 'IV'} onChange={e => updateMed(i, 'via', e.target.value)} style={{ padding: '0.4rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                          {VIAS.map(v => <option key={v}>{v}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem 0.5rem' }}>
                        <select value={m.frecuencia} onChange={e => updateMed(i, 'frecuencia', e.target.value)} style={{ padding: '0.4rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                          {FRECUENCIAS.map(f => <option key={f}>{f}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem 0.5rem' }}>
                        <input value={m.observaciones} onChange={e => updateMed(i, 'observaciones', e.target.value)} placeholder="Notas" style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
                      </td>
                      <td style={{ padding: '0.5rem 0.5rem' }}>
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
              {isEditing ? '💾 Guardar cambios' : (tipo === 'semi' ? '🏥 Guardar y Semi-hospitalizar' : '🏥 Guardar y Hospitalizar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
