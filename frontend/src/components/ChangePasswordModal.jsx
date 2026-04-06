import { useState } from 'react';
import { useAuth } from '../utils/useAuth';

export default function ChangePasswordModal() {
  const { session, changePassword } = useAuth();

  const [oldPwd,    setOldPwd]    = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [confirmPwd,setConfirmPwd]= useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!oldPwd || !newPwd || !confirmPwd) return setError('Todos los campos son requeridos.');
    if (newPwd !== confirmPwd) return setError('Las contraseñas nuevas no coinciden.');
    if (newPwd.length < 8) return setError('La contraseña nueva debe tener al menos 8 caracteres.');
    if (newPwd === oldPwd) return setError('La nueva contraseña debe ser diferente a la anterior.');

    setLoading(true);
    const result = await changePassword(oldPwd, newPwd);
    setLoading(false);

    if (!result.success) return setError(result.error);
  };

  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    marginBottom: '0.35rem', textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--color-text)',
  };

  const inputStyle = {
    width: '100%', padding: '0.7rem 0.9rem', fontSize: '0.9rem',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        width: '100%', maxWidth: 440,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          padding: '1.5rem 2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
          <h2 style={{ fontFamily: 'var(--font-title)', color: 'white', fontSize: '1.2rem', margin: '0 0 0.25rem' }}>
            Cambio de contraseña requerido
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', margin: 0 }}>
            Hola <strong>{session?.nombre}</strong>, debes cambiar tu contraseña temporal antes de continuar.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.75rem 2rem' }}>
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={labelStyle}>Contraseña anterior (temporal)</label>
            <input
              type="password"
              value={oldPwd}
              onChange={e => setOldPwd(e.target.value)}
              placeholder="Tu contraseña temporal"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.1rem' }}>
            <label style={labelStyle}>Nueva contraseña</label>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.4rem' }}>
            <label style={labelStyle}>Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Repite la nueva contraseña"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.9rem',
              color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '1rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Strength hints */}
          <div style={{ background: 'var(--color-info-bg)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <strong style={{ color: 'var(--color-primary)' }}>Requisitos:</strong> mínimo 8 caracteres · diferente a la temporal
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.82rem',
              background: 'var(--color-primary)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontSize: '0.93rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'var(--font-body)',
              transition: 'var(--transition)',
            }}
          >
            {loading ? 'Guardando...' : '🔒 Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
