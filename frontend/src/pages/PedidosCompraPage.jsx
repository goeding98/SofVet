import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../utils/useAuth';

const TABS = [
  { key: 'solicitado', label: 'Solicitado',  color: '#2563eb' },
  { key: 'pedido',     label: 'Pedido',      color: '#7c3aed' },
  { key: 'pagado',     label: 'Pagado',      color: '#0891b2' },
  { key: 'recibido',   label: 'Recibido',    color: '#16a34a' },
  { key: 'rechazado',  label: 'Rechazado',   color: '#dc2626' },
  { key: 'eliminado',  label: 'Eliminado',   color: '#6b7280' },
];

const ESTADO_COLOR = {
  solicitado: '#2563eb',
  pedido:     '#7c3aed',
  pagado:     '#0891b2',
  recibido:   '#16a34a',
  rechazado:  '#dc2626',
  eliminado:  '#6b7280',
};

const fmt = (ts) => {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return ts; }
};

function Badge({ estado }) {
  const color = ESTADO_COLOR[estado] || '#6b7280';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: '0.7rem',
      fontWeight: 700,
      background: color + '18',
      color,
      border: `1px solid ${color}55`,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>{estado}</span>
  );
}

function AuditLine({ label, quien, cuando }) {
  if (!quien && !cuando) return null;
  return (
    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>
      <span style={{ fontWeight: 600, color: '#9ca3af' }}>{label}:</span>{' '}
      {quien || '—'} · {fmt(cuando)}
    </div>
  );
}

