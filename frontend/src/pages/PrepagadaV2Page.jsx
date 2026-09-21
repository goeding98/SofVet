import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { calcularPrecioPrepagada, BOLSA_ANUAL } from '../utils/prepagadaPrecios';
import { calcularEstadoVencimiento } from '../utils/prepagadaEstado';
import { nowDate } from '../utils/nowLocal';

const fmtCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const ESTADO_BADGE = {
  activo:      { bg: '#eafaf0', color: '#1e7d45', label: 'Activo' },
  en_gracia:   { bg: '#fff8e1', color: '#b8860b', label: 'En gracia' },
  suspendido:  { bg: '#fdecea', color: '#c0392b', label: 'Suspendido' },
  cancelado:   { bg: '#f0f2f6', color: '#8A8076', label: 'Cancelado' },
};

const PLAN_LABEL = { urgencias: 'Urgencias', total: 'Total' };

const SPECIES = ['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Otro'];
const ORIGEN_OPTS = [
  'Recomendación de amigo/familiar',
  'Búsqueda en Google de veterinarias abiertas por urgencias',
  'Instagram/Facebook/TikTok',
  'Vio el local en la calle',
  'Volante o publicidad impresa',
  'Aliado, convenio o médico remitente',
  'Otro',
];
const EMPTY_CLIENTE_NUEVO = { name: '', document: '', phone: '', email: '', address: '', origen: '', origen_otro: '' };
const EMPTY_MASCOTA_NUEVA = { name: '', species: 'Perro', breed: '', sex: 'Macho', fecha_nacimiento: '', weight: '', esterilizado: 'No', caracter: 'Dócil' };

const inputStyle = { width: '100%', padding: '0.55rem 0.8rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit' };
const miniLabelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.3rem', textTransform: 'uppercase' };

