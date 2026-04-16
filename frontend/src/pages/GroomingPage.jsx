import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES } from '../utils/useSede';
import { supabase } from '../utils/supabaseClient';
import Modal from '../components/Modal';

// ── Grid config ──────────────────────────────────────────────────────────────
const START_HOUR = 0;
const END_HOUR   = 24;
const ROW_H      = 60;
const HOURS      = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i);

// ── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS_ES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS_ES      = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DAYS_FULL    = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

function pad2(n) { return String(n).padStart(2, '0'); }
function toStr(y,m,d) { return `${y}-${pad2(m+1)}-${pad2(d)}`; }
function addDays(ds,n) { const d=new Date(ds+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; }
function getMondayOf(ds) { const d=new Date(ds+'T12:00:00'); const wd=d.getDay(); return addDays(ds,wd===0?-6:1-wd); }
function weekDays(mon) { return Array.from({length:7},(_,i)=>addDays(mon,i)); }
function getDaysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
function getFirstWeekday(y,m) { const d=new Date(y,m,1).getDay(); return d===0?6:d-1; }
function timeToMins(t) { if(!t) return null; const [h,m]=t.split(':').map(Number); return h*60+m; }
function minsToTop(mins) { return (mins/60)*ROW_H; }
function addMins(t,n) { const [h,m]=t.split(':').map(Number); const tot=h*60+m+n; return `${pad2(Math.floor(tot/60)%24)}:${pad2(tot%60)}`; }
function fmtCOP(v) { if(!v && v!==0) return '—'; return `$${Number(v).toLocaleString('es-CO')}`; }

// ── Services ─────────────────────────────────────────────────────────────────
const GROOMING_SERVICES = [
  'Baño', 'Baño + Corte', 'Baño medicado', 'Corte de pelo', 'Deslanado',
  'Corte de uñas', 'Limpieza de oídos', 'Cepillado dental',
  'Antipulgas', 'Full (todo incluido)',
];

const PAGO_OPTS = ['Pendiente', 'Pagado', 'Quedo debiendo'];
const PAGO_CFG  = {
  'Pagado':         { bg:'#e8f5ee', color:'#2e7d50', label:'PAGO' },
  'Quedo debiendo': { bg:'#fdecea', color:'#c0392b', label:'QUEDO DEBIENDO' },
  'Pendiente':      { bg:'#fff8e1', color:'#b8860b', label:'PENDIENTE' },
};

// ── Status ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pendiente:    { bg:'#fff8e1', color:'#b8860b', next:'en proceso', nextLabel:'▶ Iniciar'   },
  'en proceso': { bg:'#e3f0f2', color:'#316d74', next:'completado', nextLabel:'✓ Completar' },
  completado:   { bg:'#e8f5ee', color:'#2e7d50', next:null,         nextLabel:null           },
  cancelado:    { bg:'#fdecea', color:'#c0392b', next:null,         nextLabel:null           },
};

const BLOCK_COLOR = '#7c5cbf';
const BLOCK_BG    = '#f0ebff';

const mkForm = (date, time) => ({
  patient_name:'', breed:'', owner:'', owner_phone:'',
  services:[], date:date||'', time:time||'09:00',
  time_end:addMins(time||'09:00', 60),
  notes:'', sede_id:null, status:'pendiente',
  photo_before:null, photo_after:null,
  agendado_por:'', valor_servicio:'', transporte:false,
  valor_transporte:'', direccion:'', pago_estado:'Pendiente',
});

const labelSt = { display:'block', fontSize:'0.72rem', fontWeight:700, marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--color-text)' };
const inputSt = { width:'100%', padding:'0.55rem 0.75rem', fontFamily:'var(--font-body)', fontSize:'0.875rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', boxSizing:'border-box' };

