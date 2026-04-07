import { NavLink } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';

const generalItems = [
  { path: '/',        label: 'Dashboard', icon: '▦'  },
  { path: '/clients', label: 'Clientes',  icon: '👤'  },
  { path: '/patients',label: 'Pacientes', icon: '🐾'  },
];

const serviciosItems = [
  { path: '/appointments',    label: 'Agenda',          icon: '📅'  },
  { path: '/grooming',        label: 'Peluquería',      icon: '✂️'  },
  { path: '/hospitalization', label: 'Hospitalización', icon: '🏥'  },
  { path: '/laboratorios',    label: 'Laboratorios',    icon: '🧪'  },
];

const otrosItems = [
  { path: '/prepagada', label: 'Med. Prepagada', icon: '💳'  },
  { path: '/documents', label: 'Documentos',     icon: '📄'  },
];

export default function Sidebar() {
  const { session, logout } = useAuth();

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--color-primary)',
      minHeight: '100vh',
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: 'var(--shadow-lg)',
    }}>

      {/* Logo */}
      <div style={{
        padding: '1.25rem 1rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
      }}>
        <img
          src="/logos/pp-02.svg"
          alt="Pets&Pets"
          style={{
            width: '100%',
            maxWidth: 170,
            height: 'auto',
            filter: 'brightness(0) invert(1)',
            opacity: 0.95,
          }}
        />
        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          SofVet v1.0
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.65rem 0', overflowY: 'auto' }}>
        <SectionLabel>General</SectionLabel>
        {generalItems.map(item => <MenuItem key={item.path} item={item} />)}

        <SectionLabel>Servicios</SectionLabel>
        {serviciosItems.map(item => <MenuItem key={item.path} item={item} />)}

        <SectionLabel>Otros</SectionLabel>
        {otrosItems.map(item => <MenuItem key={item.path} item={item} />)}

        {session?.rol === 'Administrador' && (
          <>
            <SectionLabel>Administración</SectionLabel>
            <MenuItem item={{ path: '/users',  label: 'Usuarios',        icon: '👥' }} />
            <MenuItem item={{ path: '/import', label: 'Importar datos',  icon: '⬇️' }} />
          </>
        )}
      </nav>

      {/* User / Logout */}
      <div style={{ padding: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <div style={{
            width: 30, height: 30,
            background: 'var(--color-accent)',
            borderRadius: 'var(--radius-full)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
          }}>{session?.nombre?.[0]?.toUpperCase() || 'U'}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: 'white', fontSize: '0.76rem', fontWeight: 600 }}>{session?.nombre || 'Usuario'}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.email || ''}</div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '0.42rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 'var(--radius-sm)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ padding: '0.75rem 1.25rem 0.2rem', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
      {children}
    </div>
  );
}

function MenuItem({ item }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.55rem 1rem',
        margin: '0.05rem 0.55rem',
        borderRadius: 'var(--radius-sm)',
        color: isActive ? 'var(--color-white)' : 'rgba(255,255,255,0.65)',
        background: isActive ? 'rgba(255,255,255,0.16)' : 'transparent',
        fontWeight: isActive ? 600 : 400,
        fontSize: '0.835rem',
        transition: 'var(--transition)',
        textDecoration: 'none',
      })}
    >
      <span style={{ fontSize: '0.9rem', minWidth: 18, textAlign: 'center' }}>{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  );
}
