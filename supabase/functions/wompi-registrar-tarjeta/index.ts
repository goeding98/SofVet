// Guarda la tarjeta de un afiliado como "fuente de pago" en Wompi, para
// poder cobrarle automáticamente cada mes.
//
// El número de la tarjeta NUNCA llega acá: el navegador del tutor lo tokeniza
// directo contra Wompi con la llave pública, y acá solo recibimos ese token.
//
// Body: { afiliado_id, token, customer_email, tarjeta_marca?, tarjeta_ultimos4? }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WOMPI_PUBLIC_KEY = Deno.env.get('WOMPI_PUBLIC_KEY')!;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    const { afiliado_id, token, customer_email, tarjeta_marca, tarjeta_ultimos4 } = await req.json();
    if (!afiliado_id || !token) return json({ error: 'afiliado_id y token son requeridos' }, 400);

    const { data: afiliado, error: errAfi } = await supabase
      .from('prepagada_afiliados')
      .select('id')
      .eq('id', afiliado_id)
      .single();
    if (errAfi || !afiliado) return json({ error: 'Afiliado no encontrado' }, 404);

    // Los tokens de aceptación (términos y tratamiento de datos) los firma Wompi
    // y cambian con el tiempo, por eso se piden en el momento.
    const merchantRes = await fetch(`${WOMPI_API}/merchants/${WOMPI_PUBLIC_KEY}`);
    const merchant = await merchantRes.json();
    const acceptanceToken = merchant?.data?.presigned_acceptance?.acceptance_token;
    const personalAuthToken = merchant?.data?.presigned_personal_data_auth?.acceptance_token;
    if (!acceptanceToken) return json({ error: 'No se pudieron obtener los términos de Wompi' }, 502);

    const psRes = await fetch(`${WOMPI_API}/payment_sources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'CARD',
        token,
        customer_email,
        acceptance_token: acceptanceToken,
        accept_personal_auth: personalAuthToken,
      }),
    });
    const ps = await psRes.json();

    if (!psRes.ok || !ps?.data?.id) {
      console.error('[registrar-tarjeta] Wompi rechazó la fuente de pago:', JSON.stringify(ps));
      return json({ error: 'Wompi no aceptó la tarjeta', detalle: ps?.error ?? ps }, 400);
    }

    await supabase
      .from('prepagada_afiliados')
      .update({
        wompi_payment_source_id: ps.data.id,
        tarjeta_marca: tarjeta_marca ?? null,
        tarjeta_ultimos4: tarjeta_ultimos4 ?? null,
        cobro_automatico: true,
        ultimo_cobro_auto_estado: null,
      })
      .eq('id', afiliado_id);

    return json({
      ok: true,
      payment_source_id: ps.data.id,
      tarjeta_marca: tarjeta_marca ?? null,
      tarjeta_ultimos4: tarjeta_ultimos4 ?? null,
    });
  } catch (e) {
    console.error('[registrar-tarjeta]', e);
    return json({ error: String(e) }, 500);
  }
});
