import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { BENEFICIOS_TOTAL_ANUAL } from '../utils/prepagadaPrecios';
import { nowDate } from '../utils/nowLocal';

const fmtCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
const PLAN_LABEL = { urgencias: 'Urgencias', total: 'Total' };
const ESTADO_OPTS = ['activo', 'en_gracia', 'suspendido', 'cancelado'];
const ESTADO_BADGE = {
  activo:      { bg: '#eafaf0', color: '#1e7d45', label: 'Activo' },
  en_gracia:   { bg: '#fff8e1', color: '#b8860b', label: 'En gracia' },
  suspendido:  { bg: '#fdecea', color: '#c0392b', label: 'Suspendido' },
  cancelado:   { bg: '#f0f2f6', color: '#8A8076', label: 'Cancelado' },
};

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

  const { items: afiliados, edit: editAfiliado } = useStore('prepagadaAfiliados');
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

  const [eventoModal, setEventoModal] = useState(false);
  const [evCosto, setEvCosto] = useState('');
  const [evTipo, setEvTipo] = useState('');
  const [evNotas, setEvNotas] = useState('');
  const [evFactura, setEvFactura] = useState('');
  const [savingEvento, setSavingEvento] = useState(false);

  if (!afiliado) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Afiliado no encontrado.</p>
        <button onClick={() => navigate('/prueba/prepagada')} style={{ color: '#316d74', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>← Volver</button>
      </div>
    );
  }

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

  const costoNum = Number(evCosto.replace(/\D/g, '')) || 0;
  const copago = Math.round(costoNum * 0.10);
  const cubierto = costoNum - copago;

  const handleRegistrarEvento = async () => {
    if (!costoNum) return;
    setSavingEvento(true);
    let err = null;
    const nuevo = await addEvento({
      afiliado_id: afiliadoId,
      patient_id: afiliado.patient_id,
      fecha: nowDate(),
      tipo_evento: evTipo.trim() || null,
      costo_total: costoNum,
      copago,
      cubierto_pp: cubierto,
      factura_copago: evFactura.trim() || null,
      notas: evNotas.trim() || null,
      registrado_por: session?.nombre || session?.username || null,
    }, { onError: (m) => { err = m; } });
    if (!nuevo) { setSavingEvento(false); alert('Error: ' + err); return; }

    await editAfiliado(afiliadoId, { bolsa_consumida_anual: afiliado.bolsa_consumida_anual + cubierto });

    setSavingEvento(false);
    setEventoModal(false);
    setEvCosto(''); setEvTipo(''); setEvNotas(''); setEvFactura('');
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
          <p style={{ color: '#8A8076', fontSize: '0.9rem' }}>Titular: {cliente?.name || '—'} · {fmtCOP(afiliado.precio_mensual)}/mes · Afiliado desde {afiliado.fecha_afiliacion}</p>
        </div>
        <select value={afiliado.estado} onChange={e => editAfiliado(afiliadoId, { estado: e.target.value })} style={{ padding: '0.5rem 0.8rem', borderRadius: 10, border: '1.5px solid #dfe3ea', fontSize: '0.85rem', fontWeight: 600 }}>
          {ESTADO_OPTS.map(o => <option key={o} value={o}>{ESTADO_BADGE[o].label}</option>)}
        </select>
      </div>

      {/* Bolsa */}
      <div style={{ background: 'white', border: '1px solid #e2e6ef', borderRadius: 14, padding: '1.2rem 1.5rem', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5c6470', textTransform: 'uppercase' }}>Bolsa de urgencias {afiliado.bolsa_anio}</span>
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
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5c6470', textTransform: 'uppercase' }}>Eventos de urgencia ({eventosAfiliado.length})</span>
          <button onClick={() => setEventoModal(true)} style={{ padding: '0.5rem 1rem', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>+ Registrar evento</button>
        </div>
        {eventosAfiliado.length === 0 ? (
          <p style={{ color: '#8A8076', fontSize: '0.85rem' }}>Sin eventos registrados.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {eventosAfiliado.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: '#f7f9fc', borderRadius: 10, fontSize: '0.85rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{e.tipo_evento || 'Evento de urgencia'}</div>
                  <div style={{ color: '#8A8076', fontSize: '0.78rem' }}>{e.fecha} · {e.registrado_por}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Total: {fmtCOP(e.costo_total)}</div>
                  <div style={{ color: '#8A8076', fontSize: '0.78rem' }}>Copago {fmtCOP(e.copago)} · P&P {fmtCOP(e.cubierto_pp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {eventoModal && (
        <div onClick={() => setEventoModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #eceff3' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c0392b', margin: 0 }}>🚨 Registrar evento de urgencia</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#8A8076' }}>{mascota?.name}</p>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Motivo / tipo de evento</label>
              <input value={evTipo} onChange={e => setEvTipo(e.target.value)} placeholder="Ej: Trauma por atropello" style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem' }} />

              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Costo total del evento *</label>
              <input inputMode="numeric" value={evCosto} onChange={e => setEvCosto(e.target.value)} placeholder="Ej: 500000" style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem' }} />

              {costoNum > 0 && (
                <div style={{ background: '#f7f9fc', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Copago (10%, paga el tutor)</span><strong>{fmtCOP(copago)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cubre P&amp;P (90%)</span><strong>{fmtCOP(cubierto)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', paddingTop: '0.3rem', borderTop: '1px dashed #dfe3ea' }}><span>Bolsa después de este evento</span><strong style={{ color: (disponible - cubierto) < 0 ? '#c0392b' : '#1c2333' }}>{fmtCOP(disponible - cubierto)}</strong></div>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Factura del copago (opcional)</label>
              <input value={evFactura} onChange={e => setEvFactura(e.target.value)} placeholder="Nº de factura" style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem' }} />

              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#5c6470', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Notas</label>
              <textarea value={evNotas} onChange={e => setEvNotas(e.target.value)} rows={2} style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid #dfe3ea', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1.2rem', resize: 'vertical' }} />

              <div style={{ display: 'flex', gap: '0.7rem' }}>
                <button onClick={() => setEventoModal(false)} style={{ flex: 1, padding: '0.7rem', background: 'white', border: '1px solid #dfe3ea', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleRegistrarEvento} disabled={savingEvento || !costoNum} style={{ flex: 2, padding: '0.7rem', background: (savingEvento || !costoNum) ? '#ccc' : '#c0392b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: (savingEvento || !costoNum) ? 'not-allowed' : 'pointer' }}>
                  {savingEvento ? 'Guardando…' : 'Registrar evento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