export default function PedidosCompraPage() {
  const { session } = useAuth();
  const [tab,       setTab]       = useState('solicitado');
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);

  // Create form
  const [formItem,     setFormItem]     = useState('');
  const [formCantidad, setFormCantidad] = useState('');
  const [formNotas,    setFormNotas]    = useState('');

  // Rechazar modal
  const [rechazarId,    setRechazarId]    = useState(null);
  const [rechazarRazon, setRechazarRazon] = useState('');
  const [rechazarSaving, setRechazarSaving] = useState(false);

  const userName = session?.nombre || session?.username || 'Desconocido';

  const nowISO = () => new Date().toISOString();

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('pedidos_compra')
      .select('*')
      .eq('estado', tab)
      .order('created_at', { ascending: false });

    if (tab === 'recibido')  query = query.limit(30);
    if (tab === 'rechazado') query = query.limit(10);
    if (tab === 'eliminado') query = query.limit(10);

    const { data } = await query;
    setItems(data || []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!formItem.trim()) return alert('Escribe el nombre del ítem.');
    if (!formCantidad.trim()) return alert('Escribe la cantidad.');
    setSaving(true);
    const { error } = await supabase.from('pedidos_compra').insert({
      item:           formItem.trim(),
      cantidad:       formCantidad.trim(),
      notas:          formNotas.trim() || null,
      estado:         'solicitado',
      solicitado_por: userName,
      solicitado_at:  nowISO(),
    });
    setSaving(false);
    if (error) return alert('Error al crear: ' + error.message);
    setFormItem(''); setFormCantidad(''); setFormNotas('');
    setShowForm(false);
    if (tab === 'solicitado') load();
    else setTab('solicitado');
  };

  const transition = async (id, newEstado, extra = {}) => {
    const updates = { estado: newEstado, ...extra };
    const { error } = await supabase.from('pedidos_compra').update(updates).eq('id', id);
    if (error) return alert('Error: ' + error.message);
    load();
  };

  const handlePedido = (item) => transition(item.id, 'pedido', {
    pedido_por: userName,
    pedido_at:  nowISO(),
  });

  const handlePagado = (item) => transition(item.id, 'pagado', {
    pagado_por: userName,
    pagado_at:  nowISO(),
  });

  const handleRecibido = (item) => transition(item.id, 'recibido', {
    recibido_por: userName,
    recibido_at:  nowISO(),
  });

  const handleRechazar = async () => {
    if (!rechazarRazon.trim()) return alert('Escribe la razón del rechazo.');
    setRechazarSaving(true);
    await transition(rechazarId, 'rechazado', {
      rechazado_por:   userName,
      rechazado_at:    nowISO(),
      rechazado_razon: rechazarRazon.trim(),
    });
    setRechazarId(null);
    setRechazarRazon('');
    setRechazarSaving(false);
  };

  const handleEliminar = async (item) => {
    if (!confirm(`¿Eliminar "${item.item}"?`)) return;
    await transition(item.id, 'eliminado', {
      eliminado_por: userName,
      eliminado_at:  nowISO(),
    });
  };

  const tabCounts = {};

  const tabItems = items;

  // ── Render card ───────────────────────────────────────────────────────────
  const renderCard = (item) => (
    <div key={item.id} style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '1rem 1.1rem',
      display: 'flex',
      gap: '1rem',
      alignItems: 'flex-start',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111' }}>{item.item}</span>
          <span style={{
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: '1px 8px',
            fontSize: '0.75rem',
            color: '#374151',
            fontWeight: 600,
          }}>x{item.cantidad}</span>
        </div>

        {item.notas && (
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 6, fontStyle: 'italic' }}>
            {item.notas}
          </div>
        )}

        {/* Audit trail */}
        <div style={{ marginTop: 4 }}>
          <AuditLine label="Solicitado" quien={item.solicitado_por} cuando={item.solicitado_at} />
          <AuditLine label="Pedido"     quien={item.pedido_por}     cuando={item.pedido_at} />
          <AuditLine label="Pagado"     quien={item.pagado_por}     cuando={item.pagado_at} />
          <AuditLine label="Recibido"   quien={item.recibido_por}   cuando={item.recibido_at} />
          {item.rechazado_por && (
            <>
              <AuditLine label="Rechazado" quien={item.rechazado_por} cuando={item.rechazado_at} />
              <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 2 }}>
                <span style={{ fontWeight: 600 }}>Razón:</span> {item.rechazado_razon}
              </div>
            </>
          )}
          <AuditLine label="Eliminado" quien={item.eliminado_por} cuando={item.eliminado_at} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 }}>
        {tab === 'solicitado' && (
          <>
            <ActionBtn color="#7c3aed" onClick={() => handlePedido(item)}>✅ Pedido</ActionBtn>
            <ActionBtn color="#dc2626" onClick={() => { setRechazarId(item.id); setRechazarRazon(''); }}>❌ Rechazar</ActionBtn>
            <ActionBtn color="#6b7280" onClick={() => handleEliminar(item)}>🗑 Eliminar</ActionBtn>
          </>
        )}
        {tab === 'pedido' && (
          <>
            <ActionBtn color="#0891b2" onClick={() => handlePagado(item)}>💳 Pagado</ActionBtn>
            <ActionBtn color="#dc2626" onClick={() => { setRechazarId(item.id); setRechazarRazon(''); }}>❌ Rechazar</ActionBtn>
            <ActionBtn color="#6b7280" onClick={() => handleEliminar(item)}>🗑 Eliminar</ActionBtn>
          </>
        )}
        {tab === 'pagado' && (
          <>
            <ActionBtn color="#16a34a" onClick={() => handleRecibido(item)}>📦 Recibido</ActionBtn>
            <ActionBtn color="#6b7280" onClick={() => handleEliminar(item)}>🗑 Eliminar</ActionBtn>
          </>
        )}
        {(tab === 'recibido' || tab === 'rechazado' || tab === 'eliminado') && (
          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>—</span>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.35rem' }}>
            🛒 Pedidos de Compra
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.83rem' }}>
            Seguimiento de solicitudes e insumos
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '0.55rem 1.1rem',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          + Nuevo pedido
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: '1.2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>Nuevo ítem solicitado</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Ítem / Descripción</label>
              <input
                value={formItem}
                onChange={e => setFormItem(e.target.value)}
                placeholder="Ej: Amoxicilina 500mg, Jeringas 5cc..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Cantidad</label>
              <input
                value={formCantidad}
                onChange={e => setFormCantidad(e.target.value)}
                placeholder="Ej: 2 cajas, 50 und..."
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea
              value={formNotas}
              onChange={e => setFormNotas(e.target.value)}
              placeholder="Observaciones, proveedor preferido, urgencia..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={btnSecondary}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving} style={btnPrimary}>
              {saving ? 'Guardando...' : 'Solicitar'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.42rem 1rem',
              border: tab === t.key ? `2px solid ${t.color}` : '2px solid #e5e7eb',
              borderRadius: 8,
              background: tab === t.key ? t.color + '15' : '#fff',
              color: tab === t.key ? t.color : '#6b7280',
              fontWeight: tab === t.key ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Cargando...</div>
      ) : tabItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontSize: '0.9rem' }}>
          No hay ítems en este estado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {tabItems.map(renderCard)}
          {(tab === 'recibido' || tab === 'rechazado' || tab === 'eliminado') && (
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', paddingTop: 4 }}>
              Mostrando los últimos {tab === 'recibido' ? 30 : 10} registros
            </div>
          )}
        </div>
      )}

      {/* Rechazar modal */}
      {rechazarId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            width: 420, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 1rem', color: '#dc2626', fontSize: '1rem' }}>❌ Rechazar pedido</h3>
            <label style={labelStyle}>Razón del rechazo</label>
            <textarea
              value={rechazarRazon}
              onChange={e => setRechazarRazon(e.target.value)}
              rows={3}
              placeholder="Explica por qué se rechaza este pedido..."
              style={{ ...inputStyle, resize: 'vertical' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setRechazarId(null)} style={btnSecondary}>Cancelar</button>
              <button onClick={handleRechazar} disabled={rechazarSaving} style={{ ...btnPrimary, background: '#dc2626' }}>
                {rechazarSaving ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.32rem 0.75rem',
        background: color + '12',
        border: `1px solid ${color}55`,
        borderRadius: 6,
        color,
        fontWeight: 600,
        fontSize: '0.75rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: 4,
};

const inputStyle = {
  width: '100%',
  padding: '0.45rem 0.65rem',
  border: '1px solid #d1d5db',
  borderRadius: 7,
  fontSize: '0.85rem',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnPrimary = {
  padding: '0.45rem 1.1rem',
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  fontWeight: 700,
  fontSize: '0.83rem',
  cursor: 'pointer',
};

const btnSecondary = {
  padding: '0.45rem 1.1rem',
  background: '#f3f4f6',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 7,
  fontWeight: 600,
  fontSize: '0.83rem',
  cursor: 'pointer',
};
