// Teclado en pantalla para tablets en modo kiosco, donde no se puede depender
// de que el teclado nativo del sistema operativo aparezca de forma confiable.
// mode: 'numeric' (cédula, teléfono) | 'text' (nombre, mascota, motivo)

const ROWS_TEXT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const keyStyle = {
  flex: 1, minWidth: 34, padding: '0.85rem 0', background: 'white', border: '1px solid #dfe3ea',
  borderRadius: 10, fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 2px 0 #dfe3ea',
};
const wideKeyStyle = { ...keyStyle, flex: 1.6, background: '#f0f2f6' };

export default function OnScreenKeyboard({ mode = 'text', value, onChange, onDone }) {
  const press = (ch) => onChange((value || '') + ch);
  const backspace = () => onChange((value || '').slice(0, -1));
  const space = () => onChange((value || '') + ' ');

  if (mode === 'numeric') {
    const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return (
      <div style={{ background: '#f7f9fc', border: '1px solid #eceff3', borderRadius: 16, padding: '0.9rem', marginTop: '0.8rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {nums.map(n => (
            <button key={n} type="button" onClick={() => press(n)} style={{ ...keyStyle, padding: '1.1rem 0', fontSize: '1.3rem' }}>{n}</button>
          ))}
          <button type="button" onClick={backspace} style={{ ...keyStyle, padding: '1.1rem 0', background: '#fdecea', color: '#c0392b' }}>⌫</button>
          <button type="button" onClick={() => press('0')} style={{ ...keyStyle, padding: '1.1rem 0', fontSize: '1.3rem' }}>0</button>
          <button type="button" onClick={onDone} style={{ ...keyStyle, padding: '1.1rem 0', background: '#316d74', color: 'white' }}>Listo</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f7f9fc', border: '1px solid #eceff3', borderRadius: 16, padding: '0.9rem', marginTop: '0.8rem' }}>
      {ROWS_TEXT.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.4rem', justifyContent: 'center' }}>
          {row.map(k => (
            <button key={k} type="button" onClick={() => press(k)} style={keyStyle}>{k}</button>
          ))}
          {i === 1 && <button type="button" onClick={backspace} style={{ ...keyStyle, flex: 1.6, background: '#fdecea', color: '#c0392b' }}>⌫</button>}
        </div>
      ))}
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <button type="button" onClick={space} style={{ ...wideKeyStyle, flex: 3 }}>Espacio</button>
        <button type="button" onClick={onDone} style={{ ...wideKeyStyle, flex: 1.6, background: '#316d74', color: 'white' }}>Listo</button>
      </div>
    </div>
  );
}
