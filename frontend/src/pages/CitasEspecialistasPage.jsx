import { useState, useMemo } from 'react';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES, sedeBadge } from '../utils/useSede';
import { nowDate, nowTime } from '../utils/nowLocal';
import Modal from '../components/Modal';
import Button from '../components/Button';

const ESPECIALIDADES = ['Cardiología', 'Dermatología', 'Gastroenterología', 'Neurología', 'Oftalmología', 'Oncología', 'Ortopedia', 'Otra'];

const COLUMNS = [
  { key: 'solicitada', label: 'Solicitada', color: '#b8860b', bg: '#fff8e1' },
  { key: 'confirmada', label: 'Confirmada por tutor y especialista', color: '#2e5cbf', bg: '#e8f0ff' },
  { key: 'programada', label: 'Pagada y programada', color: '#2e7d50', bg: 'var(--color-success-bg)' },
];

const MAX_PROGRAMADA_VISIBLE = 15;

const EMPTY_FORM = {
  sede_id: null,
  especialidad: ESPECIALIDADES[0],
  especialidadOtra: '',
  tutor_nombre: '',
  tutor_cedula: '',
  mascota_nombre: '',
  especie: '',
  medico_remitente: '',
  urgente: false,
  motivo: '',
};

const labelSt = { display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text)' };
const inputSt = { width: '100%', padding: '0.55rem 0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box' };

function stageKey(c, stage) {
  return `${c[`${stage}_fecha`] || ''}T${c[`${stage}_hora`] || '00:00'}`;
}

function CitaCard({ cita, draggedId, onDragStart, onClick, showSede }) {
  const isDragging = draggedId === cita.id;
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, cita.id)}
      onClick={() => onClick(cita)}
      style={{
        background: 'white',
        border: `1.5px solid ${cita.urgente ? '#dc2626' : 'var(--color-border)'}`,
        borderLeft: `4px solid ${cita.urgente ? '#dc2626' : 'var(--color-primary)'}`,
        borderRadius: 10,
        padding: '0.75rem 0.9rem',
        marginBottom: '0.6rem',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'opacity 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>🐾 {cita.mascota_nombre}</div>
        {cita.urgente && <span style={{ fontSize: '0.62rem', fontWeight: 700, background: '#dc2626', color: 'white', padding: '1px 6px', borderRadius: 999, whiteSpace: 'nowrap' }}>🚨 URGENTE</span>}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{cita.tutor_nombre}</div>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 600, background: '#f3f4f6', color: '#555', padding: '2px 8px', borderRadius: 999 }}>👨‍⚕️ {cita.especialidad}</span>
        {showSede && sedeBadge(cita.sede_id)}
      </div>
      {cita.especialista_confirmado && (
        <div style={{ fontSize: '0.72rem', color: '#2e5cbf', fontWeight: 600, marginTop: '0.4rem' }}>
          ✓ {cita.especialista_confirmado}
        </div>
      )}
      <div style={{ fontSize: '0.68rem', color: '#999', marginTop: '0.4rem' }}>
        Solicitada {cita.solicitada_fecha} {cita.solicitada_hora}
      </div>
    </div>
  );
}

