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
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const WOMPI_API = 'https://production.wompi.co/v1';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  // Nunca cobrar dos veces el mismo día al mismo afiliado.
  if (afiliado.ultimo_cobro_auto_fecha === hoy) {
    return { afiliado_id: afiliado.id, estado: 'OMITIDO', motivo: 'Ya se intentó un cobro hoy' };
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
  const body = {
    amount_in_cents: Math.round(afiliado.precio_mensual * 100),
    currency: 'COP',
    customer_email: cliente?.email || 'pagos@petspets.co',
    reference,
    payment_source_id: afiliado.wompi_payment_source_id,
    recurrent: true,
    payment_method: { installments: 1 },
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
    const { data: pendientes } = await supabase
      .from('prepagada_afiliados')
      .select('*')
      .eq('cobro_automatico', true)
      .neq('estado', 'cancelado')
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
