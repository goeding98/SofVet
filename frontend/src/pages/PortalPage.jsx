import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const C = {
  bg:        '#FFF9F4',
  teal:      '#316d74',
  tealDark:  '#1e4e54',
  tealLight: '#e8f5f6',
  cream:     '#FDF6EE',
  border:    '#E8D9C8',
  gold:      '#B8873A',
  text:      '#2D2D2D',
  muted:     '#8A8076',
  danger:    '#C0392B',
  dangerBg:  '#FFF0EE',
};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Shared input style ────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '0.8rem 1rem',
  border: `1.5px solid ${C.border}`, borderRadius: 12,
  fontSize: '0.95rem', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
  background: 'white', color: C.text,
  transition: 'border-color 0.15s',
};

export default function PortalPage() {
  const [cedula,    setCedula]    = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [client,    setClient]    = useState(null);
  const [data,      setData]      = useState(null);
  const [firstLogin, setFirstLogin] = useState(false);

  const [pwModal,   setPwModal]   = useState(false);
  const [newPw,     setNewPw]     = useState('');
  const [newPw2,    setNewPw2]    = useState('');
  const [pwError,   setPwError]   = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwOk,      setPwOk]      = useState(false);

  const [solModal,  setSolModal]  = useState(false);
  const [solPet,    setSolPet]    = useState(null);

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const doc = cedula.trim(), pw = password.trim();
    if (!doc || !pw) return setError('Ingresa tu cédula y contraseña.');
    setError(''); setLoading(true);

    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, phone, email, document, portal_password')
      .eq('document', doc);

    if (!clients?.length) { setLoading(false); return setError('Cédula o contraseña incorrecta.'); }
    const cl = clients[0];

    let ok = false, isFirst = false;
    if (!cl.portal_password) {
      ok = pw === doc; isFirst = ok;
    } else {
      ok = (await sha256(pw)) === cl.portal_password;
    }
    if (!ok) { setLoading(false); return setError('Cédula o contraseña incorrecta.'); }

    await loadData(cl);
    setFirstLogin(isFirst);
    if (isFirst) setPwModal(true);
    setLoading(false);
  };

  const loadData = async (cl) => {
    const { data: pets } = await supabase
      .from('patients').select('id,name,species,breed,age,weight,status').eq('client_id', cl.id);
    if (!pets?.length) { setClient(cl); setData({ pets: [] }); return; }
    const ids = pets.map(p => p.id);
    const [vR, cR, lR] = await Promise.all([
      supabase.from('vaccines').select('patient_id,vaccine_name,date_applied,next_dose').in('patient_id', ids).order('date_applied', { ascending: false }),
      supabase.from('consultations').select('patient_id,motivo,created_at').in('patient_id', ids).eq('estado','completada').order('created_at', { ascending: false }),
      supabase.from('laboratorios_pedidos').select('patient_id').in('patient_id', ids).neq('estado','Solicitado'),
    ]);
    const vac = vR.data || [], con = cR.data || [], lab = lR.data || [];
    setClient(cl);
    setData({ pets: pets.map(p => ({
      ...p,
      lastVac:    vac.filter(v => v.patient_id === p.id && !v.vaccine_name?.toLowerCase().includes('desparasit'))[0],
      lastDespar: vac.filter(v => v.patient_id === p.id &&  v.vaccine_name?.toLowerCase().includes('desparasit'))[0],
      consults:   con.filter(c => c.patient_id === p.id).slice(0,3),
      labs:       lab.filter(l => l.patient_id === p.id).length,
    }))});
  };

  const handleChangePw = async () => {
    setPwError('');
    if (newPw.length < 6)     return setPwError('Mínimo 6 caracteres.');
    if (newPw !== newPw2)     return setPwError('Las contraseñas no coinciden.');
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

  const fmt = (d) => {
    if (!d) return '—';
    try { return new Date(d + 'T12:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }); }
    catch { return d; }
  };
  const icon = (sp) => {
    const s = (sp||'').toLowerCase();
    return s.includes('perro')||s.includes('canino') ? '🐶' : s.includes('gato')||s.includes('felino') ? '🐱' : '🐾';
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background: C.bg, fontFamily:"'Inter','Segoe UI',sans-serif", color: C.text }}>

      {/* ── NAV BAR ──────────────────────────────────────────────────────── */}
      <nav style={{
        background: C.tealDark,
        padding: '0.85rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
          <img src="/logos/pp-02.svg" alt="Pets & Pets" style={{ height:38, filter:'brightness(0) invert(1)' }} />
          <div style={{ borderLeft:'1px solid rgba(255,255,255,0.2)', paddingLeft:'0.85rem' }}>
            <div style={{ color:'white', fontWeight:700, fontSize:'0.95rem', letterSpacing:'0.01em' }}>Pets &amp; Pets</div>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.7rem', letterSpacing:'0.04em', textTransform:'uppercase' }}>Portal de Propietarios</div>
          </div>
        </div>
        {client && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <span style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.8rem', display:'none' }}>{client.name.split(' ')[0]}</span>
            <button onClick={() => { setNewPw(''); setNewPw2(''); setPwError(''); setPwOk(false); setPwModal(true); }}
              style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)', color:'white', padding:'0.4rem 0.9rem', borderRadius:8, cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit', fontWeight:600 }}>
              🔑 Contraseña
            </button>
            <button onClick={logout}
              style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.75)', padding:'0.4rem 0.8rem', borderRadius:8, cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit' }}>
              Salir
            </button>
          </div>
        )}
      </nav>

      {/* ── LOGIN ──────────────────────────────────────────────────────────── */}
      {!client && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 64px)', padding:'2rem 1rem' }}>
          <div style={{ width:'100%', maxWidth:440 }}>

            {/* Card */}
            <div style={{
              background: 'white', borderRadius: 20,
              boxShadow: '0 4px 40px rgba(49,109,116,0.10), 0 1px 4px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}>
              {/* Card top strip */}
              <div style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, padding:'2rem 2rem 1.75rem', textAlign:'center' }}>
                <img src="/logos/pp-02.svg" alt="Logo" style={{ height:64, filter:'brightness(0) invert(1)', marginBottom:'1rem' }} />
                <h1 style={{ color:'white', fontWeight:800, fontSize:'1.25rem', margin:'0 0 0.3rem', letterSpacing:'-0.01em' }}>
                  Portal de Propietarios
                </h1>
                <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.82rem', margin:0 }}>
                  Consulta la información de tu mascota
                </p>
              </div>

              {/* Form */}
              <div style={{ padding:'2rem' }}>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color: C.muted, marginBottom:'0.45rem' }}>
                    Número de cédula
                  </label>
                  <input
                    type="text" inputMode="numeric" value={cedula}
                    onChange={e => { setCedula(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && document.getElementById('pw-input').focus()}
                    placeholder="Ej: 16662784"
                    style={{ ...inp, borderColor: error ? C.danger : C.border }}
                    autoComplete="username"
                  />
                </div>

                <div style={{ marginBottom:'1.5rem' }}>
                  <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color: C.muted, marginBottom:'0.45rem' }}>
                    Contraseña
                  </label>
                  <input
                    id="pw-input" type="password" value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="Tu contraseña"
                    style={{ ...inp, borderColor: error ? C.danger : C.border }}
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div style={{ background: C.dangerBg, border:`1px solid ${C.danger}30`, borderRadius:10, padding:'0.65rem 0.9rem', color: C.danger, fontSize:'0.82rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                    ⚠️ {error}
                  </div>
                )}

                <button onClick={handleLogin} disabled={loading} style={{
                  width:'100%', padding:'0.9rem',
                  background: loading ? '#aaa' : `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
                  color:'white', border:'none', borderRadius:12,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight:700, fontSize:'1rem', fontFamily:'inherit',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(49,109,116,0.35)',
                  transition:'all 0.2s',
                }}>
                  {loading ? 'Verificando…' : 'Ingresar →'}
                </button>

                <div style={{ marginTop:'1.5rem', textAlign:'center', color: C.muted, fontSize:'0.76rem', lineHeight:1.7, background: C.cream, borderRadius:10, padding:'0.85rem' }}>
                  <span>🔐 <strong>¿Primera vez?</strong> Tu contraseña es tu número de cédula.</span><br/>
                  <span>¿Olvidaste tu contraseña? Comunícate con nosotros.</span>
                </div>
              </div>
            </div>

            <p style={{ textAlign:'center', color: C.muted, fontSize:'0.72rem', marginTop:'1.25rem' }}>
              © Pets &amp; Pets · Sistema Veterinario
            </p>
          </div>
        </div>
      )}

      {/* ── PORTAL ─────────────────────────────────────────────────────────── */}
      {client && data && (
        <div style={{ maxWidth:700, margin:'0 auto', padding:'2rem 1rem 3rem' }}>

          {/* Greeting */}
          <div style={{ marginBottom:'1.5rem', padding:'1.25rem 1.5rem', background:'white', borderRadius:16, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderLeft:`4px solid ${C.teal}`, display:'flex', alignItems:'center', gap:'1rem' }}>
            <div style={{ fontSize:'2.5rem' }}>👋</div>
            <div>
              <div style={{ fontWeight:800, fontSize:'1.15rem', color: C.tealDark }}>Hola, {client.name.split(' ')[0]}</div>
              <div style={{ color: C.muted, fontSize:'0.8rem', marginTop:'0.1rem' }}>CC {client.document} · Aquí tienes el resumen de tus mascotas</div>
            </div>
          </div>

          {data.pets.length === 0 ? (
            <div style={{ background:'white', borderRadius:16, padding:'3rem', textAlign:'center', color: C.muted }}>
              <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🐾</div>
              <p style={{ fontWeight:600 }}>No encontramos mascotas registradas a tu nombre.</p>
              <p style={{ fontSize:'0.85rem' }}>Comunícate con Pets &amp; Pets para más información.</p>
            </div>
          ) : (
            data.pets.map(pet => (
              <div key={pet.id} style={{
                background:'white', borderRadius:20,
                boxShadow:'0 2px 20px rgba(0,0,0,0.07)',
                marginBottom:'1.5rem', overflow:'hidden',
              }}>
                {/* Pet header */}
                <div style={{
                  background:`linear-gradient(135deg, ${C.teal}18, ${C.cream})`,
                  borderBottom:`1px solid ${C.border}`,
                  padding:'1.25rem 1.5rem',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <div style={{
                      width:52, height:52, borderRadius:'50%',
                      background:`linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'1.6rem', flexShrink:0,
                      boxShadow:'0 3px 10px rgba(49,109,116,0.3)',
                    }}>
                      {icon(pet.species)}
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:'1.15rem', color: C.tealDark }}>{pet.name}</div>
                      <div style={{ fontSize:'0.78rem', color: C.muted, marginTop:'0.1rem' }}>
                        {[pet.species, pet.breed, pet.age && `${pet.age} años`, pet.weight && `${pet.weight} kg`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  {pet.status === 'hospitalizado' && (
                    <span style={{ background:'#fce4e4', color:'#c0392b', fontSize:'0.7rem', fontWeight:700, padding:'4px 12px', borderRadius:999, border:'1px solid #f5c6c6' }}>
                      🏥 Hospitalizado
                    </span>
                  )}
                </div>

                {/* Pet info grid */}
                <div style={{ padding:'1.5rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>

                  <InfoCard icon="💉" label="Última vacuna"
                    main={pet.lastVac?.vaccine_name || 'Sin registro'}
                    sub={pet.lastVac ? fmt(pet.lastVac.date_applied) : null}
                    note={pet.lastVac?.next_dose ? `Próxima: ${fmt(pet.lastVac.next_dose)}` : null}
                    C={C}
                  />

                  <InfoCard icon="🪱" label="Última desparasitación"
                    main={pet.lastDespar?.vaccine_name || 'Sin registro'}
                    sub={pet.lastDespar ? fmt(pet.lastDespar.date_applied) : null}
                    note={pet.lastDespar?.next_dose ? `Próxima: ${fmt(pet.lastDespar.next_dose)}` : null}
                    C={C}
                  />

                  {pet.labs > 0 && (
                    <InfoCard icon="🧪" label="Exámenes de laboratorio"
                      main={`${pet.labs} examen${pet.labs !== 1 ? 'es' : ''}`}
                      sub="registrados en su historia"
                      C={C}
                    />
                  )}

                </div>

                {/* Consultas */}
                {pet.consults.length > 0 && (
                  <div style={{ padding:'0 1.5rem 1.5rem' }}>
                    <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color: C.muted, marginBottom:'0.6rem' }}>
                      📋 Últimas consultas
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                      {pet.consults.map((c, i) => (
                        <div key={i} style={{
                          display:'flex', alignItems:'center', gap:'0.75rem',
                          padding:'0.55rem 0.85rem', background: C.bg,
                          borderRadius:10, borderLeft:`3px solid ${C.teal}`,
                        }}>
                          <span style={{ color: C.muted, fontSize:'0.73rem', whiteSpace:'nowrap', minWidth:95 }}>{fmt(c.created_at)}</span>
                          <span style={{ fontSize:'0.84rem', color: C.text }}>{c.motivo || 'Consulta general'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{ padding:'1rem 1.5rem 1.5rem', display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={() => { setSolPet(pet); setSolModal(true); }} style={{
                    padding:'0.6rem 1.25rem',
                    background:'white',
                    border:`2px solid ${C.teal}`,
                    color: C.teal, borderRadius:12,
                    cursor:'pointer', fontWeight:700, fontSize:'0.82rem', fontFamily:'inherit',
                    display:'flex', alignItems:'center', gap:'0.4rem',
                    transition:'all 0.15s',
                  }}>
                    📄 Solicitar Historia Clínica
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Modal cambiar contraseña ────────────────────────────────────── */}
      {pwModal && (
        <div onClick={() => !firstLogin && setPwModal(false)} style={{ position:'fixed', inset:0, background:'rgba(30,78,84,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(3px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:20, padding:'2rem', maxWidth:380, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            {firstLogin && (
              <div style={{ textAlign:'center', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.4rem' }}>🎉</div>
                <div style={{ fontWeight:800, color: C.tealDark, fontSize:'1.1rem' }}>¡Bienvenido por primera vez!</div>
                <div style={{ color: C.muted, fontSize:'0.82rem', marginTop:'0.3rem', lineHeight:1.5 }}>
                  Por seguridad, elige una contraseña personal antes de continuar.
                </div>
              </div>
            )}
            {!firstLogin && <h3 style={{ fontWeight:800, color: C.tealDark, margin:'0 0 1.25rem', fontSize:'1.05rem' }}>🔑 Cambiar contraseña</h3>}

            {pwOk ? (
              <div style={{ textAlign:'center', padding:'1.5rem 0' }}>
                <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>✅</div>
                <div style={{ fontWeight:700, color:'#2e7d50', fontSize:'1rem' }}>¡Contraseña actualizada!</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                <div>
                  <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', color: C.muted, marginBottom:'0.4rem', letterSpacing:'0.05em' }}>Nueva contraseña</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Mínimo 6 caracteres" style={inp} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', color: C.muted, marginBottom:'0.4rem', letterSpacing:'0.05em' }}>Confirmar contraseña</label>
                  <input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChangePw()} placeholder="Repite la contraseña" style={inp} />
                </div>
                {pwError && <div style={{ color: C.danger, fontSize:'0.8rem', background: C.dangerBg, borderRadius:8, padding:'0.5rem 0.75rem' }}>⚠️ {pwError}</div>}
                <div style={{ display:'flex', gap:'0.6rem', justifyContent:'flex-end', marginTop:'0.25rem' }}>
                  {!firstLogin && (
                    <button onClick={() => setPwModal(false)} style={{ padding:'0.6rem 1rem', background:'white', border:`1px solid ${C.border}`, borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', color: C.muted }}>
                      Cancelar
                    </button>
                  )}
                  <button onClick={handleChangePw} disabled={pwSaving} style={{ padding:'0.6rem 1.4rem', background: C.teal, color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.85rem', fontFamily:'inherit', opacity: pwSaving ? 0.7 : 1 }}>
                    {pwSaving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal solicitar HC ──────────────────────────────────────────── */}
      {solModal && (
        <div onClick={() => setSolModal(false)} style={{ position:'fixed', inset:0, background:'rgba(30,78,84,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(3px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:20, padding:'2.25rem 2rem', maxWidth:380, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:`linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.75rem', margin:'0 auto 1rem' }}>✅</div>
            <h3 style={{ fontWeight:800, color: C.tealDark, fontSize:'1.1rem', margin:'0 0 0.6rem' }}>¡Solicitud enviada!</h3>
            <p style={{ color: C.muted, fontSize:'0.85rem', lineHeight:1.6, marginBottom:'1.75rem' }}>
              Recibimos tu solicitud de historia clínica para <strong style={{ color: C.text }}>{solPet?.name}</strong>.<br/>
              El equipo de <strong>Pets &amp; Pets</strong> la revisará y se comunicará contigo a la brevedad.
            </p>
            <button onClick={() => setSolModal(false)} style={{ padding:'0.7rem 2rem', background:`linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color:'white', border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:'0.9rem', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(49,109,116,0.35)' }}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, main, sub, note, C }) {
  const isEmpty = main === 'Sin registro';
  return (
    <div style={{
      background: isEmpty ? '#FAFAF9' : C.cream,
      border: `1px solid ${isEmpty ? '#E8E8E8' : C.border}`,
      borderRadius: 14, padding: '1rem',
    }}>
      <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color: C.muted, marginBottom:'0.5rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontWeight:700, fontSize:'0.9rem', color: isEmpty ? '#BBBBBB' : C.tealDark, lineHeight:1.3 }}>{main}</div>
      {sub  && <div style={{ fontSize:'0.76rem', color: C.muted, marginTop:'0.2rem' }}>{sub}</div>}
      {note && <div style={{ fontSize:'0.72rem', color: C.gold, marginTop:'0.3rem', fontWeight:600 }}>📅 {note}</div>}
    </div>
  );
}
