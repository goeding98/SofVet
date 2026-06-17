import { useState } from 'react';
import { useAuth } from '../utils/useAuth';
import { useStore } from '../utils/useStore';
import { supabase } from '../utils/supabaseClient';
import { nowDate, nowTime } from '../utils/nowLocal';

const TIPO_LABEL  = { ml: 'ML', ampolla: 'Amp.', unidad: 'Und.' };
const TIPO_COLOR  = { ml: '#1565c0', ampolla: '#7c3aed', unidad: '#065f46' };
const TIPO_BG     = { ml: '#e8f0ff', ampolla: '#f3e8ff', unidad: '#d1fae5' };

const fmt = n => parseFloat((n || 0).toFixed(4)).toString().replace('.', ',');

function statusOf(item) {
  if (item.stock <= 0)              return 'agotado';
  if (item.stock <= item.stock_minimo) return 'bajo';
  return 'ok';
}

const STATUS_CFG = {
  ok:      { label: 'OK',      bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  bajo:    { label: 'BAJO',    bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  agotado: { label: 'AGOTADO', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
};

export default function InventarioPage() {
  const { session } = useAuth();
  const { items: inventario, edit: editInventario, loading } = useStore('inventario');

  const [search,     setSearch]     = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modal,      setModal]      = useState(null); // { accion:'ingreso'|'descargue', item }
  const [cantidad,   setCantidad]   = useState('');
  const [motivo,     setMotivo]     = useState('');
  const [saving,     setSaving]     = useState(false);
  const [modalError, setModalError] = useState('');

  const items = inventario
    .filter(i => !search || i.nombre.toLowerCase().includes(search.toLowerCase()))
    .filter(i => filtroTipo === 'todos' || i.tipo === filtroTipo)
    .filter(i => filtroEstado === 'todos' || statusOf(i) === filtroEstado)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const totalItems   = inventario.length;
  const itemsBajo    = inventario.filter(i => statusOf(i) === 'bajo').length;
  const itemsAgotado = inventario.filter(i => statusOf(i) === 'agotado').length;

  const unidad = (item) => item.tipo === 'ampolla' ? 'amp.' : item.tipo === 'unidad' ? 'und.' : 'ml';

  const openModal = (accion, item) => {
    setModal({ accion, item });
    setCantidad('');
    setMotivo('');
    setModalError('');
  };

  const handleGuardar = async () => {
    const cant = parseFloat(cantidad.replace(',', '.'));
    if (!cant || isNaN(cant) || cant <= 0) {
      return setModalError('Ingresa una cantidad válida mayor a 0.');
    }
    if (modal.accion === 'descargue' && cant > modal.item.stock) {
      return setModalError(`Stock insuficiente. Disponible: ${fmt(modal.item.stock)} ${unidad(modal.item)}`);
    }

    setSaving(true);
    setModalError('');

    const newStock = parseFloat((modal.accion === 'ingreso'
      ? modal.item.stock + cant
      : modal.item.stock - cant).toFixed(4));

    editInventario(modal.item.id, { stock: newStock });

    await supabase.from('inventario_movimientos').insert({
      inventario_id: modal.item.id,
      tipo:          modal.accion === 'ingreso' ? 'ingreso' : 'descargue_manual',
      cantidad:      modal.accion === 'ingreso' ? cant : -cant,
      motivo:        motivo.trim() || null,
      created_by:    session?.nombre || null,
    });

    setSaving(false);
    setModal(null);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Cargando inventario...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>

      {/* Título */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', color: 'var(--color-text)', margin: 0 }}>
          📦 Inventario de Medicamentos
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
          Solo medicamentos · Cantidades de prueba — actualizar con conteo real
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total items',  value: totalItems,   bg: '#f5f8ff', color: '#2e5cbf', border: '#dbeafe' },
          { label: 'Stock bajo',   value: itemsBajo,    bg: '#fefce8', color: '#a16207', border: '#fef08a', cursor: 'pointer', onClick: () => setFiltroEstado(filtroEstado === 'bajo' ? 'todos' : 'bajo') },
          { label: 'Agotados',     value: itemsAgotado, bg: '#fff1f2', color: '#dc2626', border: '#fecdd3', cursor: 'pointer', onClick: () => setFiltroEstado(filtroEstado === 'agotado' ? 'todos' : 'agotado') },
        ].map(s => (
          <div key={s.label} onClick={s.onClick} style={{ padding: '0.85rem 1.25rem', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-md)', minWidth: 130, cursor: s.cursor || 'default' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: s.color, fontWeight: 600, marginTop: '0.2rem', opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar medicamento..."
          style={{ flex: 1, minWidth: 220, padding: '0.55rem 0.85rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
        />
        {[
          { key: 'todos',   label: 'Todos' },
          { key: 'ml',      label: 'Bajar exacto (ML)' },
          { key: 'ampolla', label: 'Por ampolla' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroTipo(f.key)}
            style={{ padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${filtroTipo === f.key ? '#2e5cbf' : 'var(--color-border)'}`, background: filtroTipo === f.key ? '#2e5cbf' : 'var(--color-white)', color: filtroTipo === f.key ? 'white' : 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
          >
            {f.label}
          </button>
        ))}
        {filtroEstado !== 'todos' && (
          <button
            onClick={() => setFiltroEstado('todos')}
            style={{ padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid #dc2626', background: '#fee2e2', color: '#dc2626', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
          >
            ✕ Filtro: {filtroEstado}
          </button>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{items.length} items</span>
      </div>

      {/* Tabla */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
              {['Medicamento', 'Tipo', 'Stock actual', 'Mínimo', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  No se encontraron items.
                </td>
              </tr>
            )}
            {items.map((item, idx) => {
              const st = statusOf(item);
              const cfg = STATUS_CFG[st];
              return (
                <tr
                  key={item.id}
                  style={{ borderBottom: idx < items.length - 1 ? '1px solid var(--color-border)' : 'none', background: st === 'agotado' ? '#fff8f8' : st === 'bajo' ? '#fffdf0' : 'white' }}
                >
                  <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    {item.codigo && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 5px', marginRight: '0.5rem', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                        {item.codigo}
                      </span>
                    )}
                    {item.nombre}
                    {item.tipo === 'ampolla' && item.ml_por_ampolla && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
                        ({item.ml_por_ampolla} ml/amp)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: TIPO_BG[item.tipo], color: TIPO_COLOR[item.tipo] }}>
                      {TIPO_LABEL[item.tipo]}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.9rem', fontWeight: 700, color: st === 'agotado' ? '#dc2626' : st === 'bajo' ? '#a16207' : 'var(--color-text)' }}>
                    {fmt(item.stock)} <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>{unidad(item)}</span>
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {item.stock_minimo} {unidad(item)}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => openModal('ingreso', item)}
                        style={{ padding: '0.3rem 0.7rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', fontFamily: 'var(--font-body)' }}
                      >
                        + Agregar
                      </button>
                      <button
                        onClick={() => openModal('descargue', item)}
                        disabled={item.stock <= 0}
                        style={{ padding: '0.3rem 0.7rem', background: item.stock <= 0 ? 'var(--color-bg)' : '#fee2e2', border: `1px solid ${item.stock <= 0 ? 'var(--color-border)' : '#fca5a5'}`, borderRadius: 'var(--radius-sm)', cursor: item.stock <= 0 ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700, color: item.stock <= 0 ? 'var(--color-text-muted)' : '#dc2626', fontFamily: 'var(--font-body)' }}
                      >
                        − Descargar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal ingreso / descargue */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 420, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--color-border)', background: modal.accion === 'ingreso' ? '#f0fdf4' : '#fff1f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1rem', color: modal.accion === 'ingreso' ? '#15803d' : '#dc2626' }}>
                  {modal.accion === 'ingreso' ? '📥 Agregar stock' : '📤 Descargue manual'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                  {modal.item.nombre}
                </div>
              </div>
              <button onClick={() => setModal(null)} style={{ width: 30, height: 30, background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.4rem' }}>
              <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.9rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Stock actual: <strong style={{ color: 'var(--color-text)' }}>{fmt(modal.item.stock)} {unidad(modal.item)}</strong>
                {modal.item.tipo === 'ampolla' && (
                  <span style={{ marginLeft: '0.5rem' }}>· {modal.item.ml_por_ampolla} ml/amp</span>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem', color: 'var(--color-text)' }}>
                  Cantidad ({unidad(modal.item)}) *
                </label>
                <input
                  type="number"
                  autoFocus
                  min="0.01"
                  step={modal.item.tipo === 'ampolla' ? '1' : '0.1'}
                  value={cantidad}
                  onChange={e => { setCantidad(e.target.value); setModalError(''); }}
                  placeholder={modal.item.tipo === 'ampolla' ? 'Ej: 5' : 'Ej: 50'}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600 }}
                  onKeyDown={e => e.key === 'Enter' && handleGuardar()}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem', color: 'var(--color-text)' }}>
                  Motivo (opcional)
                </label>
                <input
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder={modal.accion === 'ingreso' ? 'Ej: Pedido #45, llegó el lunes' : 'Ej: Vencido, corrección conteo'}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
                />
              </div>

              {modalError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  ⚠️ {modalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setModal(null)} style={{ padding: '0.55rem 1.1rem', background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={saving || !cantidad}
                  style={{ padding: '0.55rem 1.4rem', background: modal.accion === 'ingreso' ? '#16a34a' : '#dc2626', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: saving || !cantidad ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, opacity: saving || !cantidad ? 0.65 : 1 }}
                >
                  {saving ? 'Guardando...' : modal.accion === 'ingreso' ? '✓ Confirmar ingreso' : '✓ Confirmar descargue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
