import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const C = {
  bg:'#FFF9F4', teal:'#316d74', tealDark:'#1e4e54', tealLight:'#e8f5f6',
  cream:'#FDF6EE', border:'#E8D9C8', gold:'#B8873A',
  text:'#2D2D2D', muted:'#8A8076', danger:'#C0392B', dangerBg:'#FFF0EE',
};
const inp = {
  width:'100%', padding:'0.8rem 1rem', border:`1.5px solid ${C.border}`,
  borderRadius:12, fontSize:'0.95rem', fontFamily:'inherit', outline:'none',
  boxSizing:'border-box', background:'white', color:C.text,
};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

const fmt = (d) => {
  if (!d) return '—';
  try { return new Date(d + 'T12:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return d; }
};
const icon = (sp) => {
  const s = (sp||'').toLowerCase();
  return s.includes('perro')||s.includes('canino') ? '🐶' : s.includes('gato')||s.includes('felino') ? '🐱' : '🐾';
};
const today = () => new Date().toISOString().split('T')[0];

export default function PortalPage() {
  const [cedula,    setCedula]    = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [client,    setClient]    = useState(null);
  const [data,      setData]      = useState(null);
  const [firstLogin,setFirstLogin]= useState(false);
  const [tabs,      setTabs]      = useState({});   // { petId: activeTab }

  const [pwModal,   setPwModal]   = useState(false);
  const [newPw,     setNewPw]     = useState('');
  const [newPw2,    setNewPw2]    = useState('');
  const [pwError,   setPwError]   = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwOk,      setPwOk]      = useState(false);
  const [solModal,  setSolModal]  = useState(false);
  const [solPet,    setSolPet]    = useState(null);

  const getTab = (pid) => tabs[pid] || 'resumen';
  const setTab = (pid, t) => setTabs(prev => ({ ...prev, [pid]: t }));

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const doc = cedula.trim(), pw = password.trim();
    if (!doc || !pw) return setError('Ingresa tu cédula y contraseña.');
    setError(''); setLoading(true);
    const { data: cls } = await supabase.from('clients').select('id,name,phone,email,document,portal_password').eq('document', doc);
    if (!cls?.length) { setLoading(false); return setError('Cédula o contraseña incorrecta.'); }
    const cl = cls[0];
    let ok = false, isFirst = false;
    if (!cl.portal_password) { ok = pw === doc; isFirst = ok; }
    else { ok = (await sha256(pw)) === cl.portal_password; }
    if (!ok) { setLoading(false); return setError('Cédula o contraseña incorrecta.'); }
    await loadData(cl);
    setFirstLogin(isFirst);
    if (isFirst) setPwModal(true);
    setLoading(false);
  };

  const loadData = async (cl) => {
    const { data: pets } = await supabase.from('patients').select('id,name,species,breed,age,weight,status').eq('client_id', cl.id);
    if (!pets?.length) { setClient(cl); setData({ pets: [] }); return; }
    const ids = pets.map(p => p.id);
    const names = pets.map(p => p.name);
    const tod = today();

    const [vR, cR, pR, lR, aR] = await Promise.all([
      supabase.from('vaccines').select('patient_id,vaccine_name,date_applied,next_dose').in('patient_id', ids).order('date_applied', { ascending: false }),
      supabase.from('consultations').select('patient_id,motivo,anamnesis,diagnostico_final,created_at').in('patient_id', ids).eq('estado','completada').order('created_at', { ascending: false }),
      supabase.from('procedimientos').select('patient_id,tipo,descripcion,fecha,anestesia').in('patient_id', ids).order('fecha', { ascending: false }),
      supabase.from('laboratorios_pedidos').select('patient_id,tipo_examen,estado,fecha_solicitado').in('patient_id', ids).neq('estado','Solicitado').order('fecha_solicitado', { ascending: false }),
      supabase.from('appointments').select('patient_name,date,time,service,estado').in('patient_name', names).gte('date', tod).order('date', { ascending: true }).limit(20),
    ]);

    const vac=vR.data||[], con=cR.data||[], proc=pR.data||[], lab=lR.data||[], apt=aR.data||[];

    setClient(cl);
    setData({ pets: pets.map(p => ({
      ...p,
      lastVac:    vac.filter(v => v.patient_id===p.id && !v.vaccine_name?.toLowerCase().includes('desparasit'))[0],
      lastDespar: vac.filter(v => v.patient_id===p.id &&  v.vaccine_name?.toLowerCase().includes('desparasit'))[0],
      consults:   con.filter(c => c.patient_id===p.id),
      procs:      proc.filter(x => x.patient_id===p.id),
      labs:       lab.filter(l => l.patient_id===p.id),
      agenda:     apt.filter(a => a.patient_name===p.name),
    }))});
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePw = async () => {
    setPwError('');
    if (newPw.length < 6)          return setPwError('Mínimo 6 caracteres.');
    if (newPw !== newPw2)          return setPwError('Las contraseñas no coinciden.');
    if (newPw === client.document) return setPwError('No puede ser igual a tu cédula.');
    setPwSaving(true);
    const hashed = await sha256(newPw);
    const { error } = await supabase.from('clients').update({ portal_password: hashed }).eq('id', client.id);
    setPwSaving(false);
    if (error) return setPwError('Error al guardar. Intenta de nuevo.');
    setClient(c => ({ ...c, portal_password: hashed }));
    setFirstLogin(false); setPwOk(true);
    setTimeout(() => { setPwModal(false); setPwOk(false); setNewPw(''); setNewPw2(''); }, 1600);
  };

  const logout = () => { setClient(null); setData(null); setCedula(''); setPassword(''); setFirstLogin(false); };
  const openPw = () => { setNewPw(''); setNewPw2(''); setPwError(''); setPwOk(false); setPwModal(true); };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text }}>

      {/* NAV */}
      <nav style={{ background:C.tealDark, padding:'0.85rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 12px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
          <img src="/logos/pp-02.svg" alt="Logo" style={{ height:36, filter:'brightness(0) invert(1)' }} />
          <div style={{ borderLeft:'1px solid rgba(255,255,255,0.2)', paddingLeft:'0.85rem' }}>
            <div style={{ color:'white', fontWeight:700, fontSize:'0.9rem' }}>Pets &amp; Pets</div>
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.66rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Portal de Propietarios</div>
          </div>
        </div>
        {client && (
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button onClick={openPw} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)', color:'white', padding:'0.38rem 0.85rem', borderRadius:8, cursor:'pointer', fontSize:'0.73rem', fontFamily:'inherit', fontWeight:600 }}>🔑 Contraseña</button>
            <button onClick={logout} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.75)', padding:'0.38rem 0.8rem', borderRadius:8, cursor:'pointer', fontSize:'0.73rem', fontFamily:'inherit' }}>Salir</button>
          </div>
        )}
      </nav>

      {/* LOGIN */}
      {!client && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'3rem 1rem', minHeight:'calc(100vh - 62px)' }}>
          <div style={{ width:'100%', maxWidth:420 }}>
            <div style={{ background:'white', borderRadius:20, boxShadow:'0 4px 40px rgba(49,109,116,0.12)', overflow:'hidden' }}>
              <div style={{ background:`linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, padding:'2rem', textAlign:'center' }}>
                <img src="/logos/pp-02.svg" alt="Logo" style={{ height:60, filter:'brightness(0) invert(1)', marginBottom:'1rem' }} />
                <h1 style={{ color:'white', fontWeight:800, fontSize:'1.2rem', margin:'0 0 0.25rem' }}>Portal de Propietarios</h1>
                <p style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.8rem', margin:0 }}>Consulta la información de tu mascota</p>
              </div>
              <div style={{ padding:'2rem' }}>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.4rem' }}>Número de cédula</label>
                  <input type="text" inputMode="numeric" value={cedula} onChange={e=>{setCedula(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&document.getElementById('pw-inp').focus()} placeholder="Ej: 16662784" style={inp} autoComplete="username" />
                </div>
                <div style={{ marginBottom:'1.5rem' }}>
                  <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.4rem' }}>Contraseña</label>
                  <input id="pw-inp" type="password" value={password} onChange={e=>{setPassword(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Tu contraseña" style={inp} autoComplete="current-password" />
                </div>
                {error && <div style={{ background:C.dangerBg, border:`1px solid ${C.danger}40`, borderRadius:10, padding:'0.6rem 0.9rem', color:C.danger, fontSize:'0.82rem', marginBottom:'1rem' }}>⚠️ {error}</div>}
                <button onClick={handleLogin} disabled={loading} style={{ width:'100%', padding:'0.88rem', background:loading?'#aaa':`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, cursor:loading?'not-allowed':'pointer', fontWeight:700, fontSize:'0.95rem', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(49,109,116,0.3)' }}>
                  {loading ? 'Verificando…' : 'Ingresar →'}
                </button>
                <div style={{ marginTop:'1.25rem', background:C.cream, borderRadius:10, padding:'0.8rem 1rem', fontSize:'0.75rem', color:C.muted, lineHeight:1.7, textAlign:'center' }}>
                  🔐 <strong>¿Primera vez?</strong> Tu contraseña es tu número de cédula.<br/>¿Olvidaste tu contraseña? Comunícate con nosotros.
                </div>
              </div>
            </div>
            <p style={{ textAlign:'center', color:C.muted, fontSize:'0.7rem', marginTop:'1rem' }}>© Pets &amp; Pets · Sistema Veterinario</p>
          </div>
        </div>
      )}

      {/* PORTAL */}
      {client && data && (
        <div style={{ maxWidth:740, margin:'0 auto', padding:'2rem 1rem 3rem' }}>

          {/* Greeting */}
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', background:'white', borderRadius:16, padding:'1.1rem 1.5rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderLeft:`4px solid ${C.teal}` }}>
            <span style={{ fontSize:'2.2rem' }}>👋</span>
            <div>
              <div style={{ fontWeight:800, fontSize:'1.1rem', color:C.tealDark }}>Hola, {client.name.split(' ')[0]}</div>
              <div style={{ color:C.muted, fontSize:'0.78rem' }}>CC {client.document} · Resumen de tus mascotas</div>
            </div>
          </div>

          {data.pets.length === 0 ? (
            <div style={{ background:'white', borderRadius:16, padding:'3rem', textAlign:'center', color:C.muted }}>
              <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>🐾</div>
              <p>No encontramos mascotas a tu nombre. Comunícate con la clínica.</p>
            </div>
          ) : data.pets.map(pet => {
            const activeTab = getTab(pet.id);
            const TABS = [
              { key:'resumen',        label:'Resumen',       icon:'🏠' },
              { key:'consultas',      label:'Consultas',     icon:'📋', count: pet.consults.length },
              { key:'procedimientos', label:'Procedimientos',icon:'🔬', count: pet.procs.length },
              { key:'laboratorios',   label:'Laboratorios',  icon:'🧪', count: pet.labs.length },
              { key:'agenda',         label:'Agenda',        icon:'📅', count: pet.agenda.length },
            ];
            return (
              <div key={pet.id} style={{ background:'white', borderRadius:20, boxShadow:'0 2px 20px rgba(0,0,0,0.07)', marginBottom:'1.75rem', overflow:'hidden' }}>

                {/* Pet header */}
                <div style={{ background:`linear-gradient(135deg,${C.teal}18,${C.cream})`, borderBottom:`1px solid ${C.border}`, padding:'1.1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.9rem' }}>
                    <div style={{ width:48, height:48, borderRadius:'50%', background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', boxShadow:'0 3px 10px rgba(49,109,116,0.28)' }}>
                      {icon(pet.species)}
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:'1.05rem', color:C.tealDark }}>{pet.name}</div>
                      <div style={{ fontSize:'0.75rem', color:C.muted }}>
                        {[pet.species, pet.breed, pet.age&&`${pet.age} años`, pet.weight&&`${pet.weight} kg`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  {pet.status === 'hospitalizado' && (
                    <span style={{ background:'#fce4e4', color:'#c0392b', fontSize:'0.68rem', fontWeight:700, padding:'3px 10px', borderRadius:999 }}>🏥 Hospitalizado</span>
                  )}
                </div>

                {/* Tabs */}
                <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, overflowX:'auto', scrollbarWidth:'none' }}>
                  {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(pet.id, t.key)} style={{
                      padding:'0.7rem 1rem', border:'none', background:'transparent',
                      cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', fontWeight:activeTab===t.key?700:500,
                      color: activeTab===t.key ? C.teal : C.muted,
                      borderBottom: activeTab===t.key ? `2.5px solid ${C.teal}` : '2.5px solid transparent',
                      whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'0.3rem',
                      transition:'all 0.15s',
                    }}>
                      {t.icon} {t.label}
                      {t.count > 0 && (
                        <span style={{ background: activeTab===t.key ? C.teal : '#e0e0e0', color: activeTab===t.key ? 'white' : '#888', borderRadius:999, fontSize:'0.65rem', padding:'1px 6px', fontWeight:700 }}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ padding:'1.5rem' }}>

                  {/* ── RESUMEN ── */}
                  {activeTab === 'resumen' && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                      <MiniCard icon="💉" label="Última vacuna"
                        main={pet.lastVac?.vaccine_name || 'Sin registro'}
                        sub={pet.lastVac ? fmt(pet.lastVac.date_applied) : null}
                        note={pet.lastVac?.next_dose ? `Próxima: ${fmt(pet.lastVac.next_dose)}` : null}
                        empty={!pet.lastVac} C={C} />
                      <MiniCard icon="🪱" label="Última desparasitación"
                        main={pet.lastDespar?.vaccine_name || 'Sin registro'}
                        sub={pet.lastDespar ? fmt(pet.lastDespar.date_applied) : null}
                        note={pet.lastDespar?.next_dose ? `Próxima: ${fmt(pet.lastDespar.next_dose)}` : null}
                        empty={!pet.lastDespar} C={C} />
                      <MiniCard icon="📋" label="Consultas" main={`${pet.consults.length} registradas`} sub="en su historia clínica" empty={pet.consults.length===0} C={C} />
                      <MiniCard icon="📅" label="Próximas citas" main={pet.agenda.length > 0 ? `${pet.agenda.length} agendada${pet.agenda.length>1?'s':''}` : 'Sin citas próximas'} sub={pet.agenda[0] ? `${fmt(pet.agenda[0].date)} · ${pet.agenda[0].service}` : null} empty={pet.agenda.length===0} C={C} />
                    </div>
                  )}

                  {/* ── CONSULTAS ── */}
                  {activeTab === 'consultas' && (
                    <div>
                      {pet.consults.length === 0 ? <Empty label="Sin consultas registradas" /> : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                          {pet.consults.map((c, i) => (
                            <div key={i} style={{ border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                              <div style={{ background:C.cream, padding:'0.7rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${C.border}` }}>
                                <span style={{ fontWeight:700, fontSize:'0.85rem', color:C.tealDark }}>📋 {c.motivo || 'Consulta general'}</span>
                                <span style={{ fontSize:'0.72rem', color:C.muted }}>{fmt(c.created_at)}</span>
                              </div>
                              <div style={{ padding:'0.9rem 1rem', display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                                {c.anamnesis && (
                                  <div>
                                    <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:C.muted, marginBottom:'0.3rem' }}>Motivo de consulta</div>
                                    <div style={{ fontSize:'0.85rem', color:C.text, lineHeight:1.55 }}>{c.anamnesis}</div>
                                  </div>
                                )}
                                {c.diagnostico_final && (
                                  <div style={{ background:C.tealLight, border:`1px solid ${C.teal}30`, borderRadius:10, padding:'0.6rem 0.85rem' }}>
                                    <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:C.teal, marginBottom:'0.25rem' }}>Diagnóstico</div>
                                    <div style={{ fontSize:'0.88rem', fontWeight:600, color:C.tealDark }}>{c.diagnostico_final}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── PROCEDIMIENTOS ── */}
                  {activeTab === 'procedimientos' && (
                    <div>
                      {pet.procs.length === 0 ? <Empty label="Sin procedimientos registrados" /> : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                          {pet.procs.map((p, i) => (
                            <div key={i} style={{ border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                              <div style={{ background:C.cream, padding:'0.65rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${C.border}` }}>
                                <span style={{ fontWeight:700, fontSize:'0.85rem', color:C.tealDark }}>
                                  {p.tipo === 'Cirugía' ? '🔪' : p.tipo === 'Profilaxis' ? '🦷' : '🔬'} {p.tipo}
                                </span>
                                <span style={{ fontSize:'0.72rem', color:C.muted }}>{fmt(p.fecha)}</span>
                              </div>
                              <div style={{ padding:'0.85rem 1rem' }}>
                                <div style={{ fontSize:'0.85rem', color:C.text, lineHeight:1.55 }}>{p.descripcion}</div>
                                {p.anestesia && (
                                  <div style={{ marginTop:'0.5rem', fontSize:'0.75rem', color:C.muted }}>
                                    💊 Anestesia: {p.anestesia}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── LABORATORIOS ── */}
                  {activeTab === 'laboratorios' && (
                    <div>
                      {pet.labs.length === 0 ? <Empty label="Sin laboratorios registrados" /> : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                          {pet.labs.map((l, i) => {
                            const est = {
                              'Subido SIN REPORTAR': { bg:'#fff8e1', color:'#b8860b', label:'Pendiente de reporte' },
                              'Reportado':           { bg:'#e8f5ee', color:'#2e7d50', label:'Reportado' },
                            }[l.estado] || { bg:C.cream, color:C.muted, label:l.estado };
                            return (
                              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.75rem 1rem', border:`1px solid ${C.border}`, borderRadius:12, gap:'0.75rem', flexWrap:'wrap' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                                  <span style={{ fontSize:'1.1rem' }}>🧪</span>
                                  <span style={{ fontWeight:600, fontSize:'0.88rem', color:C.tealDark }}>{l.tipo_examen}</span>
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                                  <span style={{ fontSize:'0.72rem', color:C.muted }}>{fmt(l.fecha_solicitado)}</span>
                                  <span style={{ background:est.bg, color:est.color, fontSize:'0.68rem', fontWeight:700, padding:'2px 9px', borderRadius:999 }}>{est.label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── AGENDA ── */}
                  {activeTab === 'agenda' && (
                    <div>
                      {pet.agenda.length === 0 ? <Empty label="Sin citas próximas agendadas" /> : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                          {pet.agenda.map((a, i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.85rem 1rem', border:`1px solid ${C.border}`, borderRadius:12, background:C.cream }}>
                              <div style={{ textAlign:'center', minWidth:48 }}>
                                <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', color:C.muted }}>
                                  {new Date(a.date+'T12:00').toLocaleDateString('es-CO',{month:'short'})}
                                </div>
                                <div style={{ fontSize:'1.4rem', fontWeight:800, color:C.tealDark, lineHeight:1 }}>
                                  {new Date(a.date+'T12:00').getDate()}
                                </div>
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:700, fontSize:'0.88rem', color:C.tealDark }}>{a.service}</div>
                                <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.15rem' }}>🕐 {a.time || '—'}</div>
                              </div>
                              {a.estado && (
                                <span style={{ background:C.tealLight, color:C.teal, fontSize:'0.68rem', fontWeight:700, padding:'2px 9px', borderRadius:999 }}>{a.estado}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Footer */}
                <div style={{ padding:'0 1.5rem 1.5rem', textAlign:'right' }}>
                  <button onClick={() => { setSolPet(pet); setSolModal(true); }} style={{ padding:'0.55rem 1.1rem', background:'white', border:`2px solid ${C.teal}`, color:C.teal, borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:'0.78rem', fontFamily:'inherit' }}>
                    📄 Solicitar Historia Clínica
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: cambiar contraseña */}
      {pwModal && (
        <div onClick={() => !firstLogin && setPwModal(false)} style={{ position:'fixed', inset:0, background:'rgba(30,78,84,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(3px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:20, padding:'2rem', maxWidth:380, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            {firstLogin && <div style={{ textAlign:'center', marginBottom:'1.25rem' }}><div style={{ fontSize:'2.2rem', marginBottom:'0.3rem' }}>🎉</div><div style={{ fontWeight:800, color:C.tealDark, fontSize:'1.05rem' }}>¡Bienvenido por primera vez!</div><div style={{ color:C.muted, fontSize:'0.8rem', marginTop:'0.3rem', lineHeight:1.5 }}>Elige una contraseña personal antes de continuar.</div></div>}
            {!firstLogin && <h3 style={{ fontWeight:800, color:C.tealDark, margin:'0 0 1.25rem', fontSize:'1rem' }}>🔑 Cambiar contraseña</h3>}
            {pwOk ? (
              <div style={{ textAlign:'center', padding:'1.25rem 0' }}><div style={{ fontSize:'2.5rem', marginBottom:'0.4rem' }}>✅</div><div style={{ fontWeight:700, color:'#2e7d50' }}>¡Contraseña actualizada!</div></div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
                <div><label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'0.35rem', letterSpacing:'0.05em' }}>Nueva contraseña</label><input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Mínimo 6 caracteres" style={inp} /></div>
                <div><label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:'0.35rem', letterSpacing:'0.05em' }}>Confirmar contraseña</label><input type="password" value={newPw2} onChange={e=>setNewPw2(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleChangePw()} placeholder="Repite la contraseña" style={inp} /></div>
                {pwError && <div style={{ color:C.danger, fontSize:'0.78rem', background:C.dangerBg, borderRadius:8, padding:'0.5rem 0.75rem' }}>⚠️ {pwError}</div>}
                <div style={{ display:'flex', gap:'0.6rem', justifyContent:'flex-end', marginTop:'0.25rem' }}>
                  {!firstLogin && <button onClick={()=>setPwModal(false)} style={{ padding:'0.6rem 1rem', background:'white', border:`1px solid ${C.border}`, borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontSize:'0.82rem', color:C.muted }}>Cancelar</button>}
                  <button onClick={handleChangePw} disabled={pwSaving} style={{ padding:'0.6rem 1.25rem', background:C.teal, color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.82rem', fontFamily:'inherit', opacity:pwSaving?0.7:1 }}>{pwSaving ? 'Guardando…' : 'Guardar'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: solicitar HC */}
      {solModal && (
        <div onClick={()=>setSolModal(false)} style={{ position:'fixed', inset:0, background:'rgba(30,78,84,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(3px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:20, padding:'2rem', maxWidth:360, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', margin:'0 auto 1rem' }}>✅</div>
            <h3 style={{ fontWeight:800, color:C.tealDark, fontSize:'1.05rem', margin:'0 0 0.5rem' }}>¡Solicitud enviada!</h3>
            <p style={{ color:C.muted, fontSize:'0.83rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
              Recibimos tu solicitud de historia clínica para <strong style={{ color:C.text }}>{solPet?.name}</strong>. El equipo de <strong>Pets &amp; Pets</strong> se comunicará contigo pronto.
            </p>
            <button onClick={()=>setSolModal(false)} style={{ padding:'0.65rem 2rem', background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:'white', border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:'0.88rem', fontFamily:'inherit' }}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ icon, label, main, sub, note, empty, C }) {
  return (
    <div style={{ background:empty?'#FAFAF9':C.cream, border:`1px solid ${empty?'#EBEBEB':C.border}`, borderRadius:14, padding:'0.9rem' }}>
      <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.muted, marginBottom:'0.4rem' }}>{icon} {label}</div>
      <div style={{ fontWeight:700, fontSize:'0.88rem', color:empty?'#C0C0C0':C.tealDark, lineHeight:1.3 }}>{main}</div>
      {sub  && <div style={{ fontSize:'0.74rem', color:C.muted, marginTop:'0.2rem' }}>{sub}</div>}
      {note && <div style={{ fontSize:'0.7rem', color:C.gold, marginTop:'0.25rem', fontWeight:600 }}>📅 {note}</div>}
    </div>
  );
}

function Empty({ label }) {
  return (
    <div style={{ textAlign:'center', padding:'2rem 1rem', color:'#C0C0C0' }}>
      <div style={{ fontSize:'2rem', marginBottom:'0.4rem' }}>—</div>
      <div style={{ fontSize:'0.82rem' }}>{label}</div>
    </div>
  );
}
