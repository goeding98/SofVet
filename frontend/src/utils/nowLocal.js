// Always returns Colombia time (UTC-5), regardless of the server/browser system clock
export const nowDate  = () => new Date().toLocaleDateString('en-CA',  { timeZone: 'America/Bogota' });            // → 'YYYY-MM-DD'
export const nowTime  = () => new Date().toLocaleTimeString('es-CO',  { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }); // → 'HH:MM'
export const nowMonth = () => nowDate().slice(0, 7);                                                               // → 'YYYY-MM'
export const localDateStr = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });                 // Date obj → 'YYYY-MM-DD'
