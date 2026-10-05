// Precios de los planes prepagados y descuento multimascota.
// OJO: son valores ANTES DE IVA. Los servicios veterinarios no están excluidos
// del impuesto (art. 476 del E.T. cubre solo la salud humana), así que al
// facturar se le suma encima. Ver prepagadaSiigo.js, que parte el plan en dos
// renglones para que el IVA recaiga solo sobre la porción de servicio.
const PRECIOS_REALES = { urgencias: 30000, total: 70000 };

// MODO DEMO. Tarifas de juguete para mostrarle el flujo completo al equipo
// (afiliar, cobrar por Wompi, facturar en Siigo) sin mover plata de verdad.
// Cada afiliado guarda su precio_mensual al crearse y Wompi y el webhook cobran
// y facturan sobre ese valor, así que esto solo afecta a los afiliados que se
// creen mientras esté encendido. Apagarlo antes de afiliar clientes reales.
export const MODO_DEMO = false;
const PRECIOS_DEMO = { urgencias: 2000, total: 5000 };

const PRECIOS_BASE = MODO_DEMO ? PRECIOS_DEMO : PRECIOS_REALES;

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

// IVA que aplica a la porción de servicio del plan. Los insumos van excluidos.
export const IVA_SERVICIO = 0.19;

// Cómo se parte un valor mensual entre el renglón de servicio (con IVA) y el de
// insumos (excluido). El servicio se redondea a centenas porque el 19% de un
// múltiplo de 100 siempre da pesos enteros: las tarjetas en Wompi rechazan
// montos con centavos ("El método de pago escogido no soporta montos con
// centavos"). Queda casi mitad y mitad; el resto va a insumos para que los dos
// renglones sumen exacto. OJO: copiado en wompi-generar-link,
// wompi-cobrar-recurrente y wompi-webhook. Si cambia acá, cambiarlo allá.
export function partirServicioInsumos(base) {
  const servicio = Math.round(base * 0.5 / 100) * 100;
  const insumos = base - servicio;
  const iva = (servicio * 19) / 100;
  return { servicio, insumos, iva, total: servicio + insumos + iva };
}

// Lo que de verdad se le cobra al tutor. El plan se factura en dos renglones y
// solo el de servicio lleva IVA, así que el total NO es precio × 1,19.
// Tiene que dar exactamente lo mismo que calcula la factura en Siigo, o el
// recaudo no cuadra contra lo facturado.
export function totalConIva(precioMensual, cobroAutomatico) {
  return partirServicioInsumos(precioConDescuento(precioMensual, cobroAutomatico)).total;
}


export const BENEFICIOS_TOTAL_ANUAL = {
  consultas: 12,
  vacunas: 1,
  desparasitaciones: 4,
  labs: 1,
  imagenes: 1,
};
