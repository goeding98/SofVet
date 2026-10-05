// Genera un link de pago (Web Checkout) de Wompi para un afiliado de Prepagada.
// Body esperado: { afiliado_id: number, meses?: 1|3|6, redirect_url?: string }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WOMPI_PUBLIC_KEY = Deno.env.get('WOMPI_PUBLIC_KEY')!;
const WOMPI_INTEGRITY_SECRET = Deno.env.get('WOMPI_INTEGRITY_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Descuento permanente por tener tarjeta con cobro automático. Aplica sobre
// cada mes. Ya no hay descuento por pagar varios meses por adelantado: el pago
// manual es mensual. Debe coincidir con frontend/src/utils/prepagadaPrecios.js.
const DESCUENTO_TARJETA = 0.10;

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
    const { afiliado_id, redirect_url } = await req.json();
    const meses = 1; // el pago manual siempre es de un mes

    if (!afiliado_id) {
      return new Response(JSON.stringify({ error: 'afiliado_id es requerido' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: afiliado, error } = await supabase
      .from('prepagada_afiliados')
      .select('id, precio_mensual, cobro_automatico')
      .eq('id', afiliado_id)
      .single();

    if (error || !afiliado) {
      return new Response(JSON.stringify({ error: 'Afiliado no encontrado' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // El 10% se calcula acá y no se confía en lo que mande el navegador: es lo
    // que firma la integridad del checkout.
    const descuento = afiliado.cobro_automatico ? DESCUENTO_TARJETA : 0;
    const base = Math.round(afiliado.precio_mensual * (1 - descuento));

    // Se cobra CON IVA, igual que la factura. El plan se factura en dos
    // renglones y solo el de servicio está gravado, así que el total no es
    // base × 1,19. Si se cobrara la base pelada, el recaudo quedaría por debajo
    // de lo facturado y la diferencia la terminaría poniendo P&P.
    // El servicio se redondea a centenas: el 19% de un múltiplo de 100 da pesos
    // enteros, y las tarjetas en Wompi rechazan montos con centavos. Copia de
    // partirServicioInsumos en frontend/src/utils/prepagadaPrecios.js.
    const servicio = Math.round(base * 0.5 / 100) * 100;
    const insumos = base - servicio;
    const totalPesos = servicio + insumos + (servicio * 19) / 100;
    const reference = `pp-${afiliado.id}-${meses}-${Date.now()}`;
    const amountInCents = Math.round(totalPesos * 100);
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
