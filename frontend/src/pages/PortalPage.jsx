import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const PRIMARY = '#316d74';
const LIGHT   = '#e8f5f6';

// ── SHA-256 hash via Web Crypto API ──────────────────────────────────────────
async function sha256(text) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PortalPage() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [cedula,      setCedula]      = useState('');
  const [password,    setPassword]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  // ── Session state ───────────────────────────────────────────────────────────
  const [client,      setClient]      = useState(null);
  const [data,        setData]        = useState(null);
  const [firstLogin,  setFirstLogin]  = useState(false); // show change-pw prompt

  // ── Change password modal ───────────────────────────────────────────────────
  const [pwModal,     setPwModal]     = useState(false);
  const [newPw,       setNewPw]       = useState('');
  const [newPw2,      setNewPw2]      = useState('');
  const [pwError,     setPwError]     = useState('');
  const [pwSaving,    setPwSaving]    = useState(false);
  const [pwSuccess,   setPwSuccess]   = useState(false);

  // ── Solicitar HC modal ──────────────────────────────────────────────────────
  const [solModal,    setSolModal]    = useState(false);
  const [solPet,      setSolPet]      = useState(null);

  // ── Login ───────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const doc = cedula.trim();
    const pw  = password.trim();
    if (!doc || !pw) return setError('Ingresa tu cédula y contraseña.');
    setError(''); setLoading(true);

    // 1. Find client
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, phone, email, document, portal_password')
      .eq('document', doc);

    if (!clients || clients.length === 0) {
      setLoading(false);
      return setError('Cédula o contraseña incorrecta.');
    }
    const cl = clients[0];

    // 2. Verify password
    let ok = false;
    let isFirst = false;
    if (!cl.portal_password) {
      // First time: password must equal the document
      ok = pw === doc;
      isFirst = ok;
    } else {
      const hashed = await sha256(pw);
      ok = hashed === cl.portal_password;
    }

    if (!ok) {
      setLoading(false);
      return setError('Cédula o contraseña incorrecta.');
    }

    // 3. Load pet data
    await loadData(cl);
    setFirstLogin(isFirst);
    if (isFirst) setPwModal(true); // Force change on first login
    setLoading(false);
  };

  const loadData = async (cl) => {
    const { data: pets } = await supabase
      .from('patients')
      .select('id, name, species, breed, age, weight, status')
      .eq('client_id', cl.id);

    if (!pets || pets.length === 0) {
      setClient(cl);
      setData({ pets: [] });
      return;
    }
    const petIds = pets.map(p => p.id);

    const [vacRes, consultRes, labRes] = await Promise.all([
      supabase.from('vaccines')
        .select('patient_id, vaccine_name, date_applied, next_dose')
        .in('patient_id', petIds)
        .order('date_applied', { ascending: false }),

      supabase.from('consultations')
        .select('patient_id, motivo, created_at')
        .in('patient_id', petIds)
        .eq('estado', 'completada')
        .order('created_at', { ascending: false }),

      supabase.from('laboratorios_pedidos')
        .select('patient_id')
        .in('patient_id', petIds)
        .neq('estado', 'Solicitado'),
    ]);

    const vaccines      = vacRes.data      || [];
    const consultations = consultRes.data  || [];
    const labs          = labRes.data      || [];

    const enriched = pets.map(pet => {
      const pv = vaccines.filter(v => v.patient_id === pet.id);
      const pc = consultations.filter(c => c.patient_id === pet.id);
      const pl = labs.filter(l => l.patient_id === pet.id);
      return {
        ...pet,
        lastVaccine:    pv.find(v => !v.vaccine_name?.toLowerCase().includes('desparasit')),
        lastDesparasit: pv.find(v =>  v.vaccine_name?.toLowerCase().includes('desparasit')),
        lastConsults:   pc.slice(0, 3),
        labCount:       pl.length,
      };
    });

    setClient(cl);
    setData({ pets: enriched });
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const handleChangePw = async () => {
    setPwError('');
    if (!newPw || newPw.length < 6)   return setPwError('La contraseña debe tener al menos 6 caracteres.');
    if (newPw !== newPw2)              return setPwError('Las contraseñas no coinciden.');
    if (newPw === client.document)     return setPwError('La contraseña no puede ser igual a tu cédula.');

    setPwSaving(true);
    const hashed = await sha256(newPw);
    const { error } = await supabase
      .from('clients')
      .update({ portal_password: hashed })
      .eq('id', client.id);

    setPwSaving(false);
    if (error) return setPwError('Error al guardar. Intenta de nuevo.');

    setClient(c => ({ ...c, portal_password: hashed }));
    setFirstLogin(false);
    setPwSuccess(true);
    setTimeout(() => { setPwModal(false); setPwSuccess(false); setNewPw(''); setNewPw2(''); }, 1800);
  };

  const openChangePw = () => { setNewPw(''); setNewPw2(''); setPwError(''); setPwSuccess(false); setPwModal(true); };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = () => { setClient(null); setData(null); setCedula(''); setPassword(''); setFirstLogin(false); };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const speciesIcon = (sp) => {
    const s = (sp || '').toLowerCase();
    if (s.includes('perro') || s.includes('canino')) return '🐶';
    if (s.includes('gato')  || s.includes('felino')) return '🐱';
    return '🐾';
  };
  const fmt = (d) => {
    if (!d) return '—';
    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }); }
    catch { return d; }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f7fafa', fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ background: PRIMARY, color:'white', padding:'1rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <span style={{ fontSize:'1.6rem' }}>🐾</span>
          <div>
            <div style={{ fontWeight:800, fontSize:'1.05rem' }}>Pets &amp; Pets</div>
            <div style={{ fontSize:'0.72rem', opacity:0.85 }}>Portal de Propietarios</div>
          </div>
        </div>
        {client && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <button onClick={openChangePw}
              style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'white', padding:'0.35rem 0.85rem', borderRadius:8, cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit', fontWeight:600 }}>
              🔑 Cambiar contraseña
            </button>
            <button onClick={logout}
              style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'white', padding:'0.35rem 0.75rem', borderRadius:8, cursor:'pointer', fontSize:'0.75rem', fontFamily:'inherit' }}>
              Salir
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'2rem 1rem' }}>

        {/* ── LOGIN ─────────────────────────────────────────────────────── */}
        {!client && (
          <div style={{ background:'white', borderRadius:16, boxShadow:'0 2px 16px rgba(0,0,0,0.08)', padding:'2.25rem 1.75rem', textAlign:'center', maxWidth:400, margin:'0 auto' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.6rem' }}>🐾</div>
            <h2 style={{ fontWeight:800, color: PRIMARY, fontSize:'1.2rem', margin:'0 0 0.35rem' }}>
              Bienvenido al Portal
            </h2>
            <p style={{ color:'#666', fontSize:'0.82rem', marginBottom:'1.75rem', lineHeight:1.5 }}>
              Ingresa tu cédula y contraseña para ver la información de tus mascotas.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', textAlign:'left' }}>
              <div>
                <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', color:'#888', display:'block', marginBottom:'0.3rem' }}>Cédula</label>
                <input
                  type="text" inputMode="numeric" value={cedula}
                  onChange={e => setCedula(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Ej: 16662784"
                  style={{ width:'100%', padding:'0.75rem 1rem', border:`2px solid ${error ? '#e53e3e' : '#e0e0e0'}`, borderRadius:10, fontSize:'1rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', color:'#888', display:'block', marginBottom:'0.3rem' }}>Contraseña</label>
                <input
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Tu contraseña"
                  style={{ width:'100%', padding:'0.75rem 1rem', border:`2px solid ${error ? '#e53e3e' : '#e0e0e0'}`, borderRadius:10, fontSize:'1rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
              <button
                onClick={handleLogin} disabled={loading}
                style={{ padding:'0.8rem', background: PRIMARY, color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.95rem', fontFamily:'inherit', opacity: loading ? 0.7 : 1, marginTop:'0.25rem' }}
              >
                {loading ? 'Verificando...' : 'Ingresar'}
              </button>
            </div>

            {error && (
              <div style={{ marginTop:'1rem', color:'#c53030', fontSize:'0.82rem', background:'#fff5f5', border:'1px solid #fed7d7', borderRadius:8, padding:'0.6rem 0.9rem' }}>
                {error}
              </div>
            )}

            <p style={{ marginTop:'1.5rem', fontSize:'0.75rem', color:'#aaa', lineHeight:1.5 }}>
              ¿Primera vez? Tu contraseña es tu número de cédula.<br/>
              ¿Olvidaste tu contraseña? Contáctanos.
            </p>
          </div>
        )}

        {/* ── PORTAL ────────────────────────────────────────────────────── */}
        {client && data && (
          <>
            <div style={{ marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:800, color: PRIMARY, fontSize:'1.15rem', margin:'0 0 0.2rem' }}>
                Hola, {client.name.split(' ')[0]} 👋
              </h2>
              <p style={{ color:'#888', fontSize:'0.82rem', margin:0 }}>
                CC {client.document} · Resumen de tus mascotas
              </p>
            </div>

            {data.pets.length === 0 ? (
              <div style={{ background:'white', borderRadius:16, padding:'2rem', textAlign:'center', color:'#666' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🐾</div>
                <p>No encontramos mascotas registradas a tu nombre. Comunícate con la clínica.</p>
              </div>
            ) : (
              data.pets.map(pet => (
                <div key={pet.id} style={{ background:'white', borderRadius:16, boxShadow:'0 2px 12px rgba(0,0,0,0.07)', marginBottom:'1.25rem', overflow:'hidden' }}>

                  {/* Pet header */}
                  <div style={{ background: LIGHT, borderBottom:`3px solid ${PRIMARY}`, padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                      <span style={{ fontSize:'1.9rem' }}>{speciesIcon(pet.species)}</span>
                      <div>
                        <div style={{ fontWeight:800, fontSize:'1rem', color: PRIMARY }}>{pet.name}</div>
                        <div style={{ fontSize:'0.76rem', color:'#555' }}>
                          {[pet.species, pet.breed, pet.age ? `${pet.age} años` : null, pet.weight ? `${pet.weight} kg` : null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    {pet.status === 'hospitalizado' && (
                      <span style={{ background:'#fce4e4', color:'#c0392b', fontSize:'0.7rem', fontWeight:700, padding:'3px 10px', borderRadius:999 }}>
                        Hospitalizado
                      </span>
                    )}
                  </div>

                  <div style={{ padding:'1.1rem 1.25rem', display:'flex', flexDirection:'column', gap:'0.9rem' }}>

                    <InfoRow icon="💉" label="Última vacuna"
                      value={pet.lastVaccine ? `${pet.lastVaccine.vaccine_name} — ${fmt(pet.lastVaccine.date_applied)}` : 'Sin registro'}
                      sub={pet.lastVaccine?.next_dose ? `Próxima dosis: ${fmt(pet.lastVaccine.next_dose)}` : null}
                    />

                    <InfoRow icon="🪱" label="Última desparasitación"
                      value={pet.lastDesparasit ? `${pet.lastDesparasit.vaccine_name} — ${fmt(pet.lastDesparasit.date_applied)}` : 'Sin registro'}
                      sub={pet.lastDesparasit?.next_dose ? `Próxima: ${fmt(pet.lastDesparasit.next_dose)}` : null}
                    />

                    <div>
                      <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#888', marginBottom:'0.4rem' }}>
                        📋 Últimas consultas
                      </div>
                      {pet.lastConsults.length === 0 ? (
                        <span style={{ fontSize:'0.83rem', color:'#bbb' }}>Sin consultas registradas</span>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem' }}>
                          {pet.lastConsults.map((c, i) => (
                            <div key={i} style={{ fontSize:'0.83rem', color:'#444', padding:'0.4rem 0.75rem', background:'#f9f9f9', borderRadius:8, borderLeft:`3px solid ${PRIMARY}` }}>
                              <span style={{ color:'#888', fontSize:'0.73rem' }}>{fmt(c.created_at)}</span>
                              <span style={{ marginLeft:'0.5rem' }}>{c.motivo || 'Consulta general'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {pet.labCount > 0 && (
                      <InfoRow icon="🧪" label="Exámenes de laboratorio"
                        value={`${pet.labCount} examen${pet.labCount !== 1 ? 'es' : ''} registrado${pet.labCount !== 1 ? 's' : ''}`}
                      />
                    )}

                    <div style={{ borderTop:'1px solid #f0f0f0', paddingTop:'0.85rem', textAlign:'right' }}>
                      <button onClick={() => { setSolPet(pet); setSolModal(true); }}
                        style={{ padding:'0.5rem 1.1rem', background:'white', border:`2px solid ${PRIMARY}`, color: PRIMARY, borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.8rem', fontFamily:'inherit' }}>
                        📄 Solicitar Historia Clínica
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* ── Modal: Cambiar contraseña ───────────────────────────────────── */}
      {pwModal && (
        <div onClick={() => !firstLogin && setPwModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:'2rem 1.5rem', maxWidth:380, width:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
            {firstLogin ? (
              <>
                <div style={{ fontSize:'2rem', marginBottom:'0.5rem', textAlign:'center' }}>👋</div>
                <h3 style={{ fontWeight:800, color: PRIMARY, fontSize:'1.05rem', margin:'0 0 0.4rem', textAlign:'center' }}>¡Bienvenido por primera vez!</h3>
                <p style={{ color:'#666', fontSize:'0.82rem', textAlign:'center', marginBottom:'1.25rem', lineHeight:1.5 }}>
                  Por seguridad, cambia tu contraseña antes de continuar.
                </p>
              </>
            ) : (
              <h3 style={{ fontWeight:800, color: PRIMARY, fontSize:'1.05rem', margin:'0 0 1.25rem' }}>🔑 Cambiar contraseña</h3>
            )}

            {pwSuccess ? (
              <div style={{ textAlign:'center', padding:'1rem 0' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>✅</div>
                <p style={{ fontWeight:700, color:'#2e7d50' }}>¡Contraseña actualizada!</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                <div>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', color:'#888', display:'block', marginBottom:'0.3rem' }}>Nueva contraseña</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ width:'100%', padding:'0.7rem 0.9rem', border:'2px solid #e0e0e0', borderRadius:10, fontSize:'0.9rem', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', color:'#888', display:'block', marginBottom:'0.3rem' }}>Confirmar contraseña</label>
                  <input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleChangePw()}
                    placeholder="Repite la contraseña"
                    style={{ width:'100%', padding:'0.7rem 0.9rem', border:'2px solid #e0e0e0', borderRadius:10, fontSize:'0.9rem', fontFamily:'inherit', boxSizing:'border-box', outline:'none' }}
                  />
                </div>

                {pwError && (
                  <div style={{ color:'#c53030', fontSize:'0.8rem', background:'#fff5f5', border:'1px solid #fed7d7', borderRadius:8, padding:'0.5rem 0.75rem' }}>
                    {pwError}
                  </div>
                )}

                <div style={{ display:'flex', gap:'0.6rem', justifyContent:'flex-end', marginTop:'0.25rem' }}>
                  {!firstLogin && (
                    <button onClick={() => setPwModal(false)}
                      style={{ padding:'0.6rem 1rem', background:'white', border:'1px solid #ddd', borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', color:'#666' }}>
                      Cancelar
                    </button>
                  )}
                  <button onClick={handleChangePw} disabled={pwSaving}
                    style={{ padding:'0.6rem 1.25rem', background: PRIMARY, color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.85rem', fontFamily:'inherit', opacity: pwSaving ? 0.7 : 1 }}>
                    {pwSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Solicitar HC ─────────────────────────────────────────── */}
      {solModal && (
        <div onClick={() => setSolModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:'2rem 1.5rem', maxWidth:360, width:'100%', textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.6rem' }}>✅</div>
            <h3 style={{ fontWeight:800, color: PRIMARY, fontSize:'1.05rem', margin:'0 0 0.5rem' }}>¡Solicitud enviada!</h3>
            <p style={{ color:'#555', fontSize:'0.85rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
              Recibimos tu solicitud de historia clínica para <strong>{solPet?.name}</strong>. El equipo de <strong>Pets &amp; Pets</strong> la revisará y se comunicará contigo pronto.
            </p>
            <button onClick={() => setSolModal(false)}
              style={{ padding:'0.65rem 1.75rem', background: PRIMARY, color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.9rem', fontFamily:'inherit' }}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#888', marginBottom:'0.2rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize:'0.87rem', color:'#333', fontWeight:500 }}>{value}</div>
      {sub && <div style={{ fontSize:'0.74rem', color:'#888', marginTop:'0.15rem' }}>{sub}</div>}
    </div>
  );
}
