import { useLocation } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import { useSede, SEDES, sedeById } from '../utils/useSede';

const rolColors = {
  Administrador: { bg: '#e8f0ff', color: '#2e5cbf' },
  Médico:        { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  Auxiliar:      { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
};

const pageNames = {
  '/':                 'Dashboard',
  '/clients':          'Clientes',
  '/patients':         'Pacientes',
  '/appointments':     'Citas',
  '/clinical-history': 'Historia Clínica',
  '/vaccines':         'Vacunas',
  '/petguardianship':  'Guardería',
  '/grooming':         'Peluquería',
  '/hospitalization':  'Hospitalización',
  '/remissions':       'Remisiones',
  '/eps':              'EPS / Seguros',
  '/documents':        'Documentos',
  '/users':            'Gestión de Usuarios',
  '/import':           'Importar datos',
};

function resolvePage(pathname) {
  if (pageNames[pathname]) return pageNames[pathname];
  if (/^\/clients\/\d+/.test(pathname))  return 'Detalle de Cliente';
  if (/^\/patients\/\d+/.test(pathname)) return 'Historia del Paciente';
  return 'SofVet';
}

export default function Navbar() {
  const { session } = useAuth();
  const { sedeActual, setSedeActual, isAdmin } = useSede();
  const location    = useLocation();
  const currentPage = resolvePage(location.pathname);
  const rc          = rolColors[session?.rol] || rolColors.Auxiliar;

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const sedeInfo = sedeById(sedeActual);

  return (
    <header style={{
      position: 'fixed', top: 0,
      left: 'var(--sidebar-width)', right: 0,
      height: 'var(--navbar-height)',
      background: 'var(--color-white)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 2rem', zIndex: 99, boxShadow: 'var(--shadow-sm)',
    }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 600 }}>
          {currentPage}
        </h2>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{today}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>

        {/* Sede selector — Admin ve dropdown, otros ven badge fijo */}
        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>📍 Sede:</span>
            <select
              value={sedeActual ?? ''}
              onChange={e => setSedeActual(e.target.value === '' ? null : parseInt(e.target.value))}
              style={{
                padding: '0.3rem 0.65rem', fontSize: '0.8rem', fontWeight: 600,
                border: `1px solid ${sedeInfo ? sedeInfo.color : 'var(--color-border)'}`,
                borderRadius: 999,
                background: sedeInfo ? sedeInfo.bg : 'var(--color-white)',
                color: sedeInfo ? sedeInfo.color : 'var(--color-text)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            >
              <option value="">Todas las sedes</option>
              {SEDES.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        ) : (
          session?.sede_id && sedeById(session.sede_id) && (
            <span style={{
              background: sedeById(session.sede_id).bg,
              color:      sedeById(session.sede_id).color,
              padding: '3px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
            }}>
              📍 {sedeById(session.sede_id).nombre}
            </span>
          )
        )}

        {/* Logo */}
        <img
          src="/logos/pp-03.svg"
          alt=""
          style={{ height: 28, width: 'auto', filter: 'brightness(0) saturate(100%) invert(35%) sepia(40%) saturate(600%) hue-rotate(148deg) brightness(90%)', opacity: 0.8 }}
        />

        {/* User pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: rc.bg, color: rc.color, padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600 }}>
            {session?.rol}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-primary)', borderRadius: 'var(--radius-full)', padding: '0.35rem 0.9rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-white)', fontWeight: 500 }}>{session?.nombre || 'Usuario'}</span>
            <div style={{ width: 26, height: 26, background: 'var(--color-accent)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.72rem', fontWeight: 700 }}>
              {session?.nombre?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
