import { useState, useMemo, Fragment } from 'react';
import { useStore } from '../utils/useStore';
import { useSede, SEDES } from '../utils/useSede';
import { useAuth } from '../utils/useAuth';
import Card from '../components/Card';
import LaboratoriosModal from '../components/LaboratoriosModal';

const sedeNombre = (id) => SEDES.find(s => s.id === id)?.nombre || `Sede ${id}`;

export default function LaboratoriosPage() {
  const { items: pedidos,      edit: editPedido } = useStore('laboratorios_pedidos');
  const { items: laboratorios, edit: editLaboratorio } = useStore('laboratorios');
  const { sedeActual, isAdmin } = useSede();
  const { session } = useAuth();

  const isMedico = session?.rol === 'Médico' || session?.rol === 'Administrador';
  // Domicilio (id=4) users and admins can see all sedes; others see only their sede + Domicilio
  const canSeeAllSedes = isAdmin || session?.sede_id === 4;

  // Restricted users default to "Todos" (their sede + Domicilio); admins keep sedeActual
  const [sedeFilter,  setSedeFilter]  = useState(canSeeAllSedes ? (sedeActual || null) : null);
  const [showHistory, setShowHistory] = useState(false);
  const [expanded,    setExpanded]    = useState(null); // pedido id
  const [reportes,    setReportes]    = useState({});   // { [pedidoId]: text }
  const [saving,      setSaving]      = useState(null); // pedido id being saved
  const [editingLab,  setEditingLab]  = useState(null); // { lab, pedido } being edited
  const [editModal,   setEditModal]   = useState(false);

  // Sede filter logic:
  // - Admin / Domicilio users: sedeFilter=null → all; sedeFilter=X → only X
  // - Restricted users: sedeFilter=null → their sede + Domicilio; sedeFilter=X → only X
  const sedePermitida = (sede_id) => {
    if (canSeeAllSedes) return sedeFilter === null ? true : sede_id === sedeFilter;
    if (sedeFilter === null) return sede_id === session?.sede_id || sede_id === 4;
    return sede_id === sedeFilter;
  };

  const sinReportar = useMemo(() =>
    pedidos
      .filter(p => p.estado === 'Subido SIN REPORTAR')
      .filter(p => sedePermitida(p.sede_id))
      .sort((a, b) => a.fecha_solicitado?.localeCompare(b.fecha_solicitado)),
    [pedidos, sedeFilter, canSeeAllSedes]);

  const ultimos30 = useMemo(() =>
    pedidos
      .filter(p => p.estado === 'Reportado')
      .filter(p => sedePermitida(p.sede_id))
      .sort((a, b) => b.fecha_reportado?.localeCompare(a.fecha_reportado))
      .slice(0, 30),
    [pedidos, sedeFilter, canSeeAllSedes]);

  const solicitados = useMemo(() =>
    pedidos
      .filter(p => p.estado === 'Solicitado')
      .filter(p => sedePermitida(p.sede_id))
      .sort((a, b) => a.fecha_solicitado?.localeCompare(b.fecha_solicitado)),
    [pedidos, sedeFilter, canSeeAllSedes]);

  const handleReportar = async (p) => {
    setSaving(p.id);
    await editPedido(p.id, {
      estado:          'Reportado',
      fecha_reportado: new Date().toISOString().split('T')[0],
      reportado_por:   session?.nombre || 'Desconocido',
      reporte_medico:  reportes[p.id] || '',
    });
    setSaving(null);
    setExpanded(null);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => prev === id ? null : id);
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
      {canSeeAllSedes ? (
        (isAdmin || sedesUsadas.length > 1) && (
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
        )
      ) : (
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
          {[
            { label: 'Todos', value: null },
            { label: SEDES.find(s => s.id === session?.sede_id)?.nombre || 'Mi sede', value: session?.sede_id },
            { label: 'Domicilio', value: 4 },
          ].map(({ label, value }) => {
            const active = sedeFilter === value;
            const s = value ? SEDES.find(x => x.id === value) : null;
            return (
              <button key={String(value)} onClick={() => setSedeFilter(value)}
                style={{ padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', border:`1px solid ${active ? (s?.color || 'var(--color-primary)') : 'var(--color-border)'}`, background: active ? (s?.color || 'var(--color-primary)') : (s?.bg || 'var(--color-white)'), color: active ? 'white' : (s?.color || 'var(--color-text-muted)') }}
              >{value ? `📍 ${label}` : `🔍 ${label}`}</button>
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
                  <th style={thSt}>Fecha solicitado</th>
                  <th style={thSt}>Mascota</th>
                  <th style={thSt}>Examen</th>
                  <th style={thSt}>Procesamiento</th>
                  <th style={thSt}>Sede</th>
                  <th style={{ ...thSt, textAlign:'center' }}>Laboratorios</th>
                </tr>
              </thead>
              <tbody>
                {sinReportar.map(p => {
                  const lab      = laboratorios.find(l => String(l.pedido_id) === String(p.id));
                  const isOpen   = expanded === p.id;
                  const labFiles = lab?.archivos?.length > 0 ? lab.archivos : lab?.file_url ? [{ name: 'PDF adjunto', url: lab.file_url }] : [];
                  const hasPDF   = labFiles.length > 0;
                  const reporte  = reportes[p.id] ?? (p.reporte_medico || '');
                  return (
                    <Fragment key={p.id}>
                      <tr style={{ background: isOpen ? '#fff8f0' : 'transparent' }}>
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
                          <button
                            onClick={() => toggleExpand(p.id)}
                            style={{
                              padding:'0.35rem 0.85rem',
                              background: isOpen ? '#fff3e0' : hasPDF ? '#e8f5ee' : 'var(--color-bg)',
                              color: isOpen ? '#b45309' : hasPDF ? '#2e7d50' : 'var(--color-text-muted)',
                              border: `1px solid ${isOpen ? '#f59e0b' : hasPDF ? '#2e7d50' : 'var(--color-border)'}`,
                              borderRadius:'var(--radius-sm)',
                              cursor: hasPDF ? 'pointer' : 'default',
                              fontSize:'0.78rem',
                              fontWeight:700,
                              whiteSpace:'nowrap',
                            }}
                            disabled={!hasPDF}
                            title={hasPDF ? 'Ver resultados y reportar' : 'Sin PDF adjunto aún'}
                          >
                            {hasPDF
                              ? (isOpen ? '▲ Cerrar' : `👁 Ver laboratorios${labFiles.length > 1 ? ` (${labFiles.length})` : ''}`)
                              : '⏳ Sin PDF'}
                          </button>
                        </td>
                      </tr>

                      {/* ── Panel expandido ── */}
                      {isOpen && (
                        <tr>
                          <td colSpan={6} style={{ padding:0, borderTop:'none' }}>
                            <div style={{ padding:'1.25rem 1.5rem', background:'#fffbf0', borderTop:'2px solid #f59e0b', borderBottom:'1px solid #fde68a' }}>

                              {/* Meta info */}
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
                                <div style={{ fontSize:'0.82rem', color:'var(--color-text-muted)' }}>
                                  🧪 <strong style={{ color:'var(--color-text)' }}>{lab?.tipo || p.tipo_examen}</strong>
                                  {lab?.fecha && ` · Subido el ${lab.fecha}`}
                                  {lab?.created_by && ` · por ${lab.created_by}`}
                                  {labFiles.length > 1 && (
                                    <span style={{ marginLeft:'0.5rem', background:'#2e7d50', color:'white', padding:'1px 8px', borderRadius:999, fontSize:'0.68rem', fontWeight:700 }}>
                                      {labFiles.length} PDFs
                                    </span>
                                  )}
                                </div>
                                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                                  {labFiles.map((f, fi) => (
                                    <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer"
                                      style={{ padding:'0.3rem 0.75rem', background:'#2e7d50', color:'white', borderRadius:'var(--radius-sm)', fontSize:'0.75rem', fontWeight:600, textDecoration:'none', whiteSpace:'nowrap' }}>
                                      ↗ {labFiles.length > 1 ? f.name : 'Abrir PDF'}
                                    </a>
                                  ))}
                                </div>
                              </div>

                              {/* Resultados del microbiólogo */}
                              {lab?.resultados && (
                                <div style={{ background:'white', border:'1px solid #fde68a', borderRadius:'var(--radius-sm)', padding:'0.65rem 0.85rem', fontSize:'0.82rem', color:'var(--color-text)', marginBottom:'1rem', lineHeight:1.6 }}>
                                  <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#b45309', marginBottom:'0.3rem' }}>Resultados / Hallazgos (microbiólogo)</div>
                                  {lab.resultados}
                                </div>
                              )}

                              {/* PDF iframes */}
                              {labFiles.map((f, fi) => (
                                <div key={fi} style={{ border:'1px solid #fde68a', borderRadius:'var(--radius-md)', overflow:'hidden', background:'white', marginBottom:'0.75rem' }}>
                                  {labFiles.length > 1 && (
                                    <div style={{ padding:'0.4rem 0.85rem', background:'#fff3e0', fontSize:'0.75rem', fontWeight:600, color:'#b45309', borderBottom:'1px solid #fde68a' }}>
                                      📄 {f.name}
                                    </div>
                                  )}
                                  <iframe
                                    src={f.url}
                                    title={`PDF ${fi + 1} — ${p.tipo_examen}`}
                                    style={{ width:'100%', height:520, border:'none', display:'block' }}
                                  />
                                </div>
                              ))}

                              {/* Botón editar resultado (microbiólogo) */}
                              {lab && (
                                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.5rem' }}>
                                  <button
                                    onClick={() => { setEditingLab({ lab, pedido: p }); setEditModal(true); }}
                                    style={{ padding:'0.35rem 0.85rem', background:'white', border:'1px solid #b45309', color:'#b45309', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.78rem', fontWeight:700, fontFamily:'var(--font-body)' }}
                                  >
                                    ✏️ Editar resultado
                                  </button>
                                </div>
                              )}

                              {/* Reporte médico + botón reportar */}
                              <div style={{ marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid #fde68a' }}>
                                {isMedico ? (
                                  <>
                                    <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#b45309', marginBottom:'0.4rem' }}>
                                      Reporte médico para el paciente *
                                    </label>
                                    <textarea
                                      value={reporte}
                                      onChange={e => setReportes(r => ({ ...r, [p.id]: e.target.value }))}
                                      rows={4}
                                      placeholder="Escriba aquí el reporte / interpretación médica que se entregará al propietario..."
                                      style={{ width:'100%', padding:'0.65rem 0.85rem', border:'1px solid #f59e0b', borderRadius:'var(--radius-md)', fontFamily:'var(--font-body)', fontSize:'0.875rem', resize:'vertical', boxSizing:'border-box', marginBottom:'0.85rem' }}
                                    />
                                    <div style={{ display:'flex', justifyContent:'flex-end' }}>
                                      <button
                                        onClick={() => handleReportar(p)}
                                        disabled={saving === p.id}
                                        style={{ padding:'0.55rem 1.4rem', background: saving === p.id ? '#aaa' : '#2e7d50', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor: saving === p.id ? 'not-allowed' : 'pointer', fontSize:'0.875rem', fontWeight:700, fontFamily:'var(--font-body)' }}
                                      >
                                        {saving === p.id ? '⏳ Guardando...' : '✓ Marcar como Reportado'}
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ background:'#fff3e0', border:'1px solid #fde68a', borderRadius:'var(--radius-sm)', padding:'0.75rem 1rem', fontSize:'0.82rem', color:'#b45309' }}>
                                    ℹ️ Solo los médicos pueden escribir el reporte y marcar como reportado.
                                  </div>
                                )}
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
                      <th style={thSt}>Reporte</th>
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
                        <td style={{ ...tdSt, color:'var(--color-text-muted)', maxWidth:220 }}>
                          {p.reporte_medico
                            ? <span style={{ fontSize:'0.78rem' }}>{p.reporte_medico.length > 80 ? p.reporte_medico.slice(0, 80) + '…' : p.reporte_medico}</span>
                            : <span style={{ fontStyle:'italic', fontSize:'0.75rem' }}>Sin reporte</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Modal editar resultado ── */}
      {editModal && editingLab && (
        <LaboratoriosModal
          isOpen={editModal}
          onClose={() => { setEditModal(false); setEditingLab(null); }}
          onSave={() => {}}
          onEdit={async (labId, changes) => { await editLaboratorio(labId, changes); setEditModal(false); setEditingLab(null); }}
          pet={{ id: editingLab.pedido.patient_id, name: editingLab.pedido.patient_name, species: '' }}
          pedidos={[]}
          initialData={editingLab.lab}
          labId={editingLab.lab.id}
        />
      )}
    </div>
  );
}
