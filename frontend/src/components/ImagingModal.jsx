import { useState, useEffect } from 'react';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES } from '../utils/useSede';
import { supabase } from '../utils/supabaseClient';

const TIPOS = ['Radiografía', 'Ecografía', 'Tomografía / Resonancia'];

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text)',
};
const iSt = { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' };

export default function ImagingModal({ isOpen, onClose, onSave, onEdit, pet, initialData }) {
  const { session } = useAuth();
  const { sedeActual, isAdmin } = useSede();
  const isEditing = !!initialData?.id;

  const [tipo,             setTipo]             = useState('Radiografía');
  const [date,             setDate]             = useState(new Date().toISOString().split('T')[0]);
  const [resultado,        setResultado]        = useState('');
  const [files,            setFiles]            = useState([]);
  const [existingArchivos, setExistingArchivos] = useState([]);
  const [uploading,        setUploading]        = useState(false);
  const [error,            setError]            = useState('');
  const [sedeId,           setSedeId]           = useState(sedeActual || 1);

  useEffect(() => {
    if (isOpen) {
      setError(''); setUploading(false); setFiles([]);
      if (initialData) {
        setTipo(initialData.tipo || 'Radiografía');
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setResultado(initialData.resultado || '');
        setSedeId(initialData.sede_id || sedeActual || 1);
        setExistingArchivos(initialData.archivos || []);
      } else {
        setTipo('Radiografía');
        setDate(new Date().toISOString().split('T')[0]);
        setResultado('');
        setSedeId(sedeActual || 1);
        setExistingArchivos([]);
      }
    }
  }, [isOpen, initialData, sedeActual]);

  if (!isOpen || !pet) return null;

  const reset = () => {
    setTipo('Radiografía'); setDate(new Date().toISOString().split('T')[0]);
    setResultado(''); setFiles([]); setExistingArchivos([]); setError(''); setUploading(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const uploadNewFiles = async () => {
    const archivos = [];
    for (const file of files) {
      const path = `${pet.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('imaging').upload(path, file, { upsert: true });
      if (uploadError) {
        archivos.push({ name: file.name, url: null, type: file.type });
      } else {
        const { data: urlData } = supabase.storage.from('imaging').getPublicUrl(path);
        archivos.push({ name: file.name, url: urlData.publicUrl, type: file.type });
      }
    }
    return archivos;
  };

  const handleSave = async () => {
    setError('');
    if (!date)            return setError('La fecha es requerida.');
    if (!resultado.trim()) return setError('El resultado es requerido.');
    setUploading(true);
    const newArchivos = await uploadNewFiles();
    const now = new Date();
    onSave({
      tipo, date, resultado,
      archivos:      newArchivos,
      sede_id:       sedeId,
      created_by:    session?.nombre || 'Desconocido',
      hora_creacion: now.toTimeString().slice(0, 5),
    });
    setUploading(false);
    reset(); onClose();
  };

  const handleEditSave = async () => {
    setError('');
    if (!date)            return setError('La fecha es requerida.');
    if (!resultado.trim()) return setError('El resultado es requerido.');
    setUploading(true);
    const newArchivos = files.length > 0 ? await uploadNewFiles() : [];
    const finalArchivos = [...existingArchivos, ...newArchivos];
    const now = new Date();
    onEdit(initialData.id, {
      tipo, date, resultado,
      archivos:      finalArchivos,
      sede_id:       sedeId,
      editado_por:   session?.nombre || null,
      hora_edicion:  now.toTimeString().slice(0, 5),
      fecha_edicion: now.toISOString().split('T')[0],
    });
    setUploading(false);
    reset(); onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', backdropFilter: 'blur(2px)', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 600, overflow: 'hidden', margin: 'auto' }}>

        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: isEditing ? '#fff8f0' : '#f0f4ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-title)', color: isEditing ? '#b45309' : '#2e5cbf', fontSize: '1.1rem', margin: 0 }}>
              {isEditing ? '✏️ Editar Imagenología' : '🔬 Nueva Imagenología'}
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{pet.name} · {pet.species} {pet.breed ? `(${pet.breed})` : ''}</p>
          </div>
          <button onClick={handleClose} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Tipo de examen *</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {TIPOS.map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  style={{ padding: '0.45rem 1rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', border: `1px solid ${tipo === t ? '#2e5cbf' : 'var(--color-border)'}`, background: tipo === t ? '#2e5cbf' : 'var(--color-white)', color: tipo === t ? 'white' : 'var(--color-text)', transition: 'var(--transition)' }}>
                  {t === 'Radiografía' ? '🩻' : t === 'Ecografía' ? '📡' : '🧠'} {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Fecha *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={iSt} />
            </div>
            <div>
              <label style={labelStyle}>Sede</label>
              {isAdmin ? (
                <select value={sedeId} onChange={e => setSedeId(parseInt(e.target.value))} style={iSt}>
                  {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              ) : (
                <input readOnly value={SEDES.find(s => s.id === sedeId)?.nombre || '—'} style={{ ...iSt, background: 'var(--color-bg)', color: 'var(--color-text-muted)' }} />
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Resultado / Informe *</label>
            <textarea value={resultado} onChange={e => setResultado(e.target.value)} rows={5} placeholder="Describe los hallazgos del examen imagenológico..."
              style={{ width: '100%', padding: '0.6rem 0.75rem', resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: '0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
          </div>

          {/* Archivos existentes en modo edición */}
          {isEditing && existingArchivos.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Archivos actuales</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {existingArchivos.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#e8f0ff', border: '1px solid #2e5cbf', borderRadius: 'var(--radius-sm)' }}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: '0.82rem', color: '#1565c0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>📎 {a.name}</a>
                    <button onClick={() => setExistingArchivos(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.72rem', padding: '2px 8px', fontFamily: 'var(--font-body)' }}>
                      🗑 Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>{isEditing ? 'Agregar archivos' : 'Adjuntar imágenes / PDF'}</label>
            <input type="file" multiple accept="image/*,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => setFiles(Array.from(e.target.files))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', background: 'var(--color-bg)' }} />
            {files.length > 0 && (
              <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {files.map((f, i) => (
                  <span key={i} style={{ background: '#e8f0ff', color: '#2e5cbf', padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 500 }}>📎 {f.name}</span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem', color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>⚠️ {error}</div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={handleClose} style={{ padding: '0.6rem 1.25rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Cancelar</button>
            <button onClick={isEditing ? handleEditSave : handleSave} disabled={uploading}
              style={{ padding: '0.6rem 1.5rem', background: isEditing ? '#b45309' : '#2e5cbf', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, opacity: uploading ? 0.7 : 1 }}>
              {uploading ? '⏳ Guardando...' : isEditing ? '💾 Guardar cambios' : '🔬 Guardar examen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
