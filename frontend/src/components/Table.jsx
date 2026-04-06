import { useState, useEffect } from 'react';

const PAGE_SIZE = 50;

export default function Table({ columns, data, onEdit, onDelete, emptyMessage = 'No hay datos disponibles' }) {
  const [page, setPage] = useState(0);

  // Reset to page 0 when data changes (search/filter applied)
  useEffect(() => { setPage(0); }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageData   = data.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              {columns.map(col => (
                <th key={col.key} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, idx) => (
              <tr key={row.id || idx} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(49,109,116,0.02)' }}>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: 'var(--color-text)' }}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {onEdit && (
                        <button onClick={() => onEdit(row)} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: 'var(--color-info-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          Editar
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(row)} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <span>
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)} de <strong>{data.length}</strong>
          </span>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button onClick={() => setPage(0)} disabled={page === 0} style={{ padding: '0.25rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-white)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontSize: '0.78rem' }}>«</button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} style={{ padding: '0.25rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-white)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontSize: '0.78rem' }}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
              return (
                <button key={p} onClick={() => setPage(p)} style={{ padding: '0.25rem 0.6rem', border: '1px solid', borderColor: p === page ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: 'var(--radius-sm)', background: p === page ? 'var(--color-primary)' : 'var(--color-white)', color: p === page ? 'white' : 'var(--color-text)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: p === page ? 700 : 400 }}>
                  {p + 1}
                </button>
              );
            })}
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages - 1} style={{ padding: '0.25rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-white)', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page === totalPages - 1 ? 0.4 : 1, fontSize: '0.78rem' }}>›</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} style={{ padding: '0.25rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-white)', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page === totalPages - 1 ? 0.4 : 1, fontSize: '0.78rem' }}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
