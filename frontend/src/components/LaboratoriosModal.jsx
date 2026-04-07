import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../utils/useAuth';
import { supabase } from '../utils/supabaseClient';

const lSt = { display:'block', fontSize:'0.72rem', fontWeight:700, marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--color-text)' };
const iSt = { width:'100%', padding:'0.55rem 0.75rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.875rem' };
const taSt = { ...iSt, resize:'vertical' };

export default function LaboratoriosModal({ isOpen, onClose, onSave, pet, pedidos = [] }) {
  const { session } = useAuth();
  const fileRef = useRef(null);

  const solicitados = pedidos.filter(p => p.estado === 'Solicitado');

  const [selectedPedidoId, setSelectedPedidoId] = useState('');
  const [resultados,        setResult]           = useState('');
  const [files,             setFiles]            = useState([]);  // array of File objects
  const [uploading,         setUploading]        = useState(false);
  const [error,             setError]            = useState('');

  useEffect(() => {
    if (isOpen) {
      setResult(''); setFiles([]); setError(''); setUploading(false);
      setSelectedPedidoId(solicitados.length === 1 ? String(solicitados[0].id) : '');
    }
  }, [isOpen, solicitados.length]);

  if (!isOpen || !pet) return null;

  const reset = () => { setResult(''); setFiles([]); setError(''); setUploading(false); setSelectedPedidoId(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    const oversize = selected.filter(f => f.size > 10 * 1024 * 1024);
    if (oversize.length) { setError(`Archivo(s) demasiado grande(s): ${oversize.map(f=>f.name).join(', ')} (máx 10MB c/u)`); return; }
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const news = selected.filter(f => !existingNames.has(f.name));
      return [...prev, ...news];
    });
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const selectedPedido = solicitados.find(p => String(p.id) === selectedPedidoId);

  const handleSave = async () => {
    if (solicitados.length === 0) return;
    if (solicitados.length > 1 && !selectedPedidoId) { setError('Selecciona a qué pedido corresponde este resultado.'); return; }

    setError('');
    const archivos = [];

    if (files.length > 0) {
      setUploading(true);
      const date = new Date().toISOString().split('T')[0];
      for (const file of files) {
        const safeName = file.name
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quitar tildes
          .replace(/[^a-zA-Z0-9._-]/g, '_');                  // reemplazar especiales con _
        const path = `laboratorios/${pet.id}/${date}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from('laboratorios-reports').upload(path, file, { upsert: true });
        if (upErr) {
          setError(`Error subiendo ${file.name}: ${upErr.message}`);
          setUploading(false);
          return;
        }
        const { data } = supabase.storage.from('laboratorios-reports').getPublicUrl(path);
        archivos.push({ name: file.name, url: data.publicUrl });
      }
      setUploading(false);
    }

    onSave({
      tipo:       selectedPedido?.tipo_examen || 'Otro',
      resultados,
      file_url:   archivos[0]?.url || null,   // first file for backward compat
      archivos,                                // all files
      pedido_id:  selectedPedido?.id || null,
      created_by: session?.nombre || 'Desconocido',
      fecha:      new Date().toISOString().split('T')[0],
    });
    reset(); onClose();
  };

  // ── BLOCKED: no pending labs ──────────────────────────────────────────────
  if (solicitados.length === 0) {
    return (
      <div onClick={handleClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem 1rem', backdropFilter:'blur(2px)' }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:440, overflow:'hidden' }}>
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#fff8e1', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ fontFamily:'var(--font-title)', color:'#b8860b', fontSize:'1.1rem', margin:0 }}>🧪 Subir Resultado</h3>
            <button onClick={handleClose} style={{ width:32, height:32, background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
          <div style={{ padding:'2rem 1.5rem', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>⚠️</div>
            <p style={{ fontWeight:600, color:'var(--color-text)', marginBottom:'0.5rem' }}>No hay laboratorios solicitados para <strong>{pet.name}</strong>.</p>
            <p style={{ fontSize:'0.82rem', color:'var(--color-text-muted)', marginBottom:'1.5rem' }}>Primero solicita un laboratorio usando el botón <strong>"Solicitar laboratorio"</strong> o al guardar una consulta.</p>
            <button onClick={handleClose} style={{ padding:'0.6rem 1.5rem', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:600 }}>Entendido</button>
          </div>
        </div>
      </div>
    );
  }

  // ── NORMAL: upload form ───────────────────────────────────────────────────
  return (
    <div onClick={handleClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem 1rem', backdropFilter:'blur(2px)', overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:540, margin:'auto', overflow:'hidden' }}>

        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#f0fdf4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontFamily:'var(--font-title)', color:'#2e7d50', fontSize:'1.1rem', margin:0 }}>🧪 Subir Resultado de Laboratorio</h3>
            <p style={{ margin:'0.2rem 0 0', fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{pet.name} · {pet.species}</p>
          </div>
          <button onClick={handleClose} style={{ width:32, height:32, background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        <div style={{ padding:'1.5rem' }}>

          {/* Pedido selector */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lSt}>¿A qué pedido corresponde este resultado? *</label>
            {solicitados.length === 1 ? (
              <div style={{ padding:'0.75rem 1rem', background:'#e8f5ee', border:'1px solid #2e7d50', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', gap:'0.6rem' }}>
                <span style={{ fontSize:'1.1rem' }}>🧪</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:'0.875rem', color:'#2e7d50' }}>{solicitados[0].tipo_examen}</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--color-text-muted)' }}>
                    {solicitados[0].procesamiento} · Solicitado el {solicitados[0].fecha_solicitado}
                  </div>
                </div>
              </div>
            ) : (
              <select value={selectedPedidoId} onChange={e=>setSelectedPedidoId(e.target.value)} style={{ ...iSt, border:'1px solid #2e7d50' }}>
                <option value="">— Selecciona el examen —</option>
                {solicitados.map(p => (
                  <option key={p.id} value={String(p.id)}>
                    {p.tipo_examen} ({p.procesamiento}) · {p.fecha_solicitado}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Resultados */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lSt}>Resultados / Interpretación</label>
            <textarea value={resultados} onChange={e=>setResult(e.target.value)} rows={3} style={taSt} placeholder="Describa los resultados o hallazgos del laboratorio..." />
          </div>

          {/* PDF upload — múltiple */}
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={lSt}>Adjuntar PDFs (puedes seleccionar varios)</label>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', marginBottom:'0.5rem' }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.5rem 0.75rem', background:'#e8f5ee', border:'1px solid #2e7d50', borderRadius:'var(--radius-sm)' }}>
                    <span style={{ fontSize:'0.82rem', color:'#2e7d50', fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>📄 {f.name}</span>
                    <span style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', flexShrink:0 }}>{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-danger)', fontSize:'1rem', flexShrink:0, padding:'0 2px' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => fileRef.current?.click()}
              style={{ width:'100%', padding:'0.75rem', border:'2px dashed var(--color-border)', borderRadius:'var(--radius-md)', background:'var(--color-bg)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.82rem', color:'var(--color-text-muted)' }}
            >
              📎 {files.length > 0 ? 'Agregar más PDFs' : 'Seleccionar PDFs'}
            </button>
            <input ref={fileRef} type="file" accept=".pdf" multiple onChange={handleFiles} style={{ display:'none' }} />

            {files.length > 0 && (
              <div style={{ marginTop:'0.4rem', fontSize:'0.75rem', color:'#2e7d50' }}>
                {files.length} archivo{files.length !== 1 ? 's' : ''} seleccionado{files.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div style={{ marginBottom:'1.25rem', background:'var(--color-bg)', borderRadius:'var(--radius-sm)', padding:'0.65rem 0.85rem', fontSize:'0.78rem', color:'var(--color-text-muted)' }}>
            👨‍⚕️ Registrado por: <strong style={{ color:'var(--color-text)' }}>{session?.nombre || 'Desconocido'}</strong>
          </div>

          {error && <div style={{ background:'var(--color-danger-bg)', border:'1px solid var(--color-danger)', borderRadius:'var(--radius-sm)', padding:'0.6rem 0.9rem', color:'var(--color-danger)', fontSize:'0.8rem', marginBottom:'1rem' }}>⚠️ {error}</div>}

          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <button onClick={handleClose} style={{ padding:'0.6rem 1.25rem', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={uploading} style={{ padding:'0.6rem 1.5rem', background:'#2e7d50', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:uploading?'not-allowed':'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:600, opacity:uploading?0.7:1 }}>
              {uploading ? `⏳ Subiendo ${files.length} archivo${files.length!==1?'s':''}...` : '🧪 Guardar resultado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
