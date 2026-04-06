import { createContext, useContext, useState } from 'react';

export const SEDES = [
  { id: 1, nombre: 'Santa Mónica',  color: '#2e5cbf', bg: '#e8f0ff' },
  { id: 2, nombre: 'Colseguros',    color: '#2e7d50', bg: 'var(--color-success-bg)' },
  { id: 3, nombre: 'Ciudad Jardín', color: '#b8860b', bg: '#fff8e1' },
  { id: 4, nombre: 'Domicilio',     color: '#7c5cbf', bg: '#f0ebff', domicilio: true },
];

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
