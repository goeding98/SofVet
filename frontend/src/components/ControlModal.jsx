import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useSede, SEDES } from '../utils/useSede';
import { useAuth } from '../utils/useAuth';

const EMPTY_MED = { medicamento: '', dosis: '', via: 'VO' };
const VIAS = ['VO','IM','IV','SC','Tópica','Inhalada','Oftálmica','Ótica'];
const MUCOSAS_OPTS = ['Rosadas húmedas','Pálidas','Congestivas','Cianóticas','Ictéricas','Secas'];

const makeEmpty = () => ({
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  motivo_control: '',
  temperatura: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '',
  peso: '', condicion_corporal: '', mucosas: '',
  tiempo_llenado_capilar: '', pulso: '', glicemia: '', presion_arterial: '',
  hallazgos: '',
  observaciones: '',
  medicamentos_aplicados: [],
});

const lSt = {
  display:'block', fontSize:'0.72rem', fontWeight:700, marginBottom:'0.3rem',
  textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--color-text)',
};
const iSt = {
  width:'100%', padding:'0.5rem 0.65rem', border:'1px solid var(--color-border)',
  borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.85rem',
};
const taSt = { ...iSt, resize:'vertical' };
const inl = {
  width:'100%', padding:'0.32rem 0.45rem', border:'1px solid var(--color-border)',
  borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.82rem',
};
const thSt = { padding:'0.45rem 0.6rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--color-bg)' };
const tdSt = { padding:'0.3rem 0.4rem' };

