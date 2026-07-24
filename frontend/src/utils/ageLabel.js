const MAX_PET_AGE_YEARS = 40;   // ninguna mascota real llega a esta edad — sirve para detectar fechas corruptas (ej. año tipeado como "0026" en vez de "2026")

// Meses transcurridos entre birthDate y hoy, o null si la fecha es inválida o da una edad absurda.
function monthsSince(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate + 'T12:00');
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) -
    (now.getDate() < birth.getDate() ? 1 : 0);
  if (totalMonths < 0 || totalMonths > MAX_PET_AGE_YEARS * 12) return null;
  return totalMonths;
}

/**
 * Devuelve una etiqueta de edad legible.
 * Usa birthDate (ej. birth_date) y, si esa fecha falta o es absurda, cae a
 * secondaryBirthDate (ej. fecha_nacimiento) y luego a fallbackYears (ej. age).
 * Para < 12 meses muestra "X meses" en lugar de "0 años".
 */
export function ageLabel(birthDate, fallbackYears, secondaryBirthDate) {
  const totalMonths = monthsSince(birthDate) ?? monthsSince(secondaryBirthDate);
  if (totalMonths !== null) {
    if (totalMonths < 1)  return 'Recién nacido';
    if (totalMonths < 12) return `${totalMonths} ${totalMonths === 1 ? 'mes' : 'meses'}`;
    const years  = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
    return `${years} a. ${months} m.`;
  }
  if (fallbackYears != null && fallbackYears > 0 && fallbackYears <= MAX_PET_AGE_YEARS)
    return `${fallbackYears} ${fallbackYears === 1 ? 'año' : 'años'}`;
  return '—';
}
