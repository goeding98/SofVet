import { useState } from 'react';
import { useAuth } from '../utils/useAuth';
import { SEDES, sedeById } from '../utils/useSede';
import Card from '../components/Card';
import Button from '../components/Button';

const ROLES = ['Administrador', 'Médico', 'Auxiliar'];

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd + '!1';
}

const rolColors = {
  Administrador: { bg: '#e8f0ff', color: '#2e5cbf' },
  Médico:        { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  Auxiliar:      { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
};

const estadoStyle = {
  activo:   { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  inactivo: { bg: '#f5f5f5',                 color: '#888'                 },
};

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text)',
};

export default function UsersPage() {
  const { session, users, createUser, editUser, deleteUser, toggleUserStatus } = useAuth();

  const [modal,         setModal]         = useState(false);
  const [form,          setForm]          = useState({ nombre: '', username: '', rol: 'Médico', sede_id: 1, tempPassword: '' });
  const [tempGenerated, setTempGenerated] = useState('');
  const [successMsg,    setSuccessMsg]    = useState('');
  const [error,         setError]         = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editForm,  setEditForm]  = useState(null);
  const [editError, setEditError] = useState('');

  const openModal = () => {
    const pwd = generateTempPassword();
    setForm({ nombre: '', username: '', rol: 'Médico', sede_id: 1, tempPassword: pwd });
    setTempGenerated(pwd);
    setSuccessMsg('');
    setError('');
    setModal(true);
  };

  const handleGenPwd = () => {
    const pwd = generateTempPassword();
    setTempGenerated(pwd);
    setForm(f => ({ ...f, tempPassword: pwd }));
  };

  const handleCreate = () => {
    setError('');
    if (!form.nombre.trim())    return setError('El nombre completo es requerido.');
    if (!form.username.trim())  return setError('El nombre de usuario es requerido.');
    if (/\s/.test(form.username)) return setError('El usuario no puede tener espacios.');
    if (!form.rol)              return setError('El rol es requerido.');
    if (!form.tempPassword.trim()) return setError('La contraseña temporal es requerida.');

    const result = createUser({
      nombre:      form.nombre.trim(),
      username:    form.username.trim().toLowerCase(),
      rol:         form.rol,
      sede_id:     form.rol === 'Administrador' ? null : parseInt(form.sede_id),
      tempPassword: form.tempPassword,
    });
    if (!result.success) return setError(result.error);

    setSuccessMsg(`✅ Usuario "${form.username}" creado. Contraseña temporal: "${form.tempPassword}"`);
  };

  const resetForm = () => {
    const pwd = generateTempPassword();
    setForm({ nombre: '', username: '', rol: 'Médico', sede_id: 1, tempPassword: pwd });
    setTempGenerated(pwd);
    setSuccessMsg('');
    setError('');
  };

  const openEdit = (user) => {
    setEditForm({ id: user.id, nombre: user.nombre, username: user.username || '', rol: user.rol, sede_id: user.sede_id || 1, estado: user.estado });
    setEditError('');
    setEditModal(true);
  };

  const handleSaveEdit = () => {
    setEditError('');
    if (!editForm.nombre.trim())   return setEditError('El nombre es requerido.');
    if (!editForm.username.trim()) return setEditError('El nombre de usuario es requerido.');
    const changes = {
      nombre:   editForm.nombre.trim(),
      username: editForm.username.trim().toLowerCase(),
      rol:      editForm.rol,
      sede_id:  editForm.rol === 'Administrador' ? null : parseInt(editForm.sede_id),
      estado:   editForm.estado,
    };
    editUser(editForm.id, changes);
    setEditModal(false);
  };

  const handleDelete = (user) => {
    if (user.id === session?.id) return alert('No puedes eliminar tu propio usuario.');
    if (!confirm(`¿Eliminar al usuario ${user.nombre}? Esta acción no se puede deshacer.`)) return;
    deleteUser(user.id);
  };

  const handleToggle = (user) => {
    if (user.id === session?.id) return alert('No puedes desactivar tu propio usuario.');
    toggleUserStatus(user.id);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Gestión de Usuarios</h1>
        <p>{users.length} usuario(s) registrado(s) · {users.filter(u => u.estado === 'activo').length} activo(s)</p>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Administra los accesos al sistema. Solo el administrador puede crear y eliminar usuarios.
          </p>
          <Button onClick={openModal} icon="+" variant="primary">Crear usuario</Button>
        </div>
      </Card>

      <Card>
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <p>No hay usuarios registrados.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Nombre', 'Usuario', 'Rol', 'Sede', 'Estado', 'Registro', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => {
                  const rc  = rolColors[user.rol]       || rolColors.Auxiliar;
                  const ec  = estadoStyle[user.estado]  || estadoStyle.inactivo;
                  const isMe = user.id === session?.id;
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(49,109,116,0.02)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                            {(user.nombre || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {user.nombre} {isMe && <span style={{ fontSize: '0.68rem', background: 'var(--color-info-bg)', color: 'var(--color-primary)', padding: '1px 6px', borderRadius: 999, fontWeight: 500 }}>Tú</span>}
                            </div>
                            {user.mustChangePassword && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--color-warning)', fontWeight: 500 }}>⚠️ Cambio de contraseña pendiente</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                        {user.username || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ background: rc.bg, color: rc.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>{user.rol}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                        {user.rol === 'Administrador'
                          ? <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Todas</span>
                          : sedeById(user.sede_id)
                            ? <span style={{ background: sedeById(user.sede_id).bg, color: sedeById(user.sede_id).color, padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600 }}>📍 {sedeById(user.sede_id).nombre}</span>
                            : <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>Sin asignar</span>
                        }
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ background: ec.bg, color: ec.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 500 }}>{user.estado}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{user.fecha_creacion}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button onClick={() => openEdit(user)} style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', background: 'var(--color-info-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                            ✏️ Editar
                          </button>
                          {!isMe && (
                            <>
                              <button onClick={() => handleToggle(user)} style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', background: user.estado === 'activo' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)', color: user.estado === 'activo' ? 'var(--color-warning)' : 'var(--color-success)', border: `1px solid ${user.estado === 'activo' ? 'var(--color-warning)' : 'var(--color-success)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                                {user.estado === 'activo' ? 'Desactivar' : 'Activar'}
                              </button>
                              <button onClick={() => handleDelete(user)} style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal editar usuario */}
      {editModal && editForm && (
        <div onClick={() => setEditModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '1.1rem', margin: 0 }}>✏️ Editar usuario</h3>
              <button onClick={() => setEditModal(false)} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Nombre completo *</label>
                <input value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Nombre de usuario *</label>
                <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '') }))} style={{ width: '100%', padding: '0.6rem 0.75rem', fontFamily: 'monospace' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Rol *</label>
                <select value={editForm.rol} onChange={e => setEditForm(f => ({ ...f, rol: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
                  {['Administrador', 'Médico', 'Auxiliar'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              {editForm.rol !== 'Administrador' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Sede asignada *</label>
                  <select value={editForm.sede_id || 1} onChange={e => setEditForm(f => ({ ...f, sede_id: parseInt(e.target.value) }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
                    {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Estado</label>
                <select value={editForm.estado} onChange={e => setEditForm(f => ({ ...f, estado: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              {editError && (
                <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem', color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  ⚠️ {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setEditModal(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSaveEdit}>💾 Guardar cambios</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear usuario */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '1.1rem', margin: 0 }}>Crear nuevo usuario</h3>
              <button onClick={() => setModal(false)} style={{ width: 32, height: 32, background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {successMsg ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
                  <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', color: 'var(--color-success)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                    {successMsg}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <Button variant="ghost" onClick={() => setModal(false)}>Cerrar</Button>
                    <Button variant="primary" onClick={resetForm}>+ Crear otro</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Nombre completo *</label>
                    <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Liliana Urrea" style={{ width: '100%', padding: '0.6rem 0.75rem' }} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Nombre de usuario *</label>
                    <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '') }))} placeholder="Ej: lurrea" style={{ width: '100%', padding: '0.6rem 0.75rem', fontFamily: 'monospace' }} />
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0.3rem 0 0' }}>Sin espacios. Este será el login del usuario.</p>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Rol *</label>
                    <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  {form.rol !== 'Administrador' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Sede asignada *</label>
                    <select value={form.sede_id} onChange={e => setForm(f => ({ ...f, sede_id: parseInt(e.target.value) }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
                      {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                  )}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={labelStyle}>Contraseña temporal *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input value={form.tempPassword} onChange={e => setForm(f => ({ ...f, tempPassword: e.target.value }))} style={{ flex: 1, padding: '0.6rem 0.75rem', fontFamily: 'monospace', letterSpacing: '0.1em' }} />
                      <button onClick={handleGenPwd} style={{ padding: '0.6rem 1rem', background: 'var(--color-secondary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', fontWeight: 500 }}>🔄 Generar</button>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0.3rem 0 0' }}>El usuario deberá cambiarla en su primer ingreso.</p>
                  </div>

                  {error && (
                    <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem', color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      ⚠️ {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleCreate}>✅ Crear usuario</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
