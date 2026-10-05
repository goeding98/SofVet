// Cobra automáticamente a los afiliados que tienen tarjeta registrada.
//
// Body:
//   { afiliado_id }  → cobra solo a ese afiliado (para pruebas o cobro manual)
//   { todos: true }  → cobra a todos los que ya vencieron y tienen cobro automático
//
// El resultado final (aprobado/rechazado) NO llega en esta respuesta: Wompi
// contesta PENDING y después avisa por el webhook, que es quien extiende la
// cobertura. Por eso la referencia usa el mismo formato de siempre.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WOMPI_PRIVATE_KEY = Deno.env.get('WOMPI_PRIVATE_KEY')!;
const WOMPI_INTEGRITY_SECRET = Deno.env.get('WOMPI_INTEGRITY_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const WOMPI_API = 'https://production.wompi.co/v1';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Incentivo por dejar la tarjeta registrada: estos ciclos no se cobran.
// Solo aplica al cobro automático — quien paga manualmente ya tiene el
// descuento por pago anticipado, y los dos beneficios no se acumulan.
// Descuento permanente por tener tarjeta registrada. Reemplazó a los meses de
// cortesía: el tutor ve el beneficio en cada recibo en vez de esperar al mes 4.
// Solo lo recibe quien tenga el cobro automático activo, porque la consulta de
// más abajo filtra por cobro_automatico.
const DESCUENTO_TARJETA = 0.10;


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

// Wompi exige firma de integridad también al cobrar contra una tarjeta guardada:
// sin ella responde "Firma de integridad requerida no enviada". Es el mismo
// hash que lleva el checkout: referencia + monto en centavos + moneda + secreto.
async function sha256Hex(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

function hoyBogota(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function cobrar(afiliado: any, hoy: string) {
  // Nunca cobrar dos veces el mismo día al mismo afiliado. Pero un intento que
  // FALLÓ no cuenta: si Wompi rechazó la transacción hay que poder reintentar,
  // sobre todo cuando el motivo fue un problema nuestro y ya se corrigió.
  const falloElUltimo = String(afiliado.ultimo_cobro_auto_estado || '').startsWith('ERROR')
    || ['DECLINED', 'VOIDED'].includes(String(afiliado.ultimo_cobro_auto_estado || ''));
  if (afiliado.ultimo_cobro_auto_fecha === hoy && !falloElUltimo) {
    return { afiliado_id: afiliado.id, estado: 'OMITIDO', motivo: 'Ya se cobró hoy' };
  }
  if (!afiliado.wompi_payment_source_id) {
    return { afiliado_id: afiliado.id, estado: 'OMITIDO', motivo: 'Sin tarjeta registrada' };
  }

  const { data: cliente } = await supabase
    .from('clients')
    .select('email')
    .eq('id', afiliado.client_id)
    .single();

  const reference = `pp-${afiliado.id}-1-${Date.now()}`;
  // Mismo cálculo que la factura: solo la mitad de servicio lleva IVA.
  const base = Math.round(afiliado.precio_mensual * (1 - DESCUENTO_TARJETA));
  // El servicio se redondea a centenas: el 19% de un múltiplo de 100 da pesos
  // enteros, y las tarjetas en Wompi rechazan montos con centavos. Copia de
  // partirServicioInsumos en frontend/src/utils/prepagadaPrecios.js.
  const servicio = Math.round(base * 0.5 / 100) * 100;
  const insumos = base - servicio;
  const amountInCents = (servicio + insumos + (servicio * 19) / 100) * 100;
  const currency = 'COP';

  const integrity = await sha256Hex(
    `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`
  );

  const body = {
    amount_in_cents: amountInCents,
    currency,
    customer_email: cliente?.email || 'pagos@petspets.co',
    reference,
    payment_source_id: afiliado.wompi_payment_source_id,
    recurrent: true,
    payment_method: { installments: 1 },
    signature: integrity,
  };

  const res = await fetch(`${WOMPI_API}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const out = await res.json();

  const ok = res.ok && out?.data?.id;
  const estado = ok ? (out.data.status || 'PENDIENTE') : 'ERROR';

  await supabase
    .from('prepagada_afiliados')
    .update({
      ultimo_cobro_auto_fecha: hoy,
      ultimo_cobro_auto_estado: ok ? estado : `ERROR: ${JSON.stringify(out?.error ?? out).slice(0, 300)}`,
      wompi_referencia: ok ? reference : afiliado.wompi_referencia,
    })
    .eq('id', afiliado.id);

  if (!ok) console.error(`[cobrar] afiliado ${afiliado.id}:`, JSON.stringify(out));

  return {
    afiliado_id: afiliado.id,
    estado,
    transaccion: out?.data?.id ?? null,
    monto: afiliado.precio_mensual,
    error: ok ? null : (out?.error ?? out),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    const { afiliado_id, todos } = await req.json().catch(() => ({}));
    const hoy = hoyBogota();

    if (afiliado_id) {
      const { data: afiliado } = await supabase
        .from('prepagada_afiliados')
        .select('*')
        .eq('id', afiliado_id)
        .single();
      if (!afiliado) return json({ error: 'Afiliado no encontrado' }, 404);
      return json({ hoy, resultados: [await cobrar(afiliado, hoy)] });
    }

    if (!todos) return json({ error: 'Envía afiliado_id o todos: true' }, 400);

    // Todos los que ya vencieron, tienen tarjeta y no están cancelados.
    // 'pendiente_pago' queda fuera: todavía no ha entrado el primer pago, y ese
    // va por link, no por cobro automático.
    const { data: pendientes } = await supabase
      .from('prepagada_afiliados')
      .select('*')
      .eq('cobro_automatico', true)
      .neq('estado', 'cancelado')
      .neq('estado', 'pendiente_pago')
      .not('wompi_payment_source_id', 'is', null)
      .lte('fecha_vencimiento', hoy);

    const resultados = [];
    for (const a of pendientes || []) resultados.push(await cobrar(a, hoy));

    console.log(`[cobrar] ${resultados.length} afiliados procesados el ${hoy}`);
    return json({ hoy, procesados: resultados.length, resultados });
  } catch (e) {
    console.error('[cobrar]', e);
    return json({ error: String(e) }, 500);
  }
});
