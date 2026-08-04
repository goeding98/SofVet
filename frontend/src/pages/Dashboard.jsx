import { useState } from 'react';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { StatCard } from '../components/Card';
import Card from '../components/Card';
import { SEDES, sedeBadge } from '../utils/useSede';

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

  // Administrador y Laboratorio no tienen sede fija → ven todas las sedes
  const canSeeAllSedes = session?.sede_id == null;
  const [altaSedeFilter, setAltaSedeFilter] = useState(canSeeAllSedes ? null : session?.sede_id || null);

  const ultimasAltas = hospitalized
    .filter(h => h.status === 'cobrada' || h.status === 'no_cobrada')
    .filter(h => canSeeAllSedes ? (altaSedeFilter === null || h.sede_id === altaSedeFilter) : h.sede_id === session?.sede_id)
    .sort((a, b) => `${b.alta_date || ''}T${b.alta_time || ''}`.localeCompare(`${a.alta_date || ''}T${a.alta_time || ''}`))
    .slice(0, 20);

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

        {/* Últimas altas de hospitalización */}
        <Card
          title="Últimas altas de hospitalización"
          action={canSeeAllSedes && (
            <select
              value={altaSedeFilter ?? ''}
              onChange={e => setAltaSedeFilter(e.target.value === '' ? null : parseInt(e.target.value))}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
            >
              <option value="">Todas las sedes</option>
              {SEDES.filter(s => !s.domicilio).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}
        >
          {ultimasAltas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏥</div>
              <p style={{ fontSize: '0.875rem' }}>Sin altas registradas todavía.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {ultimasAltas.map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: 38, height: 38,
                    background: 'var(--color-cream)', borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                  }}>{speciesIcon(h.species)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {h.patient_name} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>· {h.breed || h.species}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{h.client_name}</div>
                  </div>
                  {canSeeAllSedes && sedeBadge(h.sede_id)}
                  <div style={{ fontSize: '0.67rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{h.alta_date}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
