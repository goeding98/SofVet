import { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';

const BACKEND_URL = 'http://localhost:3000';

// Claves que se van a cargar (deben coincidir con useStore KEYS)
const STORAGE_KEYS = [
  'sofvet_clients',
  'sofvet_patients',
  'sofvet_consultations',
  'sofvet_vaccines',
  'sofvet_clients_nid',
  'sofvet_patients_nid',
  'sofvet_consultations_nid',
  'sofvet_vaccines_nid',
];

export default function ImportPage() {
  const [meta,      setMeta]      = useState(null);
  const [metaError, setMetaError] = useState('');
  const [step,      setStep]      = useState('idle'); // idle | checking | ready | importing | done | error
  const [progress,  setProgress]  = useState('');
  const [result,    setResult]    = useState(null);

  const checkMeta = async () => {
    setStep('checking');
    setMetaError('');
    try {
      const res  = await fetch(`${BACKEND_URL}/api/import/meta`);
      const json = await res.json();
      if (!json.success) { setMetaError(json.message); setStep('idle'); return; }
      setMeta(json);
      setStep('ready');
    } catch (e) {
      setMetaError('No se pudo conectar al backend. ¿Está corriendo? (node backend/server.js)');
      setStep('idle');
    }
  };

  const handleImport = async () => {
    if (!confirm(
      `¿Confirmas la importación?\n\n` +
      `Esto REEMPLAZARÁ todos los clientes, pacientes, consultas y vacunas actuales en SofVet.\n\n` +
      `Clientes: ${meta.meta.clientes.toLocaleString()}\n` +
      `Pacientes: ${meta.meta.pacientes.toLocaleString()}\n` +
      `Consultas: ${meta.meta.consultas.toLocaleString()}\n` +
      `Vacunas: ${meta.meta.vacunas.toLocaleString()}`
    )) return;

    setStep('importing');
    setProgress('Descargando datos desde el backend...');

    try {
      const res  = await fetch(`${BACKEND_URL}/api/import/payload`);
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

      setProgress('Procesando datos (puede tomar unos segundos)...');
      const payload = await res.json();

      setProgress('Cargando en localStorage...');

      // Limpiar claves existentes
      STORAGE_KEYS.forEach(k => localStorage.removeItem(k));

      // Cargar cada colección
      let loaded = {};
      for (const key of STORAGE_KEYS) {
        if (payload[key] !== undefined) {
          localStorage.setItem(key, JSON.stringify(payload[key]));
          loaded[key] = Array.isArray(payload[key]) ? payload[key].length : payload[key];
        }
      }

      setResult({
        clientes:    loaded['sofvet_clients']      || 0,
        pacientes:   loaded['sofvet_patients']     || 0,
        consultas:   loaded['sofvet_consultations']|| 0,
        vacunas:     loaded['sofvet_vaccines']     || 0,
      });
      setStep('done');

    } catch (e) {
      setProgress('');
      setStep('error');
      setMetaError('Error durante la importación: ' + e.message);
    }
  };

  const handleReset = () => {
    if (!confirm('¿Eliminar TODOS los datos importados y volver a los datos de ejemplo?')) return;
    STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    // También limpiar hospitalizaciones y otros
    localStorage.removeItem('sofvet_hospitalization');
    localStorage.removeItem('sofvet_appointments');
    localStorage.removeItem('sofvet_signedDocuments');
    window.location.reload();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Importación de datos — Vetlogy</h1>
        <p>Carga el historial completo desde el backup de Vetlogy (solo pacientes activos 2024-2026)</p>
      </div>

      {/* Info card */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '1rem', marginBottom: '0.75rem' }}>
              ¿Qué hace esto?
            </h3>
            <ul style={{ fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
              <li>Lee el backup de Vetlogy (<strong>VETLOGY BACKUP 28 ENERO 2026.xlsx</strong>)</li>
              <li>Solo incluye pacientes con actividad en <strong>2024, 2025 o 2026</strong></li>
              <li>Excluye pacientes fallecidos (<code>Vive = 0</code>)</li>
              <li>Carga clientes, pacientes, consultas y vacunas en SofVet</li>
              <li>Los datos existentes serán <strong>reemplazados</strong></li>
            </ul>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 200 }}>
            <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-primary)' }}>Requisito previo</div>
              Ejecutar en terminal antes de importar:
              <div style={{ background: '#1e1e2e', color: '#a6e3a1', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                node backend/scripts/importVetlogy.js<br />
                node backend/scripts/generateStoragePayload.js<br />
                node backend/server.js
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Step 1: Check */}
      {step === 'idle' && (
        <Card title="Paso 1 — Verificar datos disponibles">
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Primero verificamos que el backend esté corriendo y el payload esté generado.
          </p>
          {metaError && (
            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.9rem', color: 'var(--color-danger)', fontSize: '0.82rem', marginBottom: '1rem' }}>
              ⚠️ {metaError}
            </div>
          )}
          <Button variant="primary" onClick={checkMeta}>🔍 Verificar backend</Button>
        </Card>
      )}

      {step === 'checking' && (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            Conectando con el backend...
          </div>
        </Card>
      )}

      {/* Step 2: Preview & confirm */}
      {step === 'ready' && meta && (
        <Card title="Paso 2 — Datos listos para importar">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { icon: '👤', label: 'Clientes',   value: meta.meta.clientes   },
              { icon: '🐾', label: 'Pacientes',  value: meta.meta.pacientes  },
              { icon: '📋', label: 'Consultas',  value: meta.meta.consultas  },
              { icon: '💉', label: 'Vacunas',    value: meta.meta.vacunas    },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-title)' }}>{value.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff8e1', border: '1px solid #b8860b', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#7a5800', marginBottom: '1.5rem' }}>
            ⚠️ <strong>Atención:</strong> Esta acción reemplazará los datos de ejemplo actuales. Generado el: <strong>{new Date(meta.meta.generado).toLocaleString('es-CO')}</strong> · Tamaño: <strong>{meta.sizeMB} MB</strong>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="primary" onClick={handleImport}>⬇️ Importar ahora</Button>
            <Button variant="ghost" onClick={() => setStep('idle')}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Importing */}
      {step === 'importing' && (
        <Card>
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
            <p style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.4rem' }}>Importando datos...</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{progress}</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {step === 'error' && (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>❌</div>
            <p style={{ color: 'var(--color-danger)', fontWeight: 600, marginBottom: '1rem' }}>{metaError}</p>
            <Button variant="ghost" onClick={() => setStep('idle')}>Intentar de nuevo</Button>
          </div>
        </Card>
      )}

      {/* Done */}
      {step === 'done' && result && (
        <Card>
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-success)', fontSize: '1.2rem', marginBottom: '1rem' }}>
              ¡Importación completada!
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', maxWidth: 500, margin: '0 auto 1.5rem' }}>
              {[
                { icon: '👤', label: 'Clientes',  value: result.clientes  },
                { icon: '🐾', label: 'Pacientes', value: result.pacientes },
                { icon: '📋', label: 'Consultas', value: result.consultas },
                { icon: '💉', label: 'Vacunas',   value: result.vacunas   },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem' }}>{icon}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>{value.toLocaleString()}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Los datos ya están cargados. Navega a <strong>Clientes</strong> o <strong>Pacientes</strong> para verlos.
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              🔄 Recargar aplicación
            </Button>
          </div>
        </Card>
      )}

      {/* Danger zone */}
      <Card style={{ marginTop: '2rem', border: '1px solid var(--color-danger)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Zona de peligro</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Elimina todos los datos importados y vuelve a los datos de ejemplo.</div>
          </div>
          <button
            onClick={handleReset}
            style={{ padding: '0.5rem 1rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600 }}
          >
            🗑 Resetear datos
          </button>
        </div>
      </Card>
    </div>
  );
}
