import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { supabase } from '../utils/supabaseClient';
import { BENEFICIOS_TOTAL_ANUAL, DESCUENTO_TARJETA, precioConDescuento, totalConIva } from '../utils/prepagadaPrecios';
import { vencimientoTrasPago } from '../utils/prepagadaFacturacion';
import { facturarMesPrepagada, desglosarFactura, facturarConsumoPrepagada } from '../utils/prepagadaSiigo';
import { cobrarAhora } from '../utils/wompiTarjeta';
import SiigoConceptoPicker from '../components/SiigoConceptoPicker';
import { calcularEstadoVencimiento } from '../utils/prepagadaEstado';
import { nowDate } from '../utils/nowLocal';

const fmtCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
const PLAN_LABEL = { urgencias: 'Urgencias', total: 'Total' };
const ESTADO_OPTS = ['pendiente_pago', 'activo', 'en_gracia', 'suspendido', 'cancelado'];
const ESTADO_BADGE = {
  activo:      { bg: '#eafaf0', color: '#1e7d45', label: 'Activo' },
  pendiente_pago: { bg: '#fff1e6', color: '#c05621', label: 'Pendiente de pago' },
  en_gracia:   { bg: '#fff8e1', color: '#b8860b', label: 'En gracia' },
  suspendido:  { bg: '#fdecea', color: '#c0392b', label: 'Suspendido' },
  cancelado:   { bg: '#f0f2f6', color: '#8A8076', label: 'Cancelado' },
};

// Tabla de descuentos del Plan Total. El cajero busca el servicio, no el
// porcentaje, así que se lista por servicio y el % va al lado.
const SERVICIOS_PROGRAMADOS = [
  { label: 'Cirugía programada de tejidos blandos', pct: 60 },
  { label: 'Radiografía adicional', pct: 60 },
  { label: 'Ecografía diagnóstica adicional', pct: 60 },
  { label: 'Esterilización / castración (con remisión médica)', pct: 50 },
  { label: 'Tomografía (TAC)', pct: 50 },
  { label: 'Consulta con especialista', pct: 50 },
  { label: 'Hospitalización programada', pct: 50 },
  { label: 'Otros procedimientos y tratamientos médicos', pct: 50 },
  { label: 'Cirugía de especialista (ortopedia y similares)', pct: 40 },
  { label: 'Limpieza dental / profilaxis', pct: 40 },
  { label: 'Laboratorios adicionales', pct: 40 },
  { label: 'Medicamentos de farmacia', pct: 10 },
];

const BENEFICIO_ROWS = [
  { key: 'consultas_usadas',          label: 'Consultas médicas',        tope: BENEFICIOS_TOTAL_ANUAL.consultas },
  { key: 'vacunas_usadas',            label: 'Vacunas anuales',          tope: BENEFICIOS_TOTAL_ANUAL.vacunas },
  { key: 'desparasitaciones_usadas',  label: 'Desparasitaciones',        tope: BENEFICIOS_TOTAL_ANUAL.desparasitaciones },
  { key: 'labs_usados',               label: 'Panel de laboratorio',     tope: BENEFICIOS_TOTAL_ANUAL.labs },
  { key: 'imagenes_usadas',           label: 'Imagen diagnóstica',       tope: BENEFICIOS_TOTAL_ANUAL.imagenes },
];

