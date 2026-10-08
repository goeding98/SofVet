import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { registrarTarjeta, correoValido } from '../utils/wompiTarjeta';
import { DESCUENTO_TARJETA, precioConDescuento, totalConIva } from '../utils/prepagadaPrecios';

// Página pública a la que llega el tutor por un link que le manda el cajero.
// Se abre en su propio celular: la tarjeta nunca se teclea en el computador de
// la clínica, y el cliente no tiene que entregarle el plástico a nadie.
//
// El link lleva un token de un solo uso con vencimiento, guardado en el
// afiliado. Sin eso cualquiera podría registrar una tarjeta sobre el plan de
// otro con solo adivinar un id.

const C = {
  teal: '#316d74', tealDark: '#1e4e54', cream: '#f5e6d3',
  text: '#22201e', muted: '#6b6560', border: '#e2d9cd',
  danger: '#c0392b', ok: '#1e7d45',
};

const fmtCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

export default function TarjetaPage() {
  const { token } = useParams();
  const [estado, setEstado] = useState('cargando'); // cargando | listo | guardando | ok | error
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [correo, setCorreo] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: e } = await supabase
        .from('prepagada_afiliados')
        .select('id, plan, precio_mensual, cobro_automatico, tarjeta_token_expira, patient_id, client_id')
        .eq('tarjeta_token', token)
        .maybeSingle();

      if (e || !data) { setError('Este enlace no es válido.'); setEstado('error'); return; }
      if (data.tarjeta_token_expira && data.tarjeta_token_expira < new Date().toISOString()) {
        setError('Este enlace ya venció. Pídele uno nuevo a la clínica.');
        setEstado('error'); return;
      }

      const [{ data: mascota }, { data: cliente }] = await Promise.all([
        supabase.from('patients').select('name').eq('id', data.patient_id).maybeSingle(),
        supabase.from('clients').select('name, email').eq('id', data.client_id).maybeSingle(),
      ]);
      setDatos({ ...data, mascota: mascota?.name, cliente: cliente?.name, email: cliente?.email });
      setCorreo((cliente?.email || '').trim());
      setEstado('listo');
    })();
  }, [token]);

  const guardar = async () => {
    const email = correo.trim();
    if (!correoValido(email)) { setError('Escribe un correo válido para continuar.'); return; }
    setError(''); setEstado('guardando');
    try {
      // Si el tutor corrigió el correo, queda guardado en su ficha: es el mismo
      // al que llegan las facturas.
      if (email !== (datos.email || '').trim()) {
        await supabase.from('clients').update({ email }).eq('id', datos.client_id);
        setDatos((d) => ({ ...d, email }));
      }
      const r = await registrarTarjeta({ afiliadoId: datos.id, email });
      if (!r) { setEstado('listo'); return; }   // cerró el widget

      // El token es de un solo uso: una vez registrada, el enlace muere.
      await supabase.from('prepagada_afiliados')
        .update({ tarjeta_token: null, tarjeta_token_expira: null })
        .eq('id', datos.id);

      setDatos((d) => ({ ...d, tarjeta: r.tarjeta_ultimos4 ? `${r.tarjeta_marca || 'Tarjeta'} terminada en ${r.tarjeta_ultimos4}` : 'Tarjeta registrada' }));
      setEstado('ok');
    } catch (e) {
      setError(e.message || 'No se pudo registrar la tarjeta.');
      setEstado('listo');
    }
  };

  const caja = {
    maxWidth: 440, margin: '0 auto', padding: '1.5rem',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    color: C.text, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
  };

  if (estado === 'cargando') {
    return <div style={{ ...caja, textAlign: 'center', color: C.muted }}>Cargando…</div>;
  }

  if (estado === 'error') {
    return (
      <div style={{ ...caja, textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔗</div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.tealDark, margin: '0 0 0.5rem' }}>Enlace no disponible</h1>
        <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.6 }}>{error}</p>
      </div>
    );
  }

  if (estado === 'ok') {
    return (
      <div style={{ ...caja, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: C.ok, margin: '0 0 0.5rem' }}>¡Listo!</h1>
        <p style={{ color: C.text, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 0.4rem' }}>{datos.tarjeta}</p>
        <p style={{ color: C.muted, fontSize: '0.88rem', lineHeight: 1.6 }}>
          El plan de <strong>{datos.mascota}</strong> se cobrará solo cada mes, con{' '}
          <strong style={{ color: C.ok }}>{Math.round(DESCUENTO_TARJETA * 100)}% de descuento</strong>.
          Puedes volver al pago manual cuando quieras desde tu portal.
        </p>
      </div>
    );
  }

  const base = precioConDescuento(datos.precio_mensual, true);
  const conIva = totalConIva(datos.precio_mensual, true);
  const sinDescuento = totalConIva(datos.precio_mensual, false);

  return (
    <div style={caja}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '2.2rem' }}>💳</div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.tealDark, margin: '0.3rem 0 0.3rem' }}>
          Activa el pago automático
        </h1>
        <p style={{ color: C.muted, fontSize: '0.9rem', margin: 0 }}>
          Plan de <strong style={{ color: C.text }}>{datos.mascota}</strong>
          {datos.cliente ? <> · {datos.cliente}</> : null}
        </p>
      </div>

      <div style={{ background: C.cream, borderRadius: 14, padding: '1.1rem', marginBottom: '1.2rem' }}>
        <div style={{ fontWeight: 800, color: C.tealDark, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
          Paga {Math.round(DESCUENTO_TARJETA * 100)}% menos, todos los meses
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ textDecoration: 'line-through', color: C.muted, fontSize: '0.95rem' }}>{fmtCOP(sinDescuento)}</span>
          <span style={{ fontWeight: 800, fontSize: '1.3rem', color: C.tealDark }}>{fmtCOP(conIva)}</span>
          <span style={{ color: C.muted, fontSize: '0.85rem' }}>/ mes</span>
        </div>
        <p style={{ fontSize: '0.82rem', color: C.muted, margin: 0, lineHeight: 1.5 }}>
          Tu plan se cobra solo cada mes y no tienes que estar pendiente. Puedes volver al
          pago manual cuando quieras.
        </p>
      </div>

      {datos.cobro_automatico && (
        <p style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.8rem', lineHeight: 1.5 }}>
          Ya tienes una tarjeta registrada. Si continúas, la reemplazas por la nueva.
        </p>
      )}

      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: C.tealDark, marginBottom: '0.35rem' }}>
        Tu correo electrónico
      </label>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={correo}
        onChange={(e) => { setCorreo(e.target.value); if (error) setError(''); }}
        placeholder="tucorreo@ejemplo.com"
        style={{
          width: '100%', boxSizing: 'border-box', padding: '0.8rem 0.9rem', fontSize: '1rem', fontFamily: 'inherit',
          border: `1.5px solid ${correo && !correoValido(correo) ? C.danger : C.border}`, borderRadius: 12, marginBottom: '0.35rem',
        }}
      />
      <p style={{ fontSize: '0.76rem', color: correo && !correoValido(correo) ? C.danger : C.muted, margin: '0 0 0.9rem', lineHeight: 1.5 }}>
        {correo && !correoValido(correo)
          ? 'Revisa tu correo: parece incompleto (por ejemplo, le falta la @).'
          : 'Ahí te llegan los comprobantes de pago y las facturas.'}
      </p>

      {error && (
        <p style={{ color: C.danger, fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.8rem' }}>⚠️ {error}</p>
      )}

      <button
        onClick={guardar}
        disabled={estado === 'guardando'}
        style={{
          width: '100%', padding: '1rem', background: estado === 'guardando' ? '#ccc' : C.teal,
          color: 'white', border: 'none', borderRadius: 14, cursor: estado === 'guardando' ? 'default' : 'pointer',
          fontFamily: 'inherit', fontWeight: 800, fontSize: '1rem',
        }}
      >
        {estado === 'guardando' ? 'Abriendo…' : '💳 Registrar mi tarjeta'}
      </button>

      <p style={{ fontSize: '0.76rem', color: C.muted, textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
        🔒 Los datos de tu tarjeta los pide directamente Wompi, la pasarela de pagos de
        Bancolombia. Pets &amp; Pets nunca los ve ni los guarda.
      </p>
    </div>
  );
}
