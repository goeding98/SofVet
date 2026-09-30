// Precios de los planes prepagados y descuento multimascota.
// OJO: son valores ANTES DE IVA. Los servicios veterinarios no están excluidos
// del impuesto (art. 476 del E.T. cubre solo la salud humana), así que al
// facturar se le suma encima. Ver prepagadaSiigo.js, que parte el plan en dos
// renglones para que el IVA recaiga solo sobre la porción de servicio.
const PRECIOS_BASE = { urgencias: 30000, total: 70000 };

// Descuento por número de mascota afiliada del mismo titular: la 2ª tiene 5% y
// de la 3ª en adelante 10%, sin seguir subiendo.
const DESCUENTOS = [0, 0.05, 0.10, 0.10, 0.10];

export const BOLSA_ANUAL = 4000000; // igual para ambos planes

// Tarifa de lista del plan, sin ningún descuento. Sirve para saber cuánto
// descuento acumulado lleva un afiliado respecto al precio publicado.
export const precioLista = (plan) => PRECIOS_BASE[plan] ?? PRECIOS_BASE.urgencias;

// numeroMascota: 1 = primera mascota afiliada de ese titular, 2 = segunda, etc.
// (máximo 5 según la política — de ahí en adelante se usa el descuento tope del 10%)
export function calcularPrecioPrepagada(plan, numeroMascota) {
  const base = PRECIOS_BASE[plan] ?? PRECIOS_BASE.urgencias;
  const idx = Math.min(Math.max(numeroMascota, 1), 5) - 1;
  const descuento = DESCUENTOS[idx];
  return Math.round(base * (1 - descuento));
}

// Descuento permanente por tener tarjeta registrada con cobro automático. Se
// aplica sobre CADA mes, no una sola vez, y reemplazó a los meses de cortesía:
// el tutor ve el beneficio en su primer recibo en vez de esperar al mes 4.
// Ya no hay descuento por pagar varios meses por adelantado: el pago manual es
// mensual y sin descuento. Debe coincidir con las Edge Functions de Wompi.
export const DESCUENTO_TARJETA = 0.10;

// Lo que realmente se cobra un mes dado. precio_mensual se guarda siempre como
// tarifa plena, así que apagar el cobro automático devuelve el precio completo
// sin tener que reescribir el registro del afiliado.
export function precioConDescuento(precioMensual, cobroAutomatico) {
  const base = Number(precioMensual) || 0;
  return cobroAutomatico ? Math.round(base * (1 - DESCUENTO_TARJETA)) : base;
}

export const BENEFICIOS_TOTAL_ANUAL = {
  consultas: 12,
  vacunas: 1,
  desparasitaciones: 4,
  labs: 1,
  imagenes: 1,
};
