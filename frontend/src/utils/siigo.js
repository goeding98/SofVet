const BASE = '/api/siigo';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
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
