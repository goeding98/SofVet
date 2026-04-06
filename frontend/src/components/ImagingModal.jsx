import { useState } from 'react';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES } from '../utils/useSede';
import { supabase } from '../utils/supabaseClient';

const TIPOS = ['Radiografía', 'Ecografía', 'Tomografía / Resonancia'];

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text)',
};

export default function ImagingModal({ isOpen, onClose, onSave, pet }) {
  const { session } = useAuth();
  const { sedeActual, isAdmin } = useSede();

  const [tipo,      setTipo]      = useState('Radiografía');
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [resultado, setResultado] = useState('');
  const [files,     setFiles]     = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [sedeId,    setSedeId]    = useState(sedeActual || 1);

  if (!isOpen || !pet) return null;

  const reset = () => {
    setTipo('Radiografía');
    setDate(new Date().toISOString().split('T')[0]);
    setResultado('');
    setFiles([]);
    setError('');
    setUploading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    setError('');
    if (!date)           return setError('La fecha es requerida.');
    if (!resultado.trim()) return setError('El resultado es requerido.');

    setUploading(true);
    const archivos = [];

    for (const file of files) {
      const path = `${pet.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('imaging')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        // Bucket may not exist — store name only
        archivos.push({ name: file.name, url: null, type: file.type });
      } else {
        const { data: urlData } = supabase.storage.from('imaging').getPublicUrl(path);
        archivos.push({ name: file.name, url: urlData.publicUrl, type: file.type });
      }
    }

    onSave({
      tipo,
      date,
      resultado,
      archivos,
      sede_id:    sedeId,
      created_by: session?.nombre || 'Desconocido',
    });

    setUploading(false);
    reset();
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', backdropFilter: 'blur(2px)', overflowY: 'auto' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 600, overflow: 'hidden', margin: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: '#f0f4ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-title)', color: '#2e5cbf', fontSize: '1.1rem', margin: 0 }}>🔬 Nueva Imagenología</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{pet.name} · {pet.species} {pet.breed ? `(${pet.breed})` : ''}</p>
          </div>
          <button onClick={handleClose} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Tipo */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Tipo de examen *</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {TIPOS.map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  style={{ padding: '0.45rem 1rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', border: `1px solid ${tipo === t ? '#2e5cbf' : 'var(--color-border)'}`, background: tipo === t ? '#2e5cbf' : 'var(--color-white)', color: tipo === t ? 'white' : 'var(--color-text)', transition: 'var(--transition)' }}
                >
                  {t === 'Radiografía' ? '🩻' : t === 'Ecografía' ? '📡' : '🧠'} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha y Sede */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Fecha *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem' }} />
            </div>
            <div>
              <label style={labelStyle}>Sede</label>
              {isAdmin ? (
                <select value={sedeId} onChange={e => setSedeId(parseInt(e.target.value))} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
                  {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              ) : (
                <input readOnly value={SEDES.find(s => s.id === sedeId)?.nombre || '—'} style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--color-bg)', color: 'var(--color-text-muted)' }} />
              )}
            </div>
          </div>

          {/* Resultado */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Resultado / Informe *</label>
            <textarea
              value={resultado}
              onChange={e => setResultado(e.target.value)}
              rows={5}
              placeholder="Describe los hallazgos del examen imagenológico..."
              style={{ width: '100%', padding: '0.6rem 0.75rem', resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: '0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          {/* Archivos */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Adjuntar imágenes / PDF</label>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={e => setFiles(Array.from(e.target.files))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', background: 'var(--color-bg)' }}
            />
            {files.length > 0 && (
              <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {files.map((f, i) => (
                  <span key={i} style={{ background: '#e8f0ff', color: '#2e5cbf', padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 500 }}>
                    📎 {f.name}
                  </span>
                ))}
              </div>
            )}
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
              Formatos: JPG, PNG, PDF. Requiere bucket "imaging" en Supabase Storage.
            </p>
          </div>

          {error && (
            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem', color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={handleClose} style={{ padding: '0.6rem 1.25rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={uploading} style={{ padding: '0.6rem 1.5rem', background: '#2e5cbf', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, opacity: uploading ? 0.7 : 1 }}>
              {uploading ? '⏳ Guardando...' : '🔬 Guardar examen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
