import { useState, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import { useSede, SEDES } from '../utils/useSede';
import { useAuth } from '../utils/useAuth';
import Card from '../components/Card';
import ImagenesResultModal from '../components/ImagenesResultModal';

const sedeNombre = (id) => SEDES.find(s => s.id === id)?.nombre || `Sede ${id}`;

export default function ImagenesPage() {
  const { items: pedidos,   edit: editPedido,   remove: removePedido }   = useStore('imagenesPedidos');
  const { items: imagenes,  edit: editImagen,   remove: removeImagen }   = useStore('imagenes');
  const { items: patients } = useStore('patients');
  const { items: clients }  = useStore('clients');
  const { sedeActual, isAdmin } = useSede();
  const { session } = useAuth();
  const navigate = useNavigate();

  const getTutor = (patient_id) => {
    const pat = patients.find(p => p.id === patient_id);
    if (!pat) return '—';
    const cli = clients.find(c => c.id === pat.owner_id);
    return cli?.name || '—';
  };

  const isMedico     = session?.rol === 'Médico' || session?.rol === 'Administrador';
  const canSeeAll    = isAdmin || session?.sede_id === 4;

  const [sedeFilter,   setSedeFilter]   = useState(canSeeAll ? (sedeActual || null) : null);
  const [showHistory,  setShowHistory]  = useState(false);
  const [expanded,     setExpanded]     = useState(null);
  const [reportes,     setReportes]     = useState({});
  const [saving,       setSaving]       = useState(null);
  const [editingImg,   setEditingImg]   = useState(null);
  const [editModal,    setEditModal]    = useState(false);
  const [editSedePid,  setEditSedePid]  = useState(null);

  const sedePermitida = (sede_id) => {
    if (canSeeAll) return sedeFilter === null ? true : sede_id === sedeFilter;
    if (sedeFilter === null) return sede_id === session?.sede_id || sede_id === 4;
    return sede_id === sedeFilter;
  };

  const sinReportar = useMemo(() =>
    pedidos.filter(p => p.estado === 'Subido SIN REPORTAR' && sedePermitida(p.sede_id))
           .sort((a, b) => a.fecha_solicitado?.localeCompare(b.fecha_solicitado)),
    [pedidos, sedeFilter, canSeeAll]);

  const solicitados = useMemo(() =>
    pedidos.filter(p => p.estado === 'Solicitado' && sedePermitida(p.sede_id))
           .sort((a, b) => a.fecha_solicitado?.localeCompare(b.fecha_solicitado)),
    [pedidos, sedeFilter, canSeeAll]);

  const ultimos30 = useMemo(() =>
    pedidos.filter(p => p.estado === 'Reportado' && sedePermitida(p.sede_id))
           .sort((a, b) => b.fecha_reportado?.localeCompare(a.fecha_reportado))
           .slice(0, 30),
    [pedidos, sedeFilter, canSeeAll]);

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

  const handleDeletePedido = (p) => {
    const img = imagenes.find(i => String(i.pedido_id) === String(p.id));
    const msg = img
      ? `¿Eliminar la solicitud de "${p.tipo_examen}" para ${p.patient_name}?\n\nEsto también eliminará la imagen subida. Esta acción no se puede deshacer.`
      : `¿Eliminar la solicitud de "${p.tipo_examen}" para ${p.patient_name}?\n\nEsta acción no se puede deshacer.`;
    if (!confirm(msg)) return;
    if (img) removeImagen(img.id);
    removePedido(p.id);
  };

  const sedesUsadas = [...new Set(pedidos.map(p => p.sede_id).filter(Boolean))];

  const thSt = { padding:'0.55rem 0.85rem', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--color-bg)', whiteSpace:'nowrap' };
  const tdSt = { padding:'0.65rem 0.85rem', fontSize:'0.84rem', borderTop:'1px solid var(--color-border)' };

  const SedeCelda = ({ p }) => (
    canSeeAll && editSedePid === p.id ? (
      <div style={{ display:'flex', gap:'0.3rem', alignItems:'center' }}>
        <select defaultValue={p.sede_id} onChange={async e => { await editPedido(p.id, { sede_id: parseInt(e.target.value) }); setEditSedePid(null); }} style={{ padding:'2px 4px', fontSize:'0.75rem', border:'1px solid #1565c0', borderRadius:'var(--radius-sm)' }} autoFocus>
          {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <button onClick={() => setEditSedePid(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-muted)', fontSize:'0.9rem', lineHeight:1 }}>×</button>
      </div>
    ) : (
      <span onClick={canSeeAll ? () => setEditSedePid(p.id) : undefined} title={canSeeAll ? 'Clic para cambiar sede' : undefined}
        style={{ color:'var(--color-text-muted)', cursor: canSeeAll ? 'pointer' : 'default', textDecoration: canSeeAll ? 'underline dotted' : 'none' }}>
        {sedeNombre(p.sede_id)}
      </span>
    )
  );

  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontFamily:'var(--font-title)', color:'var(--color-primary)', fontSize:'1.6rem', margin:'0 0 0.25rem' }}>🔬 Imágenes</h1>
        <p style={{ color:'var(--color-text-muted)', fontSize:'0.875rem', margin:0 }}>
          Seguimiento de pedidos de imagenología · {sinReportar.length > 0 && <strong style={{ color:'#c0392b' }}>{sinReportar.length} pendientes de reporte</strong>}
        </p>
      </div>

      {/* Sede filter */}
      {canSeeAll && (isAdmin || sedesUsadas.length > 1) && (
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
          {isAdmin && (
            <button onClick={() => setSedeFilter(null)}
              style={{ padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', border:'1px solid', borderColor: sedeFilter === null ? 'var(--color-primary)' : 'var(--color-border)', background: sedeFilter === null ? 'var(--color-primary)' : 'var(--color-white)', color: sedeFilter === null ? 'white' : 'var(--color-text-muted)' }}>
              Todas las sedes
            </button>
          )}
          {sedesUsadas.map(sid => {
            const s = SEDES.find(x => x.id === sid);
            if (!s) return null;
            const active = sedeFilter === sid;
            return (
              <button key={sid} onClick={() => setSedeFilter(active ? (isAdmin ? null : sid) : sid)}
                style={{ padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', border:`1px solid ${s.color}`, background: active ? s.color : s.bg, color: active ? 'white' : s.color }}>
                📍 {s.nombre}
              </button>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Solicitados (esperando imagen)', value: solicitados.length, color:'#1565c0', bg:'#e8f0ff' },
          { label:'Sin Reportar (imagen subida)',   value: sinReportar.length, color:'#c0392b', bg:'#fce4e4' },
          { label:'Reportados (últimos 30)',         value: ultimos30.length,   color:'#2e7d50', bg:'#e8f5ee' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.color}30`, borderRadius:'var(--radius-lg)', padding:'1rem 1.25rem' }}>
            <div style={{ fontSize:'1.8rem', fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:'0.75rem', color:s.color, marginTop:'0.3rem', fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sin Reportar */}
      <Card title={<span>📋 Sin Reportar {sinReportar.length > 0 && <span style={{ marginLeft:'0.6rem', background:'#c0392b', color:'white', borderRadius:999, fontSize:'0.7rem', padding:'2px 9px', fontWeight:700 }}>{sinReportar.length}</span>}</span>} style={{ marginBottom:'1.5rem' }}>
        {sinReportar.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'var(--color-text-muted)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>✅</div>
            <p style={{ fontSize:'0.875rem', fontWeight:600, color:'#2e7d50' }}>¡Todo al día! Sin imágenes pendientes de reporte.</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>
                <th style={{ ...thSt, width:50 }}>#</th>
                <th style={thSt}>Fecha solicitado</th>
                <th style={thSt}>Mascota</th>
                <th style={thSt}>Tutor</th>
                <th style={thSt}>Solicitado por</th>
                <th style={thSt}>Examen</th>
                <th style={thSt}>Procesamiento</th>
                <th style={thSt}>Sede</th>
                <th style={{ ...thSt, textAlign:'center' }}>Imágenes</th>
                <th style={thSt}></th>
              </tr></thead>
              <tbody>
                {sinReportar.map(p => {
                  const img      = imagenes.find(i => String(i.pedido_id) === String(p.id));
                  const isOpen   = expanded === p.id;
                  const archivos = img?.archivos?.length > 0 ? img.archivos : img?.file_url ? [{ name: 'Archivo adjunto', url: img.file_url }] : [];
                  const hasFile  = archivos.length > 0;
                  const reporte  = reportes[p.id] ?? (p.reporte_medico || '');
                  return (
                    <Fragment key={p.id}>
                      <tr style={{ background: isOpen ? '#e8f0ff' : 'transparent' }}>
                        <td style={{ ...tdSt, color:'var(--color-text-muted)', fontSize:'0.72rem', fontWeight:700, whiteSpace:'nowrap' }}>#{p.id}</td>
                        <td style={tdSt}>{p.fecha_solicitado || '—'}{p.hora_solicitado ? ` ${p.hora_solicitado}` : ''}</td>
                        <td style={{ ...tdSt, fontWeight:600 }}>
                          {p.patient_id ? (
                            <button onClick={() => navigate(`/patients/${p.patient_id}`)} style={{ background:'none', border:'none', cursor:'pointer', fontWeight:600, fontSize:'0.84rem', color:'var(--color-primary)', padding:0, fontFamily:'var(--font-body)', textDecoration:'underline' }}>{p.patient_name || '—'}</button>
                          ) : (p.patient_name || '—')}
                        </td>
                        <td style={{ ...tdSt, fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{getTutor(p.patient_id)}</td>
                        <td style={{ ...tdSt, fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{p.solicitado_por || <span style={{ fontStyle:'italic', fontSize:'0.72rem' }}>—</span>}</td>
                        <td style={tdSt}>{p.tipo_examen}</td>
                        <td style={tdSt}>
                          <span style={{ background: p.procesamiento === 'Externo' ? '#e8f0ff' : '#e8f5ee', color: p.procesamiento === 'Externo' ? '#2e5cbf' : '#2e7d50', padding:'2px 9px', borderRadius:999, fontSize:'0.7rem', fontWeight:600 }}>
                            {p.procesamiento || 'Interno'}
                          </span>
                        </td>
                        <td style={{ ...tdSt, fontSize:'0.78rem' }}><SedeCelda p={p} /></td>
                        <td style={{ ...tdSt, textAlign:'center' }}>
                          <button onClick={() => setExpanded(prev => prev === p.id ? null : p.id)} disabled={!hasFile}
                            style={{ padding:'0.35rem 0.85rem', background: isOpen ? '#dbeafe' : hasFile ? '#e8f0ff' : 'var(--color-bg)', color: isOpen ? '#1565c0' : hasFile ? '#1565c0' : 'var(--color-text-muted)', border:`1px solid ${isOpen ? '#1565c0' : hasFile ? '#1565c0' : 'var(--color-border)'}`, borderRadius:'var(--radius-sm)', cursor: hasFile ? 'pointer' : 'default', fontSize:'0.78rem', fontWeight:700, whiteSpace:'nowrap' }}
                            title={hasFile ? 'Ver imagen y reportar' : 'Sin archivo adjunto aún'}>
                            {hasFile ? (isOpen ? '▲ Cerrar' : `👁 Ver${archivos.length > 1 ? ` (${archivos.length})` : ''}`) : '⏳ Sin archivo'}
                          </button>
                        </td>
                        <td style={{ ...tdSt, textAlign:'center' }}>
                          <button onClick={() => handleDeletePedido(p)} title="Eliminar solicitud" style={{ background:'none', border:'none', cursor:'pointer', color:'#c0392b', fontSize:'1rem', padding:'0.2rem 0.5rem', borderRadius:'var(--radius-sm)', lineHeight:1 }}>🗑</button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={10} style={{ padding:0, borderTop:'none' }}>
                            <div style={{ padding:'1.25rem 1.5rem', background:'#e8f0ff', borderTop:'2px solid #1565c0', borderBottom:'1px solid #bfdbfe' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
                                <div style={{ fontSize:'0.82rem', color:'var(--color-text-muted)' }}>
                                  🔬 <strong style={{ color:'var(--color-text)' }}>{img?.tipo || p.tipo_examen}</strong>
                                  {img?.fecha && ` · Subido el ${img.fecha}`}
                                  {img?.created_by && ` · por ${img.created_by}`}
                                </div>
                                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                                  {archivos.map((f, fi) => (
                                    <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer"
                                      style={{ padding:'0.3rem 0.75rem', background:'#1565c0', color:'white', borderRadius:'var(--radius-sm)', fontSize:'0.75rem', fontWeight:600, textDecoration:'none', whiteSpace:'nowrap' }}>
                                      ↗ {archivos.length > 1 ? f.name : 'Ver archivo'}
                                    </a>
                                  ))}
                                </div>
                              </div>

                              {img?.resultados && (
                                <div style={{ background:'white', border:'1px solid #bfdbfe', borderRadius:'var(--radius-sm)', padding:'0.65rem 0.85rem', fontSize:'0.82rem', color:'var(--color-text)', marginBottom:'1rem', lineHeight:1.6 }}>
                                  <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#1565c0', marginBottom:'0.3rem' }}>Hallazgos / Interpretación</div>
                                  {img.resultados}
                                </div>
                              )}

                              {/* Iframes / links para imágenes */}
                              {archivos.map((f, fi) => {
                                const isPdf = f.name?.toLowerCase().endsWith('.pdf') || f.url?.includes('.pdf');
                                return (
                                  <div key={fi} style={{ border:'1px solid #bfdbfe', borderRadius:'var(--radius-md)', overflow:'hidden', background:'white', marginBottom:'0.75rem' }}>
                                    {archivos.length > 1 && (
                                      <div style={{ padding:'0.4rem 0.85rem', background:'#dbeafe', fontSize:'0.75rem', fontWeight:600, color:'#1565c0', borderBottom:'1px solid #bfdbfe' }}>
                                        📎 {f.name}
                                      </div>
                                    )}
                                    {isPdf ? (
                                      <iframe src={f.url} title={`Imagen ${fi + 1}`} style={{ width:'100%', height:520, border:'none', display:'block' }} />
                                    ) : (
                                      <img src={f.url} alt={f.name} style={{ width:'100%', maxHeight:520, objectFit:'contain', display:'block' }} />
                                    )}
                                  </div>
                                );
                              })}

                              {img && (
                                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.5rem' }}>
                                  <button onClick={() => { setEditingImg({ img, pedido: p }); setEditModal(true); }}
                                    style={{ padding:'0.35rem 0.85rem', background:'white', border:'1px solid #b45309', color:'#b45309', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.78rem', fontWeight:700, fontFamily:'var(--font-body)' }}>
                                    ✏️ Editar imagen
                                  </button>
                                </div>
                              )}

                              <div style={{ marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid #bfdbfe' }}>
                                {isMedico ? (
                                  <>
                                    <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#1565c0', marginBottom:'0.4rem' }}>
                                      Reporte médico para el paciente *
                                    </label>
                                    <textarea value={reporte} onChange={e => setReportes(r => ({ ...r, [p.id]: e.target.value }))} rows={4}
                                      placeholder="Escriba aquí el reporte / interpretación que se entregará al propietario..."
                                      style={{ width:'100%', padding:'0.65rem 0.85rem', border:'1px solid #1565c0', borderRadius:'var(--radius-md)', fontFamily:'var(--font-body)', fontSize:'0.875rem', resize:'vertical', boxSizing:'border-box', marginBottom:'0.85rem' }} />
                                    <div style={{ display:'flex', justifyContent:'flex-end' }}>
                                      <button onClick={() => handleReportar(p)} disabled={saving === p.id}
                                        style={{ padding:'0.55rem 1.4rem', background: saving === p.id ? '#aaa' : '#1565c0', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor: saving === p.id ? 'not-allowed' : 'pointer', fontSize:'0.875rem', fontWeight:700, fontFamily:'var(--font-body)' }}>
                                        {saving === p.id ? '⏳ Guardando...' : '✓ Marcar como Reportado'}
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ background:'#dbeafe', border:'1px solid #bfdbfe', borderRadius:'var(--radius-sm)', padding:'0.75rem 1rem', fontSize:'0.82rem', color:'#1565c0' }}>
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

      {/* Solicitados (esperando imagen) */}
      {solicitados.length > 0 && (
        <Card title={`⏳ Solicitados — esperando imagen (${solicitados.length})`} style={{ marginBottom:'1.5rem' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>
                <th style={{ ...thSt, width:50 }}>#</th>
                <th style={thSt}>Fecha solicitado</th>
                <th style={thSt}>Mascota</th>
                <th style={thSt}>Tutor</th>
                <th style={thSt}>Solicitado por</th>
                <th style={thSt}>Examen</th>
                <th style={thSt}>Procesamiento</th>
                <th style={thSt}>Sede</th>
                <th style={thSt}></th>
              </tr></thead>
              <tbody>
                {solicitados.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...tdSt, color:'var(--color-text-muted)', fontSize:'0.72rem', fontWeight:700, whiteSpace:'nowrap' }}>#{p.id}</td>
                    <td style={tdSt}>{p.fecha_solicitado || '—'}{p.hora_solicitado ? ` ${p.hora_solicitado}` : ''}</td>
                    <td style={{ ...tdSt, fontWeight:600 }}>
                      {p.patient_id ? (
                        <button onClick={() => navigate(`/patients/${p.patient_id}`)} style={{ background:'none', border:'none', cursor:'pointer', fontWeight:600, fontSize:'0.84rem', color:'var(--color-primary)', padding:0, fontFamily:'var(--font-body)', textDecoration:'underline' }}>{p.patient_name || '—'}</button>
                      ) : (p.patient_name || '—')}
                    </td>
                    <td style={{ ...tdSt, fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{getTutor(p.patient_id)}</td>
                    <td style={{ ...tdSt, fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{p.solicitado_por || <span style={{ fontStyle:'italic', fontSize:'0.72rem' }}>—</span>}</td>
                    <td style={tdSt}>{p.tipo_examen}</td>
                    <td style={tdSt}>
                      <span style={{ background: p.procesamiento === 'Externo' ? '#e8f0ff' : '#e8f5ee', color: p.procesamiento === 'Externo' ? '#2e5cbf' : '#2e7d50', padding:'2px 9px', borderRadius:999, fontSize:'0.7rem', fontWeight:600 }}>
                        {p.procesamiento || 'Interno'}
                      </span>
                    </td>
                    <td style={{ ...tdSt, fontSize:'0.78rem' }}><SedeCelda p={p} /></td>
                    <td style={{ ...tdSt, textAlign:'center' }}>
                      <button onClick={() => handleDeletePedido(p)} title="Eliminar solicitud" style={{ background:'none', border:'none', cursor:'pointer', color:'#c0392b', fontSize:'1rem', padding:'0.2rem 0.5rem', borderRadius:'var(--radius-sm)', lineHeight:1 }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Historial */}
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
                  <thead><tr>
                    <th style={{ ...thSt, width:50 }}>#</th>
                    <th style={thSt}>Fecha solicitado</th>
                    <th style={thSt}>Mascota</th>
                    <th style={thSt}>Tutor</th>
                    <th style={thSt}>Examen</th>
                    <th style={thSt}>Fecha reportado</th>
                    <th style={thSt}>Reportado por</th>
                    <th style={thSt}>Reporte</th>
                  </tr></thead>
                  <tbody>
                    {ultimos30.map(p => (
                      <tr key={p.id}>
                        <td style={{ ...tdSt, color:'var(--color-text-muted)', fontSize:'0.72rem', fontWeight:700, whiteSpace:'nowrap' }}>#{p.id}</td>
                        <td style={tdSt}>{p.fecha_solicitado || '—'}</td>
                        <td style={{ ...tdSt, fontWeight:600 }}>
                          {p.patient_id ? (
                            <button onClick={() => navigate(`/patients/${p.patient_id}`)} style={{ background:'none', border:'none', cursor:'pointer', fontWeight:600, fontSize:'0.84rem', color:'var(--color-primary)', padding:0, fontFamily:'var(--font-body)', textDecoration:'underline' }}>{p.patient_name || '—'}</button>
                          ) : (p.patient_name || '—')}
                        </td>
                        <td style={{ ...tdSt, fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{getTutor(p.patient_id)}</td>
                        <td style={tdSt}>{p.tipo_examen}</td>
                        <td style={{ ...tdSt, color:'#2e7d50', fontWeight:600 }}>{p.fecha_reportado || '—'}</td>
                        <td style={{ ...tdSt, color:'var(--color-text-muted)' }}>{p.reportado_por || '—'}</td>
                        <td style={{ ...tdSt, color:'var(--color-text-muted)', maxWidth:220 }}>
                          {p.reporte_medico
                            ? <span style={{ fontSize:'0.78rem' }}>{p.reporte_medico.length > 80 ? p.reporte_medico.slice(0, 80) + '…' : p.reporte_medico}</span>
                            : <span style={{ fontStyle:'italic', fontSize:'0.75rem' }}>Sin reporte</span>}
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

      {/* Modal editar imagen */}
      {editModal && editingImg && (
        <ImagenesResultModal
          isOpen={editModal}
          onClose={() => { setEditModal(false); setEditingImg(null); }}
          onSave={() => {}}
          onEdit={async (imgId, changes) => { await editImagen(imgId, changes); setEditModal(false); setEditingImg(null); }}
          pet={{ id: editingImg.pedido.patient_id, name: editingImg.pedido.patient_name, species: '' }}
          pedidos={[]}
          initialData={editingImg.img}
          imgId={editingImg.img.id}
        />
      )}
    </div>
  );
}
