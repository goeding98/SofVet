/**
 * Devuelve una etiqueta de edad legible.
 * Usa birth_date o fecha_nacimiento si están disponibles (mejor precisión).
 * Para < 12 meses muestra "X meses" en lugar de "0 años".
 */
export function ageLabel(birthDate, fallbackYears) {
  if (birthDate) {
    const birth = new Date(birthDate + 'T12:00');
    if (isNaN(birth.getTime())) return fallbackYears != null ? `${fallbackYears} años` : '—';
    const now = new Date();
    const totalMonths =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth()) -
      (now.getDate() < birth.getDate() ? 1 : 0);
    if (totalMonths < 1)  return 'Recién nacido';
    if (totalMonths < 12) return `${totalMonths} ${totalMonths === 1 ? 'mes' : 'meses'}`;
    const years  = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
    return `${years} a. ${months} m.`;
  }
  if (fallbackYears != null && fallbackYears > 0)
    return `${fallbackYears} ${fallbackYears === 1 ? 'año' : 'años'}`;
  return '—';
}
