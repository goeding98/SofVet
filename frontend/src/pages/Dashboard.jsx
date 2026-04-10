import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { StatCard } from '../components/Card';
import Card from '../components/Card';

const speciesIcon = s => ({ Perro: '🐶', Gato: '🐱', Conejo: '🐰', Ave: '🐦' }[s] || '🐾');

const statusStyle = {
  confirmada: { background: 'var(--color-success-bg)', color: 'var(--color-success)' },
  pendiente:  { background: 'var(--color-warning-bg)', color: 'var(--color-warning)'  },
  cancelada:  { background: 'var(--color-danger-bg)',  color: 'var(--color-danger)'   },
};

export default function Dashboard() {
  const { session } = useAuth();
  const { items: clients }      = useStore('clients');
  const { items: patients }     = useStore('patients');
  const { items: appointments } = useStore('appointments');
  const { items: hospitalized } = useStore('hospitalization');

  const _now = new Date();
  const todayStr  = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  const todayApts = appointments.filter(a => a.date === todayStr);

  return (
    <div>
      <div className="page-header">
        <h1>¡Buen día, {session?.nombre?.split(' ')[0] || 'Admin'}!</h1>
        <p>Resumen del sistema Pets&Pets</p>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <StatCard label="Clientes"          value={clients.length}                                                    icon="👤" color="var(--color-accent)"   />
        <StatCard label="Mascotas activas"  value={patients.filter(p => p.status === 'activo').length}                icon="🐾" color="var(--color-primary)"  />
        <StatCard label="Citas hoy"         value={todayApts.length}                                                  icon="📅" color="var(--color-secondary)" />
        <StatCard label="Hospitalizados"    value={hospitalized.filter(h => h.status === 'activo').length}            icon="🏥" color="var(--color-danger)"  />
      </div>

      <div className="grid-2">
        {/* Citas de hoy */}
        <Card title="Citas de hoy">
          {todayApts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
              <p style={{ fontSize: '0.875rem' }}>No hay citas agendadas para hoy.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {todayApts.map(apt => (
                <div key={apt.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.85rem',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, minWidth: 44 }}>
                    {apt.time}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{apt.patient_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{apt.service} · {apt.vet}</div>
                  </div>
                  <span style={{ ...(statusStyle[apt.status] || {}), padding: '2px 9px', borderRadius: 'var(--radius-full)', fontSize: '0.67rem', fontWeight: 500 }}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Últimas mascotas */}
        <Card title="Últimas mascotas registradas">
          {patients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🐾</div>
              <p style={{ fontSize: '0.875rem' }}>Sin mascotas aún.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[...patients].slice(-5).reverse().map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: 38, height: 38,
                    background: 'var(--color-cream)', borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                  }}>{speciesIcon(p.species)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {p.name} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>· {p.breed || p.species}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{p.owner}</div>
                  </div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--color-text-muted)' }}>{p.created_at}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
