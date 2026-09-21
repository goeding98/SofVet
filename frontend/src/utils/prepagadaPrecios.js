// Precios de los planes prepagados y descuento multimascota, según
// PetsPets_Planes_Prepagado_1.xlsx (corregido sept 2026).
const PRECIOS_BASE = { urgencias: 25000, total: 70000 };

// Descuento por número de mascota afiliada del mismo titular: 0/20/30/40/50%
const DESCUENTOS = [0, 0.20, 0.30, 0.40, 0.50];

export const BOLSA_ANUAL = 4000000; // igual para ambos planes

// numeroMascota: 1 = primera mascota afiliada de ese titular, 2 = segunda, etc.
// (máximo 5 según la política — de ahí en adelante se usa el descuento tope del 50%)
export function calcularPrecioPrepagada(plan, numeroMascota) {
  const base = PRECIOS_BASE[plan] ?? PRECIOS_BASE.urgencias;
  const idx = Math.min(Math.max(numeroMascota, 1), 5) - 1;
  const descuento = DESCUENTOS[idx];
  return Math.round(base * (1 - descuento));
}

export const BENEFICIOS_TOTAL_ANUAL = {
  consultas: 12,
  vacunas: 1,
  desparasitaciones: 4,
  labs: 1,
  imagenes: 1,
};
