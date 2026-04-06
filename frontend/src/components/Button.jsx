export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  type = 'button',
  disabled = false,
  style = {},
  icon,
}) {
  const variants = {
    primary: {
      background: 'var(--color-primary)',
      color: 'var(--color-white)',
      border: '1px solid var(--color-primary)',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid var(--color-primary)',
    },
    danger: {
      background: 'var(--color-danger)',
      color: 'var(--color-white)',
      border: '1px solid var(--color-danger)',
    },
    ghost: {
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
    },
    accent: {
      background: 'var(--color-accent)',
      color: 'var(--color-white)',
      border: '1px solid var(--color-accent)',
    },
  };

  const sizes = {
    sm: { padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' },
    md: { padding: '0.55rem 1.25rem', fontSize: '0.875rem', borderRadius: 'var(--radius-sm)' },
    lg: { padding: '0.75rem 1.75rem', fontSize: '1rem', borderRadius: 'var(--radius-md)' },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        ...sizes[size],
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'var(--transition)',
        fontFamily: 'var(--font-body)',
        ...style,
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
