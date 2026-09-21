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
    properties.map((p: string) => String(getByPath(payload, p))).join('') +
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
    const match = String(tx.reference || '').match(/^pp-(\d+)-/);
    if (match) {
      const afiliadoId = Number(match[1]);
      const { data: afiliado } = await supabase
        .from('prepagada_afiliados')
        .select('id, fecha_vencimiento, ultimo_pago_id')
        .eq('id', afiliadoId)
        .single();

      if (afiliado && afiliado.ultimo_pago_id !== tx.id) {
        const hoy = nowBogotaDateStr();
        const base =
          afiliado.fecha_vencimiento && afiliado.fecha_vencimiento > hoy
            ? afiliado.fecha_vencimiento
            : hoy;
        const nuevaFecha = new Date(base + 'T00:00:00');
        nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);

        await supabase
          .from('prepagada_afiliados')
          .update({
            fecha_vencimiento: nuevaFecha.toISOString().slice(0, 10),
            estado: 'activo',
            ultimo_pago_id: tx.id,
            ultimo_pago_metodo: tx.payment_method_type ?? null,
            ultimo_pago_fecha: hoy,
          })
          .eq('id', afiliadoId);

        console.log(`[wompi-webhook] afiliado ${afiliadoId} pagado, tx ${tx.id}`);
      }
    } else {
      console.warn('[wompi-webhook] referencia sin match:', tx.reference);
    }
  }

  return new Response('OK', { status: 200 });
});
