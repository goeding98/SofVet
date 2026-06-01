import { useState, useMemo } from 'react';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';

// ── Constants ─────────────────────────────────────────────────────────────────
const METRICS = [
  { key: 'consultas',      store: 'consultations',        dateField: 'created_at',       label: 'Consultas',      icon: '🩺', color: '#2e5cbf' },
  { key: 'hospitalizados', store: 'hospitalization',      dateField: 'ingreso_date',     label: 'Hospitalizados', icon: '🏥', color: '#dc2626' },
  { key: 'laboratorios',   store: 'laboratorios_pedidos', dateField: 'fecha_solicitado', label: 'Laboratorios',   icon: '🧪', color: '#16a34a' },
  { key: 'imagenes',       store: 'imagenesPedidos',      dateField: 'fecha_solicitado', label: 'Imagenología',   icon: '🔬', color: '#7c3aed' },
  { key: 'vacunas',        store: 'vaccines',             dateField: 'date_applied',     label: 'Vacunas',        icon: '💉', color: '#d97706' },
  { key: 'grooming',       store: 'grooming',             dateField: 'date',             label: 'Grooming',       icon: '✂️', color: '#0891b2' },
  { key: 'procedimientos', store: 'procedimientos',       dateField: 'fecha',            label: 'Procedimientos', icon: '🔧', color: '#9333ea' },
  { key: 'formulas',       store: 'formulas_medicas',     dateField: 'fecha',            label: 'Fórmulas',       icon: '💊', color: '#64748b' },
];

const SEDES = [
  { id: 1, nombre: 'Santa Mónica', color: '#2e5cbf' },
  { id: 2, nombre: 'Colseguros',   color: '#2e7d50' },
  { id: 3, nombre: 'Cdad. Jardín', color: '#b8860b' },
  { id: 4, nombre: 'Domicilio',    color: '#7c5cbf' },
];

const SEDES_CON_UNKNOWN = [...SEDES, { id: 0, nombre: 'Sin sede', color: '#d1d5db' }];

const PERIODOS = [
  { key: 'hoy',    label: 'Hoy'           },
  { key: 'semana', label: 'Esta semana'   },
  { key: 'mes',    label: 'Este mes'      },
  { key: 'rango',  label: 'Personalizado' },
];

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Months of 2026 up to current month (computed once at module load)
const _nowForMonths = new Date();
const _curMonth = _nowForMonths.getFullYear() === 2026
  ? _nowForMonths.getMonth() + 1
  : _nowForMonths.getFullYear() < 2026 ? 0 : 12;
const MONTHS_2026 = Array.from({ length: _curMonth }, (_, i) =>
  `2026-${String(i + 1).padStart(2, '0')}`
);

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }

function getRange(periodo, desde, hasta) {
  const today = todayStr();
  let start, end;
  if (periodo === 'hoy') {
    start = end = today;
  } else if (periodo === 'semana') {
    const d = new Date(); d.setDate(d.getDate() - 6);
    start = d.toISOString().slice(0, 10); end = today;
  } else if (periodo === 'mes') {
    const d = new Date(); d.setDate(1);
    start = d.toISOString().slice(0, 10); end = today;
  } else {
    start = desde || today; end = hasta || today;
  }
  const days = [];
  const cur = new Date(start + 'T12:00:00');
  const endD = new Date(end + 'T12:00:00');
  while (cur <= endD) { days.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return { start, end, days };
}

function dayLabel(dateStr, totalDays) {
  const d = new Date(dateStr + 'T12:00:00');
  if (totalDays === 1) return 'Hoy';
  if (totalDays <= 14) return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()] + ' ' + d.getDate();
  return String(d.getDate());
}

// Returns { [day]: { total, bySede: { sedeId: count } } }
function computeDayData(items, dateField, start, end, sedeFilter) {
  const map = {};
  for (const item of items) {
    if (sedeFilter && item.sede_id !== sedeFilter) continue;
    const d = (item[dateField] || '').slice(0, 10);
    if (!d || d < start || d > end) continue;
    if (!map[d]) map[d] = { total: 0, bySede: {} };
    map[d].total++;
    const s = item.sede_id != null ? item.sede_id : 0;
    map[d].bySede[s] = (map[d].bySede[s] || 0) + 1;
  }
  return map;
}

