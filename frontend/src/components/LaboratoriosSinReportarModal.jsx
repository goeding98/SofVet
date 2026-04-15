import { useState, useMemo } from 'react';
import { SEDES } from '../utils/useSede';

const sedeNombre = (id) => SEDES.find(s => s.id === id)?.nombre || `Sede ${id}`;

export default function LaboratoriosSinReportarModal({
  isOpen, onClose,
  pedidos,       // all laboratorios_pedidos records
  editPedido,    // edit fn from useStore
  session,       // current user session
  sedeActual,    // current user's sede_id (null if admin)
  isAdmin,
}) {
  const [sedeFilter,     setSedeFilter]   = useState(sedeActual || null);
  const [showHistory,    setShowHistory]  = useState(false);
  const [confirming,     setConfirming]   = useState(null); // pedido id — 'reportar'
  const [noReportarId,   setNoReportarId] = useState(null); // pedido id — 'no reportar'
  const [noReportarRazon,setNoReportarRazon] = useState('');

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

  if (!isOpen) return null;

  const handleReportar = async (p) => {
    await editPedido(p.id, {
      estado:          'Reportado',
      fecha_reportado: new Date().toISOString().split('T')[0],
      reportado_por:   session?.nombre || 'Desconocido',
    });
    setConfirming(null);
  };

  const handleNoReportar = async () => {
    if (!noReportarRazon.trim()) return;
    await editPedido(noReportarId, {
      estado:          'No reportado',
      razon_no_reporte: noReportarRazon.trim(),
      fecha_reportado: new Date().toISOString().split('T')[0],
      reportado_por:   session?.nombre || 'Desconocido',
    });
    setNoReportarId(null);
    setNoReportarRazon('');
  };

  const sedesUsadas = [...new Set(pedidos.map(p => p.sede_id).filter(Boolean))];

  const thSt = { padding:'0.55rem 0.85rem', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--color-bg)', whiteSpace:'nowrap' };
  const tdSt = { padding:'0.6rem 0.85rem', fontSize:'0.83rem', borderTop:'1px solid var(--color-border)' };

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem 1rem', backdropFilter:'blur(2px)', overflowY:'auto' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:780, margin:'auto', overflow:'hidden' }}
      >
        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#fef3f2', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontFamily:'var(--font-title)', color:'#c0392b', fontSize:'1.1rem', margin:0 }}>
              🧪 Laboratorios Sin Reportar
              {sinReportar.length > 0 && (
                <span style={{ marginLeft:'0.6rem', background:'#c0392b', color:'white', borderRadius:999, fontSize:'0.72rem', padding:'2px 9px', fontFamily:'var(--font-body)', fontWeight:700 }}>
                  {sinReportar.length}
                </span>
              )}
            </h3>
            <p style={{ margin:'0.2rem 0 0', fontSize:'0.8rem', color:'var(--color-text-muted)' }}>
              PDFs subidos pendientes de reporte médico
            </p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        <div style={{ padding:'1.25rem 1.5rem' }}>
          {/* Sede filter — only for admins */}
          {isAdmin && sedesUsadas.length > 1 && (
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
              <button
                onClick={() => setSedeFilter(null)}
                style={{ padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', border:'1px solid', borderColor: sedeFilter === null ? '#c0392b' : 'var(--color-border)', background: sedeFilter === null ? '#c0392b' : 'var(--color-white)', color: sedeFilter === null ? 'white' : 'var(--color-text-muted)' }}
              >
                Todas las sedes
              </button>
              {sedesUsadas.map(sid => {
                const active = sedeFilter === sid;
                return (
                  <button key={sid} onClick={() => setSedeFilter(active ? null : sid)}
                    style={{ padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', border:'1px solid', borderColor: active ? '#c0392b' : 'var(--color-border)', background: active ? '#c0392b' : 'var(--color-white)', color: active ? 'white' : 'var(--color-text-muted)' }}
                  >
                    📍 {sedeNombre(sid)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sin Reportar table */}
          {sinReportar.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'var(--color-text-muted)' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>✅</div>
              <p style={{ fontSize:'0.875rem', fontWeight:600, color:'#2e7d50' }}>¡Todo al día! Sin laboratorios pendientes de reporte.</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', marginBottom:'1rem' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={thSt}>Fecha solicitado</th>
                    <th style={thSt}>Mascota</th>
                    <th style={thSt}>Examen</th>
                    <th style={thSt}>Proc.</th>
                    <th style={{ ...thSt, width:80 }}>Sede</th>
                    <th style={{ ...thSt, width:110, textAlign:'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {sinReportar.map(p => (
                    <tr key={p.id} style={{ background: confirming === p.id ? '#fff8e1' : 'transparent' }}>
                      <td style={tdSt}>{p.fecha_solicitado || '—'}</td>
                      <td style={{ ...tdSt, fontWeight:600 }}>{p.patient_name || '—'}</td>
                      <td style={tdSt}>{p.tipo_examen}</td>
                      <td style={tdSt}>
                        <span style={{ background: p.procesamiento === 'Externo' ? '#e8f0ff' : '#e8f5ee', color: p.procesamiento === 'Externo' ? '#2e5cbf' : '#2e7d50', padding:'2px 8px', borderRadius:999, fontSize:'0.7rem', fontWeight:600 }}>
                          {p.procesamiento || 'Interno'}
                        </span>
                      </td>
                      <td style={{ ...tdSt, fontSize:'0.75rem', color:'var(--color-text-muted)' }}>{sedeNombre(p.sede_id)}</td>
                      <td style={{ ...tdSt, textAlign:'center' }}>
                        {confirming === p.id ? (
                          <div style={{ display:'flex', gap:'0.3rem', justifyContent:'center' }}>
                            <button onClick={() => handleReportar(p)} style={{ padding:'0.3rem 0.65rem', background:'#2e7d50', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.75rem', fontWeight:700 }}>✓ Sí</button>
                            <button onClick={() => setConfirming(null)} style={{ padding:'0.3rem 0.65rem', background:'var(--color-bg)', color:'var(--color-text-muted)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.75rem' }}>No</button>
                          </div>
                        ) : (
                          <div style={{ display:'flex', gap:'0.3rem', justifyContent:'center', flexWrap:'wrap' }}>
                            <button onClick={() => setConfirming(p.id)} style={{ padding:'0.3rem 0.65rem', background:'#e8f5ee', color:'#2e7d50', border:'1px solid #2e7d50', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.72rem', fontWeight:700 }}>✓ Reportar</button>
                            <button onClick={() => { setNoReportarId(p.id); setNoReportarRazon(''); }} style={{ padding:'0.3rem 0.65rem', background:'#fdecea', color:'#c0392b', border:'1px solid #c0392b', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.72rem', fontWeight:700 }}>✕ No reportar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Toggle últimos 30 */}
          <button
            onClick={() => setShowHistory(h => !h)}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.78rem', color:'var(--color-text-muted)', textDecoration:'underline', padding:0, fontFamily:'var(--font-body)' }}
          >
            {showHistory ? '▲ Ocultar historial' : `▼ Ver últimos 30 reportados (${ultimos30.length})`}
          </button>

          {/* Últimos 30 table */}
          {showHistory && (
            <div style={{ marginTop:'0.75rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
              <div style={{ padding:'0.6rem 0.85rem', background:'var(--color-bg)', fontSize:'0.72rem', fontWeight:700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--color-border)' }}>
                📋 Últimos 30 reportados (auditoría)
              </div>
              {ultimos30.length === 0 ? (
                <p style={{ padding:'1rem', textAlign:'center', color:'var(--color-text-muted)', fontSize:'0.82rem', fontStyle:'italic' }}>Sin reportes registrados aún.</p>
              ) : (
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* No reportar — reason modal */}
      {noReportarId && (
        <div onClick={() => setNoReportarId(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', padding:'1.75rem', width:420 }}>
            <h4 style={{ fontFamily:'var(--font-title)', color:'#c0392b', margin:'0 0 0.5rem' }}>✕ No reportar</h4>
            <p style={{ fontSize:'0.82rem', color:'var(--color-text-muted)', marginBottom:'1rem' }}>Indica el motivo por el que no se reporta este resultado.</p>
            <textarea
              value={noReportarRazon}
              onChange={e => setNoReportarRazon(e.target.value)}
              rows={3}
              placeholder="Ej: El paciente falleció, el cliente no pagó el reporte..."
              style={{ width:'100%', padding:'0.6rem 0.75rem', border:'1px solid #c0392b', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.875rem', resize:'vertical', boxSizing:'border-box' }}
              autoFocus
            />
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', marginTop:'1rem' }}>
              <button onClick={() => setNoReportarId(null)} style={{ padding:'0.5rem 1.1rem', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>Cancelar</button>
              <button onClick={handleNoReportar} disabled={!noReportarRazon.trim()} style={{ padding:'0.5rem 1.25rem', background:'#c0392b', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor: noReportarRazon.trim() ? 'pointer' : 'not-allowed', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:600, opacity: noReportarRazon.trim() ? 1 : 0.5 }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
