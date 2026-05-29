const SIIGO_API = 'https://api.siigo.com';
const PARTNER_ID = 'ClaudeAgent';

let _token = null;
let _tokenExpiry = 0;

// Products cache (survives warm invocations, ~1 hour TTL)
let _products = null;
let _productsExpiry = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const res = await fetch(`${SIIGO_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Partner-ID': PARTNER_ID },
    body: JSON.stringify({ username: process.env.SIIGO_USER, access_key: process.env.SIIGO_ACCESS_KEY }),
  });
  if (!res.ok) throw new Error(`Siigo auth failed: ${await res.text()}`);
  const data = await res.json();
  _token = data.access_token;
  _tokenExpiry = Date.now() + ((data.expires_in || 3600) - 300) * 1000;
  return _token;
}

async function siigoFetch(method, path, body) {
  const token = await getToken();
  const res = await fetch(`${SIIGO_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Partner-ID': PARTNER_ID,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.Errors?.[0]?.Message || data?.error || JSON.stringify(data);
    return { status: res.status, data: { error: msg } };
  }
  return { status: res.status, data };
}

async function getAllActiveProducts() {
  if (_products && Date.now() < _productsExpiry) return _products;
  const all = [];
  let page = 1;
  while (true) {
    const r = await siigoFetch('GET', `/v1/products?active=true&page_size=200&page=${page}`);
    if (r.status !== 200) break;
    const items = r.data.results || [];
    // Keep only fields needed by the billing UI
    for (const p of items) {
      all.push({
        code:  p.code,
        name:  p.name,
        type:  p.type,        // 'Product' | 'Service'
        price: p.prices?.[0]?.price_list?.[0]?.value || 0,
        tax_id:  p.taxes?.[0]?.id || null,
        tax_pct: p.taxes?.[0]?.percentage ?? 0,
      });
    }
    if (!r.data._links?.next) break;
    page++;
  }
  _products = all;
  _productsExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  return all;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const subPath = (event.path || '/')
    .replace(/^\/api\/siigo/, '')
    .replace(/^\/\.netlify\/functions\/siigo/, '')
    || '/';

  const method = event.httpMethod;
  const qs = event.queryStringParameters || {};
  let body = null;
  if (event.body) {
    try {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
      body = JSON.parse(raw);
    } catch (_) {}
  }

  try {
    let result;

    if (method === 'GET' && /^\/customers\/[^/]+$/.test(subPath)) {
      const id = decodeURIComponent(subPath.slice('/customers/'.length));
      result = await siigoFetch('GET', `/v1/customers?identification=${encodeURIComponent(id)}`);

    } else if (method === 'POST' && subPath === '/customers') {
      result = await siigoFetch('POST', '/v1/customers', body);

    } else if (method === 'GET' && subPath.startsWith('/products')) {
      if (qs.all === 'true') {
        // Return full active catalog (paginated internally, cached)
        const products = await getAllActiveProducts();
        return json(200, { results: products, total: products.length });
      }
      const rawQs = event.rawQuery ? `?${event.rawQuery}` : '';
      result = await siigoFetch('GET', `/v1/products${rawQs}`);

    } else if (method === 'GET' && subPath === '/document-types') {
      result = await siigoFetch('GET', '/v1/document-types?type=FV');

    } else if (method === 'GET' && subPath === '/payment-types') {
      result = await siigoFetch('GET', '/v1/payment-types');

    } else if (method === 'POST' && subPath === '/invoices') {
      result = await siigoFetch('POST', '/v1/invoices', body);

    } else {
      return json(404, { error: 'Ruta no encontrada' });
    }

    return json(result.status, result.data);
  } catch (err) {
    return json(500, { error: err.message });
  }
};
