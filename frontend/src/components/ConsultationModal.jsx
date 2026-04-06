import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useSede, SEDES } from '../utils/useSede';

const EMPTY_MED    = { medicamento: '', dosis: '', via: 'VO' };
const EMPTY_FORMULA = { producto: '', cantidad: '', instrucciones: '' };
const VIAS = ['VO','IM','IV','SC','Tópica','Inhalada','Oftálmica','Ótica'];
const MUCOSAS_OPTS = ['Rosadas húmedas','Pálidas','Congestivas','Cianóticas','Ictéricas','Secas'];
import { TIPOS_LAB } from '../utils/labTypes';

const makeEmpty = () => ({
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  // Anamnesis
  antecedentes: '',
  // Examen físico
  temperatura: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '',
  peso: '', condicion_corporal: '', mucosas: '',
  tiempo_llenado_capilar: '', pulso: '', glicemia: '', presion_arterial: '',
  // Clínico
  hallazgos: '',
  diagnostico_diferencial: '',
  diagnostico_final: '',
  plan_diagnostico: '',
  observaciones: '',
  // Medicamentos aplicados en consulta
  medicamentos_aplicados: [],
  // Fórmula médica (para llevar a casa)
  formula_productos: [],
  // Laboratorios ordenados (array)
  labs_pedidos: [],
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

export default function ConsultationModal({ isOpen, onClose, onSave, pet }) {
  const { sedeActual, isAdmin } = useSede();
  const [form, setForm] = useState(makeEmpty);
  const [sedeId, setSedeId] = useState(sedeActual || 1);

  useEffect(() => {
    if (isOpen) { setForm(makeEmpty()); setSedeId(sedeActual || 1); }
  }, [isOpen, sedeActual]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.date) return alert('La fecha es requerida.');
    if (!form.diagnostico_final.trim()) return alert('El diagnóstico final es requerido.');
    onSave({ ...form, sede_id: sedeId || null });
  };

  // ── Medicamentos aplicados ─────────────────────────────────────────────
  const addMed    = () => set('medicamentos_aplicados', [...form.medicamentos_aplicados, { ...EMPTY_MED }]);
  const removeMed = (i) => set('medicamentos_aplicados', form.medicamentos_aplicados.filter((_,idx)=>idx!==i));
  const updMed    = (i,k,v) => set('medicamentos_aplicados', form.medicamentos_aplicados.map((m,idx)=>idx===i?{...m,[k]:v}:m));

  // ── Laboratorios pedidos ───────────────────────────────────────────────
  const addLab    = () => set('labs_pedidos', [...form.labs_pedidos, { tipo_examen: 'Hemograma', procesamiento: 'Interno' }]);
  const removeLab = (i) => set('labs_pedidos', form.labs_pedidos.filter((_,idx)=>idx!==i));
  const updLab    = (i,k,v) => set('labs_pedidos', form.labs_pedidos.map((l,idx)=>idx===i?{...l,[k]:v}:l));

  // ── Fórmula médica ─────────────────────────────────────────────────────
  const addFx    = () => set('formula_productos', [...form.formula_productos, { ...EMPTY_FORMULA }]);
  const removeFx = (i) => set('formula_productos', form.formula_productos.filter((_,idx)=>idx!==i));
  const updFx    = (i,k,v) => set('formula_productos', form.formula_productos.map((m,idx)=>idx===i?{...m,[k]:v}:m));

  const TA = (label, key, rows=3, borderColor=null) => (
    <div style={{ marginBottom:'1rem' }}>
      <label style={lSt}>{label}</label>
      <textarea value={form[key]} onChange={e=>set(key,e.target.value)} rows={rows}
        style={{ ...taSt, ...(borderColor ? { border:`1px solid ${borderColor}` } : {}) }} />
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`🩺 Nueva Consulta${pet ? ` — ${pet.name}` : ''}`} onSave={handleSave} saveLabel="Guardar consulta" size="xl">

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
          {isAdmin ? (
            <select value={sedeId} onChange={e=>setSedeId(parseInt(e.target.value))} style={iSt}>
              {SEDES.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          ) : (
            <input readOnly value={SEDES.find(s=>s.id===sedeId)?.nombre||'—'} style={{ ...iSt, background:'var(--color-bg)', color:'var(--color-text-muted)' }} />
          )}
        </div>
      </div>

      {/* ── Anamnesis ── */}
      <SectionHeader icon="📋" title="Anamnesis" color="#2e5cbf" />
      {TA('Anamnesis / Antecedentes clínicos', 'antecedentes', 3)}

      {/* ── Examen físico ── */}
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

      {/* ── Hallazgos / Diagnóstico ── */}
      <SectionHeader icon="🧬" title="Hallazgos y Diagnóstico" color="#2e5cbf" />
      {TA('Hallazgos clínicos', 'hallazgos', 3)}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <div>{TA('Diagnóstico diferencial', 'diagnostico_diferencial', 3)}</div>
        <div>
          <label style={{ ...lSt, color:'var(--color-primary)' }}>Diagnóstico final *</label>
          <textarea value={form.diagnostico_final} onChange={e=>set('diagnostico_final',e.target.value)} rows={3}
            style={{ ...taSt, border:'1px solid var(--color-primary)' }} />
        </div>
      </div>
      {TA('Plan diagnóstico / terapéutico', 'plan_diagnostico', 3)}

      {/* ── Medicamentos aplicados en consulta ── */}
      <SectionHeader icon="💉" title="Medicamentos aplicados en consulta" color="#316d74" />
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

      {/* ── Fórmula médica ── */}
      <SectionHeader icon="💊" title="Fórmula médica (para llevar a casa)" color="#a6785b" />
      <div style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.5rem' }}>
          <Button size="sm" variant="secondary" onClick={addFx}>+ Agregar producto</Button>
        </div>
        {form.formula_productos.length === 0 ? (
          <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', fontStyle:'italic', margin:0 }}>Sin productos en fórmula.</p>
        ) : (
          <div style={{ border:'1px solid #e5c4aa', borderRadius:'var(--radius-md)', overflow:'hidden', background:'#fdf8f5' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, background:'#f9ede3' }}>Producto</th>
                  <th style={{ ...thSt, width:110, background:'#f9ede3' }}>Cantidad</th>
                  <th style={{ ...thSt, background:'#f9ede3' }}>Instrucciones</th>
                  <th style={{ width:32, background:'#f9ede3' }}></th>
                </tr>
              </thead>
              <tbody>
                {form.formula_productos.map((m,i) => (
                  <tr key={i} style={{ borderTop:'1px solid #e5c4aa' }}>
                    <td style={tdSt}><input value={m.producto} onChange={e=>updFx(i,'producto',e.target.value)} style={inl} placeholder="Ej: Ciprovet oft." /></td>
                    <td style={tdSt}><input value={m.cantidad} onChange={e=>updFx(i,'cantidad',e.target.value)} style={inl} placeholder="1 frasco" /></td>
                    <td style={tdSt}><input value={m.instrucciones} onChange={e=>updFx(i,'instrucciones',e.target.value)} style={inl} placeholder="1 gota c/12h x 5 días" /></td>
                    <td style={{ padding:'0.3rem', textAlign:'center' }}>
                      <button onClick={()=>removeFx(i)} style={{ color:'var(--color-danger)', background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem', lineHeight:1 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {TA('Observaciones', 'observaciones', 2)}

      {/* ── Laboratorios ordenados ── */}
      <SectionHeader icon="🧪" title="Laboratorios ordenados (opcional)" color="#2e7d50" />
      <div style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.5rem' }}>
          <Button size="sm" variant="secondary" onClick={addLab}>+ Agregar laboratorio</Button>
        </div>
        {form.labs_pedidos.length === 0 ? (
          <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', fontStyle:'italic', margin:0 }}>Sin laboratorios ordenados en esta consulta.</p>
        ) : (
          <div style={{ border:'1px solid #c3e8d0', borderRadius:'var(--radius-md)', overflow:'hidden', background:'#f0fdf4' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, background:'#d8f0e0' }}>Tipo de examen</th>
                  <th style={{ ...thSt, width:150, background:'#d8f0e0' }}>Procesamiento</th>
                  <th style={{ width:32, background:'#d8f0e0' }}></th>
                </tr>
              </thead>
              <tbody>
                {form.labs_pedidos.map((l,i) => (
                  <tr key={i} style={{ borderTop:'1px solid #c3e8d0' }}>
                    <td style={tdSt}>
                      <select value={l.tipo_examen} onChange={e=>updLab(i,'tipo_examen',e.target.value)} style={inl}>
                        {TIPOS_LAB.map(t=><option key={t}>{t}</option>)}
                      </select>
                      {l.tipo_examen === 'Otro' && (
                        <input
                          value={l.otro_tipo || ''}
                          onChange={e=>updLab(i,'otro_tipo',e.target.value)}
                          placeholder="¿Cuál examen?"
                          style={{ ...inl, marginTop:'0.3rem', border:'1px solid #2e7d50' }}
                        />
                      )}
                    </td>
                    <td style={tdSt}>
                      <select value={l.procesamiento} onChange={e=>updLab(i,'procesamiento',e.target.value)} style={inl}>
                        <option>Interno</option>
                        <option>Externo</option>
                      </select>
                    </td>
                    <td style={{ padding:'0.3rem', textAlign:'center' }}>
                      <button onClick={()=>removeLab(i)} style={{ color:'var(--color-danger)', background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem', lineHeight:1 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {form.labs_pedidos.length > 0 && (
          <div style={{ background:'#e8f5ee', border:'1px solid #2e7d50', borderRadius:'var(--radius-sm)', padding:'0.5rem 0.85rem', fontSize:'0.75rem', color:'#2e7d50', marginTop:'0.5rem' }}>
            ✅ Se crearán <strong>{form.labs_pedidos.length}</strong> pedido{form.labs_pedidos.length !== 1 ? 's' : ''} de laboratorio al guardar esta consulta.
          </div>
        )}
      </div>
    </Modal>
  );
}
