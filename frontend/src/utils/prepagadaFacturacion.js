// Todos los afiliados vencen el ÚLTIMO DÍA DEL MES, sin importar qué día se
// afiliaron. Así el cobro de todo el mundo cae en los primeros 5 días del mes
// siguiente, en vez de tener a unos venciendo el 20, otros el 22 y otros el 25.
//
// Al afiliar:
//   · día 15 o antes  -> queda cubierto hasta el fin de ESE mes
//                        (se afilia el 8 de octubre -> vence el 31 de octubre,
//                         paga los primeros 5 días de noviembre)
//   · día 16 en adelante -> se le regalan los días sueltos y queda cubierto
//                        hasta el fin del mes SIGUIENTE
//                        (se afilia el 22 de octubre -> vence el 30 de noviembre,
//                         paga los primeros 5 días de diciembre)
//
// OJO: esta lógica está duplicada en supabase/functions/wompi-webhook y en
// wompi-cobrar-recurrente, porque Deno no puede importar de frontend/src.
// Si cambia acá, hay que cambiarla en los dos.

const DIA_CORTE = 15;

// Se formatea con los getters locales y no con toISOString, que convierte a UTC
// y puede devolver el día anterior.
const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Último día del mes de `fechaISO`, corrido `offsetMeses`. El día 0 de un mes
// es el último día del mes anterior, y el constructor normaliza el desborde de
// diciembre solo, así que no hay que tratar el cambio de año aparte.
export function finDeMes(fechaISO, offsetMeses = 0) {
  const [y, m] = fechaISO.split('-').map(Number);
  return fmt(new Date(y, m + offsetMeses, 0));
}

// Vencimiento de una afiliación nueva —o de una que se reactiva después de
// haber caído— pagando `meses` por adelantado.
export function vencimientoAlAfiliar(fechaAfiliacionISO, meses = 1) {
  const dia = Number(fechaAfiliacionISO.slice(8, 10));
  return finDeMes(fechaAfiliacionISO, dia <= DIA_CORTE ? meses - 1 : meses);
}

// Vencimiento después de un pago.
//
// `primerPago` importa: al afiliar se guarda un vencimiento tentativo para que
// la mascota quede cubierta de una vez, y el primer pago lo REEMPLAZA en vez de
// sumarle. Sin esto, afiliarse y pagar el primer mes daba dos meses de
// cobertura por un solo pago.
export function vencimientoTrasPago({ fechaAfiliacion, vencimientoActual, hoy, meses = 1, primerPago = false }) {
  if (primerPago) {
    const desdeAfiliacion = vencimientoAlAfiliar(fechaAfiliacion || hoy, meses);
    // Si se afilió hace semanas y apenas viene a pagar, contar desde la
    // afiliación lo dejaría vencido el mismo día del pago.
    return desdeAfiliacion >= hoy ? desdeAfiliacion : vencimientoAlAfiliar(hoy, meses);
  }
  // Si ya se venció, no se arrastra el tiempo perdido: cuenta desde hoy con la
  // misma regla del día 15.
  if (!vencimientoActual || vencimientoActual < hoy) return vencimientoAlAfiliar(hoy, meses);
  return finDeMes(vencimientoActual, meses);
}
