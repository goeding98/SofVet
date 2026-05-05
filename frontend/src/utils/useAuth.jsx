import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// ── Sede IDs ───────────────────────────────────────────────────────────────
// 1 = Santa Mónica | 2 = Colseguros | 3 = Ciudad Jardín

const STORAGE_SESSION = 'sofvet_session';

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION);
    if (!raw) return null;
    const sess = JSON.parse(raw);
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
  const [users,   setUsers]   = useState([]);
  const [session, setSession] = useState(() => loadSession());

  // Load users from Supabase on mount
  useEffect(() => {
    supabase.from('sofvet_users').select('*').order('id').then(({ data }) => {
      if (data) setUsers(data);
    });
  }, []);

  const persistSession = (s) => { setSession(s); saveSession(s); };

  // ── Login ──────────────────────────────────────────────────────────────
  const login = async (username, password) => {
    const { data, error } = await supabase
      .from('sofvet_users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .eq('password', password)
      .eq('estado', 'activo')
      .single();

    if (error || !data) return { success: false, error: 'Usuario o contraseña incorrectos.' };

    persistSession({
      id:                 data.id,
      username:           data.username,
      nombre:             data.nombre,
      rol:                data.rol,
      sede_id:            data.sede_id || null,
      mustChangePassword: data.must_change_password,
    });
    return { success: true };
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = () => {
    persistSession(null);
    window.location.href = '/login';
  };

  // ── Crear usuario ───────────────────────────────────────────────────────
  const createUser = async ({ nombre, username, rol, sede_id, tempPassword }) => {
    const uname = username?.trim().toLowerCase();
    const { data, error } = await supabase
      .from('sofvet_users')
      .insert({
        username:             uname,
        nombre,
        password:             tempPassword,
        rol,
        sede_id:              (rol === 'Administrador' || rol === 'Laboratorio') ? null : (sede_id || null),
        estado:               'activo',
        must_change_password: true,
        fecha_creacion:       new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    setUsers(prev => [...prev, data]);
    return { success: true, user: data };
  };

  // ── Editar usuario ──────────────────────────────────────────────────────
  const editUser = async (id, changes) => {
    const dbChanges = {
      nombre:   changes.nombre,
      username: changes.username?.toLowerCase(),
      rol:      changes.rol,
      sede_id:  (changes.rol === 'Administrador' || changes.rol === 'Laboratorio') ? null : (parseInt(changes.sede_id) || null),
      estado:   changes.estado,
    };
    const { error } = await supabase.from('sofvet_users').update(dbChanges).eq('id', id);
    if (error) return { success: false, error: error.message };
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...dbChanges } : u));
    if (id === session?.id) persistSession({ ...session, ...changes });
    return { success: true };
  };

  // ── Eliminar usuario ────────────────────────────────────────────────────
  const deleteUser = async (id) => {
    if (id === session?.id) return { success: false, error: 'No puedes eliminar tu propio usuario.' };
    const { error } = await supabase.from('sofvet_users').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    setUsers(prev => prev.filter(u => u.id !== id));
    return { success: true };
  };

  // ── Toggle estado ───────────────────────────────────────────────────────
  const toggleUserStatus = async (id) => {
    if (id === session?.id) return { success: false, error: 'No puedes desactivar tu propio usuario.' };
    const user = users.find(u => u.id === id);
    const newEstado = user?.estado === 'activo' ? 'inactivo' : 'activo';
    const { error } = await supabase.from('sofvet_users').update({ estado: newEstado }).eq('id', id);
    if (error) return { success: false, error: error.message };
    setUsers(prev => prev.map(u => u.id === id ? { ...u, estado: newEstado } : u));
    return { success: true };
  };

  // ── Editar metadata de personal (grupo, fecha_ingreso, vac, par) ─────────
  const editPersonalMeta = async (id, data) => {
    const changes = {
      grupo:               data.grupo            ?? null,
      fecha_ingreso:       data.fecha_ingreso     ?? null,
      par_id:              data.par_id            ?? null,
      'vacaciones_dias_año': parseInt(data['vacaciones_dias_año']) || 15,
    };
    const { error } = await supabase.from('sofvet_users').update(changes).eq('id', id);
    if (error) return { success: false, error: error.message };
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...changes } : u));
    return { success: true };
  };

  // ── Resetear contraseña de otro usuario (solo admin) ───────────────────
  const resetUserPassword = async (id, newPassword) => {
    const { error } = await supabase
      .from('sofvet_users')
      .update({ password: newPassword, must_change_password: true })
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    setUsers(prev => prev.map(u => u.id === id ? { ...u, password: newPassword, must_change_password: true } : u));
    return { success: true };
  };

  // ── Cambiar contraseña ──────────────────────────────────────────────────
  const changePassword = async (oldPassword, newPassword) => {
    const user = users.find(u => u.id === session?.id);
    if (!user) return { success: false, error: 'Sesión inválida.' };
    if (user.password !== oldPassword) return { success: false, error: 'La contraseña anterior no es correcta.' };
    if (newPassword.length < 8) return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
    const { error } = await supabase
      .from('sofvet_users')
      .update({ password: newPassword, must_change_password: false })
      .eq('id', session.id);
    if (error) return { success: false, error: error.message };
    setUsers(prev => prev.map(u => u.id === session.id ? { ...u, password: newPassword, must_change_password: false } : u));
    persistSession({ ...session, mustChangePassword: false });
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ session, users, login, logout, createUser, editUser, deleteUser, toggleUserStatus, changePassword, resetUserPassword, editPersonalMeta }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