export default function PrepagadaV2Page() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { items: afiliados, add: addAfiliado, edit: editAfiliado } = useStore('prepagadaAfiliados');
  const { add: addBeneficios } = useStore('prepagadaBeneficios');
  const { items: clients, add: addClient } = useStore('clients');
  const { items: patients, add: addPet } = useStore('patients');

  // Vencimiento automático: cada vez que se abre esta lista, revisa si algún
  // afiliado ya venció y le pone el estado que le corresponda según el
  // calendario del Protocolo Operativo (gracia 6 días, suspensión, cancelación
  // a los 30). No toca afiliados ya cancelados a mano.
  useEffect(() => {
    const hoy = nowDate();
    const anioActual = new Date().getFullYear();
    for (const a of afiliados) {
      const updates = {};
      const estadoReal = calcularEstadoVencimiento(a, hoy);
      if (estadoReal !== a.estado) updates.estado = estadoReal;
      if (a.bolsa_anio !== anioActual) { updates.bolsa_anio = anioActual; updates.bolsa_consumida_anual = 0; }
      if (Object.keys(updates).length) editAfiliado(a.id, updates);
    }
  }, [afiliados]);  // eslint-disable-line react-hooks/exhaustive-deps

  const [modal, setModal] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSel, setClienteSel] = useState(null);
  const [mascotaSel, setMascotaSel] = useState(null);
  const [plan, setPlan] = useState('urgencias');
  const [fechaAfiliacion, setFechaAfiliacion] = useState(nowDate());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Crear cliente nuevo desde el modal (venta en clínica o lead de redes sociales)
  const [crearClienteModo, setCrearClienteModo] = useState(false);
  const [clienteNuevo, setClienteNuevo] = useState(EMPTY_CLIENTE_NUEVO);
  const [savingCliente, setSavingCliente] = useState(false);
  const [errCliente, setErrCliente] = useState('');

  // Registrar mascota nueva para el cliente seleccionado
  const [crearMascotaModo, setCrearMascotaModo] = useState(false);
  const [mascotaNueva, setMascotaNueva] = useState(EMPTY_MASCOTA_NUEVA);
  const [savingMascota, setSavingMascota] = useState(false);
  const [errMascota, setErrMascota] = useState('');

  const abrirModal = () => {
    setBusquedaCliente(''); setClienteSel(null); setMascotaSel(null);
    setPlan('urgencias'); setFechaAfiliacion(nowDate()); setErr('');
    setCrearClienteModo(false); setClienteNuevo(EMPTY_CLIENTE_NUEVO); setErrCliente('');
    setCrearMascotaModo(false); setMascotaNueva(EMPTY_MASCOTA_NUEVA); setErrMascota('');
    setModal(true);
  };

  const handleCrearCliente = async () => {
    if (!clienteNuevo.name.trim())     return setErrCliente('El nombre es requerido.');
    if (!clienteNuevo.document.trim()) return setErrCliente('La cédula es requerida.');
    if (!clienteNuevo.phone.trim())    return setErrCliente('El teléfono es requerido.');
    if (!clienteNuevo.origen)          return setErrCliente('Selecciona cómo nos conoció.');
    if (clienteNuevo.origen === 'Otro' && !clienteNuevo.origen_otro?.trim()) return setErrCliente('Cuéntanos brevemente en "Otro" cómo nos conoció.');

    const docNorm = clienteNuevo.document.trim();
    const duplicado = clients.find(c => (c.document || '').trim() === docNorm);
    if (duplicado) return setErrCliente(`Ya existe un cliente con esa cédula: ${duplicado.name}. Búscalo arriba.`);

    setSavingCliente(true); setErrCliente('');
    let saveErr = null;
    const nuevo = await addClient({
      ...clienteNuevo,
      cedula: clienteNuevo.document,
      created_at: nowDate(),
    }, { onError: (m) => { saveErr = m; } });
    setSavingCliente(false);
    if (!nuevo) return setErrCliente('Error al crear cliente: ' + saveErr);

    setClienteSel(nuevo);
    setCrearClienteModo(false);
    setClienteNuevo(EMPTY_CLIENTE_NUEVO);
  };

  const handleCrearMascota = async () => {
    if (!clienteSel) return;
    const f = mascotaNueva;
    if (!f.name.trim() || !f.breed.trim() || !f.fecha_nacimiento || !f.weight || !f.sex || !f.esterilizado || !f.caracter) {
      return setErrMascota('Completa todos los campos requeridos.');
    }
    setSavingMascota(true); setErrMascota('');
    const age = Math.floor((new Date() - new Date(f.fecha_nacimiento)) / (365.25 * 24 * 3600 * 1000));
    let saveErr = null;
    const nueva = await addPet({
      ...f,
      client_id: clienteSel.id,
      owner: clienteSel.name,
      owner_phone: clienteSel.phone,
      owner_email: clienteSel.email,
      age,
      weight: parseFloat(f.weight) || 0,
      status: 'activo',
      created_at: nowDate(),
    }, { onError: (m) => { saveErr = m; } });
    setSavingMascota(false);
    if (!nueva) return setErrMascota('Error al registrar mascota: ' + saveErr);

    setMascotaSel(nueva);
    setCrearMascotaModo(false);
    setMascotaNueva(EMPTY_MASCOTA_NUEVA);
  };

  const clientesFiltrados = busquedaCliente.trim().length < 2 ? [] : clients.filter(c =>
    (c.name || '').toLowerCase().includes(busquedaCliente.toLowerCase()) ||
    (c.document || '').includes(busquedaCliente)
  ).slice(0, 8);

  const mascotasDelCliente = clienteSel ? patients.filter(p => p.client_id === clienteSel.id) : [];

  // Cuántas mascotas de este mismo titular ya están afiliadas (activo/en_gracia) -> determina el descuento
  const numeroMascota = clienteSel
    ? afiliados.filter(a => a.client_id === clienteSel.id && ['activo', 'en_gracia'].includes(a.estado)).length + 1
    : 1;
  const precioCalculado = calcularPrecioPrepagada(plan, numeroMascota);

  const yaAfiliada = mascotaSel ? afiliados.some(a => a.patient_id === mascotaSel.id && ['activo', 'en_gracia'].includes(a.estado)) : false;

  const handleAfiliar = async () => {
    if (!clienteSel || !mascotaSel) return setErr('Selecciona cliente y mascota.');
    if (yaAfiliada) return setErr(`${mascotaSel.name} ya tiene una afiliación activa.`);
    setSaving(true); setErr('');

    const fechaVenc = new Date(fechaAfiliacion); fechaVenc.setMonth(fechaVenc.getMonth() + 1);
    const vencStr = fechaVenc.toISOString().slice(0, 10);

    let saveErr = null;
    const nuevo = await addAfiliado({
      patient_id: mascotaSel.id,
      client_id: clienteSel.id,
      sede_id: mascotaSel.sede_id || clienteSel.sede_id || null,
      plan,
      precio_mensual: precioCalculado,
      fecha_afiliacion: fechaAfiliacion,
      fecha_vencimiento: vencStr,
      estado: 'activo',
      bolsa_maxima_anual: BOLSA_ANUAL,
      bolsa_consumida_anual: 0,
      bolsa_anio: new Date().getFullYear(),
      creado_por: session?.nombre || session?.username || null,
    }, { onError: (m) => { saveErr = m; } });

    if (!nuevo) { setSaving(false); setErr('Error al afiliar: ' + saveErr); return; }

    if (plan === 'total') {
      await addBeneficios({
        afiliado_id: nuevo.id,
        anio: new Date().getFullYear(),
        consultas_usadas: 0, vacunas_usadas: 0, desparasitaciones_usadas: 0, labs_usados: 0, imagenes_usadas: 0,
      }, { onError: () => {} });
    }

    setSaving(false);
    setModal(false);
    navigate(`/prueba/prepagada/${nuevo.id}`);
  };

  const clienteOf = (a) => clients.find(c => c.id === a.client_id);
  const mascotaOf = (a) => patients.find(p => p.id === a.patient_id);

  const activos = afiliados.filter(a => a.estado === 'activo').length;
  const enGracia = afiliados.filter(a => a.estado === 'en_gracia').length;
  const suspendidos = afiliados.filter(a => a.estado === 'suspendido').length;

  const [busqueda, setBusqueda] = useState('');
  const q = busqueda.trim().toLowerCase();
  const afiliadosFiltrados = !q ? afiliados : afiliados.filter(a => {
    const c = clienteOf(a);
    const m = mascotaOf(a);
    return (m?.name || '').toLowerCase().includes(q)
      || (c?.name || '').toLowerCase().includes(q)
      || (c?.document || '').includes(busqueda.trim());
  });

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.3rem' }}>💳 Prepagada (v2 — pruebas)</h1>
          <p style={{ color: '#8A8076', fontSize: '0.9rem' }}>
            {afiliados.length} afiliados · {activos} activos · {enGracia} en gracia · {suspendidos} suspendidos
          </p>
        </div>
        <button onClick={abrirModal} style={{ padding: '0.65rem 1.25rem', background: '#316d74', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
          + Afiliar mascota
        </button>
      </div>

      <input
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="🔍 Buscar por mascota, tutor o cédula..."
        style={{ width: '100%', maxWidth: 380, padding: '0.6rem 0.9rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.88rem', boxSizing: 'border-box', marginBottom: '1rem', fontFamily: 'inherit' }}
      />

      <div style={{ background: 'white', border: '1px solid #e2e6ef', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7f9fc' }}>
              {['Mascota', 'Titular', 'Plan', 'Precio/mes', 'Estado', 'Bolsa disponible', 'Vencimiento', ''].map(h => (
                <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#8A8076', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {afiliados.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#8A8076' }}>Aún no hay afiliados. Crea el primero con "+ Afiliar mascota".</td></tr>
            )}
            {afiliados.length > 0 && afiliadosFiltrados.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#8A8076' }}>No hay afiliados que coincidan con "{busqueda}".</td></tr>
            )}
            {afiliadosFiltrados.map(a => {
              const badge = ESTADO_BADGE[a.estado] || ESTADO_BADGE.activo;
              const disponible = a.bolsa_maxima_anual - a.bolsa_consumida_anual;
              return (
                <tr key={a.id} style={{ borderTop: '1px solid #eceff3', cursor: 'pointer' }} onClick={() => navigate(`/prueba/prepagada/${a.id}`)}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>🐾 {mascotaOf(a)?.name || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{clienteOf(a)?.name || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{PLAN_LABEL[a.plan]}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{fmtCOP(a.precio_mensual)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ background: badge.bg, color: badge.color, padding: '2px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>{badge.label}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{fmtCOP(disponible)} <span style={{ color: '#8A8076', fontSize: '0.78rem' }}>/ {fmtCOP(a.bolsa_maxima_anual)}</span></td>
                  <td style={{ padding: '0.75rem 1rem', color: '#8A8076', fontSize: '0.85rem' }}>{a.fecha_vencimiento || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#316d74', fontWeight: 700, fontSize: '0.85rem' }}>Ver →</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #eceff3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#316d74', margin: 0 }}>Afiliar mascota</h3>
              <button onClick={() => setModal(false)} style={{ width: 30, height: 30, background: '#f0f2f6', border: 'none', borderRadius: '50%', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {!clienteSel ? (
                crearClienteModo ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#316d74' }}>Cliente nuevo</h4>
                      <button onClick={() => { setCrearClienteModo(false); setErrCliente(''); }} style={{ background: 'none', border: 'none', color: '#8A8076', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>← Volver a buscar</button>
                    </div>
                    <div style={{ marginBottom: '0.8rem' }}><label style={miniLabelStyle}>Nombre completo *</label><input style={inputStyle} value={clienteNuevo.name} onChange={e => setClienteNuevo(f => ({ ...f, name: e.target.value }))} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem' }}>
                      <div><label style={miniLabelStyle}>Cédula *</label><input style={inputStyle} value={clienteNuevo.document} onChange={e => setClienteNuevo(f => ({ ...f, document: e.target.value }))} /></div>
                      <div><label style={miniLabelStyle}>Teléfono *</label><input style={inputStyle} value={clienteNuevo.phone} onChange={e => setClienteNuevo(f => ({ ...f, phone: e.target.value }))} /></div>
                    </div>
                    <div style={{ marginBottom: '0.8rem' }}><label style={miniLabelStyle}>Correo</label><input style={inputStyle} type="email" value={clienteNuevo.email} onChange={e => setClienteNuevo(f => ({ ...f, email: e.target.value }))} /></div>
                    <div style={{ marginBottom: '0.8rem' }}><label style={miniLabelStyle}>Dirección</label><input style={inputStyle} value={clienteNuevo.address} onChange={e => setClienteNuevo(f => ({ ...f, address: e.target.value }))} /></div>
                    <div style={{ marginBottom: '0.8rem' }}>
                      <label style={miniLabelStyle}>¿Cómo nos conoció? *</label>
                      <select style={inputStyle} value={clienteNuevo.origen} onChange={e => setClienteNuevo(f => ({ ...f, origen: e.target.value, origen_otro: e.target.value === 'Otro' ? f.origen_otro : '' }))}>
                        <option value="">— Selecciona una opción —</option>
                        {ORIGEN_OPTS.map(o => <option key={o}>{o}</option>)}
                      </select>
                      {clienteNuevo.origen === 'Otro' && (
                        <input style={{ ...inputStyle, marginTop: '0.5rem' }} placeholder="Cuéntanos brevemente..." value={clienteNuevo.origen_otro} onChange={e => setClienteNuevo(f => ({ ...f, origen_otro: e.target.value }))} />
                      )}
                    </div>
                    {errCliente && <p style={{ color: '#c0392b', fontSize: '0.82rem', marginBottom: '0.8rem' }}>{errCliente}</p>}
                    <button onClick={handleCrearCliente} disabled={savingCliente} style={{ width: '100%', padding: '0.75rem', background: savingCliente ? '#ccc' : '#316d74', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem', cursor: savingCliente ? 'not-allowed' : 'pointer' }}>
                      {savingCliente ? 'Creando…' : 'Crear cliente y continuar'}
                    </button>
                  </>
                ) : (
                  <>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Buscar cliente (nombre o cédula)</label>
                    <input autoFocus value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} placeholder="Ej: Ana Campo, o su cédula..." style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box' }} />
                    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {clientesFiltrados.map(c => (
                        <button key={c.id} onClick={() => setClienteSel(c)} style={{ textAlign: 'left', padding: '0.6rem 0.85rem', background: '#f7f9fc', border: '1px solid #eceff3', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#8A8076' }}>CC {c.document || '—'}</div>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setCrearClienteModo(true)} style={{ marginTop: '0.8rem', width: '100%', textAlign: 'center', padding: '0.6rem', background: 'white', border: '1.5px dashed #316d74', color: '#316d74', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem' }}>
                      + Crear cliente nuevo
                    </button>
                  </>
                )
              ) : (
                <>
                  <div style={{ background: '#eef6f6', border: '1px solid #bfe0e0', borderRadius: 10, padding: '0.6rem 0.85rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e4e54' }}>{clienteSel.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#5c6470' }}>CC {clienteSel.document || '—'}</div>
                    </div>
                    <button onClick={() => { setClienteSel(null); setMascotaSel(null); }} style={{ background: 'none', border: 'none', color: '#316d74', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>Cambiar</button>
                  </div>

                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Mascota</label>

                  {crearMascotaModo ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#316d74' }}>Mascota nueva</span>
                        <button onClick={() => { setCrearMascotaModo(false); setErrMascota(''); }} style={{ background: 'none', border: 'none', color: '#8A8076', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>← Cancelar</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div><label style={miniLabelStyle}>Nombre *</label><input style={inputStyle} value={mascotaNueva.name} onChange={e => setMascotaNueva(f => ({ ...f, name: e.target.value }))} /></div>
                        <div><label style={miniLabelStyle}>Especie</label>
                          <select style={inputStyle} value={mascotaNueva.species} onChange={e => setMascotaNueva(f => ({ ...f, species: e.target.value }))}>
                            {SPECIES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div><label style={miniLabelStyle}>Raza *</label><input style={inputStyle} value={mascotaNueva.breed} onChange={e => setMascotaNueva(f => ({ ...f, breed: e.target.value }))} /></div>
                        <div><label style={miniLabelStyle}>Sexo *</label>
                          <select style={inputStyle} value={mascotaNueva.sex} onChange={e => setMascotaNueva(f => ({ ...f, sex: e.target.value }))}>
                            <option>Macho</option><option>Hembra</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div><label style={miniLabelStyle}>Fecha nacimiento *</label><input type="date" style={inputStyle} value={mascotaNueva.fecha_nacimiento} onChange={e => setMascotaNueva(f => ({ ...f, fecha_nacimiento: e.target.value }))} /></div>
                        <div><label style={miniLabelStyle}>Peso (kg) *</label><input type="number" style={inputStyle} value={mascotaNueva.weight} onChange={e => setMascotaNueva(f => ({ ...f, weight: e.target.value }))} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem' }}>
                        <div><label style={miniLabelStyle}>Esterilizado *</label>
                          <select style={inputStyle} value={mascotaNueva.esterilizado} onChange={e => setMascotaNueva(f => ({ ...f, esterilizado: e.target.value }))}>
                            <option>No</option><option>Sí</option>
                          </select>
                        </div>
                        <div><label style={miniLabelStyle}>Carácter *</label>
                          <select style={inputStyle} value={mascotaNueva.caracter} onChange={e => setMascotaNueva(f => ({ ...f, caracter: e.target.value }))}>
                            {['Dócil', 'Calmado', 'Nervioso', 'Agresivo'].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      {errMascota && <p style={{ color: '#c0392b', fontSize: '0.82rem', marginBottom: '0.8rem' }}>{errMascota}</p>}
                      <button onClick={handleCrearMascota} disabled={savingMascota} style={{ width: '100%', padding: '0.7rem', background: savingMascota ? '#ccc' : '#316d74', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.88rem', cursor: savingMascota ? 'not-allowed' : 'pointer' }}>
                        {savingMascota ? 'Registrando…' : 'Registrar mascota y continuar'}
                      </button>
                    </div>
                  ) : (
                    <>
                      {mascotasDelCliente.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: '#8A8076', marginBottom: '0.8rem' }}>Este cliente no tiene mascotas registradas.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.8rem' }}>
                          {mascotasDelCliente.map(m => (
                            <button key={m.id} onClick={() => setMascotaSel(m)} style={{ textAlign: 'left', padding: '0.55rem 0.85rem', background: mascotaSel?.id === m.id ? '#316d74' : '#f7f9fc', color: mascotaSel?.id === m.id ? 'white' : '#1c2333', border: `1px solid ${mascotaSel?.id === m.id ? '#316d74' : '#eceff3'}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem' }}>
                              🐾 {m.name} — {m.species}
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setCrearMascotaModo(true)} style={{ width: '100%', textAlign: 'center', padding: '0.55rem', background: 'white', border: '1.5px dashed #316d74', color: '#316d74', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem', marginBottom: '1rem' }}>
                        + Registrar mascota nueva
                      </button>
                    </>
                  )}

                  {mascotaSel && (
                    <>
                      {yaAfiliada && <p style={{ color: '#c0392b', fontSize: '0.82rem', marginBottom: '0.8rem' }}>⚠️ {mascotaSel.name} ya tiene una afiliación activa.</p>}
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Plan</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                        {['urgencias', 'total'].map(p => (
                          <button key={p} onClick={() => setPlan(p)} style={{ padding: '0.7rem', background: plan === p ? '#316d74' : 'white', color: plan === p ? 'white' : '#1c2333', border: `1.5px solid ${plan === p ? '#316d74' : '#dfe3ea'}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                            {PLAN_LABEL[p]}
                          </button>
                        ))}
                      </div>

                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Fecha de afiliación</label>
                      <input type="date" value={fechaAfiliacion} onChange={e => setFechaAfiliacion(e.target.value)} style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem' }} />

                      <div style={{ background: '#fff8e1', border: '1px solid #f0d98c', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#8a6d00', fontWeight: 700, textTransform: 'uppercase' }}>Precio mensual (mascota #{numeroMascota} del titular)</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1c2333' }}>{fmtCOP(precioCalculado)}</div>
                      </div>

                      {err && <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{err}</p>}
                      <button onClick={handleAfiliar} disabled={saving || yaAfiliada} style={{ width: '100%', padding: '0.8rem', background: (saving || yaAfiliada) ? '#ccc' : '#316d74', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.92rem', cursor: (saving || yaAfiliada) ? 'not-allowed' : 'pointer' }}>
                        {saving ? 'Afiliando…' : 'Afiliar'}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
