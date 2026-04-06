import { useState } from 'react';
import documents from '../data/documents.js';
import DocumentModal from '../components/DocumentModal';

export default function DocumentsPage() {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <div className="page-header">
        <h1>Documentos</h1>
        <p>Genera, previsualiza e imprime documentos clínicos con firma digital</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {documents.map(doc => (
          <div
            key={doc.id}
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
          >
            {/* Icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-md)',
                background: 'var(--color-info-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', flexShrink: 0,
              }}>
                {doc.icono}
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '0.95rem', lineHeight: 1.3, margin: 0 }}>
                  {doc.nombre}
                </h3>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '1px 7px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', fontWeight: 500, marginTop: '0.2rem', display: 'inline-block' }}>
                  Doc #{doc.id}
                </span>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              {doc.descripcion}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setSelected(doc)}
                style={{
                  flex: 1, padding: '0.5rem',
                  background: 'var(--color-primary)', color: 'white',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontSize: '0.82rem', fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  transition: 'var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-dark)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
              >
                📄 Generar documento
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info bar */}
      <div style={{
        marginTop: '2rem',
        background: 'var(--color-info-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      }}>
        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>ℹ️</span>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-primary)' }}>¿Cómo usar?</strong> — Haz clic en <em>Generar documento</em>, selecciona el cliente y la mascota.
          Los datos se llenan automáticamente. Usa la pestaña <em>Firma digital</em> para capturar la firma del propietario con el mouse o pantalla táctil.
          Finaliza con <em>Imprimir / Descargar</em> para obtener el PDF.
        </div>
      </div>

      <DocumentModal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        document={selected}
      />
    </div>
  );
}