export default function CitasEspecialistasPage() {
  const { session } = useAuth();
  const { isAdmin } = useSede();
  const { items: citas, add, edit, remove } = useStore('citas_especialistas');

  const canSeeAllSedes = isAdmin || session?.rol === 'Laboratorio';
  const misSedeId = session?.sede_id || null;

  const [filterSede, setFilterSede] = useState('all');

  const visibles = useMemo(() => {
    if (canSeeAllSedes) {
      return filterSede === 'all' ? citas : citas.filter(c => Number(c.sede_id) === Number(filterSede));
    }
    return citas.filter(c => Number(c.sede_id) === Number(misSedeId));
  }, [citas, canSeeAllSedes, filterSede, misSedeId]);

  const showSedeBadge = canSeeAllSedes && filterSede === 'all';

  // ── drag state ──────────────────────────────────────────────────────────
  const [draggedId, setDraggedId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // ── create modal ────────────────────────────────────────────────────────
  const [modalNueva, setModalNueva] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── specialist-confirm modal (movimiento pendiente) ────────────────────
  const [pendingDrop, setPendingDrop] = useState(null); // { cita, newStatus }
  const [especialistaInput, setEspecialistaInput] = useState('');

  // ── detail/edit modal ───────────────────────────────────────────────────
  const [detalle, setDetalle] = useState(null);
  const [detalleForm, setDetalleForm] = useState(null);

  const openNueva = () => {
    setForm({
      ...EMPTY_FORM,
      sede_id: canSeeAllSedes ? (filterSede !== 'all' ? filterSede : SEDES[0].id) : misSedeId,
      medico_remitente: session?.nombre || '',
    });
    setModalNueva(true);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCrear = async () => {
    if (!form.tutor_nombre.trim() || !form.mascota_nombre.trim() || !form.motivo.trim()) {
      return alert('Completa tutor, mascota y motivo de remisión.');
    }
    if (!form.sede_id) return alert('Selecciona una sede.');
    const especialidadFinal = form.especialidad === 'Otra' ? form.especialidadOtra.trim() : form.especialidad;
    if (!especialidadFinal) return alert('Escribe el nombre del especialista.');

    setSaving(true);
    await add({
      sede_id: Number(form.sede_id),
      especialidad: especialidadFinal,
      tutor_nombre: form.tutor_nombre.trim(),
      tutor_cedula: form.tutor_cedula.trim(),
      mascota_nombre: form.mascota_nombre.trim(),
      especie: form.especie.trim(),
      medico_remitente: form.medico_remitente.trim(),
      urgente: form.urgente,
      motivo: form.motivo.trim(),
      status: 'solicitada',
      especialista_confirmado: null,
      solicitada_fecha: nowDate(),
      solicitada_hora: nowTime(),
      solicitada_por: session?.nombre || null,
    });
    setSaving(false);
    setModalNueva(false);
  };

  // ── drag handlers ───────────────────────────────────────────────────────
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colKey);
  };

  const aplicarMovimiento = async (cita, newStatus, extra) => {
    const changes = { status: newStatus, ...extra };
    if (newStatus === 'programada') {
      changes.programada_fecha = nowDate();
      changes.programada_hora = nowTime();
      changes.programada_por = session?.nombre || null;
    }
    await edit(cita.id, changes);
    if (newStatus === 'programada') {
      alert('📅 Recuerda que debes agendar la cita en la sección de Agenda.');
    }
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDragOver(null);
    const cita = visibles.find(c => c.id === draggedId);
    setDraggedId(null);
    if (!cita || cita.status === newStatus) return;

    if (newStatus !== 'solicitada' && !cita.especialista_confirmado) {
      setEspecialistaInput('');
      setPendingDrop({ cita, newStatus });
      return;
    }
    aplicarMovimiento(cita, newStatus, {});
  };

  const handleConfirmEspecialista = async () => {
    if (!especialistaInput.trim()) return alert('Escribe el nombre del especialista.');
    const { cita, newStatus } = pendingDrop;
    await aplicarMovimiento(cita, newStatus, {
      especialista_confirmado: especialistaInput.trim(),
      confirmada_fecha: nowDate(),
      confirmada_hora: nowTime(),
      confirmada_por: session?.nombre || null,
    });
    setPendingDrop(null);
  };

  // ── detalle/edit ─────────────────────────────────────────────────────────
  const openDetalle = (cita) => {
    setDetalle(cita);
    setDetalleForm({ ...cita });
  };

  const handleGuardarDetalle = async () => {
    await edit(detalle.id, {
      tutor_nombre: detalleForm.tutor_nombre,
      tutor_cedula: detalleForm.tutor_cedula,
      mascota_nombre: detalleForm.mascota_nombre,
      especie: detalleForm.especie,
      medico_remitente: detalleForm.medico_remitente,
      urgente: detalleForm.urgente,
      motivo: detalleForm.motivo,
    });
    setDetalle(null);
  };

  const handleDelete = () => {
    if (!confirm(`¿Eliminar la solicitud de ${detalle.mascota_nombre}?`)) return;
    remove(detalle.id);
    setDetalle(null);
  };

  const columnCitas = (key) => {
    if (key === 'programada') {
      const all = visibles.filter(c => c.status === 'programada');
      const sorted = [...all].sort((a, b) => stageKey(b, 'programada').localeCompare(stageKey(a, 'programada')));
      return { list: sorted.slice(0, MAX_PROGRAMADA_VISIBLE), extra: Math.max(0, sorted.length - MAX_PROGRAMADA_VISIBLE) };
    }
    const list = visibles.filter(c => c.status === key)
      .sort((a, b) => stageKey(a, key).localeCompare(stageKey(b, key)));
    return { list, extra: 0 };
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>👨‍⚕️ Cita con Especialistas</h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Coordina remisiones a especialistas sin depender de WhatsApp</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {canSeeAllSedes && (
            <select value={filterSede} onChange={e => setFilterSede(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
              <option value="all">Todas las sedes</option>
              {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}
          <Button onClick={openNueva} icon="+">Nueva solicitud</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'start' }}>
        {COLUMNS.map(col => {
          const { list, extra } = columnCitas(col.key);
          const isOver = dragOver === col.key;
          return (
            <div key={col.key}
              onDragOver={e => handleDragOver(e, col.key)}
              onDrop={e => handleDrop(e, col.key)}
              onDragLeave={() => setDragOver(null)}
              style={{
                background: isOver ? col.bg : '#fafafa',
                border: `2px solid ${isOver ? col.color : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '0.85rem',
                minHeight: 300,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: col.color }}>{col.label}</h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: col.bg, color: col.color, padding: '2px 8px', borderRadius: 999 }}>{list.length}</span>
              </div>

              {list.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>Sin solicitudes</p>
              ) : list.map(cita => (
                <CitaCard key={cita.id} cita={cita} draggedId={draggedId} onDragStart={handleDragStart} onClick={openDetalle} showSede={showSedeBadge} />
              ))}

              {extra > 0 && (
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                  hay {extra} solicitud{extra !== 1 ? 'es' : ''} más en el histórico
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal: nueva solicitud ── */}
      <Modal isOpen={modalNueva} onClose={() => setModalNueva(false)} title="👨‍⚕️ Nueva solicitud de especialista" onSave={handleCrear} saveLabel={saving ? 'Guardando...' : 'Crear solicitud'} size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          {canSeeAllSedes && (
            <div>
              <label style={labelSt}>Sede *</label>
              <select style={inputSt} value={form.sede_id || ''} onChange={e => f('sede_id', e.target.value)}>
                {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={labelSt}>Especialista a remitir *</label>
            <select style={inputSt} value={form.especialidad} onChange={e => f('especialidad', e.target.value)}>
              {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {form.especialidad === 'Otra' && (
            <div>
              <label style={labelSt}>¿Cuál especialista?</label>
              <input style={inputSt} value={form.especialidadOtra} onChange={e => f('especialidadOtra', e.target.value)} placeholder="Nombre del especialista" />
            </div>
          )}
          <div>
            <label style={labelSt}>Nombre del tutor *</label>
            <input style={inputSt} value={form.tutor_nombre} onChange={e => f('tutor_nombre', e.target.value)} />
          </div>
          <div>
            <label style={labelSt}>Cédula</label>
            <input style={inputSt} value={form.tutor_cedula} onChange={e => f('tutor_cedula', e.target.value)} />
          </div>
          <div>
            <label style={labelSt}>Nombre de la mascota *</label>
            <input style={inputSt} value={form.mascota_nombre} onChange={e => f('mascota_nombre', e.target.value)} />
          </div>
          <div>
            <label style={labelSt}>Especie</label>
            <input style={inputSt} value={form.especie} onChange={e => f('especie', e.target.value)} placeholder="CANINO, FELINO..." />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelSt}>Médico remitente</label>
            <input style={inputSt} value={form.medico_remitente} onChange={e => f('medico_remitente', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: form.urgente ? 700 : 400, color: form.urgente ? '#dc2626' : 'var(--color-text)' }}>
              <input type="checkbox" checked={form.urgente} onChange={e => f('urgente', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#dc2626', cursor: 'pointer' }} />
              🚨 ¿Remisión urgente?
            </label>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelSt}>Breve motivo de remisión *</label>
            <textarea style={{ ...inputSt, height: 90, resize: 'vertical' }} value={form.motivo} onChange={e => f('motivo', e.target.value)} placeholder="Describe el motivo clínico de la remisión..." />
          </div>
        </div>
      </Modal>

      {/* ── Modal: confirmar especialista al arrastrar ── */}
      <Modal isOpen={!!pendingDrop} onClose={() => setPendingDrop(null)} title="✓ Confirmar especialista" onSave={handleConfirmEspecialista} saveLabel="Confirmar">
        {pendingDrop && (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
              Antes de mover la solicitud de <strong>{pendingDrop.cita.mascota_nombre}</strong> a "{COLUMNS.find(c => c.key === pendingDrop.newStatus)?.label}", escribe qué especialista quedó confirmado.
            </p>
            <label style={labelSt}>Nombre del especialista *</label>
            <input autoFocus style={inputSt} value={especialistaInput} onChange={e => setEspecialistaInput(e.target.value)} placeholder="Ej. Dr. Andrés Pérez" />
          </>
        )}
      </Modal>

      {/* ── Modal: detalle / edición ── */}
      <Modal
        isOpen={!!detalle}
        onClose={() => setDetalle(null)}
        title={detalle ? `🐾 ${detalle.mascota_nombre}` : ''}
        onSave={handleGuardarDetalle}
        size="lg"
        leftFooter={session?.rol === 'Administrador' && <Button variant="danger" size="sm" onClick={handleDelete}>Eliminar</Button>}
      >
        {detalle && detalleForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#f3f4f6', color: '#555', padding: '3px 10px', borderRadius: 999 }}>👨‍⚕️ {detalle.especialidad}</span>
              {sedeBadge(detalle.sede_id)}
              {detalle.urgente && <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#dc2626', color: 'white', padding: '3px 10px', borderRadius: 999 }}>🚨 URGENTE</span>}
            </div>
            <div>
              <label style={labelSt}>Nombre del tutor</label>
              <input style={inputSt} value={detalleForm.tutor_nombre || ''} onChange={e => setDetalleForm(p => ({ ...p, tutor_nombre: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>Cédula</label>
              <input style={inputSt} value={detalleForm.tutor_cedula || ''} onChange={e => setDetalleForm(p => ({ ...p, tutor_cedula: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>Nombre de la mascota</label>
              <input style={inputSt} value={detalleForm.mascota_nombre || ''} onChange={e => setDetalleForm(p => ({ ...p, mascota_nombre: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>Especie</label>
              <input style={inputSt} value={detalleForm.especie || ''} onChange={e => setDetalleForm(p => ({ ...p, especie: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelSt}>Médico remitente</label>
              <input style={inputSt} value={detalleForm.medico_remitente || ''} onChange={e => setDetalleForm(p => ({ ...p, medico_remitente: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: detalleForm.urgente ? 700 : 400, color: detalleForm.urgente ? '#dc2626' : 'var(--color-text)' }}>
                <input type="checkbox" checked={!!detalleForm.urgente} onChange={e => setDetalleForm(p => ({ ...p, urgente: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#dc2626', cursor: 'pointer' }} />
                🚨 ¿Remisión urgente?
              </label>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelSt}>Motivo de remisión</label>
              <textarea style={{ ...inputSt, height: 90, resize: 'vertical' }} value={detalleForm.motivo || ''} onChange={e => setDetalleForm(p => ({ ...p, motivo: e.target.value }))} />
            </div>

            <div style={{ gridColumn: '1/-1', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <label style={labelSt}>Historial</label>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span>📅 Solicitada: {detalle.solicitada_fecha} {detalle.solicitada_hora} — {detalle.solicitada_por || '—'}</span>
                {detalle.confirmada_fecha && <span>✓ Confirmada: {detalle.confirmada_fecha} {detalle.confirmada_hora} — {detalle.confirmada_por || '—'} ({detalle.especialista_confirmado})</span>}
                {detalle.programada_fecha && <span>💰 Programada: {detalle.programada_fecha} {detalle.programada_hora} — {detalle.programada_por || '—'}</span>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
