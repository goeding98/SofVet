import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { useSede, sedeBadge, SEDES } from '../utils/useSede';
import Card from '../components/Card';
import Button from '../components/Button';

const UNIDADES    = ['ml', 'tabletas', 'paquetes', 'mg', 'comprimidos', 'gotas', 'otro'];
const FRECUENCIAS = ['Cada 2 horas', 'Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas', 'Cada 12 horas', 'Cada 24 horas', 'Una sola vez'];
const VIAS        = ['IV', 'IM', 'VO', 'SC', 'Tópica', 'Inhalada', 'Oftálmica', 'Ótica'];
const EMPTY_MED   = { medicamento: '', dosis: '', unidad: 'ml', via: 'IV', frecuencia: 'Cada 8 horas', observaciones: '' };

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text)',
};

const speciesIcon = s => ({ Perro: '🐶', Gato: '🐱', Conejo: '🐰', Ave: '🐦', Reptil: '🦎' }[s] || '🐾');

const statusBadge = (s) => {
  const map = {
    activo:     { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',   label: 'Hospitalizado' },
    cobrada:    { bg: 'var(--color-success-bg)', color: 'var(--color-success)',  label: 'Cobrada'       },
    no_cobrada: { bg: '#fff8e1',                 color: '#b8860b',               label: 'Sin cobrar'    },
    fallecido:  { bg: '#f5f5f5',                 color: '#666',                  label: 'Fallecido'     },
    deslinde:   { bg: '#fff3e0',                 color: '#b45309',               label: 'Deslinde'      },
  };
  const s2 = map[s] || map.activo;
  return <span style={{ background: s2.bg, color: s2.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>{s2.label}</span>;
};

function calcDuration(ingresoDate, altaDate) {
  if (!ingresoDate || !altaDate) return null;
  const ms   = new Date(altaDate) - new Date(ingresoDate);
  const days = Math.ceil(ms / 86400000);
  return days <= 0 ? 1 : days;
}

function buildApplicationSummary(aplicaciones) {
  const rows = [];
  (aplicaciones || []).forEach(app => {
    (app.medicamentos || []).forEach(m => {
      rows.push({
        medicamento:  m.medicamento,
        dosis:        m.dosis,
        unidad:       m.unidad,
        hora:         app.hora,
        fecha:        app.fecha,
        aplicado_por: app.aplicado_por,
        notas:        app.notas,
      });
    });
  });
  const totals = {};
  rows.forEach(r => {
    const key = `${r.medicamento}__${r.unidad}`;
    if (!totals[key]) totals[key] = { medicamento: r.medicamento, unidad: r.unidad, total: 0, aplicaciones: 0 };
    totals[key].total      += parseFloat(r.dosis) || 0;
    totals[key].aplicaciones += 1;
  });
  return { rows, totals: Object.values(totals) };
}

function buildConsumoSummary(consumo, liquidaciones_parciales) {
  const allConsumo = consumo || [];
  const liquidatedIds = new Set(
    (liquidaciones_parciales || []).flatMap(lp => lp.item_ids || [])
  );
  const idToLiqDate = {};
  (liquidaciones_parciales || []).forEach(lp => {
    (lp.item_ids || []).forEach(id => { idToLiqDate[id] = `${lp.fecha} ${lp.hora}`; });
  });
  const pending    = allConsumo.filter(item => !liquidatedIds.has(item.id));
  const liquidated = allConsumo.filter(item =>  liquidatedIds.has(item.id));
  return { pending, liquidated, idToLiqDate };
}

function buildNochesSummary(ingresoDate, endDate, liquidaciones_parciales) {
  if (!ingresoDate) return [];
  const liquidatedNights = new Set(
    (liquidaciones_parciales || []).flatMap(lp => lp.noches || [])
  );
  const nightToLiqDate = {};
  (liquidaciones_parciales || []).forEach(lp => {
    (lp.noches || []).forEach(n => { nightToLiqDate[n] = `${lp.fecha} ${lp.hora}`; });
  });
  const nights = [];
  let d = new Date(ingresoDate + 'T12:00:00');
  const end = new Date((endDate || new Date().toISOString().split('T')[0]) + 'T12:00:00');
  let idx = 1;
  while (d <= end) {
    const dateStr = d.toISOString().split('T')[0];
    nights.push({ fecha: dateStr, idx, liquidado: liquidatedNights.has(dateStr), liqDate: nightToLiqDate[dateStr] });
    d.setDate(d.getDate() + 1);
    idx++;
  }
  return nights;
}

function fmtNoche(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function HospitalizationPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { items: hosps, edit: editHosp, remove: removeHosp, refresh: refreshHosps } = useStore('hospitalization');

  // Forzar datos frescos al entrar — múltiples usuarios editan hospitalizaciones simultáneamente
  useEffect(() => { refreshHosps(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  const { items: patients, edit: editPatient }               = useStore('patients');

  const isAdmin    = session?.rol === 'Administrador';
  const isAuxiliar = session?.rol === 'Auxiliar';
  const isMedico   = session?.rol === 'Médico' || session?.rol === 'Administrador';
  // Domicilio (id=4) users and admins can see all sedes; others see only their sede
  const canSeeAllSedes = isAdmin || session?.sede_id === 4;
  const [hospSedeFilter, setHospSedeFilter] = useState(canSeeAllSedes ? null : session?.sede_id || null);

  // ── view state ─────────────────────────────────────────────────────────
  const [selectedId,     setSelectedId]     = useState(null);
  const [showNoCobradas, setShowNoCobradas] = useState(false);
  const [resumenHosp,    setResumenHosp]    = useState(null);

  // ── apply modal ─────────────────────────────────────────────────────────
  const [applyModal,  setApplyModal]  = useState(false);
  const [applyHospId, setApplyHospId] = useState(null);
  const [checkedMeds, setCheckedMeds] = useState({});
  const [applyNotas,  setApplyNotas]  = useState('');
  const [applyError,  setApplyError]  = useState('');

  // ── alta modal ──────────────────────────────────────────────────────────
  const [altaModal, setAltaModal] = useState(false);
  const [altaHosp,  setAltaHosp]  = useState(null);

  // ── edit treatment modal ────────────────────────────────────────────────
  const [editTxModal,  setEditTxModal]  = useState(false);
  const [editTxHospId, setEditTxHospId] = useState(null);
  const [editTxMeds,   setEditTxMeds]   = useState([]);

  // ── hoja de consumo modal ───────────────────────────────────────────────
  const [consumoModal,   setConsumoModal]   = useState(false);
  const [consumoHospId,  setConsumoHospId]  = useState(null);
  const [consumoNewDesc, setConsumoNewDesc] = useState('');
  const [consumoNewCant, setConsumoNewCant] = useState('');

  // ── liquidación parcial modal ───────────────────────────────────────────
  const [liquidModal,         setLiquidModal]         = useState(false);
  const [liquidHospId,        setLiquidHospId]        = useState(null);
  const [liquidChecked,       setLiquidChecked]       = useState({});
  const [liquidNochesChecked, setLiquidNochesChecked] = useState({});
  const [liquidAppChecked,    setLiquidAppChecked]    = useState({});

  // ── derived ─────────────────────────────────────────────────────────────
  const activos    = hosps.filter(h => h.status === 'activo'     && (hospSedeFilter === null || h.sede_id === hospSedeFilter));
  const noCobradas = hosps.filter(h => h.status === 'no_cobrada' && (hospSedeFilter === null || h.sede_id === hospSedeFilter)).slice(-20).reverse();
  const selected    = hosps.find(h => h.id === selectedId);
  const applyHosp   = hosps.find(h => h.id === applyHospId);
  const editTxHosp  = hosps.find(h => h.id === editTxHospId);
  const consumoHosp = hosps.find(h => h.id === consumoHospId);
  const liquidHosp  = hosps.find(h => h.id === liquidHospId);

  // ── alta flow ───────────────────────────────────────────────────────────
  const openAlta = (h) => { setAltaHosp(h); setAltaModal(true); };

  const handleDischarge = (h, billingStatus) => {
    const now = new Date();
    const altaDate = now.toISOString().split('T')[0];
    const altaTime = now.toTimeString().slice(0, 5);
    editHosp(h.id, {
      status:       billingStatus,
      alta_date:    altaDate,
      alta_time:    altaTime,
      duration_days: calcDuration(h.ingreso_date, altaDate),
    });
    if (patients.find(p => p.id === h.patient_id)) {
      editPatient(h.patient_id, { status: 'activo' });
    }
    setAltaModal(false);
    setAltaHosp(null);
    if (selectedId === h.id) setSelectedId(null);
  };

  const handleFallecido = (h) => {
    if (!confirm(`⚠️ ¿Registrar fallecimiento de ${h.patient_name}? Esta acción no se puede deshacer.`)) return;
    const now = new Date();
    editHosp(h.id, { status: 'fallecido', alta_date: now.toISOString().split('T')[0], alta_time: now.toTimeString().slice(0, 5), duration_days: calcDuration(h.ingreso_date, now.toISOString().split('T')[0]) });
    if (patients.find(p => p.id === h.patient_id)) editPatient(h.patient_id, { status: 'inactivo' });
    if (selectedId === h.id) setSelectedId(null);
  };

  const handleDeslinde = (h) => {
    if (!confirm(`⚠️ ¿Registrar salida por deslinde informado de ${h.patient_name}?\n\nEl propietario se lleva al paciente bajo su responsabilidad.`)) return;
    const now = new Date();
    const altaDate = now.toISOString().split('T')[0];
    editHosp(h.id, { status: 'deslinde', alta_date: altaDate, alta_time: now.toTimeString().slice(0, 5), duration_days: calcDuration(h.ingreso_date, altaDate) });
    if (patients.find(p => p.id === h.patient_id)) editPatient(h.patient_id, { status: 'activo' });
    if (selectedId === h.id) setSelectedId(null);
  };

  const handleMarkPaid = (h) => {
    if (!confirm(`¿Marcar como cobrada la hospitalización de ${h.patient_name}?`)) return;
    editHosp(h.id, { status: 'cobrada' });
  };

  const handleDelete = (h) => {
    if (!confirm(`¿Eliminar completamente el registro de hospitalización de ${h.patient_name}?`)) return;
    removeHosp(h.id);
  };

  // ── apply modal ─────────────────────────────────────────────────────────
  const openApply = (h) => {
    setApplyHospId(h.id);
    const init = {};
    (h.tratamiento || []).forEach((t, i) => { init[i] = { checked: false, dosis: t.dosis, unidad: t.unidad }; });
    setCheckedMeds(init);
    setApplyNotas('');
    setApplyError('');
    setApplyModal(true);
  };

  const toggleCheck = (i) =>
    setCheckedMeds(prev => ({ ...prev, [i]: { ...prev[i], checked: !prev[i].checked } }));

  const handleSaveApplication = () => {
    setApplyError('');
    const selected_meds = Object.entries(checkedMeds)
      .filter(([, v]) => v.checked)
      .map(([idx, v]) => ({
        medicamento: applyHosp.tratamiento[idx].medicamento,
        dosis:       v.dosis,
        unidad:      v.unidad,
      }));
    if (!selected_meds.length) { setApplyError('Selecciona al menos un medicamento aplicado.'); return; }
    const now = new Date();
    const newApp = {
      medicamentos: selected_meds,
      notas:        applyNotas,
      aplicado_por: session?.nombre || 'Desconocido',
      fecha:        now.toISOString().split('T')[0],
      hora:         now.toTimeString().slice(0, 5),
    };
    editHosp(applyHospId, { aplicaciones: [...(applyHosp.aplicaciones || []), newApp] });
    setApplyModal(false);
  };

  // ── edit treatment ──────────────────────────────────────────────────────
  const openEditTx = (h) => { setEditTxHospId(h.id); setEditTxMeds((h.tratamiento || []).map(t => ({ ...t }))); setEditTxModal(true); };
  const updateEditTxMed = (i, field, val) => setEditTxMeds(m => m.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const handleSaveEditTx = () => { editHosp(editTxHospId, { tratamiento: editTxMeds.filter(m => m.medicamento.trim()) }); setEditTxModal(false); };

  // ── liquidar medicamento aplicado ───────────────────────────────────────
  const handleLiquidarAplicacion = (h, appFecha, appHora, medMedicamento) => {
    const key = `${appFecha}_${appHora}_${medMedicamento}`;
    const current = h.aplicaciones_liquidadas || [];
    if (current.includes(key)) return;
    editHosp(h.id, { aplicaciones_liquidadas: [...current, key] });
  };

  // ── hoja de consumo ─────────────────────────────────────────────────────
  const openConsumo = (h) => {
    setConsumoHospId(h.id);
    setConsumoNewDesc('');
    setConsumoNewCant('');
    setConsumoModal(true);
  };

  const handleAddConsumo = () => {
    if (!consumoNewDesc.trim() || !consumoHosp) return;
    const now = new Date();
    const newItem = {
      id:             Date.now(),
      descripcion:    consumoNewDesc.trim(),
      cantidad:       consumoNewCant.trim() || '1',
      fecha:          now.toISOString().split('T')[0],
      hora:           now.toTimeString().slice(0, 5),
      registrado_por: session?.nombre || 'Desconocido',
    };
    editHosp(consumoHospId, { consumo: [...(consumoHosp.consumo || []), newItem] });
    setConsumoNewDesc('');
    setConsumoNewCant('');
  };

  const handleDeleteConsumo = (hospId, itemId) => {
    const h = hosps.find(x => x.id === hospId);
    if (!h) return;
    // Cannot delete liquidated items
    const liquidatedIds = new Set((h.liquidaciones_parciales || []).flatMap(lp => lp.item_ids || []));
    if (liquidatedIds.has(itemId)) { alert('Este ítem ya fue liquidado y no puede eliminarse.'); return; }
    editHosp(hospId, { consumo: (h.consumo || []).filter(item => item.id !== itemId) });
  };

  // ── liquidación parcial ─────────────────────────────────────────────────
  const openLiquidParcial = (h) => {
    setLiquidHospId(h.id);
    // consumo items
    const liquidatedIds = new Set((h.liquidaciones_parciales || []).flatMap(lp => lp.item_ids || []));
    const init = {};
    (h.consumo || []).forEach(item => {
      if (!liquidatedIds.has(item.id)) init[item.id] = false;
    });
    setLiquidChecked(init);
    // noches
    const today = new Date().toISOString().split('T')[0];
    const noches = buildNochesSummary(h.ingreso_date, today, h.liquidaciones_parciales);
    const nochesInit = {};
    noches.filter(n => !n.liquidado).forEach(n => { nochesInit[n.fecha] = false; });
    setLiquidNochesChecked(nochesInit);
    // aplicaciones de medicamentos
    const liquidadasKeys = new Set(h.aplicaciones_liquidadas || []);
    const appInit = {};
    (h.aplicaciones || []).forEach(a => {
      (a.medicamentos || []).forEach(m => {
        const key = `${a.fecha}_${a.hora}_${m.medicamento}`;
        if (!liquidadasKeys.has(key)) appInit[key] = false;
      });
    });
    setLiquidAppChecked(appInit);
    setLiquidModal(true);
  };

  const handleLiquidParcial = () => {
    if (!liquidHosp) return;
    const selectedIds    = Object.entries(liquidChecked).filter(([, v]) => v).map(([k]) => parseInt(k));
    const selectedNoches = Object.entries(liquidNochesChecked).filter(([, v]) => v).map(([k]) => k);
    const selectedApps   = Object.entries(liquidAppChecked).filter(([, v]) => v).map(([k]) => k);
    if (!selectedIds.length && !selectedNoches.length && !selectedApps.length) {
      alert('Selecciona al menos un ítem para liquidar.');
      return;
    }
    const now = new Date();
    const newLiq = {
      fecha:          now.toISOString().split('T')[0],
      hora:           now.toTimeString().slice(0, 5),
      registrado_por: session?.nombre || 'Desconocido',
      item_ids:       selectedIds,
      noches:         selectedNoches,
      items_snapshot: selectedIds.map(id => (liquidHosp.consumo || []).find(item => item.id === id)).filter(Boolean),
    };
    const updates = { liquidaciones_parciales: [...(liquidHosp.liquidaciones_parciales || []), newLiq] };
    if (selectedApps.length) {
      updates.aplicaciones_liquidadas = [...(liquidHosp.aplicaciones_liquidadas || []), ...selectedApps];
    }
    editHosp(liquidHosp.id, updates);
    setLiquidModal(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Hospitalización</h1>
        <p>{activos.length} paciente(s) hospitalizado(s) · {noCobradas.length} sin cobrar</p>
      </div>

      {/* ── Section 1: Active ── */}
      <div style={{ marginBottom: '1.5rem' }}>

        <Card
          title={`Pacientes hospitalizados ahora (${activos.length})`}
          action={
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {canSeeAllSedes && (
                <select
                  value={hospSedeFilter ?? ''}
                  onChange={e => setHospSedeFilter(e.target.value === '' ? null : parseInt(e.target.value))}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                >
                  <option value="">Todas las sedes</option>
                  {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
              <button
                onClick={() => setShowNoCobradas(v => !v)}
                style={{ padding: '0.35rem 0.85rem', borderRadius: 999, border: '1px solid #b8860b', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, background: showNoCobradas ? '#b8860b' : '#fff8e1', color: showNoCobradas ? 'white' : '#b8860b' }}
              >
                {showNoCobradas ? '▲ Ocultar' : '▼'} Sin cobrar ({noCobradas.length})
              </button>
            </div>
          }
        >
          {activos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏥</div>
              <p>No hay pacientes hospitalizados en este momento.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Para hospitalizar, ve a la ficha del paciente y usa el botón "Hospitalizar".</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Paciente', 'Cliente', 'Sede', 'Motivo', 'Ingreso', 'Veterinario', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activos.map((h, idx) => (
                    <tr
                      key={h.id}
                      style={{ borderBottom: '1px solid var(--color-border)', background: selectedId === h.id ? 'rgba(49,109,116,0.05)' : idx % 2 === 0 ? 'transparent' : 'rgba(49,109,116,0.02)', cursor: 'pointer' }}
                      onClick={() => setSelectedId(selectedId === h.id ? null : h.id)}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.3rem' }}>{speciesIcon(h.species)}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{h.patient_name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{h.species}{h.breed ? ` · ${h.breed}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 500 }}>{h.client_name}</div>
                        {h.client_phone && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{h.client_phone}</div>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>{sedeBadge(h.sede_id)}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', maxWidth: 180 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.motivo || '—'}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        <div>{h.ingreso_date}</div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>{h.ingreso_time}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem' }}>{h.responsible_vet}</td>
                      <td style={{ padding: '0.85rem 1rem' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button onClick={() => setSelectedId(selectedId === h.id ? null : h.id)} style={btnStyle('var(--color-primary)')}>
                            {selectedId === h.id ? 'Ocultar' : 'Detalles'}
                          </button>
                          {(isAuxiliar || isMedico) && (
                            <button onClick={() => openApply(h)} style={btnStyle('var(--color-secondary)')}>💊 Tratamiento</button>
                          )}
                          {(isAuxiliar || isMedico) && (
                            <button onClick={() => openConsumo(h)} style={btnStyle('#e67e22')}>📋 Consumo</button>
                          )}
                          {isMedico && (
                            <>
                              <button onClick={() => openLiquidParcial(h)} style={btnStyle('#8e44ad')}>💰 Liq. Parcial</button>
                              <button onClick={() => openAlta(h)} style={btnStyle('var(--color-success)')}>✅ Alta</button>
                              <button onClick={() => handleDeslinde(h)} style={btnStyle('#b45309')}>📋 Deslinde</button>
                              <button onClick={() => handleFallecido(h)} style={btnStyle('var(--color-danger)')}>💀 Fallecido</button>
                            </>
                          )}
                          {h.patient_id && (
                            <button onClick={() => navigate(`/patients/${h.patient_id}`)} style={btnStyle('#7c5cbf')}>🐾 Ficha</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>

      {/* ══════════════ MODAL: DETALLE PACIENTE ══════════════ */}
      {selected && (
        <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', backdropFilter: 'blur(2px)', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 700, margin: 'auto', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-info-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '1.1rem', margin: '0 0 0.15rem' }}>
                  {speciesIcon(selected.species)} {selected.patient_name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {selected.species}{selected.breed ? ` · ${selected.breed}` : ''}{selected.weight ? ` · ${selected.weight} kg` : ''}{selected.age ? ` · ${selected.age} años` : ''}
                </p>
              </div>
              <button onClick={() => setSelectedId(null)} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Info general */}
              <div>
                <div style={{ marginBottom: '0.6rem' }}>{sedeBadge(selected.sede_id)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <InfoChip label="Cliente"      value={selected.client_name} />
                  <InfoChip label="Ingreso"      value={`${selected.ingreso_date} ${selected.ingreso_time}`} />
                  <InfoChip label="Veterinario"  value={selected.responsible_vet} />
                  <InfoChip label="Aplicaciones" value={`${selected.aplicaciones?.length || 0} registradas`} />
                </div>
                <InfoBlock label="Motivo"      value={selected.motivo} />
                <InfoBlock label="Diagnóstico" value={selected.diagnostico} />
              </div>

              {/* Plan de tratamiento */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Plan de tratamiento</div>
                  {isMedico && (
                    <button onClick={() => openEditTx(selected)} style={{ padding: '0.3rem 0.75rem', background: 'var(--color-white)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600 }}>
                      ✏️ Editar
                    </button>
                  )}
                </div>
                {!selected.tratamiento?.length ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>Sin plan registrado.</p>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                          {['Medicamento', 'Dosis', 'Vía', 'Frecuencia'].map(h => (
                            <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.tratamiento.map((t, i) => (
                          <tr key={i} style={{ borderBottom: i < selected.tratamiento.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{t.medicamento}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{t.dosis} {t.unidad}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{t.via || '—'}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>{t.frecuencia}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Historial de aplicaciones */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                    Historial de aplicaciones ({selected.aplicaciones?.length || 0})
                  </div>
                  {selected.status === 'activo' && (isAuxiliar || isMedico) && (
                    <button onClick={() => { setSelectedId(null); openApply(selected); }} style={{ padding: '0.3rem 0.75rem', background: 'var(--color-white)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600 }}>
                      💊 Registrar aplicación
                    </button>
                  )}
                </div>
                {!selected.aplicaciones?.length ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>Aún no se han registrado aplicaciones.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 340, overflowY: 'auto' }}>
                    {[...selected.aplicaciones].reverse().map((a, i) => {
                      const liquidadasKeys = selected.aplicaciones_liquidadas || [];
                      return (
                        <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>💊 Aplicación</span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>{a.fecha} {a.hora} · Por: <strong>{a.aplicado_por}</strong></span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {a.medicamentos?.map((m, mi) => {
                              const key = `${a.fecha}_${a.hora}_${m.medicamento}`;
                              const liquidado = liquidadasKeys.includes(key);
                              return (
                                <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', background: liquidado ? 'var(--color-success-bg)' : 'var(--color-bg)' }}>
                                  <span style={{ flex: 1, fontSize: '0.8rem' }}>· {m.medicamento} — {m.dosis} {m.unidad}</span>
                                  {liquidado ? (
                                    <span style={{ fontSize: '0.65rem', background: 'var(--color-success)', color: 'white', padding: '1px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>✓ Liquidado</span>
                                  ) : isMedico ? (
                                    <button
                                      onClick={() => handleLiquidarAplicacion(selected, a.fecha, a.hora, m.medicamento)}
                                      style={{ fontSize: '0.65rem', background: 'none', border: '1px solid #8e44ad', color: '#8e44ad', padding: '1px 7px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
                                    >
                                      💰 Liquidar
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                          {a.notas && <div style={{ marginTop: '0.4rem', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>📝 {a.notas}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hoja de consumo */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                    Hoja de consumo ({selected.consumo?.length || 0} ítems)
                  </div>
                  {(isAuxiliar || isMedico) && selected.status === 'activo' && (
                    <button onClick={() => { setSelectedId(null); openConsumo(selected); }} style={{ padding: '0.3rem 0.75rem', background: 'var(--color-white)', border: '1px solid #e67e22', borderRadius: 'var(--radius-sm)', color: '#e67e22', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600 }}>
                      + Agregar ítem
                    </button>
                  )}
                </div>
                {!selected.consumo?.length ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>Sin ítems registrados.</p>
                ) : (() => {
                  const liquidatedIds = new Set((selected.liquidaciones_parciales || []).flatMap(lp => lp.item_ids || []));
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 220, overflowY: 'auto' }}>
                      {selected.consumo.map(item => {
                        const liquidado = liquidatedIds.has(item.id);
                        return (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: liquidado ? 'var(--color-success-bg)' : 'var(--color-white)', fontSize: '0.8rem' }}>
                            <span style={{ flex: 1 }}>{item.descripcion}</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>x{item.cantidad}</span>
                            {liquidado
                              ? <span style={{ fontSize: '0.68rem', background: 'var(--color-success)', color: 'white', padding: '1px 6px', borderRadius: 999 }}>Liquidado</span>
                              : <span style={{ fontSize: '0.68rem', background: '#fff3cd', color: '#856404', padding: '1px 6px', borderRadius: 999 }}>Pendiente</span>
                            }
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {selected.status === 'activo' && isMedico && (() => {
                  const liquidatedIds = new Set((selected.liquidaciones_parciales || []).flatMap(lp => lp.item_ids || []));
                  const pendingCount = (selected.consumo || []).filter(item => !liquidatedIds.has(item.id)).length;
                  return pendingCount > 0 ? (
                    <div style={{ marginTop: '0.6rem' }}>
                      <button onClick={() => { setSelectedId(null); openLiquidParcial(selected); }} style={{ ...btnStyle('#8e44ad'), padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}>
                        💰 Liquidar ítems ({pendingCount} pendiente{pendingCount !== 1 ? 's' : ''})
                      </button>
                    </div>
                  ) : null;
                })()}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Section 2: No cobradas ── */}
      {showNoCobradas && (
        <Card
          title={`Hospitalizaciones sin cobrar (${noCobradas.length})`}
          style={{ marginBottom: '1.5rem' }}
        >
          {noCobradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <p>No hay hospitalizaciones pendientes de cobro.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Cliente', 'Mascota', 'Fecha ingreso', 'Fecha alta', 'Duración', 'Aplicaciones', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {noCobradas.map((h, idx) => {
                    const dur = h.duration_days || calcDuration(h.ingreso_date, h.alta_date);
                    const totalApps = (h.aplicaciones || []).reduce((acc, a) => acc + (a.medicamentos?.length || 0), 0);
                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(184,134,11,0.03)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>{h.client_name}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>{speciesIcon(h.species)}</span>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{h.patient_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem' }}>{h.ingreso_date}</td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem' }}>{h.alta_date || '—'}</td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                          {dur ? (
                            <span style={{ fontWeight: 600 }}>{dur} día{dur !== 1 ? 's' : ''}</span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          {totalApps > 0
                            ? <span style={{ background: 'var(--color-info-bg)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>{totalApps} aplicación{totalApps !== 1 ? 'es' : ''}</span>
                            : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Ninguna</span>
                          }
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button onClick={() => setResumenHosp(h)} style={btnStyle('var(--color-primary)')}>
                              📋 Resumen
                            </button>
                            <button onClick={() => handleMarkPaid(h)} style={btnStyle('var(--color-success)')}>
                              ✅ Cobrada
                            </button>
                            <button onClick={() => handleDelete(h)} style={btnStyle('var(--color-danger)')}>
                              🗑 Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ══════════════ MODAL: DAR DE ALTA ══════════════ */}
      {altaModal && altaHosp && (() => {
        const now      = new Date();
        const altaDate = now.toISOString().split('T')[0];
        const dur      = calcDuration(altaHosp.ingreso_date, altaDate);
        const { rows, totals } = buildApplicationSummary(altaHosp.aplicaciones);
        const { pending: consumoPending, liquidated: consumoLiquidated, idToLiqDate } = buildConsumoSummary(altaHosp.consumo, altaHosp.liquidaciones_parciales);
        const noches = buildNochesSummary(altaHosp.ingreso_date, altaDate, altaHosp.liquidaciones_parciales);
        const nochesPending    = noches.filter(n => !n.liquidado);
        const nochesLiquidated = noches.filter(n =>  n.liquidado);
        return (
          <div onClick={() => setAltaModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', backdropFilter: 'blur(2px)', overflowY: 'auto' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 680, overflow: 'hidden', margin: 'auto' }}>

              {/* Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-success-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-success)', fontSize: '1.1rem', margin: '0 0 0.15rem' }}>✅ Dar de alta — {altaHosp.patient_name}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Ingreso: {altaHosp.ingreso_date} {altaHosp.ingreso_time} · Alta: {altaDate} · Duración: <strong>{dur} día{dur !== 1 ? 's' : ''}</strong>
                  </p>
                </div>
                <button onClick={() => setAltaModal(false)} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Medicamentos aplicados */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>Medicamentos aplicados</div>
                  {rows.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>No se registraron aplicaciones de medicamentos.</p>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                            {['Medicamento', 'Cantidad', 'Unidad', 'Hora', 'Quién aplicó'].map(h => (
                              <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                              <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{r.medicamento}</td>
                              <td style={{ padding: '0.5rem 0.75rem' }}>{r.dosis}</td>
                              <td style={{ padding: '0.5rem 0.75rem' }}>{r.unidad}</td>
                              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{r.fecha} {r.hora}</td>
                              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>{r.aplicado_por}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Totales medicamentos */}
                {totals.length > 0 && (
                  <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Totales aplicados</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {totals.map((t, i) => (
                        <span key={i} style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', fontSize: '0.82rem', fontWeight: 500 }}>
                          {t.medicamento}: <strong>{t.total} {t.unidad}</strong> ({t.aplicaciones} aplic.)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Noches de hospitalización — pendiente */}
                {nochesPending.length > 0 && (
                  <div style={{ background: '#fff8e1', border: '1px solid #f5c842', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b8860b', marginBottom: '0.6rem' }}>
                      🌙 Noches pendientes de cobro ({nochesPending.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {nochesPending.map(n => (
                        <div key={n.fecha} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.25rem 0', borderBottom: '1px dashed #f5c842' }}>
                          <span>Noche {n.idx}</span>
                          <span style={{ color: '#b8860b', fontWeight: 500 }}>{fmtNoche(n.fecha)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Noches ya liquidadas */}
                {nochesLiquidated.length > 0 && (
                  <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-success)', marginBottom: '0.6rem' }}>
                      ✅ Noches ya cobradas ({nochesLiquidated.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {nochesLiquidated.map(n => (
                        <div key={n.fecha} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.25rem 0', borderBottom: '1px dashed var(--color-success)', color: 'var(--color-text-muted)' }}>
                          <span>Noche {n.idx} — {fmtNoche(n.fecha)}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-success)' }}>cobrado {n.liqDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hoja de Consumo — pendiente */}
                {consumoPending.length > 0 && (
                  <div style={{ background: '#fff8e1', border: '1px solid #f5c842', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b8860b', marginBottom: '0.6rem' }}>
                      📋 Hoja de consumo — pendiente de cobro ({consumoPending.length} ítem{consumoPending.length !== 1 ? 's' : ''})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {consumoPending.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '0.3rem 0', borderBottom: '1px dashed #f5c842' }}>
                          <span>{item.descripcion}</span>
                          <span style={{ fontWeight: 600 }}>x{item.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hoja de Consumo — ya liquidado */}
                {consumoLiquidated.length > 0 && (
                  <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-success)', marginBottom: '0.6rem' }}>
                      ✅ Consumo ya liquidado ({consumoLiquidated.length} ítem{consumoLiquidated.length !== 1 ? 's' : ''})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {consumoLiquidated.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '0.3rem 0', borderBottom: '1px dashed var(--color-success)' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>{item.descripcion}</span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>x{item.cantidad}</span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 500 }}>cobrado {idToLiqDate[item.id]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleDischarge(altaHosp, 'cobrada')}
                    style={{ flex: 1, padding: '0.75rem 1rem', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, minWidth: 200 }}
                  >
                    ✅ Dar de alta — COBRADO
                  </button>
                  <button
                    onClick={() => handleDischarge(altaHosp, 'no_cobrada')}
                    style={{ flex: 1, padding: '0.75rem 1rem', background: '#b8860b', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, minWidth: 200 }}
                  >
                    🕐 Dar de alta — GUARDAR PARA COBRAR
                  </button>
                  <button
                    onClick={() => setAltaModal(false)}
                    style={{ padding: '0.75rem 1.25rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════ MODAL: RESUMEN (no cobradas) ══════════════ */}
      {resumenHosp && (() => {
        const dur = resumenHosp.duration_days || calcDuration(resumenHosp.ingreso_date, resumenHosp.alta_date);
        const { rows, totals } = buildApplicationSummary(resumenHosp.aplicaciones);
        const { pending: consumoPending, liquidated: consumoLiquidated, idToLiqDate } = buildConsumoSummary(resumenHosp.consumo, resumenHosp.liquidaciones_parciales);
        const nochesR = buildNochesSummary(resumenHosp.ingreso_date, resumenHosp.alta_date, resumenHosp.liquidaciones_parciales);
        return (
          <div onClick={() => setResumenHosp(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', backdropFilter: 'blur(2px)', overflowY: 'auto' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 660, overflow: 'hidden', margin: 'auto' }}>

              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: '#fff8e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-title)', color: '#b8860b', fontSize: '1.1rem', margin: '0 0 0.15rem' }}>📋 Resumen — {resumenHosp.patient_name}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {resumenHosp.client_name} · Ingreso: {resumenHosp.ingreso_date} · Alta: {resumenHosp.alta_date} · <strong>{dur} día{dur !== 1 ? 's' : ''}</strong>
                  </p>
                </div>
                <button onClick={() => setResumenHosp(null)} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <InfoBlock label="Motivo"      value={resumenHosp.motivo} />
                <InfoBlock label="Diagnóstico" value={resumenHosp.diagnostico} />

                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Medicamentos aplicados</div>
                  {rows.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Sin aplicaciones registradas.</p>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                            {['Medicamento', 'Cantidad', 'Unidad', 'Hora', 'Quién aplicó'].map(h => (
                              <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                              <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{r.medicamento}</td>
                              <td style={{ padding: '0.5rem 0.75rem' }}>{r.dosis}</td>
                              <td style={{ padding: '0.5rem 0.75rem' }}>{r.unidad}</td>
                              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{r.fecha} {r.hora}</td>
                              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>{r.aplicado_por}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {totals.length > 0 && (
                  <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Totales aplicados</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {totals.map((t, i) => (
                        <span key={i} style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', fontSize: '0.82rem', fontWeight: 500 }}>
                          {t.medicamento}: <strong>{t.total} {t.unidad}</strong> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>({t.aplicaciones} aplic.)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Noches en resumen */}
                {nochesR.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Noches de hospitalización</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {nochesR.map(n => (
                        <div key={n.fecha} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-sm)', background: n.liquidado ? 'var(--color-success-bg)' : '#fff8e1' }}>
                          <span style={{ color: n.liquidado ? 'var(--color-text-muted)' : 'var(--color-text)' }}>Noche {n.idx} — {fmtNoche(n.fecha)}</span>
                          {n.liquidado
                            ? <span style={{ fontSize: '0.68rem', color: 'var(--color-success)' }}>✅ cobrado {n.liqDate}</span>
                            : <span style={{ fontSize: '0.68rem', color: '#b8860b', fontWeight: 600 }}>Pendiente</span>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consumo en resumen */}
                {(consumoPending.length > 0 || consumoLiquidated.length > 0) && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Hoja de consumo</div>
                    {consumoPending.length > 0 && (
                      <div style={{ background: '#fff8e1', border: '1px solid #f5c842', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b8860b', marginBottom: '0.35rem' }}>Pendiente de cobro</div>
                        {consumoPending.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.2rem 0' }}>
                            <span>{item.descripcion}</span><span style={{ fontWeight: 600 }}>x{item.cantidad}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {consumoLiquidated.length > 0 && (
                      <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '0.35rem' }}>Ya cobrados</div>
                        {consumoLiquidated.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.2rem 0', color: 'var(--color-text-muted)' }}>
                            <span>{item.descripcion}</span>
                            <span>x{item.cantidad} · {idToLiqDate[item.id]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => { handleMarkPaid(resumenHosp); setResumenHosp(null); }} style={{ padding: '0.6rem 1.25rem', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600 }}>✅ Marcar como cobrada</button>
                  <button onClick={() => setResumenHosp(null)} style={{ padding: '0.6rem 1.1rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════ MODAL: APLICAR TRATAMIENTO ══════════════ */}
      {applyModal && applyHosp && (
        <div onClick={() => setApplyModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 520, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '1rem', margin: '0 0 0.1rem' }}>💊 Aplicar tratamiento</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{applyHosp.patient_name}</p>
              </div>
              <button onClick={() => setApplyModal(false)} style={{ width: 30, height: 30, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Selecciona medicamentos aplicados *</label>
                {!applyHosp.tratamiento?.length ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No hay plan de tratamiento registrado.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {applyHosp.tratamiento.map((t, i) => {
                      const entry = checkedMeds[i] || { checked: false, dosis: t.dosis, unidad: t.unidad };
                      return (
                        <div key={i} style={{ border: `1px solid ${entry.checked ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', background: entry.checked ? 'rgba(49,109,116,0.04)' : 'var(--color-white)', transition: 'all 0.15s' }}>
                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={entry.checked} onChange={() => toggleCheck(i)} style={{ marginTop: '0.15rem', accentColor: 'var(--color-primary)', width: 16, height: 16, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.medicamento}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Plan: {t.dosis} {t.unidad} · {t.frecuencia}</div>
                            </div>
                          </label>
                          {entry.checked && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px dashed var(--color-border)' }}>
                              <div>
                                <label style={{ ...labelStyle, fontSize: '0.68rem' }}>Cantidad aplicada</label>
                                <input value={entry.dosis} onChange={e => setCheckedMeds(prev => ({ ...prev, [i]: { ...prev[i], dosis: e.target.value } }))} style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }} />
                              </div>
                              <div>
                                <label style={{ ...labelStyle, fontSize: '0.68rem' }}>Unidad</label>
                                <select value={entry.unidad} onChange={e => setCheckedMeds(prev => ({ ...prev, [i]: { ...prev[i], unidad: e.target.value } }))} style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>
                                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Notas de aplicación</label>
                <textarea value={applyNotas} onChange={e => setApplyNotas(e.target.value)} rows={2} placeholder="Observaciones adicionales..." style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', resize: 'vertical', fontSize: '0.875rem' }} />
              </div>

              {applyError && (
                <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.8rem', color: 'var(--color-danger)', fontSize: '0.8rem' }}>⚠️ {applyError}</div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setApplyModal(false)} style={{ padding: '0.55rem 1.1rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Cancelar</button>
                <button onClick={handleSaveApplication} style={{ padding: '0.55rem 1.25rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600 }}>✅ Registrar aplicación</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: EDITAR TRATAMIENTO (Médico) ══════════════ */}
      {editTxModal && editTxHosp && (
        <div onClick={() => setEditTxModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', backdropFilter: 'blur(2px)', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 700, overflow: 'hidden', margin: 'auto' }}>
            <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '1rem', margin: '0 0 0.1rem' }}>✏️ Editar plan de tratamiento</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{editTxHosp.patient_name}</p>
              </div>
              <button onClick={() => setEditTxModal(false)} style={{ width: 30, height: 30, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              {isAdmin && (
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>📍 Sede:</label>
                  <select
                    value={editTxHosp.sede_id || ''}
                    onChange={e => editHosp(editTxHospId, { sede_id: parseInt(e.target.value) })}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)' }}
                  >
                    {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                <button onClick={() => setEditTxMeds(m => [...m, { ...EMPTY_MED }])} style={{ padding: '0.35rem 0.85rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600 }}>+ Agregar fila</button>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 660 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                      {['Medicamento', 'Dosis', 'Unidad', 'Vía', 'Frecuencia', 'Observaciones', ''].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editTxMeds.map((m, i) => (
                      <tr key={i} style={{ borderBottom: i < editTxMeds.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <td style={{ padding: '0.4rem 0.5rem' }}><input value={m.medicamento} onChange={e => updateEditTxMed(i, 'medicamento', e.target.value)} placeholder="Nombre" style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} /></td>
                        <td style={{ padding: '0.4rem 0.5rem' }}><input value={m.dosis} onChange={e => updateEditTxMed(i, 'dosis', e.target.value)} placeholder="0" style={{ width: 55, padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} /></td>
                        <td style={{ padding: '0.4rem 0.5rem' }}><select value={m.unidad} onChange={e => updateEditTxMed(i, 'unidad', e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>{UNIDADES.map(u => <option key={u}>{u}</option>)}</select></td>
                        <td style={{ padding: '0.4rem 0.5rem' }}><select value={m.via || 'IV'} onChange={e => updateEditTxMed(i, 'via', e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>{VIAS.map(v => <option key={v}>{v}</option>)}</select></td>
                        <td style={{ padding: '0.4rem 0.5rem' }}><select value={m.frecuencia} onChange={e => updateEditTxMed(i, 'frecuencia', e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>{FRECUENCIAS.map(f => <option key={f}>{f}</option>)}</select></td>
                        <td style={{ padding: '0.4rem 0.5rem' }}><input value={m.observaciones} onChange={e => updateEditTxMed(i, 'observaciones', e.target.value)} placeholder="Notas" style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} /></td>
                        <td style={{ padding: '0.4rem 0.5rem' }}><button onClick={() => setEditTxMeds(m2 => m2.filter((_, idx) => idx !== i))} style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}>✕</button></td>
                      </tr>
                    ))}
                    {editTxMeds.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Sin medicamentos. Agrega una fila.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button onClick={() => setEditTxModal(false)} style={{ padding: '0.55rem 1.1rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Cancelar</button>
                <button onClick={handleSaveEditTx} style={{ padding: '0.55rem 1.25rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600 }}>💾 Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: HOJA DE CONSUMO ══════════════ */}
      {consumoModal && consumoHosp && (() => {
        const liquidatedIds = new Set((consumoHosp.liquidaciones_parciales || []).flatMap(lp => lp.item_ids || []));
        return (
          <div onClick={() => setConsumoModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', backdropFilter: 'blur(2px)', overflowY: 'auto' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, overflow: 'hidden', margin: 'auto' }}>

              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: '#fff3e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-title)', color: '#e67e22', fontSize: '1.05rem', margin: '0 0 0.15rem' }}>📋 Hoja de consumo</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{consumoHosp.patient_name} · {consumoHosp.client_name}</p>
                </div>
                <button onClick={() => setConsumoModal(false)} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Formulario para nuevo ítem */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--color-bg)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Agregar ítem</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                    <div>
                      <label style={labelStyle}>Descripción *</label>
                      <input
                        value={consumoNewDesc}
                        onChange={e => setConsumoNewDesc(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddConsumo()}
                        placeholder="Ej: Lata de comida, Ecografía, Suero..."
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={labelStyle}>Cantidad</label>
                      <input
                        value={consumoNewCant}
                        onChange={e => setConsumoNewCant(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddConsumo()}
                        placeholder="1"
                        style={{ width: 70, padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleAddConsumo}
                      disabled={!consumoNewDesc.trim()}
                      style={{ padding: '0.5rem 1.25rem', background: consumoNewDesc.trim() ? '#e67e22' : 'var(--color-border)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: consumoNewDesc.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600 }}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                {/* Lista de ítems */}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    Ítems registrados ({consumoHosp.consumo?.length || 0})
                  </div>
                  {!consumoHosp.consumo?.length ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      Aún no hay ítems. Agrega el primero arriba.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 300, overflowY: 'auto' }}>
                      {consumoHosp.consumo.map(item => {
                        const liquidado = liquidatedIds.has(item.id);
                        return (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', border: `1px solid ${liquidado ? 'var(--color-success)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: liquidado ? 'var(--color-success-bg)' : 'var(--color-white)' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.descripcion}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{item.fecha} {item.hora} · Por: {item.registrado_por}</div>
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 30, textAlign: 'right' }}>x{item.cantidad}</span>
                            {liquidado
                              ? <span style={{ fontSize: '0.68rem', background: 'var(--color-success)', color: 'white', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>✅ Liquidado</span>
                              : (
                                <button
                                  onClick={() => handleDeleteConsumo(consumoHosp.id, item.id)}
                                  style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.72rem', flexShrink: 0 }}
                                >✕</button>
                              )
                            }
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setConsumoModal(false)} style={{ padding: '0.55rem 1.25rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════ MODAL: LIQUIDACIÓN PARCIAL ══════════════ */}
      {liquidModal && liquidHosp && (() => {
        const today         = new Date().toISOString().split('T')[0];
        const liquidatedIds = new Set((liquidHosp.liquidaciones_parciales || []).flatMap(lp => lp.item_ids || []));
        const pendingItems  = (liquidHosp.consumo || []).filter(item => !liquidatedIds.has(item.id));
        const allNoches     = buildNochesSummary(liquidHosp.ingreso_date, today, liquidHosp.liquidaciones_parciales);
        const pendingNoches = allNoches.filter(n => !n.liquidado);
        const liquidadasAppKeys = new Set(liquidHosp.aplicaciones_liquidadas || []);
        const pendingAppItems   = (liquidHosp.aplicaciones || []).flatMap(a =>
          (a.medicamentos || [])
            .map(m => ({ key: `${a.fecha}_${a.hora}_${m.medicamento}`, medicamento: m.medicamento, dosis: m.dosis, unidad: m.unidad, fecha: a.fecha, hora: a.hora, aplicado_por: a.aplicado_por }))
            .filter(item => !liquidadasAppKeys.has(item.key))
        );
        const selectedConsumoCount = Object.values(liquidChecked).filter(Boolean).length;
        const selectedNochesCount  = Object.values(liquidNochesChecked).filter(Boolean).length;
        const selectedAppCount     = Object.values(liquidAppChecked).filter(Boolean).length;
        const selectedCount = selectedConsumoCount + selectedNochesCount + selectedAppCount;
        return (
          <div onClick={() => setLiquidModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', backdropFilter: 'blur(2px)', overflowY: 'auto' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 560, overflow: 'hidden', margin: 'auto' }}>

              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: '#f3e8ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-title)', color: '#8e44ad', fontSize: '1.05rem', margin: '0 0 0.15rem' }}>💰 Liquidación parcial</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{liquidHosp.patient_name} · Selecciona los ítems a cobrar ahora</p>
                </div>
                <button onClick={() => setLiquidModal(false)} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Medicamentos aplicados — checkboxes */}
                {pendingAppItems.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8e44ad', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>💊 Medicamentos aplicados</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: 400, fontSize: '0.72rem', textTransform: 'none', letterSpacing: 0 }}>
                        <input
                          type="checkbox"
                          checked={pendingAppItems.every(item => liquidAppChecked[item.key])}
                          onChange={e => {
                            const next = {};
                            pendingAppItems.forEach(item => { next[item.key] = e.target.checked; });
                            setLiquidAppChecked(next);
                          }}
                          style={{ accentColor: '#8e44ad' }}
                        />
                        Todos
                      </label>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 200, overflowY: 'auto' }}>
                      {pendingAppItems.map(item => (
                        <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', border: `1px solid ${liquidAppChecked[item.key] ? '#8e44ad' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: liquidAppChecked[item.key] ? '#f3e8ff' : 'var(--color-white)', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <input
                            type="checkbox"
                            checked={!!liquidAppChecked[item.key]}
                            onChange={e => setLiquidAppChecked(prev => ({ ...prev, [item.key]: e.target.checked }))}
                            style={{ accentColor: '#8e44ad', width: 16, height: 16, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.medicamento}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{item.fecha} {item.hora} · Por: {item.aplicado_por}</div>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: liquidAppChecked[item.key] ? '#8e44ad' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{item.dosis} {item.unidad}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {pendingNoches.length === 0 && pendingItems.length === 0 && pendingAppItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                    <p style={{ fontSize: '0.875rem' }}>Todo está liquidado. No hay ítems pendientes.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: '#f3e8ff', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                      Marca lo que el cliente paga ahora. Lo no seleccionado quedará pendiente para el alta.
                    </div>

                    {/* Noches */}
                    {pendingNoches.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8e44ad', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>🌙 Noches de hospitalización</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: 400, fontSize: '0.72rem', textTransform: 'none', letterSpacing: 0 }}>
                            <input
                              type="checkbox"
                              checked={pendingNoches.every(n => liquidNochesChecked[n.fecha])}
                              onChange={e => {
                                const next = {};
                                pendingNoches.forEach(n => { next[n.fecha] = e.target.checked; });
                                setLiquidNochesChecked(next);
                              }}
                              style={{ accentColor: '#8e44ad' }}
                            />
                            Todas
                          </label>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {pendingNoches.map(n => (
                            <label key={n.fecha} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', border: `1px solid ${liquidNochesChecked[n.fecha] ? '#8e44ad' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: liquidNochesChecked[n.fecha] ? '#f3e8ff' : 'var(--color-white)', cursor: 'pointer', transition: 'all 0.15s' }}>
                              <input
                                type="checkbox"
                                checked={!!liquidNochesChecked[n.fecha]}
                                onChange={e => setLiquidNochesChecked(prev => ({ ...prev, [n.fecha]: e.target.checked }))}
                                style={{ accentColor: '#8e44ad', width: 16, height: 16, flexShrink: 0 }}
                              />
                              <span style={{ flex: 1, fontWeight: 500, fontSize: '0.875rem' }}>Noche {n.idx}</span>
                              <span style={{ fontSize: '0.82rem', color: liquidNochesChecked[n.fecha] ? '#8e44ad' : 'var(--color-text-muted)', fontWeight: 500 }}>{fmtNoche(n.fecha)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consumo items */}
                    {pendingItems.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8e44ad', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>📋 Hoja de consumo</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: 400, fontSize: '0.72rem', textTransform: 'none', letterSpacing: 0 }}>
                            <input
                              type="checkbox"
                              checked={pendingItems.every(item => liquidChecked[item.id])}
                              onChange={e => {
                                const next = {};
                                pendingItems.forEach(item => { next[item.id] = e.target.checked; });
                                setLiquidChecked(next);
                              }}
                              style={{ accentColor: '#8e44ad' }}
                            />
                            Todos
                          </label>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 200, overflowY: 'auto' }}>
                          {pendingItems.map(item => (
                            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', border: `1px solid ${liquidChecked[item.id] ? '#8e44ad' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: liquidChecked[item.id] ? '#f3e8ff' : 'var(--color-white)', cursor: 'pointer', transition: 'all 0.15s' }}>
                              <input
                                type="checkbox"
                                checked={!!liquidChecked[item.id]}
                                onChange={e => setLiquidChecked(prev => ({ ...prev, [item.id]: e.target.checked }))}
                                style={{ accentColor: '#8e44ad', width: 16, height: 16, flexShrink: 0 }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.descripcion}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{item.fecha} · Por: {item.registrado_por}</div>
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: liquidChecked[item.id] ? '#8e44ad' : 'var(--color-text-muted)' }}>x{item.cantidad}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Liquidaciones anteriores */}
                {(liquidHosp.liquidaciones_parciales || []).length > 0 && (
                  <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '0.35rem' }}>✅ Liquidaciones anteriores</div>
                    {liquidHosp.liquidaciones_parciales.map((lp, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', paddingBottom: '0.2rem' }}>
                        <strong>{lp.fecha} {lp.hora}</strong> · {lp.items_snapshot?.map(it => `${it.descripcion} x${it.cantidad}`).join(', ')} — por {lp.registrado_por}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <button onClick={() => setLiquidModal(false)} style={{ padding: '0.55rem 1.1rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Cancelar</button>
                  {pendingItems.length > 0 && (
                    <button
                      onClick={handleLiquidParcial}
                      disabled={selectedCount === 0}
                      style={{ padding: '0.55rem 1.25rem', background: selectedCount > 0 ? '#8e44ad' : 'var(--color-border)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: selectedCount > 0 ? 'pointer' : 'default', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600 }}
                    >
                      💰 Liquidar {selectedCount > 0 ? `(${selectedCount} ítem${selectedCount !== 1 ? 's' : ''})` : ''}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function btnStyle(color) {
  return {
    padding: '0.28rem 0.6rem', fontSize: '0.72rem', background: 'var(--color-white)',
    color, border: `1px solid ${color}`, borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, whiteSpace: 'nowrap',
  };
}

function InfoChip({ label, value }) {
  return (
    <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.65rem' }}>
      <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.1rem' }}>{value || '—'}</div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}
