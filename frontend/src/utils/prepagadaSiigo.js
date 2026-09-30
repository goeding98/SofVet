// Facturación de la prepagada contra Siigo.
//
// El plan se factura en DOS renglones, no en uno. El servicio veterinario lleva
// IVA 19%, pero los insumos que el afiliado está prepagando (buretrol, vacunas,
// anestesia) no. Cobrar 19% sobre el total gravaría también la parte que no
// corresponde, así que se parte 50/50 y solo el renglón de servicio tributa.
//
// Ejemplo con el Plan Urgencias de $30.000:
//   Plan Mensual Prepagada Emergencias   $15.000  + IVA $2.850
//   Insumos Prepagados Plan Emergencias  $15.000  sin IVA
//   El afiliado paga $32.850, no $35.700.
//
// Los códigos y los impuestos los configuró contabilidad en Siigo; acá solo se
// referencian. Si cambian allá, hay que cambiarlos acá.
import { siigo } from './siigo';
import { precioLista, DESCUENTO_TARJETA } from './prepagadaPrecios';

const PROPORCION_SERVICIO = 0.5;

// MODO PRUEBA. Mientras contabilidad no cargue los precios definitivos, los
// renglones se facturan con el precio que tenga el producto en Siigo ($1, $2...)
// en vez del valor real del plan. Sirve para emitir facturas de prueba sin
// mover plata. Poner en false cuando los precios reales estén en Siigo.
const PRECIOS_DE_PRUEBA = true;

// Trae la ficha del producto en Siigo: precio e impuesto. El impuesto hay que
// mandarlo explícito en cada renglón de la factura; si no se manda, Siigo NO lo
// aplica y la factura sale sin IVA aunque el producto sí lo tenga configurado.
async function fichaEnSiigo(code) {
  const cat = await siigo.getAllProducts();
  const prod = (cat.results || []).find((x) => String(x.code) === String(code));
  if (!prod) throw new Error(`El producto ${code} no existe en Siigo.`);
  return {
    precio: Math.round(Number(prod.price) || 0),
    taxId: prod.tax_id ?? null,
    taxPct: Number(prod.tax_pct) || 0,
  };
}

const ITEMS_POR_PLAN = {
  urgencias: {
    servicio: { code: '99991', desc: 'Plan Mensual Prepagada Emergencias' },
    insumos:  { code: '99992', desc: 'Insumos Prepagados Plan Mensual Emergencias' },
  },
  total: {
    servicio: { code: '99994', desc: 'Plan Mensual Prepagada Total' },
    insumos:  { code: '99995', desc: 'Insumos Prepagados Plan Total' },
  },
};

const DOC_FACTURA_ELECTRONICA = 26273;
const VENDEDOR   = 953;   // Jenni Soralla Cuero Granja
const PAGO_WOMPI = 11061;

// El centro de costo sale de la sede del usuario de SofVet que factura. Quien no
// tenga sede —los administradores— entra por Ciudad Jardín.
const CENTRO_COSTO = { 1: 917, 2: 865, 3: 863, 4: 863 };
const CENTRO_COSTO_POR_DEFECTO = 863;

export const centroCostoDe = (sedeId) => CENTRO_COSTO[sedeId] || CENTRO_COSTO_POR_DEFECTO;

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Cómo queda partido un valor mensual. Se expone aparte para poder mostrarle al
// cajero lo que va a facturar antes de que le dé al botón.
export function desglosarFactura(valorMensual, plan) {
  const items = ITEMS_POR_PLAN[plan];
  if (!items) throw new Error(`Plan desconocido: ${plan}`);

  const total = Math.round(Number(valorMensual) || 0);
  const servicio = Math.round(total * PROPORCION_SERVICIO);
  // El resto va a insumos para que las dos líneas sumen exactamente el total,
  // incluso cuando el valor es impar y la mitad no es redonda.
  const insumos = total - servicio;
  const iva = Math.round(servicio * 0.19);

  return { total, servicio, insumos, iva, totalConIva: total + iva, items, modoPrueba: PRECIOS_DE_PRUEBA };
}

