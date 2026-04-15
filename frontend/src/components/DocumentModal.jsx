import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../utils/useStore';
import Button from './Button';

// ── Helpers ────────────────────────────────────────────────────────────────

function fillTemplate(template, data) {
  let out = template;
  Object.entries(data).forEach(([k, v]) => {
    out = out.split(`{{${k}}}`).join(v ?? '___________');
  });
  return out;
}

function isCanvasBlank(canvas) {
  if (!canvas) return true;
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return !Array.from(data).some(v => v !== 0);
}

function getEventPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DocumentModal({
  isOpen,
  onClose,
  document: doc,
  preselectedClientId  = null,
  preselectedPatientId = null,
  session    = null,
  sedeActual = null,
}) {
  const { items: clients  }                              = useStore('clients');
  const { items: patients }                              = useStore('patients');
  const { items: signedDocs, add: addSignedDoc }         = useStore('signedDocuments');

  const [clientId,  setClientId]  = useState('');
  const [patientId, setPatientId] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [tab,       setTab]       = useState('preview');
  const [sigSaved,  setSigSaved]  = useState(false);

  const canvasRef  = useRef(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setClientId(preselectedClientId  ? String(preselectedClientId)  : '');
      setPatientId(preselectedPatientId ? String(preselectedPatientId) : '');
      setMicrochip('');
      setTab('preview');
      setSigSaved(false);
      // canvas clear is deferred until it mounts
      setTimeout(() => clearCanvas(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, doc]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const client         = clients.find(c => c.id === parseInt(clientId));
  const clientPatients = client ? patients.filter(p => p.client_id === client.id) : [];
  const patient        = clientPatients.find(p => p.id === parseInt(patientId));

  const today = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const data = {
    fecha:             today,
    nombre_cliente:    client?.name         || '___________',
    cedula_cliente:    client?.document     || '___________',
    telefono_cliente:  client?.phone        || '___________',
    correo_cliente:    client?.email        || '___________',
    direccion_cliente: client?.address      || '___________',
    nombre_mascota:    patient?.name        || '___________',
    especie:           patient?.species     || '___________',
    raza:              patient?.breed       || '___________',
    sexo:              patient?.sex         || '___________',
    edad:              patient ? `${patient.age} años` : '___________',
    peso:              patient?.weight      || '___________',
    esterilizado:      patient?.esterilizado || '___________',
    caracter:          patient?.caracter    || '___________',
    microchip:         microchip            || '___________',
    numero_historia:   patient ? `#${patient.id}` : '___________',
  };

  const filledHtml = doc ? fillTemplate(doc.template, data) : '';

  // Signed record for this doc+patient combo
  const existingSig = doc && patient
    ? signedDocs.filter(s => s.document_id === doc.id && s.patient_id === patient.id).slice(-1)[0]
    : null;

  // ── Canvas ────────────────────────────────────────────────────────────────
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSigSaved(false);
  }, []);

  const startDraw = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPosRef.current = getEventPos(e, canvasRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const pos    = getEventPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e2d2f';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const stopDraw = () => { drawingRef.current = false; };

  // ── Save signature ─────────────────────────────────────────────────────────
  const handleSaveSignature = () => {
    if (!patient) return alert('Selecciona una mascota antes de guardar la firma.');
    const canvas = canvasRef.current;
    if (isCanvasBlank(canvas)) return alert('Por favor dibuja una firma antes de guardar.');

    addSignedDoc({
      document_id:      doc.id,
      document_nombre:  doc.nombre,
      patient_id:       patient.id,
      patient_name:     patient.name,
      client_name:      client?.name || '',
      signature_data:   canvas.toDataURL(),
      signed_at:        new Date().toLocaleDateString('es-CO'),
    });
    setSigSaved(true);
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const canvas = canvasRef.current;
    const hasSig = !isCanvasBlank(canvas);
    const sigBlock = hasSig
      ? `<div style="margin:32px 0;padding:16px;border:1px solid #dde8e6;border-radius:8px;display:inline-block;">
           <p style="font-size:12px;font-weight:bold;color:#316d74;margin:0 0 8px;">Firma digital del propietario — ${data.nombre_cliente}</p>
           <img src="${canvas.toDataURL()}" style="max-width:380px;display:block;border:1px solid #eee;"/>
           <p style="font-size:11px;color:#666;margin:6px 0 0;">Firmado digitalmente el ${today}</p>
         </div>`
      : '';

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${doc?.nombre || 'Documento'}</title>
<style>@page{margin:20mm}body{margin:0;font-family:Arial,sans-serif}@media print{.no-print{display:none}}</style>
</head><body>${filledHtml}${sigBlock}
<script>window.onload=function(){window.print()};<\/script></body></html>`;

    const win = window.open('', '_blank');
    if (!win) return alert('Tu navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio.');
    win.document.write(html);
    win.document.close();

    // Registrar impresión en signed_documents
    if (patient) {
      addSignedDoc({
        document_id:     doc.id,
        document_nombre: doc.nombre,
        patient_id:      patient.id,
        patient_name:    patient.name,
        client_name:     client?.name || '',
        signature_data:  null,
        signed_at:       new Date().toLocaleDateString('es-CO'),
        tipo:            'impresion',
        sede_id:         sedeActual?.id   || null,
        veterinario:     session?.nombre  || null,
      });
    }
  };

  if (!isOpen || !doc) return null;

  const selectable = !preselectedClientId;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(3px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:960, maxHeight:'95vh', display:'flex', flexDirection:'column', overflow:'hidden' }}
      >
        {/* Header */}
        <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--color-bg)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <span style={{ fontSize:'1.5rem' }}>{doc.icono}</span>
            <div>
              <h3 style={{ fontFamily:'var(--font-title)', color:'var(--color-primary)', fontSize:'1rem', margin:0 }}>{doc.nombre}</h3>
              <p style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', margin:0 }}>{doc.descripcion}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-text-muted)' }}>×</button>
        </div>

        {/* Selectors — hidden if both are preselected */}
        {selectable && (
          <div style={{ padding:'0.75rem 1.5rem', borderBottom:'1px solid var(--color-border)', display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap', background:'var(--color-white)', flexShrink:0 }}>
            <Selector label="CLIENTE" value={clientId} onChange={v => { setClientId(v); setPatientId(''); }}>
              <option value="">— Seleccionar —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Selector>
            <Selector label="MASCOTA" value={patientId} onChange={setPatientId} disabled={!client}>
              <option value="">— Seleccionar —</option>
              {clientPatients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
            </Selector>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <label style={lblStyle}>MICROCHIP</label>
              <input value={microchip} onChange={e => setMicrochip(e.target.value)} placeholder="Opcional"
                style={{ width:130, padding:'0.45rem 0.65rem', fontSize:'0.85rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)' }} />
            </div>
          </div>
        )}

        {/* If preselected, show compact patient badge */}
        {!selectable && patient && (
          <div style={{ padding:'0.6rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'var(--color-info-bg)', flexShrink:0, display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.82rem', color:'var(--color-primary)' }}>
            🐾 <strong>{patient.name}</strong> &nbsp;·&nbsp; {patient.species} &nbsp;·&nbsp; {client?.name}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <label style={lblStyle}>MICROCHIP</label>
              <input value={microchip} onChange={e => setMicrochip(e.target.value)} placeholder="Opcional"
                style={{ width:120, padding:'0.35rem 0.6rem', fontSize:'0.8rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)' }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--color-border)', flexShrink:0 }}>
          {[['preview','📄 Vista previa'],['sign','✍️ Firma digital']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding:'0.65rem 1.25rem', border:'none', borderBottom: tab===k ? '2px solid var(--color-primary)' : '2px solid transparent', background:'none', color: tab===k ? 'var(--color-primary)' : 'var(--color-text-muted)', fontFamily:'var(--font-body)', fontSize:'0.85rem', fontWeight: tab===k ? 600 : 400, cursor:'pointer' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto' }}>

          {/* Preview */}
          {tab === 'preview' && (
            <div style={{ padding:'1.5rem' }}>
              {existingSig && (
                <div style={{ marginBottom:'1rem', padding:'0.65rem 1rem', background:'var(--color-success-bg)', border:'1px solid var(--color-success)', borderRadius:'var(--radius-md)', fontSize:'0.82rem', color:'var(--color-success)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  ✅ <strong>Firmado digitalmente el {existingSig.signed_at}</strong> — {existingSig.client_name}
                </div>
              )}
              <div style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', background:'#fff', boxShadow:'inset 0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}
                dangerouslySetInnerHTML={{ __html: filledHtml }}
              />
            </div>
          )}

          {/* Signature */}
          {tab === 'sign' && (
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>

              {/* Existing sigs list */}
              {existingSig && (
                <div style={{ width:'100%', maxWidth:640, padding:'0.85rem 1rem', background:'var(--color-success-bg)', border:'1px solid var(--color-success)', borderRadius:'var(--radius-md)', fontSize:'0.82rem', color:'var(--color-success)', display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <span style={{ fontSize:'1.2rem' }}>✅</span>
                  <div>
                    <strong>Firmado digitalmente el {existingSig.signed_at}</strong><br/>
                    <span style={{ color:'var(--color-text-muted)', fontSize:'0.76rem' }}>Propietario: {existingSig.client_name} · Mascota: {existingSig.patient_name}</span>
                  </div>
                  {existingSig.signature_data && (
                    <img src={existingSig.signature_data} alt="Firma" style={{ maxHeight:50, marginLeft:'auto', border:'1px solid #ccc', borderRadius:4 }} />
                  )}
                </div>
              )}

              <div style={{ textAlign:'center', maxWidth:520 }}>
                <p style={{ fontSize:'0.9rem', color:'var(--color-text)', fontWeight:600, marginBottom:'0.25rem' }}>
                  {sigSaved ? '✅ Firma guardada correctamente' : 'Firma del propietario'}
                </p>
                <p style={{ fontSize:'0.8rem', color:'var(--color-text-muted)', marginBottom:'1rem' }}>
                  Dibuja la firma con el mouse o con el dedo (pantallas táctiles).
                </p>
              </div>

              <div style={{ border:`2px dashed ${sigSaved ? 'var(--color-success)' : 'var(--color-primary)'}`, borderRadius:'var(--radius-md)', overflow:'hidden', background:'#fafffe', cursor:'crosshair', userSelect:'none' }}>
                <canvas
                  ref={canvasRef}
                  width={620}
                  height={200}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                  style={{ display:'block', maxWidth:'100%' }}
                />
              </div>

              <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', justifyContent:'center' }}>
                <button onClick={clearCanvas} style={{ padding:'0.4rem 1rem', fontSize:'0.8rem', background:'var(--color-bg)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', color:'var(--color-text-muted)' }}>
                  🗑 Limpiar firma
                </button>
                <button
                  onClick={handleSaveSignature}
                  disabled={sigSaved}
                  style={{ padding:'0.4rem 1.1rem', fontSize:'0.8rem', background: sigSaved ? 'var(--color-success)' : 'var(--color-primary)', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor: sigSaved ? 'default' : 'pointer', fontFamily:'var(--font-body)', fontWeight:600 }}
                >
                  {sigSaved ? '✅ Firma guardada' : '💾 Guardar firma'}
                </button>
              </div>

              {sigSaved && (
                <div style={{ background:'var(--color-success-bg)', border:'1px solid var(--color-success)', borderRadius:'var(--radius-md)', padding:'0.75rem 1.25rem', fontSize:'0.82rem', color:'var(--color-success)', textAlign:'center', maxWidth:480 }}>
                  ✅ <strong>Firma guardada el {today}</strong><br/>
                  <span style={{ fontSize:'0.76rem', color:'var(--color-text-muted)' }}>La firma quedó registrada en el sistema. Usa <em>"Imprimir / Descargar"</em> para obtener el documento firmado.</span>
                </div>
              )}

              <div style={{ background:'var(--color-info-bg)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', fontSize:'0.8rem', color:'var(--color-text-muted)', maxWidth:520, textAlign:'center' }}>
                💡 La firma se adjuntará al pie del documento cuando uses <strong>"Imprimir / Descargar"</strong>.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, background:'var(--color-bg)' }}>
          <div style={{ fontSize:'0.78rem', color:'var(--color-text-muted)' }}>
            {client
              ? <>📋 {client.name}{patient ? ` · ${patient.name}` : ' · Sin mascota'}</>
              : 'Selecciona un cliente para personalizar el documento'}
          </div>
          <div style={{ display:'flex', gap:'0.75rem' }}>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
            <Button variant="primary" onClick={handlePrint}>🖨️ Imprimir / Descargar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
const lblStyle = { fontSize:'0.75rem', fontWeight:600, color:'var(--color-text-muted)', whiteSpace:'nowrap' };

function Selector({ label, value, onChange, disabled, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flex:1, minWidth:180 }}>
      <label style={lblStyle}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{ flex:1, padding:'0.45rem 0.75rem', fontSize:'0.85rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)' }}>
        {children}
      </select>
    </div>
  );
}
