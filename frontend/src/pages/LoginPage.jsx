import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 55%, #1a3d42 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -120, right: -120, width: 420, height: 420, borderRadius: '50%', background: 'rgba(153,178,170,0.13)' }} />
      <div style={{ position: 'absolute', bottom: -160, left: -100, width: 500, height: 500, borderRadius: '50%', background: 'rgba(248,216,182,0.09)' }} />

      <div style={{
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
        width: '100%',
        maxWidth: 420,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-cream), #fdecd4)',
          padding: '2.25rem 2rem 1.75rem',
          textAlign: 'center',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <img
            src="/logos/pp-02.svg"
            alt="Pets&Pets"
            style={{ width: 200, height: 'auto', filter: 'brightness(0) saturate(100%) invert(35%) sepia(40%) saturate(600%) hue-rotate(148deg) brightness(90%)', marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <img
              src="/logos/pp-05.svg"
              alt=""
              style={{ height: 48, width: 'auto', filter: 'brightness(0) saturate(100%) invert(55%) sepia(20%) saturate(400%) hue-rotate(148deg)', opacity: 0.7 }}
            />
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
            Sistema Veterinario · SofVet v1.0
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.75rem 2rem' }}>
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="goeding"
              required
              autoComplete="username"
              style={{ width: '100%', padding: '0.7rem 0.9rem', fontSize: '0.9rem', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <div style={{ marginBottom: '1.4rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{ width: '100%', padding: '0.7rem 0.9rem', fontSize: '0.9rem', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.9rem',
              color: 'var(--color-danger)',
              fontSize: '0.78rem',
              marginBottom: '1rem',
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.82rem',
              background: 'var(--color-primary)',
              color: 'white', border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.93rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.72 : 1,
              fontFamily: 'var(--font-body)',
              transition: 'var(--transition)',
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1.1rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Usuario: <strong>goeding</strong> · Contraseña: <strong>petspets123</strong>
          </p>
        </form>
      </div>
    </div>
  );
}
