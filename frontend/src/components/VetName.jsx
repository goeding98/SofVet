import { getTP } from '../utils/vetCards';

export default function VetName({ name, muted = false }) {
  if (!name) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
  const tp = getTP(name);
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.05rem' }}>
      <span style={{ color: muted ? 'var(--color-text-muted)' : 'var(--color-text)' }}>{name}</span>
      {tp && (
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, color: '#1d6fa4',
          background: '#e8f4fd', borderRadius: 4,
          padding: '0 5px', lineHeight: '1.5', alignSelf: 'flex-start',
          letterSpacing: '0.02em',
        }}>
          {tp}
        </span>
      )}
    </span>
  );
}
