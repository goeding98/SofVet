import { useState, useMemo } from 'react';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';

const fmtCOP = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const lSt = { display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text)' };
const iSt = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', boxSizing: 'border-box' };

const TIPOS_ALIADO = ['Clínica Veterinaria', 'Médico Independiente'];

function today() { return new Date().toISOString().split('T')[0]; }
function currentMonth() { return today().slice(0, 7); }

// ── Aliados Modal ─────────────────────────────────────────────────────────────
function AliadosModal({ aliados, onClose, onAdd, onRemove, isAdmin }) {
  const [nombre, setNombre] = useState('');
  const [tipo,   setTipo]   = useState(TIPOS_ALIADO[0]);
  const [tel,    setTel]    = useState('');
  const [err,    setErr]    = useState('');

  const handleAdd = () => {
    if (!nombre.trim()) { setErr('El nombre es requerido.'); return; }
    onAdd({ nombre: nombre.trim(), tipo, telefono: tel.trim() || null });
    setNombre(''); setTipo(TIPOS_ALIADO[0]); setTel(''); setErr('');
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 520, margin: 'auto', overflow: 'hidden' }}>
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: '#f5f8ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-title)', color: '#2e5cbf', fontSize: '1rem' }}>🏥 Clínicas Aliadas</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {isAdmin && (
            <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '0.75rem', color: 'var(--color-text-muted)' }}>Nueva clínica aliada</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <div>
                  <label style={lSt}>Nombre *</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} style={iSt} placeholder="Nombre de la clínica" />
                </div>
                <div>
                  <label style={lSt}>Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} style={iSt}>
                    {TIPOS_ALIADO.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={lSt}>Teléfono</label>
                <input value={tel} onChange={e => setTel(e.target.value)} style={iSt} placeholder="Opcional" />
              </div>
              {err && <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>⚠️ {err}</div>}
              <button onClick={handleAdd} style={{ padding: '0.5rem 1.25rem', background: '#2e5cbf', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600 }}>
                + Agregar aliado
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {aliados.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sin aliados registrados.</p>}
            {aliados.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.85rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{a.nombre}</span>
                  {a.tipo && <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem', fontSize: '0.72rem' }}>{a.tipo}</span>}
                  {a.telefono && <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>· {a.telefono}</span>}
                </div>
                {isAdmin && (
                  <button onClick={() => onRemove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '0.8rem', padding: '0 0.25rem' }}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Remision Modal ────────────────────────────────────────────────────────
function NuevaRemisionModal({ aliados, onClose, onSave, session }) {
  const [aliadoId,  setAliadoId]  = useState('');
  const [vet,       setVet]       = useState('');
  const [paciente,  setPaciente]  = useState('');
  const [especie,   setEspecie]   = useState('');
  const [servicio,  setServicio]  = useState('');
  const [valor,     setValor]     = useState('');
  const [comision,  setComision]  = useState('');
  const [obs,       setObs]       = useState('');
  const [fecha,     setFecha]     = useState(today());
  const [err,       setErr]       = useState('');

  const handleSave = () => {
    if (!aliadoId) { setErr('Selecciona la clínica aliada.'); return; }
    if (!servicio.trim()) { setErr('El servicio es requerido.'); return; }
    const valorNum   = parseFloat(valor)   || null;
    const comisionNum = parseFloat(comision) || null;
    onSave({
      aliado_id:          parseInt(aliadoId),
      veterinario_aliado: vet.trim() || null,
      paciente_nombre:    paciente.trim(),
      especie:            especie.trim() || null,
      servicio:           servicio.trim(),
      valor_facturado:    valorNum,
      comision_pct:       comisionNum,
      observaciones:      obs.trim() || null,
      fecha,
      tipo_registro:      'manual',
      registrado_por:     session?.nombre || null,
    });
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 560, margin: 'auto', overflow: 'hidden' }}>
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: '#f5f8ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-title)', color: '#2e5cbf', fontSize: '1rem' }}>🔗 Nuevo Registro de Remisión</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={lSt}>Clínica Aliada *</label>
              <select value={aliadoId} onChange={e => setAliadoId(e.target.value)} style={iSt}>
                <option value="">— Seleccionar —</option>
                {aliados.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={lSt}>Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={iSt} />
            </div>
          </div>

          <div>
            <label style={lSt}>Veterinario en clínica aliada</label>
            <input value={vet} onChange={e => setVet(e.target.value)} style={iSt} placeholder="Nombre del veterinario" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={lSt}>Paciente</label>
              <input value={paciente} onChange={e => setPaciente(e.target.value)} style={iSt} placeholder="Nombre del paciente" />
            </div>
            <div>
              <label style={lSt}>Especie</label>
              <input value={especie} onChange={e => setEspecie(e.target.value)} style={iSt} placeholder="Ej: Canino, Felino" />
            </div>
          </div>

          <div>
            <label style={lSt}>Servicio realizado *</label>
            <input value={servicio} onChange={e => setServicio(e.target.value)} style={iSt} placeholder="Ej: Consulta general, Cirugía, Laboratorio..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={lSt}>Valor facturado ($)</label>
              <input type="number" value={valor} onChange={e => setValor(e.target.value)} style={iSt} placeholder="0" min="0" />
            </div>
            <div>
              <label style={lSt}>Comisión (%)</label>
              <input type="number" value={comision} onChange={e => setComision(e.target.value)} style={iSt} placeholder="0" min="0" max="100" step="0.5" />
            </div>
          </div>

          {valor && comision && (
            <div style={{ background: '#e8f5ee', border: '1px solid #a5d6b8', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#2e7d50', fontWeight: 600 }}>
              Valor comisión: {fmtCOP((parseFloat(valor) || 0) * (parseFloat(comision) || 0) / 100)}
            </div>
          )}

          <div>
            <label style={lSt}>Observaciones</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} style={{ ...iSt, resize: 'vertical' }} placeholder="Notas adicionales..." />
          </div>

          {err && <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}>⚠️ {err}</div>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button onClick={onClose} style={{ padding: '0.55rem 1.25rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding: '0.55rem 1.5rem', background: '#2e5cbf', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600 }}>
              🔗 Guardar remisión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RemisionesPage() {
  const { session } = useAuth();
  const isAdmin = session?.rol === 'Administrador';

  const { items: aliados,     add: addAliado,     remove: removeAliado }     = useStore('aliados');
  const { items: remisiones,  add: addRemision,   edit: editRemision, remove: removeRemision } = useStore('remisionesVis');

  const [mes,           setMes]           = useState(currentMonth());
  const [showAliados,   setShowAliados]   = useState(false);
  const [showNueva,     setShowNueva]     = useState(false);
  const [editingId,     setEditingId]     = useState(null);
  const [editValor,     setEditValor]     = useState('');
  const [editComision,  setEditComision]  = useState('');

  const aliadoMap = useMemo(() => {
    const m = {};
    aliados.forEach(a => { m[a.id] = a; });
    return m;
  }, [aliados]);

  const filtradas = useMemo(() =>
    remisiones
      .filter(r => r.fecha?.startsWith(mes))
      .sort((a, b) => a.fecha < b.fecha ? 1 : -1),
    [remisiones, mes]
  );

  const totalValor    = filtradas.reduce((s, r) => s + (parseFloat(r.valor_facturado) || 0), 0);
  const totalComision = filtradas.reduce((s, r) => s + ((parseFloat(r.valor_facturado) || 0) * (parseFloat(r.comision_pct) || 0) / 100), 0);

  const handleAddAliado = async (data) => {
    await addAliado(data);
  };

  const handleRemoveAliado = async (id) => {
    if (!window.confirm('¿Eliminar esta clínica aliada?')) return;
    await removeAliado(id);
  };

  const handleSaveRemision = async (data) => {
    await addRemision(data);
    setShowNueva(false);
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditValor(r.valor_facturado ?? '');
    setEditComision(r.comision_pct ?? '');
  };

  const saveEdit = async (id) => {
    await editRemision(id, {
      valor_facturado: parseFloat(editValor) || null,
      comision_pct:    parseFloat(editComision) || null,
    });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    await removeRemision(id);
  };

  const mesLabel = (() => {
    const [y, m] = mes.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  })();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', color: 'var(--color-primary)', margin: '0 0 0.25rem' }}>
            🔗 Remisiones — Visitadora Médica
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Registro de pacientes remitidos a clínicas aliadas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {isAdmin && (
            <button onClick={() => setShowAliados(true)} style={{ padding: '0.5rem 1rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text)' }}>
              🏥 Gestionar aliados
            </button>
          )}
          <button onClick={() => setShowNueva(true)} style={{ padding: '0.5rem 1.1rem', background: '#2e5cbf', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600 }}>
            + Nuevo registro
          </button>
        </div>
      </div>

      {/* Month filter + summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Mes:</label>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            style={{ padding: '0.4rem 0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }} />
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{mesLabel}</span>

        {filtradas.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <div style={{ background: '#e8f0fd', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.9rem', fontSize: '0.8rem', color: '#2e5cbf', fontWeight: 600 }}>
              {filtradas.length} remisión{filtradas.length !== 1 ? 'es' : ''}
            </div>
            <div style={{ background: '#e8f5ee', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.9rem', fontSize: '0.8rem', color: '#2e7d50', fontWeight: 700 }}>
              Total facturado: {fmtCOP(totalValor)}
            </div>
            <div style={{ background: '#fef3cd', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.9rem', fontSize: '0.8rem', color: '#b8860b', fontWeight: 700 }}>
              Comisión: {fmtCOP(totalComision)}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔗</div>
          Sin remisiones en {mesLabel}.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                {['Fecha', 'Clínica Aliada', 'Veterinario', 'Paciente', 'Especie', 'Servicio', 'Valor Facturado', 'Comisión %', 'Valor Comisión', 'Observaciones', ''].map(h => (
                  <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r, i) => {
                const aliado      = aliadoMap[r.aliado_id];
                const valorNum    = parseFloat(r.valor_facturado) || 0;
                const comisionNum = parseFloat(r.comision_pct)    || 0;
                const valorCom    = valorNum * comisionNum / 100;
                const isEdit      = editingId === r.id;

                return (
                  <tr key={r.id} style={{ borderBottom: i < filtradas.length - 1 ? '1px solid var(--color-border)' : 'none', background: isEdit ? '#f5f8ff' : 'transparent' }}>
                    <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{r.fecha}</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>
                      {aliado?.nombre || '—'}
                      {aliado?.tipo && <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>{aliado.tipo}</div>}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>{r.veterinario_aliado || '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>
                      {r.paciente_nombre}
                      {r.tipo_registro === 'automatico' && (
                        <span style={{ fontSize: '0.62rem', background: '#e8f0fd', color: '#2e5cbf', borderRadius: 999, padding: '1px 5px', marginLeft: '0.35rem', fontWeight: 700 }}>auto</span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>{r.especie || '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{r.servicio}</td>

                    {/* Valor facturado — editable */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {isEdit ? (
                        <input type="number" value={editValor} onChange={e => setEditValor(e.target.value)}
                          style={{ width: 110, padding: '0.3rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }} />
                      ) : (
                        <span style={{ fontWeight: valorNum ? 600 : 400, color: valorNum ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                          {valorNum ? fmtCOP(valorNum) : '—'}
                        </span>
                      )}
                    </td>

                    {/* Comisión % — editable */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {isEdit ? (
                        <input type="number" value={editComision} onChange={e => setEditComision(e.target.value)}
                          style={{ width: 70, padding: '0.3rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }} min="0" max="100" step="0.5" />
                      ) : (
                        <span style={{ color: comisionNum ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                          {comisionNum ? `${comisionNum}%` : '—'}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#2e7d50', whiteSpace: 'nowrap' }}>
                      {valorCom ? fmtCOP(valorCom) : '—'}
                    </td>

                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.observaciones || '—'}
                    </td>

                    <td style={{ padding: '0.5rem 0.65rem', whiteSpace: 'nowrap' }}>
                      {isEdit ? (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button onClick={() => saveEdit(r.id)} style={{ padding: '0.3rem 0.65rem', background: '#2e7d50', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>✓</button>
                          <button onClick={() => setEditingId(null)} style={{ padding: '0.3rem 0.65rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button onClick={() => startEdit(r)} style={{ padding: '0.3rem 0.6rem', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>✏️</button>
                          {isAdmin && (
                            <button onClick={() => handleDelete(r.id)} style={{ padding: '0.3rem 0.6rem', background: 'var(--color-white)', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--color-danger)' }}>🗑</button>
                          )}
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

      {/* Modals */}
      {showAliados && (
        <AliadosModal
          aliados={aliados}
          onClose={() => setShowAliados(false)}
          onAdd={handleAddAliado}
          onRemove={handleRemoveAliado}
          isAdmin={isAdmin}
        />
      )}
      {showNueva && (
        <NuevaRemisionModal
          aliados={aliados}
          onClose={() => setShowNueva(false)}
          onSave={handleSaveRemision}
          session={session}
        />
      )}
    </div>
  );
}
