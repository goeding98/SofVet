import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const C = {
  bg:'#FFF9F4', teal:'#316d74', tealDark:'#1e4e54', tealLight:'#e8f5f6',
  cream:'#FDF6EE', border:'#E8D9C8', gold:'#B8873A',
  text:'#2D2D2D', muted:'#8A8076', danger:'#C0392B', dangerBg:'#FFF0EE',
};
const inp = {
  width:'100%', padding:'0.8rem 1rem', border:`1.5px solid ${C.border}`,
  borderRadius:12, fontSize:'0.95rem', fontFamily:'inherit', outline:'none',
  boxSizing:'border-box', background:'white', color:C.text,
};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

const fmt = (d) => {
  if (!d) return '—';
  try { return new Date(d + 'T12:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return d; }
};
const icon = (sp) => {
  const s = (sp||'').toLowerCase();
  return s.includes('perro')||s.includes('canino') ? '🐶' : s.includes('gato')||s.includes('felino') ? '🐱' : '🐾';
};
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

// ── Booking helpers ───────────────────────────────────────────────────────────
const BOOKING_SEDES = [
  { id: 2, nombre: 'Colseguros' },
  { id: 3, nombre: 'Ciudad Jardín' },
  { id: 1, nombre: 'Santa Mónica' },
];
const SLOTS_GEN = [10,11,12,13,14,15,16,17,18].map(h=>`${String(h).padStart(2,'0')}:00`);
const SLOTS_CTL = [10,11,12,13,14,15,16,17].map(h=>`${String(h).padStart(2,'0')}:40`);
const DUR = { 'Consulta General': 40, 'Control': 20 };

const tmins = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
const addMin = (t, m) => { const tot=tmins(t)+m; return `${String(Math.floor(tot/60)%24).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}`; };
const isBlocked = (slotT, dur, apts) => {
  const s=tmins(slotT), e=s+dur;
  return apts.some(a => {
    if (!a.time) return false;
    const as=tmins(a.time);
    const ae=as+(a.time_end ? tmins(a.time_end)-as : (a.service==='Control'?20:40));
    return as<e && s<ae;
  });
};
const fmt12h = t => {
  if (!t) return '—';
  const [h,m]=t.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;
};

export default function PortalPage() {
  // ── Landing view: 'choice' | 'login' | 'guest' ───────────────────────────
  const [portalView, setPortalView] = useState('choice');

  const [cedula,    setCedula]    = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [client,    setClient]    = useState(null);
  const [data,      setData]      = useState(null);
  const [firstLogin,setFirstLogin]= useState(false);
  const [tabs,      setTabs]      = useState({});   // { petId: activeTab }

  // ── Guest booking ────────────────────────────────────────────────────────
  const [gStep,    setGStep]    = useState(1);
  const [gCedula,  setGCedula]  = useState('');
  const [gNombre,  setGNombre]  = useState('');
  const [gMascota, setGMascota] = useState('');
  const [gMotivo,  setGMotivo]  = useState('');
  const [gSede,    setGSede]    = useState(null);
  const [gDate,    setGDate]    = useState('');
  const [gSlots,   setGSlots]   = useState(null);
  const [gTime,    setGTime]    = useState(null);
  const [gSaving,  setGSaving]  = useState(false);
  const [gOk,      setGOk]      = useState(false);
  const [gErr,     setGErr]     = useState('');

  const [pwModal,   setPwModal]   = useState(false);
  const [newPw,     setNewPw]     = useState('');
  const [newPw2,    setNewPw2]    = useState('');
  const [pwError,   setPwError]   = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwOk,      setPwOk]      = useState(false);
  const [solModal,  setSolModal]  = useState(false);
  const [solPet,    setSolPet]    = useState(null);

  // ── Certificado de viaje ──────────────────────────────────────────────────
  const [cvCedula,   setCvCedula]   = useState('');
  const [cvNombre,   setCvNombre]   = useState('');
  const [cvTelefono, setCvTelefono] = useState('');
  const [cvMascota,  setCvMascota]  = useState('');
  const [cvEdad,     setCvEdad]     = useState('');
  const [cvEspecie,  setCvEspecie]  = useState('');
  const [cvDestino,  setCvDestino]  = useState('');
  const [cvFecha,    setCvFecha]    = useState('');
  const [cvSaving,   setCvSaving]   = useState(false);
  const [cvOk,       setCvOk]       = useState(false);
  const [cvErr,      setCvErr]      = useState('');

  // ── Cancel appointment ────────────────────────────────────────────────────
  const [cancelingId, setCancelingId] = useState(null); // id being confirmed

  const handleCancelAppointment = async (id) => {
    const { error } = await supabase.from('appointments').update({ status: 'cancelada' }).eq('id', id);
    if (error) return alert('Error al cancelar: ' + error.message);
    setCancelingId(null);
    await loadData(client);
  };

  // ── Booking ──────────────────────────────────────────────────────────────
  const [agOpen,   setAgOpen]   = useState(false);
  const [agStep,   setAgStep]   = useState(1);
  const [agPet,    setAgPet]    = useState(null);
  const [agTipo,   setAgTipo]   = useState(null);
  const [agSede,   setAgSede]   = useState(null);
  const [agDate,   setAgDate]   = useState('');
  const [agSlots,  setAgSlots]  = useState(null);
  const [agTime,   setAgTime]   = useState(null);
  const [agSaving, setAgSaving] = useState(false);
  const [agOk,     setAgOk]     = useState(false);
  const [agErr,    setAgErr]    = useState('');

  const getTab = (pid) => tabs[pid] || 'resumen';
  const setTab = (pid, t) => setTabs(prev => ({ ...prev, [pid]: t }));

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const doc = cedula.trim(), pw = password.trim();
    if (!doc || !pw) return setError('Ingresa tu cédula y contraseña.');
    setError(''); setLoading(true);
    const { data: cls } = await supabase.from('clients').select('id,name,phone,email,document,portal_password').eq('document', doc);
    if (!cls?.length) { setLoading(false); return setError('Cédula o contraseña incorrecta.'); }
    const cl = cls[0];
    let ok = false, isFirst = false;
    if (!cl.portal_password) { ok = pw === doc; isFirst = ok; }
    else { ok = (await sha256(pw)) === cl.portal_password; }
    if (!ok) { setLoading(false); return setError('Cédula o contraseña incorrecta.'); }
    await loadData(cl);
    setFirstLogin(isFirst);
    if (isFirst) setPwModal(true);
    setLoading(false);
  };

  const loadData = async (cl) => {
    const { data: pets } = await supabase.from('patients').select('id,name,species,breed,age,weight,status').eq('client_id', cl.id);
    if (!pets?.length) { setClient(cl); setData({ pets: [] }); return; }
    const ids = pets.map(p => p.id);
    const names = pets.map(p => p.name);
    const tod = today();

    const [vR, cR, pR, lR, aR, iR, hR, hrR, ppR] = await Promise.all([
      supabase.from('vaccines').select('patient_id,vaccine_name,date_applied,next_dose').in('patient_id', ids).order('date_applied', { ascending: false }),
      supabase.from('consultations').select('patient_id,motivo_consulta,date,created_at').in('patient_id', ids).order('created_at', { ascending: false }),
      supabase.from('procedimientos').select('patient_id,tipo,descripcion,fecha,anestesia').in('patient_id', ids).order('fecha', { ascending: false }),
      supabase.from('laboratorios_pedidos').select('patient_id,tipo_examen,estado,fecha_solicitado').in('patient_id', ids).neq('estado','Solicitado').order('fecha_solicitado', { ascending: false }),
      supabase.from('appointments').select('id,patient_name,date,time,service,status').in('patient_name', names).gte('date', tod).neq('status','cancelada').order('date', { ascending: true }).limit(20),
      supabase.from('imaging').select('patient_id,tipo,resultado,date').in('patient_id', ids).order('date', { ascending: false }),
      supabase.from('hospitalization').select('patient_id,motivo,diagnostico,ingreso_date,alta_date,status').in('patient_id', ids).order('ingreso_date', { ascending: false }),
      supabase.from('hc_requests').select('*').eq('client_id', cl.id).order('requested_at', { ascending: false }),
      supabase.from('prepagada').select('patient_id,status,paid_until').in('patient_id', ids).neq('status','baja'),
    ]);

    const vac=vR.data||[], con=cR.data||[], proc=pR.data||[], lab=lR.data||[], apt=aR.data||[], img=iR.data||[], hosp=hR.data||[], hcReqs=hrR.data||[], prep=ppR.data||[];

    setClient(cl);
    setData({ pets: pets.map(p => ({
      ...p,
      lastVac:    vac.filter(v => v.patient_id===p.id && !v.vaccine_name?.toLowerCase().includes('desparasit'))[0],
      lastDespar: vac.filter(v => v.patient_id===p.id &&  v.vaccine_name?.toLowerCase().includes('desparasit'))[0],
      consults:   con.filter(c => c.patient_id===p.id),
      procs:      proc.filter(x => x.patient_id===p.id),
      labs:       lab.filter(l => l.patient_id===p.id),
      agenda:     apt.filter(a => a.patient_name===p.name),
      imaging:    img.filter(i => i.patient_id===p.id),
      hosps:      hosp.filter(h => h.patient_id===p.id),
      hcReq:      hcReqs.find(r => r.patient_id===p.id) || null,
      prepagada:  prep.find(x => x.patient_id===p.id) || null,
    }))});
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePw = async () => {
    setPwError('');
    if (newPw.length < 6)          return setPwError('Mínimo 6 caracteres.');
    if (newPw !== newPw2)          return setPwError('Las contraseñas no coinciden.');
    if (newPw === client.document) return setPwError('No puede ser igual a tu cédula.');
    setPwSaving(true);
    const hashed = await sha256(newPw);
    const { error } = await supabase.from('clients').update({ portal_password: hashed }).eq('id', client.id);
    setPwSaving(false);
    if (error) return setPwError('Error al guardar. Intenta de nuevo.');
    setClient(c => ({ ...c, portal_password: hashed }));
    setFirstLogin(false); setPwOk(true);
    setTimeout(() => { setPwModal(false); setPwOk(false); setNewPw(''); setNewPw2(''); }, 1600);
  };

  const logout = () => { setClient(null); setData(null); setCedula(''); setPassword(''); setFirstLogin(false); };
  const openPw = () => { setNewPw(''); setNewPw2(''); setPwError(''); setPwOk(false); setPwModal(true); };

  // ── HC Request ────────────────────────────────────────────────────────────
  const handleSolicitarHC = async (pet) => {
    const existing = pet.hcReq;
    if (existing?.status === 'pendiente') return;
    const vigente = existing?.status === 'aprobada' && existing?.expires_at && new Date(existing.expires_at) > new Date();
    if (vigente) return;
    const { error } = await supabase.from('hc_requests').insert({
      client_id:    client.id,
      patient_id:   pet.id,
      client_name:  client.name,
      patient_name: pet.name,
      status:       'pendiente',
    });
    if (error) return alert('Error al enviar solicitud: ' + error.message);
    setSolModal(true);
    await loadData(client);
  };

  // ── HC Download ───────────────────────────────────────────────────────────
  const handleDownloadHC = async (pet) => {
    const pid = pet.id;
    const SEDES_MAP = { 1:'Santa Mónica', 2:'Consultorios Colseguros', 3:'Ciudad Jardín', 4:'Domicilio' };
    const sn = (sid) => SEDES_MAP[sid] || '—';

    const [cR, vR, iR, pR, lR, hR, fR] = await Promise.all([
      supabase.from('consultations').select('*').eq('patient_id', pid).order('date', { ascending: false }),
      supabase.from('vaccines').select('*').eq('patient_id', pid).order('date_applied', { ascending: false }),
      supabase.from('imaging').select('*').eq('patient_id', pid).order('date', { ascending: false }),
      supabase.from('procedimientos').select('*').eq('patient_id', pid).order('fecha', { ascending: false }),
      supabase.from('laboratorios_pedidos').select('*').eq('patient_id', pid).order('fecha_solicitado', { ascending: false }),
      supabase.from('hospitalization').select('*').eq('patient_id', pid).order('ingreso_date', { ascending: false }),
      supabase.from('formulas_medicas').select('*').eq('patient_id', pid),
    ]);
    const cons=cR.data||[], vacs=vR.data||[], imgs=iR.data||[], procs=pR.data||[], labs=lR.data||[], hosps=hR.data||[], forms=fR.data||[];

    const fld = (label, value) => {
      if (!value || value.toString().trim() === '') return '';
      return `<div style="display:flex;gap:8px;margin-bottom:5px;font-size:11px;line-height:1.5"><span style="font-weight:700;color:#444;min-width:170px;flex-shrink:0">${label}:</span><span style="color:#222">${value}</span></div>`;
    };

    const allEvents = [];
    cons.forEach(c => {
      const meds = Array.isArray(c.medicamentos_aplicados) ? c.medicamentos_aplicados.filter(m => m.medicamento) : [];
      const formula = forms.find(fx => fx.fecha === c.date);
      const fxProds = formula && Array.isArray(formula.productos) ? formula.productos.filter(p => p.producto) : [];
      allEvents.push({ sortKey: `${c.date||'0000'}T${c.time||'00:00'}`, type:'consulta', c, meds, fxProds });
    });
    vacs.forEach(v => allEvents.push({ sortKey:`${v.date_applied||v.date||'0000'}T00:00`, type:'vacuna', v }));
    imgs.forEach(r => allEvents.push({ sortKey:`${r.date||'0000'}T00:00`, type:'imagen', r }));
    procs.forEach(p => allEvents.push({ sortKey:`${p.fecha||'0000'}T00:00`, type:'proced', p }));
    labs.forEach(l => allEvents.push({ sortKey:`${l.fecha_subido||l.fecha_solicitado||'0000'}T00:00`, type:'lab', l }));
    hosps.filter(h => h.alta_date).forEach(h => {
      const meds = Array.isArray(h.tratamiento) ? h.tratamiento.filter(m => m.medicamento) : [];
      allEvents.push({ sortKey:`${h.alta_date}T${h.alta_time||'00:00'}`, type:'hosp', h, meds });
    });
    allEvents.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    const renderEvent = (ev) => {
      if (ev.type === 'consulta') {
        const { c, meds, fxProds } = ev;
        const efCells = [['Temp (°C)',c.temperatura],['FC (bpm)',c.frecuencia_cardiaca],['FR (rpm)',c.frecuencia_respiratoria],['Pulso',c.pulso],['Peso (kg)',c.peso],['CC',c.condicion_corporal],['Mucosas',c.mucosas],['TLC',c.tiempo_llenado_capilar],['Glicemia',c.glicemia],['Presión',c.presion_arterial]].filter(([,v])=>v);
        return `<div style="margin-bottom:20px;border-left:4px solid #2e5cbf"><div style="background:#dbeafe;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#1d4ed8;font-size:12px">🩺 CONSULTA — ${c.date||'—'}${c.time?' · '+c.time:''}</div><div style="font-size:10px;color:#555">${sn(c.sede_id)}${c.veterinario?' · Vet: '+c.veterinario:''}</div></div><div style="padding:10px 14px">${fld('Antecedentes',c.antecedentes)}${fld('Hallazgos',c.hallazgos)}${efCells.length>0?`<div style="background:#f0f8ff;border:1px solid #bfdbfe;border-radius:4px;padding:8px;margin:8px 0"><div style="font-size:9px;font-weight:700;color:#2e5cbf;text-transform:uppercase;margin-bottom:6px">Examen Físico</div><div style="display:flex;flex-wrap:wrap;gap:4px">${efCells.map(([lbl,val])=>`<div style="flex:1;min-width:80px;text-align:center;background:white;border-radius:3px;padding:4px 6px;border:1px solid #dbeafe"><div style="font-size:8px;color:#888;font-weight:700">${lbl}</div><div style="font-size:12px;font-weight:600;color:#1e3a8a">${val}</div></div>`).join('')}</div></div>`:''}${meds.length>0?`<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#316d74;text-transform:uppercase;margin-bottom:4px">Medicamentos aplicados</div><table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #99d6d6"><thead><tr style="background:#e0f5f5"><th style="padding:3px 6px;text-align:left">Producto</th><th style="padding:3px 6px;width:100px">Dosis</th><th style="padding:3px 6px;width:70px">Vía</th></tr></thead><tbody>${meds.map(m=>`<tr style="border-top:1px solid #c8ecec"><td style="padding:2px 6px">${m.medicamento}</td><td style="padding:2px 6px">${m.dosis||'—'}</td><td style="padding:2px 6px">${m.via||'—'}</td></tr>`).join('')}</tbody></table></div>`:''}${fxProds.length>0?`<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#a6785b;text-transform:uppercase;margin-bottom:4px">Fórmula médica</div><table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #e5c4aa"><thead><tr style="background:#fdf3ec"><th style="padding:3px 6px;text-align:left">Producto</th><th style="padding:3px 6px;width:110px">Cantidad</th><th style="padding:3px 6px">Instrucciones</th></tr></thead><tbody>${fxProds.map(p=>`<tr style="border-top:1px solid #f5e0cc"><td style="padding:2px 6px">${p.producto}</td><td style="padding:2px 6px">${p.cantidad||'—'}</td><td style="padding:2px 6px">${p.instrucciones||'—'}</td></tr>`).join('')}</tbody></table></div>`:''}${c.diagnostico_final?`<div style="margin:8px 0;padding:6px 10px;background:#dcfce7;border-left:3px solid #16a34a;font-size:11px"><span style="font-weight:700;color:#15803d">Diagnóstico final: </span><span style="font-weight:600;color:#14532d">${c.diagnostico_final}</span></div>`:''}${fld('Plan diagnóstico',c.plan_diagnostico)}${fld('Observaciones',c.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'vacuna') {
        const {v} = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #15803d"><div style="background:#dcfce7;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#15803d;font-size:12px">💉 ${(v.vaccine_name||'').toLowerCase().includes('desparasit')?'DESPARASITACIÓN':'VACUNA'} — ${v.date_applied||v.date||'—'}</div><div style="font-size:10px;color:#555">${v.vet||''}</div></div><div style="padding:10px 14px">${fld('Producto',v.vaccine_name||v.vaccine)}${v.batch?fld('Lote',v.batch):''}${v.next_dose?fld('Próxima dosis',v.next_dose):''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'imagen') {
        const {r} = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #1565c0"><div style="background:#e8f0ff;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#1565c0;font-size:12px">🔬 IMAGENOLOGÍA — ${r.date||'—'}</div><div style="font-size:10px;color:#555">${sn(r.sede_id)}</div></div><div style="padding:10px 14px">${fld('Tipo',r.tipo)}${fld('Resultado',r.resultado)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'proced') {
        const {p} = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #b91c1c"><div style="background:#fee2e2;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#b91c1c;font-size:12px">⚕️ PROCEDIMIENTO — ${p.fecha||'—'}</div><div style="font-size:10px;color:#555">${sn(p.sede_id)}</div></div><div style="padding:10px 14px">${fld('Tipo',p.tipo)}${fld('Descripción',p.descripcion)}${fld('Anestesia',p.anestesia)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'lab') {
        const {l} = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #065f46"><div style="background:#d1fae5;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#065f46;font-size:12px">🧪 LABORATORIO — ${l.fecha_solicitado||'—'}</div><div style="font-size:10px;color:#555">${sn(l.sede_id)}</div></div><div style="padding:10px 14px">${fld('Tipo de examen',l.tipo_examen)}${fld('Estado',l.estado)}${l.reporte_medico?fld('Reporte médico',l.reporte_medico):''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'hosp') {
        const {h, meds} = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #991b1b"><div style="background:#fee2e2;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#991b1b;font-size:12px">🏥 HOSPITALIZACIÓN — Alta: ${h.alta_date||'—'}</div><div style="font-size:10px;color:#555">${sn(h.sede_id)}</div></div><div style="padding:10px 14px">${fld('Motivo',h.motivo)}${fld('Diagnóstico',h.diagnostico)}${fld('Ingreso',h.ingreso_date)}${fld('Alta',h.alta_date)}${meds.length>0?`<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase;margin-bottom:4px">Tratamiento</div><table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #fca5a5"><thead><tr style="background:#fee2e2"><th style="padding:3px 6px;text-align:left">Medicamento</th><th style="padding:3px 6px;width:80px">Dosis</th><th style="padding:3px 6px">Frecuencia</th></tr></thead><tbody>${meds.map(m=>`<tr style="border-top:1px solid #fecaca"><td style="padding:2px 6px">${m.medicamento}</td><td style="padding:2px 6px">${m.dosis||'—'}</td><td style="padding:2px 6px">${m.frecuencia||'—'}</td></tr>`).join('')}</tbody></table></div>`:''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      return '';
    };

    const bodyContent = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;border-bottom:3px solid #2e5cbf;padding-bottom:14px"><div><div style="font-size:20px;font-weight:bold;color:#2e5cbf">🐾 Pets&amp;Pets Veterinaria</div><div style="font-size:11px;color:#666;margin-top:3px">Historia Clínica Completa · Generada el ${new Date().toLocaleDateString('es-CO')}</div></div><div style="text-align:right"><div style="font-weight:bold;font-size:16px">${pet.name}</div><div style="font-size:11px;color:#666">${pet.species||''}${pet.breed?' · '+pet.breed:''}</div><div style="font-size:11px;color:#666">👤 ${client.name}${client.phone?' · '+client.phone:''}</div></div></div>${allEvents.length===0?'<p style="text-align:center;color:#999;padding:30px">Sin eventos registrados.</p>':allEvents.map(renderEvent).join('')}<div style="margin-top:32px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#aaa;text-align:center">Historia Clínica generada por SofVet · Pets&amp;Pets Veterinaria · Cali, Colombia</div>`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Historia Clínica — ${pet.name}</title><style>*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#333;margin:0;padding:24px 28px}@media print{body{padding:10px 14px}}</style></head><body>${bodyContent}<script>window.onload=()=>{window.print()}</script></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  // ── Guest booking helpers ─────────────────────────────────────────────────
  const resetGuest = () => { setGStep(1); setGCedula(''); setGNombre(''); setGMascota(''); setGMotivo(''); setGSede(null); setGDate(''); setGSlots(null); setGTime(null); setGSaving(false); setGOk(false); setGErr(''); };
  const resetCert  = () => { setCvCedula(''); setCvNombre(''); setCvTelefono(''); setCvMascota(''); setCvEdad(''); setCvEspecie(''); setCvDestino(''); setCvFecha(''); setCvSaving(false); setCvOk(false); setCvErr(''); };

  const handleCertSubmit = async () => {
    if (!cvCedula.trim() || !cvNombre.trim() || !cvTelefono.trim() || !cvMascota.trim() || !cvEdad.trim() || !cvEspecie || !cvDestino.trim() || !cvFecha)
      return setCvErr('Por favor completa todos los campos.');
    setCvSaving(true); setCvErr('');
    const { error } = await supabase.from('certificados_viaje').insert({
      cedula_tutor:   cvCedula.trim(),
      nombre_tutor:   cvNombre.trim(),
      telefono:       cvTelefono.trim(),
      nombre_mascota: cvMascota.trim(),
      edad_mascota:   cvEdad.trim(),
      especie:        cvEspecie,
      destino:        cvDestino.trim(),
      fecha_tentativa: cvFecha,
      estado:         'pendiente',
    });
    setCvSaving(false);
    if (error) return setCvErr('Error al enviar la solicitud. Intenta de nuevo.');
    setCvOk(true);
  };

  const loadGuestSlots = async (date, sedeId) => {
    setGSlots(null); setGTime(null);
    const { data: apts } = await supabase.from('appointments')
      .select('time,time_end,service').eq('date', date).eq('sede_id', sedeId).neq('status','cancelada');
    setGSlots(SLOTS_GEN.map(t => {
      const slotH = parseInt(t.split(':')[0]);
      const capacity = (sedeId === 2 && slotH >= 14) ? 2 : 1;
      const s = tmins(t), e = s + 40;
      const overlapping = (apts||[]).filter(a => {
        if (!a.time) return false;
        const as = tmins(a.time);
        const ae = as + (a.time_end ? tmins(a.time_end) - as : (a.service==='Control'?20:40));
        return as < e && s < ae;
      }).length;
      return { time: t, blocked: overlapping >= capacity };
    }));
  };

  const handleGuestBook = async () => {
    if (!gCedula.trim() || !gNombre.trim() || !gMascota.trim() || !gSede || !gDate || !gTime) return;
    setGSaving(true); setGErr('');
    const { error } = await supabase.from('appointments').insert({
      patient_name: gMascota.trim(),
      owner:        gNombre.trim(),
      service:      'Consulta General',
      date:         gDate,
      time:         gTime,
      time_end:     addMin(gTime, 40),
      status:       'pendiente',
      sede_id:      gSede,
      notes:        `Motivo: ${gMotivo.trim()} | Cédula: ${gCedula.trim()}`,
      source:       'portal',
    });
    setGSaving(false);
    if (error) return setGErr('Error al agendar: ' + error.message);
    setGOk(true);
  };

  const openAgendar = () => {
    setAgOpen(true); setAgStep(1); setAgErr(''); setAgOk(false); setAgSaving(false);
    setAgPet(data?.pets?.length === 1 ? data.pets[0] : null);
    setAgTipo(null); setAgSede(null); setAgDate(''); setAgSlots(null); setAgTime(null);
  };

  const loadAgSlots = async (date, sedeId, tipo) => {
    setAgSlots(null);
    const { data: apts } = await supabase.from('appointments')
      .select('time,time_end,service').eq('date', date).eq('sede_id', sedeId).neq('status','cancelada');
    const dur = DUR[tipo];
    const rawSlots = tipo === 'Consulta General' ? SLOTS_GEN : SLOTS_CTL;
    // Colseguros (id=2): 2 consultorios de 14:00 en adelante → slot bloqueado solo si ya hay 2+ citas en ese horario
    setAgSlots(rawSlots.map(t => {
      const slotH = parseInt(t.split(':')[0]);
      const capacity = (sedeId === 2 && slotH >= 14) ? 2 : 1;
      const s = tmins(t), e = s + dur;
      const overlapping = (apts||[]).filter(a => {
        if (!a.time) return false;
        const as = tmins(a.time);
        const ae = as + (a.time_end ? tmins(a.time_end) - as : (a.service==='Control'?20:40));
        return as < e && s < ae;
      }).length;
      return { time: t, blocked: overlapping >= capacity };
    }));
  };

  const handleSubmitAgendar = async () => {
    if (!agPet || !agTipo || !agSede || !agDate || !agTime) return;
    setAgSaving(true); setAgErr('');
    const { error } = await supabase.from('appointments').insert({
      patient_name: agPet.name,
      owner:        client.name,
      service:      agTipo,
      date:         agDate,
      time:         agTime,
      time_end:     addMin(agTime, DUR[agTipo]),
      status:       'pendiente',
      sede_id:      agSede,
      source:       'portal',
    });
    setAgSaving(false);
    if (error) return setAgErr('Error al agendar: ' + error.message);
    setAgOk(true);
    await loadData(client);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text }}>

      {/* NAV */}
      <nav style={{ background:C.tealDark, padding:'0.85rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 12px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
          <img src="/logos/pp-02.svg" alt="Logo" style={{ height:36, filter:'brightness(0) invert(1)' }} />
          <div style={{ borderLeft:'1px solid rgba(255,255,255,0.2)', paddingLeft:'0.85rem' }}>
            <div style={{ color:'white', fontWeight:700, fontSize:'0.9rem' }}>Pets &amp; Pets</div>
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.66rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Portal de Propietarios</div>
          </div>
        </div>
        {client && (
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button onClick={openPw} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)', color:'white', padding:'0.38rem 0.85rem', borderRadius:8, cursor:'pointer', fontSize:'0.73rem', fontFamily:'inherit', fontWeight:600 }}>🔑 Contraseña</button>
            <button onClick={logout} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.75)', padding:'0.38rem 0.8rem', borderRadius:8, cursor:'pointer', fontSize:'0.73rem', fontFamily:'inherit' }}>Salir</button>
          </div>
        )}
      </nav>

      {/* ── CHOICE SCREEN ── */}
      {!client && portalView === 'choice' && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'2.5rem 1rem', minHeight:'calc(100vh - 62px)' }}>
          <div style={{ width:'100%', maxWidth:560 }}>
            <div style={{ textAlign:'center', marginBottom:'2rem' }}>
              <img src="/logos/pp-02.svg" alt="Logo" style={{ height:52, filter:`invert(35%) sepia(40%) saturate(500%) hue-rotate(145deg)`, marginBottom:'1rem', display:'block', margin:'0 auto 1rem' }} />
              <h1 style={{ fontWeight:900, fontSize:'1.6rem', color:C.tealDark, margin:'0 0 0.4rem' }}>Bienvenido a Pets &amp; Pets</h1>
              <p style={{ color:C.muted, fontSize:'0.9rem', margin:0 }}>¿Cómo podemos ayudarte hoy?</p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              {/* Soy cliente */}
              <button
                onClick={() => setPortalView('login')}
                style={{ background:'white', border:`2px solid ${C.teal}`, borderRadius:20, padding:'2rem 1.25rem', cursor:'pointer', fontFamily:'inherit', textAlign:'center', boxShadow:'0 4px 24px rgba(49,109,116,0.1)', transition:'all 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(49,109,116,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 24px rgba(49,109,116,0.1)'; }}
              >
                <div style={{ fontSize:'2.8rem', marginBottom:'0.75rem' }}>🐾</div>
                <div style={{ fontWeight:800, fontSize:'1rem', color:C.tealDark, marginBottom:'0.4rem' }}>Soy cliente</div>
                <div style={{ fontSize:'0.78rem', color:C.muted, lineHeight:1.5 }}>Ingresa a tu portal para ver la historia clínica de tus mascotas y gestionar citas</div>
                <div style={{ marginTop:'1.25rem', background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', borderRadius:10, padding:'0.6rem', fontWeight:700, fontSize:'0.85rem' }}>
                  Ingresar al portal →
                </div>
              </button>

              {/* No soy cliente */}
              <button
                onClick={() => { resetGuest(); setPortalView('guest'); }}
                style={{ background:'white', border:`2px solid ${C.gold}`, borderRadius:20, padding:'2rem 1.25rem', cursor:'pointer', fontFamily:'inherit', textAlign:'center', boxShadow:'0 4px 24px rgba(184,135,58,0.1)', transition:'all 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(184,135,58,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 24px rgba(184,135,58,0.1)'; }}
              >
                <div style={{ fontSize:'2.8rem', marginBottom:'0.75rem' }}>📅</div>
                <div style={{ fontWeight:800, fontSize:'1rem', color:'#7a5c00', marginBottom:'0.4rem' }}>No soy cliente</div>
                <div style={{ fontSize:'0.78rem', color:C.muted, lineHeight:1.5 }}>Agenda tu primera consulta general con nosotros de forma rápida y sencilla</div>
                <div style={{ marginTop:'1.25rem', background:`linear-gradient(135deg,${C.gold},#8a6200)`, color:'white', borderRadius:10, padding:'0.6rem', fontWeight:700, fontSize:'0.85rem' }}>
                  Agendar cita →
                </div>
              </button>
            </div>

            <div style={{ textAlign:'center', marginTop:'1.25rem' }}>
              <button
                onClick={() => { resetCert(); setPortalView('cert'); }}
                style={{ background:'#b91c1c', border:'none', borderRadius:999, padding:'0.55rem 1.4rem', cursor:'pointer', fontFamily:'inherit', color:'white', fontSize:'0.82rem', fontWeight:700, transition:'all 0.15s', boxShadow:'0 2px 10px rgba(185,28,28,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.background='#991b1b'; e.currentTarget.style.boxShadow='0 4px 16px rgba(185,28,28,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='#b91c1c'; e.currentTarget.style.boxShadow='0 2px 10px rgba(185,28,28,0.25)'; }}
              >
                ✈️ Certificado de viaje nacional / internacional
              </button>
            </div>

            <p style={{ textAlign:'center', color:C.muted, fontSize:'0.7rem', marginTop:'1rem' }}>© Pets &amp; Pets · Cali, Colombia</p>
          </div>
        </div>
      )}

      {/* ── LOGIN SCREEN ── */}
      {!client && portalView === 'login' && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'3rem 1rem', minHeight:'calc(100vh - 62px)' }}>
          <div style={{ width:'100%', maxWidth:420 }}>
            <button onClick={() => setPortalView('choice')} style={{ background:'none', border:'none', color:C.teal, cursor:'pointer', fontFamily:'inherit', fontSize:'0.82rem', fontWeight:600, marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
              ← Volver
            </button>
            <div style={{ background:'white', borderRadius:20, boxShadow:'0 4px 40px rgba(49,109,116,0.12)', overflow:'hidden' }}>
              <div style={{ background:`linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, padding:'2rem', textAlign:'center' }}>
                <img src="/logos/pp-02.svg" alt="Logo" style={{ height:60, filter:'brightness(0) invert(1)', marginBottom:'1rem', display:'block', margin:'0 auto 1rem' }} />
                <h1 style={{ color:'white', fontWeight:800, fontSize:'1.2rem', margin:'0 0 0.25rem' }}>Portal de Propietarios</h1>
                <p style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.8rem', margin:0 }}>Consulta la información de tu mascota</p>
              </div>
              <div style={{ padding:'2rem' }}>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.4rem' }}>Número de cédula</label>
                  <input type="text" inputMode="numeric" value={cedula} onChange={e=>{setCedula(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&document.getElementById('pw-inp').focus()} placeholder="Ej: 16662784" style={inp} autoComplete="username" />
                </div>
                <div style={{ marginBottom:'1.5rem' }}>
                  <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.4rem' }}>Contraseña</label>
                  <input id="pw-inp" type="password" value={password} onChange={e=>{setPassword(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Tu contraseña" style={inp} autoComplete="current-password" />
                </div>
                {error && <div style={{ background:C.dangerBg, border:`1px solid ${C.danger}40`, borderRadius:10, padding:'0.6rem 0.9rem', color:C.danger, fontSize:'0.82rem', marginBottom:'1rem' }}>⚠️ {error}</div>}
                <button onClick={handleLogin} disabled={loading} style={{ width:'100%', padding:'0.88rem', background:loading?'#aaa':`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, cursor:loading?'not-allowed':'pointer', fontWeight:700, fontSize:'0.95rem', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(49,109,116,0.3)' }}>
                  {loading ? 'Verificando…' : 'Ingresar →'}
                </button>
                <div style={{ marginTop:'1.25rem', background:C.cream, borderRadius:10, padding:'0.8rem 1rem', fontSize:'0.75rem', color:C.muted, lineHeight:1.7, textAlign:'center' }}>
                  🔐 <strong>¿Primera vez?</strong> Tu contraseña es tu número de cédula.<br/>¿Olvidaste tu contraseña? Comunícate con nosotros.
                </div>
              </div>
            </div>
            <p style={{ textAlign:'center', color:C.muted, fontSize:'0.7rem', marginTop:'1rem' }}>© Pets &amp; Pets · Sistema Veterinario</p>
          </div>
        </div>
      )}

      {/* ── GUEST BOOKING SCREEN ── */}
      {!client && portalView === 'guest' && (() => {
        const todayLocal = today();
        const gStep1Ok = gCedula.trim() && gNombre.trim() && gMascota.trim() && gMotivo.trim();
        const gStep2Ok = gSede && gDate;

        if (gOk) return (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'3rem 1rem', minHeight:'calc(100vh - 62px)' }}>
            <div style={{ width:'100%', maxWidth:480, textAlign:'center', background:'white', borderRadius:24, padding:'3rem 2rem', boxShadow:'0 4px 40px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>🎉</div>
              <h2 style={{ fontWeight:900, color:C.tealDark, margin:'0 0 0.5rem' }}>¡Cita agendada!</h2>
              <p style={{ color:C.muted, fontSize:'0.9rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
                Hemos registrado tu cita para <strong>{gMascota}</strong> el <strong>{gDate}</strong> a las <strong>{fmt12h(gTime)}</strong> en <strong>{BOOKING_SEDES.find(s=>s.id===gSede)?.nombre}</strong>.
                <br/><br/>Pronto recibirás confirmación. Valor a cancelar: <strong style={{color:C.teal}}>$70.000</strong>.
              </p>
              <button onClick={() => setPortalView('choice')} style={{ background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, padding:'0.85rem 2rem', fontWeight:700, fontSize:'0.92rem', cursor:'pointer', fontFamily:'inherit' }}>
                Volver al inicio
              </button>
            </div>
          </div>
        );

        return (
          <div style={{ maxWidth:600, margin:'0 auto', padding:'2rem 1rem 3rem' }}>
            <button onClick={() => setPortalView('choice')} style={{ background:'none', border:'none', color:C.teal, cursor:'pointer', fontFamily:'inherit', fontSize:'0.82rem', fontWeight:600, marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
              ← Volver
            </button>

            {/* Hero banner */}
            <div style={{ background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, borderRadius:20, padding:'1.5rem 1.75rem', marginBottom:'1.25rem', color:'white' }}>
              <div style={{ fontWeight:900, fontSize:'1.25rem', marginBottom:'0.3rem' }}>📅 Agenda tu primera consulta</div>
              <div style={{ fontSize:'0.82rem', opacity:0.85, lineHeight:1.6 }}>Consulta General · $70.000 · Lunes a Sábado · 10 AM – 6 PM</div>
            </div>

            {/* Alert banner */}
            <div style={{ background:'#fff8e1', border:'1.5px solid #f5c842', borderRadius:14, padding:'0.95rem 1.2rem', marginBottom:'1.5rem', display:'flex', gap:'0.75rem', alignItems:'flex-start' }}>
              <span style={{ fontSize:'1.4rem', flexShrink:0 }}>⚠️</span>
              <div style={{ fontSize:'0.8rem', color:'#7a5c00', lineHeight:1.65 }}>
                <strong>Esta opción es solo para Consultas Generales.</strong><br/>
                Si tienes una <strong>urgencia</strong>, necesitas un <strong>especialista</strong> o traes una <strong>remisión</strong>, comunícate directamente con nosotros antes de agendar.
              </div>
            </div>

            {/* Step 1: Personal data */}
            <div style={{ background:'white', borderRadius:18, boxShadow:'0 2px 20px rgba(0,0,0,0.07)', marginBottom:'1rem', overflow:'hidden' }}>
              <div style={{ background: gStep >= 1 ? `linear-gradient(135deg,${C.teal},${C.tealDark})` : C.cream, padding:'0.9rem 1.25rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.25)', color:'white', fontWeight:800, fontSize:'0.78rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>1</div>
                <span style={{ fontWeight:700, color:'white', fontSize:'0.9rem' }}>Tus datos</span>
              </div>
              <div style={{ padding:'1.25rem 1.5rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.85rem' }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.35rem' }}>Número de cédula *</label>
                  <input value={gCedula} onChange={e=>setGCedula(e.target.value)} placeholder="Ej: 16662784" inputMode="numeric" style={{ ...inp, borderColor: gCedula ? C.teal : undefined }} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.35rem' }}>Nombre completo *</label>
                  <input value={gNombre} onChange={e=>setGNombre(e.target.value)} placeholder="Tu nombre y apellido" style={{ ...inp, borderColor: gNombre ? C.teal : undefined }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.35rem' }}>Nombre de la mascota *</label>
                  <input value={gMascota} onChange={e=>setGMascota(e.target.value)} placeholder="Ej: Firulais" style={{ ...inp, borderColor: gMascota ? C.teal : undefined }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.35rem' }}>Motivo de consulta *</label>
                  <input value={gMotivo} onChange={e=>setGMotivo(e.target.value)} placeholder="¿Por qué la traes?" style={{ ...inp, borderColor: gMotivo ? C.teal : undefined }} />
                </div>
              </div>
            </div>

            {/* Step 2: Sede + Date — only show when step 1 is filled */}
            {gStep1Ok && (
              <div style={{ background:'white', borderRadius:18, boxShadow:'0 2px 20px rgba(0,0,0,0.07)', marginBottom:'1rem', overflow:'hidden' }}>
                <div style={{ background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, padding:'0.9rem 1.25rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.25)', color:'white', fontWeight:800, fontSize:'0.78rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>2</div>
                  <span style={{ fontWeight:700, color:'white', fontSize:'0.9rem' }}>Sede y fecha</span>
                </div>
                <div style={{ padding:'1.25rem 1.5rem' }}>
                  <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.5rem' }}>Selecciona la sede</label>
                  <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
                    {BOOKING_SEDES.map(s => (
                      <button key={s.id} onClick={() => { setGSede(s.id); setGDate(''); setGSlots(null); setGTime(null); }}
                        style={{ padding:'0.5rem 1.1rem', borderRadius:999, fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${gSede===s.id ? C.teal : C.border}`, background: gSede===s.id ? C.tealLight : 'white', color: gSede===s.id ? C.tealDark : C.text, transition:'all 0.15s' }}>
                        📍 {s.nombre}
                      </button>
                    ))}
                  </div>
                  {gSede && (
                    <>
                      <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.35rem' }}>Fecha de la cita</label>
                      <input type="date" min={todayLocal} value={gDate}
                        onChange={e => {
                          const d = new Date(e.target.value + 'T12:00:00');
                          if (d.getDay() === 0) { setGDate(''); setGSlots(null); setGTime(null); alert('Los domingos no atendemos. Por favor elige otro día.'); return; }
                          setGDate(e.target.value); loadGuestSlots(e.target.value, gSede);
                        }}
                        style={{ ...inp, maxWidth:240 }}
                      />
                      {gDate && <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:'0.35rem' }}>Los domingos no se atiende. Horario: 10:00 AM – 6:00 PM.</div>}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Time slots */}
            {gStep1Ok && gStep2Ok && (
              <div style={{ background:'white', borderRadius:18, boxShadow:'0 2px 20px rgba(0,0,0,0.07)', marginBottom:'1rem', overflow:'hidden' }}>
                <div style={{ background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, padding:'0.9rem 1.25rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.25)', color:'white', fontWeight:800, fontSize:'0.78rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>3</div>
                  <span style={{ fontWeight:700, color:'white', fontSize:'0.9rem' }}>Hora disponible</span>
                </div>
                <div style={{ padding:'1.25rem 1.5rem' }}>
                  {!gSlots ? (
                    <div style={{ textAlign:'center', padding:'1rem', color:C.muted, fontSize:'0.85rem' }}>Cargando horarios…</div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(90px, 1fr))', gap:'0.5rem' }}>
                      {gSlots.map(({ time, blocked }) => (
                        <button key={time} disabled={blocked} onClick={() => setGTime(time)}
                          style={{ padding:'0.55rem', borderRadius:10, fontSize:'0.82rem', fontWeight:600, cursor:blocked?'not-allowed':'pointer', fontFamily:'inherit', border:`2px solid ${gTime===time ? C.teal : blocked ? '#e5e7eb' : C.border}`, background: gTime===time ? C.tealLight : blocked ? '#f9fafb' : 'white', color: gTime===time ? C.tealDark : blocked ? '#d1d5db' : C.text, transition:'all 0.12s', opacity:blocked?0.5:1 }}>
                          {fmt12h(time)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirm button */}
            {gStep1Ok && gStep2Ok && gTime && (
              <div style={{ background:'white', borderRadius:18, boxShadow:'0 2px 20px rgba(0,0,0,0.07)', padding:'1.25rem 1.5rem' }}>
                <div style={{ background:C.cream, borderRadius:12, padding:'1rem', marginBottom:'1rem', fontSize:'0.82rem', color:C.text, lineHeight:1.7 }}>
                  <strong>Resumen:</strong><br/>
                  🐾 <strong>{gMascota}</strong> · Consulta General<br/>
                  📅 {gDate} a las {fmt12h(gTime)}<br/>
                  📍 {BOOKING_SEDES.find(s=>s.id===gSede)?.nombre}<br/>
                  💰 Valor: <strong style={{color:C.teal}}>$70.000</strong>
                </div>
                {gErr && <div style={{ background:C.dangerBg, borderRadius:10, padding:'0.6rem 0.9rem', color:C.danger, fontSize:'0.8rem', marginBottom:'0.75rem' }}>⚠️ {gErr}</div>}
                <button onClick={handleGuestBook} disabled={gSaving}
                  style={{ width:'100%', padding:'0.9rem', background:gSaving?'#aaa':`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, cursor:gSaving?'not-allowed':'pointer', fontWeight:800, fontSize:'0.95rem', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(49,109,116,0.3)' }}>
                  {gSaving ? 'Agendando…' : '✅ Confirmar cita'}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── CERTIFICADO DE VIAJE SCREEN ── */}
      {!client && portalView === 'cert' && (
        <div style={{ maxWidth:580, margin:'0 auto', padding:'2rem 1rem 3rem' }}>
          <button onClick={() => setPortalView('choice')} style={{ background:'none', border:'none', color:C.teal, cursor:'pointer', fontFamily:'inherit', fontSize:'0.82rem', fontWeight:600, marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
            ← Volver
          </button>

          {cvOk ? (
            <div style={{ background:'white', borderRadius:20, boxShadow:'0 4px 40px rgba(49,109,116,0.12)', padding:'2.5rem', textAlign:'center' }}>
              <div style={{ width:60, height:60, borderRadius:'50%', background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', margin:'0 auto 1.25rem' }}>✅</div>
              <h2 style={{ fontWeight:800, color:C.tealDark, margin:'0 0 0.75rem' }}>¡Solicitud recibida!</h2>
              <p style={{ color:C.muted, fontSize:'0.9rem', lineHeight:1.6, margin:'0 0 1.5rem' }}>
                Recibimos tu solicitud de certificado de viaje para <strong>{cvMascota}</strong>. Nuestro equipo se pondrá en contacto contigo al <strong>{cvTelefono}</strong> para coordinar la cita y los documentos necesarios.
              </p>
              <button onClick={() => { resetCert(); setPortalView('choice'); }} style={{ background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, padding:'0.85rem 2rem', fontWeight:700, fontSize:'0.92rem', cursor:'pointer', fontFamily:'inherit' }}>
                Volver al inicio
              </button>
            </div>
          ) : (
            <div style={{ background:'white', borderRadius:20, boxShadow:'0 4px 40px rgba(49,109,116,0.12)', overflow:'hidden' }}>
              {/* Header */}
              <div style={{ background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, padding:'1.5rem 2rem', color:'white' }}>
                <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>✈️</div>
                <h2 style={{ fontWeight:800, fontSize:'1.2rem', margin:'0 0 0.35rem' }}>Certificado de Viaje</h2>
                <p style={{ fontSize:'0.82rem', opacity:0.85, margin:0, lineHeight:1.5 }}>Nacional e Internacional</p>
              </div>

              {/* Info box */}
              <div style={{ background:`${C.teal}12`, borderBottom:`1px solid ${C.teal}20`, padding:'1.1rem 1.5rem' }}>
                <p style={{ fontSize:'0.82rem', color:C.tealDark, fontWeight:600, margin:'0 0 0.5rem' }}>📋 ¿Qué necesita tu mascota para viajar?</p>
                <ul style={{ margin:0, paddingLeft:'1.2rem', fontSize:'0.8rem', color:C.text, lineHeight:1.8 }}>
                  <li>Vacuna antirrábica vigente (mínimo 30 días antes del viaje)</li>
                  <li>Desparasitación interna y externa reciente</li>
                  <li>Certificado de salud expedido por médico veterinario</li>
                  <li>Para viajes internacionales: requisitos adicionales según el país de destino</li>
                </ul>
              </div>

              {/* Párrafo vendedor */}
              <div style={{ padding:'1.1rem 1.5rem 0' }}>
                <p style={{ fontSize:'0.88rem', color:C.tealDark, lineHeight:1.75, margin:0, fontWeight:500 }}>
                  Sabemos que preparar el viaje de tu mascota puede ser un proceso <strong>confuso y abrumador</strong>: trámites, certificados, vacunas, plazos... y cada país tiene sus propias exigencias. En Pets &amp; Pets te acompañamos en <strong>cada paso del proceso de forma personalizada</strong>, asegurándonos de que todo esté en regla para que tú y tu compañero lleguen a su destino sin contratiempos.
                </p>
                <p style={{ fontSize:'0.88rem', color:C.tealDark, margin:'0.65rem 0 0', fontWeight:800 }}>
                  Rellena el formulario para obtener una llamada de asesoría gratuita.
                </p>
              </div>

              {/* Form */}
              <div style={{ padding:'1.5rem' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.85rem' }}>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.muted, display:'block', marginBottom:'0.35rem' }}>Cédula del tutor *</label>
                    <input value={cvCedula} onChange={e=>setCvCedula(e.target.value)} placeholder="Número de cédula" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.muted, display:'block', marginBottom:'0.35rem' }}>Nombre completo *</label>
                    <input value={cvNombre} onChange={e=>setCvNombre(e.target.value)} placeholder="Nombre y apellidos" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.muted, display:'block', marginBottom:'0.35rem' }}>Teléfono de contacto *</label>
                    <input value={cvTelefono} onChange={e=>setCvTelefono(e.target.value)} placeholder="Celular o fijo" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.muted, display:'block', marginBottom:'0.35rem' }}>Nombre de la mascota *</label>
                    <input value={cvMascota} onChange={e=>setCvMascota(e.target.value)} placeholder="Nombre" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.muted, display:'block', marginBottom:'0.35rem' }}>Edad de la mascota *</label>
                    <input value={cvEdad} onChange={e=>setCvEdad(e.target.value)} placeholder="Ej: 3 años" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.muted, display:'block', marginBottom:'0.35rem' }}>Especie *</label>
                    <select value={cvEspecie} onChange={e=>setCvEspecie(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                      <option value="">Seleccionar…</option>
                      <option value="Perro">Perro</option>
                      <option value="Gato">Gato</option>
                    </select>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.muted, display:'block', marginBottom:'0.35rem' }}>Destino del viaje *</label>
                    <input value={cvDestino} onChange={e=>setCvDestino(e.target.value)} placeholder="Ciudad o país de destino" style={inp} />
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ fontSize:'0.75rem', fontWeight:600, color:C.muted, display:'block', marginBottom:'0.35rem' }}>Fecha tentativa del viaje *</label>
                    <select value={cvFecha} onChange={e=>setCvFecha(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                      <option value="">Seleccionar rango…</option>
                      <option value="1-3 meses">1 a 3 meses</option>
                      <option value="3-6 meses">3 a 6 meses</option>
                      <option value="6-12 meses">6 a 12 meses</option>
                      <option value="+12 meses">Más de 12 meses</option>
                    </select>
                  </div>
                </div>

                {cvErr && <p style={{ color:C.danger, fontSize:'0.8rem', margin:'0.75rem 0 0', fontWeight:600 }}>{cvErr}</p>}

                <button onClick={handleCertSubmit} disabled={cvSaving}
                  style={{ width:'100%', marginTop:'1.25rem', padding:'0.9rem', background:cvSaving?'#aaa':`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, cursor:cvSaving?'not-allowed':'pointer', fontWeight:800, fontSize:'0.95rem', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(49,109,116,0.3)' }}>
                  {cvSaving ? 'Enviando…' : '✈️ Enviar solicitud'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PORTAL */}
      {client && data && (
        <div style={{ maxWidth:740, margin:'0 auto', padding:'2rem 1rem 3rem' }}>

          {/* Greeting */}
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', background:'white', borderRadius:16, padding:'1.1rem 1.5rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderLeft:`4px solid ${C.teal}` }}>
            <span style={{ fontSize:'2.2rem' }}>👋</span>
            <div>
              <div style={{ fontWeight:800, fontSize:'1.1rem', color:C.tealDark }}>Hola, {client.name.split(' ')[0]}</div>
              <div style={{ color:C.muted, fontSize:'0.78rem' }}>CC {client.document} · Resumen de tus mascotas</div>
            </div>
          </div>

          {/* ── AGENDA SECTION ── */}
          {(() => {
            const allAppts = data.pets.flatMap(p => p.agenda.map(a => ({ ...a, petName: p.name }))).sort((a,b) => a.date.localeCompare(b.date));
            return (
              <div style={{ background:'white', borderRadius:18, boxShadow:'0 2px 20px rgba(0,0,0,0.07)', marginBottom:'1.75rem', overflow:'hidden' }}>
                <div style={{ background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
                    <span style={{ fontSize:'1.4rem' }}>📅</span>
                    <div>
                      <div style={{ color:'white', fontWeight:800, fontSize:'0.95rem' }}>Mis Citas</div>
                      <div style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.72rem' }}>Próximas citas agendadas</div>
                    </div>
                  </div>
                  <button onClick={openAgendar} style={{ background:'white', color:C.teal, border:'none', borderRadius:12, padding:'0.55rem 1.1rem', fontWeight:800, fontSize:'0.8rem', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(0,0,0,0.12)' }}>
                    + Agendar cita
                  </button>
                </div>
                <div style={{ padding:'1rem 1.5rem' }}>
                  {allAppts.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'1.25rem 0', color:C.muted, fontSize:'0.85rem' }}>
                      No tienes citas próximas agendadas.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                      {allAppts.map((a, i) => (
                        <div key={i} style={{ border:`1px solid ${C.border}`, borderRadius:12, background:C.cream, overflow:'hidden' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem 1rem' }}>
                            <div style={{ textAlign:'center', minWidth:44, background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, borderRadius:10, padding:'0.4rem 0', flexShrink:0 }}>
                              <div style={{ fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', color:'rgba(255,255,255,0.7)' }}>
                                {new Date(a.date+'T12:00').toLocaleDateString('es-CO',{month:'short'})}
                              </div>
                              <div style={{ fontSize:'1.3rem', fontWeight:800, color:'white', lineHeight:1 }}>
                                {new Date(a.date+'T12:00').getDate()}
                              </div>
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:'0.88rem', color:C.tealDark }}>{a.service}</div>
                              <div style={{ fontSize:'0.73rem', color:C.muted, marginTop:'0.15rem' }}>
                                🐾 {a.petName} · 🕐 {fmt12h(a.time)}
                              </div>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.35rem' }}>
                              <span style={{ background:C.tealLight, color:C.teal, fontSize:'0.67rem', fontWeight:700, padding:'2px 9px', borderRadius:999, whiteSpace:'nowrap' }}>
                                {a.status || 'pendiente'}
                              </span>
                              {cancelingId === a.id ? null : (
                                <button onClick={()=>setCancelingId(a.id)} style={{ background:'white', border:`1px solid ${C.danger}60`, color:C.danger, borderRadius:8, padding:'2px 9px', fontSize:'0.67rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                          {cancelingId === a.id && (
                            <div style={{ background:'#fff0ee', borderTop:`1px solid ${C.danger}30`, padding:'0.6rem 1rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem' }}>
                              <span style={{ fontSize:'0.78rem', color:C.danger, fontWeight:600 }}>¿Confirmar cancelación?</span>
                              <div style={{ display:'flex', gap:'0.5rem' }}>
                                <button onClick={()=>setCancelingId(null)} style={{ padding:'0.3rem 0.75rem', background:'white', border:`1px solid ${C.border}`, borderRadius:8, cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit', color:C.muted }}>No</button>
                                <button onClick={()=>handleCancelAppointment(a.id)} style={{ padding:'0.3rem 0.75rem', background:C.danger, border:'none', borderRadius:8, cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit', color:'white', fontWeight:700 }}>Sí, cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {data.pets.length === 0 ? (
            <div style={{ background:'white', borderRadius:16, padding:'3rem', textAlign:'center', color:C.muted }}>
              <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>🐾</div>
              <p>No encontramos mascotas a tu nombre. Comunícate con la clínica.</p>
            </div>
          ) : data.pets.map(pet => {
            const activeTab = getTab(pet.id);
            const TABS = [
              { key:'resumen',          label:'Resumen',         icon:'🏠' },
              { key:'consultas',        label:'Consultas',       icon:'📋', count: pet.consults.length },
              { key:'procedimientos',   label:'Procedimientos',  icon:'⚕️', count: pet.procs.length },
              { key:'laboratorios',     label:'Laboratorios',    icon:'🧪', count: pet.labs.length },
              { key:'imagenologia',     label:'Imagenología',    icon:'🩻', count: pet.imaging.length },
              { key:'hospitalizacion',  label:'Hospitalización', icon:'🏥', count: pet.hosps.length },
            ];
            return (
              <div key={pet.id} style={{ background:'white', borderRadius:20, boxShadow:'0 2px 20px rgba(0,0,0,0.07)', marginBottom:'1.75rem', overflow:'hidden' }}>

                {/* Pet header */}
                <div style={{ background:`linear-gradient(135deg,${C.teal}18,${C.cream})`, borderBottom:`1px solid ${C.border}`, padding:'1.1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.9rem' }}>
                    <div style={{ width:48, height:48, borderRadius:'50%', background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', boxShadow:'0 3px 10px rgba(49,109,116,0.28)' }}>
                      {icon(pet.species)}
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:'1.05rem', color:C.tealDark }}>{pet.name}</div>
                      <div style={{ fontSize:'0.75rem', color:C.muted }}>
                        {[pet.species, pet.breed, pet.age&&`${pet.age} años`, pet.weight&&`${pet.weight} kg`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', flexWrap:'wrap' }}>
                    {pet.status === 'hospitalizado' && (
                      <span style={{ background:'#fce4e4', color:'#c0392b', fontSize:'0.68rem', fontWeight:700, padding:'3px 10px', borderRadius:999 }}>🏥 Hospitalizado</span>
                    )}
                    {pet.prepagada && new Date(pet.prepagada.paid_until + 'T23:59:59') >= new Date() && (
                      <span style={{ background:'#e8f0ff', color:'#2e5cbf', fontSize:'0.68rem', fontWeight:700, padding:'3px 10px', borderRadius:999 }}>💳 Afiliado</span>
                    )}
                    {pet.prepagada && new Date(pet.prepagada.paid_until + 'T23:59:59') < new Date() && (
                      <span style={{ background:'#fff8e1', color:'#b8860b', fontSize:'0.68rem', fontWeight:700, padding:'3px 10px', borderRadius:999 }}>⚠️ Plan en Mora</span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, overflowX:'auto', scrollbarWidth:'none' }}>
                  {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(pet.id, t.key)} style={{
                      padding:'0.7rem 1rem', border:'none', background:'transparent',
                      cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', fontWeight:activeTab===t.key?700:500,
                      color: activeTab===t.key ? C.teal : C.muted,
                      borderBottom: activeTab===t.key ? `2.5px solid ${C.teal}` : '2.5px solid transparent',
                      whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'0.3rem',
                      transition:'all 0.15s',
                    }}>
                      {t.icon} {t.label}
                      {t.count > 0 && (
                        <span style={{ background: activeTab===t.key ? C.teal : '#e0e0e0', color: activeTab===t.key ? 'white' : '#888', borderRadius:999, fontSize:'0.65rem', padding:'1px 6px', fontWeight:700 }}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ padding:'1.5rem' }}>

                  {/* ── RESUMEN ── */}
                  {activeTab === 'resumen' && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                      <MiniCard icon="💉" label="Última vacuna"
                        main={pet.lastVac?.vaccine_name || 'Sin registro'}
                        sub={pet.lastVac ? fmt(pet.lastVac.date_applied) : null}
                        note={pet.lastVac?.next_dose ? `Próxima: ${fmt(pet.lastVac.next_dose)}` : null}
                        empty={!pet.lastVac} C={C} />
                      <MiniCard icon="🪱" label="Última desparasitación"
                        main={pet.lastDespar?.vaccine_name || 'Sin registro'}
                        sub={pet.lastDespar ? fmt(pet.lastDespar.date_applied) : null}
                        note={pet.lastDespar?.next_dose ? `Próxima: ${fmt(pet.lastDespar.next_dose)}` : null}
                        empty={!pet.lastDespar} C={C} />
                      <MiniCard icon="📋" label="Consultas" main={`${pet.consults.length} registradas`} sub="en su historia clínica" empty={pet.consults.length===0} C={C} />
                      <MiniCard icon="📅" label="Próximas citas" main={pet.agenda.length > 0 ? `${pet.agenda.length} agendada${pet.agenda.length>1?'s':''}` : 'Sin citas próximas'} sub={pet.agenda[0] ? `${fmt(pet.agenda[0].date)} · ${pet.agenda[0].service}` : null} empty={pet.agenda.length===0} C={C} />
                    </div>
                  )}

                  {/* ── CONSULTAS ── */}
                  {activeTab === 'consultas' && (
                    <div>
                      {pet.consults.length === 0 ? <Empty label="Sin consultas registradas" /> : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                          {pet.consults.map((c, i) => (
                            <div key={i} style={{ border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                              <div style={{ background:C.cream, padding:'0.7rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${C.border}` }}>
                                <span style={{ fontWeight:700, fontSize:'0.85rem', color:C.tealDark }}>📋 {c.motivo_consulta || 'Consulta'}</span>
                                <span style={{ fontSize:'0.72rem', color:C.muted }}>{fmt(c.date || c.created_at)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── PROCEDIMIENTOS ── */}
                  {activeTab === 'procedimientos' && (
                    <div>
                      {pet.procs.length === 0 ? <Empty label="Sin procedimientos registrados" /> : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                          {pet.procs.map((p, i) => (
                            <div key={i} style={{ border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                              <div style={{ background:C.cream, padding:'0.65rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${C.border}` }}>
                                <span style={{ fontWeight:700, fontSize:'0.85rem', color:C.tealDark }}>
                                  {p.tipo === 'Cirugía' ? '🔪' : p.tipo === 'Profilaxis' ? '🦷' : '🔬'} {p.tipo}
                                </span>
                                <span style={{ fontSize:'0.72rem', color:C.muted }}>{fmt(p.fecha)}</span>
                              </div>
                              <div style={{ padding:'0.85rem 1rem' }}>
                                <div style={{ fontSize:'0.85rem', color:C.text, lineHeight:1.55 }}>{p.descripcion}</div>
                                {p.anestesia && (
                                  <div style={{ marginTop:'0.5rem', fontSize:'0.75rem', color:C.muted }}>
                                    💊 Anestesia: {p.anestesia}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── LABORATORIOS ── */}
                  {activeTab === 'laboratorios' && (
                    <div>
                      {pet.labs.length === 0 ? <Empty label="Sin laboratorios registrados" /> : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                          {pet.labs.map((l, i) => {
                            const est = {
                              'Subido SIN REPORTAR': { bg:'#fff8e1', color:'#b8860b', label:'Pendiente de reporte' },
                              'Reportado':           { bg:'#e8f5ee', color:'#2e7d50', label:'Reportado' },
                            }[l.estado] || { bg:C.cream, color:C.muted, label:l.estado };
                            return (
                              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.75rem 1rem', border:`1px solid ${C.border}`, borderRadius:12, gap:'0.75rem', flexWrap:'wrap' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                                  <span style={{ fontSize:'1.1rem' }}>🧪</span>
                                  <span style={{ fontWeight:600, fontSize:'0.88rem', color:C.tealDark }}>{l.tipo_examen}</span>
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                                  <span style={{ fontSize:'0.72rem', color:C.muted }}>{fmt(l.fecha_solicitado)}</span>
                                  <span style={{ background:est.bg, color:est.color, fontSize:'0.68rem', fontWeight:700, padding:'2px 9px', borderRadius:999 }}>{est.label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── IMAGENOLOGÍA ── */}
                  {activeTab === 'imagenologia' && (
                    <div>
                      {pet.imaging.length === 0 ? <Empty label="Sin registros de imagenología" /> : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                          {pet.imaging.map((r, i) => (
                            <div key={i} style={{ border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                              <div style={{ background:C.cream, padding:'0.65rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${C.border}` }}>
                                <span style={{ fontWeight:700, fontSize:'0.85rem', color:C.tealDark }}>
                                  {r.tipo === 'Radiografía' ? '🩻' : r.tipo === 'Ecografía' ? '📡' : '🔬'} {r.tipo}
                                </span>
                                <span style={{ fontSize:'0.72rem', color:C.muted }}>{fmt(r.date)}</span>
                              </div>
                              {r.resultado && (
                                <div style={{ padding:'0.85rem 1rem', fontSize:'0.85rem', color:C.text, lineHeight:1.55 }}>
                                  {r.resultado}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── HOSPITALIZACIÓN ── */}
                  {activeTab === 'hospitalizacion' && (
                    <div>
                      {pet.hosps.length === 0 ? <Empty label="Sin hospitalizaciones registradas" /> : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                          {pet.hosps.map((h, i) => {
                            const activa = h.status === 'activo';
                            return (
                              <div key={i} style={{ border:`1px solid ${activa ? '#fca5a5' : C.border}`, borderRadius:14, overflow:'hidden' }}>
                                <div style={{ background: activa ? '#fef2f2' : C.cream, padding:'0.65rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${activa ? '#fca5a5' : C.border}` }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                                    <span style={{ fontWeight:700, fontSize:'0.85rem', color: activa ? '#c0392b' : C.tealDark }}>🏥 {h.motivo || 'Hospitalización'}</span>
                                    {activa && <span style={{ background:'#fce4e4', color:'#c0392b', fontSize:'0.65rem', fontWeight:700, padding:'2px 8px', borderRadius:999 }}>En curso</span>}
                                  </div>
                                  <span style={{ fontSize:'0.72rem', color:C.muted }}>Ingreso: {fmt(h.ingreso_date)}</span>
                                </div>
                                <div style={{ padding:'0.85rem 1rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                                  {h.diagnostico && (
                                    <div style={{ background:C.tealLight, border:`1px solid ${C.teal}30`, borderRadius:10, padding:'0.55rem 0.85rem' }}>
                                      <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', color:C.teal, marginBottom:'0.2rem' }}>Diagnóstico</div>
                                      <div style={{ fontSize:'0.85rem', fontWeight:600, color:C.tealDark }}>{h.diagnostico}</div>
                                    </div>
                                  )}
                                  {h.alta_date && (
                                    <div style={{ fontSize:'0.78rem', color:'#2e7d50', fontWeight:600 }}>✅ Alta: {fmt(h.alta_date)}</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}


                </div>

                {/* Footer — HC request */}
                {(() => {
                  const req = pet.hcReq;
                  const isApproved = req?.status === 'aprobada' && req?.expires_at && new Date(req.expires_at) > new Date();
                  const isPending  = req?.status === 'pendiente';
                  const daysLeft   = isApproved ? Math.ceil((new Date(req.expires_at) - new Date()) / 86400000) : 0;
                  return (
                    <div style={{ padding:'0 1.5rem 1.5rem', display:'flex', justifyContent:'flex-end', gap:'0.6rem', alignItems:'center' }}>
                      {isApproved ? (
                        <>
                          <span style={{ fontSize:'0.72rem', color:'#15803d' }}>✅ Disponible {daysLeft} día{daysLeft!==1?'s':''} más</span>
                          <button onClick={() => handleDownloadHC(pet)} style={{ padding:'0.55rem 1.1rem', background:'#15803d', border:'none', color:'white', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:'0.78rem', fontFamily:'inherit' }}>
                            ⬇️ Descargar Historia Clínica
                          </button>
                        </>
                      ) : isPending ? (
                        <span style={{ padding:'0.55rem 1.1rem', background:'#fff8e1', border:'1px solid #f5c842', color:'#7a5c00', borderRadius:12, fontSize:'0.78rem', fontWeight:600 }}>
                          ⏳ Solicitud enviada — esperando aprobación
                        </span>
                      ) : (
                        <button onClick={() => handleSolicitarHC(pet)} style={{ padding:'0.55rem 1.1rem', background:'white', border:`2px solid ${C.teal}`, color:C.teal, borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:'0.78rem', fontFamily:'inherit' }}>
                          📄 Solicitar Historia Clínica
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: cambiar contraseña */}
      {pwModal && (
        <div onClick={() => !firstLogin && setPwModal(false)} style={{ position:'fixed', inset:0, background:'rgba(30,78,84,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(3px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:20, padding:'2rem', maxWidth:380, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            {firstLogin && <div style={{ textAlign:'center', marginBottom:'1.25rem' }}><div style={{ fontSize:'2.2rem', marginBottom:'0.3rem' }}>🎉</div><div style={{ fontWeight:800, color:C.tealDark, fontSize:'1.05rem' }}>¡Bienvenido por primera vez!</div><div style={{ color:C.muted, fontSize:'0.8rem', marginTop:'0.3rem', lineHeight:1.5 }}>Elige una contraseña personal antes de continuar.</div></div>}
            {!firstLogin && <h3 style={{ fontWeight:800, color:C.tealDark, margin:'0 0 1.25rem', fontSize:'1rem' }}>🔑 Cambiar contraseña</h3>}
            {pwOk ? (
              <div style={{ textAlign:'center', padding:'1.25rem 0' }}><div style={{ fontSize:'2.5rem', marginBottom:'0.4rem' }}>✅</div><div style={{ fontWeight:700, color:'#2e7d50' }}>¡Contraseña actualizada!</div></div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
                <div><label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'0.35rem', letterSpacing:'0.05em' }}>Nueva contraseña</label><input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Mínimo 6 caracteres" style={inp} /></div>
                <div><label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'0.35rem', letterSpacing:'0.05em' }}>Confirmar contraseña</label><input type="password" value={newPw2} onChange={e=>setNewPw2(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleChangePw()} placeholder="Repite la contraseña" style={inp} /></div>
                {pwError && <div style={{ color:C.danger, fontSize:'0.78rem', background:C.dangerBg, borderRadius:8, padding:'0.5rem 0.75rem' }}>⚠️ {pwError}</div>}
                <div style={{ display:'flex', gap:'0.6rem', justifyContent:'flex-end', marginTop:'0.25rem' }}>
                  {!firstLogin && <button onClick={()=>setPwModal(false)} style={{ padding:'0.6rem 1rem', background:'white', border:`1px solid ${C.border}`, borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontSize:'0.82rem', color:C.muted }}>Cancelar</button>}
                  <button onClick={handleChangePw} disabled={pwSaving} style={{ padding:'0.6rem 1.25rem', background:C.teal, color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.82rem', fontFamily:'inherit', opacity:pwSaving?0.7:1 }}>{pwSaving ? 'Guardando…' : 'Guardar'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: agendar cita */}
      {agOpen && (
        <div onClick={() => !agSaving && !agOk && setAgOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(30,78,84,0.45)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(3px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:22, maxWidth:460, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.22)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

            {/* Header */}
            <div style={{ background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, padding:'1.1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ color:'white', fontWeight:800, fontSize:'0.95rem' }}>📅 Agendar cita</div>
              {!agSaving && <button onClick={()=>setAgOpen(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white', borderRadius:8, padding:'0.3rem 0.7rem', cursor:'pointer', fontSize:'0.85rem', fontFamily:'inherit' }}>✕</button>}
            </div>

            {/* Body */}
            <div style={{ overflowY:'auto', padding:'1.5rem', flex:1 }}>
              {agOk ? (
                <div style={{ textAlign:'center', padding:'2rem 0' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>✅</div>
                  <div style={{ fontWeight:800, color:C.tealDark, fontSize:'1.05rem', marginBottom:'0.4rem' }}>¡Cita agendada!</div>
                  <div style={{ color:C.muted, fontSize:'0.83rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
                    Tu cita para <strong>{agPet?.name}</strong> quedó registrada el <strong>{fmt(agDate)}</strong> a las <strong>{fmt12h(agTime)}</strong> en <strong>{BOOKING_SEDES.find(s=>s.id===agSede)?.nombre}</strong>.<br/>
                    El equipo de Pets &amp; Pets te confirmará la cita pronto.
                  </div>
                  <button onClick={()=>setAgOpen(false)} style={{ padding:'0.65rem 2rem', background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>Cerrar</button>
                </div>
              ) : (
                <>
                  {/* Disclaimer */}
                  <div style={{ background:'#fff8e1', border:'1px solid #f0c040', borderRadius:12, padding:'0.85rem 1rem', marginBottom:'1.25rem', fontSize:'0.78rem', color:'#7a5c00', lineHeight:1.6 }}>
                    ⚠️ <strong>Antes de agendar:</strong> si tienes una <strong>urgencia</strong>, requieres una <strong>especialidad</strong> o tienes una <strong>remisión para procedimiento específico</strong>, te pedimos comunicarte primero con nosotros para orientarte mejor.
                  </div>

                  {/* Step 1: Pet + Tipo */}
                  <div style={{ marginBottom:'1rem' }}>
                    <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:C.muted, marginBottom:'0.4rem' }}>Mascota</label>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      {data.pets.map(p => (
                        <button key={p.id} onClick={()=>setAgPet(p)} style={{ padding:'0.5rem 0.9rem', border:`2px solid ${agPet?.id===p.id?C.teal:C.border}`, borderRadius:10, background:agPet?.id===p.id?C.tealLight:'white', color:agPet?.id===p.id?C.teal:C.text, cursor:'pointer', fontFamily:'inherit', fontSize:'0.83rem', fontWeight:agPet?.id===p.id?700:400 }}>
                          {icon(p.species)} {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom:'1rem' }}>
                    <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:C.muted, marginBottom:'0.4rem' }}>Tipo de cita</label>
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                      {['Consulta General'].map(t => (
                        <button key={t} onClick={()=>{ setAgTipo(t); setAgTime(null); setAgSlots(null); if(agSede&&agDate) loadAgSlots(agDate,agSede,t); }} style={{ flex:1, padding:'0.6rem 0.5rem', border:`2px solid ${agTipo===t?C.teal:C.border}`, borderRadius:10, background:agTipo===t?C.tealLight:'white', color:agTipo===t?C.teal:C.text, cursor:'pointer', fontFamily:'inherit', fontSize:'0.8rem', fontWeight:agTipo===t?700:400, textAlign:'center' }}>
                          🩺 Consulta General
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:'0.4rem' }}>
                      💰 Valor: <strong style={{ color:C.tealDark }}>$70.000</strong> — pagadero en la clínica antes de pasar a consulta.
                    </div>
                  </div>

                  {/* Step 2: Sede + Fecha */}
                  <div style={{ marginBottom:'1rem' }}>
                    <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:C.muted, marginBottom:'0.4rem' }}>Sede</label>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      {BOOKING_SEDES.map(s => (
                        <button key={s.id} onClick={()=>{ setAgSede(s.id); setAgTime(null); setAgSlots(null); if(agDate&&agTipo) loadAgSlots(agDate,s.id,agTipo); }} style={{ flex:1, padding:'0.55rem 0.5rem', border:`2px solid ${agSede===s.id?C.teal:C.border}`, borderRadius:10, background:agSede===s.id?C.tealLight:'white', color:agSede===s.id?C.teal:C.text, cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', fontWeight:agSede===s.id?700:400, textAlign:'center' }}>
                          📍 {s.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom:'1.25rem' }}>
                    <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:C.muted, marginBottom:'0.4rem' }}>Fecha</label>
                    <input type="date" value={agDate} min={today()} onChange={e=>{ setAgDate(e.target.value); setAgTime(null); setAgSlots(null); if(agSede&&agTipo&&e.target.value) loadAgSlots(e.target.value,agSede,agTipo); }} style={{ width:'100%', padding:'0.7rem 1rem', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:'0.9rem', fontFamily:'inherit', boxSizing:'border-box' }} />
                  </div>

                  {/* Step 3: Horarios */}
                  {agTipo && agSede && agDate && (
                    <div style={{ marginBottom:'1rem' }}>
                      <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:C.muted, marginBottom:'0.5rem' }}>Horario disponible</label>
                      {agSlots === null ? (
                        <div style={{ textAlign:'center', color:C.muted, fontSize:'0.82rem', padding:'1rem 0' }}>Cargando horarios…</div>
                      ) : (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.4rem' }}>
                          {agSlots.map(sl => (
                            <button key={sl.time} disabled={sl.blocked} onClick={()=>setAgTime(sl.time)} style={{ padding:'0.5rem 0.3rem', border:`2px solid ${agTime===sl.time?C.teal:sl.blocked?'#e0e0e0':C.border}`, borderRadius:9, background:agTime===sl.time?C.teal:sl.blocked?'#f5f5f5':'white', color:agTime===sl.time?'white':sl.blocked?'#c0c0c0':C.text, cursor:sl.blocked?'not-allowed':'pointer', fontFamily:'inherit', fontSize:'0.75rem', fontWeight:agTime===sl.time?700:400 }}>
                              {sl.blocked ? <s>{fmt12h(sl.time)}</s> : fmt12h(sl.time)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {agErr && <div style={{ color:C.danger, fontSize:'0.78rem', background:C.dangerBg, borderRadius:8, padding:'0.5rem 0.75rem', marginBottom:'0.75rem' }}>⚠️ {agErr}</div>}

                  <button
                    onClick={handleSubmitAgendar}
                    disabled={agSaving || !agPet || !agTipo || !agSede || !agDate || !agTime}
                    style={{ width:'100%', padding:'0.85rem', background:(agSaving||!agPet||!agTipo||!agSede||!agDate||!agTime)?'#ccc':`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, cursor:(agSaving||!agPet||!agTipo||!agSede||!agDate||!agTime)?'not-allowed':'pointer', fontWeight:700, fontSize:'0.92rem', fontFamily:'inherit' }}>
                    {agSaving ? 'Agendando…' : 'Confirmar cita'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: solicitar HC */}
      {solModal && (
        <div onClick={()=>setSolModal(false)} style={{ position:'fixed', inset:0, background:'rgba(30,78,84,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(3px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:20, padding:'2rem', maxWidth:360, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', margin:'0 auto 1rem' }}>✅</div>
            <h3 style={{ fontWeight:800, color:C.tealDark, fontSize:'1.05rem', margin:'0 0 0.5rem' }}>¡Solicitud enviada!</h3>
            <p style={{ color:C.muted, fontSize:'0.83rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
              Recibimos tu solicitud de historia clínica. El equipo de <strong>Pets &amp; Pets</strong> la revisará y cuando esté lista te aparecerá el botón para descargarla. Disponible por 7 días.
            </p>
            <button onClick={()=>setSolModal(false)} style={{ padding:'0.65rem 2rem', background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:'0.88rem', fontFamily:'inherit' }}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ icon, label, main, sub, note, empty, C }) {
  return (
    <div style={{ background:empty?'#FAFAF9':C.cream, border:`1px solid ${empty?'#EBEBEB':C.border}`, borderRadius:14, padding:'0.9rem' }}>
      <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.4rem' }}>{icon} {label}</div>
      <div style={{ fontWeight:700, fontSize:'0.88rem', color:empty?'#C0C0C0':C.tealDark, lineHeight:1.3 }}>{main}</div>
      {sub  && <div style={{ fontSize:'0.74rem', color:C.muted, marginTop:'0.2rem' }}>{sub}</div>}
      {note && <div style={{ fontSize:'0.7rem', color:C.gold, marginTop:'0.25rem', fontWeight:600 }}>📅 {note}</div>}
    </div>
  );
}

function Empty({ label }) {
  return (
    <div style={{ textAlign:'center', padding:'2rem 1rem', color:'#C0C0C0' }}>
      <div style={{ fontSize:'2rem', marginBottom:'0.4rem' }}>—</div>
      <div style={{ fontSize:'0.82rem' }}>{label}</div>
    </div>
  );
}