// Busca al tutor en Siigo por cédula y lo crea si no existe.
async function resolverCliente(cliente) {
  const cedula = String(cliente?.cedula || cliente?.document || '').replace(/\D/g, '').trim();
  if (!cedula) {
    throw new Error(
      `El tutor ${cliente?.name || '(sin nombre)'} no tiene cédula registrada en SofVet. `
      + 'Edítalo en Clientes y vuelve a intentar.'
    );
  }

  const encontrado = await siigo.searchCustomer(cedula);
  if ((encontrado.results || []).length > 0) {
    return { id: encontrado.results[0].id, identification: cedula, branch_office: 0 };
  }

  const partes = (cliente?.name || 'Cliente SofVet').trim().split(/\s+/);
  const nombre = partes[0];
  const apellido = partes.length > 1 ? partes.slice(1).join(' ') : partes[0];
  const creado = await siigo.createCustomer({
    type: 'Customer',
    person_type: 'Person',
    id_type: { code: '13' },
    identification: cedula,
    name: [nombre, apellido],
    fiscal_responsibilities: [{ code: 'R-99-PN' }],
    contacts: [{
      first_name: nombre,
      last_name: apellido,
      email: cliente?.email || '',
      phone: { number: String(cliente?.phone || '').replace(/\D/g, '').slice(0, 10) || '0000000000' },
    }],
  });
  return { id: creado.id, identification: cedula, branch_office: 0 };
}

// Texto de las observaciones: además del plan y la mascota, explica de dónde
// sale el descuento, para que el tutor entienda por qué paga menos que la tarifa.
function descripcionDescuentos(afiliado, mascota, valorMensual) {
  const nombrePlan = afiliado.plan === 'total' ? 'Plan Total' : 'Plan Urgencias';
  const partes = [`Prepagada ${nombrePlan}`, mascota?.name || 'mascota'];

  const lista = precioLista(afiliado.plan);
  const dtoMulti = lista > 0 ? Math.round((1 - afiliado.precio_mensual / lista) * 100) : 0;
  if (dtoMulti > 0) partes.push(`descuento multimascota ${dtoMulti}%`);
  if (afiliado.cobro_automatico) partes.push(`pago automático ${Math.round(DESCUENTO_TARJETA * 100)}%`);

  return partes.join(' · ') + ` · afiliado ${afiliado.id}`;
}

// Emite la factura electrónica del mes de un afiliado y devuelve su número.
export async function facturarMesPrepagada({ afiliado, cliente, mascota, sedeUsuario, valorMensual }) {
  const calculado = desglosarFactura(valorMensual, afiliado.plan);
  const items = calculado.items;

  const fServicio = await fichaEnSiigo(items.servicio.code);
  const fInsumos  = await fichaEnSiigo(items.insumos.code);

  // Cuánto descuento acumulado lleva este afiliado contra la tarifa publicada:
  // el de multimascota ya viene dentro de precio_mensual, y el de la tarjeta se
  // aplica encima al cobrar.
  const lista = precioLista(afiliado.plan);
  const factor = lista > 0 ? Math.min(1, valorMensual / lista) : 1;

  // En modo prueba manda el precio del catálogo de Siigo, pero escalado con el
  // mismo descuento: así se puede comprobar que el descuento llega a la factura
  // sin tener que facturar el valor real del plan.
  const c2 = (n) => Math.round(n * 100) / 100;
  const servicio = PRECIOS_DE_PRUEBA ? c2(fServicio.precio * factor) : calculado.servicio;
  const insumos  = PRECIOS_DE_PRUEBA ? c2(fInsumos.precio * factor)  : calculado.insumos;

  // El total lo tiene que calcular igual que Siigo o rechaza la factura con
  // "The total payments must be equal to the total invoice".
  const total = c2(servicio * (1 + fServicio.taxPct / 100) + insumos * (1 + fInsumos.taxPct / 100));

  const customer = await resolverCliente(cliente);

  const factura = {
    document: { id: DOC_FACTURA_ELECTRONICA },
    date: hoyISO(),
    customer,
    cost_center: centroCostoDe(sedeUsuario),
    seller: VENDEDOR,
    stamp: { send: true },   // se envía a la DIAN al crearla
    // Siigo le manda la factura al correo que tenga el cliente en su ficha. Sin
    // esto queda en 'not_sent' y el tutor nunca la recibe.
    mail: { send: true },
    observations: descripcionDescuentos(afiliado, mascota, valorMensual),
    items: [
      // El precio va SIN impuesto: Siigo lo suma encima según el tax que se le mande.
      { code: items.servicio.code, description: items.servicio.desc, quantity: 1, price: servicio, discount: 0,
        taxes: fServicio.taxId ? [{ id: fServicio.taxId }] : [] },
      { code: items.insumos.code,  description: items.insumos.desc,  quantity: 1, price: insumos,  discount: 0,
        taxes: fInsumos.taxId ? [{ id: fInsumos.taxId }] : [] },
    ],
    payments: [{ id: PAGO_WOMPI, value: total, due_date: hoyISO() }],
  };

  const creada = await siigo.createInvoice(factura);
  return {
    numero: creada.number,
    prefijo: creada.prefix,
    id: creada.id,
    completo: [creada.prefix, creada.number].filter(Boolean).join('-'),
    // Siigo devuelve un enlace público al documento; sirve para abrirlo o
    // reenviárselo al tutor sin tener que entrar a Siigo.
    url: creada.public_url || null,
  };
}

