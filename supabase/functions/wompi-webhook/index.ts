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
        .select('id, fecha_afiliacion, fecha_vencimiento, ultimo_pago_id, ultimo_pago_fecha, ciclos_prepagada')
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
