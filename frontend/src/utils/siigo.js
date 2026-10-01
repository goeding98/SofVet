const BASE = '/api/siigo';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Cuando la función de Netlify se cae o se pasa de tiempo devuelve una página
  // de error en HTML. Hacer res.json() ahí lanza "Unexpected token '<'", que no
  // le dice nada a nadie, así que se detecta antes.
  const crudo = await res.text();
  let data;
  try {
    data = JSON.parse(crudo);
  } catch {
    const e = new Error(
      res.status === 504 || res.status === 502
        ? 'Siigo tardó demasiado en responder. Intenta de nuevo.'
        : `Siigo respondió algo inesperado (HTTP ${res.status}).`
    );
    e.noEsJson = true;
    throw e;
  }

  if (!res.ok) throw new Error(data.error || 'Error de Siigo');
  return data;
}

export const siigo = {
  searchCustomer:  (id)    => req('GET',  `/customers/${encodeURIComponent(id)}`),
  createCustomer:  (body)  => req('POST', '/customers', body),
  getProducts:     (params = {}) => req('GET', `/products?${new URLSearchParams(params)}`),
  getAllProducts:   ()           => req('GET', '/products?all=true'),
  getDocumentTypes:()      => req('GET',  '/document-types'),
  getPaymentTypes: ()      => req('GET',  '/payment-types'),
  createInvoice:   (body)  => req('POST', '/invoices', body),
};
