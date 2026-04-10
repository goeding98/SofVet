import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES, sedeBadge } from '../utils/useSede';
import Modal from '../components/Modal';

// ── Grid config ─────────────────────────────────────────────────────────────
const START_HOUR = 0;
const END_HOUR   = 24;
const ROW_H      = 60; // px per hour
const HOURS      = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// ── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS_ES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS_ES      = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DAYS_FULL    = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

function pad2(n) { return String(n).padStart(2, '0'); }
function toStr(y, m, d) { return `${y}-${pad2(m+1)}-${pad2(d)}`; }
function localDateStr(d) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function addDays(ds, n) { const d = new Date(ds+'T12:00:00'); d.setDate(d.getDate()+n); return localDateStr(d); }
function getMondayOf(ds) { const d = new Date(ds+'T12:00:00'); const wd = d.getDay(); return addDays(ds, wd===0?-6:1-wd); }
function weekDays(mon)   { return Array.from({length:7}, (_,i) => addDays(mon, i)); }
function getDaysInMonth(y,m)  { return new Date(y,m+1,0).getDate(); }
function getFirstWeekday(y,m) { const d = new Date(y,m,1).getDay(); return d===0?6:d-1; }
function timeToMins(t)   { if(!t) return null; const [h,m]=t.split(':').map(Number); return h*60+m; }
function minsToTop(mins) { return ((mins - START_HOUR*60) / 60) * ROW_H; }

// ── Colors ───────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  pendiente:  '#b8860b',
  confirmada: '#2e7d50',
  cancelada:  '#c0392b',
  realizada:  '#2e5cbf',
};
const STATUS_BG = {
  pendiente:  '#fff8e1',
  confirmada: '#e8f5ee',
  cancelada:  '#fdecea',
  realizada:  '#e8f0ff',
};
const SEDE_COLOR = { 1:'#1e40af', 2:'#15803d', 3:'#92400e' };
const SEDE_BG    = { 1:'#dbeafe', 2:'#dcfce7', 3:'#fef9c3' };
function sc(sede_id) { return { color: SEDE_COLOR[sede_id]||'#4b5563', bg: SEDE_BG[sede_id]||'#f3f4f6' }; }

// ── Misc ─────────────────────────────────────────────────────────────────────
const SERVICES = ['Consulta General','Vacunación','Cirugía','Peluquería','Radiografía','Ecografía','Control post-op','Urgencia','Odontología','Laboratorio','Desparasitación'];

const SERVICE_DURATION = { 'Control post-op': 20 }; // default 40 for everything else
function defaultDuration(service) { return SERVICE_DURATION[service] ?? 40; }
function addMins(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total  = h * 60 + m + mins;
  return `${pad2(Math.floor(total/60) % 24)}:${pad2(total % 60)}`;
}

const mkForm = (date, time, sedeId, service='Consulta General') => {
  const t = time || '09:00';
  return { patient_name:'', owner:'', service, date:date||'', time:t, time_end:addMins(t, defaultDuration(service)), status:'pendiente', notes:'', sede_id:sedeId||null, consultorio:'' };
};
const labelSt = { display:'block', fontSize:'0.72rem', fontWeight:700, marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--color-text)' };
const inputSt = { width:'100%', padding:'0.55rem 0.75rem', fontFamily:'var(--font-body)', fontSize:'0.875rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)' };

