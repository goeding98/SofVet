import { createContext, useContext, useState } from 'react';

// ── Sede IDs ───────────────────────────────────────────────────────────────
// 1 = Santa Mónica | 2 = Colseguros | 3 = Ciudad Jardín

const DEFAULT_USERS = [
  // ── ADMINISTRADORES ──────────────────────────────────────────────────────
  { id:  1, username: 'goeding',    nombre: 'Guillermo Oeding',         password: 'petspets123', rol: 'Administrador', sede_id: null, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id:  2, username: 'mnader',     nombre: 'Michel Nader',             password: 'petspets123', rol: 'Administrador', sede_id: null, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id:  3, username: 'jjhernandez',nombre: 'Juan José Hernández',      password: 'petspets123', rol: 'Administrador', sede_id: null, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id:  4, username: 'msalazar',   nombre: 'Marilu Salazar',           password: 'petspets123', rol: 'Administrador', sede_id: null, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id:  5, username: 'mamartinez', nombre: 'María Alejandra Martínez', password: 'petspets123', rol: 'Administrador', sede_id: null, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },

  // ── COLSEGUROS - MÉDICOS ─────────────────────────────────────────────────
  { id:  6, username: 'lurrea',     nombre: 'Liliana Urrea',            password: 'petspets123', rol: 'Médico',        sede_id: 2, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id:  7, username: 'jhincapie',  nombre: 'Jessica Hincapié',         password: 'petspets123', rol: 'Médico',        sede_id: 2, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id:  8, username: 'dparis',     nombre: 'Diego Paris',              password: 'petspets123', rol: 'Médico',        sede_id: 2, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id:  9, username: 'cjaramillo', nombre: 'Camila Jaramillo',         password: 'petspets123', rol: 'Médico',        sede_id: 2, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },

  // ── COLSEGUROS - AUXILIARES ──────────────────────────────────────────────
  { id: 10, username: 'elabrada',   nombre: 'Edna Labrada',             password: 'petspets123', rol: 'Auxiliar',      sede_id: 2, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id: 11, username: 'emartinez',  nombre: 'Edwin Martínez',           password: 'petspets123', rol: 'Auxiliar',      sede_id: 2, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id: 12, username: 'jduque',     nombre: 'Johan Duque',              password: 'petspets123', rol: 'Auxiliar',      sede_id: 2, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id: 13, username: 'mpabon',     nombre: 'María Fernanda Pabon',     password: 'petspets123', rol: 'Auxiliar',      sede_id: 2, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },

  // ── CIUDAD JARDÍN - MÉDICOS ──────────────────────────────────────────────
  { id: 14, username: 'jricci',     nombre: 'Juliana Ricci',            password: 'petspets123', rol: 'Médico',        sede_id: 3, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id: 15, username: 'jbejarano',  nombre: 'Juan Bejarano',            password: 'petspets123', rol: 'Médico',        sede_id: 3, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id: 16, username: 'kzapata',    nombre: 'Karen Zapata',             password: 'petspets123', rol: 'Médico',        sede_id: 3, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },

  // ── CIUDAD JARDÍN - AUXILIARES ───────────────────────────────────────────
  { id: 17, username: 'sruiz',      nombre: 'Sergio Ruiz',              password: 'petspets123', rol: 'Auxiliar',      sede_id: 3, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id: 18, username: 'pgarzon',    nombre: 'Paola Garzón',             password: 'petspets123', rol: 'Auxiliar',      sede_id: 3, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
  { id: 19, username: 'asierra',    nombre: 'Angie Sierra',             password: 'petspets123', rol: 'Auxiliar',      sede_id: 3, estado: 'activo', mustChangePassword: false, fecha_creacion: '2026-01-01' },
];

const STORAGE_USERS   = 'sofvet_users';
const STORAGE_SESSION = 'sofvet_session';

function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (raw) {
      const stored = JSON.parse(raw);
      // If stored users are old format (no username field), reset to defaults
      if (stored.length > 0 && !stored[0].username) {
        saveUsers(DEFAULT_USERS);
        return DEFAULT_USERS;
      }
      // Merge: ensure all DEFAULT_USERS exist (add new ones if missing)
      const storedUsernames = new Set(stored.map(u => u.username));
      const missing = DEFAULT_USERS.filter(u => !storedUsernames.has(u.username));
      if (missing.length > 0) {
        const merged = [...stored, ...missing];
        saveUsers(merged);
        return merged;
      }
      return stored;
    }
    saveUsers(DEFAULT_USERS);
    return DEFAULT_USERS;
  } catch { return DEFAULT_USERS; }
}

