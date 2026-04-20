import { useState } from 'react';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES } from '../utils/useSede';
import { TIPOS_LAB } from '../utils/labTypes';

const lSt = { display:'block', fontSize:'0.72rem', fontWeight:700, marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--color-text)' };
const iSt = { width:'100%', padding:'0.55rem 0.75rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.875rem' };

export default function SolicitarLabModal({ isOpen, onClose, onSave, pet }) {
  const { session } = useAuth();
  const { sedeActual, isAdmin } = useSede();
  const isLab       = session?.rol === 'Laboratorio';
  const isDomicilio = session?.sede_id === 4;

  const [tipo,          setTipo]         = useState('Hemograma');
  const [otroTipo,      setOtroTipo]     = useState('');
  const [procesamiento, setProcesamiento] = useState('Interno');
  const [sedeId,        setSedeId]        = useState(sedeActual || 1);

  if (!isOpen || !pet) return null;

  const reset = () => { setTipo('Hemograma'); setOtroTipo(''); setProcesamiento('Interno'); setSedeId(sedeActual || 1); };
  const handleClose = () => { reset(); onClose(); };

  const tipoFinal = tipo === 'Otro' ? (otroTipo.trim() || 'Otro') : tipo;

  const handleSave = () => {
    if (tipo === 'Otro' && !otroTipo.trim()) { alert('Especifica el nombre del examen.'); return; }
    onSave({
      tipo_examen:      tipoFinal,
      procesamiento,
      sede_id:          sedeId,
      patient_name:     pet.name,
      estado:           'Solicitado',
      fecha_solicitado: new Date().toISOString().split('T')[0],
      hora_solicitado:  new Date().toTimeString().slice(0, 5),
      solicitado_por:   session?.nombre || 'Desconocido',
    });
    reset(); onClose();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem 1rem', backdropFilter:'blur(2px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:420, overflow:'hidden' }}>

        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#f0fdf4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontFamily:'var(--font-title)', color:'#2e7d50', fontSize:'1.1rem', margin:0 }}>🧪 Solicitar Laboratorio</h3>
            <p style={{ margin:'0.2rem 0 0', fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{pet.name} · {pet.species}</p>
          </div>
          <button onClick={handleClose} style={{ width:32, height:32, background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div>
            <label style={lSt}>Tipo de examen *</label>
            <select value={tipo} onChange={e=>setTipo(e.target.value)} style={iSt}>
              {TIPOS_LAB.map(t=><option key={t}>{t}</option>)}
            </select>
            {tipo === 'Otro' && (
              <input
                value={otroTipo}
                onChange={e=>setOtroTipo(e.target.value)}
                placeholder="¿Cuál examen?"
                style={{ ...iSt, marginTop:'0.5rem', border:'1px solid #2e7d50' }}
                autoFocus
              />
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div>
              <label style={lSt}>Procesamiento</label>
              <select value={procesamiento} onChange={e=>setProcesamiento(e.target.value)} style={iSt}>
                <option>Interno</option>
                <option>Externo</option>
              </select>
            </div>
            <div>
              <label style={lSt}>Sede</label>
              {(isAdmin || isLab || isDomicilio) ? (
                <select value={sedeId} onChange={e=>setSedeId(parseInt(e.target.value))} style={iSt}>
                  {SEDES.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              ) : (
                <input readOnly value={SEDES.find(s=>s.id===sedeId)?.nombre||'—'} style={{ ...iSt, background:'var(--color-bg)', color:'var(--color-text-muted)' }} />
              )}
            </div>
          </div>

          <div style={{ background:'var(--color-bg)', borderRadius:'var(--radius-sm)', padding:'0.6rem 0.85rem', fontSize:'0.78rem', color:'var(--color-text-muted)' }}>
            👨‍⚕️ Solicitado por: <strong style={{ color:'var(--color-text)' }}>{session?.nombre || 'Desconocido'}</strong>
          </div>

          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <button onClick={handleClose} style={{ padding:'0.6rem 1.25rem', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding:'0.6rem 1.5rem', background:'#2e7d50', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:600 }}>
              🧪 Solicitar pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
