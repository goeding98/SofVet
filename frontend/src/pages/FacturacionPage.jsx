import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../utils/useAuth';
import { supabase } from '../utils/supabaseClient';
import { siigo } from '../utils/siigo';

const ALLOWED = ['goeding'];

const DOC_FACTURA      = 26273;
const CONSUMIDOR_FINAL = { identification: '222222222222', branch_office: 0 };

// sede_id → cost_center_id Siigo (863=CJ, 865=Colseguros, 917=SM no activo)
const COST_CENTER = { 1: 917, 2: 865, 3: 863, 4: 865 };

// username SofVet → seller id Siigo
const SELLER_MAP = {
  elabrada:      969,
  emartinez:     971,
  mpabon:        970,
  mturnos:       949,
  jjhernandez:   961,
  mnader:        952,
  msalazar:      948,
  goeding:       947,
  mgaviria:      968,
  sruiz:         964,
  ccolseguros:   972,
  cciudadjardin: 966,
};

const PAYMENT_METHODS = [
  { id: 10962, label: 'Efectivo' },
  { id: 10963, label: 'Tarjeta débito' },
  { id: 10964, label: 'Tarjeta crédito' },
  { id: 10965, label: 'Consignación' },
  { id: 10944, label: 'Addi' },
  { id: 10955, label: 'Seguros Sura' },
  { id: 10954, label: 'Aseguradora WTA' },
  { id: 10966, label: 'Crédito' },
];

const today = () => new Date().toISOString().slice(0, 10);
const fmt   = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

export default function FacturacionPage() {
  const { session } = useAuth();
  if (!ALLOWED.includes(session?.username)) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No tienes acceso a esta sección.</div>;
  }
  return <FacturacionFlow session={session} />;
}

