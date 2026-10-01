// Registro de tarjeta para cobro automático, contra el widget de Wompi.
//
// Los campos de la tarjeta los pinta Wompi dentro de un iframe suyo, no
// nosotros: así el número nunca pasa por una página de SofVet y un script
// comprometido acá no podría leerlo.
//
// OJO: el modo tokenización por callback NO está documentado. Wompi solo
// documenta la variante con <form method="POST">, que no sirve en una SPA.
// Leyendo widget.js se ve que si se le pasa un callback a .open() entrega
// { payment_source: { token, type } } en vez de hacer el submit del formulario.
// Si algún día Wompi lo cambia, esto deja de funcionar sin aviso.
import { supabase } from './supabaseClient';

const WOMPI_PUBLIC_KEY = 'pub_prod_5PzCKBhdU04bQIYuSeDbQRHL4qtMaChY';
const WIDGET_SRC = 'https://checkout.wompi.co/widget.js';

function cargarWidget() {
  return new Promise((resolve, reject) => {
    if (window.WidgetCheckout) return resolve();

    const yaEsta = document.querySelector('script[data-wompi-widget]');
    if (yaEsta) {
      yaEsta.addEventListener('load', () => resolve());
      yaEsta.addEventListener('error', () => reject(new Error('No se pudo cargar la pasarela de pagos.')));
      return;
    }

    const s = document.createElement('script');
    s.src = WIDGET_SRC;
    s.async = true;
    s.setAttribute('data-wompi-widget', '1');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar la pasarela de pagos.'));
    document.body.appendChild(s);
  });
}

/**
 * Abre el widget y, si el tutor completa la tarjeta, la deja registrada como
 * fuente de pago del afiliado.
 *
 * Devuelve lo que respondió la Edge Function, o `null` si el tutor cerró el
 * modal sin terminar — que no es un error, solo se arrepintió.
 */
export async function registrarTarjeta({ afiliadoId, email }) {
  await cargarWidget();
  if (!window.WidgetCheckout) throw new Error('No se pudo cargar la pasarela de pagos.');

  // En modo tokenización el widget solo pide la llave pública: no hay monto ni
  // referencia ni firma, porque todavía no se está cobrando nada.
  const checkout = new window.WidgetCheckout({
    publicKey: WOMPI_PUBLIC_KEY,
    widgetOperation: 'tokenize',
  });

  const resultado = await new Promise((resolve) => checkout.open(resolve));
  const token = resultado?.payment_source?.token;
  if (!token) return null;   // cerró el modal

  const { data, error } = await supabase.functions.invoke('wompi-registrar-tarjeta', {
    body: { afiliado_id: afiliadoId, token, customer_email: email || '' },
  });
  if (error || !data?.ok) throw new Error(data?.error || 'No se pudo guardar la tarjeta.');
  return data;
}

/**
 * Cobra de inmediato a la tarjeta ya registrada. Se usa cuando el tutor deja la
 * tarjeta al afiliarse y hay que cobrarle el primer mes en ese momento; de ahí
 * en adelante lo hace el cobro mensual.
 *
 * El cobro crea una transacción en Wompi con la misma referencia de siempre, y
 * el webhook se encarga de activar el plan y emitir la factura.
 */
export async function cobrarAhora(afiliadoId) {
  const { data, error } = await supabase.functions.invoke('wompi-cobrar-recurrente', {
    body: { afiliado_id: afiliadoId },
  });
  if (error) throw new Error(error.message || 'No se pudo cobrar.');

  const r = (data?.resultados || [])[0];
  if (!r) throw new Error('Wompi no devolvió resultado del cobro.');
  if (r.estado === 'ERROR') throw new Error(typeof r.error === 'string' ? r.error : JSON.stringify(r.error).slice(0, 200));
  if (r.estado === 'OMITIDO') throw new Error(r.motivo || 'El cobro no se intentó.');
  return r;
}
