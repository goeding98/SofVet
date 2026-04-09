import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const fmt = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return d; }
};

const fmtShort = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' }); }
  catch { return d; }
};

export default function HCRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [approving, setApproving] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hc_requests')
      .select('*')
      .order('requested_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (req) => {
    setApproving(req.id);
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from('hc_requests').update({
      status:      'aprobada',
      approved_at: now.toISOString(),
      expires_at:  expires.toISOString(),
    }).eq('id', req.id);
    if (error) alert('Error al aprobar: ' + error.message);
    setApproving(null);
    await load();
  };

  const pending = requests.filter(r => r.status === 'pendiente');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ margin:0, fontWeight:800, color:'var(--color-primary)', fontSize:'1.35rem' }}>
            📄 Historias Clínicas Solicitadas
          </h1>
          <p style={{ margin:'0.25rem 0 0', color:'var(--color-text-muted)', fontSize:'0.83rem' }}>
            Revisá las solicitudes, abrí el perfil del paciente, revisá la HC y luego aprobá.
          </p>
        </div>
        <button onClick={load} style={{ padding:'0.4rem 0.85rem', background:'white', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.8rem', color:'var(--color-text-muted)' }}>
          🔄 Actualizar
        </button>
      </div>

      {/* Pending alert */}
      {pending.length > 0 && (
        <div style={{ background:'#fff8e1', border:'1px solid #f5c842', borderRadius:12, padding:'0.85rem 1.25rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <span style={{ fontSize:'1.5rem' }}>🔔</span>
          <div>
            <div style={{ fontWeight:700, color:'#7a5c00', fontSize:'0.92rem' }}>
              {pending.length} solicitud{pending.length > 1 ? 'es' : ''} pendiente{pending.length > 1 ? 's' : ''} de aprobación
            </div>
            <div style={{ color:'#9a7a20', fontSize:'0.78rem', marginTop:'0.15rem' }}>
              Revisá la HC del paciente antes de aprobar.
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'var(--color-text-muted)' }}>Cargando…</div>
      ) : requests.length === 0 ? (
        <div style={{ background:'white', borderRadius:14, padding:'3rem', textAlign:'center', color:'var(--color-text-muted)', border:'1px solid var(--color-border)' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>📭</div>
          <p>No hay solicitudes de historia clínica aún.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {requests.map(req => {
            const isPending  = req.status === 'pendiente';
            const isApproved = req.status === 'aprobada';
            const isExpired  = isApproved && req.expires_at && new Date(req.expires_at) < new Date();

            return (
              <div key={req.id} style={{
                background:'white',
                border:`1px solid ${isPending ? '#f5c842' : isApproved && !isExpired ? '#bbf7d0' : 'var(--color-border)'}`,
                borderRadius:14,
                padding:'1rem 1.25rem',
                display:'flex',
                alignItems:'center',
                gap:'1rem',
                flexWrap:'wrap',
              }}>
                {/* Status dot */}
                <div style={{
                  width:10, height:10, borderRadius:'50%', flexShrink:0,
                  background: isPending ? '#f5c842' : isApproved && !isExpired ? '#22c55e' : '#d1d5db',
                }} />

                {/* Info */}
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontWeight:700, color:'var(--color-primary)', fontSize:'0.92rem' }}>
                    🐾 {req.patient_name}
                    <span style={{ fontWeight:400, color:'var(--color-text-muted)', marginLeft:'0.5rem', fontSize:'0.82rem' }}>
                      — {req.client_name}
                    </span>
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--color-text-muted)', marginTop:'0.2rem' }}>
                    Solicitado: {fmt(req.requested_at)}
                    {isApproved && <> · Aprobado: {fmtShort(req.approved_at)}</>}
                    {isApproved && !isExpired && <> · <span style={{ color:'#15803d', fontWeight:600 }}>Válido hasta {fmtShort(req.expires_at)}</span></>}
                    {isExpired && <> · <span style={{ color:'#c0392b', fontWeight:600 }}>Expirado</span></>}
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  padding:'3px 10px', borderRadius:999, fontSize:'0.7rem', fontWeight:700,
                  background: isPending ? '#fff8e1' : isApproved && !isExpired ? '#dcfce7' : '#f3f4f6',
                  color:      isPending ? '#b8860b' : isApproved && !isExpired ? '#15803d' : '#9ca3af',
                }}>
                  {isPending ? '⏳ Pendiente' : isApproved && !isExpired ? '✅ Aprobada' : '⌛ Expirada'}
                </span>

                {/* Actions */}
                <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                  <button
                    onClick={() => navigate(`/patients/${req.patient_id}`)}
                    style={{ padding:'0.4rem 0.85rem', background:'var(--color-info-bg)', border:'1px solid var(--color-primary)30', borderRadius:8, cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.78rem', fontWeight:600, color:'var(--color-primary)' }}
                  >
                    Ver HC
                  </button>
                  {isPending && (
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={approving === req.id}
                      style={{ padding:'0.4rem 0.85rem', background:'#15803d', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.78rem', fontWeight:700, color:'white', opacity: approving === req.id ? 0.6 : 1 }}
                    >
                      {approving === req.id ? 'Aprobando…' : '✅ Aprobar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
