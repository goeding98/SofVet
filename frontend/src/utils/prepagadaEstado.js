// Calendario de mora según el Protocolo Operativo de Prepagada:
// día 0 (vencimiento) -> gracia de 5 días -> día +6 suspensión automática
// -> día +30 cancelación definitiva.
const DIAS_GRACIA = 6;      // desde fecha_vencimiento hasta que se suspende
const DIAS_CANCELACION = 30; // desde fecha_vencimiento hasta que se cancela

// Devuelve el estado que DEBERÍA tener el afiliado hoy, según fecha_vencimiento.
// No toca afiliados ya cancelados a mano (estado terminal, no se recalcula).
export function calcularEstadoVencimiento(afiliado, hoyStr) {
  // 'pendiente_pago' y 'cancelado' no dependen del calendario: el primero espera
  // el primer pago y el segundo es terminal.
  if (!afiliado.fecha_vencimiento) return afiliado.estado;
  if (afiliado.estado === 'cancelado' || afiliado.estado === 'pendiente_pago') return afiliado.estado;

  const hoy = new Date(hoyStr);
  const vencimiento = new Date(afiliado.fecha_vencimiento);
  const diasVencido = Math.floor((hoy - vencimiento) / (24 * 60 * 60 * 1000));

  if (diasVencido < 0) return 'activo';
  if (diasVencido < DIAS_GRACIA) return 'en_gracia';
  if (diasVencido < DIAS_CANCELACION) return 'suspendido';
  return 'cancelado';
}

// ── Vigencia, carencia y cobertura ──────────────────────────────────────────
// Fechas como 'YYYY-MM-DD'. Se comparan como texto para no pelear con zonas
// horarias.

const sumarDias = (iso, dias) => {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
};

// La bolsa y los beneficios son por AÑO DE VIGENCIA, que arranca en la fecha de
// afiliación (términos, secciones 2 y 6.6), no el 1 de enero. Devuelve el año
// en que empezó la vigencia que corre hoy: afiliado el 2026-11-15, el
// 2027-01-10 todavía está en la vigencia "2026"; desde el 2027-11-15, en la
// "2027". Es lo que se guarda en bolsa_anio y en prepagada_beneficios.anio.
export function anioVigencia(fechaAfiliacion, hoyISO) {
  if (!fechaAfiliacion) return Number(hoyISO.slice(0, 4));
  if (fechaAfiliacion > hoyISO) return Number(fechaAfiliacion.slice(0, 4));
  const anioHoy = Number(hoyISO.slice(0, 4));
  return hoyISO.slice(5) >= fechaAfiliacion.slice(5) ? anioHoy : anioHoy - 1;
}

// Fecha en que empezó la vigencia que corre hoy (para mostrarla).
export function inicioVigencia(fechaAfiliacion, hoyISO) {
  if (!fechaAfiliacion) return null;
  return `${anioVigencia(fechaAfiliacion, hoyISO)}-${fechaAfiliacion.slice(5)}`;
}

// Urgencias cubren desde el día 1; todo lo demás (preventivo del Plan Total y
// programados con descuento) desde el día 31, o sea afiliación + 30 días.
export function finCarencia(fechaAfiliacion) {
  return fechaAfiliacion ? sumarDias(fechaAfiliacion, 30) : null;
}
export function carenciaCumplida(fechaAfiliacion, hoyISO) {
  const fin = finCarencia(fechaAfiliacion);
  return !!fin && hoyISO >= fin;
}

// Solo "Activo" y "En gracia" tienen cobertura (términos, sección 12).
export const ESTADOS_CON_COBERTURA = ['activo', 'en_gracia'];
export const tieneCobertura = (estado) => ESTADOS_CON_COBERTURA.includes(estado);
