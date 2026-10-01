// Recibe los eventos de Wompi (transaction.updated) y actualiza prepagada_afiliados
// cuando un pago queda APPROVED. Reemplaza al "Marcar pagado" manual para ese afiliado.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WOMPI_EVENTS_SECRET = Deno.env.get('WOMPI_EVENTS_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getByPath(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function nowBogotaDateStr(): string {
  // Colombia no tiene horario de verano, UTC-5 fijo.
  const utc = Date.now();
  const bogota = new Date(utc - 5 * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}

// ── Vencimientos ──────────────────────────────────────────────────────────
// Todos los afiliados vencen el ÚLTIMO DÍA DEL MES, para que el cobro de todos
// caiga en los primeros 5 días del mes siguiente. Al afiliar: si fue el día 15
// o antes queda cubierto hasta el fin de ese mes; del 16 en adelante se le
// regalan los días sueltos y queda hasta el fin del mes siguiente.
//
// OJO: es una copia de frontend/src/utils/prepagadaFacturacion.js. Si cambia
// allá, hay que cambiarla acá.
const DIA_CORTE = 15;

function fmtFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function finDeMes(fechaISO: string, offsetMeses = 0): string {
  const [y, m] = fechaISO.split('-').map(Number);
  return fmtFecha(new Date(y, m + offsetMeses, 0));
}

function vencimientoAlAfiliar(fechaAfiliacionISO: string, meses = 1): string {
  const dia = Number(fechaAfiliacionISO.slice(8, 10));
  return finDeMes(fechaAfiliacionISO, dia <= DIA_CORTE ? meses - 1 : meses);
}

// El primer pago REEMPLAZA el vencimiento tentativo que se puso al afiliar, no
// le suma: si no, afiliarse y pagar el primer mes daba dos meses de cobertura.
function vencimientoTrasPago(o: {
  fechaAfiliacion?: string | null; vencimientoActual?: string | null;
  hoy: string; meses?: number; primerPago?: boolean;
}): string {
  const meses = o.meses ?? 1;
  if (o.primerPago) {
    const desdeAfiliacion = vencimientoAlAfiliar(o.fechaAfiliacion || o.hoy, meses);
    // Si se afilió hace semanas y apenas viene a pagar, contar desde la
    // afiliación lo dejaría vencido el mismo día del pago.
    return desdeAfiliacion >= o.hoy ? desdeAfiliacion : vencimientoAlAfiliar(o.hoy, meses);
  }
  if (!o.vencimientoActual || o.vencimientoActual < o.hoy) return vencimientoAlAfiliar(o.hoy, meses);
  return finDeMes(o.vencimientoActual, meses);
}



// ── Facturación en Siigo ────────────────────────────────────────────────────
// El pago dispara la factura: así el tutor la recibe en minutos y nadie tiene
// que acordarse de emitirla. Si falla, el plan se activa igual y el afiliado
// queda con pago más reciente que su última factura, que es como se detecta
// después lo que quedó pendiente.
//
// OJO: estas credenciales son distintas de las de Netlify. El webhook no pasa
// por el proxy /api/siigo a propósito: es una función pública sin autenticación.
const SIIGO_API = 'https://api.siigo.com';
const SIIGO_USER = Deno.env.get('SIIGO_USER') ?? '';
const SIIGO_ACCESS_KEY = Deno.env.get('SIIGO_ACCESS_KEY') ?? '';

const DOC_FACTURA_ELECTRONICA = 26273;
const VENDEDOR = 953;          // Jenni Soralla Cuero Granja
const PAGO_WOMPI = 11061;
const CENTRO_COSTO: Record<number, number> = { 1: 917, 2: 865, 3: 863, 4: 863 };
const CENTRO_POR_DEFECTO = 863;

// El plan se parte en dos renglones: el servicio lleva IVA, los insumos no.
const ITEMS_POR_PLAN: Record<string, { servicio: string; insumos: string; descS: string; descI: string }> = {
  urgencias: { servicio: '99991', insumos: '99992',
    descS: 'Plan Mensual Prepagada Emergencias', descI: 'Insumos Prepagados Plan Mensual Emergencias' },
  total: { servicio: '99994', insumos: '99995',
    descS: 'Plan Mensual Prepagada Total', descI: 'Insumos Prepagados Plan Total' },
};

