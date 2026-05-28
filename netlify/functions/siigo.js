const SIIGO_API = 'https://api.siigo.com';

let _token = null;
let _expiry = 0;

async function getToken() {
  if (_token && Date.now() < _expiry) return _token;
  const res = await fetch(`${SIIGO_API}/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Partner-ID': process.env.SIIGO_PARTNER_ID || 'SofVet',
    },
    body: JSON.stringify({
      username: process.env.SIIGO_USER,
      access_key: process.env.SIIGO_ACCESS_KEY,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Siigo auth failed: ${text}`);
  }
  const data = await res.json();
  _token = data.access_token;
  _expiry = Date.now() + ((data.expires_in || 3600) - 300) * 1000;
  return _token;
}

async function siigoFetch(method, path, body) {
  const token = await getToken();
  const res = await fetch(`${SIIGO_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Partner-ID': process.env.SIIGO_PARTNER_ID || 'SofVet',
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
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  // Strip function or api prefix to get the sub-path
  const subPath = (event.path || '/')
    .replace(/^\/api\/siigo/, '')
    .replace(/^\/\.netlify\/functions\/siigo/, '')
    || '/';

  const method = event.httpMethod;
  let body = null;
  if (event.body) {
    try { body = JSON.parse(event.body); } catch (_) { /* ignore */ }
  }

  try {
    let result;

    // GET /customers/:identification
    if (method === 'GET' && /^\/customers\/[^/]+$/.test(subPath)) {
      const identification = decodeURIComponent(subPath.slice('/customers/'.length));
      result = await siigoFetch('GET', `/v1/customers?identification=${encodeURIComponent(identification)}`);

    // POST /customers
    } else if (method === 'POST' && subPath === '/customers') {
      result = await siigoFetch('POST', '/v1/customers', body);

    // GET /products (pass-through query string)
    } else if (method === 'GET' && subPath.startsWith('/products')) {
      const qs = event.rawQuery ? `?${event.rawQuery}` : '';
      result = await siigoFetch('GET', `/v1/products${qs}`);

    // GET /document-types
    } else if (method === 'GET' && subPath === '/document-types') {
      result = await siigoFetch('GET', '/v1/document-types?type=FV');

    // GET /payment-types
    } else if (method === 'GET' && subPath === '/payment-types') {
      result = await siigoFetch('GET', '/v1/payment-types');

    // POST /invoices
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
