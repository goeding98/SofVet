import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const PRIMARY = '#316d74';
const LIGHT   = '#e8f5f6';

export default function PortalPage() {
  const [cedula,    setCedula]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [client,    setClient]    = useState(null);   // client record
  const [data,      setData]      = useState(null);   // { pets: [{...pet, vaccines, consultations, labs}] }
  const [solModal,  setSolModal]  = useState(false);  // "solicitar HC" modal
  const [solPet,    setSolPet]    = useState(null);

  const handleBuscar = async () => {
    const doc = cedula.trim();
    if (!doc) return setError('Ingresa tu número de cédula.');
    setError(''); setLoading(true); setClient(null); setData(null);

    // 1. Find client by document
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, phone, email, document')
      .eq('document', doc);

    if (!clients || clients.length === 0) {
      setLoading(false);
      return setError('No encontramos un cliente registrado con esa cédula. Comunícate con la clínica.');
    }
    const cl = clients[0];

    // 2. Find their pets
    const { data: pets } = await supabase
      .from('patients')
      .select('id, name, species, breed, age, weight, status')
      .eq('client_id', cl.id);

    if (!pets || pets.length === 0) {
      setClient(cl);
      setData({ pets: [] });
      setLoading(false);
      return;
    }

    const petIds = pets.map(p => p.id);

    // 3. Parallel fetch: vaccines + consultations + lab pedidos
    const [vacRes, consultRes, labRes] = await Promise.all([
      supabase.from('vaccines')
        .select('patient_id, vaccine_name, date_applied, next_dose, status')
        .in('patient_id', petIds)
        .order('date_applied', { ascending: false }),

      supabase.from('consultations')
        .select('patient_id, motivo, created_at, estado')
        .in('patient_id', petIds)
        .eq('estado', 'completada')
        .order('created_at', { ascending: false }),

      supabase.from('laboratorios_pedidos')
        .select('patient_id, tipo_examen, estado, fecha_solicitado')
        .in('patient_id', petIds)
        .neq('estado', 'Solicitado'),
    ]);

    const vaccines     = vacRes.data     || [];
    const consultations = consultRes.data || [];
    const labs          = labRes.data     || [];

    // 4. Build per-pet summary
    const enriched = pets.map(pet => {
      const petVaccines = vaccines.filter(v => v.patient_id === pet.id);
      const petConsults = consultations.filter(c => c.patient_id === pet.id);
      const petLabs     = labs.filter(l => l.patient_id === pet.id);

      const lastVaccine = petVaccines.find(v =>
        !v.vaccine_name?.toLowerCase().includes('desparasit')
      );
      const lastDesparasit = petVaccines.find(v =>
        v.vaccine_name?.toLowerCase().includes('desparasit')
      );
      const lastConsults = petConsults.slice(0, 3);

      return { ...pet, lastVaccine, lastDesparasit, lastConsults, labCount: petLabs.length };
    });

    setClient(cl);
    setData({ pets: enriched });
    setLoading(false);
  };

  const solicitar = (pet) => { setSolPet(pet); setSolModal(true); };

  // ── Species icon ─────────────────────────────────────────────────────────────
  const speciesIcon = (sp) => {
    const s = (sp || '').toLowerCase();
    if (s.includes('perro') || s.includes('canino')) return '🐶';
    if (s.includes('gato')  || s.includes('felino')) return '🐱';
    return '🐾';
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const fmt = (d) => {
    if (!d) return '—';
    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }); }
    catch { return d; }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f7fafa', fontFamily:"'Inter', 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: PRIMARY, color:'white', padding:'1.25rem 1.5rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
        <span style={{ fontSize:'1.8rem' }}>🐾</span>
        <div>
          <div style={{ fontWeight:800, fontSize:'1.15rem', letterSpacing:'-0.01em' }}>Pets &amp; Pets</div>
          <div style={{ fontSize:'0.75rem', opacity:0.85 }}>Portal de Propietarios</div>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'2rem 1rem' }}>

        {/* ── LOGIN ─────────────────────────────────────────────────────── */}
        {!client && (
          <div style={{ background:'white', borderRadius:16, boxShadow:'0 2px 16px rgba(0,0,0,0.08)', padding:'2rem 1.5rem', textAlign:'center' }}>
            <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🐾</div>
            <h2 style={{ fontWeight:800, color: PRIMARY, fontSize:'1.3rem', margin:'0 0 0.4rem' }}>
              Consulta la información de tu mascota
            </h2>
            <p style={{ color:'#666', fontSize:'0.875rem', marginBottom:'1.75rem' }}>
              Ingresa tu número de cédula para ver el resumen de tus mascotas.
            </p>

            <div style={{ display:'flex', gap:'0.5rem', maxWidth:360, margin:'0 auto' }}>
              <input
                type="text"
                inputMode="numeric"
                value={cedula}
                onChange={e => setCedula(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                placeholder="Número de cédula"
                style={{ flex:1, padding:'0.75rem 1rem', border:`2px solid ${error ? '#e53e3e' : '#e0e0e0'}`, borderRadius:10, fontSize:'1rem', outline:'none', fontFamily:'inherit' }}
              />
              <button
                onClick={handleBuscar}
                disabled={loading}
                style={{ padding:'0.75rem 1.25rem', background: PRIMARY, color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.9rem', fontFamily:'inherit', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? '...' : 'Buscar'}
              </button>
            </div>

            {error && (
              <div style={{ marginTop:'1rem', color:'#c53030', fontSize:'0.85rem', background:'#fff5f5', border:'1px solid #fed7d7', borderRadius:8, padding:'0.65rem 1rem' }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── RESULTS ───────────────────────────────────────────────────── */}
        {client && data && (
          <>
            {/* Client greeting */}
            <div style={{ marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:800, color: PRIMARY, fontSize:'1.2rem', margin:'0 0 0.2rem' }}>
                Hola, {client.name.split(' ')[0]} 👋
              </h2>
              <p style={{ color:'#666', fontSize:'0.85rem', margin:0 }}>
                CC {client.document} · Aquí tienes el resumen de tus mascotas.
              </p>
              <button
                onClick={() => { setClient(null); setData(null); setCedula(''); }}
                style={{ marginTop:'0.5rem', background:'none', border:'none', color: PRIMARY, cursor:'pointer', fontSize:'0.8rem', fontFamily:'inherit', textDecoration:'underline', padding:0 }}
              >
                ← Salir
              </button>
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
                      <span style={{ fontSize:'2rem' }}>{speciesIcon(pet.species)}</span>
                      <div>
                        <div style={{ fontWeight:800, fontSize:'1.05rem', color: PRIMARY }}>{pet.name}</div>
                        <div style={{ fontSize:'0.78rem', color:'#555' }}>
                          {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}{pet.age ? ` · ${pet.age} años` : ''}{pet.weight ? ` · ${pet.weight} kg` : ''}
                        </div>
                      </div>
                    </div>
                    {pet.status === 'hospitalizado' && (
                      <span style={{ background:'#fce4e4', color:'#c0392b', fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:999 }}>
                        Hospitalizado
                      </span>
                    )}
                  </div>

                  <div style={{ padding:'1.1rem 1.25rem', display:'flex', flexDirection:'column', gap:'0.85rem' }}>

                    {/* Última vacuna */}
                    <InfoRow
                      icon="💉"
                      label="Última vacuna"
                      value={pet.lastVaccine
                        ? `${pet.lastVaccine.vaccine_name} — ${fmt(pet.lastVaccine.date_applied)}`
                        : 'Sin registro'}
                      sub={pet.lastVaccine?.next_dose ? `Próxima dosis: ${fmt(pet.lastVaccine.next_dose)}` : null}
                    />

                    {/* Última desparasitación */}
                    <InfoRow
                      icon="🪱"
                      label="Última desparasitación"
                      value={pet.lastDesparasit
                        ? `${pet.lastDesparasit.vaccine_name} — ${fmt(pet.lastDesparasit.date_applied)}`
                        : 'Sin registro'}
                      sub={pet.lastDesparasit?.next_dose ? `Próxima: ${fmt(pet.lastDesparasit.next_dose)}` : null}
                    />

                    {/* Últimas consultas */}
                    <div>
                      <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#888', marginBottom:'0.4rem' }}>
                        📋 Últimas consultas
                      </div>
                      {pet.lastConsults.length === 0 ? (
                        <span style={{ fontSize:'0.85rem', color:'#aaa' }}>Sin consultas registradas</span>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                          {pet.lastConsults.map((c, i) => (
                            <div key={i} style={{ fontSize:'0.85rem', color:'#444', padding:'0.45rem 0.75rem', background:'#f9f9f9', borderRadius:8, borderLeft:`3px solid ${PRIMARY}` }}>
                              <span style={{ color:'#888', fontSize:'0.75rem' }}>{fmt(c.created_at)}</span>
                              <span style={{ marginLeft:'0.5rem' }}>{c.motivo || 'Consulta general'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Labs */}
                    {pet.labCount > 0 && (
                      <InfoRow
                        icon="🧪"
                        label="Exámenes de laboratorio"
                        value={`${pet.labCount} examen${pet.labCount !== 1 ? 'es' : ''} registrado${pet.labCount !== 1 ? 's' : ''}`}
                      />
                    )}

                    {/* Solicitar HC */}
                    <div style={{ borderTop:'1px solid #f0f0f0', paddingTop:'0.85rem', textAlign:'right' }}>
                      <button
                        onClick={() => solicitar(pet)}
                        style={{ padding:'0.55rem 1.15rem', background:'white', border:`2px solid ${PRIMARY}`, color: PRIMARY, borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.82rem', fontFamily:'inherit' }}
                      >
                        📄 Solicitar Historia Clínica
                      </button>
                    </div>

                  </div>
                </div>
              ))
            )}

            <p style={{ textAlign:'center', fontSize:'0.75rem', color:'#aaa', marginTop:'1rem' }}>
              ¿Tienes alguna duda? Comunícate con Pets &amp; Pets.
            </p>
          </>
        )}
      </div>

      {/* ── Modal: Solicitar HC ─────────────────────────────────────────── */}
      {solModal && (
        <div onClick={() => setSolModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:'2rem 1.5rem', maxWidth:380, width:'100%', textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>✅</div>
            <h3 style={{ fontWeight:800, color: PRIMARY, fontSize:'1.1rem', margin:'0 0 0.5rem' }}>
              ¡Solicitud enviada!
            </h3>
            <p style={{ color:'#555', fontSize:'0.875rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
              Recibimos tu solicitud de historia clínica para <strong>{solPet?.name}</strong>. El equipo de <strong>Pets &amp; Pets</strong> la revisará y se comunicará contigo pronto.
            </p>
            <button
              onClick={() => setSolModal(false)}
              style={{ padding:'0.65rem 1.75rem', background: PRIMARY, color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.9rem', fontFamily:'inherit' }}
            >
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
      <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#888', marginBottom:'0.2rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize:'0.9rem', color:'#333', fontWeight:500 }}>{value}</div>
      {sub && <div style={{ fontSize:'0.75rem', color:'#888', marginTop:'0.15rem' }}>{sub}</div>}
    </div>
  );
}