// ── Appointment block (positioned in grid) ───────────────────────────────────
function AptBlock({ apt, isAdmin, onEdit, onDelete }) {
  const startMins = timeToMins(apt.time);
  if (startMins === null || startMins < START_HOUR*60 || startMins >= END_HOUR*60) return null;
  const endMins = apt.time_end ? timeToMins(apt.time_end) : startMins + defaultDuration(apt.service);
  const duration = Math.max(15, (endMins || startMins + 40) - startMins);
  const { color, bg } = sc(apt.sede_id);
  const top    = minsToTop(startMins);
  const height = (duration / 60) * ROW_H - 2;
  return (
    <div
      onClick={e => { e.stopPropagation(); isAdmin && onEdit(apt); }}
      title={`${apt.time}${apt.time_end ? '–'+apt.time_end : ''} · ${apt.patient_name} · ${apt.service}${apt.consultorio ? ' · '+apt.consultorio : ''}`}
      style={{ position:'absolute', top:top+1, left:2, right:2, height, background:bg, borderLeft:`3px solid ${color}`, borderRadius:4, padding:'3px 5px 3px 6px', overflow:'hidden', cursor:isAdmin?'pointer':'default', zIndex:2, boxShadow:'0 1px 3px rgba(0,0,0,0.1)' }}
    >
      <div style={{ fontSize:'0.68rem', fontWeight:700, color, lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {apt.time}{apt.time_end ? `–${apt.time_end}` : ''} {apt.patient_name}
      </div>
      <div style={{ fontSize:'0.6rem', color, opacity:0.8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        🩺 {apt.service}{apt.consultorio ? ` · ${apt.consultorio}` : ''}
      </div>
      {isAdmin && (
        <button onClick={e=>{e.stopPropagation();onDelete(apt);}}
          style={{ position:'absolute', top:2, right:3, background:'none', border:'none', cursor:'pointer', color, opacity:0.5, fontSize:'0.6rem', padding:0, lineHeight:1 }}>✕</button>
      )}
    </div>
  );
}

// ── Time grid (week & day) ───────────────────────────────────────────────────
function TimeGrid({ days, aptsByDate, todayStr, isAdmin, onCellClick, onEdit, onDelete }) {
  const scrollRef = useRef(null);
  const now = new Date();
  const nowMins = now.getHours()*60 + now.getMinutes();
  const nowTop  = minsToTop(nowMins);
  const showNow = nowMins >= START_HOUR*60 && nowMins < END_HOUR*60;

  useEffect(() => {
    if (scrollRef.current) {
      const target = Math.max(0, minsToTop(Math.max(nowMins - 60, 0)) - 40);
      scrollRef.current.scrollTop = target;
    }
  }, [days.length]); // re-scroll when switching between day/week

  return (
    <div style={{ background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>

      {/* Day headers (sticky) */}
      <div style={{ display:'flex', borderBottom:'2px solid var(--color-border)', background:'var(--color-bg)', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ width:54, flexShrink:0, borderRight:'1px solid var(--color-border)' }} />
        {days.map((ds, i) => {
          const d = new Date(ds+'T12:00:00');
          const wd = d.getDay();
          const dowIdx = wd === 0 ? 6 : wd - 1;
          const isToday   = ds === todayStr;
          const isWeekend = i >= 5 || wd === 0 || wd === 6;
          return (
            <div key={ds} style={{ flex:1, textAlign:'center', padding:'0.55rem 0.25rem', borderRight:i<days.length-1?'1px solid var(--color-border)':'none', background:isToday?'#eef3ff':'transparent' }}>
              <div style={{ fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:isWeekend?'var(--color-danger)':'var(--color-text-muted)', marginBottom:'0.2rem' }}>
                {days.length > 1 ? DAYS_ES[i] : DAYS_FULL[dowIdx]}
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:'50%', background:isToday?'var(--color-primary)':'transparent', color:isToday?'white':isWeekend?'var(--color-danger)':'var(--color-text)', fontWeight:isToday?700:600, fontSize:'0.9rem' }}>
                {d.getDate()}
              </div>
              {(aptsByDate[ds]||[]).length > 0 && (
                <div style={{ fontSize:'0.58rem', color:isToday?'var(--color-primary)':'var(--color-text-muted)', fontWeight:600, marginTop:'0.1rem' }}>
                  {(aptsByDate[ds]||[]).length} cita{(aptsByDate[ds]||[]).length>1?'s':''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} style={{ overflowY:'auto', maxHeight:'70vh' }}>
        <div style={{ display:'flex' }}>

          {/* Time labels */}
          <div style={{ width:54, flexShrink:0, borderRight:'1px solid var(--color-border)' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height:ROW_H, borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:8, paddingTop:4 }}>
                <span style={{ fontSize:'0.62rem', color:'var(--color-text-muted)', fontWeight:500 }}>{pad2(h)}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((ds, i) => {
            const dayItems = aptsByDate[ds] || [];
            const isToday  = ds === todayStr;
            return (
              <div key={ds} style={{ flex:1, position:'relative', borderRight:i<days.length-1?'1px solid var(--color-border)':'none', background:isToday?'rgba(46,92,191,0.015)':'transparent' }}>

                {/* Hour cells */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    onClick={() => isAdmin && onCellClick(ds, `${pad2(h)}:00`)}
                    style={{ height:ROW_H, borderBottom:'1px solid var(--color-border)', position:'relative', cursor:isAdmin?'pointer':'default' }}
                    onMouseEnter={e => { if(isAdmin) e.currentTarget.style.background='rgba(46,92,191,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; }}
                  >
                    {/* Half-hour dashed line */}
                    <div style={{ position:'absolute', top:'50%', left:0, right:0, borderTop:'1px dashed rgba(0,0,0,0.07)', pointerEvents:'none' }} />
                  </div>
                ))}

                {/* Appointment blocks */}
                {dayItems.map(apt => (
                  <AptBlock key={apt.id} apt={apt} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
                ))}

                {/* Current time red line */}
                {isToday && showNow && (
                  <div style={{ position:'absolute', top:nowTop, left:0, right:0, height:2, background:'#ef4444', zIndex:5, pointerEvents:'none' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444', position:'absolute', left:-4, top:-3 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { items: apts, add, edit, remove } = useStore('appointments');
  const { items: clients }  = useStore('clients');
  const { items: patients } = useStore('patients');
  const { session } = useAuth();
  const { isAdmin: _si }   = useSede();
  const location = useLocation();
  const navState = location.state;

  const isAdminUser = session?.rol === 'Administrador';
  const today       = new Date();
  const todayStr    = localDateStr(today);

  const [viewMode,   setViewMode]   = useState('week');
  const [anchor,     setAnchor]     = useState(todayStr);
  const [calYear,    setCalYear]    = useState(today.getFullYear());
  const [calMonth,   setCalMonth]   = useState(today.getMonth());
  const [selectedDay,setSelectedDay]= useState(todayStr);
  const [sedeFilter, setSedeFilter] = useState(isAdminUser ? null : (session?.sede_id || null));

  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({});
  const [editId, setEditId] = useState(null);

  // ── Cedula lookup for new appointment ────────────────────────────────────
  const [cedula,      setCedula]      = useState('');
  const [foundClient, setFoundClient] = useState(null);   // client obj or null
  const [cedulaMsg,   setCedulaMsg]   = useState('');     // feedback message


  const filteredApts = useMemo(() =>
    apts.filter(a => a.status !== 'cancelada' && (sedeFilter === null || a.sede_id === sedeFilter)),
    [apts, sedeFilter]);

  const aptsByDate = useMemo(() => {
    const map = {};
    filteredApts.forEach(a => { if(!map[a.date]) map[a.date]=[]; map[a.date].push(a); });
    Object.values(map).forEach(arr => arr.sort((a,b)=>(a.time||'').localeCompare(b.time||'')));
    return map;
  }, [filteredApts]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const nav = (dir) => {
    if (viewMode==='day')   { setAnchor(a => addDays(a, dir)); }
    if (viewMode==='week')  { setAnchor(a => addDays(a, dir*7)); }
    if (viewMode==='month') {
      let nm = calMonth+dir, ny = calYear;
      if(nm>11){nm=0;ny++;} if(nm<0){nm=11;ny--;}
      setCalMonth(nm); setCalYear(ny); setAnchor(`${ny}-${pad2(nm+1)}-01`);
    }
  };
  const goToday = () => { setAnchor(todayStr); setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); setSelectedDay(todayStr); };

  const periodLabel = useMemo(() => {
    if (viewMode==='day') { const d=new Date(anchor+'T12:00:00'); return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; }
    if (viewMode==='week') {
      const mon=getMondayOf(anchor); const sun=addDays(mon,6);
      const dM=new Date(mon+'T12:00:00'); const dS=new Date(sun+'T12:00:00');
      if(dM.getMonth()===dS.getMonth()) return `${dM.getDate()} – ${dS.getDate()} ${MONTHS_ES[dM.getMonth()]} ${dM.getFullYear()}`;
      return `${dM.getDate()} ${MONTHS_SHORT[dM.getMonth()]} – ${dS.getDate()} ${MONTHS_SHORT[dS.getMonth()]} ${dS.getFullYear()}`;
    }
    return `${MONTHS_ES[calMonth]} ${calYear}`;
  }, [viewMode, anchor, calMonth, calYear]);

  // ── Modal ───────────────────────────────────────────────────────────────
  // Auto-open new form if navigated from pet dashboard
  useEffect(() => {
    if (navState?.patient_name && isAdminUser) {
      const f = mkForm(todayStr, '09:00', sedeFilter);
      setForm({ ...f, patient_name: navState.patient_name, owner: navState.owner || '' });
      setEditId(null); setModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCedulaSearch = (val) => {
    setCedula(val);
    if (!val.trim()) { setFoundClient(null); setCedulaMsg(''); return; }
    const cl = clients.find(c => String(c.document || c.cedula || c.nit || '').trim() === val.trim());
    if (cl) {
      setFoundClient(cl);
      setCedulaMsg(`✅ Cliente encontrado: ${cl.name}`);
      setForm(f => ({ ...f, owner: cl.name }));
    } else {
      setFoundClient(null);
      setCedulaMsg('⚠️ Cédula no registrada — ingresá el nombre manualmente.');
    }
  };

  const selectPet = (pet) => {
    setForm(f => ({ ...f, patient_name: pet.name, owner: foundClient?.name || f.owner }));
  };

  const openAdd = (dateStr, timeStr) => {
    if (!isAdminUser) return;
    setCedula(''); setFoundClient(null); setCedulaMsg('');
    setForm(mkForm(dateStr||anchor, timeStr||'09:00', sedeFilter));
    setEditId(null); setModal(true);
  };
  const openEdit = (apt) => {
    if (!isAdminUser) return;
    setCedula(''); setFoundClient(null); setCedulaMsg('');
    setForm({...apt}); setEditId(apt.id); setModal(true);
  };
  const handleSave = () => {
    if (!form.patient_name?.trim()||!form.date||!form.time) { alert('Paciente, fecha y hora son requeridos'); return; }
    editId ? edit(editId, form) : add(form);
    setModal(false);
  };
  const handleDelete = (apt) => {
    if (!isAdminUser) return;
    if (confirm(`¿Eliminar cita de ${apt.patient_name}?`)) remove(apt.id);
  };
  const setF = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    // Auto-recalculate time_end when service or start time changes (only if not manually edited yet)
    if (k === 'service') {
      updated.time_end = addMins(updated.time || '09:00', defaultDuration(v));
    }
    if (k === 'time') {
      updated.time_end = addMins(v, defaultDuration(updated.service || 'Consulta General'));
    }
    return updated;
  });

  const todayCount = (aptsByDate[todayStr]||[]).length;
  const monthApts  = filteredApts.filter(a=>a.date?.startsWith(`${calYear}-${pad2(calMonth+1)}`));

  const viewBtn = (mode, label) => (
    <button onClick={() => setViewMode(mode)} style={{ padding:'0.35rem 0.9rem', border:'1px solid', borderColor:viewMode===mode?'var(--color-primary)':'var(--color-border)', borderRadius:'var(--radius-sm)', background:viewMode===mode?'var(--color-primary)':'var(--color-white)', color:viewMode===mode?'white':'var(--color-text-muted)', fontFamily:'var(--font-body)', fontSize:'0.78rem', fontWeight:600, cursor:'pointer' }}>
      {label}
    </button>
  );

  // ── Month view ──────────────────────────────────────────────────────────
  const MonthView = () => {
    const firstDay    = getFirstWeekday(calYear, calMonth);
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const cells = Array.from({length: Math.ceil((firstDay+daysInMonth)/7)*7}, (_,i) => {
      const n = i - firstDay + 1;
      return (n>=1 && n<=daysInMonth) ? n : null;
    });
    const selD = new Date(selectedDay+'T12:00:00');
    const dayApts = aptsByDate[selectedDay] || [];

    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 330px', gap:'1.25rem', alignItems:'start' }}>
        <div style={{ background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'2px solid var(--color-border)' }}>
            {DAYS_ES.map((d,i) => <div key={d} style={{padding:'0.6rem 0',textAlign:'center',fontSize:'0.68rem',fontWeight:700,color:i>=5?'var(--color-danger)':'var(--color-text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{d}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {cells.map((dayNum, idx) => {
              const ds = dayNum ? toStr(calYear, calMonth, dayNum) : null;
              const isToday = ds===todayStr, isSel=ds===selectedDay, isWeekend=(idx%7)>=5;
              const items = ds ? (aptsByDate[ds]||[]) : [];
              return (
                <div key={idx} onClick={()=>dayNum&&setSelectedDay(ds)}
                  style={{minHeight:80,padding:'0.35rem 0.4rem',borderRight:(idx%7)!==6?'1px solid var(--color-border)':'none',borderBottom:idx<cells.length-7?'1px solid var(--color-border)':'none',background:isSel?'#eef3ff':isToday?'#f5f9ff':'transparent',cursor:dayNum?'pointer':'default'}}
                  onMouseEnter={e=>{if(dayNum&&!isSel)e.currentTarget.style.background='#f8faff';}}
                  onMouseLeave={e=>{if(dayNum&&!isSel)e.currentTarget.style.background=isToday?'#f5f9ff':'transparent';}}
                >
                  {dayNum && <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.2rem'}}>
                      <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:24,height:24,borderRadius:'50%',fontSize:'0.76rem',fontWeight:isToday?700:500,background:isToday?'var(--color-primary)':'transparent',color:isToday?'white':isWeekend?'var(--color-danger)':'var(--color-text)'}}>
                        {dayNum}
                      </span>
                      {isAdminUser && <span onClick={e=>{e.stopPropagation();openAdd(ds);}} style={{fontSize:'0.85rem',color:'var(--color-border)',cursor:'pointer',opacity:0.5,userSelect:'none'}} title="Nueva cita">+</span>}
                    </div>
                    {items.slice(0,3).map((apt,i)=>{
                      const {color,bg}=sc(apt.sede_id);
                      return <div key={apt.id||i} style={{background:bg,color,borderRadius:3,padding:'1px 4px',fontSize:'0.6rem',fontWeight:600,marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{apt.time?`${apt.time} `:''}{apt.patient_name}</div>;
                    })}
                    {items.length>3&&<div style={{fontSize:'0.58rem',color:'var(--color-text-muted)',fontWeight:600}}>+{items.length-3} más</div>}
                  </>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div style={{background:'var(--color-white)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-xl)',overflow:'hidden',boxShadow:'var(--shadow-sm)',position:'sticky',top:'1rem'}}>
          <div style={{padding:'0.9rem 1.1rem',borderBottom:'1px solid var(--color-border)',background:selectedDay===todayStr?'#eef3ff':'var(--color-bg)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontFamily:'var(--font-title)',fontWeight:700,fontSize:'0.9rem',color:'var(--color-primary)'}}>
                {selD.getDate()} de {MONTHS_ES[selD.getMonth()]}
                {selectedDay===todayStr&&<span style={{marginLeft:'0.5rem',background:'var(--color-primary)',color:'white',padding:'1px 6px',borderRadius:999,fontSize:'0.6rem'}}>Hoy</span>}
              </div>
              <div style={{fontSize:'0.7rem',color:'var(--color-text-muted)',marginTop:'0.1rem'}}>{dayApts.length===0?'Sin citas':`${dayApts.length} cita${dayApts.length>1?'s':''}`}</div>
            </div>
            {isAdminUser&&<button onClick={()=>openAdd(selectedDay)} style={{width:28,height:28,background:'var(--color-primary)',color:'white',border:'none',borderRadius:'50%',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>}
          </div>
          <div style={{padding:'0.65rem',maxHeight:'65vh',overflowY:'auto'}}>
            {dayApts.length===0?(
              <div style={{textAlign:'center',padding:'2rem 1rem',color:'var(--color-text-muted)'}}>
                <div style={{fontSize:'1.8rem',marginBottom:'0.4rem'}}>📅</div>
                <p style={{fontSize:'0.75rem'}}>Sin citas este día.</p>
              </div>
            ):dayApts.map(apt=>{
              const stColor = STATUS_COLOR[apt.status]||'#888';
              const stBg    = STATUS_BG[apt.status]||'#eee';
              const {color,bg}=sc(apt.sede_id);
              return (
                <div key={apt.id} style={{border:'1px solid var(--color-border)',borderLeft:`3px solid ${color}`,borderRadius:'var(--radius-md)',padding:'0.65rem',background:'var(--color-white)',marginBottom:'0.5rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.25rem'}}>
                    <span style={{fontFamily:'var(--font-title)',fontSize:'0.82rem',fontWeight:700,color:'var(--color-primary)'}}>{apt.time||'—'}</span>
                    <span style={{background:stBg,color:stColor,padding:'1px 7px',borderRadius:999,fontSize:'0.62rem',fontWeight:600}}>{apt.status}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:'0.1rem'}}>{apt.patient_name}</div>
                  {apt.owner&&<div style={{fontSize:'0.7rem',color:'var(--color-text-muted)'}}>👤 {apt.owner}</div>}
                  <div style={{fontSize:'0.67rem',color:'var(--color-text-muted)',marginTop:'0.15rem'}}>🩺 {apt.service}{apt.consultorio?` · ${apt.consultorio}`:''}</div>
                  {isAdminUser&&(
                    <div style={{display:'flex',gap:'0.35rem',marginTop:'0.4rem',justifyContent:'flex-end'}}>
                      <button onClick={()=>openEdit(apt)} style={{padding:'0.2rem 0.55rem',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',background:'var(--color-white)',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'0.67rem',color:'var(--color-text)'}}>✏️</button>
                      <button onClick={()=>handleDelete(apt)} style={{padding:'0.2rem 0.55rem',border:'1px solid var(--color-danger)',borderRadius:'var(--radius-sm)',background:'var(--color-white)',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'0.67rem',color:'var(--color-danger)'}}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const weekDaysArr = weekDays(getMondayOf(anchor));

  return (
    <div>
      <div className="page-header" style={{marginBottom:'1rem'}}>
        <h1>Agenda</h1>
        <p>{filteredApts.length} citas · {todayCount} hoy{viewMode==='month'?` · ${monthApts.length} este mes`:''}</p>
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:'0.75rem',alignItems:'center',flexWrap:'wrap',marginBottom:'1rem',justifyContent:'space-between'}}>

        {/* Sede pills */}
        <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:'0.68rem',fontWeight:700,color:'var(--color-text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Sede:</span>
          {isAdminUser&&(
            <button onClick={()=>setSedeFilter(null)} style={{padding:'0.28rem 0.75rem',borderRadius:999,fontSize:'0.72rem',fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:sedeFilter===null?'var(--color-primary)':'var(--color-border)',background:sedeFilter===null?'var(--color-primary)':'var(--color-white)',color:sedeFilter===null?'white':'var(--color-text-muted)'}}>Todas</button>
          )}
          {SEDES.map(s=>{
            const locked=!isAdminUser&&session?.sede_id===s.id;
            const active=sedeFilter===s.id;
            return <button key={s.id} onClick={()=>isAdminUser?setSedeFilter(active?null:s.id):undefined} style={{padding:'0.28rem 0.75rem',borderRadius:999,fontSize:'0.72rem',fontWeight:600,cursor:isAdminUser?'pointer':'default',border:`1px solid ${active?s.color:'var(--color-border)'}`,background:active?s.color:s.bg,color:active?'white':s.color,opacity:(!isAdminUser&&!locked)?0.4:1}}>
              📍 {s.nombre}{locked?' · Mi sede':''}
            </button>;
          })}
        </div>

        {/* Right: view toggle + nav + new */}
        <div style={{display:'flex',gap:'0.5rem',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',overflow:'hidden'}}>
            {viewBtn('day','Diaria')}
            {viewBtn('week','Semanal')}
            {viewBtn('month','Mensual')}
          </div>
          <button onClick={()=>nav(-1)} style={{width:30,height:30,border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',background:'var(--color-white)',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
          <div style={{fontFamily:'var(--font-title)',fontWeight:700,fontSize:'0.9rem',color:'var(--color-text)',minWidth:180,textAlign:'center'}}>{periodLabel}</div>
          <button onClick={()=>nav(1)}  style={{width:30,height:30,border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',background:'var(--color-white)',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
          <button onClick={goToday} style={{padding:'0.28rem 0.7rem',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',background:'var(--color-white)',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'0.75rem',color:'var(--color-text-muted)'}}>Hoy</button>
          {isAdminUser&&(
            <button onClick={()=>openAdd(viewMode==='day'?anchor:todayStr)} style={{padding:'0.38rem 1rem',background:'var(--color-primary)',color:'white',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'0.82rem',fontWeight:700}}>
              + Nueva cita
            </button>
          )}
        </div>
      </div>

      {/* Views */}
      {viewMode==='week' && (
        <TimeGrid
          days={weekDaysArr}
          aptsByDate={aptsByDate}
          todayStr={todayStr}
          isAdmin={isAdminUser}
          onCellClick={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
      {viewMode==='day' && (
        <TimeGrid
          days={[anchor]}
          aptsByDate={aptsByDate}
          todayStr={todayStr}
          isAdmin={isAdminUser}
          onCellClick={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
      {viewMode==='month' && <MonthView />}

      {/* Modal */}
      <Modal isOpen={modal} onClose={()=>setModal(false)} title={editId?'Editar Cita':'📅 Nueva Cita'} onSave={handleSave} size="md">

        {/* ── Cedula lookup (only for new appointments) ── */}
        {!editId && (() => {
          const foundPets = foundClient ? patients.filter(p => p.client_id === foundClient.id) : [];
          return (
            <div style={{ marginBottom:'1rem', background:'var(--color-bg)', borderRadius:'var(--radius-md)', padding:'0.85rem 1rem', border:'1px solid var(--color-border)' }}>
              <label style={labelSt}>Cédula del cliente</label>
              <input
                style={inputSt}
                value={cedula}
                onChange={e => handleCedulaSearch(e.target.value)}
                placeholder="Ej: 1234567890"
                autoComplete="off"
              />
              {cedulaMsg && (
                <div style={{ fontSize:'0.75rem', marginTop:'0.4rem', color: foundClient ? '#2e7d50' : '#b8860b', fontWeight:600 }}>
                  {cedulaMsg}
                </div>
              )}
              {/* Pet selector if client found */}
              {foundPets.length > 0 && (
                <div style={{ marginTop:'0.65rem' }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--color-text-muted)', marginBottom:'0.35rem' }}>
                    Seleccionar mascota
                  </div>
                  <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                    {foundPets.map(pet => (
                      <button
                        key={pet.id}
                        onClick={() => selectPet(pet)}
                        style={{
                          padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.78rem', fontWeight:600,
                          cursor:'pointer', fontFamily:'var(--font-body)',
                          border:`1.5px solid ${form.patient_name === pet.name ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: form.patient_name === pet.name ? 'var(--color-primary)' : 'white',
                          color: form.patient_name === pet.name ? 'white' : 'var(--color-text)',
                        }}
                      >
                        {pet.species === 'Perro' ? '🐶' : pet.species === 'Gato' ? '🐱' : '🐾'} {pet.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div className="grid-2">
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Paciente *</label>
            <input style={inputSt} value={form.patient_name||''} onChange={e=>setF('patient_name',e.target.value)} placeholder="Nombre de la mascota" />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Propietario</label>
            <input style={inputSt} value={form.owner||''} onChange={e=>setF('owner',e.target.value)} placeholder="Nombre del dueño" />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Fecha *</label>
            <input type="date" style={inputSt} value={form.date||''} onChange={e=>setF('date',e.target.value)} />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Hora inicio *</label>
            <input type="time" style={inputSt} value={form.time||''} onChange={e=>setF('time',e.target.value)} />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Hora fin</label>
            <input type="time" style={inputSt} value={form.time_end||''} onChange={e=>setF('time_end',e.target.value)} />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Servicio</label>
            <select style={inputSt} value={SERVICES.includes(form.service||'') ? form.service : 'Otro'} onChange={e => { if (e.target.value === 'Otro') setF('service', ''); else setF('service', e.target.value); }}>
              {SERVICES.map(s=><option key={s}>{s}</option>)}
              <option value="Otro">Otro</option>
            </select>
            {!SERVICES.includes(form.service||'') && (
              <input style={{...inputSt, marginTop:'0.4rem'}} value={form.service||''} onChange={e=>setF('service',e.target.value)} placeholder="Describe el servicio..." autoFocus />
            )}
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Consultorio</label>
            <select style={inputSt} value={form.consultorio||''} onChange={e=>setF('consultorio',e.target.value)}>
              <option value="">— Sin asignar —</option>
              <option value="Consultorio 1">Consultorio 1</option>
              <option value="Consultorio 2">Consultorio 2</option>
            </select>
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Sede</label>
            <select style={inputSt} value={form.sede_id||''} onChange={e=>setF('sede_id',e.target.value?parseInt(e.target.value):null)}>
              <option value="">— Sin sede —</option>
              {SEDES.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:'0.75rem'}}>
          <label style={labelSt}>Notas</label>
          <textarea style={{...inputSt,resize:'vertical'}} rows={3} value={form.notes||''} onChange={e=>setF('notes',e.target.value)} placeholder="Información adicional..." />
        </div>
      </Modal>
    </div>
  );
}
