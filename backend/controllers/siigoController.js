const SIIGO_API   = 'https://api.siigo.com';
const PARTNER_ID  = process.env.SIIGO_PARTNER_ID || 'ClaudeAgent';

// In-memory token cache (lives for the process lifetime)
let _token  = null;
let _expiry = 0;

async function getToken() {
  if (_token && Date.now() < _expiry) return _token;

  const res = await fetch(`${SIIGO_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Partner-ID': PARTNER_ID },
    body: JSON.stringify({
      username:   process.env.SIIGO_USER,
      access_key: process.env.SIIGO_ACCESS_KEY,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Siigo auth failed: ${err}`);
  }

  const data = await res.json();
  _token  = data.access_token;
  _expiry = Date.now() + (data.expires_in - 300) * 1000; // 5-min buffer before expiry
  return _token;
}

async function siigo(method, path, body) {
  const token = await getToken();
  const res = await fetch(`${SIIGO_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Partner-ID':    PARTNER_ID,
      'Content-Type':  'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.Errors?.[0]?.Message || data?.message || 'Error Siigo';
    const err = new Error(msg);
    err.status = res.status;
    err.siigo  = data;
    throw err;
  }
  return data;
}

// ── Customers ─────────────────────────────────────────────────────────────────

exports.searchCustomer = async (req, res) => {
  try {
    const { identification } = req.params;
    const data = await siigo('GET', `/v1/customers?identification=${encodeURIComponent(identification)}&page_size=5`);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, detail: err.siigo });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const data = await siigo('POST', '/v1/customers', req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, detail: err.siigo });
  }
};

// ── Products / services ───────────────────────────────────────────────────────

exports.getProducts = async (req, res) => {
  try {
    const page   = req.query.page   || 1;
    const search = req.query.search || '';
    const qs = new URLSearchParams({
      type:      'Service',
      page,
      page_size: 100,
      ...(search ? { name: search } : {}),
    });
    const data = await siigo('GET', `/v1/products?${qs}`);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, detail: err.siigo });
  }
};

// ── Invoice metadata ──────────────────────────────────────────────────────────

exports.getDocumentTypes = async (req, res) => {
  try {
    const data = await siigo('GET', '/v1/document-types?type=FV');
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, detail: err.siigo });
  }
};

exports.getPaymentTypes = async (req, res) => {
  try {
    const data = await siigo('GET', '/v1/payment-types?document_type=FV');
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, detail: err.siigo });
  }
};

// ── Invoices ──────────────────────────────────────────────────────────────────

exports.createInvoice = async (req, res) => {
  try {
    const data = await siigo('POST', '/v1/invoices', req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, detail: err.siigo });
  }
};
