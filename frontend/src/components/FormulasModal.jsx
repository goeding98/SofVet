import { useMemo, useState } from 'react';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { getTP } from '../utils/vetCards';

const BRAND = {
  teal:    '#316d74',
  tealLt:  '#99b2aa',
  cream:   '#f8d8b6',
  brown:   '#a6785b',
  white:   '#ffffff',
  bgRow:   '#f4f8f7',
};

const ESTADO_CFG = {
  Pendiente: { bg:'#fff8e1', color:'#b8860b' },
  Entregada: { bg:'#e8f5ee', color:'#2e7d50' },
  Pagada:    { bg:'#e8f0ff', color:'#2e5cbf' },
};

function estadoBadge(estado) {
  const cfg = ESTADO_CFG[estado] || ESTADO_CFG['Pendiente'];
  return (
    <span style={{ background:cfg.bg, color:cfg.color, padding:'3px 10px', borderRadius:999, fontSize:'0.7rem', fontWeight:700 }}>
      {estado || 'Pendiente'}
    </span>
  );
}

// ── PDF generator ─────────────────────────────────────────────────────────────
function buildPDFHtml(formula, pet, client) {
  const prods = Array.isArray(formula.productos) ? formula.productos : [];
  const vetTP = formula.veterinario ? getTP(formula.veterinario) : null;
  const rows = prods.map((p, i) => `
    <tr style="background:${i%2===0?'#ffffff':'#f4f8f7'}">
      <td style="padding:7px 10px;text-align:center;font-weight:700;color:${BRAND.teal};border-bottom:1px solid #dde8e6">${i+1}</td>
      <td style="padding:7px 10px;font-weight:600;border-bottom:1px solid #dde8e6">${p.producto||'—'}</td>
      <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #dde8e6">${p.cantidad||'—'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #dde8e6">${p.instrucciones||'—'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:12px; color:#222; background:#fff; padding:28px 32px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; border-bottom:3px solid ${BRAND.teal}; padding-bottom:14px; }
    .title { font-size:26px; font-weight:700; color:${BRAND.teal}; letter-spacing:-0.5px; }
    .subtitle { font-size:12px; color:#666; margin-top:3px; }
    .section-header { background:${BRAND.teal}; color:#fff; padding:6px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0; border-radius:4px 4px 0 0; }
    .section-body { border:1px solid ${BRAND.tealLt}; border-top:none; border-radius:0 0 4px 4px; padding:10px 14px; margin-bottom:14px; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:6px 20px; }
    .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px 20px; }
    .field-label { font-size:9px; font-weight:700; text-transform:uppercase; color:#888; letter-spacing:0.05em; }
    .field-value { font-size:12px; font-weight:600; color:#222; margin-top:1px; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:${BRAND.teal}; }
    thead th { padding:8px 10px; color:#fff; font-size:10px; font-weight:700; text-align:left; text-transform:uppercase; letter-spacing:0.06em; }
    thead th:first-child { text-align:center; width:40px; }
    thead th:nth-child(3) { text-align:center; width:80px; }
    .footer { margin-top:24px; padding-top:12px; border-top:2px solid ${BRAND.tealLt}; display:flex; justify-content:space-between; align-items:center; }
    .footer-left { font-size:10px; color:#555; line-height:1.7; }
    .footer-right { font-size:10px; color:#555; text-align:right; line-height:1.7; }
    .vet-sig { margin-top:28px; text-align:right; padding-right:20px; }
    .vet-sig .line { border-top:1px solid #999; width:160px; margin:0 0 4px auto; }
    .vet-sig .label { font-size:10px; color:#666; }
    @media print { body { padding:14px 18px; } }
  </style></head>
  <body>
    <div class="header">
      <div>
        <div class="title">Fórmula Médica</div>
        <div class="subtitle">Fecha: ${formula.fecha || '—'}${formula.veterinario ? ' &nbsp;·&nbsp; ' + formula.veterinario : ''}</div>
      </div>
    </div>

    <div class="section-header">Datos del Propietario</div>
    <div class="section-body">
      <div class="grid2">
        <div><div class="field-label">Identificación</div><div class="field-value">${client?.document || client?.id || '—'}</div></div>
        <div><div class="field-label">Nombre</div><div class="field-value">${client?.name || '—'}</div></div>
        <div><div class="field-label">Teléfono</div><div class="field-value">${client?.phone || '—'}</div></div>
        <div><div class="field-label">Dirección</div><div class="field-value">${client?.address || '—'}</div></div>
      </div>
    </div>

    <div class="section-header">Datos del Paciente</div>
    <div class="section-body">
      <div class="grid3">
        <div><div class="field-label">Nombre</div><div class="field-value">${pet?.name || '—'}</div></div>
        <div><div class="field-label">Especie</div><div class="field-value">${pet?.species || '—'}</div></div>
        <div><div class="field-label">Raza</div><div class="field-value">${pet?.breed || '—'}</div></div>
        <div><div class="field-label">Edad</div><div class="field-value">${pet?.age ? pet.age + ' años' : '—'}</div></div>
        <div><div class="field-label">Peso</div><div class="field-value">${pet?.weight ? pet.weight + ' kg' : '—'}</div></div>
        <div><div class="field-label">Sexo</div><div class="field-value">${pet?.sex || '—'}</div></div>
      </div>
    </div>

    <div class="section-header">Medicamentos Formulados</div>
    <div style="border:1px solid ${BRAND.tealLt};border-top:none;border-radius:0 0 4px 4px;margin-bottom:14px;overflow:hidden">
      ${prods.length === 0
        ? `<p style="padding:16px;text-align:center;color:#999;font-style:italic">Sin medicamentos registrados.</p>`
        : `<table><thead><tr><th>#</th><th>Producto</th><th>Cantidad</th><th>Indicaciones</th></tr></thead><tbody>${rows}</tbody></table>`}
    </div>

    ${formula.observaciones ? `<div style="margin-bottom:16px;padding:10px 14px;background:#f4f8f7;border-left:3px solid ${BRAND.tealLt};border-radius:0 4px 4px 0;font-size:11px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:0.05em;margin-bottom:4px">Observaciones</div><div style="color:#333;line-height:1.5;white-space:pre-wrap">${formula.observaciones.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>` : ''}

    <div class="vet-sig">
      <div class="line"></div>
      <div class="label">${formula.veterinario || 'Médico Veterinario'}</div>
      ${vetTP ? `<div style="font-size:9px;color:#1d6fa4;font-weight:700;margin-top:2px;letter-spacing:0.03em">${vetTP}</div>` : ''}
    </div>

    <div class="footer">
      <div class="footer-left">
        📞 3152946916 &nbsp;·&nbsp; WhatsApp: 6024812930<br/>
        📍 Calle 10 # 31-143, Cali
      </div>
      <div class="footer-right">
        🌐 www.petspets.com.co<br/>
        Generado: ${new Date().toLocaleDateString('es-CO')}
      </div>
    </div>
  </body></html>`;
}

const EMPTY_PROD = { producto: '', cantidad: '', instrucciones: '' };

// ── main component ────────────────────────────────────────────────────────────
export default function FormulasModal({ isOpen, onClose, pet, client, formulas }) {
  const { add: addFormula, edit: editFormula } = useStore('formulas_medicas');
  const { session } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [editingFormula, setEditingFormula] = useState(null); // null = crear, obj = editar
  const [createDate, setCreateDate] = useState('');
  const [createObs,  setCreateObs]  = useState('');
  const [createProds, setCreateProds] = useState([{ ...EMPTY_PROD }]);
  const [saving, setSaving] = useState(false);

  const petFormulas = useMemo(() =>
    (formulas || [])
      .filter(f => f.patient_id === pet?.id)
      .sort((a, b) => b.fecha?.localeCompare(a.fecha)),
    [formulas, pet?.id]);

  if (!isOpen || !pet) return null;

  const handleDownload = (formula) => {
    const html = buildPDFHtml(formula, pet, client);
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  const handlePrintAll = () => {
    if (petFormulas.length === 0) return;
    const allHtml = petFormulas.map(f => buildPDFHtml(f, pet, client)).join(
      '<div style="page-break-after:always"></div>'
    );
    const w = window.open('', '_blank');
    w.document.write(allHtml);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  const openCreate = () => {
    setEditingFormula(null);
    setCreateDate(new Date().toISOString().split('T')[0]);
    setCreateObs('');
    setCreateProds([{ ...EMPTY_PROD }]);
    setShowCreate(true);
  };

  const openEdit = (f) => {
    setEditingFormula(f);
    setCreateDate(f.fecha || new Date().toISOString().split('T')[0]);
    setCreateObs(f.observaciones || '');
    setCreateProds(Array.isArray(f.productos) && f.productos.length ? f.productos.map(p => ({ ...p })) : [{ ...EMPTY_PROD }]);
    setShowCreate(true);
  };

  const handleProdChange = (i, field, val) => {
    setCreateProds(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const handleAddProd = () => setCreateProds(prev => [...prev, { ...EMPTY_PROD }]);
  const handleRemoveProd = (i) => setCreateProds(prev => prev.filter((_, idx) => idx !== i));

  const handleCreateSave = async () => {
    const prods = createProds.filter(p => p.producto.trim());
    if (!prods.length && !createObs.trim()) {
      alert('Agrega al menos un medicamento o una observación.');
      return;
    }
    setSaving(true);
    const now = new Date();
    const horaAhora = now.toTimeString().slice(0, 5);
    const hoy = now.toISOString().split('T')[0];
    if (editingFormula) {
      const editorName = session?.nombre || null;
      await editFormula(editingFormula.id, {
        fecha:         createDate || editingFormula.fecha,
        productos:     prods,
        observaciones: createObs.trim() || null,
        editado_por:   editorName !== editingFormula.veterinario ? editorName : editingFormula.editado_por || null,
        hora_edicion:  horaAhora,
        fecha_edicion: hoy,
      });
    } else {
      await addFormula({
        patient_id:    pet.id,
        patient_name:  pet.name,
        fecha:         createDate || hoy,
        productos:     prods,
        estado:        'Pendiente',
        veterinario:   session?.nombre || null,
        observaciones: createObs.trim() || null,
        hora_creacion: horaAhora,
      });
    }
    setSaving(false);
    setShowCreate(false);
    setEditingFormula(null);
  };

  const inputSt = { width:'100%', padding:'0.5rem 0.65rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.82rem', boxSizing:'border-box' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem 1rem', backdropFilter:'blur(2px)', overflowY:'auto' }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:720, margin:'auto', overflow:'hidden' }}
      >
        {/* ── Header ── */}
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#f0f7f7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontFamily:'var(--font-title)', color:BRAND.teal, fontSize:'1.15rem', margin:0 }}>💊 Fórmulas Médicas</h3>
            <p style={{ margin:'0.2rem 0 0', fontSize:'0.8rem', color:'var(--color-text-muted)' }}>
              {pet.name} &nbsp;·&nbsp; {petFormulas.length} fórmula{petFormulas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            {petFormulas.length > 0 && (
              <button
                onClick={handlePrintAll}
                style={{ padding:'0.4rem 0.85rem', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.78rem', fontWeight:600, color:'var(--color-text-muted)' }}
              >
                🖨️ Imprimir todo
              </button>
            )}
            <button
              onClick={showCreate ? () => { setShowCreate(false); setEditingFormula(null); } : openCreate}
              style={{ padding:'0.4rem 0.85rem', background: showCreate ? 'var(--color-bg)' : BRAND.teal, color: showCreate ? 'var(--color-text-muted)' : '#fff', border:`1px solid ${showCreate ? 'var(--color-border)' : BRAND.teal}`, borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.78rem', fontWeight:600 }}
            >
              {showCreate ? '✕ Cancelar' : '+ Nueva Fórmula'}
            </button>
            <button
              onClick={onClose}
              style={{ width:32, height:32, background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}
            >×</button>
          </div>
        </div>

        {/* ── Create Form ── */}
        {showCreate && (
          <div style={{ padding:'1.25rem 1.5rem', background:'#f9fffe', borderBottom:`2px solid ${BRAND.teal}` }}>
            <div style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:BRAND.teal, marginBottom:'1rem' }}>
              {editingFormula ? `Editar Fórmula — ${editingFormula.fecha || ''}` : `Nueva Fórmula — ${pet.name}`}
            </div>

            {/* Fecha */}
            <div style={{ marginBottom:'0.75rem', maxWidth:180 }}>
              <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', color:'var(--color-text-muted)', marginBottom:'0.3rem' }}>Fecha</label>
              <input type="date" value={createDate} onChange={e => setCreateDate(e.target.value)} style={inputSt} />
            </div>

            {/* Observaciones */}
            <div style={{ marginBottom:'1rem' }}>
              <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', color:'var(--color-text-muted)', marginBottom:'0.3rem' }}>Observaciones / Indicaciones generales</label>
              <textarea
                value={createObs}
                onChange={e => setCreateObs(e.target.value)}
                placeholder={'Escribe aquí indicaciones generales, notas clínicas...\n\nPuedes usar Enter para cambiar de párrafo.'}
                rows={5}
                style={{ ...inputSt, resize:'vertical', lineHeight:1.6, whiteSpace:'pre-wrap' }}
              />
            </div>

            {/* Products */}
            <div style={{ marginBottom:'0.75rem' }}>
              <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', color:'var(--color-text-muted)', marginBottom:'0.5rem' }}>Medicamentos</label>
              {createProds.map((p, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 90px 1fr 28px', gap:'0.4rem', marginBottom:'0.4rem', alignItems:'center' }}>
                  <input type="text" placeholder="Producto / medicamento" value={p.producto} onChange={e => handleProdChange(i, 'producto', e.target.value)} style={inputSt} />
                  <input type="text" placeholder="Cantidad" value={p.cantidad} onChange={e => handleProdChange(i, 'cantidad', e.target.value)} style={inputSt} />
                  <input type="text" placeholder="Indicaciones (ej: 1 tab cada 12h por 5 días)" value={p.instrucciones} onChange={e => handleProdChange(i, 'instrucciones', e.target.value)} style={inputSt} />
                  <button onClick={() => handleRemoveProd(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#c0392b', fontSize:'1rem', padding:'0.2rem', lineHeight:1 }}>×</button>
                </div>
              ))}
              <button onClick={handleAddProd} style={{ fontSize:'0.78rem', color:BRAND.teal, background:'none', border:`1px dashed ${BRAND.tealLt}`, borderRadius:'var(--radius-sm)', padding:'0.35rem 0.85rem', cursor:'pointer', fontFamily:'var(--font-body)', fontWeight:600, marginTop:'0.25rem' }}>
                + Agregar medicamento
              </button>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button
                onClick={handleCreateSave}
                disabled={saving}
                style={{ padding:'0.55rem 1.4rem', background: saving ? '#aaa' : BRAND.teal, color:'#fff', border:'none', borderRadius:'var(--radius-md)', cursor: saving ? 'not-allowed' : 'pointer', fontSize:'0.875rem', fontWeight:700, fontFamily:'var(--font-body)' }}
              >
                {saving ? '⏳ Guardando...' : '💾 Guardar Fórmula'}
              </button>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ padding:'1.25rem', maxHeight:'75vh', overflowY:'auto' }}>
          {petFormulas.length === 0 && !showCreate ? (
            <div style={{ textAlign:'center', padding:'3rem 1rem', color:'var(--color-text-muted)' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>💊</div>
              <p style={{ fontSize:'0.875rem' }}>Sin fórmulas médicas registradas para este paciente.</p>
              <p style={{ fontSize:'0.78rem', marginTop:'0.3rem' }}>Crea una con el botón <strong>"+ Nueva Fórmula"</strong> o al guardar una consulta.</p>
            </div>
          ) : petFormulas.map(f => {
            const prods = Array.isArray(f.productos) ? f.productos : [];
            return (
              <div key={f.id} style={{ border:`1px solid ${BRAND.tealLt}`, borderRadius:'var(--radius-lg)', marginBottom:'1.25rem', overflow:'hidden', boxShadow:'0 1px 4px rgba(49,109,116,0.08)' }}>

                {/* Formula header bar */}
                <div style={{ background:BRAND.teal, padding:'0.75rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <span style={{ fontFamily:'var(--font-title)', color:'#fff', fontSize:'1rem', fontWeight:700 }}>Fórmula Médica</span>
                    <span style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.78rem', marginLeft:'0.75rem' }}>📅 {f.fecha || '—'}</span>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                    {estadoBadge(f.estado)}
                    <button
                      onClick={() => openEdit(f)}
                      style={{ padding:'0.35rem 0.8rem', background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.4)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.75rem', fontWeight:600, backdropFilter:'blur(4px)' }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDownload(f)}
                      style={{ padding:'0.35rem 0.8rem', background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.4)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.75rem', fontWeight:600, backdropFilter:'blur(4px)' }}
                    >
                      ⬇️ Descargar PDF
                    </button>
                  </div>
                </div>

                {/* Owner + Patient mini-info */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, borderBottom:`1px solid ${BRAND.tealLt}` }}>
                  <div style={{ padding:'0.7rem 1rem', borderRight:`1px solid ${BRAND.tealLt}` }}>
                    <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:BRAND.teal, marginBottom:'0.3rem' }}>Propietario</div>
                    <div style={{ fontSize:'0.82rem', fontWeight:600 }}>{client?.name || '—'}</div>
                    {client?.phone && <div style={{ fontSize:'0.75rem', color:'var(--color-text-muted)' }}>{client.phone}</div>}
                  </div>
                  <div style={{ padding:'0.7rem 1rem' }}>
                    <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:BRAND.teal, marginBottom:'0.3rem' }}>Paciente</div>
                    <div style={{ fontSize:'0.82rem', fontWeight:600 }}>{pet.name} &nbsp;<span style={{ color:'var(--color-text-muted)', fontWeight:400 }}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</span></div>
                    <div style={{ fontSize:'0.75rem', color:'var(--color-text-muted)' }}>{pet.age ? `${pet.age} años` : ''}{pet.weight ? ` · ${pet.weight} kg` : ''}{pet.sex ? ` · ${pet.sex}` : ''}</div>
                  </div>
                </div>

                {/* Vet + Observaciones */}
                {(f.veterinario || f.editado_por || f.observaciones) && (
                  <div style={{ padding:'0.5rem 1rem', background:BRAND.bgRow, borderBottom:`1px solid ${BRAND.tealLt}`, fontSize:'0.78rem', display:'flex', flexDirection:'column', gap:'0.25rem' }}>
                    {f.veterinario && (
                      <div style={{ color:'var(--color-text-muted)', display:'flex', alignItems:'center', gap:'0.4rem', flexWrap:'wrap' }}>
                        👨‍⚕️ <strong style={{ color:'var(--color-text)' }}>{f.veterinario}</strong>
                        {getTP(f.veterinario) && <span style={{ fontSize:'0.65rem', fontWeight:700, color:'#1d6fa4', background:'#e8f4fd', borderRadius:4, padding:'0 5px', lineHeight:'1.5' }}>{getTP(f.veterinario)}</span>}
                        {f.hora_creacion ? ` · ${f.hora_creacion}` : ''}
                      </div>
                    )}
                    {f.editado_por && f.editado_por !== f.veterinario && (
                      <div style={{ color:'#b45309' }}>
                        ✏️ Editado por <strong>{f.editado_por}</strong>{f.hora_edicion ? ` · ${f.hora_edicion}` : ''}
                      </div>
                    )}
                    {f.editado_por && f.editado_por === f.veterinario && (
                      <div style={{ color:'#b45309' }}>
                        ✏️ Editado{f.hora_edicion ? ` · ${f.hora_edicion}` : ''}
                      </div>
                    )}
                    {f.observaciones && (
                      <div style={{ color:'var(--color-text-muted)' }}>
                        📝 <span style={{ color:'var(--color-text)', whiteSpace:'pre-wrap' }}>{f.observaciones}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Products table */}
                {prods.length > 0 ? (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                      <thead>
                        <tr style={{ background:BRAND.bgRow }}>
                          <th style={{ padding:'0.5rem 0.75rem', textAlign:'center', width:36, fontSize:'0.68rem', fontWeight:700, color:BRAND.teal, textTransform:'uppercase' }}>#</th>
                          <th style={{ padding:'0.5rem 0.75rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, color:BRAND.teal, textTransform:'uppercase' }}>Producto</th>
                          <th style={{ padding:'0.5rem 0.75rem', textAlign:'center', width:90, fontSize:'0.68rem', fontWeight:700, color:BRAND.teal, textTransform:'uppercase' }}>Cantidad</th>
                          <th style={{ padding:'0.5rem 0.75rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, color:BRAND.teal, textTransform:'uppercase' }}>Indicaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prods.map((p, i) => (
                          <tr key={i} style={{ borderTop:`1px solid ${BRAND.tealLt}`, background: i%2===0 ? '#fff' : BRAND.bgRow }}>
                            <td style={{ padding:'0.5rem 0.75rem', textAlign:'center', fontWeight:700, color:BRAND.teal }}>{i+1}</td>
                            <td style={{ padding:'0.5rem 0.75rem', fontWeight:600 }}>{p.producto || '—'}</td>
                            <td style={{ padding:'0.5rem 0.75rem', textAlign:'center', color:'var(--color-text-muted)' }}>{p.cantidad || '—'}</td>
                            <td style={{ padding:'0.5rem 0.75rem', color:'var(--color-text-muted)' }}>{p.instrucciones || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ padding:'1rem', textAlign:'center', color:'var(--color-text-muted)', fontSize:'0.82rem', fontStyle:'italic' }}>Sin productos registrados.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
