import { useState } from 'react';
import { useAuth } from '../utils/useAuth';
import { supabase } from '../utils/supabaseClient';
import { siigo } from '../utils/siigo';

const ALLOWED = ['goeding'];

// Siigo catalog constants
const DOC_FACTURA   = 26273;
const COD_SERVICIO  = '40431'; // MEDICACION AMBULATORIA, IVA 0%
const CONSUMIDOR_FINAL = { identification: '222222222222', branch_office: 0 };

// Pendiente confirmar con contadora — mapeo sede_id → cost_center_id Siigo
const COST_CENTER = { 1: 917, 2: 863, 3: 865, 4: 863 };

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
  const [step,         setStep]         = useState('entry');   // entry | search | review | items | confirming | done | error
  const [customerMode, setCustomerMode] = useState(null);      // 'final' | 'identified'
  const [sofvetClient, setSofvetClient] = useState(null);      // { name, document, email, phone }
  const [cedula,       setCedula]       = useState('');        // editable if missing
  const [items,        setItems]        = useState([{ desc: '', qty: 1, price: '' }]);
  const [payment,      setPayment]      = useState(10962);
  const [result,       setResult]       = useState(null);      // { numero, prefix }
  const [errorMsg,     setErrorMsg]     = useState('');

  const sedeId    = session?.sede_id || 2;
  const costCenter = COST_CENTER[sedeId] || 863;

  // ─── Entry ───────────────────────────────────────────────────────────
  if (step === 'entry') {
    return (
      <PageShell title="Facturación" sub="Emitir factura electrónica · Siigo">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: 560 }}>
          <BigCard
            icon="👤" label="Cliente identificado"
            desc="Buscar por mascota, tutor o cédula"
            onClick={() => { setCustomerMode('identified'); setStep('search'); }}
          />
          <BigCard
            icon="🏷️" label="Cliente final"
            desc="Factura sin datos del cliente"
            onClick={() => { setCustomerMode('final'); setSofvetClient(null); setCedula('222222222222'); setStep('items'); }}
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
          onSelect={(client) => {
            setSofvetClient(client);
            setCedula(client.document || '');
            setStep('review');
          }}
        />
      </PageShell>
    );
  }

  // ─── Review ──────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <PageShell title="Facturación" sub="Verificar datos del cliente">
        <ReviewStep
          client={sofvetClient}
          cedula={cedula}
          onCedulaChange={setCedula}
          onBack={() => setStep('search')}
          onContinue={() => setStep('items')}
        />
      </PageShell>
    );
  }

  // ─── Items ───────────────────────────────────────────────────────────
  if (step === 'items') {
    const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

    const addItem    = () => setItems(prev => [...prev, { desc: '', qty: 1, price: '' }]);
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const updateItem = (i, field, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

    const canSubmit = items.length > 0 && items.every(it => it.desc.trim() && Number(it.qty) > 0 && Number(it.price) > 0);

    const handleEmitir = async () => {
      setStep('confirming');
      try {
        // 1. Resolve customer in Siigo
        let customer;
        if (customerMode === 'final') {
          customer = CONSUMIDOR_FINAL;
        } else {
          const clean = cedula.trim();
          const search = await siigo.searchCustomer(clean);
          if ((search.results || []).length > 0) {
            customer = { identification: clean, branch_office: 0 };
          } else {
            // Create in Siigo silently
            const nameParts  = (sofvetClient?.name || 'Cliente SofVet').trim().split(' ');
            const lastName   = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];
            const firstName  = nameParts[0];
            await siigo.createCustomer({
              type: 'Customer',
              person_type: 'Person',
              id_type: { code: '13' },
              identification: clean,
              name: [firstName, lastName],
              fiscal_responsibilities: [{ code: 'R-99-PN' }],
              contacts: [{
                first_name: firstName,
                last_name: lastName,
                email: sofvetClient?.email || '',
                phone: { number: (sofvetClient?.phone || '').replace(/\D/g, '').slice(0, 10) || '0000000000' },
              }],
            });
            customer = { identification: clean, branch_office: 0 };
          }
        }

        // 2. Build invoice
        const invoiceItems = items.map(it => ({
          code: COD_SERVICIO,
          description: it.desc.trim(),
          quantity: Number(it.qty),
          price: Number(it.price),
          discount: 0,
          taxes: [],
        }));

        const invoice = {
          document:    { id: DOC_FACTURA },
          date:        today(),
          customer,
          cost_center: costCenter,
          observations: customerMode === 'final' ? 'Consumidor final' : `Cliente: ${sofvetClient?.name || cedula}`,
          items: invoiceItems,
          payments: [{ id: payment, value: total, due_date: today() }],
        };

        const created = await siigo.createInvoice(invoice);
        setResult({ numero: created.number, prefix: created.prefix, id: created.id });
        setStep('done');
      } catch (err) {
        setErrorMsg(err.message);
        setStep('error');
      }
    };

    return (
      <PageShell title="Facturación" sub={customerMode === 'final' ? 'Cliente final' : sofvetClient?.name || cedula}>

        {/* Items */}
        <Section title="Ítems de la factura">
          {items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 120px 32px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <input
                placeholder="Descripción del servicio o producto"
                value={it.desc}
                onChange={e => updateItem(i, 'desc', e.target.value)}
                style={inputStyle}
              />
              <input
                type="number" min="1" placeholder="Cant."
                value={it.qty}
                onChange={e => updateItem(i, 'qty', e.target.value)}
                style={{ ...inputStyle, textAlign: 'center' }}
              />
              <input
                type="number" min="0" placeholder="Precio"
                value={it.price}
                onChange={e => updateItem(i, 'price', e.target.value)}
                style={{ ...inputStyle, textAlign: 'right' }}
              />
              <button onClick={() => removeItem(i)} disabled={items.length === 1}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.1rem', cursor: 'pointer', padding: 0 }}>✕</button>
            </div>
          ))}
          <button onClick={addItem} style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            + Agregar ítem
          </button>
        </Section>

        {/* Payment method */}
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

        {/* Total + actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
          <button onClick={() => setStep(customerMode === 'final' ? 'entry' : 'review')}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Atrás
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-primary)' }}>{fmt(total)}</span>
            <button onClick={handleEmitir} disabled={!canSubmit}
              style={{
                padding: '0.6rem 1.75rem', background: canSubmit ? 'var(--color-primary)' : '#9ca3af',
                color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem',
                cursor: canSubmit ? 'pointer' : 'default',
              }}>
              Emitir factura
            </button>
          </div>
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
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#15803d', marginBottom: '0.4rem' }}>
            Factura emitida correctamente
          </div>
          <div style={{ fontSize: '1.05rem', color: '#374151', marginBottom: '1.5rem' }}>
            {result?.prefix} {result?.numero}
          </div>
          <button onClick={() => { setStep('entry'); setItems([{ desc: '', qty: 1, price: '' }]); setPayment(10962); setResult(null); setSofvetClient(null); setCedula(''); }}
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
            <button onClick={() => { setStep('entry'); setItems([{ desc: '', qty: 1, price: '' }]); setPayment(10962); setSofvetClient(null); setCedula(''); }}
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

// ─── Search Step ─────────────────────────────────────────────────────────────
function SearchStep({ onBack, onSelect }) {
  const [tab,     setTab]     = useState('mascota'); // mascota | tutor | cedula
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setResults([]);
    try {
      if (tab === 'cedula') {
        const { data } = await supabase.from('clients').select('id,name,document,email,phone').ilike('document', `%${query.trim()}%`).limit(10);
        setResults(data || []);
      } else if (tab === 'tutor') {
        const { data } = await supabase.from('clients').select('id,name,document,email,phone').ilike('name', `%${query.trim()}%`).limit(10);
        setResults(data || []);
      } else {
        // Search by pet name → join to client
        const { data: pets } = await supabase.from('patients').select('id,name,client_id,clients(id,name,document,email,phone)').ilike('name', `%${query.trim()}%`).limit(10);
        const seen = new Set();
        const clients = [];
        for (const p of (pets || [])) {
          const c = p.clients;
          if (c && !seen.has(c.id)) { seen.add(c.id); clients.push({ ...c, _pet: p.name }); }
        }
        setResults(clients);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Tabs */}
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

      {/* Search input */}
      <form onSubmit={e => { e.preventDefault(); handleSearch(); }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder={tab === 'mascota' ? 'Nombre de la mascota...' : tab === 'tutor' ? 'Nombre del tutor...' : 'Número de cédula...'}
          style={{ ...inputStyle, flex: 1 }}
          autoFocus
        />
        <button type="submit" disabled={loading || !query.trim()}
          style={{ padding: '0.55rem 1.25rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {loading ? '...' : 'Buscar'}
        </button>
      </form>

      {/* Results */}
      {searched && results.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.85rem' }}>No se encontraron resultados.</div>
      )}
      {results.map(c => (
        <div key={c.id} onClick={() => onSelect(c)}
          style={{ padding: '0.75rem 1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: '0.4rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.1rem' }}>
            {c.document ? `CC ${c.document}` : 'Sin cédula'}{c._pet ? ` · 🐾 ${c._pet}` : ''}
            {c.phone ? ` · ${c.phone}` : ''}
          </div>
        </div>
      ))}

      <button onClick={onBack} style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem' }}>
        ← Atrás
      </button>
    </div>
  );
}

// ─── Review Step ─────────────────────────────────────────────────────────────
function ReviewStep({ client, cedula, onCedulaChange, onBack, onContinue }) {
  const missing = !cedula.trim();
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem', color: '#111' }}>Datos del cliente</div>

        <Field label="Nombre"  value={client?.name || '—'} />
        <Field label="Email"   value={client?.email || '—'} />
        <Field label="Teléfono" value={client?.phone || '—'} />

        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.3rem' }}>Cédula</div>
          {missing ? (
            <>
              <input
                placeholder="Ingresa la cédula para facturar"
                value={cedula}
                onChange={e => onCedulaChange(e.target.value)}
                style={{ ...inputStyle, borderColor: '#f59e0b', width: '100%' }}
                autoFocus
              />
              <div style={{ fontSize: '0.73rem', color: '#b45309', marginTop: '0.25rem' }}>Este cliente no tiene cédula registrada. Ingrésala para continuar.</div>
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
      textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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