// Returns { [YYYY-MM]: { total, bySede: { sedeId: count } } } — only 2026 up to current month
function computeMonthData(items, dateField, sedeFilter) {
  const map = {};
  for (const item of items) {
    if (sedeFilter && item.sede_id !== sedeFilter) continue;
    const dateStr = (item[dateField] || '').slice(0, 10);
    if (!dateStr || !dateStr.startsWith('2026-')) continue;
    const month = dateStr.slice(0, 7);
    if (!MONTHS_2026.includes(month)) continue;
    if (!map[month]) map[month] = { total: 0, bySede: {} };
    map[month].total++;
    const s = item.sede_id != null ? item.sede_id : 0;
    map[month].bySede[s] = (map[month].bySede[s] || 0) + 1;
  }
  return map;
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ days, activeMetrics, data, sedeFilter, labelFn }) {
  const PAD_L = 38, PAD_B = 32, PAD_T = 12, H = 270;
  const BAR_W = Math.max(6, Math.min(22, Math.floor(580 / days.length / activeMetrics.length) - 2));
  const GROUP_W = activeMetrics.length * (BAR_W + 2) + 10;
  const W = Math.max(600, days.length * GROUP_W + PAD_L + 20);
  const chartH = H - PAD_T - PAD_B;

  const maxVal = Math.max(1, ...activeMetrics.flatMap(m =>
    days.map(d => data[m]?.[d]?.total || 0)
  ));

  const yTicks = [];
  const step = Math.max(1, Math.ceil(maxVal / 4));
  for (let v = 0; v <= maxVal; v += step) yTicks.push(v);
  if (yTicks[yTicks.length - 1] !== maxVal) yTicks.push(maxVal);

  const isStacked = !sedeFilter;

  return (
    <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
        {yTicks.map(v => {
          const y = PAD_T + chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line x1={PAD_L} y1={y} x2={W - 10} y2={y} stroke="#f0f0f0" strokeWidth={1} />
              <text x={PAD_L - 5} y={y + 3.5} textAnchor="end" fontSize={9} fill="#9ca3af">{v}</text>
            </g>
          );
        })}

        {days.map((day, di) => {
          const centerX = PAD_L + di * GROUP_W + GROUP_W / 2;
          const offsetStart = -(activeMetrics.length * (BAR_W + 2)) / 2 + 1;

          return (
            <g key={day}>
              {activeMetrics.map((mKey, mi) => {
                const m = METRICS.find(x => x.key === mKey);
                const dayData = data[mKey]?.[day] || { total: 0, bySede: {} };
                const total = dayData.total;
                const bX = centerX + offsetStart + mi * (BAR_W + 2);
                const totalH = (total / maxVal) * chartH;
                const baseY = PAD_T + chartH;

                if (!total) return null;

                if (isStacked) {
                  let stackedH = 0;
                  const segments = SEDES_CON_UNKNOWN.map(sede => {
                    const cnt = dayData.bySede[sede.id] || 0;
                    if (!cnt) return null;
                    const segH = (cnt / maxVal) * chartH;
                    const segY = baseY - stackedH - segH;
                    stackedH += segH;
                    return { segY, segH, color: sede.color, cnt };
                  }).filter(Boolean);

                  if (segments.length === 0) {
                    const bH = Math.max(1, (total / maxVal) * chartH);
                    const bY = baseY - bH;
                    return (
                      <g key={mKey}>
                        <rect x={bX} y={bY} width={BAR_W} height={bH} fill={m.color} rx={2} opacity={0.6} />
                        {BAR_W >= 8 && (
                          <text x={bX + BAR_W / 2} y={bY - 2} textAnchor="middle" fontSize={8} fill={m.color} fontWeight={700}>{total}</text>
                        )}
                      </g>
                    );
                  }

                  return (
                    <g key={mKey}>
                      {segments.map((seg, si) => (
                        <rect key={si} x={bX} y={seg.segY} width={BAR_W} height={seg.segH}
                          fill={seg.color} rx={si === segments.length - 1 ? 2 : 0} />
                      ))}
                      {BAR_W >= 8 && (
                        <text x={bX + BAR_W / 2} y={baseY - totalH - 2}
                          textAnchor="middle" fontSize={8} fill="#374151" fontWeight={700}>{total}</text>
                      )}
                    </g>
                  );
                } else {
                  const bH = Math.max(1, (total / maxVal) * chartH);
                  const bY = baseY - bH;
                  return (
                    <g key={mKey}>
                      <rect x={bX} y={bY} width={BAR_W} height={bH} fill={m.color} rx={2} opacity={0.85} />
                      {total > 0 && BAR_W >= 10 && (
                        <text x={bX + BAR_W / 2} y={bY - 2}
                          textAnchor="middle" fontSize={8} fill={m.color} fontWeight={700}>{total}</text>
                      )}
                    </g>
                  );
                }
              })}

              <text x={centerX} y={H - PAD_B + 14} textAnchor="middle" fontSize={9} fill="#6b7280">
                {labelFn ? labelFn(day) : dayLabel(day, days.length)}
              </text>
            </g>
          );
        })}

        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH} stroke="#d1d5db" strokeWidth={1} />
        <line x1={PAD_L} y1={PAD_T + chartH} x2={W - 10} y2={PAD_T + chartH} stroke="#d1d5db" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ── Shared: sede breakdown table ──────────────────────────────────────────────
