// Calendario de mora según el Protocolo Operativo de Prepagada:
// día 0 (vencimiento) -> gracia de 5 días -> día +6 suspensión automática
// -> día +30 cancelación definitiva.
const DIAS_GRACIA = 6;      // desde fecha_vencimiento hasta que se suspende
const DIAS_CANCELACION = 30; // desde fecha_vencimiento hasta que se cancela

// Devuelve el estado que DEBERÍA tener el afiliado hoy, según fecha_vencimiento.
// No toca afiliados ya cancelados a mano (estado terminal, no se recalcula).
export function calcularEstadoVencimiento(afiliado, hoyStr) {
  if (!afiliado.fecha_vencimiento || afiliado.estado === 'cancelado') return afiliado.estado;

  const hoy = new Date(hoyStr);
  const vencimiento = new Date(afiliado.fecha_vencimiento);
  const diasVencido = Math.floor((hoy - vencimiento) / (24 * 60 * 60 * 1000));

  if (diasVencido < 0) return 'activo';
  if (diasVencido < DIAS_GRACIA) return 'en_gracia';
  if (diasVencido < DIAS_CANCELACION) return 'suspendido';
  return 'cancelado';
}
