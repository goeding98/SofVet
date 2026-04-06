import { useState, useMemo, Fragment } from 'react';
import { useStore } from '../utils/useStore';
import { useSede, SEDES } from '../utils/useSede';
import { useAuth } from '../utils/useAuth';
import Card from '../components/Card';

const sedeNombre = (id) => SEDES.find(s => s.id === id)?.nombre || `Sede ${id}`;

export default function LaboratoriosPage() {
  const { items: pedidos,      edit: editPedido } = useStore('laboratorios_pedidos');
  const { items: laboratorios }                   = useStore('laboratorios');
  const { sedeActual, isAdmin } = useSede();
  const { session } = useAuth();

  const [sedeFilter,  setSedeFilter]  = useState(sedeActual || null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirming,  setConfirming]  = useState(null);
  const [expanded,    setExpanded]    = useState(null); // pedido id

  const sinReportar = useMemo(() =>
    pedidos
      .filter(p => p.estado === 'Subido SIN REPORTAR')
      .filter(p => sedeFilter === null ? true : p.sede_id === sedeFilter)
      .sort((a, b) => a.fecha_solicitado?.localeCompare(b.fecha_solicitado)),
    [pedidos, sedeFilter]);

  const ultimos30 = useMemo(() =>
    pedidos
      .filter(p => p.estado === 'Reportado')
      .filter(p => sedeFilter === null ? true : p.sede_id === sedeFilter)
      .sort((a, b) => b.fecha_reportado?.localeCompare(a.fecha_reportado))
      .slice(0, 30),
    [pedidos, sedeFilter]);

  const solicitados = useMemo(() =>
    pedidos
      .filter(p => p.estado === 'Solicitado')
      .filter(p => sedeFilter === null ? true : p.sede_id === sedeFilter)
      .sort((a, b) => a.fecha_solicitado?.localeCompare(b.fecha_solicitado)),
    [pedidos, sedeFilter]);

  const handleReportar = async (p) => {
    await editPedido(p.id, {
      estado:          'Reportado',
      fecha_reportado: new Date().toISOString().split('T')[0],
      reportado_por:   session?.nombre || 'Desconocido',
    });
    setConfirming(null);
  };

  const sedesUsadas = [...new Set(pedidos.map(p => p.sede_id).filter(Boolean))];

  const thSt = { padding:'0.55rem 0.85rem', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--color-bg)', whiteSpace:'nowrap' };
  const tdSt = { padding:'0.65rem 0.85rem', fontSize:'0.84rem', borderTop:'1px solid var(--color-border)' };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontFamily:'var(--font-title)', color:'var(--color-primary)', fontSize:'1.6rem', margin:'0 0 0.25rem' }}>🧪 Laboratorios</h1>
        <p style={{ color:'var(--color-text-muted)', fontSize:'0.875rem', margin:0 }}>
          Seguimiento de pedidos de laboratorio · {sinReportar.length > 0 && <strong style={{ color:'#c0392b' }}>{sinReportar.length} pendientes de reporte</strong>}
        </p>
      </div>

      {/* Sede filter */}
      {(isAdmin || sedesUsadas.length > 1) && (
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
          {isAdmin && (
            <button onClick={() => setSedeFilter(null)}
              style={{ padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', border:'1px solid', borderColor: sedeFilter === null ? 'var(--color-primary)' : 'var(--color-border)', background: sedeFilter === null ? 'var(--color-primary)' : 'var(--color-white)', color: sedeFilter === null ? 'white' : 'var(--color-text-muted)' }}
            >Todas las sedes</button>
          )}
          {sedesUsadas.map(sid => {
            const s = SEDES.find(x => x.id === sid);
            if (!s) return null;
            const active = sedeFilter === sid;
            return (
              <button key={sid} onClick={() => setSedeFilter(active ? (isAdmin ? null : sid) : sid)}
                style={{ padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', border:`1px solid ${s.color}`, background: active ? s.color : s.bg, color: active ? 'white' : s.color }}
              >📍 {s.nombre}</button>
            );
          })}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Solicitados (esperando PDF)', value: solicitados.length, color:'#2e5cbf', bg:'#e8f0ff' },
          { label:'Sin Reportar (PDF subido)',   value: sinReportar.length, color:'#c0392b', bg:'#fce4e4' },
          { label:'Reportados (últimos 30)',      value: ultimos30.length,   color:'#2e7d50', bg:'#e8f5ee' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.color}30`, borderRadius:'var(--radius-lg)', padding:'1rem 1.25rem' }}>
            <div style={{ fontSize:'1.8rem', fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:'0.75rem', color:s.color, marginTop:'0.3rem', fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Sin Reportar ── */}
      <Card
        title={
          <span>
            📋 Sin Reportar
            {sinReportar.length > 0 && (
              <span style={{ marginLeft:'0.6rem', background:'#c0392b', color:'white', borderRadius:999, fontSize:'0.7rem', padding:'2px 9px', fontWeight:700 }}>
                {sinReportar.length}
              </span>
            )}
          </span>
        }
        style={{ marginBottom:'1.5rem' }}
      >
        {sinReportar.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'var(--color-text-muted)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>✅</div>
            <p style={{ fontSize:'0.875rem', fontWeight:600, color:'#2e7d50' }}>¡Todo al día! Sin laboratorios pendientes de reporte.</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, width:32 }}></th>
                  <th style={thSt}>Fecha solicitado</th>
                  <th style={thSt}>Mascota</th>
                  <th style={thSt}>Examen</th>
                  <th style={thSt}>Procesamiento</th>
                  <th style={thSt}>Sede</th>
                  <th style={{ ...thSt, textAlign:'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {sinReportar.map(p => {
                  const lab      = laboratorios.find(l => l.pedido_id === p.id);
                  const isOpen   = expanded === p.id;
                  const hasPDF   = !!lab?.file_url;
                  return (
                    <Fragment key={p.id}>
                      <tr style={{ background: confirming === p.id ? '#fff8e1' : isOpen ? '#f0fdf4' : 'transparent' }}>
                        {/* Expand toggle */}
                        <td style={{ ...tdSt, textAlign:'center', padding:'0.4rem' }}>
                          <button
                            onClick={() => setExpanded(isOpen ? null : p.id)}
                            title={hasPDF ? 'Ver PDF' : 'Sin PDF adjunto'}
                            style={{ background: hasPDF ? '#e8f5ee' : 'var(--color-bg)', border:`1px solid ${hasPDF ? '#2e7d50' : 'var(--color-border)'}`, borderRadius:'var(--radius-sm)', cursor: hasPDF ? 'pointer' : 'default', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}
                          >
                            {hasPDF ? (isOpen ? '▲' : '▼') : '—'}
                          </button>
                        </td>
                        <td style={tdSt}>{p.fecha_solicitado || '—'}</td>
                        <td style={{ ...tdSt, fontWeight:600 }}>{p.patient_name || '—'}</td>
                        <td style={tdSt}>{p.tipo_examen}</td>
                        <td style={tdSt}>
                          <span style={{ background: p.procesamiento === 'Externo' ? '#e8f0ff' : '#e8f5ee', color: p.procesamiento === 'Externo' ? '#2e5cbf' : '#2e7d50', padding:'2px 9px', borderRadius:999, fontSize:'0.7rem', fontWeight:600 }}>
                            {p.procesamiento || 'Interno'}
                          </span>
                        </td>
                        <td style={{ ...tdSt, color:'var(--color-text-muted)', fontSize:'0.78rem' }}>{sedeNombre(p.sede_id)}</td>
                        <td style={{ ...tdSt, textAlign:'center' }}>
                          {confirming === p.id ? (
                            <div style={{ display:'flex', gap:'0.35rem', justifyContent:'center' }}>
                              <button onClick={() => handleReportar(p)}
                                style={{ padding:'0.35rem 0.75rem', background:'#2e7d50', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.78rem', fontWeight:700 }}>
                                ✓ Confirmar
                              </button>
                              <button onClick={() => setConfirming(null)}
                                style={{ padding:'0.35rem 0.6rem', background:'var(--color-bg)', color:'var(--color-text-muted)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.78rem' }}>
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirming(p.id)}
                              style={{ padding:'0.35rem 0.85rem', background:'#e8f5ee', color:'#2e7d50', border:'1px solid #2e7d50', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.78rem', fontWeight:700 }}>
                              ✓ Reportar
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* ── Expanded PDF viewer ── */}
                      {isOpen && hasPDF && (
                        <tr>
                          <td colSpan={7} style={{ padding:0, borderTop:'none' }}>
                            <div style={{ padding:'1rem 1.25rem', background:'#f0fdf4', borderTop:'1px solid #c3e8d0', borderBottom:'1px solid #c3e8d0' }}>
                              {/* Meta info */}
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                                <div style={{ fontSize:'0.78rem', color:'var(--color-text-muted)' }}>
                                  📄 <strong style={{ color:'var(--color-text)' }}>{lab.tipo || p.tipo_examen}</strong>
                                  {lab.fecha && ` · Subido el ${lab.fecha}`}
                                  {lab.created_by && ` · por ${lab.created_by}`}
                                </div>
                                <a href={lab.file_url} target="_blank" rel="noopener noreferrer"
                                  style={{ padding:'0.3rem 0.75rem', background:'#2e7d50', color:'white', borderRadius:'var(--radius-sm)', fontSize:'0.75rem', fontWeight:600, textDecoration:'none' }}>
                                  ↗ Abrir en pestaña
                                </a>
                              </div>
                              {/* Resultados text if any */}
                              {lab.resultados && (
                                <div style={{ background:'white', border:'1px solid #c3e8d0', borderRadius:'var(--radius-sm)', padding:'0.65rem 0.85rem', fontSize:'0.82rem', color:'var(--color-text)', marginBottom:'0.75rem', lineHeight:1.6 }}>
                                  {lab.resultados}
                                </div>
                              )}
                              {/* PDF iframe */}
                              <div style={{ border:'1px solid #c3e8d0', borderRadius:'var(--radius-md)', overflow:'hidden', background:'white' }}>
                                <iframe
                                  src={lab.file_url}
                                  title={`PDF ${p.tipo_examen}`}
                                  style={{ width:'100%', height:520, border:'none', display:'block' }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Solicitados (esperando PDF) ── */}
      {solicitados.length > 0 && (
        <Card title={`⏳ Solicitados — esperando PDF (${solicitados.length})`} style={{ marginBottom:'1.5rem' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={thSt}>Fecha solicitado</th>
                  <th style={thSt}>Mascota</th>
                  <th style={thSt}>Examen</th>
                  <th style={thSt}>Procesamiento</th>
                  <th style={thSt}>Sede</th>
                </tr>
              </thead>
              <tbody>
                {solicitados.map(p => (
                  <tr key={p.id}>
                    <td style={tdSt}>{p.fecha_solicitado || '—'}</td>
                    <td style={{ ...tdSt, fontWeight:600 }}>{p.patient_name || '—'}</td>
                    <td style={tdSt}>{p.tipo_examen}</td>
                    <td style={tdSt}>
                      <span style={{ background: p.procesamiento === 'Externo' ? '#e8f0ff' : '#e8f5ee', color: p.procesamiento === 'Externo' ? '#2e5cbf' : '#2e7d50', padding:'2px 9px', borderRadius:999, fontSize:'0.7rem', fontWeight:600 }}>
                        {p.procesamiento || 'Interno'}
                      </span>
                    </td>
                    <td style={{ ...tdSt, color:'var(--color-text-muted)', fontSize:'0.78rem' }}>{sedeNombre(p.sede_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Últimos 30 reportados ── */}
      <div>
        <button onClick={() => setShowHistory(h => !h)}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.82rem', color:'var(--color-text-muted)', textDecoration:'underline', padding:0, fontFamily:'var(--font-body)', marginBottom:'0.75rem' }}>
          {showHistory ? '▲ Ocultar historial' : `▼ Ver últimos 30 reportados (${ultimos30.length})`}
        </button>
        {showHistory && (
          <Card title="📋 Últimos 30 reportados (auditoría)">
            {ultimos30.length === 0 ? (
              <p style={{ textAlign:'center', color:'var(--color-text-muted)', fontSize:'0.82rem', fontStyle:'italic', padding:'1rem' }}>Sin reportes registrados aún.</p>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thSt}>Fecha solicitado</th>
                      <th style={thSt}>Mascota</th>
                      <th style={thSt}>Examen</th>
                      <th style={thSt}>Fecha reportado</th>
                      <th style={thSt}>Reportado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimos30.map(p => (
                      <tr key={p.id}>
                        <td style={tdSt}>{p.fecha_solicitado || '—'}</td>
                        <td style={{ ...tdSt, fontWeight:600 }}>{p.patient_name || '—'}</td>
                        <td style={tdSt}>{p.tipo_examen}</td>
                        <td style={{ ...tdSt, color:'#2e7d50', fontWeight:600 }}>{p.fecha_reportado || '—'}</td>
                        <td style={{ ...tdSt, color:'var(--color-text-muted)' }}>{p.reportado_por || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
