import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../utils/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const TABS = [
  { key: 'solicitado', label: 'Solicitado', color: '#2563eb' },
  { key: 'pedido',     label: 'Pedido',     color: '#7c3aed' },
  { key: 'recibido',   label: 'Recibido',   color: '#16a34a' },
  { key: 'rechazado',  label: 'Rechazado',  color: '#dc2626' },
  { key: 'eliminado',  label: 'Eliminado',  color: '#6b7280' },
];

const SEDE_COLOR = {
  'Todas':         { bg: '#f0f4ff', border: '#c7d7fa', text: '#2563eb' },
  'Santa Mónica':  { bg: '#e8f0ff', border: '#93b4f5', text: '#2e5cbf' },
  'Colseguros':    { bg: '#e8f5ee', border: '#86c9a0', text: '#2e7d50' },
  'Ciudad Jardín': { bg: '#fdf8e1', border: '#d4b96a', text: '#7a5a00' },
  'Domicilio':     { bg: '#f3eff9', border: '#bda9e8', text: '#7c5cbf' },
};

const ESTADO_COLOR = {
  solicitado: '#2563eb',
  pedido:     '#7c3aed',
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

  // Create form — multiple rows
  const emptyRow = () => ({ item: '', cantidad: '', sede: '', notas: '' });
  const [formRows, setFormRows] = useState([emptyRow()]);

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

  const updateRow = (idx, field, value) =>
    setFormRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const addRow = () => setFormRows(rows => [...rows, emptyRow()]);

  const removeRow = (idx) => setFormRows(rows => rows.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    const valid = formRows.filter(r => r.item.trim() && r.cantidad.trim());
    if (valid.length === 0) return alert('Agrega al menos un ítem con nombre y cantidad.');
    const incomplete = formRows.find(r => (r.item.trim() && !r.cantidad.trim()) || (!r.item.trim() && r.cantidad.trim()));
    if (incomplete) return alert('Cada fila debe tener ítem y cantidad.');
    setSaving(true);
    const now = nowISO();
    const rows = valid.map(r => ({
      item:           r.item.trim(),
      cantidad:       r.cantidad.trim(),
      sede:           r.sede || 'Todas',
      notas:          r.notas.trim() || null,
      estado:         'solicitado',
      solicitado_por: userName,
      solicitado_at:  now,
    }));
    const { error } = await supabase.from('pedidos_compra').insert(rows);
    setSaving(false);
    if (error) return alert('Error al crear: ' + error.message);
    setFormRows([emptyRow()]);
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

  const handleGenerarPDF = () => {
    const tabLabel = TABS.find(t => t.key === tab)?.label || tab;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(16);
    doc.setTextColor(46, 92, 191);
    doc.setFont('helvetica', 'bold');
    doc.text('Pets & Pets — Pedidos de Compra', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    doc.text(`Estado: ${tabLabel}   |   Generado: ${fecha}`, 14, 26);

    // Table
    autoTable(doc, {
      startY: 32,
      head: [['#', 'Ítem / Descripción', 'Cantidad', 'Sede', 'Solicitado por']],
      body: items.map((it, i) => [
        i + 1,
        it.item + (it.notas ? `\n${it.notas}` : ''),
        it.cantidad,
        it.sede || '—',
        it.solicitado_por ? `${it.solicitado_por}\n${fmt(it.solicitado_at)}` : '—',
      ]),
      headStyles: {
        fillColor: [46, 92, 191],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 28 },
        3: { cellWidth: 32 },
        4: { cellWidth: 38 },
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Página ${p} de ${pageCount}`, 14, doc.internal.pageSize.height - 8);
    }

    doc.save(`pedidos_${tab}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const handleGenerarExcel = () => {
    const tabLabel = TABS.find(t => t.key === tab)?.label || tab;
    const rows = items.map((it, i) => ({
      '#':               i + 1,
      'Ítem':            it.item,
      'Cantidad':        it.cantidad,
      'Sede':            it.sede || '—',
      'Notas':           it.notas || '',
      'Solicitado por':  it.solicitado_por || '—',
      'Fecha solicitud': it.solicitado_at ? fmt(it.solicitado_at) : '—',
      'Pedido por':      it.pedido_por || '',
      'Fecha pedido':    it.pedido_at ? fmt(it.pedido_at) : '',
      'Recibido por':    it.recibido_por || '',
      'Fecha recibo':    it.recibido_at ? fmt(it.recibido_at) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 32 }, { wch: 14 }, { wch: 16 }, { wch: 24 },
      { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tabLabel);
    XLSX.writeFile(wb, `pedidos_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

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
          {item.sede && (
            <span style={{
              background: SEDE_COLOR[item.sede]?.bg || '#f3f4f6',
              border: `1px solid ${SEDE_COLOR[item.sede]?.border || '#e5e7eb'}`,
              borderRadius: 6,
              padding: '1px 8px',
              fontSize: '0.72rem',
              color: SEDE_COLOR[item.sede]?.text || '#374151',
              fontWeight: 600,
            }}>📍 {item.sede}</span>
          )}
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
            <ActionBtn color="#16a34a" onClick={() => handleRecibido(item)}>📦 Recibido</ActionBtn>
            <ActionBtn color="#dc2626" onClick={() => { setRechazarId(item.id); setRechazarRazon(''); }}>❌ Rechazar</ActionBtn>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Nueva solicitud</h3>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formRows.length} ítem{formRows.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 140px 24px', gap: '0.5rem', marginBottom: '0.3rem', paddingRight: 2 }}>
            <label style={{ ...labelStyle, margin: 0 }}>Ítem / Descripción</label>
            <label style={{ ...labelStyle, margin: 0 }}>Cantidad</label>
            <label style={{ ...labelStyle, margin: 0 }}>Sede</label>
            <span />
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {formRows.map((row, idx) => (
              <div key={idx}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 140px 24px', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    value={row.item}
                    onChange={e => updateRow(idx, 'item', e.target.value)}
                    placeholder="Ej: Amoxicilina 500mg, Jeringas 5cc..."
                    style={inputStyle}
                    autoFocus={idx === formRows.length - 1 && idx > 0}
                  />
                  <input
                    value={row.cantidad}
                    onChange={e => updateRow(idx, 'cantidad', e.target.value)}
                    placeholder="Ej: 2 cajas, 50 und..."
                    style={inputStyle}
                  />
                  <select
                    value={row.sede}
                    onChange={e => updateRow(idx, 'sede', e.target.value)}
                    style={{ ...inputStyle, color: row.sede ? '#111' : '#9ca3af' }}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Todas">Todas las sedes</option>
                    <option value="Santa Mónica">Santa Mónica</option>
                    <option value="Colseguros">Colseguros</option>
                    <option value="Ciudad Jardín">Ciudad Jardín</option>
                    <option value="Domicilio">Domicilio</option>
                  </select>
                  <button
                    onClick={() => removeRow(idx)}
                    disabled={formRows.length === 1}
                    title="Eliminar fila"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: formRows.length === 1 ? '#d1d5db' : '#ef4444',
                      fontSize: '1rem',
                      cursor: formRows.length === 1 ? 'default' : 'pointer',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >×</button>
                </div>
                <input
                  value={row.notas}
                  onChange={e => updateRow(idx, 'notas', e.target.value)}
                  placeholder="Notas (opcional): proveedor, urgencia..."
                  style={{ ...inputStyle, marginTop: 4, fontSize: '0.78rem', color: '#6b7280' }}
                />
              </div>
            ))}
          </div>

          {/* Add row */}
          <button
            onClick={addRow}
            style={{
              marginTop: '0.65rem',
              background: 'none',
              border: '1px dashed #d1d5db',
              borderRadius: 7,
              width: '100%',
              padding: '0.38rem',
              color: '#6b7280',
              fontSize: '0.82rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + Agregar ítem
          </button>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.9rem' }}>
            <button onClick={() => { setShowForm(false); setFormRows([emptyRow()]); }} style={btnSecondary}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving} style={btnPrimary}>
              {saving ? 'Guardando...' : `Solicitar${formRows.filter(r => r.item.trim()).length > 1 ? ` (${formRows.filter(r => r.item.trim()).length})` : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Tabs + PDF button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
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
        {!loading && items.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={handleGenerarPDF}
              style={{
                padding: '0.42rem 0.9rem',
                background: '#fff',
                border: '1.5px solid #d1d5db',
                borderRadius: 8,
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              📄 PDF
            </button>
            <button
              onClick={handleGenerarExcel}
              style={{
                padding: '0.42rem 0.9rem',
                background: '#fff',
                border: '1.5px solid #d1d5db',
                borderRadius: 8,
                color: '#16a34a',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              📊 Excel
            </button>
          </div>
        )}
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
