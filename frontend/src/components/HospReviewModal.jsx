import VetName from './VetName';

const fmtCOP = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(v || 0);

const STATUS_LABEL = {
  activo:     { bg:'#fce4e4', color:'#c0392b', label:'Hospitalizado' },
  cobrada:    { bg:'#e8f5ee', color:'#2e7d50',  label:'Alta — cobrada'  },
  no_cobrada: { bg:'#fff8e1', color:'#b8860b',  label:'Alta — sin cobrar' },
  fallecido:  { bg:'#f5f5f5', color:'#555',     label:'Fallecido'      },
  deslinde:   { bg:'#fff3e0', color:'#b45309',  label:'Deslinde'       },
};

export default function HospReviewModal({ hosp, onClose }) {
  if (!hosp) return null;

  const apps     = hosp.aplicaciones || [];
  const consumo  = hosp.consumo       || [];
  const abonos   = hosp.abonos        || [];
  const st       = STATUS_LABEL[hosp.status] || STATUS_LABEL.cobrada;

  const totalAbonos  = abonos.reduce((s, a) => s + (parseFloat(a.valor) || 0), 0);

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1200,
               display:'flex', alignItems:'flex-start', justifyContent:'center',
               padding:'2rem 1rem', backdropFilter:'blur(3px)', overflowY:'auto' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)',
                 boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:640,
                 margin:'auto', overflow:'hidden' }}
      >
        {/* Header */}
        <div style={{ padding:'1.1rem 1.5rem', background:'#fff5f5',
                      borderBottom:'1px solid #fca5a5',
                      display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.3rem' }}>
              <span style={{ background:st.bg, color:st.color, padding:'2px 9px',
                             borderRadius:999, fontSize:'0.7rem', fontWeight:700 }}>{st.label}</span>
            </div>
            <h3 style={{ fontFamily:'var(--font-title)', color:'var(--color-danger)',
                         fontSize:'1.05rem', margin:'0 0 0.1rem' }}>
              🏥 {hosp.patient_name}
            </h3>
            <p style={{ margin:0, fontSize:'0.78rem', color:'var(--color-text-muted)' }}>
              Ingreso: {hosp.ingreso_date} {hosp.ingreso_time || ''}
              {hosp.alta_date && ` · Alta: ${hosp.alta_date} ${hosp.alta_time || ''}`}
              {hosp.responsible_vet && <> · <VetName name={hosp.responsible_vet} muted /></>}
            </p>
            {hosp.motivo && (
              <p style={{ margin:'0.25rem 0 0', fontSize:'0.82rem', color:'var(--color-text)', fontWeight:600 }}>
                {hosp.motivo}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ width:32, height:32, background:'var(--color-white)',
            border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)',
            cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--color-text-muted)', flexShrink:0 }}>×</button>
        </div>

        <div style={{ padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

          {/* Aplicaciones */}
          <div>
            <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
                          letterSpacing:'0.06em', color:'#c0392b', marginBottom:'0.6rem' }}>
              💊 Aplicaciones ({apps.length})
            </div>
            {apps.length === 0 ? (
              <p style={{ fontSize:'0.8rem', color:'var(--color-text-muted)', fontStyle:'italic' }}>Sin aplicaciones registradas.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {[...apps].reverse().map((a, i) => (
                  <div key={i} style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)',
                                        padding:'0.6rem 0.85rem', fontSize:'0.8rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                      <span style={{ fontWeight:600, color:'var(--color-primary)' }}>💊 Aplicación</span>
                      <span style={{ fontSize:'0.72rem', color:'var(--color-text-muted)' }}>
                        {a.fecha} {a.hora} · <VetName name={a.aplicado_por} muted />
                      </span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.2rem' }}>
                      {(a.medicamentos || []).map((m, mi) => (
                        <span key={mi} style={{ padding:'0.2rem 0.4rem', background:'var(--color-bg)',
                                                borderRadius:'var(--radius-sm)' }}>
                          · {m.medicamento} — {m.dosis} {m.unidad}
                        </span>
                      ))}
                    </div>
                    {a.notas && <p style={{ margin:'0.3rem 0 0', color:'var(--color-text-muted)', fontSize:'0.75rem' }}>📝 {a.notas}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Consumo */}
          <div>
            <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
                          letterSpacing:'0.06em', color:'#e67e22', marginBottom:'0.6rem' }}>
              📋 Hoja de consumo ({consumo.length} ítems)
            </div>
            {consumo.length === 0 ? (
              <p style={{ fontSize:'0.8rem', color:'var(--color-text-muted)', fontStyle:'italic' }}>Sin ítems registrados.</p>
            ) : (
              <div style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
                  <thead>
                    <tr style={{ background:'var(--color-bg)', borderBottom:'1px solid var(--color-border)' }}>
                      {['Ítem', 'Cant.', 'Fecha', 'Registrado por'].map(h => (
                        <th key={h} style={{ padding:'0.45rem 0.65rem', textAlign:'left', fontSize:'0.65rem',
                                             fontWeight:700, textTransform:'uppercase', color:'var(--color-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {consumo.map((c, i) => (
                      <tr key={i} style={{ borderBottom: i < consumo.length-1 ? '1px solid var(--color-border)' : 'none' }}>
                        <td style={{ padding:'0.45rem 0.65rem', fontWeight:500 }}>{c.descripcion}</td>
                        <td style={{ padding:'0.45rem 0.65rem', color:'var(--color-text-muted)' }}>{c.cantidad}</td>
                        <td style={{ padding:'0.45rem 0.65rem', color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>{c.fecha} {c.hora}</td>
                        <td style={{ padding:'0.45rem 0.65rem', color:'var(--color-text-muted)' }}>{c.registrado_por || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Abonos */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.6rem' }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
                            letterSpacing:'0.06em', color:'#8e44ad' }}>
                💰 Abonos ({abonos.length})
              </div>
              {abonos.length > 0 && (
                <span style={{ fontSize:'0.8rem', fontWeight:700, color:'#2e7d50' }}>
                  Total: {fmtCOP(totalAbonos)}
                </span>
              )}
            </div>
            {abonos.length === 0 ? (
              <p style={{ fontSize:'0.8rem', color:'var(--color-text-muted)', fontStyle:'italic' }}>Sin abonos registrados.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {abonos.map((a, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                        padding:'0.45rem 0.75rem', border:'1px solid var(--color-border)',
                                        borderRadius:'var(--radius-sm)', fontSize:'0.8rem' }}>
                    <div>
                      <span style={{ fontWeight:600 }}>{a.descripcion || '—'}</span>
                      <span style={{ color:'var(--color-text-muted)', fontSize:'0.72rem', marginLeft:'0.5rem' }}>
                        {a.fecha} {a.hora} · {a.registrado_por || '—'}
                      </span>
                    </div>
                    <span style={{ fontWeight:700, color:'#2e7d50', whiteSpace:'nowrap' }}>{fmtCOP(a.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid var(--color-border)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'0.55rem 1.5rem', background:'var(--color-white)',
            border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)',
            cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