function SedeBreakdownTable({ breakdown, activeMlist }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Sede</th>
            {activeMlist.map(m => (
              <th key={m.key} style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: m.color, fontWeight: 700, fontSize: '0.75rem' }}>
                {m.icon} {m.label}
              </th>
            ))}
            <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: '#374151', fontWeight: 700, fontSize: '0.75rem' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {SEDES.map(s => {
            const row = breakdown[s.id] || {};
            const rowTotal = activeMlist.reduce((sum, m) => sum + (row[m.key] || 0), 0);
            if (!rowTotal) return null;
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                    {s.nombre}
                  </div>
                </td>
                {activeMlist.map(m => (
                  <td key={m.key} style={{ textAlign: 'center', padding: '0.55rem 0.75rem', color: row[m.key] ? m.color : '#d1d5db', fontWeight: row[m.key] ? 700 : 400 }}>
                    {row[m.key] || '—'}
                  </td>
                ))}
                <td style={{ textAlign: 'center', padding: '0.55rem 0.75rem', fontWeight: 800, color: '#111' }}>{rowTotal}</td>
              </tr>
            );
          })}
          {(() => {
            const row = breakdown[0] || {};
            const rowTotal = activeMlist.reduce((sum, m) => sum + (row[m.key] || 0), 0);
            if (!rowTotal) return null;
            return (
              <tr key="sin-sede">
                <td style={{ padding: '0.55rem 0.75rem', color: '#9ca3af', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: '#d1d5db', flexShrink: 0 }} />
                    Sin sede
                  </div>
                </td>
                {activeMlist.map(m => (
                  <td key={m.key} style={{ textAlign: 'center', padding: '0.55rem 0.75rem', color: '#9ca3af' }}>
                    {row[m.key] || '—'}
                  </td>
                ))}
                <td style={{ textAlign: 'center', padding: '0.55rem 0.75rem', fontWeight: 700, color: '#9ca3af' }}>{rowTotal}</td>
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared: chart legend ──────────────────────────────────────────────────────
function ChartLegend({ sedeFilter, activeMlist }) {
  if (!sedeFilter) {
    return (
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
        {SEDES.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#374151' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: s.color }} />
            {s.nombre}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#9ca3af' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#d1d5db' }} />
          Sin sede
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
      {activeMlist.map(m => (
        <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#374151' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: m.color }} />
          {m.icon} {m.label}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const [periodo,       setPeriodo]       = useState('semana');
  const [desde,         setDesde]         = useState('');
  const [hasta,         setHasta]         = useState('');
  const [sedeFilter,    setSedeFilter]    = useState(null);
  const [activeMetrics, setActiveMetrics] = useState(['consultas', 'hospitalizados', 'laboratorios', 'imagenes', 'vacunas']);

  const { items: consultations }   = useStore('consultations');
  const { items: hospitalization } = useStore('hospitalization');
  const { items: labPedidos }      = useStore('laboratorios_pedidos');
  const { items: imgPedidos }      = useStore('imagenesPedidos');
  const { items: vaccines }        = useStore('vaccines');
  const { items: groomingItems }   = useStore('grooming');
  const { items: procedimientos }  = useStore('procedimientos');
  const { items: formulas }        = useStore('formulas_medicas');

  const STORES_DATA = {
    consultas:      consultations,
    hospitalizados: hospitalization,
    laboratorios:   labPedidos,
    imagenes:       imgPedidos,
    vacunas:        vaccines,
    grooming:       groomingItems,
    procedimientos,
    formulas,
  };

  const { start, end, days } = useMemo(() => getRange(periodo, desde, hasta), [periodo, desde, hasta]);

  // ── Daily data ──────────────────────────────────────────────────────────────
  const data = useMemo(() => {
    const result = {};
    for (const m of METRICS) {
      result[m.key] = computeDayData(STORES_DATA[m.key] || [], m.dateField, start, end, sedeFilter);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultations, hospitalization, labPedidos, imgPedidos, vaccines, groomingItems, procedimientos, formulas, start, end, sedeFilter]);

  const totals = useMemo(() => {
    const t = {};
    for (const m of METRICS) {
      t[m.key] = Object.values(data[m.key] || {}).reduce((s, v) => s + (v.total || 0), 0);
    }
    return t;
  }, [data]);

  const sedeBreakdown = useMemo(() => buildSedeBreakdown(data, activeMetrics, sedeFilter), [data, activeMetrics, sedeFilter]);

  // ── Monthly data ────────────────────────────────────────────────────────────
  const monthData = useMemo(() => {
    const result = {};
    for (const m of METRICS) {
      result[m.key] = computeMonthData(STORES_DATA[m.key] || [], m.dateField, sedeFilter);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultations, hospitalization, labPedidos, imgPedidos, vaccines, groomingItems, procedimientos, formulas, sedeFilter]);

  const monthTotals = useMemo(() => {
    const t = {};
    for (const m of METRICS) {
      t[m.key] = Object.values(monthData[m.key] || {}).reduce((s, v) => s + (v.total || 0), 0);
    }
    return t;
  }, [monthData]);

  const monthSedeBreakdown = useMemo(() => buildSedeBreakdown(monthData, activeMetrics, sedeFilter), [monthData, activeMetrics, sedeFilter]);

  const toggleMetric = (key) => {
    setActiveMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const btnStyle = (active, color) => ({
    padding: '0.4rem 0.9rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
    border: active ? `2px solid ${color}` : '1.5px solid #d1d5db',
    background: active ? color : '#fff',
    color: active ? '#fff' : '#374151',
    transition: 'all 0.15s',
  });

  const activeMlist = METRICS.filter(m => activeMetrics.includes(m.key));
  const sedeLabel = sedeFilter ? SEDES.find(s => s.id === sedeFilter)?.nombre : 'Todas las sedes (colores = sede)';

  return (
    <div>
      <div className="page-header">
        <h1>📊 Reportes</h1>
        <p>Actividad clínica por período y sede</p>
      </div>

      {/* ── Filter card ── */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 60 }}>Período:</span>
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)} style={btnStyle(periodo === p.key, 'var(--color-primary)')}>
              {p.label}
            </button>
          ))}
          {periodo === 'rango' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.25rem' }}>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.82rem' }} />
              <span style={{ color: '#9ca3af' }}>—</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.82rem' }} />
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: '1rem' }} />

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 60 }}>Sede:</span>
          <button onClick={() => setSedeFilter(null)} style={btnStyle(!sedeFilter, '#374151')}>
            🏢 Todas las sedes
          </button>
          {SEDES.map(s => (
            <button key={s.id} onClick={() => setSedeFilter(sedeFilter === s.id ? null : s.id)}
              style={btnStyle(sedeFilter === s.id, s.color)}>
              {s.nombre}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Metric selector ── */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 60 }}>Métricas:</span>
          {METRICS.map(m => {
            const on = activeMetrics.includes(m.key);
            return (
              <button key={m.key} onClick={() => toggleMetric(m.key)}
                style={{
                  padding: '0.35rem 0.8rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  border: `2px solid ${on ? m.color : '#d1d5db'}`,
                  background: on ? m.color + '18' : '#fff',
                  color: on ? m.color : '#9ca3af',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                <span>{m.icon}</span> {m.label}
              </button>
            );
          })}
        </div>
      </Card>

      {activeMetrics.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          Selecciona al menos una métrica para ver el gráfico.
        </div>
      )}

      {activeMetrics.length > 0 && (
        <>
          {/* ════════════════════════════════════════════════
              SECCIÓN DIARIA
          ════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0 0.75rem' }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              Actividad diaria
            </span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

          {/* Summary cards — daily */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {activeMlist.map(m => (
              <div key={m.key} style={{ background: '#fff', border: `2px solid ${m.color}22`, borderRadius: 12, padding: '1rem 1.1rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{m.icon}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color, lineHeight: 1.1 }}>{totals[m.key]}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6b7280', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Daily chart */}
          <Card style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111', marginBottom: '0.5rem' }}>
              Actividad por día
              <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '0.5rem', fontSize: '0.78rem' }}>
                {days.length} día{days.length !== 1 ? 's' : ''} · {start}{start !== end ? ` → ${end}` : ''} · {sedeLabel}
              </span>
            </div>
            <ChartLegend sedeFilter={sedeFilter} activeMlist={activeMlist} />
            <BarChart days={days} activeMetrics={activeMetrics} data={data} sedeFilter={sedeFilter} />
          </Card>

          {/* Daily sede breakdown */}
          {!sedeFilter && sedeBreakdown && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111', marginBottom: '1rem' }}>
                Distribución por sede · período seleccionado
              </div>
              <SedeBreakdownTable breakdown={sedeBreakdown} activeMlist={activeMlist} />
            </Card>
          )}

          {/* ════════════════════════════════════════════════
              SECCIÓN MENSUAL 2026
          ════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0 0.75rem' }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              Tendencia mensual 2026
            </span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

          {/* Summary cards — monthly (YTD 2026) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {activeMlist.map(m => (
              <div key={m.key} style={{ background: '#fff', border: `2px solid ${m.color}22`, borderRadius: 12, padding: '1rem 1.1rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{m.icon}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color, lineHeight: 1.1 }}>{monthTotals[m.key]}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6b7280', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
                <div style={{ fontSize: '0.62rem', color: '#9ca3af', marginTop: '0.15rem' }}>Acum. 2026</div>
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          <Card style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111', marginBottom: '0.5rem' }}>
              Actividad por mes
              <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '0.5rem', fontSize: '0.78rem' }}>
                {MONTHS_2026.length} mes{MONTHS_2026.length !== 1 ? 'es' : ''} · Ene → {MONTH_NAMES[MONTHS_2026.length - 1]} 2026 · {sedeLabel}
              </span>
            </div>
            <ChartLegend sedeFilter={sedeFilter} activeMlist={activeMlist} />
            <BarChart
              days={MONTHS_2026}
              activeMetrics={activeMetrics}
              data={monthData}
              sedeFilter={sedeFilter}
              labelFn={m => MONTH_NAMES[parseInt(m.slice(5, 7)) - 1]}
            />
          </Card>

          {/* Monthly sede breakdown */}
          {!sedeFilter && monthSedeBreakdown && (
            <Card style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111', marginBottom: '1rem' }}>
                Distribución por sede · acumulado 2026
              </div>
              <SedeBreakdownTable breakdown={monthSedeBreakdown} activeMlist={activeMlist} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Helper: build sede breakdown from any data dict ───────────────────────────
function buildSedeBreakdown(dataDict, activeMetrics, sedeFilter) {
  if (sedeFilter) return null;
  const result = {};
  SEDES_CON_UNKNOWN.forEach(s => { result[s.id] = {}; });
  for (const m of METRICS.filter(x => activeMetrics.includes(x.key))) {
    for (const dayData of Object.values(dataDict[m.key] || {})) {
      Object.entries(dayData.bySede || {}).forEach(([sid, cnt]) => {
        const id = Number(sid);
        if (!result[id]) result[id] = {};
        result[id][m.key] = (result[id][m.key] || 0) + cnt;
      });
    }
  }
  return result;
}
