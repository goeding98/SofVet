import { useState } from 'react';
import { useAuth } from '../utils/useAuth';
import { siigo } from '../utils/siigo';

// Only visible to goeding
const ALLOWED = ['goeding'];

export default function FacturacionPage() {
  const { session } = useAuth();

  if (!ALLOWED.includes(session?.username)) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
        No tienes acceso a esta sección.
      </div>
    );
  }

  return <FacturacionInterna />;
}

function FacturacionInterna() {
  const [cedula,   setCedula]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null); // null | { found: bool, customer? }
  const [error,    setError]    = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    const val = cedula.trim();
    if (!val) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const data = await siigo.searchCustomer(val);
      const results = data.results || [];
      if (results.length > 0) {
        setResult({ found: true, customer: results[0] });
      } else {
        setResult({ found: false });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.35rem' }}>
          🧾 Facturación
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.83rem' }}>
          Integración con Siigo · Solo visible para administración
        </p>
      </div>

      {/* Customer search */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: '#111' }}>
          Buscar cliente en Siigo
        </h2>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.6rem' }}>
          <input
            value={cedula}
            onChange={e => setCedula(e.target.value)}
            placeholder="Cédula o NIT del cliente..."
            style={{
              flex: 1,
              padding: '0.55rem 0.85rem',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontFamily: 'var(--font-body)',
            }}
          />
          <button
            type="submit"
            disabled={loading || !cedula.trim()}
            style={{
              padding: '0.55rem 1.25rem',
              background: loading ? '#9ca3af' : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: loading ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Result */}
        {result && !error && (
          <div style={{ marginTop: '1rem' }}>
            {result.found ? (
              <CustomerCard customer={result.customer} />
            ) : (
              <div style={{
                padding: '1rem',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                fontSize: '0.85rem',
                color: '#92400e',
              }}>
                ⚠️ Cliente con cédula <strong>{cedula}</strong> no existe en Siigo.
                <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#b45309' }}>
                  Habría que crearlo antes de poder facturar.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coming soon sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {[
          { icon: '🏥', label: 'Facturar consulta ambulatoria', soon: true },
          { icon: '🛏️', label: 'Facturar hospitalización', soon: true },
        ].map(s => (
          <div key={s.label} style={{
            background: '#f9fafb',
            border: '1.5px dashed #d1d5db',
            borderRadius: 10,
            padding: '1.25rem',
            textAlign: 'center',
            color: '#9ca3af',
          }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{s.icon}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Próximamente</div>
          </div>
        ))}
      </div>

    </div>
  );
}

function CustomerCard({ customer }) {
  const name = Array.isArray(customer.name) ? customer.name.join(' ') : customer.name;
  const idTypeLabel = customer.id_type?.name || 'Documento';

  return (
    <div style={{
      padding: '1rem 1.1rem',
      background: '#f0fdf4',
      border: '1px solid #86efac',
      borderRadius: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '1.1rem' }}>✅</span>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#15803d' }}>
          Cliente encontrado en Siigo
        </span>
      </div>
      <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.7 }}>
        <div><strong>Nombre:</strong> {name}</div>
        <div><strong>{idTypeLabel}:</strong> {customer.identification}</div>
        <div><strong>Estado:</strong> {customer.active ? 'Activo' : 'Inactivo'}</div>
        {customer.contacts?.[0]?.email && (
          <div><strong>Email:</strong> {customer.contacts[0].email}</div>
        )}
      </div>
    </div>
  );
}