function saveUsers(list) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(list));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION);
    if (!raw) return null;
    const sess = JSON.parse(raw);
    // Invalidate old sessions that used email-based login
    if (!sess.username) { localStorage.removeItem(STORAGE_SESSION); return null; }
    return sess;
  } catch { return null; }
}

function saveSession(sess) {
  if (sess) localStorage.setItem(STORAGE_SESSION, JSON.stringify(sess));
  else localStorage.removeItem(STORAGE_SESSION);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [users,   setUsers]   = useState(() => loadUsers());
  const [session, setSession] = useState(() => loadSession());

  const persistUsers   = (list) => { setUsers(list);  saveUsers(list); };
  const persistSession = (s)    => { setSession(s);   saveSession(s);  };

  // ── Login por username ─────────────────────────────────────────────────
  const login = (username, password) => {
    const user = users.find(
      u => u.username?.trim().toLowerCase() === username.trim().toLowerCase()
        && u.password === password
        && u.estado === 'activo'
    );
    if (!user) return { success: false, error: 'Usuario o contraseña incorrectos.' };

    const sess = {
      id:                 user.id,
      username:           user.username,
      nombre:             user.nombre,
      rol:                user.rol,
      sede_id:            user.sede_id || null,
      mustChangePassword: user.mustChangePassword,
    };
    persistSession(sess);
    return { success: true };
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = () => {
    persistSession(null);
    window.location.href = '/login';
  };

  // ── Crear usuario ───────────────────────────────────────────────────────
  const createUser = ({ nombre, username, rol, sede_id, tempPassword }) => {
    if (users.find(u => u.username?.toLowerCase() === username?.toLowerCase())) {
      return { success: false, error: 'El nombre de usuario ya existe.' };
    }
    const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
    const newUser = {
      id:                 maxId + 1,
      username,
      nombre,
      password:           tempPassword,
      rol,
      sede_id:            sede_id || null,
      estado:             'activo',
      mustChangePassword: true,
      fecha_creacion:     new Date().toISOString().split('T')[0],
    };
    persistUsers([...users, newUser]);
    return { success: true, user: newUser };
  };

  // ── Editar usuario ──────────────────────────────────────────────────────
  const editUser = (id, changes) => {
    persistUsers(users.map(u => u.id === id ? { ...u, ...changes } : u));
    // If editing current session user, update session too
    if (id === session?.id) {
      persistSession({ ...session, ...changes });
    }
    return { success: true };
  };

  // ── Eliminar usuario ────────────────────────────────────────────────────
  const deleteUser = (id) => {
    if (id === session?.id) return { success: false, error: 'No puedes eliminar tu propio usuario.' };
    persistUsers(users.filter(u => u.id !== id));
    return { success: true };
  };

  // ── Toggle estado ───────────────────────────────────────────────────────
  const toggleUserStatus = (id) => {
    if (id === session?.id) return { success: false, error: 'No puedes desactivar tu propio usuario.' };
    persistUsers(users.map(u => u.id === id ? { ...u, estado: u.estado === 'activo' ? 'inactivo' : 'activo' } : u));
    return { success: true };
  };

  // ── Cambiar contraseña ──────────────────────────────────────────────────
  const changePassword = (oldPassword, newPassword) => {
    const user = users.find(u => u.id === session?.id);
    if (!user) return { success: false, error: 'Sesión inválida.' };
    if (user.password !== oldPassword) return { success: false, error: 'La contraseña anterior no es correcta.' };
    if (newPassword.length < 8) return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
    persistUsers(users.map(u => u.id === session.id ? { ...u, password: newPassword, mustChangePassword: false } : u));
    persistSession({ ...session, mustChangePassword: false });
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ session, users, login, logout, createUser, editUser, deleteUser, toggleUserStatus, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
