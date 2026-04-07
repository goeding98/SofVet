import { useState, useMemo } from 'react';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabaseClient';

const MONTHLY_RATE = 69900;
const today = () => new Date().toISOString().split('T')[0];
const todayDate = () => new Date();

function addMonths(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
}

function formatCOP(n) {
  return '$' + Number(n).toLocaleString('es-CO');
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function getStatus(item) {
  if (item.status === 'baja') return 'baja';
  if (!item.paid_until) return 'mora';
  return new Date(item.paid_until + 'T23:59:59') >= todayDate() ? 'activo' : 'mora';
}

const STATUS_STYLE = {
  activo: { bg: '#e8f5ee', color: '#2e7d50', label: '✅ Afiliado' },
  mora:   { bg: '#fff8e1', color: '#b8860b', label: '⚠️ En Mora'  },
  baja:   { bg: '#f5f5f5', color: '#888',    label: '⛔ Baja'     },
};

export default function PrepagadaPage() {
  const { items: prepagada, add, edit, remove, refresh, loading } = useStore('prepagada');
  const { items: patients } = useStore('patients');
  const { items: clients }  = useStore('clients');
  const { session } = useAuth();
  const isAdmin = session?.rol === 'Administrador';

  const [modal,       setModal]       = useState(false);
  const [cobroModal,  setCobroModal]  = useState(null); // item
  const [bajaModal,   setBajaModal]   = useState(null); // item
  const [mesesPago,   setMesesPago]   = useState(1);
  const [search,      setSearch]      = useState('');
  const [filterStatus,setFilterStatus]= useState('todos');
  const [saving,      setSaving]      = useState(false);

  // New affiliation form
  const [form, setForm] = useState({ patient_id: '', client_id: '', notes: '' });
  const [formError, setFormError] = useState('');

  const now = todayDate();
  const dayOfMonth = now.getDate();
  const showAlert = dayOfMonth <= 5;

  const enriched = useMemo(() => prepagada.map(item => {
    const pet    = patients.find(p => p.id === item.patient_id);
    const client = clients.find(c => c.id === (item.client_id || pet?.client_id));
    return { ...item, pet, client, computedStatus: getStatus(item) };
  }), [prepagada, patients, clients]);

  const deben = enriched.filter(i => i.computedStatus === 'mora');

  const filtered = enriched.filter(i => {
    const matchSearch = !search ||
      i.pet?.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || i.computedStatus === filterStatus;
    return matchSearch && matchStatus && i.computedStatus !== 'baja';
  });

  const handleAffiliate = async () => {
    setFormError('');
    if (!form.patient_id) return setFormError('Selecciona una mascota.');
    const pet = patients.find(p => p.id === parseInt(form.patient_id));
    if (!pet) return setFormError('Mascota no encontrada.');
    const already = prepagada.find(i => i.patient_id === pet.id && i.status !== 'baja');
    if (already) return setFormError('Esta mascota ya está afiliada.');
    setSaving(true);
    const client = clients.find(c => c.id === pet.client_id);
    await add({
      patient_id:   pet.id,
      patient_name: pet.name,
      client_id:    pet.client_id || null,
      client_name:  client?.name || '',
      status:       'activo',
      paid_until:   addMonths(today(), 1),
      plan_start:   today(),
      notes:        form.notes,
    });
    setSaving(false);
    setModal(false);
    setForm({ patient_id: '', client_id: '', notes: '' });
  };

  const handleCobro = async () => {
    if (!cobroModal) return;
    setSaving(true);
    const base = cobroModal.paid_until && new Date(cobroModal.paid_until + 'T23:59:59') >= todayDate()
      ? cobroModal.paid_until
      : today();
    const newPaidUntil = addMonths(base, mesesPago);
    await edit(cobroModal.id, { paid_until: newPaidUntil, status: 'activo' });
    setSaving(false);
    setCobroModal(null);
    setMesesPago(1);
  };

  const handleBaja = async () => {
    if (!bajaModal) return;
    setSaving(true);
    await edit(bajaModal.id, { status: 'baja', paid_until: null });
    setSaving(false);
    setBajaModal(null);
  };

  const labelSt = { display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text)' };
  const inputSt = { width: '100%', padding: '0.6rem 0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box' };

  const activos = enriched.filter(i => i.computedStatus === 'activo').length;
  const enMora  = enriched.filter(i => i.computedStatus === 'mora').length;

  return (
    <div>
      <div className="page-header">
        <h1>Medicina Prepagada</h1>
        <p>{activos} afiliados activos · {enMora} en mora</p>
      </div>

      {/* Alert first 5 days */}
      {showAlert && deben.length > 0 && (
        <div style={{ background: '#fff8e1', border: '1px solid #f0c040', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔔</span>
          <div>
            <div style={{ fontWeight: 700, color: '#b8860b', marginBottom: '0.25rem' }}>Cobros pendientes este mes ({deben.length})</div>
            <div style={{ fontSize: '0.82rem', color: '#7a5c00' }}>
              {deben.map(i => i.pet?.name || i.patient_name).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Afiliados activos', value: activos,                       color: '#2e7d50', bg: '#e8f5ee' },
          { label: 'En mora',           value: enMora,                        color: '#b8860b', bg: '#fff8e1' },
          { label: 'Ingresos/mes',      value: formatCOP(activos * MONTHLY_RATE), color: '#2e5cbf', bg: '#e8f0ff' },
        ].map(s => (
          <Card key={s.label}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ ...inputSt, flex: 1, minWidth: 180 }}
            placeholder="Buscar mascota o propietario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={{ ...inputSt, width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="mora">En mora</option>
          </select>
          {isAdmin && <Button variant="primary" onClick={() => setModal(true)} icon="+">Afiliar mascota</Button>}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
            <p>No hay afiliados registrados.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Mascota', 'Propietario', 'Estado', 'Pagado hasta', 'Afiliado desde', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const st = STATUS_STYLE[item.computedStatus] || STATUS_STYLE.mora;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(49,109,116,0.02)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        🐾 {item.pet?.name || item.patient_name}
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>{item.pet?.species}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem' }}>
                        {item.client?.name || item.client_name || '—'}
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{item.client?.phone}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: item.computedStatus === 'mora' ? 'var(--color-danger)' : 'var(--color-text)' }}>
                        {formatDate(item.paid_until)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {formatDate(item.plan_start)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => { setCobroModal(item); setMesesPago(1); }}
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}
                            >
                              💳 Cobrado
                            </button>
                            <button
                              onClick={() => setBajaModal(item)}
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}
                            >
                              Dar de baja
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Modal Afiliar ─────────────────────────────────────────────────────── */}
      {modal && isAdmin && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', margin: 0 }}>💳 Afiliar mascota</h3>
              <button onClick={() => setModal(false)} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelSt}>Mascota *</label>
                <select style={inputSt} value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
                  <option value="">— Selecciona una mascota —</option>
                  {patients
                    .filter(p => !prepagada.find(i => i.patient_id === p.id && i.status !== 'baja'))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(p => {
                      const owner = clients.find(c => c.id === p.client_id);
                      return <option key={p.id} value={p.id}>{p.name} — {owner?.name || 'Sin propietario'}</option>;
                    })
                  }
                </select>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelSt}>Notas</label>
                <input style={inputSt} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones opcionales..." />
              </div>
              <div style={{ background: 'var(--color-info-bg)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Se afiliará con 1 mes de vigencia a partir de hoy · {formatCOP(MONTHLY_RATE)}/mes
              </div>
              {formError && <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem', color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>⚠️ {formError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleAffiliate} disabled={saving}>{saving ? 'Guardando...' : '✅ Afiliar'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Cobro ───────────────────────────────────────────────────────── */}
      {cobroModal && (
        <div onClick={() => setCobroModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 420, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-success)', margin: 0 }}>💳 Registrar cobro</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                <strong>{cobroModal.pet?.name || cobroModal.patient_name}</strong> · {cobroModal.client?.name || cobroModal.client_name}
              </p>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelSt}>¿Cuántos meses pagó?</label>
                <select style={inputSt} value={mesesPago} onChange={e => setMesesPago(parseInt(e.target.value))}>
                  {[1,2,3,4,5,6,9,12].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'mes' : 'meses'} — {formatCOP(n * MONTHLY_RATE)}</option>
                  ))}
                </select>
              </div>
              <div style={{ background: 'var(--color-success-bg)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--color-success)' }}>
                Pagado hasta: <strong>{formatDate(addMonths(
                  cobroModal.paid_until && new Date(cobroModal.paid_until + 'T23:59:59') >= todayDate() ? cobroModal.paid_until : today(),
                  mesesPago
                ))}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setCobroModal(null)}>Cancelar</Button>
                <Button variant="primary" onClick={handleCobro} disabled={saving}>{saving ? 'Guardando...' : '✅ Confirmar cobro'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Baja ────────────────────────────────────────────────────────── */}
      {bajaModal && (
        <div onClick={() => setBajaModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 400, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-danger)', margin: 0 }}>⛔ Dar de baja</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                ¿Seguro que deseas dar de baja a <strong>{bajaModal.pet?.name || bajaModal.patient_name}</strong> del plan de Medicina Prepagada?
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setBajaModal(null)}>Cancelar</Button>
                <button onClick={handleBaja} disabled={saving} style={{ padding: '0.6rem 1.25rem', background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  {saving ? 'Guardando...' : '⛔ Confirmar baja'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