async function siigoToken(): Promise<string> {
  const r = await fetch(`${SIIGO_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: SIIGO_USER, access_key: SIIGO_ACCESS_KEY }),
  });
  const d = await r.json();
  if (!d?.access_token) throw new Error('No se pudo autenticar contra Siigo');
  return d.access_token;
}

async function siigoFetch(token: string, method: string, path: string, body?: unknown) {
  const r = await fetch(SIIGO_API + path, {
    method,
    headers: { Authorization: token, 'Partner-Id': 'SofVet', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Siigo ${path}: ${JSON.stringify(d?.Errors ?? d).slice(0, 300)}`);
  return d;
}

// Busca el tercero por cédula y lo crea si no existe.
async function resolverTercero(token: string, cliente: any) {
  const cedula = String(cliente?.cedula || cliente?.document || '').replace(/\D/g, '');
  if (!cedula) throw new Error('El tutor no tiene cédula registrada');

  const hallado = await siigoFetch(token, 'GET', `/v1/customers?identification=${cedula}`);
  if ((hallado.results || []).length > 0) {
    return { id: hallado.results[0].id, identification: cedula, branch_office: 0 };
  }

  const partes = String(cliente?.name || 'Cliente SofVet').trim().split(/\s+/);
  const nombre = partes[0];
  const apellido = partes.length > 1 ? partes.slice(1).join(' ') : partes[0];
  const creado = await siigoFetch(token, 'POST', '/v1/customers', {
    type: 'Customer', person_type: 'Person', id_type: { code: '13' },
    identification: cedula, name: [nombre, apellido],
    fiscal_responsibilities: [{ code: 'R-99-PN' }],
    contacts: [{
      first_name: nombre, last_name: apellido,
      email: cliente?.email || '',
      phone: { number: String(cliente?.phone || '').replace(/\D/g, '').slice(0, 10) || '0000000000' },
    }],
  });
  return { id: creado.id, identification: cedula, branch_office: 0 };
}