// ── Factura de un consumo del plan ──────────────────────────────────────────
// Cuando el afiliado usa el plan —una urgencia o un servicio programado— el
// tutor paga solo su parte. La factura sale con el valor completo y el
// descuento que le cubrió el plan, para que vea el beneficio y no solo lo que
// pagó. Siigo aplica el descuento como PORCENTAJE (discount_type = Percentage
// en el tipo de documento), que es justo como está definido el producto.
//
// items: [{ code, nombre, valor, pct, taxId }]
//   valor = tarifa plena del concepto (editable por caja)
//   pct   = lo que cubre P&P; lo que paga el tutor es el resto
export async function facturarConsumoPrepagada({ afiliado, cliente, mascota, sedeUsuario, items, notas }) {
  const lineas = (items || []).filter((i) => i.code && Number(i.valor) > 0);
  if (lineas.length === 0) throw new Error('No hay conceptos con valor para facturar.');

  const customer = await resolverCliente(cliente);
  const c2 = (n) => Math.round(n * 100) / 100;

  // Siigo calcula: precio × (1 − descuento%) y sobre eso aplica el impuesto.
  // El total tiene que coincidir con el pago o rechaza la factura.
  const total = c2(lineas.reduce((suma, l) => {
    const neto = Number(l.valor) * (1 - (Number(l.pct) || 0) / 100);
    return suma + neto * (1 + (Number(l.taxPct) || 0) / 100);
  }, 0));

  const factura = {
    document: { id: DOC_FACTURA_ELECTRONICA },
    date: hoyISO(),
    customer,
    cost_center: centroCostoDe(sedeUsuario),
    seller: VENDEDOR,
    stamp: { send: true },
    mail: { send: true },
    observations: [
      `Uso del plan prepagado · ${mascota?.name || 'mascota'} · afiliado ${afiliado.id}`,
      notas ? notas.trim() : null,
    ].filter(Boolean).join(' · '),
    items: lineas.map((l) => ({
      code: l.code,
      description: l.nombre,
      quantity: 1,
      price: Number(l.valor),
      discount: Number(l.pct) || 0,   // porcentaje que cubre el plan
      taxes: l.taxId ? [{ id: l.taxId }] : [],
    })),
    payments: [{ id: PAGO_WOMPI, value: total, due_date: hoyISO() }],
  };

  const creada = await siigo.createInvoice(factura);
  return {
    numero: creada.number,
    prefijo: creada.prefix,
    completo: [creada.prefix, creada.number].filter(Boolean).join('-'),
    url: creada.public_url || null,
    total,
  };
}
