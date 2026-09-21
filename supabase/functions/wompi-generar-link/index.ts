// Genera un link de pago (Web Checkout) de Wompi para un afiliado de Prepagada.
// Body esperado: { afiliado_id: number, meses?: 1|3|6, redirect_url?: string }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WOMPI_PUBLIC_KEY = Deno.env.get('WOMPI_PUBLIC_KEY')!;
const WOMPI_INTEGRITY_SECRET = Deno.env.get('WOMPI_INTEGRITY_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Descuento por pagar varios meses de una vez (definido por el negocio, sin anual por ahora).
const DESCUENTO_POR_MESES: Record<number, number> = { 1: 0, 3: 0.05, 6: 0.15 };

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    const { afiliado_id, meses: mesesRaw, redirect_url } = await req.json();
    const meses = [1, 3, 6].includes(mesesRaw) ? mesesRaw : 1;

    if (!afiliado_id) {
      return new Response(JSON.stringify({ error: 'afiliado_id es requerido' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: afiliado, error } = await supabase
      .from('prepagada_afiliados')
      .select('id, precio_mensual')
      .eq('id', afiliado_id)
      .single();

    if (error || !afiliado) {
      return new Response(JSON.stringify({ error: 'Afiliado no encontrado' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const descuento = DESCUENTO_POR_MESES[meses];
    const totalPesos = Math.round(afiliado.precio_mensual * meses * (1 - descuento));
    const reference = `pp-${afiliado.id}-${meses}-${Date.now()}`;
    const amountInCents = totalPesos * 100;
    const currency = 'COP';

    const integrity = await sha256Hex(
      `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`
    );

    await supabase
      .from('prepagada_afiliados')
      .update({ wompi_referencia: reference })
      .eq('id', afiliado.id);

    const params = new URLSearchParams({
      'public-key': WOMPI_PUBLIC_KEY,
      currency,
      'amount-in-cents': String(amountInCents),
      reference,
      'signature:integrity': integrity,
    });
    if (redirect_url) params.set('redirect-url', redirect_url);

    const url = `https://checkout.wompi.co/p/?${params.toString()}`;

    return new Response(JSON.stringify({ url, reference, meses, total: totalPesos, descuento }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