function FacturacionFlow({ session }) {
  const [step,         setStep]         = useState('entry');
  const [customerMode, setCustomerMode] = useState(null);
  const [sofvetClient, setSofvetClient] = useState(null);
  const [cedula,       setCedula]       = useState('');
  const [items,        setItems]        = useState([]);
  const [payment,      setPayment]      = useState(10962);
  const [result,       setResult]       = useState(null);
  const [errorMsg,     setErrorMsg]     = useState('');

  // Catalog — loaded once, shared across renders
  const [catalog,        setCatalog]        = useState(null); // null = not loaded
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError,   setCatalogError]   = useState('');

  const sedeId     = session?.sede_id || 2;
  const costCenter = COST_CENTER[sedeId] || 865;
  const sellerId   = SELLER_MAP[session?.username] || null;

  const loadCatalog = async () => {
    if (catalog || catalogLoading) return;
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const data = await siigo.getAllProducts();
      setCatalog(data.results || []);
    } catch (err) {
      setCatalogError(err.message);
    } finally {
      setCatalogLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('entry');
    setItems([]);
    setPayment(10962);
    setResult(null);
    setSofvetClient(null);
    setCedula('');
  };

  // ─── Entry ───────────────────────────────────────────────────────────
  if (step === 'entry') {
    return (
      <PageShell title="Facturación" sub="Emitir factura electrónica · Siigo">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: 560 }}>
          <BigCard
            icon="👤" label="Cliente identificado"
            desc="Buscar por mascota, tutor o cédula"
            onClick={() => { setCustomerMode('identified'); setStep('search'); loadCatalog(); }}
          />
          <BigCard
            icon="🏷️" label="Cliente final"
            desc="Factura sin datos del cliente"
            onClick={() => { setCustomerMode('final'); setSofvetClient(null); setCedula('222222222222'); setStep('items'); loadCatalog(); }}
          />
        </div>
      </PageShell>
    );
  }

  // ─── Search ──────────────────────────────────────────────────────────
  if (step === 'search') {
    return (
      <PageShell title="Facturación" sub="Buscar cliente">
        <SearchStep
          onBack={() => setStep('entry')}
          onSelect={(client) => { setSofvetClient(client); setCedula(client.document || ''); setStep('review'); }}
        />
      </PageShell>
    );
  }

  // ─── Review ──────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <PageShell title="Facturación" sub="Verificar datos del cliente">
        <ReviewStep
          client={sofvetClient} cedula={cedula} onCedulaChange={setCedula}
          onBack={() => setStep('search')}
          onContinue={() => setStep('items')}
        />
      </PageShell>
    );
  }

  // ─── Items ───────────────────────────────────────────────────────────
  if (step === 'items') {
    const total     = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
    const canSubmit = items.length > 0 && items.every(it => it.desc.trim() && Number(it.qty) > 0 && Number(it.price) > 0);

    const addItem = (product) => {
      setItems(prev => [...prev, {
        code:         product.code,
        desc:         product.name,
        qty:          1,
        price:        product.price || 0,
        tax_id:       product.tax_id,
        tax_pct:      product.tax_pct || 0,
        orig_tax_id:  product.tax_id,
        orig_tax_pct: product.tax_pct || 0,
      }]);
    };

    const removeItem  = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const updateItem  = (i, field, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
    const updateItemTax = (i, pct) => setItems(prev => prev.map((it, idx) => {
      if (idx !== i) return it;
      return { ...it, tax_pct: pct, tax_id: pct > 0 ? it.orig_tax_id : null };
    }));

    const handleEmitir = async () => {
      if (!sellerId) {
        setErrorMsg('Tu usuario no tiene vendedor asignado en Siigo. Contacta a administración.');
        setStep('error');
        return;
      }
      setStep('confirming');
      try {
        let customer;
        if (customerMode === 'final') {
          customer = CONSUMIDOR_FINAL;
        } else {
          const clean = cedula.trim();
          const search = await siigo.searchCustomer(clean);
          if ((search.results || []).length > 0) {
            customer = { identification: clean, branch_office: 0 };
          } else {
            const nameParts = (sofvetClient?.name || 'Cliente SofVet').trim().split(' ');
            const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];
            const firstName = nameParts[0];
            await siigo.createCustomer({
              type: 'Customer', person_type: 'Person',
              id_type: { code: '13' },
              identification: clean,
              name: [firstName, lastName],
              fiscal_responsibilities: [{ code: 'R-99-PN' }],
              contacts: [{
                first_name: firstName, last_name: lastName,
                email: sofvetClient?.email || '',
                phone: { number: (sofvetClient?.phone || '').replace(/\D/g, '').slice(0, 10) || '0000000000' },
              }],
            });
            customer = { identification: clean, branch_office: 0 };
          }
        }

        const invoice = {
          document:     { id: DOC_FACTURA },
          date:         today(),
          customer,
          cost_center:  costCenter,
          seller:       sellerId,
          stamp:        'true',  // siempre enviar a DIAN
          observations: customerMode === 'final' ? 'Consumidor final' : `Cliente: ${sofvetClient?.name || cedula}`,
          items: items.map(it => {
            const tax = Number(it.tax_pct) || 0;
            const basePrice = tax > 0
              ? Number(it.price) / (1 + tax / 100)  // exact division — Siigo adds tax on top
              : Number(it.price);
            return {
              code:        it.code,
              description: it.desc.trim(),
              quantity:    Number(it.qty),
              price:       basePrice,
              discount:    0,
              taxes:       it.tax_id ? [{ id: it.tax_id }] : [],
            };
          }),
          payments: [{ id: payment, value: total, due_date: today() }],
        };

        const created = await siigo.createInvoice(invoice);
        setResult({ numero: created.number, prefix: created.prefix });
        setStep('done');
      } catch (err) {
        setErrorMsg(err.message);
        setStep('error');
      }
    };

    return (
      <PageShell title="Facturación" sub={customerMode === 'final' ? 'Cliente final' : sofvetClient?.name || cedula}>

        {/* Item search */}
        <Section title="Agregar ítems">
          <ItemSearch
            catalog={catalog}
            loading={catalogLoading}
            error={catalogError}
            onAdd={addItem}
          />
        </Section>

        {/* Items list */}
        {items.length > 0 && (
          <Section title={`Factura (${items.length} ítem${items.length !== 1 ? 's' : ''})`}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px 100px 24px', gap: '0.5rem', marginBottom: '0.3rem' }}>
              {['Descripción', 'Cant.', 'Precio', 'IVA', ''].map((h, idx) => (
                <span key={idx} style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: idx === 1 ? 'center' : idx >= 2 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px 100px 24px', gap: '0.5rem', marginBottom: '0.45rem', alignItems: 'center' }}>
                <input
                  value={it.desc}
                  onChange={e => updateItem(i, 'desc', e.target.value)}
                  style={inputStyle}
                  placeholder="Descripción"
                />
                <input
                  type="number" min="1" value={it.qty}
                  onChange={e => updateItem(i, 'qty', e.target.value)}
                  style={{ ...inputStyle, textAlign: 'center' }}
                  placeholder="Cant."
                />
                <input
                  type="number" min="0" value={it.price}
                  onChange={e => updateItem(i, 'price', e.target.value)}
                  style={{ ...inputStyle, textAlign: 'right' }}
                  placeholder="Precio"
                />
                <select
                  value={it.tax_pct}
                  onChange={e => updateItemTax(i, Number(e.target.value))}
                  style={{ ...inputStyle, padding: '0.5rem 0.4rem', fontSize: '0.82rem' }}
                >
                  <option value={0}>Sin IVA</option>
                  {it.orig_tax_pct > 0 && (
                    <option value={it.orig_tax_pct}>IVA {it.orig_tax_pct}%</option>
                  )}
                </select>
                <button onClick={() => removeItem(i)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1rem', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✕</button>
              </div>
            ))}
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
              Total: {fmt(total)}
            </div>
          </Section>
        )}

        {/* Payment */}
        <Section title="Método de pago">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.id} onClick={() => setPayment(pm.id)}
                style={{
                  padding: '0.4rem 0.85rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  border: payment === pm.id ? '2px solid var(--color-primary)' : '1.5px solid #d1d5db',
                  background: payment === pm.id ? 'var(--color-primary)' : '#fff',
                  color: payment === pm.id ? '#fff' : '#374151',
                }}>
                {pm.label}
              </button>
            ))}
          </div>
        </Section>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <button onClick={() => setStep(customerMode === 'final' ? 'entry' : 'review')}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Atrás
          </button>
          <button onClick={handleEmitir} disabled={!canSubmit}
            style={{
              padding: '0.6rem 1.75rem',
              background: canSubmit ? 'var(--color-primary)' : '#9ca3af',
              color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem',
              cursor: canSubmit ? 'pointer' : 'default',
            }}>
            Emitir factura
          </button>
        </div>
      </PageShell>
    );
  }

  // ─── Confirming ───────────────────────────────────────────────────────
  if (step === 'confirming') {
    return (
      <PageShell title="Facturación" sub="Procesando...">
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <div style={{ fontWeight: 600 }}>Emitiendo factura en Siigo...</div>
        </div>
      </PageShell>
    );
  }

  // ─── Done ─────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <PageShell title="Facturación" sub="Factura emitida">
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#15803d', marginBottom: '0.4rem' }}>Factura emitida correctamente</div>
          <div style={{ fontSize: '1.05rem', color: '#374151', marginBottom: '1.5rem' }}>{result?.prefix} {result?.numero}</div>
          <button onClick={resetFlow}
            style={{ padding: '0.6rem 1.75rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            Nueva factura
          </button>
        </div>
      </PageShell>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <PageShell title="Facturación" sub="Error al emitir">
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.5rem' }}>Error al emitir la factura</div>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>{errorMsg}</div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => setStep('items')}
              style={{ padding: '0.55rem 1.25rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Reintentar
            </button>
            <button onClick={resetFlow}
              style={{ padding: '0.55rem 1.25rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
              Nueva factura
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return null;
}

// ─── Item Search ──────────────────────────────────────────────────────────────
function ItemSearch({ catalog, loading, error, onAdd }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim() || !catalog) { setResults([]); setOpen(false); return; }
    const q = query.toLowerCase();
    const matches = catalog.filter(p => p.name.toLowerCase().includes(q)).slice(0, 10);
    setResults(matches);
    setOpen(matches.length > 0);
  }, [query, catalog]);

  const select = (p) => { onAdd(p); setQuery(''); setResults([]); setOpen(false); };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#6b7280', fontSize: '0.85rem', padding: '0.5rem 0' }}>
        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
        Cargando catálogo de Siigo...
      </div>
    );
  }

  if (error) {
    return <div style={{ color: '#dc2626', fontSize: '0.82rem' }}>⚠️ Error cargando catálogo: {error}</div>;
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar servicio o producto..."
        style={{ ...inputStyle, width: '100%' }}
        autoComplete="off"
      />
      {catalog && !loading && (
        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.3rem' }}>
          {catalog.length.toLocaleString('es-CO')} ítems activos · escribe para filtrar
        </div>
      )}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 2, maxHeight: 320, overflowY: 'auto',
        }}>
          {results.map((p, i) => (
            <div key={p.code} onMouseDown={() => select(p)}
              style={{
                padding: '0.6rem 0.9rem', cursor: 'pointer', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span style={{ fontSize: '0.75rem' }}>{p.type === 'Service' ? '🔧' : '📦'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                  {p.code} · IVA {p.tax_pct}%{p.price > 0 ? ` · ${fmt(p.price)}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Search Step ─────────────────────────────────────────────────────────────
function SearchStep({ onBack, onSelect }) {
  const [tab,      setTab]      = useState('mascota');
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true); setResults([]);
    try {
      if (tab === 'cedula') {
        const { data } = await supabase.from('clients').select('id,name,document,email,phone').ilike('document', `%${query.trim()}%`).limit(10);
        setResults(data || []);
      } else if (tab === 'tutor') {
        const { data } = await supabase.from('clients').select('id,name,document,email,phone').ilike('name', `%${query.trim()}%`).limit(10);
        setResults(data || []);
      } else {
        const { data: pets } = await supabase.from('patients').select('id,name,client_id,clients(id,name,document,email,phone)').ilike('name', `%${query.trim()}%`).limit(10);
        const seen = new Set(); const clients = [];
        for (const p of (pets || [])) {
          const c = p.clients;
          if (c && !seen.has(c.id)) { seen.add(c.id); clients.push({ ...c, _pet: p.name }); }
        }
        setResults(clients);
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', background: '#f3f4f6', borderRadius: 8, padding: '0.25rem' }}>
        {[['mascota', '🐾 Mascota'], ['tutor', '👤 Tutor'], ['cedula', '🪪 Cédula']].map(([key, lbl]) => (
          <button key={key} onClick={() => { setTab(key); setResults([]); setSearched(false); setQuery(''); }}
            style={{
              flex: 1, padding: '0.45rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              background: tab === key ? '#fff' : 'transparent',
              color: tab === key ? 'var(--color-primary)' : '#6b7280',
              boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            {lbl}
          </button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); handleSearch(); }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder={tab === 'mascota' ? 'Nombre de la mascota...' : tab === 'tutor' ? 'Nombre del tutor...' : 'Número de cédula...'}
          style={{ ...inputStyle, flex: 1 }} autoFocus />
        <button type="submit" disabled={loading || !query.trim()}
          style={{ padding: '0.55rem 1.25rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {loading ? '...' : 'Buscar'}
        </button>
      </form>
      {searched && results.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.85rem' }}>No se encontraron resultados.</div>
      )}
      {results.map(c => (
        <div key={c.id} onClick={() => onSelect(c)}
          style={{ padding: '0.75rem 1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: '0.4rem', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.1rem' }}>
            {c.document ? `CC ${c.document}` : 'Sin cédula'}{c._pet ? ` · 🐾 ${c._pet}` : ''}{c.phone ? ` · ${c.phone}` : ''}
          </div>
        </div>
      ))}
      <button onClick={onBack} style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem' }}>← Atrás</button>
    </div>
  );
}

// ─── Review Step ─────────────────────────────────────────────────────────────
function ReviewStep({ client, cedula, onCedulaChange, onBack, onContinue }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem', color: '#111' }}>Datos del cliente</div>
        <Field label="Nombre"   value={client?.name  || '—'} />
        <Field label="Email"    value={client?.email  || '—'} />
        <Field label="Teléfono" value={client?.phone  || '—'} />
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.3rem' }}>Cédula</div>
          {!cedula.trim() ? (
            <>
              <input placeholder="Ingresa la cédula para facturar" value={cedula} onChange={e => onCedulaChange(e.target.value)}
                style={{ ...inputStyle, borderColor: '#f59e0b', width: '100%' }} autoFocus />
              <div style={{ fontSize: '0.73rem', color: '#b45309', marginTop: '0.25rem' }}>Este cliente no tiene cédula. Ingrésala para continuar.</div>
            </>
          ) : (
            <div style={{ fontSize: '0.9rem', color: '#111' }}>{cedula}</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem' }}>← Atrás</button>
        <button onClick={onContinue} disabled={!cedula.trim()}
          style={{ padding: '0.55rem 1.5rem', background: cedula.trim() ? 'var(--color-primary)' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: cedula.trim() ? 'pointer' : 'default' }}>
          Continuar →
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function PageShell({ title, sub, children }) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.35rem' }}>🧾 {title}</h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.83rem' }}>{sub}</p>
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111', marginBottom: '0.85rem' }}>{title}</div>
      {children}
    </div>
  );
}

function BigCard({ icon, label, desc, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '1.5rem 1.25rem',
      textAlign: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '0.77rem', color: '#6b7280' }}>{desc}</div>
    </button>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: '#111' }}>{value}</div>
    </div>
  );
}

const inputStyle = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 7,
  fontSize: '0.875rem',
  fontFamily: 'var(--font-body)',
  width: '100%',
  boxSizing: 'border-box',
};
