import { useState, useMemo } from 'react';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES } from '../utils/useSede';
import { nowDate, localDateStr } from '../utils/nowLocal';

// ── Grid ─────────────────────────────────────────────────────────────────────
const START_HOUR = 13;
const END_HOUR   = 21;
const ROW_H      = 56;
const HOURS      = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS_ES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES      = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DAYS_FULL    = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

function pad2(n) { return String(n).padStart(2, '0'); }
function addDays(ds, n) { const d = new Date(ds + 'T12:00:00'); d.setDate(d.getDate() + n); return localDateStr(d); }
function getMondayOf(ds) { const d = new Date(ds + 'T12:00:00'); const wd = d.getDay(); return addDays(ds, wd === 0 ? -6 : 1 - wd); }
function weekDays(mon) { return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); }
function timeToMins(t) { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function minsToTop(mins) { return ((mins - START_HOUR * 60) / 60) * ROW_H; }
function addMins(t, n) { const [h, m] = t.split(':').map(Number); const tot = h * 60 + m + n; return `${pad2(Math.floor(tot / 60) % 24)}:${pad2(tot % 60)}`; }
function fmtDay(ds) { const d = new Date(ds + 'T12:00'); return `${DAYS_ES[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()}`; }
function fmtFull(ds) { const d = new Date(ds + 'T12:00'); return `${DAYS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`; }
function fmt12h(t) { if (!t) return '—'; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`; }

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pendiente:  { bg: '#fff8e1', color: '#b8860b', label: 'Pendiente'  },
  completada: { bg: '#e8f5ee', color: '#2e7d50', label: 'Completada' },
  cancelada:  { bg: '#fdecea', color: '#c0392b', label: 'Cancelada'  },
};

const mkForm = (date, time) => ({
  patient_name: '', owner: '', owner_phone: '',
  date: date || '', time: time || '13:00',
  time_end: addMins(time || '13:00', 60),
  sede_id: null, notas: '', status: 'pendiente', despues_9pm: false,
});

const labelSt = { display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text)' };
const inputSt = { width: '100%', padding: '0.55rem 0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box' };

// ── Overlap layout: assign side-by-side columns to visits that share a time slot ──
const DEFAULT_VISIT_MINS = 20;   // duración asumida cuando no hay hora de salida (ej. agendadas desde el portal)

function computeDayLayout(items) {
  const withTimes = items
    .filter(v => !v.despues_9pm && v.time)
    .map(v => {
      const s = timeToMins(v.time);
      const e = Math.max(v.time_end ? timeToMins(v.time_end) : s + DEFAULT_VISIT_MINS, s + 15);
      return { ...v, _s: s, _e: e };
    })
    .sort((a, b) => a._s - b._s);

  const result = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (!cluster.length) return;
    const columns = [];   // end time of last item placed in each column
    cluster.forEach(v => {
      let idx = columns.findIndex(end => end <= v._s);
      if (idx === -1) { idx = columns.length; columns.push(v._e); }
      else columns[idx] = v._e;
      result.push({ ...v, _col: idx, _totalCols: 0 });
    });
    const totalCols = columns.length;
    for (let i = result.length - cluster.length; i < result.length; i++) result[i]._totalCols = totalCols;
    cluster = [];
  };

  withTimes.forEach(v => {
    if (cluster.length === 0 || v._s < clusterEnd) {
      cluster.push(v);
      clusterEnd = Math.max(clusterEnd, v._e);
    } else {
      flushCluster();
      cluster.push(v);
      clusterEnd = v._e;
    }
  });
  flushCluster();

  return result;
}

// ── Visit block in grid ───────────────────────────────────────────────────────
function VisitBlock({ item, onEdit, col = 0, totalCols = 1 }) {
  if (item.despues_9pm) return null;   // shown separately, not in time grid
  const startMins = timeToMins(item.time);
  if (startMins === null) return null;
  const endMins  = item.time_end ? timeToMins(item.time_end) : startMins + DEFAULT_VISIT_MINS;
  const duration = Math.max(15, endMins - startMins);
  const top      = minsToTop(startMins);
  const height   = (duration / 60) * ROW_H - 2;
  const st       = STATUS_CFG[item.status] || STATUS_CFG.pendiente;
  const gap      = 2;
  const leftPct  = (col / totalCols) * 100;
  const widthPct = 100 / totalCols;

  return (
    <div
      onClick={() => onEdit(item)}
      title={`${item.patient_name} — ${item.owner}`}
      style={{
        position: 'absolute',
        left: `calc(${leftPct}% + ${gap}px)`,
        width: `calc(${widthPct}% - ${gap * 2}px)`,
        top, height: Math.max(height, 18),
        background: st.bg, border: `1.5px solid ${st.color}`,
        borderLeft: `4px solid ${st.color}`,
        borderRadius: 6, padding: '2px 5px',
        overflow: 'hidden', cursor: 'pointer',
        fontSize: totalCols > 1 ? '0.64rem' : '0.72rem', lineHeight: 1.25,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'opacity 0.15s',
        zIndex: 1,
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      <div style={{ fontWeight: 700, color: st.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        🏥 {item.patient_name}
      </div>
      {height > 30 && (
        <div style={{ color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.owner}
        </div>
      )}
      {height > 44 && (
        <div style={{ color: '#888' }}>{fmt12h(item.time)} – {fmt12h(item.time_end)}</div>
      )}
    </div>
  );
}

export default function VisitasPage() {
  const { session } = useAuth();
  const { sedeId }  = useSede();

  const { items: visitas, add, edit, remove } = useStore('visitas_hospitalizacion');

  const [today]      = useState(nowDate());
  const [weekStart,  setWeekStart]  = useState(getMondayOf(nowDate()));
  const [view,       setView]       = useState('week');  // 'week' | 'day'
  const [dayDate,    setDayDate]    = useState(nowDate());
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(mkForm('', ''));
  const [saving,     setSaving]     = useState(false);
  const [filterSede, setFilterSede] = useState(sedeId || 'all');

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const filtered = useMemo(() =>
    visitas.filter(v =>
      filterSede === 'all' || Number(v.sede_id) === Number(filterSede)
    ), [visitas, filterSede]);

  const forDay = (ds) => filtered.filter(v => v.date === ds);
  const forDayView = forDay(dayDate);

  const openNew = (date, time) => {
    setEditing(null);
    setForm(mkForm(date, time));
    setModal(true);
  };

  const openNewNight = (date) => {
    setEditing(null);
    setForm({ ...mkForm(date, ''), time: '', time_end: '', despues_9pm: true });
    setModal(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({ ...v });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.patient_name.trim() || !form.owner.trim() || !form.date) {
      return alert('Completa paciente, tutor y fecha.');
    }
    if (!form.despues_9pm && !form.time) {
      return alert('Completa la hora de entrada o marca "Después de 9pm".');
    }
    setSaving(true);
    const payload = { ...form, sede_id: Number(form.sede_id) || null, agendado_por: session?.nombre || null };
    if (editing) {
      await edit(editing.id, payload);
    } else {
      await add({ ...payload, created_at: nowDate() });
    }
    setSaving(false);
    setModal(false);
  };

  const handleDelete = () => {
    if (!editing) return;
    if (!confirm(`¿Eliminar visita de ${editing.owner}?`)) return;
    remove(editing.id);
    setModal(false);
  };

  const handleStatusChange = async (v, newStatus) => {
    await edit(v.id, { status: newStatus });
  };

  const f = (k, val) => setForm(p => ({ ...p, [k]: val }));

  // Month label
  const firstDay = new Date(days[0] + 'T12:00');
  const lastDay  = new Date(days[6] + 'T12:00');
  const monthLabel = firstDay.getMonth() === lastDay.getMonth()
    ? `${MONTHS_ES[firstDay.getMonth()]} ${firstDay.getFullYear()}`
    : `${MONTHS_ES[firstDay.getMonth()]} – ${MONTHS_ES[lastDay.getMonth()]} ${lastDay.getFullYear()}`;

  // ── Grid cell click ───────────────────────────────────────────────────────
  const handleCellClick = (ds, hour) => {
    openNew(ds, `${pad2(hour)}:00`);
  };

  const gridStyle = { position: 'relative', display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderTop: '1px solid var(--color-border)' };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'var(--font-body)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>🏥 Visitas de Hospitalización</h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Registro de visitas de tutores a pacientes hospitalizados</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterSede} onChange={e => setFilterSede(e.target.value)}
            style={{ ...inputSt, width: 'auto', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}>
            <option value="all">Todas las sedes</option>
            {SEDES.filter(s => s.id !== 4).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <button onClick={() => { setWeekStart(getMondayOf(today)); setView('week'); }}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Hoy
          </button>
          <button onClick={() => openNew(today, '10:00')}
            style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
            + Nueva visita
          </button>
        </div>
      </div>

      {/* ── Week nav ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-primary)' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', minWidth: 220, textAlign: 'center' }}>{monthLabel}</span>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))}  style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-primary)' }}>›</button>
      </div>

      {/* ── Week grid ── */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '2px solid var(--color-border)' }}>
          <div style={{ borderRight: '1px solid var(--color-border)' }} />
          {days.map(ds => {
            const isToday   = ds === today;
            const dayAll    = forDay(ds);
            const count     = dayAll.length;
            const count9pm  = dayAll.filter(v => v.despues_9pm).length;
            return (
              <div key={ds}
                onClick={() => { setDayDate(ds); setView('day'); }}
                style={{ padding: '0.6rem 0.4rem', textAlign: 'center', cursor: 'pointer', borderRight: '1px solid var(--color-border)', background: isToday ? '#e8f5f6' : 'white', transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = '#f7fafa'; }}
                onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = 'white'; }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{fmtDay(ds).split(' ')[0]}</div>
                <div style={{ fontWeight: isToday ? 900 : 700, fontSize: '1rem', color: isToday ? 'var(--color-primary)' : 'var(--color-text)' }}>{fmtDay(ds).split(' ')[1]}</div>
                {count > 0 && <div style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 700 }}>{count} visita{count !== 1 ? 's' : ''}</div>}
                {count9pm > 0 && <div style={{ fontSize: '0.6rem', color: '#7c3aed', fontWeight: 700 }}>🌙 {count9pm} nocturna{count9pm !== 1 ? 's' : ''}</div>}
              </div>
            );
          })}
        </div>

        {/* Time rows */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
          <div style={gridStyle}>
            {/* Hour labels */}
            <div style={{ gridColumn: '1', gridRow: `1 / ${HOURS.length + 1}`, borderRight: '1px solid var(--color-border)' }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: ROW_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 4, fontSize: '0.65rem', color: 'var(--color-text-muted)', borderBottom: '1px solid #f0f0f0' }}>
                  {pad2(h)}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((ds, di) => {
              const dayVisitas = forDay(ds);
              const isToday    = ds === today;
              return (
                <div key={ds} style={{ gridColumn: di + 2, gridRow: `1 / ${HOURS.length + 1}`, position: 'relative', borderRight: '1px solid var(--color-border)', background: isToday ? '#fafffe' : 'white' }}>
                  {HOURS.map(h => (
                    <div key={h}
                      onClick={() => handleCellClick(ds, h)}
                      style={{ height: ROW_H, borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0fafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    />
                  ))}
                  {computeDayLayout(dayVisitas).map(v => (
                    <VisitBlock key={v.id} item={v} onEdit={openEdit} col={v._col} totalCols={v._totalCols} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Franja nocturna: 9:00 PM – 11:00 PM (sin hora exacta) */}
        <div style={{ borderTop: '2px solid var(--color-border)', background: '#faf8ff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            <div style={{ padding: '0.4rem 4px', borderRight: '1px solid var(--color-border)', fontSize: '0.56rem', color: '#7c3aed', fontWeight: 700, textAlign: 'right', lineHeight: 1.25 }}>
              🌙<br/>9–11PM
            </div>
            {days.map(ds => {
              const night = forDay(ds).filter(v => v.despues_9pm);
              return (
                <div key={ds}
                  onClick={() => openNewNight(ds)}
                  title="Agregar visita nocturna (sin hora exacta)"
                  style={{ borderRight: '1px solid var(--color-border)', padding: '4px', minHeight: 44, display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0ebff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {night.map(v => (
                    <div key={v.id}
                      onClick={e => { e.stopPropagation(); openEdit(v); }}
                      title={`${v.patient_name} — ${v.owner}`}
                      style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderLeft: '3px solid #7c3aed', borderRadius: 6, padding: '2px 6px', fontSize: '0.68rem', color: '#5b21b6', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🌙 {v.patient_name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Day view list (below grid, collapsible) ── */}
      {view === 'day' && (
        <div style={{ marginTop: '1.25rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
              📋 Visitas del {fmtFull(dayDate)}
            </h3>
            <button onClick={() => setView('week')} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cerrar ✕</button>
          </div>
          {forDayView.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>No hay visitas agendadas para este día.</p>
          ) : (() => {
            const timed  = [...forDayView].filter(v => !v.despues_9pm).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            const night  = [...forDayView].filter(v => v.despues_9pm);
            const VisitRow = (v) => {
              const st = STATUS_CFG[v.status] || STATUS_CFG.pendiente;
              return (
                <div key={v.id} style={{ border: '1px solid var(--color-border)', borderLeft: `5px solid ${st.color}`, borderRadius: 8, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>🏥 {v.patient_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{v.owner}{v.owner_phone ? ` · ${v.owner_phone}` : ''}</div>
                    {!v.despues_9pm && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{fmt12h(v.time)}{v.time_end ? ` – ${fmt12h(v.time_end)}` : ''}</div>}
                    {v.despues_9pm  && <div style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 600, marginTop: 2 }}>🌙 Llega después de las 9:00 PM</div>}
                    {v.notas && <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 2, fontStyle: 'italic' }}>📝 {v.notas}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span>
                    {v.status === 'pendiente' && (
                      <button onClick={() => handleStatusChange(v, 'completada')}
                        style={{ fontSize: '0.72rem', padding: '3px 8px', background: '#e8f5ee', color: '#2e7d50', border: '1px solid #2e7d50', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>
                        ✓ Completar
                      </button>
                    )}
                    <button onClick={() => openEdit(v)}
                      style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, cursor: 'pointer' }}>
                      Editar
                    </button>
                  </div>
                </div>
              );
            };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {timed.map(v => VisitRow(v))}
                {night.length > 0 && (
                  <>
                    <div style={{ marginTop: timed.length ? '0.5rem' : 0, padding: '0.4rem 0.75rem', background: '#f5f3ff', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, color: '#7c3aed' }}>
                      🌙 Visitas después de 9:00 PM ({night.length})
                    </div>
                    {night.map(v => VisitRow(v))}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.18)', width: '100%', maxWidth: 500, padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
              {editing ? '✏️ Editar visita' : '🏥 Nueva visita de hospitalización'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelSt}>Paciente hospitalizado *</label>
                <input style={inputSt} value={form.patient_name} onChange={e => f('patient_name', e.target.value)} placeholder="Nombre del paciente" />
              </div>
              <div>
                <label style={labelSt}>Tutor / Visitante *</label>
                <input style={inputSt} value={form.owner} onChange={e => f('owner', e.target.value)} placeholder="Nombre del tutor" />
              </div>
              <div>
                <label style={labelSt}>Teléfono</label>
                <input style={inputSt} value={form.owner_phone} onChange={e => f('owner_phone', e.target.value)} placeholder="3XX XXX XXXX" />
              </div>
              <div>
                <label style={labelSt}>Sede</label>
                <select style={inputSt} value={form.sede_id || ''} onChange={e => f('sede_id', e.target.value)}>
                  <option value="">Seleccionar</option>
                  {SEDES.filter(s => s.id !== 4).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Fecha *</label>
                <input type="date" style={inputSt} value={form.date} onChange={e => f('date', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: form.despues_9pm ? 700 : 400, color: form.despues_9pm ? '#7c3aed' : 'var(--color-text)', userSelect: 'none' }}>
                  <input type="checkbox" checked={!!form.despues_9pm} onChange={e => f('despues_9pm', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#7c3aed', cursor: 'pointer' }} />
                  🌙 Llegará después de las 9:00 PM (sin hora exacta)
                </label>
              </div>
              {!form.despues_9pm && (
                <>
                  <div>
                    <label style={labelSt}>Hora entrada *</label>
                    <input type="time" style={inputSt} value={form.time} onChange={e => f('time', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelSt}>Hora salida</label>
                    <input type="time" style={inputSt} value={form.time_end} onChange={e => f('time_end', e.target.value)} />
                  </div>
                </>
              )}
              {editing && (
                <div>
                  <label style={labelSt}>Estado</label>
                  <select style={inputSt} value={form.status} onChange={e => f('status', e.target.value)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              )}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelSt}>Notas</label>
                <textarea style={{ ...inputSt, height: 72, resize: 'vertical' }} value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Observaciones de la visita..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              {editing && (
                <button onClick={handleDelete}
                  style={{ padding: '0.55rem 1rem', fontSize: '0.82rem', background: '#fdecea', color: '#c0392b', border: '1px solid #c0392b', borderRadius: 8, cursor: 'pointer', fontWeight: 700, marginRight: 'auto' }}>
                  Eliminar
                </button>
              )}
              <button onClick={() => setModal(false)}
                style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '0.55rem 1.4rem', fontSize: '0.82rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 8, cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar visita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
