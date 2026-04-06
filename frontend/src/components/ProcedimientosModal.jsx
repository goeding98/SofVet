import { useState } from 'react';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES } from '../utils/useSede';

const TIPOS = ['Cirugía', 'Profilaxis', 'Procedimiento General'];

const lSt = { display:'block', fontSize:'0.72rem', fontWeight:700, marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--color-text)' };
const iSt = { width:'100%', padding:'0.55rem 0.75rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.875rem' };
const taSt = { ...iSt, resize:'vertical' };

const TIPO_ICON = { 'Cirugía':'🔪', 'Profilaxis':'🛡️', 'Procedimiento General':'⚕️' };
const TIPO_COLOR = { 'Cirugía':'#c0392b', 'Profilaxis':'#2e7d50', 'Procedimiento General':'#2e5cbf' };

export default function ProcedimientosModal({ isOpen, onClose, onSave, pet }) {
  const { session } = useAuth();
  const { sedeActual, isAdmin } = useSede();
  const [tipo, setTipo]         = useState('Cirugía');
  const [descripcion, setDesc]  = useState('');
  const [anestesia, setAnest]   = useState('');
  const [observaciones, setObs] = useState('');
  const [sedeId, setSedeId]     = useState(sedeActual || 1);
  const [error, setError]       = useState('');

  if (!isOpen || !pet) return null;

  const reset = () => { setTipo('Cirugía'); setDesc(''); setAnest(''); setObs(''); setError(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSave = () => {
    if (!descripcion.trim()) { setError('La descripción es requerida.'); return; }
    onSave({
      tipo, descripcion, anestesia, observaciones,
      sede_id: sedeId,
      veterinario: session?.nombre || 'Desconocido',
      fecha: new Date().toISOString().split('T')[0],
    });
    reset(); onClose();
  };

  const color = TIPO_COLOR[tipo] || '#2e5cbf';

  return (
    <div onClick={handleClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem 1rem', backdropFilter:'blur(2px)', overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:560, margin:'auto', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#f5f8ff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontFamily:'var(--font-title)', color:'#2e5cbf', fontSize:'1.1rem', margin:0 }}>⚕️ Nuevo Procedimiento</h3>
            <p style={{ margin:'0.2rem 0 0', fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{pet.name} · {pet.species}{pet.breed?` (${pet.breed})`:''}</p>
          </div>
          <button onClick={handleClose} style={{ width:32, height:32, background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        <div style={{ padding:'1.5rem' }}>
          {/* Tipo */}
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={lSt}>Tipo de procedimiento *</label>
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'0.3rem' }}>
              {TIPOS.map(t => (
                <button key={t} onClick={()=>setTipo(t)}
                  style={{ padding:'0.45rem 1rem', borderRadius:999, fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', border:`1px solid ${tipo===t?TIPO_COLOR[t]:'var(--color-border)'}`, background:tipo===t?TIPO_COLOR[t]:'var(--color-white)', color:tipo===t?'white':'var(--color-text)' }}>
                  {TIPO_ICON[t]} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha + Sede */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            <div>
              <label style={lSt}>Fecha</label>
              <input readOnly value={new Date().toISOString().split('T')[0]} style={{ ...iSt, background:'var(--color-bg)', color:'var(--color-text-muted)' }} />
            </div>
            <div>
              <label style={lSt}>Sede</label>
              {isAdmin ? (
                <select value={sedeId} onChange={e=>setSedeId(parseInt(e.target.value))} style={iSt}>
                  {SEDES.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              ) : (
                <input readOnly value={SEDES.find(s=>s.id===sedeId)?.nombre||'—'} style={{ ...iSt, background:'var(--color-bg)', color:'var(--color-text-muted)' }} />
              )}
            </div>
          </div>

          {/* Descripción */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lSt}>Descripción *</label>
            <textarea value={descripcion} onChange={e=>setDesc(e.target.value)} rows={4}
              style={{ ...taSt, border:`1px solid ${color}` }} placeholder="Describe el procedimiento realizado..." />
          </div>

          {/* Anestesia */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lSt}>Anestesia utilizada</label>
            <input value={anestesia} onChange={e=>setAnest(e.target.value)} style={iSt} placeholder="Ej: Ketamina 5mg/kg IM + Xilazina 1mg/kg IM" />
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={lSt}>Observaciones post-procedimiento</label>
            <textarea value={observaciones} onChange={e=>setObs(e.target.value)} rows={3} style={taSt} placeholder="Evolución, indicaciones, cuidados..." />
          </div>

          {/* Veterinario */}
          <div style={{ marginBottom:'1.25rem', background:'var(--color-bg)', borderRadius:'var(--radius-sm)', padding:'0.65rem 0.85rem', fontSize:'0.78rem', color:'var(--color-text-muted)' }}>
            👨‍⚕️ Veterinario: <strong style={{ color:'var(--color-text)' }}>{session?.nombre || 'Desconocido'}</strong>
          </div>

          {error && <div style={{ background:'var(--color-danger-bg)', border:'1px solid var(--color-danger)', borderRadius:'var(--radius-sm)', padding:'0.6rem 0.9rem', color:'var(--color-danger)', fontSize:'0.8rem', marginBottom:'1rem' }}>⚠️ {error}</div>}

          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <button onClick={handleClose} style={{ padding:'0.6rem 1.25rem', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding:'0.6rem 1.5rem', background:color, color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:600 }}>
              {TIPO_ICON[tipo]} Guardar procedimiento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