// Emite la factura del mes y devuelve lo que hay que guardar en el afiliado.
async function facturarMes(supabaseCli: any, afiliado: any, valorMes: number, hoy: string) {
  if (!SIIGO_USER || !SIIGO_ACCESS_KEY) {
    console.warn('[wompi-webhook] sin credenciales de Siigo, no se factura');
    return null;
  }

  const items = ITEMS_POR_PLAN[afiliado.plan];
  if (!items) throw new Error(`Plan desconocido: ${afiliado.plan}`);

  const { data: cliente } = await supabaseCli
    .from('clients').select('id,name,cedula,document,email,phone')
    .eq('id', afiliado.client_id).single();
  const { data: mascota } = await supabaseCli
    .from('patients').select('name').eq('id', afiliado.patient_id).single();

  const servicio = Math.round(valorMes * 0.5);
  const insumos = valorMes - servicio;   // el resto, para que sumen exacto
  const total = Math.round((servicio * 1.19 + insumos) * 100) / 100;

  const token = await siigoToken();
  const customer = await resolverTercero(token, cliente);

  const creada = await siigoFetch(token, 'POST', '/v1/invoices', {
    document: { id: DOC_FACTURA_ELECTRONICA },
    date: hoy,
    customer,
    cost_center: CENTRO_COSTO[afiliado.sede_id] ?? CENTRO_POR_DEFECTO,
    seller: VENDEDOR,
    stamp: { send: true },
    mail: { send: true },
    observations: `Prepagada ${afiliado.plan === 'total' ? 'Plan Total' : 'Plan Urgencias'}`
      + ` · ${mascota?.name || 'mascota'} · afiliado ${afiliado.id} · pago automático`,
    items: [
      { code: items.servicio, description: items.descS, quantity: 1, price: servicio, discount: 0,
        taxes: [{ id: 9124 }] },   // IVA 19%
      { code: items.insumos, description: items.descI, quantity: 1, price: insumos, discount: 0,
        taxes: [{ id: 14095 }] },  // excluido
    ],
    payments: [{ id: PAGO_WOMPI, value: total, due_date: hoy }],
  });

  return {
    ultima_factura_numero: [creada.prefix, creada.number].filter(Boolean).join('-'),
    ultima_factura_fecha: hoy,
    ultima_factura_url: creada.public_url ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  // ── Verificar la firma del evento ──────────────────────────────────────
  const { properties, checksum } = payload?.signature ?? {};
  const timestamp = payload?.timestamp;
  if (!Array.isArray(properties) || !checksum || !timestamp) {
    return new Response('Firma ausente', { status: 400 });
  }

  const concatenated =
    properties.map((p: string) => String(getByPath(payload.data, p))).join('') +
    String(timestamp) +
    WOMPI_EVENTS_SECRET;
  const expectedChecksum = (await sha256Hex(concatenated)).toUpperCase();

  if (expectedChecksum !== String(checksum).toUpperCase()) {
    console.error('[wompi-webhook] checksum invalido');
    return new Response('Firma invalida', { status: 401 });
  }

  // ── Procesar la transacción ─────────────────────────────────────────────
  const tx = payload?.data?.transaction;
  if (!tx) return new Response('OK', { status: 200 }); // evento que no nos interesa

  if (tx.status === 'APPROVED') {
    // Formato de referencia: pp-{afiliadoId}-{meses}-{timestamp}
    const match = String(tx.reference || '').match(/^pp-(\d+)-(\d+)-/);
    if (match) {
      const afiliadoId = Number(match[1]);
      const meses = Number(match[2]) || 1;
      const { data: afiliado } = await supabase
        .from('prepagada_afiliados')
        .select('id, plan, sede_id, client_id, patient_id, precio_mensual, cobro_automatico, fecha_afiliacion, fecha_vencimiento, ultimo_pago_id, ultimo_pago_fecha, ciclos_prepagada')
        .eq('id', afiliadoId)
        .single();

      if (afiliado && afiliado.ultimo_pago_id !== tx.id) {
        const hoy = nowBogotaDateStr();
        const nuevaFecha = vencimientoTrasPago({
          fechaAfiliacion: afiliado.fecha_afiliacion,
          vencimientoActual: afiliado.fecha_vencimiento,
          hoy,
          meses,
          primerPago: !afiliado.ultimo_pago_fecha,
        });

        await supabase
          .from('prepagada_afiliados')
          .update({
            fecha_vencimiento: nuevaFecha,
            estado: 'activo',
            ultimo_pago_id: tx.id,
            ultimo_pago_metodo: tx.payment_method_type ?? null,
            ultimo_pago_fecha: hoy,
            // Cada mes pagado cuenta como un ciclo, para saber cuándo toca el
            // mes de cortesía del pago automático.
            ciclos_prepagada: (afiliado.ciclos_prepagada || 0) + meses,
          })
          .eq('id', afiliadoId);

        console.log(`[wompi-webhook] afiliado ${afiliadoId} pagado, tx ${tx.id}`);

        // La factura va DESPUÉS de activar: si Siigo falla, el plan igual queda
        // al día y el afiliado se queda con pago más reciente que su factura,
        // que es como se detecta lo pendiente.
        try {
          const valorMes = Math.round(
            afiliado.precio_mensual * (afiliado.cobro_automatico ? 0.9 : 1)
          );
          const datosFactura = await facturarMes(supabase, afiliado, valorMes, hoy);
          if (datosFactura) {
            await supabase.from('prepagada_afiliados').update(datosFactura).eq('id', afiliadoId);
            console.log(`[wompi-webhook] afiliado ${afiliadoId} facturado: ${datosFactura.ultima_factura_numero}`);
          }
        } catch (e) {
          // No se relanza: el pago ya quedó aplicado y eso es lo que no se puede perder.
          console.error(`[wompi-webhook] afiliado ${afiliadoId} NO se pudo facturar:`, String(e));
        }
      }
    } else {
      console.warn('[wompi-webhook] referencia sin match:', tx.reference);
    }
  } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(tx.status)) {
    // Un cobro automático que falla tiene que quedar visible para el equipo,
    // si no el afiliado se cae sin que nadie se entere.
    const match = String(tx.reference || '').match(/^pp-(\d+)-(\d+)-/);
    if (match) {
      const afiliadoId = Number(match[1]);
      const motivo = tx.status_message || tx.status;
      await supabase
        .from('prepagada_afiliados')
        .update({
          ultimo_cobro_auto_estado: `${tx.status}: ${String(motivo).slice(0, 200)}`,
          ultimo_cobro_auto_fecha: nowBogotaDateStr(),
        })
        .eq('id', afiliadoId);
      console.warn(`[wompi-webhook] afiliado ${afiliadoId} cobro ${tx.status}: ${motivo}`);
    }
  }

  return new Response('OK', { status: 200 });
});