const SectionHeader = ({ icon, title, color='var(--color-primary)' }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', margin:'1.25rem 0 0.75rem', borderBottom:`2px solid ${color}`, paddingBottom:'0.4rem' }}>
    <span style={{ fontSize:'1rem' }}>{icon}</span>
    <span style={{ fontFamily:'var(--font-title)', fontSize:'0.85rem', fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{title}</span>
  </div>
);

// mode: 'new' | 'edit'
export default function ControlModal({ isOpen, onClose, onSave, onDelete, pet, initialData = null, mode = 'new' }) {
  const { sedeActual, isAdmin } = useSede();
  const { session } = useAuth();
  const canChooseSede = isAdmin || session?.sede_id === 4;
  const [form, setForm] = useState(makeEmpty);
  const [sedeId, setSedeId] = useState(sedeActual || 1);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmDel(false);
      if (initialData) {
        setForm({ ...makeEmpty(), ...initialData, medicamentos_aplicados: initialData.medicamentos_aplicados || [] });
        setSedeId(initialData.sede_id || sedeActual || 1);
      } else {
        setForm(makeEmpty());
        setSedeId(sedeActual || 1);
      }
    }
  }, [isOpen, initialData, sedeActual]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.date) return alert('La fecha es requerida.');
    if (!form.motivo_control?.trim()) return alert('El motivo de control es requerido.');
    const now = new Date();
    const hoy = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const horaAhora = now.toTimeString().slice(0, 5);
    if (mode === 'edit') {
      onSave({ ...form, sede_id: sedeId || null, editado_por: session?.nombre || null, hora_edicion: horaAhora, fecha_edicion: hoy });
    } else {
      onSave({ ...form, sede_id: sedeId || null, veterinario: session?.nombre || null });
    }
  };

  const addMed    = () => set('medicamentos_aplicados', [...form.medicamentos_aplicados, { ...EMPTY_MED }]);
  const removeMed = (i) => set('medicamentos_aplicados', form.medicamentos_aplicados.filter((_,idx)=>idx!==i));
  const updMed    = (i,k,v) => set('medicamentos_aplicados', form.medicamentos_aplicados.map((m,idx)=>idx===i?{...m,[k]:v}:m));

  const TA = (label, key, rows=3) => (
    <div style={{ marginBottom:'1rem' }}>
      <label style={lSt}>{label}</label>
      <textarea value={form[key]} onChange={e=>set(key,e.target.value)} rows={rows} style={taSt} />
    </div>
  );

  const NF = (label, key, placeholder='', opts=null) => (
    <div>
      <label style={{ ...lSt, marginBottom:'0.2rem' }}>{label}</label>
      {opts ? (
        <select value={form[key]||''} onChange={e=>set(key,e.target.value)} style={iSt}>
          <option value="">—</option>
          {opts.map(o=><option key={o}>{o}</option>)}
        </select>
      ) : (
        <input value={form[key]||''} onChange={e=>set(key,e.target.value)} placeholder={placeholder} style={iSt} />
      )}
    </div>
  );

  const titles = {
    new:  `📋 Nuevo Control${pet ? ` — ${pet.name}` : ''}`,
    edit: `✏️ Editar Control${pet ? ` — ${pet.name}` : ''}`,
  };

  const deleteFooter = (mode === 'edit' && onDelete) ? (
    !confirmDel ? (
      <button
        onClick={() => setConfirmDel(true)}
        style={{ padding:'0.4rem 0.9rem', background:'none', border:'1px solid #e8c0bb', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.8rem', color:'var(--color-danger)', fontWeight:500 }}
      >
        🗑️ Eliminar control
      </button>
    ) : (
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#fdecea', border:'1px solid #f5c6c2', borderRadius:'var(--radius-sm)', padding:'0.4rem 0.75rem' }}>
        <span style={{ fontSize:'0.78rem', color:'var(--color-danger)', fontWeight:600 }}>¿Confirmar eliminación?</span>
        <button onClick={() => setConfirmDel(false)} style={{ padding:'0.25rem 0.65rem', background:'white', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.75rem', color:'var(--color-text-muted)' }}>No</button>
        <button onClick={() => onDelete(initialData.id)} style={{ padding:'0.25rem 0.65rem', background:'var(--color-danger)', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.75rem', fontWeight:700 }}>Sí, eliminar</button>
      </div>
    )
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titles[mode] || titles.new}
      onSave={handleSave}
      saveLabel={mode === 'edit' ? 'Guardar cambios' : 'Guardar control'}
      leftFooter={deleteFooter}
      size="xl"
    >
      {/* Fecha / Hora / Sede */}
      <div style={{ display:'flex', gap:'1rem', marginBottom:'1rem' }}>
        <div style={{ flex:1 }}>
          <label style={lSt}>Fecha *</label>
          <input type="date" value={form.date} onChange={e=>set('date',e.target.value)} style={iSt} />
        </div>
        <div style={{ flex:1 }}>
          <label style={lSt}>Hora</label>
          <input type="time" value={form.time} onChange={e=>set('time',e.target.value)} style={iSt} />
        </div>
        <div style={{ flex:1 }}>
          <label style={lSt}>Sede</label>
          {canChooseSede ? (
            <select value={sedeId} onChange={e=>setSedeId(parseInt(e.target.value))} style={iSt}>
              {SEDES.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          ) : (
            <input readOnly value={SEDES.find(s=>s.id===sedeId)?.nombre||'—'} style={{ ...iSt, background:'var(--color-bg)', color:'var(--color-text-muted)' }} />
          )}
        </div>
      </div>

      {/* Motivo de control */}
      <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'var(--radius-md)', padding:'0.85rem 1rem', marginBottom:'1rem' }}>
        <label style={{ ...lSt, color:'#15803d' }}>📋 Motivo de control *</label>
        <input value={form.motivo_control||''} onChange={e=>set('motivo_control',e.target.value)} placeholder="Ej: Control post-operatorio, Seguimiento de tratamiento…" style={{ ...iSt, marginTop:'0.1rem' }} />
      </div>

      {/* Examen físico */}
      <SectionHeader icon="🔬" title="Examen Físico" color="#316d74" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.6rem', marginBottom:'0.75rem' }}>
        {NF('Temperatura (°C)', 'temperatura', '38.5')}
        {NF('F. Cardíaca (bpm)', 'frecuencia_cardiaca', '100')}
        {NF('F. Respiratoria (rpm)', 'frecuencia_respiratoria', '24')}
        {NF('Pulso (ppm)', 'pulso', '100')}
        {NF('Peso (kg)', 'peso', '6.50')}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.6rem', marginBottom:'1rem' }}>
        {NF('Cond. corporal (1-9)', 'condicion_corporal', '7')}
        {NF('Mucosas', 'mucosas', '', MUCOSAS_OPTS)}
        {NF('Llenado capilar (seg)', 'tiempo_llenado_capilar', '2')}
        {NF('Glicemia (mg/dL)', 'glicemia', '120')}
        {NF('Presión arterial', 'presion_arterial', '120/80')}
      </div>

      {/* Hallazgos */}
      <SectionHeader icon="🧬" title="Hallazgos clínicos" color="#2e5cbf" />
      {TA('Hallazgos clínicos', 'hallazgos', 3)}

      {/* Medicamentos aplicados */}
      <SectionHeader icon="💉" title="Medicamentos aplicados en control" color="#316d74" />
      <div style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.5rem' }}>
          <Button size="sm" variant="secondary" onClick={addMed}>+ Agregar fila</Button>
        </div>
        {form.medicamentos_aplicados.length === 0 ? (
          <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', fontStyle:'italic', margin:0 }}>Sin medicamentos aplicados.</p>
        ) : (
          <div style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
              <thead>
                <tr>
                  <th style={thSt}>Producto</th>
                  <th style={{ ...thSt, width:110 }}>Dosis</th>
                  <th style={{ ...thSt, width:110 }}>Vía</th>
                  <th style={{ width:32 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.medicamentos_aplicados.map((m,i) => (
                  <tr key={i} style={{ borderTop:'1px solid var(--color-border)' }}>
                    <td style={tdSt}><input value={m.medicamento} onChange={e=>updMed(i,'medicamento',e.target.value)} style={inl} placeholder="Ej: Dipirona" /></td>
                    <td style={tdSt}><input value={m.dosis} onChange={e=>updMed(i,'dosis',e.target.value)} style={inl} placeholder="28mg/kg" /></td>
                    <td style={tdSt}>
                      <select value={m.via} onChange={e=>updMed(i,'via',e.target.value)} style={inl}>
                        {VIAS.map(v=><option key={v}>{v}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'0.3rem', textAlign:'center' }}>
                      <button onClick={()=>removeMed(i)} style={{ color:'var(--color-danger)', background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem', lineHeight:1 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {TA('Observaciones', 'observaciones', 2)}
    </Modal>
  );
}