export default function PrepagadaV2DetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const afiliadoId = parseInt(id);

  const { items: afiliados, edit: editAfiliado, refresh: refrescarAfiliados } = useStore('prepagadaAfiliados');
  const { items: beneficios, add: addBeneficios, edit: editBeneficios } = useStore('prepagadaBeneficios');
  const { items: eventos, add: addEvento } = useStore('prepagadaEventos');
  const { items: clients } = useStore('clients');
  const { items: patients } = useStore('patients');

  const afiliado = afiliados.find(a => a.id === afiliadoId);
  const cliente = afiliado ? clients.find(c => c.id === afiliado.client_id) : null;
  const mascota = afiliado ? patients.find(p => p.id === afiliado.patient_id) : null;
  const anioActual = new Date().getFullYear();
  const beneficioAnio = beneficios.find(b => b.afiliado_id === afiliadoId && b.anio === anioActual);
  const eventosAfiliado = eventos.filter(e => e.afiliado_id === afiliadoId).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  // Igual que en la lista: corrige el estado por vencimiento, y resetea la
  // bolsa consumida si ya cambió el año, si alguien entra directo a esta
  // ficha sin pasar antes por /prueba/prepagada.
  useEffect(() => {
    if (!afiliado) return;
    const anioActual = new Date().getFullYear();
    const updates = {};
    const estadoReal = calcularEstadoVencimiento(afiliado, nowDate());
    if (estadoReal !== afiliado.estado) updates.estado = estadoReal;
    if (afiliado.bolsa_anio !== anioActual) { updates.bolsa_anio = anioActual; updates.bolsa_consumida_anual = 0; }
    if (Object.keys(updates).length) editAfiliado(afiliado.id, updates);
  }, [afiliado?.id, afiliado?.estado, afiliado?.fecha_vencimiento, afiliado?.bolsa_anio]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Excepción para pagos en efectivo/transferencia que caja sube a mano —
  // cuando exista Wompi, esto lo hará el webhook automáticamente.
  const handleMarcarPagado = () => {
    if (!afiliado) return;
    const hoy = nowDate();
    const nuevaFecha = vencimientoTrasPago({
      fechaAfiliacion: afiliado.fecha_afiliacion,
      vencimientoActual: afiliado.fecha_vencimiento,
      hoy,
      meses: 1,
      primerPago: !afiliado.ultimo_pago_fecha,
    });
    editAfiliado(afiliado.id, {
      fecha_vencimiento: nuevaFecha,
      estado: 'activo',
      // Marca que ya hubo un pago, para que el siguiente extienda en vez de reemplazar.
      ultimo_pago_fecha: hoy,
      ultimo_pago_metodo: 'manual',
    });
  };

  const [linkPago, setLinkPago] = useState(null);
  const [generandoLink, setGenerandoLink] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [tarjetaMsg, setTarjetaMsg] = useState('');
  const [tarjetaErr, setTarjetaErr] = useState('');
  const [tarjetaBusy, setTarjetaBusy] = useState(false);
  const [linkTarjeta, setLinkTarjeta] = useState(null);

  // El pago lo aplica el webhook de Wompi en segundo plano, así que la ficha se
  // queda vieja: el cajero genera el link, el tutor paga en otra pestaña y acá
  // seguiría diciendo "pendiente de pago". Se recarga al volver a la pestaña y,
  // mientras haya un link abierto, cada 15 segundos.
  const [refrescando, setRefrescando] = useState(false);
  const recargar = useCallback(async () => {
    setRefrescando(true);
    try { await refrescarAfiliados(); } finally { setRefrescando(false); }
  }, [refrescarAfiliados]);

  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') recargar(); };
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [recargar]);

  useEffect(() => {
    if (!linkPago) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') recargar();
    }, 15000);
    return () => clearInterval(t);
  }, [linkPago, recargar]);



  // El tutor registra la tarjeta en SU celular, no en el computador del cajero:
  // acá solo se genera un enlace de un solo uso para mandárselo. Así nadie tiene
  // que entregar su tarjeta ni teclearla en el mostrador de la clínica.
  const handleLinkTarjeta = async () => {
    if (!afiliado || tarjetaBusy) return;
    setTarjetaErr(''); setTarjetaMsg(''); setTarjetaBusy(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, '');
      const expira = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const { error } = await supabase
        .from('prepagada_afiliados')
        .update({ tarjeta_token: token, tarjeta_token_expira: expira })
        .eq('id', afiliado.id);
      if (error) throw new Error(error.message);

      const url = `${window.location.origin}/tarjeta/${token}`;
      setLinkTarjeta(url);
      try { await navigator.clipboard.writeText(url); setTarjetaMsg('Enlace copiado. Mándaselo al tutor por WhatsApp.'); }
      catch { setTarjetaMsg('Enlace listo para copiar y mandárselo al tutor.'); }
    } catch (e) {
      setTarjetaErr(e.message || 'No se pudo generar el enlace.');
    }
    setTarjetaBusy(false);
  };

  // Con el enlace, el tutor registra la tarjeta en su celular pero nadie le cobra
  // el primer mes. Este botón lo dispara desde caja: el cobro crea una
  // transacción en Wompi y el webhook activa el plan y factura.
  // Con el enlace, el tutor registra la tarjeta en su celular pero nadie le cobra
  // el primer mes. Este botón lo dispara desde caja: el cobro crea una
  // transacción en Wompi y el webhook se encarga de activar el plan y facturar.
  const handleCobrarAhora = async () => {
    if (!afiliado || tarjetaBusy) return;
    const monto = totalConIva(afiliado.precio_mensual, afiliado.cobro_automatico);
    const ok = window.confirm(
      `Se le va a cobrar ${fmtCOP(monto)} a la tarjeta registrada.\n\n`
      + 'El plan se activa y se factura en cuanto Wompi apruebe. ¿Continuar?'
    );
    if (!ok) return;

    setTarjetaErr(''); setTarjetaMsg(''); setTarjetaBusy(true);
    try {
      await cobrarAhora(afiliado.id);
      setTarjetaMsg('Cobro enviado a Wompi. El plan se activa y se factura en unos segundos…');
      // Se recarga y se quita el aviso: a partir de ahí la ficha misma muestra
      // el estado real, que es la fuente de verdad.
      setTimeout(async () => { await recargar(); setTarjetaMsg(''); }, 7000);
    } catch (e) {
      setTarjetaErr(e.message || 'No se pudo cobrar.');
    }
    setTarjetaBusy(false);
  };

  const handleGenerarLink = async () => {
    if (!afiliado) return;
    setGenerandoLink(true);
    setLinkCopiado(false);
    try {
      const { data, error } = await supabase.functions.invoke('wompi-generar-link', {
        body: { afiliado_id: afiliado.id },
      });
      if (error || !data?.url) throw new Error(error?.message || 'Sin URL en la respuesta');
      setLinkPago({ url: data.url, meses: data.meses, total: data.total });
    } catch (e) {
      alert('No se pudo generar el link de pago: ' + e.message);
    }
    setGenerandoLink(false);
  };

  // ── Facturación en Siigo ───────────────────────────────────────────────────
  const [facturando, setFacturando] = useState(false);
  const [facturaErr, setFacturaErr] = useState('');
  const yaFacturado = !!afiliado?.ultima_factura_numero;
  // Los pagos por Wompi los factura el webhook solo. Si la última factura es
  // igual o posterior al último pago, ese pago YA tiene su factura y volver a
  // emitirla crearía un segundo documento ante la DIAN.
  const pagoYaFacturado = !!(
    afiliado?.ultima_factura_fecha &&
    afiliado?.ultimo_pago_fecha &&
    afiliado.ultima_factura_fecha >= afiliado.ultimo_pago_fecha
  );
  // Solo tiene sentido facturar lo que ya se cobró.
  const puedeFacturar = !!afiliado?.ultimo_pago_fecha;

  const handleFacturar = async () => {
    if (!afiliado || facturando) return;
    if (pagoYaFacturado) {
      const insistir = window.confirm(
        `⚠️ Este pago YA está facturado con ${afiliado.ultima_factura_numero}.\n\n`
        + 'Los pagos por Wompi se facturan solos; este botón es para los de efectivo '
        + 'o transferencia.\n\n'
        + 'Si continúas se emite una SEGUNDA factura electrónica del mismo pago, y para '
        + 'deshacerla toca nota crédito.\n\n¿Seguro que quieres facturar otra vez?'
      );
      if (!insistir) return;
    }

    const d = desglosarFactura(aCobrar, afiliado.plan);
    const ok = window.confirm(
      `Se va a emitir la factura electrónica a nombre de ${cliente?.name || 'el tutor'}:\n\n`
      + (d.modoPrueba
        ? `  ${d.items.servicio.desc}\n  ${d.items.insumos.desc}\n\n`
          + 'MODO PRUEBA: los renglones salen con el precio que tienen los productos '
          + `en Siigo (unos pocos pesos), no con los ${fmtCOP(d.total)} del plan.\n\n`
        : `  ${d.items.servicio.desc}: ${fmtCOP(d.servicio)} + IVA ${fmtCOP(d.iva)}\n`
          + `  ${d.items.insumos.desc}: ${fmtCOP(d.insumos)} (sin IVA)\n\n`
          + `Total: ${fmtCOP(d.totalConIva)}\n\n`)
      + 'Se envía a la DIAN y le llega por correo al tutor. No se puede deshacer. ¿Continuar?'
    );
    if (!ok) return;

    setFacturando(true); setFacturaErr('');
    try {
      // useStore cachea los clientes en memoria, así que la copia que tiene esta
      // pantalla puede ser vieja: si el tutor se creó después de que cargara la
      // lista, llega sin cédula. Para facturar se relee de la base.
      let tutor = cliente;
      if (!tutor?.cedula && !tutor?.document) {
        const { data } = await supabase
          .from('clients')
          .select('id,name,cedula,document,email,phone')
          .eq('id', afiliado.client_id)
          .single();
        if (data) tutor = data;
      }

      const r = await facturarMesPrepagada({
        afiliado, cliente: tutor, mascota,
        sedeUsuario: session?.sede_id,
        valorMensual: aCobrar,
      });
      editAfiliado(afiliado.id, {
        ultima_factura_numero: r.completo,
        ultima_factura_fecha: nowDate(),
        ultima_factura_url: r.url,
      });
    } catch (e) {
      setFacturaErr(e.message || 'No se pudo emitir la factura.');
    }
    setFacturando(false);
  };

  const [eventoModal, setEventoModal] = useState(false);

  const [evClase, setEvClase] = useState('urgencia'); // 'urgencia' | 'programado'

  // Los descuentos en procedimientos programados son solo del Plan Total: el
  // Plan Urgencias cubre únicamente urgencias. Ver el contrato, sección 8.
  const permiteProgramado = afiliado?.plan === 'total';

  // Una visita puede traer varios servicios (labs + Rx, por ejemplo), así que
  // el modal trabaja con filas y cada fila queda como un consumo aparte.
  // Cada fila queda amarrada a un concepto de Siigo: de ahí salen el nombre, el
  // valor sugerido y el impuesto, sin que caja tenga que teclearlos.
  const ITEM_VACIO = { servicio: '', desc: '', costo: '', code: '', taxId: null, taxPct: 0 };
  const [evItems, setEvItems] = useState([{ ...ITEM_VACIO }]);
  const [evNotas, setEvNotas] = useState('');
  const [evFactura, setEvFactura] = useState('');
  const [savingEvento, setSavingEvento] = useState(false);
  const [consumoErr, setConsumoErr] = useState('');
  // Queda visible después de cerrar el modal: emitir una factura electrónica no
  // puede pasar en silencio.
  const [consumoFactura, setConsumoFactura] = useState(null);

  // Un afiliado de Plan Urgencias no puede quedar con la clase 'programado',
  // ni siquiera si el modal se abrió antes de que cargaran sus datos.
  useEffect(() => {
    if (!permiteProgramado && evClase !== 'urgencia') setEvClase('urgencia');
  }, [permiteProgramado, evClase]);

  if (!afiliado) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Afiliado no encontrado.</p>
        <button onClick={() => navigate('/prueba/prepagada')} style={{ color: '#316d74', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>← Volver</button>
      </div>
    );
  }

  // Lo que de verdad se cobra este mes: la tarifa lleva 10% menos si el tutor
  // dejó tarjeta. precio_mensual se conserva como tarifa plena.
  const aCobrar = precioConDescuento(afiliado.precio_mensual, afiliado.cobro_automatico);
  // Lo que se le cobra de verdad: la factura suma IVA sobre la mitad de servicio.
  const aCobrarConIva = totalConIva(afiliado.precio_mensual, afiliado.cobro_automatico);

  const disponible = afiliado.bolsa_maxima_anual - afiliado.bolsa_consumida_anual;
  const pctUsado = Math.min(100, (afiliado.bolsa_consumida_anual / afiliado.bolsa_maxima_anual) * 100);
  const badge = ESTADO_BADGE[afiliado.estado] || ESTADO_BADGE.activo;

  const iniciarBeneficiosAnio = () => {
    addBeneficios({
      afiliado_id: afiliadoId, anio: anioActual,
      consultas_usadas: 0, vacunas_usadas: 0, desparasitaciones_usadas: 0, labs_usados: 0, imagenes_usadas: 0,
    }, { onError: () => {} });
  };

  const incBeneficio = (key) => {
    if (!beneficioAnio) return;
    editBeneficios(beneficioAnio.id, { [key]: (beneficioAnio[key] || 0) + 1, updated_at: new Date().toISOString() });
  };
  const decBeneficio = (key) => {
    if (!beneficioAnio) return;
    editBeneficios(beneficioAnio.id, { [key]: Math.max(0, (beneficioAnio[key] || 0) - 1), updated_at: new Date().toISOString() });
  };

  // Urgencia: el tutor paga 20% de copago y la bolsa asume el 80%.
  // Programado: el tutor paga la tarifa con descuento, y lo que P&P descuenta
  // también sale de la bolsa (es el tope anual de todo lo que aporta P&P).
  const calcItem = (item) => {
    const costo = Number(String(item.costo).replace(/\D/g, '')) || 0;
    const pct = evClase === 'urgencia'
      ? 80
      : (item.servicio !== '' ? SERVICIOS_PROGRAMADOS[Number(item.servicio)].pct : 0);
    const cubierto = Math.round(costo * pct / 100);
    return { costo, pct, cubierto, copago: costo - cubierto };
  };
  const itemsConValor = evItems.filter(it => calcItem(it).costo > 0);
  const totalEv = itemsConValor.reduce((a, it) => {
    const c = calcItem(it);
    return { costo: a.costo + c.costo, cubierto: a.cubierto + c.cubierto, copago: a.copago + c.copago };
  }, { costo: 0, cubierto: 0, copago: 0 });
  // Lo que el tutor paga en caja NO es el copago pelado: la factura le suma el
  // IVA de cada concepto sobre la porción que le queda a él.
  const ivaCopago = itemsConValor.reduce((suma, it) => {
    const c = calcItem(it);
    return suma + Math.round(c.copago * (Number(it.taxPct) || 0) / 100);
  }, 0);
  const aCobrarEnCaja = totalEv.copago + ivaCopago;
  const hayFacturables = itemsConValor.some(it => it.code);

  const faltaServicio = evClase === 'programado' && itemsConValor.some(it => it.servicio === '');
  const puedeGuardar = itemsConValor.length > 0 && !faltaServicio;

  const setItem = (i, campo, valor) => setEvItems(arr => arr.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it));

  // El valor llega del catálogo pero queda editable: en una urgencia el costo
  // real casi nunca es la tarifa de lista.
  const elegirConcepto = (i, c) => setEvItems(arr => arr.map((it, idx) => idx === i ? {
    ...it, code: c.code, desc: c.nombre, costo: String(c.precio), taxId: c.taxId, taxPct: c.taxPct,
  } : it));
  const addItem = () => setEvItems(arr => [...arr, { ...ITEM_VACIO }]);
  const delItem = (i) => setEvItems(arr => arr.length === 1 ? [{ ...ITEM_VACIO }] : arr.filter((_, idx) => idx !== i));

  const handleRegistrarEvento = async () => {
    if (!puedeGuardar) return;
    setSavingEvento(true);
    setConsumoErr('');

    // Se factura ANTES de tocar la bolsa: si la factura falla, no queda un
    // consumo descontado sin respaldo. Si sale bien ya no hay vuelta atrás,
    // así que lo demás tiene que poder completarse.
    let factura = null;
    const conCodigo = itemsConValor.filter(it => it.code);
    if (conCodigo.length > 0) {
      const d = conCodigo.map(it => {
        const c = calcItem(it);
        return `  ${it.desc}: ${fmtCOP(c.costo)} − ${c.pct}% = ${fmtCOP(c.copago)}`;
      }).join('\n');
      const ok = window.confirm(
        `Se va a emitir la factura electrónica a ${cliente?.name || 'el tutor'}:\n\n${d}\n\n`
        + `El tutor paga ${fmtCOP(totalEv.copago)}.\n\n`
        + 'Se envía a la DIAN y le llega por correo. No se puede deshacer. ¿Continuar?'
      );
      if (!ok) { setSavingEvento(false); return; }
      try {
        factura = await facturarConsumoPrepagada({
          afiliado, cliente, mascota,
          sedeUsuario: session?.sede_id,
          notas: evNotas.trim() || null,
          items: conCodigo.map(it => {
            const c = calcItem(it);
            return { code: it.code, nombre: it.desc, valor: c.costo, pct: c.pct, taxId: it.taxId, taxPct: it.taxPct };
          }),
        });
      } catch (e) {
        setSavingEvento(false);
        setConsumoErr('No se pudo facturar, no se registró el consumo: ' + (e.message || ''));
        return;
      }
    }

    // Cada fila queda como un consumo independiente, para poder reportar
    // después por tipo de servicio.
    let err = null;
    for (const item of itemsConValor) {
      const c = calcItem(item);
      const nombreServicio = evClase === 'programado'
        ? SERVICIOS_PROGRAMADOS[Number(item.servicio)].label
        : null;
      const ok = await addEvento({
        afiliado_id: afiliadoId,
        patient_id: afiliado.patient_id,
        fecha: nowDate(),
        tipo_evento: item.desc.trim() || nombreServicio || 'Urgencia',
        clase: evClase,
        costo_total: c.costo,
        copago: c.copago,
        cubierto_pp: c.cubierto,
        factura_copago: factura?.completo || evFactura.trim() || null,
        factura_url: factura?.url || null,
        notas: evNotas.trim() || null,
        registrado_por: session?.nombre || session?.username || null,
      }, { onError: (m) => { err = m; } });
      if (!ok) { setSavingEvento(false); alert('Error al guardar: ' + err); return; }
    }

    await editAfiliado(afiliadoId, { bolsa_consumida_anual: afiliado.bolsa_consumida_anual + totalEv.cubierto });

    setSavingEvento(false);
    setEventoModal(false);
    if (factura) setConsumoFactura(factura);
    setEvItems([{ ...ITEM_VACIO }]);
    setEvNotas(''); setEvFactura(''); setEvClase('urgencia');
  };

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 900 }}>
      <button onClick={() => navigate('/prueba/prepagada')} style={{ color: '#316d74', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}>← Volver a Prepagada</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>🐾 {mascota?.name || '—'}</h1>
            <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>{badge.label}</span>
            <span style={{ background: '#eef6f6', color: '#1e4e54', padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>Plan {PLAN_LABEL[afiliado.plan]}</span>
          </div>
          <p style={{ color: '#8A8076', fontSize: '0.9rem' }}>
            Titular: {cliente?.name || '—'} ·{' '}
            {afiliado.cobro_automatico ? (
              <>
                <span style={{ textDecoration: 'line-through' }}>{fmtCOP(afiliado.precio_mensual)}</span>{' '}
                <strong style={{ color: '#1e7d45' }}>{fmtCOP(aCobrar)}/mes</strong>{' '}
                <span style={{ color: '#1e7d45', fontWeight: 700 }}>(−{Math.round(DESCUENTO_TARJETA * 100)}% por tarjeta)</span>
              </>
            ) : `${fmtCOP(afiliado.precio_mensual)}/mes`} · Afiliado desde {afiliado.fecha_afiliacion} · Vence {afiliado.fecha_vencimiento || '—'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={handleGenerarLink}
            disabled={generandoLink}
            title={`Genera un link de pago de Wompi por ${fmtCOP(aCobrar)} para enviarle al tutor`}
            style={{ padding: '0.5rem 0.9rem', background: '#eef4ff', color: '#2a4d9e', border: '1px solid #2a4d9e', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: generandoLink ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: generandoLink ? 0.6 : 1 }}
          >
            💳 {generandoLink ? 'Generando...' : `Generar link · ${fmtCOP(aCobrarConIva)}`}
          </button>
          <button
            onClick={handleLinkTarjeta}
            disabled={tarjetaBusy}
            title={afiliado.cobro_automatico
              ? 'Ya tiene tarjeta. El enlace sirve para reemplazarla.'
              : `Genera un enlace para que el tutor registre su tarjeta desde su celular y quede con ${Math.round(DESCUENTO_TARJETA * 100)}% de descuento`}
            style={{ padding: '0.5rem 0.9rem', background: afiliado.cobro_automatico ? '#eafaf0' : 'white', color: afiliado.cobro_automatico ? '#1e7d45' : '#5c6470', border: `1.5px solid ${afiliado.cobro_automatico ? '#1e7d45' : '#dfe3ea'}`, borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: tarjetaBusy ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
          >
            {tarjetaBusy ? '…' : afiliado.cobro_automatico ? '💳 Cambiar tarjeta' : '💳 Link de tarjeta'}
          </button>
          {afiliado.cobro_automatico && !afiliado.ultimo_pago_fecha && (
            <button
              onClick={handleCobrarAhora}
              disabled={tarjetaBusy}
              title="Cobra el primer mes a la tarjeta que acaba de registrar el tutor"
              style={{ padding: '0.5rem 0.9rem', background: '#f3f0ff', color: '#6b4bbf', border: '1.5px solid #6b4bbf', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: tarjetaBusy ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
            >
              {tarjetaBusy ? '…' : '⚡ Cobrar ahora'}
            </button>
          )}
          <button
            onClick={handleMarcarPagado}
            title={`Registra un pago en efectivo o transferencia de ${fmtCOP(aCobrar)} por un mes. Los pagos por Wompi entran solos.`}
            style={{ padding: '0.5rem 0.9rem', background: '#eafaf0', color: '#1e7d45', border: '1px solid #1e7d45', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ✅ Marcar pagado
          </button>
          <button
            onClick={handleFacturar}
            disabled={!puedeFacturar || facturando}
            title={
              !puedeFacturar ? 'Primero tiene que entrar el pago'
                : pagoYaFacturado ? `Este pago ya está facturado (${afiliado.ultima_factura_numero}). Los pagos por Wompi se facturan solos; este botón es para efectivo o transferencia.`
                : yaFacturado ? `La última factura fue ${afiliado.ultima_factura_numero}, pero hay un pago más reciente sin facturar.`
                : desglosarFactura(aCobrar, afiliado.plan).modoPrueba
                  ? 'MODO PRUEBA: emite la factura con los precios de los productos en Siigo, no con el valor del plan'
                  : `Emite la factura electrónica en Siigo por ${fmtCOP(desglosarFactura(aCobrar, afiliado.plan).totalConIva)}`
            }
            style={{ padding: '0.5rem 0.9rem', background: !puedeFacturar || pagoYaFacturado ? '#f2f2f2' : '#fff7e6', color: !puedeFacturar || pagoYaFacturado ? '#999' : '#8a6d00', border: `1px solid ${!puedeFacturar || pagoYaFacturado ? '#ddd' : '#8a6d00'}`, borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: puedeFacturar && !facturando ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
          >
            🧾 {facturando ? 'Facturando…' : pagoYaFacturado ? 'Ya facturado' : 'Facturar'}
          </button>
          <button
            onClick={recargar}
            disabled={refrescando}
            title="Vuelve a leer el estado desde la base, por si el pago acaba de entrar"
            style={{ padding: '0.5rem 0.7rem', background: 'white', color: '#5c6470', border: '1.5px solid #dfe3ea', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: refrescando ? 'default' : 'pointer' }}
          >{refrescando ? '…' : '↻'}</button>
          <select value={afiliado.estado} onChange={e => editAfiliado(afiliadoId, { estado: e.target.value })} style={{ padding: '0.5rem 0.8rem', borderRadius: 10, border: '1.5px solid #dfe3ea', fontSize: '0.85rem', fontWeight: 600 }}>
            {ESTADO_OPTS.map(o => <option key={o} value={o}>{ESTADO_BADGE[o].label}</option>)}
          </select>
        </div>
      </div>

      {linkTarjeta && (
        <div style={{ background: '#f3f0ff', border: '1px solid #6b4bbf', borderRadius: 12, padding: '0.9rem 1.2rem', marginBottom: '1.2rem', display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#6b4bbf', whiteSpace: 'nowrap' }}>Enlace de tarjeta:</span>
          <a href={linkTarjeta} target="_blank" rel="noreferrer" style={{ color: '#6b4bbf', fontSize: '0.85rem', wordBreak: 'break-all', flex: 1 }}>{linkTarjeta}</a>
          <button
            onClick={() => navigator.clipboard.writeText(linkTarjeta)}
            style={{ padding: '0.4rem 0.8rem', background: '#6b4bbf', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
          >Copiar</button>
          <span style={{ fontSize: '0.75rem', color: '#6b4bbf', width: '100%' }}>Sirve una sola vez y vence en 48 horas.</span>
        </div>
      )}

      {(tarjetaMsg || tarjetaErr) && (
        <div style={{ background: tarjetaErr ? '#fdecea' : '#eafaf0', border: `1px solid ${tarjetaErr ? '#c0392b' : '#1e7d45'}`, borderRadius: 12, padding: '0.8rem 1.2rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.86rem', fontWeight: 600, color: tarjetaErr ? '#c0392b' : '#1e7d45' }}>
          <span>{tarjetaErr ? `⚠️ ${tarjetaErr}` : `💳 ${tarjetaMsg}`}</span>
          <button
            onClick={() => { setTarjetaMsg(''); setTarjetaErr(''); }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
          >✕</button>
        </div>
      )}

      {consumoFactura && (
        <div style={{ background: '#eafaf0', border: '1px solid #1e7d45', borderRadius: 12, padding: '0.8rem 1.2rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.88rem', color: '#1e7d45', fontWeight: 700 }}>
            ✅ Consumo registrado y facturado · {consumoFactura.completo} · {fmtCOP(consumoFactura.total)}
          </span>
          {consumoFactura.url && (
            <a href={consumoFactura.url} target="_blank" rel="noreferrer" style={{ color: '#1e7d45', fontWeight: 700, fontSize: '0.85rem' }}>Ver factura</a>
          )}
          <span style={{ fontSize: '0.78rem', color: '#4a7a5c' }}>Se le envió al correo del tutor.</span>
          <button
            onClick={() => setConsumoFactura(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#4a7a5c', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
          >✕</button>
        </div>
      )}

      {(afiliado.ultima_factura_numero || facturaErr) && (
        <div style={{ background: facturaErr ? '#fdecea' : '#fff7e6', border: `1px solid ${facturaErr ? '#c0392b' : '#8a6d00'}`, borderRadius: 12, padding: '0.7rem 1.2rem', marginBottom: '1.2rem', fontSize: '0.85rem', color: facturaErr ? '#c0392b' : '#8a6d00', fontWeight: 600 }}>
          {facturaErr ? (
            `⚠️ ${facturaErr}`
          ) : (
            <>
              🧾 Última factura: {afiliado.ultima_factura_numero}
              {afiliado.ultima_factura_fecha ? ` · ${afiliado.ultima_factura_fecha}` : ''}
              {afiliado.ultima_factura_url && (
                <>
                  {' · '}
                  <a
                    href={afiliado.ultima_factura_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#8a6d00', textDecoration: 'underline', fontWeight: 700 }}
                  >
                    Ver factura
                  </a>
                </>
              )}
            </>
          )}
        </div>
      )}

      {linkPago && (
        <div style={{ background: '#eef4ff', border: '1px solid #2a4d9e', borderRadius: 12, padding: '0.9rem 1.2rem', marginBottom: '1.2rem', display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2a4d9e', whiteSpace: 'nowrap' }}>
            Link por {linkPago.meses === 1 ? '1 mes' : `${linkPago.meses} meses`} · {fmtCOP(linkPago.total)}
          </span>
          <a href={linkPago.url} target="_blank" rel="noreferrer" style={{ color: '#2a4d9e', fontSize: '0.85rem', wordBreak: 'break-all', flex: 1 }}>{linkPago.url}</a>
          <button
            onClick={() => { navigator.clipboard.writeText(linkPago.url); setLinkCopiado(true); }}
            style={{ padding: '0.4rem 0.8rem', background: '#2a4d9e', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {linkCopiado ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      )}

      {/* Bolsa */}
      <div style={{ background: 'white', border: '1px solid #e2e6ef', borderRadius: 14, padding: '1.2rem 1.5rem', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5c6470', textTransform: 'uppercase' }}>Bolsa anual {afiliado.bolsa_anio} — urgencias y servicios programados</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{fmtCOP(disponible)} disponibles de {fmtCOP(afiliado.bolsa_maxima_anual)}</span>
        </div>
        <div style={{ height: 10, background: '#eceff3', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctUsado}%`, background: pctUsado > 90 ? '#c0392b' : pctUsado > 60 ? '#b8860b' : '#316d74' }} />
        </div>
      </div>

      {/* Beneficios preventivos (solo Plan Total) */}
      {afiliado.plan === 'total' && (
        <div style={{ background: 'white', border: '1px solid #e2e6ef', borderRadius: 14, padding: '1.2rem 1.5rem', marginBottom: '1.2rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5c6470', textTransform: 'uppercase', marginBottom: '0.8rem' }}>Beneficios preventivos {anioActual}</div>
          {!beneficioAnio ? (
            <div>
              <p style={{ color: '#8A8076', fontSize: '0.85rem', marginBottom: '0.6rem' }}>Aún no hay registro de beneficios para este año.</p>
              <button onClick={iniciarBeneficiosAnio} style={{ padding: '0.5rem 1rem', background: '#316d74', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Iniciar beneficios {anioActual}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {BENEFICIO_ROWS.map(row => {
                const usados = beneficioAnio[row.key] || 0;
                const agotado = usados >= row.tope;
                return (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.7rem', background: agotado ? '#fdecea' : '#f7f9fc', borderRadius: 10 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{row.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: agotado ? '#c0392b' : '#1c2333' }}>{usados}/{row.tope}{agotado ? ' AGOTADO' : ''}</span>
                      <button onClick={() => decBeneficio(row.key)} disabled={usados <= 0} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #dfe3ea', background: 'white', cursor: usados <= 0 ? 'not-allowed' : 'pointer' }}>−</button>
                      <button onClick={() => incBeneficio(row.key)} disabled={agotado} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: agotado ? '#ccc' : '#316d74', color: 'white', cursor: agotado ? 'not-allowed' : 'pointer' }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Eventos de urgencia */}
      <div style={{ background: 'white', border: '1px solid #e2e6ef', borderRadius: 14, padding: '1.2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5c6470', textTransform: 'uppercase' }}>Consumos de la bolsa ({eventosAfiliado.length})</span>
            <div style={{ fontSize: '0.75rem', color: '#8A8076', marginTop: '0.15rem' }}>Urgencias y también servicios programados con descuento</div>
          </div>
          <button onClick={() => setEventoModal(true)} style={{ padding: '0.5rem 1rem', background: '#316d74', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Registrar consumo</button>
        </div>
        {eventosAfiliado.length === 0 ? (
          <p style={{ color: '#8A8076', fontSize: '0.85rem' }}>Todavía no ha consumido bolsa. Registra aquí tanto las urgencias como los servicios programados con descuento del plan.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {eventosAfiliado.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: '#f7f9fc', borderRadius: 10, fontSize: '0.85rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '1px 7px', borderRadius: 999, marginRight: '0.4rem', background: e.clase === 'programado' ? '#eef6f6' : '#fdecea', color: e.clase === 'programado' ? '#1e4e54' : '#c0392b' }}>
                      {e.clase === 'programado' ? 'PROGRAMADO' : 'URGENCIA'}
                    </span>
                    {e.tipo_evento || 'Evento'}
                  </div>
                  <div style={{ color: '#8A8076', fontSize: '0.78rem' }}>
                    {e.fecha} · {e.registrado_por}
                    {e.factura_copago && (
                      <>
                        {' · '}
                        {e.factura_url ? (
                          <a href={e.factura_url} target="_blank" rel="noreferrer" style={{ color: '#8a6d00', fontWeight: 700 }}>🧾 {e.factura_copago}</a>
                        ) : (
                          <span style={{ color: '#8a6d00', fontWeight: 700 }}>🧾 {e.factura_copago}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Total: {fmtCOP(e.costo_total)}</div>
                  <div style={{ color: '#8A8076', fontSize: '0.78rem' }}>Tutor {fmtCOP(e.copago)} · Bolsa {fmtCOP(e.cubierto_pp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {eventoModal && (
        <div onClick={() => setEventoModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #eceff3' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: evClase === 'urgencia' ? '#c0392b' : '#316d74', margin: 0 }}>
                {evClase === 'urgencia' ? '🚨 Registrar urgencia' : '📅 Registrar servicio programado'}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#8A8076' }}>{mascota?.name}</p>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>¿Qué tipo de servicio fue?</label>
              {!permiteProgramado && (
                <p style={{ fontSize: '0.75rem', color: '#8A8076', margin: '0 0 0.5rem', lineHeight: 1.45 }}>
                  El Plan Urgencias cubre únicamente urgencias. Los descuentos en procedimientos
                  programados son exclusivos del Plan Total.
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: permiteProgramado ? '1fr 1fr' : '1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                {[
                  { k: 'urgencia',   t: '🚨 Urgencia', s: 'Copago 20%' },
                  ...(permiteProgramado ? [{ k: 'programado', t: '📅 Programado', s: 'Con descuento' }] : []),
                ].map(o => (
                  <button key={o.k} onClick={() => setEvClase(o.k)}
                    style={{ padding: '0.6rem', background: evClase === o.k ? (o.k === 'urgencia' ? '#c0392b' : '#316d74') : 'white', color: evClase === o.k ? 'white' : '#1c2333', border: `1.5px solid ${evClase === o.k ? (o.k === 'urgencia' ? '#c0392b' : '#316d74') : '#dfe3ea'}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem' }}>
                    <div>{o.t}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.85 }}>{o.s}</div>
                  </button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                {evClase === 'programado' ? 'Servicios prestados en esta visita' : 'Conceptos de la urgencia'}
              </label>

              {/* Cada ítem es una tarjeta: arriba el concepto de Siigo, abajo la
                  cobertura y el valor. Meter las cuatro cosas en una sola línea
                  quedaba ilegible. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.6rem' }}>
                {evItems.map((item, i) => {
                  const c = calcItem(item);
                  const falta = evClase === 'programado' && c.costo > 0 && item.servicio === '';
                  return (
                    <div key={i} style={{ border: `1.5px solid ${falta ? '#c0392b' : '#e8ecf2'}`, borderRadius: 11, padding: '0.6rem', background: '#fbfcfd' }}>

                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <SiigoConceptoPicker
                            valor={item.desc}
                            onElegir={(cp) => elegirConcepto(i, cp)}
                            placeholder={evClase === 'programado' ? 'Buscar el servicio en Siigo…' : 'Buscar el concepto en Siigo…'}
                          />
                        </div>
                        <button
                          onClick={() => delItem(i)}
                          title="Quitar esta fila"
                          style={{ width: 26, height: 30, flexShrink: 0, background: '#fdecea', color: '#c0392b', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', lineHeight: 1 }}
                        >✕</button>
                      </div>

                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {evClase === 'programado' && (
                          <select
                            value={item.servicio}
                            onChange={e => setItem(i, 'servicio', e.target.value)}
                            title="Determina qué porcentaje cubre el plan"
                            style={{ flex: 1, minWidth: 180, padding: '0.45rem 0.5rem', border: `1.5px solid ${falta ? '#c0392b' : '#dfe3ea'}`, borderRadius: 8, fontSize: '0.78rem', fontFamily: 'inherit', background: 'white' }}
                          >
                            <option value="">— Cobertura del plan —</option>
                            {SERVICIOS_PROGRAMADOS.map((s, si) => (
                              <option key={s.label} value={si}>{s.label} — {s.pct}%</option>
                            ))}
                          </select>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#8A8076' }}>Valor</span>
                          <input
                            inputMode="numeric"
                            value={item.costo}
                            onChange={e => setItem(i, 'costo', e.target.value)}
                            placeholder="0"
                            title="Llega del catálogo de Siigo, pero se puede ajustar"
                            style={{ width: 100, padding: '0.45rem 0.5rem', border: '1.5px solid #dfe3ea', borderRadius: 8, fontSize: '0.82rem', textAlign: 'right', fontFamily: 'inherit', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: '0.75rem' }}>
                          <div style={{ color: '#8A8076' }}>
                            Paga el tutor <strong style={{ color: '#1c2333' }}>{c.costo > 0 ? fmtCOP(c.copago) : '—'}</strong>
                          </div>
                          <div style={{ color: '#8A8076' }}>
                            Sale de bolsa <strong style={{ color: c.cubierto > 0 ? '#316d74' : '#c8ccd2' }}>{c.cubierto > 0 ? fmtCOP(c.cubierto) : '—'}</strong>
                          </div>
                        </div>
                      </div>

                      {!item.code && c.costo > 0 && (
                        <p style={{ fontSize: '0.7rem', color: '#8a6d00', margin: '0.4rem 0 0' }}>
                          ⚠️ Sin concepto de Siigo: este ítem se registra pero no se factura.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={addItem} style={{ width: '100%', padding: '0.5rem', background: 'white', border: '1.5px dashed #316d74', color: '#316d74', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.8rem', marginBottom: '1rem' }}>
                + Agregar otro ítem
              </button>

              {faltaServicio && (
                <p style={{ color: '#c0392b', fontSize: '0.78rem', marginBottom: '0.8rem', fontWeight: 600 }}>⚠️ Falta elegir el servicio en las filas marcadas en rojo.</p>
              )}

              {totalEv.costo > 0 && (
                <div style={{ background: '#f7f9fc', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Costo total de la visita</span><strong>{fmtCOP(totalEv.costo)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Paga el tutor (antes de IVA)</span><strong>{fmtCOP(totalEv.copago)}</strong></div>
                  {ivaCopago > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8A8076' }}><span>IVA sobre lo que paga el tutor</span><strong>{fmtCOP(ivaCopago)}</strong></div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Asume P&amp;P — sale de la bolsa</span><strong style={{ color: '#316d74' }}>{fmtCOP(totalEv.cubierto)}</strong></div>
                  {hayFacturables && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid #dfe3ea', fontSize: '0.95rem' }}>
                      <span style={{ fontWeight: 700 }}>TOTAL A COBRAR EN CAJA</span>
                      <strong style={{ color: '#1e7d45' }}>{fmtCOP(aCobrarEnCaja)}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed #dfe3ea' }}>
                    <span>Bolsa después de esta visita</span>
                    <strong style={{ color: (disponible - totalEv.cubierto) < 0 ? '#c0392b' : '#1c2333' }}>{fmtCOP(disponible - totalEv.cubierto)}</strong>
                  </div>
                </div>
              )}

              {consumoErr && (
                <div style={{ background: '#fdecea', border: '1px solid #c0392b', borderRadius: 10, padding: '0.7rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#c0392b', fontWeight: 600 }}>
                  ⚠️ {consumoErr}
                </div>
              )}

              {hayFacturables && (
                <div style={{ background: '#fff7e6', border: '1px solid #8a6d00', borderRadius: 10, padding: '0.7rem 0.9rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#8a6d00' }}>
                  🧾 Al guardar se emite la factura electrónica en Siigo y se le envía al tutor por correo.
                  La bolsa se descuenta solo si la factura sale bien.
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Factura del copago (solo si se facturó aparte)</label>
              <input value={evFactura} onChange={e => setEvFactura(e.target.value)} placeholder="Nº de factura" style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem' }} />

              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Notas</label>
              <textarea value={evNotas} onChange={e => setEvNotas(e.target.value)} rows={2} style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1.2rem', resize: 'vertical' }} />

              <div style={{ display: 'flex', gap: '0.7rem' }}>
                <button onClick={() => setEventoModal(false)} style={{ flex: 1, padding: '0.7rem', background: 'white', border: '1px solid #dfe3ea', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleRegistrarEvento} disabled={savingEvento || !puedeGuardar} style={{ flex: 2, padding: '0.7rem', background: (savingEvento || !puedeGuardar) ? '#ccc' : (evClase === 'urgencia' ? '#c0392b' : '#316d74'), color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: (savingEvento || !puedeGuardar) ? 'not-allowed' : 'pointer' }}>
                  {savingEvento ? 'Guardando…' : (itemsConValor.length > 1 ? 'Registrar ' + itemsConValor.length + ' ítems' : (evClase === 'urgencia' ? 'Registrar urgencia' : 'Registrar servicio'))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
