import { useState, useMemo } from 'react';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';

// ── Metric definitions ────────────────────────────────────────────────────────
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

const PERIODOS = [
  { key: 'hoy',    label: 'Hoy'        },
  { key: 'semana', label: 'Esta semana'},
  { key: 'mes',    label: 'Este mes'   },
  { key: 'rango',  label: 'Personalizado'},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function countByDay(items, dateField, start, end) {
  const map = {};
  for (const item of items) {
    const d = (item[dateField] || '').slice(0, 10);
    if (d >= start && d <= end) map[d] = (map[d] || 0) + 1;
  }
  return map;
}

function dayLabel(dateStr, totalDays) {
  const d = new Date(dateStr + 'T12:00:00');
  if (totalDays === 1) return 'Hoy';
  if (totalDays <= 14) {
    return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()] + ' ' + d.getDate();
  }
  return String(d.getDate());
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ days, activeMetrics, data }) {
  const PAD_L = 38, PAD_B = 32, PAD_T = 12, H = 260;
  const BAR_W = Math.max(6, Math.min(22, Math.floor(580 / days.length / activeMetrics.length) - 2));
  const GROUP_W = activeMetrics.length * (BAR_W + 2) + 10;
  const W = Math.max(600, days.length * GROUP_W + PAD_L + 20);
  const chartH = H - PAD_T - PAD_B;
  const chartW = W - PAD_L - 10;

  const maxVal = Math.max(1, ...activeMetrics.flatMap(m =>
    days.map(d => data[m]?.[d] || 0)
  ));

  const yTicks = [];
  const step = Math.ceil(maxVal / 4);
  for (let v = 0; v <= maxVal; v += step) yTicks.push(v);
  if (!yTicks.includes(maxVal)) yTicks.push(maxVal);

  return (
    <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block', minWidth: '100%' }}>
        {/* Gridlines */}
        {yTicks.map(v => {
          const y = PAD_T + chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line x1={PAD_L} y1={y} x2={W - 10} y2={y} stroke="#f0f0f0" strokeWidth={1} />
              <text x={PAD_L - 5} y={y + 3.5} textAnchor="end" fontSize={9} fill="#9ca3af">{v}</text>
            </g>
          );
        })}

        {/* Bars */}
        {days.map((day, di) => {
          const centerX = PAD_L + di * GROUP_W + GROUP_W / 2;
          const offsetStart = -(activeMetrics.length * (BAR_W + 2)) / 2 + 1;
          return (
            <g key={day}>
              {activeMetrics.map((mKey, mi) => {
                const m = METRICS.find(x => x.key === mKey);
                const val = data[mKey]?.[day] || 0;
                const bH = Math.max(0, (val / maxVal) * chartH);
                const bX = centerX + offsetStart + mi * (BAR_W + 2);
                const bY = PAD_T + chartH - bH;
                return (
                  <g key={mKey}>
                    <rect x={bX} y={bY} width={BAR_W} height={bH} fill={m.color} rx={2} opacity={0.85} />
                    {val > 0 && BAR_W >= 10 && (
                      <text x={bX + BAR_W / 2} y={bY - 2} textAnchor="middle" fontSize={8} fill={m.color} fontWeight={700}>{val}</text>
                    )}
                  </g>
                );
              })}
              <text x={centerX} y={H - PAD_B + 14} textAnchor="middle" fontSize={9} fill="#6b7280">
                {dayLabel(day, days.length)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH} stroke="#d1d5db" strokeWidth={1} />
        <line x1={PAD_L} y1={PAD_T + chartH} x2={W - 10} y2={PAD_T + chartH} stroke="#d1d5db" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const [periodo,       setPeriodo]       = useState('semana');
  const [desde,         setDesde]         = useState('');
  const [hasta,         setHasta]         = useState('');
  const [activeMetrics, setActiveMetrics] = useState(['consultas', 'hospitalizados', 'laboratorios', 'imagenes', 'vacunas']);

  // Load all stores
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
    procedimientos: procedimientos,
    formulas:       formulas,
  };

  const { start, end, days } = useMemo(() => getRange(periodo, desde, hasta), [periodo, desde, hasta]);

  const data = useMemo(() => {
    const result = {};
    for (const m of METRICS) {
      result[m.key] = countByDay(STORES_DATA[m.key] || [], m.dateField, start, end);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultations, hospitalization, labPedidos, imgPedidos, vaccines, groomingItems, procedimientos, formulas, start, end]);

  const totals = useMemo(() => {
    const t = {};
    for (const m of METRICS) {
      t[m.key] = Object.values(data[m.key] || {}).reduce((s, v) => s + v, 0);
    }
    return t;
  }, [data]);

  const toggleMetric = (key) => {
    setActiveMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>📊 Reportes</h1>
        <p>Actividad clínica por período</p>
      </div>

      {/* ── Period filter ── */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>Período:</span>
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                border: periodo === p.key ? '2px solid var(--color-primary)' : '1.5px solid #d1d5db',
                background: periodo === p.key ? 'var(--color-primary)' : '#fff',
                color: periodo === p.key ? '#fff' : '#374151',
              }}>
              {p.label}
            </button>
          ))}
          {periodo === 'rango' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.5rem' }}>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.82rem' }} />
              <span style={{ color: '#9ca3af' }}>—</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.82rem' }} />
            </div>
          )}
        </div>
      </Card>

      {/* ── Metric selector ── */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>Métricas:</span>
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

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {METRICS.filter(m => activeMetrics.includes(m.key)).map(m => (
          <div key={m.key} style={{ background: '#fff', border: `2px solid ${m.color}22`, borderRadius: 12, padding: '1rem 1.1rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>{m.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color, lineHeight: 1.1 }}>{totals[m.key]}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      {activeMetrics.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', color: '#111' }}>
            Actividad por día
            <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '0.5rem', fontSize: '0.78rem' }}>
              {days.length} día{days.length !== 1 ? 's' : ''} · {start}{start !== end ? ` → ${end}` : ''}
            </span>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {METRICS.filter(m => activeMetrics.includes(m.key)).map(m => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#374151' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: m.color }} />
                {m.label}
              </div>
            ))}
          </div>

          <BarChart days={days} activeMetrics={activeMetrics} data={data} />
        </Card>
      )}

      {activeMetrics.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          Selecciona al menos una métrica para ver el gráfico.
        </div>
      )}
    </div>
  );
}
