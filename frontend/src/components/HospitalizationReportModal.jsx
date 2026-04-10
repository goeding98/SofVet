import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../utils/useAuth';
import { supabase } from '../utils/supabaseClient';

const lSt = { display:'block', fontSize:'0.72rem', fontWeight:700, marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--color-text)' };

export default function HospitalizationReportModal({ isOpen, onClose, onSave, pet, hospitalizationId, initialData }) {
  const { session } = useAuth();
  const fileRef    = useRef(null);
  const isEditing  = !!initialData?.id;

  const [contenido,  setContenido] = useState('');
  const [files,      setFiles]     = useState([]);
  const [uploading,  setUploading] = useState(false);
  const [error,      setError]     = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setContenido(initialData.contenido || '');
        setFiles([]);
      } else {
        setContenido('');
        setFiles([]);
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen || !pet) return null;

  const reset = () => { setContenido(''); setFiles([]); setError(''); setUploading(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleFiles = (e) => {
    const arr = Array.from(e.target.files).filter(f => f.size <= 10*1024*1024);
    setFiles(prev => [...prev, ...arr]);
  };

  const handleSave = async () => {
    if (!contenido.trim()) { setError('El contenido del reporte es requerido.'); return; }
    setError(''); setUploading(true);

    const fotos = [];
    for (const file of files) {
      const path = `hospitalizacion-reports/${hospitalizationId}/${new Date().toISOString().split('T')[0]}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('hospitalizacion-reports').upload(path, file, { upsert:true });
      if (!upErr) {
        const { data } = supabase.storage.from('hospitalizacion-reports').getPublicUrl(path);
        fotos.push({ name: file.name, url: data.publicUrl });
      } else {
        fotos.push({ name: file.name, url: null });
      }
    }

    setUploading(false);
    // En edición conservamos las fotos existentes + las nuevas
    const fotosFinales = isEditing
      ? [...(initialData.fotos || []), ...fotos]
      : fotos;
    onSave({
      ...(isEditing ? { id: initialData.id } : {}),
      hospitalization_id: hospitalizationId,
      contenido,
      fotos: fotosFinales,
      veterinario: session?.nombre || 'Desconocido',
      fecha: isEditing ? initialData.fecha : new Date().toISOString().split('T')[0],
    });
    reset(); onClose();
  };

  return (
    <div onClick={handleClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem 1rem', backdropFilter:'blur(2px)', overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:580, margin:'auto', overflow:'hidden' }}>

        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#fdecea', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontFamily:'var(--font-title)', color:'#c0392b', fontSize:'1.1rem', margin:0 }}>{isEditing ? '✏️ Editar Reporte' : '🏥 Reporte de Hospitalización'}</h3>
            <p style={{ margin:'0.2rem 0 0', fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{pet.name} · {pet.species}</p>
          </div>
          <button onClick={handleClose} style={{ width:32, height:32, background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        <div style={{ padding:'1.5rem' }}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ ...lSt, color:'var(--color-primary)' }}>Contenido del reporte *</label>
            <textarea value={contenido} onChange={e=>setContenido(e.target.value)} rows={7}
              style={{ width:'100%', padding:'0.6rem 0.75rem', resize:'vertical', fontFamily:'var(--font-body)', fontSize:'0.875rem', border:'1px solid var(--color-primary)', borderRadius:'var(--radius-sm)' }}
              placeholder="Evolución del paciente, cambios en tratamiento, observaciones, signos vitales, alimentación, comportamiento..." />
          </div>

          {/* Fotos */}
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={lSt}>Fotografías del paciente (opcional)</label>
            <button onClick={()=>fileRef.current?.click()} style={{ width:'100%', padding:'0.7rem', border:'2px dashed var(--color-border)', borderRadius:'var(--radius-md)', background:'var(--color-bg)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.82rem', color:'var(--color-text-muted)', marginBottom:'0.5rem' }}>
              📷 Agregar fotos (JPG, PNG)
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFiles} style={{ display:'none' }} />
            {files.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginTop:'0.4rem' }}>
                {files.map((f,i) => (
                  <div key={i} style={{ position:'relative' }}>
                    <img src={URL.createObjectURL(f)} alt={f.name} style={{ width:72, height:72, objectFit:'cover', borderRadius:'var(--radius-sm)', border:'1px solid var(--color-border)' }} />
                    <button onClick={()=>setFiles(prev=>prev.filter((_,idx)=>idx!==i))}
                      style={{ position:'absolute', top:-4, right:-4, width:18, height:18, background:'var(--color-danger)', color:'white', border:'none', borderRadius:'50%', cursor:'pointer', fontSize:'0.6rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom:'1.25rem', background:'var(--color-bg)', borderRadius:'var(--radius-sm)', padding:'0.65rem 0.85rem', fontSize:'0.78rem', color:'var(--color-text-muted)' }}>
            👨‍⚕️ <strong style={{ color:'var(--color-text)' }}>{session?.nombre || 'Desconocido'}</strong> · 📅 {new Date().toLocaleDateString('es-CO')}
          </div>

          {error && <div style={{ background:'var(--color-danger-bg)', border:'1px solid var(--color-danger)', borderRadius:'var(--radius-sm)', padding:'0.6rem 0.9rem', color:'var(--color-danger)', fontSize:'0.8rem', marginBottom:'1rem' }}>⚠️ {error}</div>}

          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <button onClick={handleClose} style={{ padding:'0.6rem 1.25rem', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={uploading} style={{ padding:'0.6rem 1.5rem', background:'#c0392b', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:uploading?'not-allowed':'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:600, opacity:uploading?0.7:1 }}>
              {uploading ? '⏳ Subiendo fotos...' : isEditing ? '💾 Guardar cambios' : '🏥 Guardar reporte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
