import { createContext, useContext, useState } from 'react';

// Los teléfonos están confirmados por gerencia (sept 2026). Las direcciones de
// Santa Mónica y Ciudad Jardín siguen SIN VERIFICAR contra el Perfil de Empresa
// de Google — se imprimen en las fórmulas médicas, así que conviene confirmarlas.
export const SEDES = [
  { id: 1, nombre: 'Santa Mónica',  color: '#2e5cbf', bg: '#e8f0ff',
    telefono: '314 606 2066', direccion: 'Avenida 8N # 22-06, Cali' },
  { id: 2, nombre: 'Colseguros',    color: '#2e7d50', bg: 'var(--color-success-bg)',
    telefono: '315 294 6916', direccion: 'Calle 10 # 31-143, Cali' },
  { id: 3, nombre: 'Ciudad Jardín', color: '#b8860b', bg: '#fff8e1',
    telefono: '320 800 0002', direccion: 'Avenida Cajascal # 106-74, Cali' },
  { id: 4, nombre: 'Domicilio',     color: '#7c5cbf', bg: '#f0ebff', domicilio: true,
    telefono: '315 294 6916', direccion: null },
];

export const SITIO_WEB = 'petspets.co';

export function sedeById(id) {
  return SEDES.find(s => s.id === id) || null;
}

export function sedeBadge(id) {
  const s = sedeById(id);
  if (!s) return null;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      📍 {s.nombre}
    </span>
  );
}

const STORAGE_SEDE = 'sofvet_sede_actual';

const SedeContext = createContext(null);

export function SedeProvider({ children, session }) {
  const isAdmin = session?.rol === 'Administrador';

  // Admin: puede seleccionar sede (null = Todas)
  // Médico/Auxiliar: fijado en session.sede_id
  const [sedeActual, setSedeActualState] = useState(() => {
    if (!isAdmin) return session?.sede_id || null;
    try {
      const raw = localStorage.getItem(STORAGE_SEDE);
      return raw ? parseInt(raw) : null;
    } catch { return null; }
  });

  const setSedeActual = (id) => {
    if (!isAdmin) return; // no-op para no-admins
    setSedeActualState(id);
    if (id === null) localStorage.removeItem(STORAGE_SEDE);
    else localStorage.setItem(STORAGE_SEDE, String(id));
  };

  // Filtra un array de items que tienen sede_id según la sede activa
  // null sedeActual (Admin "Todas") → sin filtro
  const filtrarPorSede = (items) => {
    if (sedeActual === null) return items;
    return items.filter(item => item.sede_id === sedeActual);
  };

  // Dado un array de servicios (consultas/vacunas/hosps), obtiene
  // los patient_id que tienen al menos un servicio en la sede actual
  const patientIdsEnSede = (servicios) => {
    if (sedeActual === null) return null; // null = sin restricción
    const ids = new Set(
      servicios
        .filter(s => s.sede_id === sedeActual)
        .map(s => s.patient_id)
    );
    return ids;
  };

  return (
    <SedeContext.Provider value={{
      sedes:        SEDES,
      sedeActual,
      setSedeActual,
      isAdmin,
      filtrarPorSede,
      patientIdsEnSede,
    }}>
      {children}
    </SedeContext.Provider>
  );
}

export function useSede() {
  const ctx = useContext(SedeContext);
  if (!ctx) throw new Error('useSede must be used inside SedeProvider');
  return ctx;
}
