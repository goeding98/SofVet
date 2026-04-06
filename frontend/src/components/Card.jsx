export default function Card({ title, children, style = {}, className = '', action }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-title)',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text)',
          }}>{title}</h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: title ? '1.5rem' : '1.5rem' }}>
        {children}
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon, color = 'var(--color-primary)', trend }) {
  return (
    <div style={{
      background: 'var(--color-white)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--color-border)',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <div style={{
        width: 56, height: 56,
        background: color + '18',
        borderRadius: 'var(--radius-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-title)', color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{label}</div>
        {trend && <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>{trend}</div>}
      </div>
    </div>
  );
}