// ── Grooming block in week/day grid ───────────────────────────────────────────
function GroomBlock({ item, isAdmin, onEdit, onDelete, onStatusChange }) {
  const startMins = timeToMins(item.time);
  if (startMins === null) return null;
  const endMins  = item.time_end ? timeToMins(item.time_end) : startMins + 60;
  const duration = Math.max(15, endMins - startMins);
  const top      = minsToTop(startMins);
  const height   = (duration/60)*ROW_H - 2;
  const st       = STATUS_CFG[item.status] || STATUS_CFG.pendiente;
  const svcLabel = Array.isArray(item.services) ? item.services.join(', ') : (item.services||'');

  return (
    <div
      onClick={e => { e.stopPropagation(); onEdit(item); }}
      title={`${item.time}${item.time_end?'–'+item.time_end:''} · ${item.patient_name} · ${svcLabel}`}
      style={{ position:'absolute', top:top+1, left:2, right:2, height, background:st.bg, borderLeft:`3px solid ${st.color}`, borderRadius:4, padding:'3px 5px 3px 6px', overflow:'hidden', cursor:'pointer', zIndex:2, boxShadow:'0 1px 3px rgba(0,0,0,0.1)' }}
    >
      <div style={{ fontSize:'0.68rem', fontWeight:700, color:st.color, lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {item.time} ✂️ {item.patient_name}
      </div>
      <div style={{ fontSize:'0.6rem', color:st.color, opacity:0.85, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {svcLabel || '—'}{item.agendado_por ? ` · ${item.agendado_por}` : ''}
      </div>
      {item.valor_servicio && (
        <div style={{ fontSize:'0.58rem', color:st.color, opacity:0.75 }}>{fmtCOP(item.valor_servicio)}</div>
      )}
      {st.next && (
        <button onClick={e=>{e.stopPropagation();onStatusChange(item,st.next);}}
          style={{ position:'absolute', bottom:2, right:3, background:st.color, color:'white', border:'none', borderRadius:3, cursor:'pointer', fontSize:'0.55rem', padding:'1px 4px', fontWeight:700, lineHeight:1.4 }}
        >{st.nextLabel}</button>
      )}
      {isAdmin && (
        <button onClick={e=>{e.stopPropagation();onDelete(item);}}
          style={{ position:'absolute', top:2, right:3, background:'none', border:'none', cursor:'pointer', color:st.color, opacity:0.5, fontSize:'0.6rem', padding:0 }}>✕</button>
      )}
    </div>
  );
}

// ── Time grid (weekly / single-day) ──────────────────────────────────────────
function TimeGrid({ days, byDate, todayStr, isAdmin, onCellClick, onEdit, onDelete, onStatusChange }) {
  const scrollRef = useRef(null);
  const now     = new Date();
  const nowMins = now.getHours()*60+now.getMinutes();
  const nowTop  = minsToTop(nowMins);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, minsToTop(Math.max(nowMins-60,0))-40);
  }, [days.length]);

  return (
    <div style={{ background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
      <div style={{ display:'flex', borderBottom:'2px solid var(--color-border)', background:'var(--color-bg)', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ width:54, flexShrink:0, borderRight:'1px solid var(--color-border)' }} />
        {days.map((ds,i) => {
          const d=new Date(ds+'T12:00:00'); const wd=d.getDay(); const dowIdx=wd===0?6:wd-1;
          const isToday=ds===todayStr; const isWeekend=wd===0||wd===6;
          return (
            <div key={ds} style={{ flex:1, textAlign:'center', padding:'0.55rem 0.25rem', borderRight:i<days.length-1?'1px solid var(--color-border)':'none', background:isToday?'#f5f0ff':'transparent' }}>
              <div style={{ fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:isWeekend?'var(--color-danger)':'var(--color-text-muted)', marginBottom:'0.2rem' }}>
                {days.length>1 ? DAYS_ES[i] : DAYS_FULL[dowIdx]}
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:'50%', background:isToday?BLOCK_COLOR:'transparent', color:isToday?'white':isWeekend?'var(--color-danger)':'var(--color-text)', fontWeight:isToday?700:600, fontSize:'0.9rem' }}>
                {d.getDate()}
              </div>
              {(byDate[ds]||[]).length > 0 && (
                <div style={{ fontSize:'0.58rem', color:isToday?BLOCK_COLOR:'var(--color-text-muted)', fontWeight:600, marginTop:'0.1rem' }}>
                  {(byDate[ds]||[]).length} servicio{(byDate[ds]||[]).length>1?'s':''}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div ref={scrollRef} style={{ overflowY:'auto', maxHeight:'70vh' }}>
        <div style={{ display:'flex' }}>
          <div style={{ width:54, flexShrink:0, borderRight:'1px solid var(--color-border)' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height:ROW_H, borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:8, paddingTop:4 }}>
                <span style={{ fontSize:'0.62rem', color:'var(--color-text-muted)', fontWeight:500 }}>{pad2(h)}:00</span>
              </div>
            ))}
          </div>
          {days.map((ds,i) => {
            const isToday = ds === todayStr;
            return (
              <div key={ds} style={{ flex:1, position:'relative', borderRight:i<days.length-1?'1px solid var(--color-border)':'none', background:isToday?'rgba(124,92,191,0.015)':'transparent' }}>
                {HOURS.map(h => (
                  <div key={h} onClick={()=>onCellClick(ds,`${pad2(h)}:00`)}
                    style={{ height:ROW_H, borderBottom:'1px solid var(--color-border)', cursor:'pointer', position:'relative' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(124,92,191,0.05)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}
                  >
                    <div style={{ position:'absolute', top:'50%', left:0, right:0, borderTop:'1px dashed rgba(0,0,0,0.07)', pointerEvents:'none' }} />
                  </div>
                ))}
                {(byDate[ds]||[]).map(item => (
                  <GroomBlock key={item.id} item={item} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
                ))}
                {isToday && (
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

// ── Day table view ────────────────────────────────────────────────────────────
function DayTableView({ dayStr, dayItems, isAdmin, onAdd, onEdit, onDelete, onStatusChange }) {
  const d      = new Date(dayStr+'T12:00:00');
  const wd     = d.getDay();
  const dowIdx = wd===0?6:wd-1;
  const isToday = dayStr === new Date().toISOString().split('T')[0];

  const thSt = { padding:'0.5rem 0.75rem', textAlign:'left', fontSize:'0.68rem', fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap', background:BLOCK_COLOR };
  const tdSt = { padding:'0.55rem 0.75rem', fontSize:'0.82rem', verticalAlign:'middle', borderBottom:'1px solid var(--color-border)' };

  const totalValor = dayItems.reduce((s,i) => s + (Number(i.valor_servicio)||0), 0);
  const totalTransp = dayItems.reduce((s,i) => s + (i.transporte ? Number(i.valor_transporte)||0 : 0), 0);

  return (
    <div>
      {/* Day header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-title)', color:BLOCK_COLOR, margin:0, fontSize:'1.3rem' }}>
            {DAYS_FULL[dowIdx]}, {d.getDate()} de {MONTHS_ES[d.getMonth()]} {d.getFullYear()}
            {isToday && <span style={{ marginLeft:'0.6rem', background:BLOCK_COLOR, color:'white', padding:'2px 10px', borderRadius:999, fontSize:'0.7rem', fontWeight:700, verticalAlign:'middle' }}>Hoy</span>}
          </h2>
          <p style={{ color:'var(--color-text-muted)', fontSize:'0.82rem', margin:'0.2rem 0 0' }}>
            {dayItems.length} servicio{dayItems.length!==1?'s':''} · Total: <strong>{fmtCOP(totalValor)}</strong>{totalTransp>0?` + ${fmtCOP(totalTransp)} transporte`:''}
          </p>
        </div>
        <button onClick={onAdd}
          style={{ padding:'0.45rem 1.1rem', background:BLOCK_COLOR, color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.82rem', fontWeight:700 }}>
          + Nuevo servicio
        </button>
      </div>

      {dayItems.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem 1rem', color:'var(--color-text-muted)', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>✂️</div>
          <p style={{ fontWeight:600 }}>Sin servicios agendados para este día.</p>
          <button onClick={onAdd} style={{ marginTop:'1rem', padding:'0.45rem 1.1rem', background:BLOCK_COLOR, color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontWeight:700 }}>+ Agregar servicio</button>
        </div>
      ) : (
        <div style={{ overflowX:'auto', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-sm)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
            <thead>
              <tr>
                <th style={thSt}>Hora</th>
                <th style={thSt}>Mascota</th>
                <th style={thSt}>Raza</th>
                <th style={thSt}>Tutor</th>
                <th style={thSt}># Contacto</th>
                <th style={thSt}>Servicio</th>
                <th style={thSt}>Agenda</th>
                <th style={{ ...thSt, textAlign:'right' }}>Valor</th>
                <th style={thSt}>Transporte</th>
                <th style={thSt}>Dirección</th>
                <th style={thSt}>Estado</th>
                <th style={thSt}>Pago</th>
                <th style={{ ...thSt, textAlign:'center' }}>Acc.</th>
              </tr>
            </thead>
            <tbody>
              {dayItems.map((it, idx) => {
                const st   = STATUS_CFG[it.status] || STATUS_CFG.pendiente;
                const pago = PAGO_CFG[it.pago_estado] || PAGO_CFG['Pendiente'];
                const svcs = Array.isArray(it.services) ? it.services.join(', ') : (it.services||'—');
                const rowBg = idx%2===0 ? '#ffffff' : '#f9f9fb';
                return (
                  <tr key={it.id} style={{ background: rowBg }}>
                    <td style={{ ...tdSt, fontWeight:700, color:BLOCK_COLOR, whiteSpace:'nowrap' }}>
                      {it.time}{it.time_end ? ` – ${it.time_end}` : ''}
                    </td>
                    <td style={{ ...tdSt, fontWeight:700 }}>✂️ {it.patient_name}</td>
                    <td style={{ ...tdSt, color:'var(--color-text-muted)', fontSize:'0.78rem' }}>{it.breed || '—'}</td>
                    <td style={{ ...tdSt, fontWeight:600 }}>{it.owner || '—'}</td>
                    <td style={{ ...tdSt, color:'var(--color-text-muted)', fontSize:'0.78rem', whiteSpace:'nowrap' }}>{it.owner_phone || '—'}</td>
                    <td style={{ ...tdSt, fontSize:'0.78rem' }}>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.2rem' }}>
                        {Array.isArray(it.services) && it.services.length > 0
                          ? it.services.map(s => <span key={s} style={{ background:BLOCK_BG, color:BLOCK_COLOR, padding:'1px 7px', borderRadius:999, fontSize:'0.68rem', fontWeight:600, whiteSpace:'nowrap' }}>{s}</span>)
                          : <span style={{ color:'var(--color-text-muted)' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ ...tdSt, fontSize:'0.78rem', color:'var(--color-text-muted)' }}>{it.agendado_por || '—'}</td>
                    <td style={{ ...tdSt, textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>
                      <div>{fmtCOP(it.valor_servicio)}</div>
                      {it.transporte && it.valor_transporte && (
                        <div style={{ fontSize:'0.68rem', color:'#2e5cbf', fontWeight:600 }}>+{fmtCOP(it.valor_transporte)} transp.</div>
                      )}
                    </td>
                    <td style={{ ...tdSt, textAlign:'center' }}>
                      {it.transporte
                        ? <span style={{ background:'#e8f0ff', color:'#2e5cbf', padding:'2px 8px', borderRadius:999, fontSize:'0.68rem', fontWeight:700 }}>Sí</span>
                        : <span style={{ color:'var(--color-text-muted)', fontSize:'0.75rem' }}>No</span>}
                    </td>
                    <td style={{ ...tdSt, fontSize:'0.75rem', color:'var(--color-text-muted)', maxWidth:160 }}>{it.direccion || '—'}</td>
                    <td style={{ ...tdSt }}>
                      <span style={{ background:st.bg, color:st.color, padding:'2px 8px', borderRadius:999, fontSize:'0.68rem', fontWeight:700, whiteSpace:'nowrap' }}>{it.status}</span>
                    </td>
                    <td style={{ ...tdSt }}>
                      <span style={{ background:pago.bg, color:pago.color, padding:'2px 8px', borderRadius:999, fontSize:'0.68rem', fontWeight:700, whiteSpace:'nowrap' }}>{pago.label}</span>
                    </td>
                    <td style={{ ...tdSt, textAlign:'center', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', gap:'0.25rem', justifyContent:'center' }}>
                        {st.next && (
                          <button onClick={()=>onStatusChange(it,st.next)} title={st.nextLabel}
                            style={{ padding:'0.2rem 0.5rem', background:st.color, color:'white', border:'none', borderRadius:3, cursor:'pointer', fontSize:'0.65rem', fontWeight:700, fontFamily:'var(--font-body)' }}>
                            {st.nextLabel}
                          </button>
                        )}
                        <button onClick={()=>onEdit(it)} style={{ padding:'0.2rem 0.5rem', border:'1px solid var(--color-border)', borderRadius:3, background:'white', cursor:'pointer', fontSize:'0.75rem' }}>✏️</button>
                        {isAdmin && <button onClick={()=>onDelete(it)} style={{ padding:'0.2rem 0.5rem', border:'1px solid #fca5a5', borderRadius:3, background:'white', cursor:'pointer', fontSize:'0.75rem', color:'#c0392b' }}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr style={{ background:'#f5f0ff' }}>
                <td colSpan={7} style={{ padding:'0.55rem 0.75rem', fontSize:'0.78rem', fontWeight:700, color:BLOCK_COLOR }}>
                  TOTAL ({dayItems.length} servicios)
                </td>
                <td style={{ padding:'0.55rem 0.75rem', textAlign:'right', fontWeight:800, color:BLOCK_COLOR, fontSize:'0.9rem', whiteSpace:'nowrap' }}>
                  {fmtCOP(totalValor)}
                  {totalTransp>0 && <div style={{ fontSize:'0.68rem', color:'#2e5cbf' }}>+{fmtCOP(totalTransp)}</div>}
                </td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Photo uploader ────────────────────────────────────────────────────────────
function PhotoField({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const path = `grooming/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('grooming-photos').upload(path, file, { upsert:true });
    if (!error) {
      const { data } = supabase.storage.from('grooming-photos').getPublicUrl(path);
      onChange(data.publicUrl);
    } else {
      onChange(URL.createObjectURL(file));
    }
    setUploading(false);
  };

  return (
    <div style={{ marginBottom:'0.75rem' }}>
      <label style={labelSt}>{label}</label>
      {value ? (
        <div style={{ position:'relative', display:'inline-block' }}>
          <img src={value} alt={label} style={{ width:'100%', maxHeight:180, objectFit:'cover', borderRadius:'var(--radius-md)', border:'1px solid var(--color-border)' }} />
          <button onClick={()=>onChange(null)} style={{ position:'absolute', top:4, right:4, background:'rgba(0,0,0,0.5)', color:'white', border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', fontSize:'0.7rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
      ) : (
        <>
          <button type="button" onClick={()=>inputRef.current?.click()} disabled={uploading}
            style={{ width:'100%', padding:'0.75rem', border:'2px dashed var(--color-border)', borderRadius:'var(--radius-md)', background:'var(--color-bg)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.82rem', color:'var(--color-text-muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
            {uploading ? '⏳ Subiendo...' : '📷 Tomar / subir foto'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display:'none' }} />
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GroomingPage() {
  const { items, add, edit, remove, refresh } = useStore('grooming');
  const { items: clients }  = useStore('clients');
  const { items: patients } = useStore('patients');
  const { session } = useAuth();
  useSede();

  const isAdminUser = session?.rol === 'Administrador';
  const today       = new Date();
  const todayStr    = today.toISOString().split('T')[0];

  const [viewMode,    setViewMode]    = useState('week');
  const [anchor,      setAnchor]      = useState(todayStr);
  const [calYear,     setCalYear]     = useState(today.getFullYear());
  const [calMonth,    setCalMonth]    = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [sedeFilter,  setSedeFilter]  = useState(isAdminUser ? null : (session?.sede_id || null));
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState({});
  const [editId,      setEditId]      = useState(null);

  // ── Client/patient lookup ─────────────────────────────────────────────────
  const [cedula, setCedula] = useState('');

  const foundClient = useMemo(() => {
    if (!cedula.trim() || cedula.trim().length < 5) return null;
    return clients.find(c => String(c.document) === cedula.trim()) || null;
  }, [cedula, clients]);

  const clientPets = useMemo(() =>
    foundClient ? patients.filter(p => p.client_id === foundClient.id) : [],
    [foundClient, patients]);

  useEffect(() => {
    if (foundClient) {
      setForm(f => ({
        ...f,
        owner:       foundClient.name  || f.owner,
        owner_phone: foundClient.phone || f.owner_phone,
        direccion:   foundClient.address || f.direccion,
      }));
    }
  }, [foundClient]);

  const handlePetSelect = (petId) => {
    if (!petId) return;
    const pet = patients.find(p => p.id === parseInt(petId));
    if (pet) setForm(f => ({ ...f, patient_name: pet.name, breed: pet.breed || '' }));
  };

  // ── Filtered items ────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    sedeFilter === null ? items : items.filter(i => i.sede_id === sedeFilter),
    [items, sedeFilter]);

  const byDate = useMemo(() => {
    const map = {};
    filtered.forEach(i => { if(!map[i.date]) map[i.date]=[]; map[i.date].push(i); });
    Object.values(map).forEach(arr => arr.sort((a,b)=>(a.time||'').localeCompare(b.time||'')));
    return map;
  }, [filtered]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const nav = (dir) => {
    if (viewMode==='day')   setAnchor(a=>addDays(a,dir));
    if (viewMode==='week')  setAnchor(a=>addDays(a,dir*7));
    if (viewMode==='month') {
      let nm=calMonth+dir, ny=calYear;
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

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openAdd = (dateStr, timeStr) => {
    setForm({ ...mkForm(dateStr||anchor, timeStr||'09:00'), sede_id: session?.sede_id || null });
    setCedula('');
    setEditId(null);
    setModal(true);
  };

  const openEdit = (item) => {
    setForm({ ...item, services: Array.isArray(item.services)?item.services:(item.services?[item.services]:[]) });
    setCedula('');
    setEditId(item.id);
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.patient_name?.trim() || !form.date) { alert('Mascota y fecha son requeridos'); return; }
    const payload = {
      patient_name:     form.patient_name?.trim() || '',
      breed:            form.breed?.trim()         || null,
      owner:            form.owner?.trim()          || null,
      owner_phone:      form.owner_phone?.trim()    || null,
      services:         form.services               || [],
      date:             form.date                   || '',
      time:             form.time                   || null,
      time_end:         form.time_end               || null,
      notes:            form.notes?.trim()          || null,
      sede_id:          form.sede_id                || null,
      status:           form.status                 || 'pendiente',
      photo_before:     form.photo_before           || null,
      photo_after:      form.photo_after            || null,
      agendado_por:     form.agendado_por?.trim()   || null,
      valor_servicio:   form.valor_servicio  ? parseInt(form.valor_servicio)  : null,
      transporte:       !!form.transporte,
      valor_transporte: form.valor_transporte ? parseInt(form.valor_transporte) : null,
      direccion:        form.direccion?.trim()      || null,
      pago_estado:      form.pago_estado            || 'Pendiente',
    };
    if (editId) {
      edit(editId, payload);
      setModal(false);
    } else {
      const result = await add(payload, {
        onError: (msg) => alert('Error al guardar: ' + msg),
      });
      if (result !== null) {
        setModal(false);
        refresh();
      } else if (result === null) {
        alert('No se pudo guardar. Revisa la consola del navegador para más detalles.');
      }
    }
  };

  const handleDelete       = (item) => { if(confirm(`¿Eliminar servicio de ${item.patient_name}?`)) remove(item.id); };
  const handleStatusChange = (item, newStatus) => edit(item.id, { ...item, status: newStatus });
  const setF               = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleService      = (svc) => setForm(f => {
    const svcs = Array.isArray(f.services) ? f.services : [];
    return { ...f, services: svcs.includes(svc) ? svcs.filter(s=>s!==svc) : [...svcs, svc] };
  });

  const activeCount = filtered.filter(i=>['pendiente','en proceso'].includes(i.status)).length;
  const todayCount  = (byDate[todayStr]||[]).length;

  const viewBtn = (mode, label) => (
    <button onClick={()=>{ setViewMode(mode); if(mode==='day') setAnchor(anchor); }} style={{ padding:'0.35rem 0.9rem', border:'1px solid', borderColor:viewMode===mode?BLOCK_COLOR:'var(--color-border)', borderRadius:'var(--radius-sm)', background:viewMode===mode?BLOCK_COLOR:'var(--color-white)', color:viewMode===mode?'white':'var(--color-text-muted)', fontFamily:'var(--font-body)', fontSize:'0.78rem', fontWeight:600, cursor:'pointer' }}>
      {label}
    </button>
  );

  // ── Month view ─────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const firstDay=getFirstWeekday(calYear,calMonth);
    const dim=getDaysInMonth(calYear,calMonth);
    const cells=Array.from({length:Math.ceil((firstDay+dim)/7)*7},(_,i)=>{const n=i-firstDay+1;return(n>=1&&n<=dim)?n:null;});
    const dayItems = byDate[selectedDay]||[];
    const selD = new Date(selectedDay+'T12:00:00');

    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 330px', gap:'1.25rem', alignItems:'start' }}>
        <div style={{ background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-xl)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'2px solid var(--color-border)' }}>
            {DAYS_ES.map((d,i)=><div key={d} style={{padding:'0.6rem 0',textAlign:'center',fontSize:'0.68rem',fontWeight:700,color:i>=5?'var(--color-danger)':'var(--color-text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{d}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {cells.map((dayNum,idx)=>{
              const ds=dayNum?toStr(calYear,calMonth,dayNum):null;
              const isToday=ds===todayStr,isSel=ds===selectedDay,isWeekend=(idx%7)>=5;
              const its=ds?(byDate[ds]||[]):[];
              return (
                <div key={idx} onClick={()=>dayNum&&setSelectedDay(ds)}
                  style={{minHeight:80,padding:'0.35rem 0.4rem',borderRight:(idx%7)!==6?'1px solid var(--color-border)':'none',borderBottom:idx<cells.length-7?'1px solid var(--color-border)':'none',background:isSel?'#f5f0ff':isToday?'#faf7ff':'transparent',cursor:dayNum?'pointer':'default'}}
                  onMouseEnter={e=>{if(dayNum&&!isSel)e.currentTarget.style.background='#f8f5ff';}}
                  onMouseLeave={e=>{if(dayNum&&!isSel)e.currentTarget.style.background=isToday?'#faf7ff':'transparent';}}
                >
                  {dayNum&&<>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.2rem'}}>
                      <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:24,height:24,borderRadius:'50%',fontSize:'0.76rem',fontWeight:isToday?700:500,background:isToday?BLOCK_COLOR:'transparent',color:isToday?'white':isWeekend?'var(--color-danger)':'var(--color-text)'}}>
                        {dayNum}
                      </span>
                      <span onClick={e=>{e.stopPropagation();openAdd(ds);}} style={{fontSize:'0.85rem',color:'var(--color-border)',cursor:'pointer',opacity:0.5}}>+</span>
                    </div>
                    {its.slice(0,3).map((it,i)=>{const st=STATUS_CFG[it.status]||STATUS_CFG.pendiente;return <div key={it.id||i} style={{background:st.bg,color:st.color,borderRadius:3,padding:'1px 4px',fontSize:'0.6rem',fontWeight:600,marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>✂️ {it.patient_name}</div>;})}
                    {its.length>3&&<div style={{fontSize:'0.58rem',color:'var(--color-text-muted)',fontWeight:600}}>+{its.length-3} más</div>}
                  </>}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{background:'var(--color-white)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-xl)',overflow:'hidden',boxShadow:'var(--shadow-sm)',position:'sticky',top:'1rem'}}>
          <div style={{padding:'0.9rem 1.1rem',borderBottom:'1px solid var(--color-border)',background:selectedDay===todayStr?'#f5f0ff':'var(--color-bg)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontFamily:'var(--font-title)',fontWeight:700,fontSize:'0.9rem',color:BLOCK_COLOR}}>
                {selD.getDate()} de {MONTHS_ES[selD.getMonth()]}
                {selectedDay===todayStr&&<span style={{marginLeft:'0.5rem',background:BLOCK_COLOR,color:'white',padding:'1px 6px',borderRadius:999,fontSize:'0.6rem'}}>Hoy</span>}
              </div>
              <div style={{fontSize:'0.7rem',color:'var(--color-text-muted)',marginTop:'0.1rem'}}>{dayItems.length===0?'Sin servicios':`${dayItems.length} servicio${dayItems.length>1?'s':''}`}</div>
            </div>
            <button onClick={()=>openAdd(selectedDay)} style={{width:28,height:28,background:BLOCK_COLOR,color:'white',border:'none',borderRadius:'50%',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>
          </div>
          <div style={{padding:'0.65rem',maxHeight:'65vh',overflowY:'auto'}}>
            {dayItems.length===0?(
              <div style={{textAlign:'center',padding:'2rem 1rem',color:'var(--color-text-muted)'}}>
                <div style={{fontSize:'1.8rem',marginBottom:'0.4rem'}}>✂️</div>
                <p style={{fontSize:'0.75rem'}}>Sin servicios este día.</p>
              </div>
            ):dayItems.map(it=>{
              const st=STATUS_CFG[it.status]||STATUS_CFG.pendiente;
              const pago=PAGO_CFG[it.pago_estado]||PAGO_CFG['Pendiente'];
              const svcs=Array.isArray(it.services)?it.services:(it.services?[it.services]:[]);
              return (
                <div key={it.id} style={{border:'1px solid var(--color-border)',borderLeft:`3px solid ${st.color}`,borderRadius:'var(--radius-md)',padding:'0.65rem',marginBottom:'0.5rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.25rem'}}>
                    <span style={{fontFamily:'var(--font-title)',fontSize:'0.82rem',fontWeight:700,color:BLOCK_COLOR}}>{it.time||'—'}</span>
                    <div style={{display:'flex',gap:'0.3rem'}}>
                      <span style={{background:st.bg,color:st.color,padding:'1px 7px',borderRadius:999,fontSize:'0.62rem',fontWeight:600}}>{it.status}</span>
                      <span style={{background:pago.bg,color:pago.color,padding:'1px 7px',borderRadius:999,fontSize:'0.62rem',fontWeight:600}}>{pago.label}</span>
                    </div>
                  </div>
                  <div style={{fontWeight:700,fontSize:'0.82rem'}}>✂️ {it.patient_name}{it.breed?<span style={{fontWeight:400,color:'var(--color-text-muted)'}}> · {it.breed}</span>:''}</div>
                  {it.owner&&<div style={{fontSize:'0.7rem',color:'var(--color-text-muted)'}}>👤 {it.owner}{it.owner_phone?` · ${it.owner_phone}`:''}</div>}
                  {it.valor_servicio&&<div style={{fontSize:'0.72rem',fontWeight:700,color:BLOCK_COLOR,marginTop:'0.2rem'}}>{fmtCOP(it.valor_servicio)}{it.transporte&&it.valor_transporte?` + ${fmtCOP(it.valor_transporte)} transp.`:''}</div>}
                  <div style={{display:'flex',flexWrap:'wrap',gap:'0.25rem',marginTop:'0.3rem'}}>
                    {svcs.map(s=><span key={s} style={{background:'#f0ebff',color:BLOCK_COLOR,padding:'1px 6px',borderRadius:999,fontSize:'0.62rem',fontWeight:600}}>{s}</span>)}
                  </div>
                  <div style={{display:'flex',gap:'0.35rem',marginTop:'0.5rem',justifyContent:'space-between',alignItems:'center'}}>
                    {st.next&&<button onClick={()=>handleStatusChange(it,st.next)} style={{padding:'0.2rem 0.6rem',background:st.color,color:'white',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'0.67rem',fontWeight:700}}>{st.nextLabel}</button>}
                    <div style={{display:'flex',gap:'0.25rem',marginLeft:'auto'}}>
                      <button onClick={()=>openEdit(it)} style={{padding:'0.2rem 0.55rem',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',background:'white',cursor:'pointer',fontSize:'0.67rem'}}>✏️</button>
                      <button onClick={()=>handleDelete(it)} style={{padding:'0.2rem 0.55rem',border:'1px solid var(--color-danger)',borderRadius:'var(--radius-sm)',background:'white',cursor:'pointer',fontSize:'0.67rem',color:'var(--color-danger)'}}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const wkDays = weekDays(getMondayOf(anchor));

  return (
    <div>
      <div className="page-header" style={{marginBottom:'1rem'}}>
        <h1>✂️ Peluquería</h1>
        <p>{activeCount} servicios activos · {todayCount} hoy</p>
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:'0.75rem',alignItems:'center',flexWrap:'wrap',marginBottom:'1rem',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:'0.68rem',fontWeight:700,color:'var(--color-text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Sede:</span>
          {isAdminUser&&<button onClick={()=>setSedeFilter(null)} style={{padding:'0.28rem 0.75rem',borderRadius:999,fontSize:'0.72rem',fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:sedeFilter===null?BLOCK_COLOR:'var(--color-border)',background:sedeFilter===null?BLOCK_COLOR:'var(--color-white)',color:sedeFilter===null?'white':'var(--color-text-muted)'}}>Todas</button>}
          {SEDES.map(s=>{const active=sedeFilter===s.id;return <button key={s.id} onClick={()=>isAdminUser?setSedeFilter(active?null:s.id):undefined} style={{padding:'0.28rem 0.75rem',borderRadius:999,fontSize:'0.72rem',fontWeight:600,cursor:isAdminUser?'pointer':'default',border:`1px solid ${active?s.color:'var(--color-border)'}`,background:active?s.color:s.bg,color:active?'white':s.color,opacity:(!isAdminUser&&session?.sede_id!==s.id)?0.4:1}}>📍 {s.nombre}</button>;})}
        </div>
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
          {viewMode !== 'day' && (
            <button onClick={()=>openAdd(viewMode==='week'?anchor:todayStr)} style={{padding:'0.38rem 1rem',background:BLOCK_COLOR,color:'white',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'0.82rem',fontWeight:700}}>
              + Nuevo servicio
            </button>
          )}
        </div>
      </div>

      {/* Views */}
      {viewMode==='week'  && <TimeGrid days={wkDays} byDate={byDate} todayStr={todayStr} isAdmin={isAdminUser} onCellClick={openAdd} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange}/>}
      {viewMode==='day'   && <DayTableView dayStr={anchor} dayItems={byDate[anchor]||[]} isAdmin={isAdminUser} onAdd={()=>openAdd(anchor)} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange}/>}
      {viewMode==='month' && renderMonthView()}

      {/* Modal */}
      <Modal isOpen={modal} onClose={()=>setModal(false)} title={editId?'Editar Servicio':'✂️ Nuevo Servicio de Peluquería'} onSave={handleSave} size="md">

        {/* ── Sección 1: Buscar cliente (solo al crear) ── */}
        {!editId && (
          <div style={{ background:'#f0f7f7', border:'1px solid #99b2aa', borderRadius:'var(--radius-md)', padding:'0.9rem 1rem', marginBottom:'1.25rem' }}>
            <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#316d74', marginBottom:'0.5rem' }}>
              🔍 Buscar cliente por cédula
            </label>
            <input
              type="text"
              value={cedula}
              onChange={e => setCedula(e.target.value)}
              placeholder="Ingresa el número de cédula..."
              style={{ ...inputSt, borderColor: foundClient ? '#2e7d50' : 'var(--color-border)' }}
            />
            {cedula.trim().length >= 5 && foundClient && (
              <div style={{ marginTop:'0.6rem' }}>
                <div style={{ fontSize:'0.78rem', color:'#2e7d50', fontWeight:600, marginBottom:'0.4rem' }}>
                  ✓ {foundClient.name}{foundClient.phone ? ` · ${foundClient.phone}` : ''}
                </div>
                <select
                  onChange={e => handlePetSelect(e.target.value)}
                  style={{ ...inputSt, fontWeight:500 }}
                  defaultValue=""
                >
                  <option value="">— Selecciona la mascota —</option>
                  {clientPets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.breed ? ` (${p.breed})` : ''}</option>
                  ))}
                </select>
                {clientPets.length === 0 && (
                  <div style={{ fontSize:'0.72rem', color:'#b8860b', marginTop:'0.3rem' }}>
                    ⚠️ Este cliente no tiene mascotas registradas.
                  </div>
                )}
              </div>
            )}
            {cedula.trim().length >= 7 && !foundClient && (
              <div style={{ fontSize:'0.72rem', color:'#c0392b', marginTop:'0.4rem' }}>
                ✗ No encontrado. Crea el cliente primero en <strong>Clientes</strong>.
              </div>
            )}
          </div>
        )}

        {/* ── Sección 2: Datos del paciente ── */}
        <div className="grid-2">
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Mascota *</label>
            <input style={inputSt} value={form.patient_name||''} onChange={e=>setF('patient_name',e.target.value)} placeholder="Nombre de la mascota" />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Raza</label>
            <input style={inputSt} value={form.breed||''} onChange={e=>setF('breed',e.target.value)} placeholder="Raza" />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Propietario</label>
            <input style={inputSt} value={form.owner||''} onChange={e=>setF('owner',e.target.value)} placeholder="Nombre del tutor" />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}># Contacto</label>
            <input style={inputSt} value={form.owner_phone||''} onChange={e=>setF('owner_phone',e.target.value)} placeholder="Teléfono" />
          </div>
        </div>

        {/* ── Sección 3: Datos de la cita ── */}
        <div className="grid-2">
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Fecha *</label>
            <input type="date" style={inputSt} value={form.date||''} onChange={e=>setF('date',e.target.value)} />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Hora inicio</label>
            <input type="time" style={inputSt} value={form.time||''} onChange={e=>{ setF('time',e.target.value); setForm(f=>({...f,time:e.target.value,time_end:addMins(e.target.value,60)})); }} />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Hora fin</label>
            <input type="time" style={inputSt} value={form.time_end||''} onChange={e=>setF('time_end',e.target.value)} />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Agenda (quien atiende)</label>
            <input style={inputSt} value={form.agendado_por||''} onChange={e=>setF('agendado_por',e.target.value)} placeholder="ej: Marcela, Sergio..." />
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Sede</label>
            <select style={inputSt} value={form.sede_id||''} onChange={e=>setF('sede_id',e.target.value?parseInt(e.target.value):null)}>
              <option value="">— Sin sede —</option>
              {SEDES.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'0.75rem'}}>
            <label style={labelSt}>Estado</label>
            <select style={inputSt} value={form.status||'pendiente'} onChange={e=>setF('status',e.target.value)}>
              {Object.keys(STATUS_CFG).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* ── Sección 4: Servicio y valor ── */}
        <div style={{marginBottom:'1rem'}}>
          <label style={labelSt}>Servicios</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',marginTop:'0.35rem'}}>
            {GROOMING_SERVICES.map(svc => {
              const selected = Array.isArray(form.services) && form.services.includes(svc);
              return (
                <button key={svc} type="button" onClick={()=>toggleService(svc)}
                  style={{padding:'0.35rem 0.85rem',borderRadius:999,fontSize:'0.78rem',fontWeight:600,cursor:'pointer',border:`1px solid ${selected?BLOCK_COLOR:'var(--color-border)'}`,background:selected?BLOCK_COLOR:'var(--color-white)',color:selected?'white':BLOCK_COLOR}}>
                  {selected?'✓ ':''}{svc}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{marginBottom:'1rem'}}>
          <label style={labelSt}>Valor del servicio ($)</label>
          <input type="number" style={inputSt} value={form.valor_servicio||''} onChange={e=>setF('valor_servicio',e.target.value)} placeholder="ej: 65000" />
        </div>

        {/* ── Sección 5: Transporte ── */}
        <div style={{ background:'#f0f4ff', border:'1px solid #c5d3f5', borderRadius:'var(--radius-md)', padding:'0.85rem 1rem', marginBottom:'1rem' }}>
          <label style={{ display:'flex', alignItems:'center', gap:'0.6rem', cursor:'pointer', fontWeight:600, fontSize:'0.875rem' }}>
            <input type="checkbox" checked={!!form.transporte} onChange={e=>setF('transporte',e.target.checked)} style={{ width:16, height:16, accentColor:'#2e5cbf' }} />
            🚗 Incluye transporte
          </label>
          {form.transporte && (
            <div className="grid-2" style={{marginTop:'0.75rem'}}>
              <div>
                <label style={labelSt}>Valor transporte ($)</label>
                <input type="number" style={inputSt} value={form.valor_transporte||''} onChange={e=>setF('valor_transporte',e.target.value)} placeholder="ej: 18000" />
              </div>
              <div>
                <label style={labelSt}>Dirección recogida</label>
                <input style={inputSt} value={form.direccion||''} onChange={e=>setF('direccion',e.target.value)} placeholder="Dirección..." />
              </div>
            </div>
          )}
        </div>
        {!form.transporte && (
          <div style={{marginBottom:'1rem'}}>
            <label style={labelSt}>Dirección</label>
            <input style={inputSt} value={form.direccion||''} onChange={e=>setF('direccion',e.target.value)} placeholder="Dirección del cliente" />
          </div>
        )}

        {/* ── Sección 6: Pago ── */}
        <div style={{marginBottom:'1rem'}}>
          <label style={labelSt}>Estado de pago</label>
          <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',marginTop:'0.35rem'}}>
            {PAGO_OPTS.map(opt => {
              const cfg = PAGO_CFG[opt];
              const active = form.pago_estado === opt;
              return (
                <button key={opt} type="button" onClick={()=>setF('pago_estado',opt)}
                  style={{padding:'0.35rem 1rem',borderRadius:999,fontSize:'0.78rem',fontWeight:700,cursor:'pointer',border:`1px solid ${cfg.color}`,background:active?cfg.color:cfg.bg,color:active?'white':cfg.color}}>
                  {active?'✓ ':''}{opt === 'Pagado' ? 'PAGO' : opt === 'Quedo debiendo' ? 'QUEDO DEBIENDO' : 'PENDIENTE'}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Sección 7: Fotos y notas ── */}
        <div style={{marginBottom:'1rem'}}>
          <label style={labelSt}>Notas</label>
          <textarea style={{...inputSt,resize:'vertical'}} rows={2} value={form.notes||''} onChange={e=>setF('notes',e.target.value)} placeholder="Indicaciones especiales..." />
        </div>
        <div className="grid-2">
          <PhotoField label="📷 Foto ANTES" value={form.photo_before||null} onChange={v=>setF('photo_before',v)} />
          <PhotoField label="📷 Foto DESPUÉS" value={form.photo_after||null} onChange={v=>setF('photo_after',v)} />
        </div>
      </Modal>
    </div>
  );
}
