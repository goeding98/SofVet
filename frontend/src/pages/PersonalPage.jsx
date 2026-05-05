import { useState, useMemo } from 'react';
import { useStore } from '../utils/useStore';
import { useAuth } from '../utils/useAuth';
import { SEDES } from '../utils/useSede';

// ── Constants ──────────────────────────────────────────────────────────────────
const GRUPOS = [
  { value: 'medico_hospitalizacion', label: 'Médico Hospitalización' },
  { value: 'medico_consulta',        label: 'Médico Consulta' },
  { value: 'auxiliar',               label: 'Auxiliar' },
  { value: 'admin',                  label: 'Admin / Coordinador' },
  { value: 'caja',                   label: 'Caja' },
  { value: 'otro',                   label: 'Otro' },
];
const GRUPO_ORDER = ['medico_hospitalizacion','medico_consulta','auxiliar','admin','caja','otro'];
const GRUPO_LABELS = Object.fromEntries(GRUPOS.map(g => [g.value, g.label]));

const TURNO_CFG = {
  DIA:      { label:'DIA', bg:'#bbf7d0', color:'#15803d', hi:'06:00', hf:'18:00' },
  NOC:      { label:'NOC', bg:'#bfdbfe', color:'#1e40af', hi:'18:00', hf:'06:00' },
  DESCANSO: { label:'D',   bg:'#f1f5f9', color:'#94a3b8', hi:null,    hf:null    },
};

const TIPOS_PERMISO = [
  { value:'remunerado',    label:'Permiso remunerado',    color:'#2e7d50' },
  { value:'no_remunerado', label:'Permiso no remunerado', color:'#b8860b' },
  { value:'vacaciones',    label:'Vacaciones',            color:'#2e5cbf' },
  { value:'incapacidad',   label:'Incapacidad',           color:'#b45309' },
];

const MAX_HORAS    = 180;
const DIAS_SEMANA  = ['D','L','M','W','J','V','S'];

function currentMonth() { return new Date().toISOString().slice(0,7); }

function calcHoras(tipo, hi, hf) {
  if (tipo === 'DESCANSO' || !hi || !hf) return 0;
  const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const mi = toMin(hi), mf = toMin(hf);
  return parseFloat(((mf > mi ? mf - mi : 1440 - mi + mf) / 60).toFixed(1));
}

function turnoLabel(tipo, hi, hf) {
  if (tipo === 'DESCANSO') return 'D';
  if (TURNO_CFG[tipo])     return TURNO_CFG[tipo].label;
  if (!hi || !hf)          return '?';
  const fmt = t => t.slice(0,5).replace(':00','').replace(/^0/,'');
  return `${fmt(hi)}-${fmt(hf)}`;
}

function turnoBg(tipo) {
  return TURNO_CFG[tipo]?.bg || '#fef9c3';
}
function turnoColor(tipo) {
  return TURNO_CFG[tipo]?.color || '#b8860b';
}

function calcVacAcumulados(fechaIngreso, diasPorAño = 15) {
  if (!fechaIngreso) return 0;
  const dias = (Date.now() - new Date(fechaIngreso)) / (1000*60*60*24);
  return Math.round((dias / 365) * diasPorAño * 10) / 10;
}

function daysInMonth(mes) {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function dayOfWeek(mes, day) {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m-1, day).getDay();
}

const lSt = { display:'block', fontSize:'0.72rem', fontWeight:700, marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--color-text)' };
const iSt = { width:'100%', padding:'0.5rem 0.65rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.85rem', boxSizing:'border-box' };

// ── EmpleadoModal ──────────────────────────────────────────────────────────────
function EmpleadoModal({ isOpen, onClose, onSave, empleados, initialData }) {
  const isEdit = !!initialData?.id;
  const [nombre,    setNombre]    = useState('');
  const [rol,       setRol]       = useState('');
  const [sedeId,    setSedeId]    = useState('');
  const [grupo,     setGrupo]     = useState('medico_hospitalizacion');
  const [ingreso,   setIngreso]   = useState('');
  const [vacDias,   setVacDias]   = useState(15);
  const [parId,     setParId]     = useState('');
  const [notas,     setNotas]     = useState('');

  useState(() => {
    if (isOpen && initialData) {
      setNombre(initialData.nombre || '');
      setRol(initialData.rol || '');
      setSedeId(initialData.sede_id ? String(initialData.sede_id) : '');
      setGrupo(initialData.grupo || 'medico_hospitalizacion');
      setIngreso(initialData.fecha_ingreso || '');
      setVacDias(initialData['vacaciones_dias_año'] || 15);
      setParId(initialData.par_id ? String(initialData.par_id) : '');
      setNotas(initialData.notas || '');
    } else if (isOpen) {
      setNombre(''); setRol(''); setSedeId(''); setGrupo('medico_hospitalizacion');
      setIngreso(''); setVacDias(15); setParId(''); setNotas('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!nombre.trim()) return alert('El nombre es requerido.');
    onSave({
      nombre: nombre.trim(), rol: rol.trim() || null,
      sede_id: sedeId ? parseInt(sedeId) : null,
      grupo, fecha_ingreso: ingreso || null,
      'vacaciones_dias_año': parseInt(vacDias) || 15,
      par_id: parId ? parseInt(parId) : null,
      notas: notas.trim() || null,
    });
    onClose();
  };

  const otrosEmpleados = empleados.filter(e => e.id !== initialData?.id);

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:520, overflow:'hidden' }}>
        <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#f0f4ff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0, fontFamily:'var(--font-title)', color:'#2e5cbf', fontSize:'1rem' }}>{isEdit ? '✏️ Editar empleado' : '👤 Nuevo empleado'}</h3>
          <button onClick={onClose} style={{ width:32, height:32, background:'white', border:'1px solid var(--color-border)', borderRadius:'50%', cursor:'pointer', fontSize:'1rem' }}>×</button>
        </div>
        <div style={{ padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div><label style={lSt}>Nombre completo *</label><input value={nombre} onChange={e=>setNombre(e.target.value)} style={iSt} placeholder="Ej: Jessica Hincapié" /></div>
            <div><label style={lSt}>Rol / Cargo</label><input value={rol} onChange={e=>setRol(e.target.value)} style={iSt} placeholder="Ej: Médico Veterinario" /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div>
              <label style={lSt}>Grupo</label>
              <select value={grupo} onChange={e=>setGrupo(e.target.value)} style={iSt}>
                {GRUPOS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lSt}>Sede principal</label>
              <select value={sedeId} onChange={e=>setSedeId(e.target.value)} style={iSt}>
                <option value="">— Seleccionar —</option>
                {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div><label style={lSt}>Fecha de ingreso</label><input type="date" value={ingreso} onChange={e=>setIngreso(e.target.value)} style={iSt} /></div>
            <div><label style={lSt}>Días vacaciones / año</label><input type="number" value={vacDias} onChange={e=>setVacDias(e.target.value)} min="1" max="30" style={iSt} /></div>
          </div>
          <div>
            <label style={lSt}>Pareja (turno compartido)</label>
            <select value={parId} onChange={e=>setParId(e.target.value)} style={iSt}>
              <option value="">— Sin pareja —</option>
              {otrosEmpleados.map(e => <option key={e.id} value={e.id}>{e.nombre} ({GRUPO_LABELS[e.grupo] || e.grupo})</option>)}
            </select>
          </div>
          <div><label style={lSt}>Notas</label><textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={2} style={{ ...iSt, resize:'vertical' }} /></div>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', paddingTop:'0.25rem' }}>
            <button onClick={onClose} style={{ padding:'0.55rem 1.25rem', background:'white', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.85rem', color:'var(--color-text-muted)' }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding:'0.55rem 1.5rem', background:'#2e5cbf', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.85rem', fontWeight:600 }}>
              {isEdit ? '💾 Guardar cambios' : '+ Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TurnoPopover ───────────────────────────────────────────────────────────────
function TurnoPopover({ emp, fecha, turnoActual, onSave, onClose }) {
  const [tipo,  setTipo]  = useState(turnoActual?.tipo || 'DESCANSO');
  const [hi,    setHi]    = useState(turnoActual?.hora_inicio || '');
  const [hf,    setHf]    = useState(turnoActual?.hora_fin || '');

  const selectPreset = (t) => {
    setTipo(t);
    if (TURNO_CFG[t]) { setHi(TURNO_CFG[t].hi || ''); setHf(TURNO_CFG[t].hf || ''); }
  };

  const handleSave = () => {
    const finalHi = TURNO_CFG[tipo]?.hi !== undefined ? TURNO_CFG[tipo].hi : hi;
    const finalHf = TURNO_CFG[tipo]?.hf !== undefined ? TURNO_CFG[tipo].hf : hf;
    onSave({ tipo, hora_inicio: finalHi, hora_fin: finalHf });
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1300, background:'transparent' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'white', borderRadius:'var(--radius-lg)', boxShadow:'0 8px 32px rgba(0,0,0,0.18)', padding:'1.1rem', minWidth:280, zIndex:1301 }}>
        <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', color:'var(--color-text-muted)', marginBottom:'0.65rem' }}>
          {emp.nombre} · {fecha}
        </div>
        <div style={{ display:'flex', gap:'0.4rem', marginBottom:'0.75rem', flexWrap:'wrap' }}>
          {Object.entries(TURNO_CFG).map(([t, cfg]) => (
            <button key={t} onClick={() => selectPreset(t)}
              style={{ padding:'0.35rem 0.75rem', borderRadius:999, border:`2px solid ${tipo===t ? cfg.color : 'var(--color-border)'}`, background: tipo===t ? cfg.bg : 'white', color: tipo===t ? cfg.color : 'var(--color-text-muted)', fontWeight:700, fontSize:'0.78rem', cursor:'pointer', fontFamily:'var(--font-body)' }}>
              {cfg.label}
            </button>
          ))}
          <button onClick={() => setTipo('CUSTOM')}
            style={{ padding:'0.35rem 0.75rem', borderRadius:999, border:`2px solid ${tipo==='CUSTOM' ? '#b8860b' : 'var(--color-border)'}`, background: tipo==='CUSTOM' ? '#fef9c3' : 'white', color: tipo==='CUSTOM' ? '#b8860b' : 'var(--color-text-muted)', fontWeight:700, fontSize:'0.78rem', cursor:'pointer', fontFamily:'var(--font-body)' }}>
            Personalizado
          </button>
        </div>

        {(tipo === 'CUSTOM') && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'0.75rem' }}>
            <div><label style={{ ...lSt, fontSize:'0.65rem' }}>Entrada</label><input type="time" value={hi} onChange={e=>setHi(e.target.value)} style={{ ...iSt, fontSize:'0.82rem' }} /></div>
            <div><label style={{ ...lSt, fontSize:'0.65rem' }}>Salida</label><input type="time" value={hf} onChange={e=>setHf(e.target.value)} style={{ ...iSt, fontSize:'0.82rem' }} /></div>
          </div>
        )}

        {tipo !== 'DESCANSO' && (
          <div style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', marginBottom:'0.65rem' }}>
            {calcHoras(tipo === 'CUSTOM' ? 'CUSTOM' : tipo, TURNO_CFG[tipo]?.hi || hi, TURNO_CFG[tipo]?.hf || hf)}h
          </div>
        )}

        <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'0.35rem 0.85rem', background:'white', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.8rem', color:'var(--color-text-muted)' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:'0.35rem 1rem', background:'#2e5cbf', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.8rem', fontWeight:600 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── PermisoModal ───────────────────────────────────────────────────────────────
function PermisoModal({ isOpen, onClose, onSave, empleados, session }) {
  const [empId, setEmpId]    = useState('');
  const [tipo,  setTipo]     = useState('remunerado');
  const [fi,    setFi]       = useState('');
  const [ff,    setFf]       = useState('');
  const [motivo,setMotivo]   = useState('');

  if (!isOpen) return null;

  const calcDias = () => {
    if (!fi || !ff) return 0;
    return Math.max(0, Math.round((new Date(ff) - new Date(fi)) / 86400000) + 1);
  };

  const handleSave = () => {
    if (!empId) return alert('Selecciona el empleado.');
    if (!fi || !ff) return alert('Las fechas son requeridas.');
    if (new Date(ff) < new Date(fi)) return alert('La fecha fin debe ser mayor o igual a la de inicio.');
    onSave({ empleado_id: parseInt(empId), tipo, fecha_inicio: fi, fecha_fin: ff, dias: calcDias(), motivo: motivo.trim() || null, solicitado_por: session?.nombre || null });
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:480, overflow:'hidden' }}>
        <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#f0fdf4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0, fontFamily:'var(--font-title)', color:'#2e7d50', fontSize:'1rem' }}>📋 Nueva solicitud</h3>
          <button onClick={onClose} style={{ width:32, height:32, background:'white', border:'1px solid var(--color-border)', borderRadius:'50%', cursor:'pointer', fontSize:'1rem' }}>×</button>
        </div>
        <div style={{ padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          <div>
            <label style={lSt}>Empleado *</label>
            <select value={empId} onChange={e=>setEmpId(e.target.value)} style={iSt}>
              <option value="">— Seleccionar —</option>
              {empleados.filter(e=>e.activo!==false).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={lSt}>Tipo *</label>
            <select value={tipo} onChange={e=>setTipo(e.target.value)} style={iSt}>
              {TIPOS_PERMISO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div><label style={lSt}>Fecha inicio *</label><input type="date" value={fi} onChange={e=>setFi(e.target.value)} style={iSt} /></div>
            <div><label style={lSt}>Fecha fin *</label><input type="date" value={ff} onChange={e=>setFf(e.target.value)} style={iSt} /></div>
          </div>
          {fi && ff && <div style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', background:'var(--color-bg)', padding:'0.4rem 0.75rem', borderRadius:'var(--radius-sm)' }}>{calcDias()} día{calcDias()!==1?'s':''}</div>}
          <div><label style={lSt}>Motivo</label><textarea value={motivo} onChange={e=>setMotivo(e.target.value)} rows={2} style={{ ...iSt, resize:'vertical' }} placeholder="Descripción del permiso..." /></div>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <button onClick={onClose} style={{ padding:'0.55rem 1.25rem', background:'white', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.85rem', color:'var(--color-text-muted)' }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding:'0.55rem 1.5rem', background:'#2e7d50', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.85rem', fontWeight:600 }}>📋 Solicitar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PersonalPage() {
  const { session } = useAuth();
  const { items: empleados, add: addEmpleado, edit: editEmpleado } = useStore('empleados');
  const { items: turnos,    add: addTurno,    edit: editTurno }    = useStore('turnos');
  const { items: permisos,  add: addPermiso,  edit: editPermiso }  = useStore('permisos_empleados');

  const [tab,         setTab]         = useState('calendario');
  const [mes,         setMes]         = useState(currentMonth());
  const [sedeFilter,  setSedeFilter]  = useState(2); // Colseguros por defecto
  const [empModal,    setEmpModal]    = useState(false);
  const [editingEmp,  setEditingEmp]  = useState(null);
  const [turnoEdit,   setTurnoEdit]   = useState(null); // { emp, fecha }
  const [permisoModal,setPermisoModal]= useState(false);
  const [filtroEstado,setFiltroEstado]= useState('todos');
  const [comentario,  setComentario]  = useState('');
  const [resolving,   setResolving]   = useState(null); // permiso being approved/rejected

  const empleadoMap = useMemo(() => Object.fromEntries(empleados.map(e => [e.id, e])), [empleados]);
  const turnoMap    = useMemo(() => {
    const m = {};
    turnos.forEach(t => { m[`${t.empleado_id}_${t.fecha}`] = t; });
    return m;
  }, [turnos]);

  const empsFiltrados = useMemo(() =>
    empleados.filter(e => e.activo !== false && (!sedeFilter || e.sede_id === sedeFilter))
      .sort((a, b) => GRUPO_ORDER.indexOf(a.grupo) - GRUPO_ORDER.indexOf(b.grupo)),
    [empleados, sedeFilter]);

  const dias = daysInMonth(mes);
  const diasArr = Array.from({ length: dias }, (_, i) => i + 1);

  // Horas por empleado en el mes
  const horasPorEmp = useMemo(() => {
    const m = {};
    empleados.forEach(e => {
      m[e.id] = turnos
        .filter(t => t.empleado_id === e.id && t.fecha?.startsWith(mes))
        .reduce((s, t) => s + calcHoras(t.tipo, t.hora_inicio, t.hora_fin), 0);
    });
    return m;
  }, [turnos, mes, empleados]);

  // Vacaciones consumidas por empleado
  const vacConsumidasPorEmp = useMemo(() => {
    const m = {};
    empleados.forEach(e => {
      m[e.id] = permisos
        .filter(p => p.empleado_id === e.id && p.tipo === 'vacaciones' && p.estado === 'aprobado')
        .reduce((s, p) => s + (p.dias || 0), 0);
    });
    return m;
  }, [permisos, empleados]);

  const handleSaveEmpleado = async (data) => {
    if (editingEmp) { await editEmpleado(editingEmp.id, data); setEditingEmp(null); }
    else             { await addEmpleado(data); }
  };

  const handleSaveTurno = async ({ tipo, hora_inicio, hora_fin }) => {
    const { emp, fecha } = turnoEdit;
    const key = `${emp.id}_${fecha}`;
    const existing = turnoMap[key];
    if (existing) {
      await editTurno(existing.id, { tipo, hora_inicio, hora_fin });
    } else {
      await addTurno({ empleado_id: emp.id, fecha, tipo, hora_inicio, hora_fin, sede_id: sedeFilter });
    }
    setTurnoEdit(null);
  };

  const handleSavePermiso = async (data) => {
    await addPermiso({ ...data, estado: 'pendiente', fecha_solicitud: new Date().toISOString().split('T')[0] });
  };

  const handleResolver = async (permiso, estado) => {
    await editPermiso(permiso.id, {
      estado,
      aprobado_por:    session?.nombre || null,
      comentario_admin: comentario.trim() || null,
      fecha_resolucion: new Date().toISOString().split('T')[0],
    });
    setResolving(null);
    setComentario('');
  };

  const mesLabel = (() => {
    const [y, m] = mes.split('-');
    return new Date(parseInt(y), parseInt(m)-1, 1).toLocaleDateString('es-CO', { month:'long', year:'numeric' });
  })();

  const tabSt = (t) => ({
    padding:'0.55rem 1.25rem', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer',
    fontFamily:'var(--font-body)', fontSize:'0.85rem', fontWeight: tab===t ? 700 : 400,
    background: tab===t ? '#2e5cbf' : 'var(--color-bg)',
    color: tab===t ? 'white' : 'var(--color-text-muted)',
  });

  const permisosVis = useMemo(() => {
    const arr = [...permisos].sort((a,b) => b.created_at?.localeCompare(a.created_at));
    if (filtroEstado === 'todos') return arr;
    return arr.filter(p => p.estado === filtroEstado);
  }, [permisos, filtroEstado]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 3rem' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-title)', fontSize:'1.5rem', color:'var(--color-primary)', margin:'0 0 0.25rem' }}>👥 Personal</h1>
          <p style={{ margin:0, fontSize:'0.82rem', color:'var(--color-text-muted)' }}>Calendario de turnos, empleados y gestión de permisos</p>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {tab === 'empleados' && (
            <button onClick={() => { setEditingEmp(null); setEmpModal(true); }}
              style={{ padding:'0.5rem 1.1rem', background:'#2e5cbf', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.85rem', fontWeight:600 }}>
              + Nuevo empleado
            </button>
          )}
          {tab === 'permisos' && (
            <button onClick={() => setPermisoModal(true)}
              style={{ padding:'0.5rem 1.1rem', background:'#2e7d50', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.85rem', fontWeight:600 }}>
              + Nueva solicitud
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.5rem' }}>
        <button style={tabSt('calendario')} onClick={() => setTab('calendario')}>📅 Calendario</button>
        <button style={tabSt('empleados')}  onClick={() => setTab('empleados')}>👤 Empleados</button>
        <button style={tabSt('permisos')}   onClick={() => setTab('permisos')}>📋 Permisos</button>
      </div>

      {/* ── TAB: CALENDARIO ── */}
      {tab === 'calendario' && (
        <div>
          {/* Controls */}
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap' }}>
            <input type="month" value={mes} onChange={e=>setMes(e.target.value)}
              style={{ padding:'0.4rem 0.65rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.82rem' }} />
            <span style={{ fontSize:'0.82rem', color:'var(--color-text-muted)', textTransform:'capitalize' }}>{mesLabel}</span>
            <select value={sedeFilter} onChange={e=>setSedeFilter(parseInt(e.target.value))}
              style={{ padding:'0.4rem 0.65rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.82rem' }}>
              {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <span style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', marginLeft:'auto' }}>
              Haz clic en una celda para asignar turno
            </span>
          </div>

          {empsFiltrados.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--color-text-muted)' }}>
              <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>👥</div>
              <p>No hay empleados registrados para esta sede.</p>
              <button onClick={() => setTab('empleados')} style={{ marginTop:'0.5rem', padding:'0.4rem 1rem', background:'#2e5cbf', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.82rem' }}>
                Ir a Empleados →
              </button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              {GRUPO_ORDER.map(grupo => {
                const emps = empsFiltrados.filter(e => e.grupo === grupo);
                if (!emps.length) return null;
                return (
                  <div key={grupo} style={{ marginBottom:'1.5rem' }}>
                    <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--color-text-muted)', marginBottom:'0.4rem', padding:'0 2px' }}>
                      {GRUPO_LABELS[grupo]}
                    </div>
                    <div style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
                      <table style={{ borderCollapse:'collapse', fontSize:'0.72rem', width:'100%' }}>
                        <thead>
                          <tr style={{ background:'var(--color-bg)', borderBottom:'1px solid var(--color-border)' }}>
                            <th style={{ padding:'0.45rem 0.75rem', textAlign:'left', fontWeight:700, color:'var(--color-text-muted)', whiteSpace:'nowrap', minWidth:140, position:'sticky', left:0, background:'var(--color-bg)', zIndex:1 }}>Empleado</th>
                            {diasArr.map(d => (
                              <th key={d} style={{ padding:'0.25rem 0', textAlign:'center', fontWeight:600, color:'var(--color-text-muted)', minWidth:36, width:36 }}>
                                <div>{d}</div>
                                <div style={{ fontSize:'0.6rem', fontWeight:400 }}>{DIAS_SEMANA[dayOfWeek(mes,d)]}</div>
                              </th>
                            ))}
                            <th style={{ padding:'0.45rem 0.5rem', textAlign:'center', fontWeight:700, color:'var(--color-text-muted)', whiteSpace:'nowrap', minWidth:60 }}>Horas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emps.map((emp, ei) => {
                            const horas = horasPorEmp[emp.id] || 0;
                            const pasado = horas > MAX_HORAS;
                            return (
                              <tr key={emp.id} style={{ borderTop: ei > 0 ? '1px solid var(--color-border)' : 'none' }}>
                                <td style={{ padding:'0.35rem 0.75rem', fontWeight:600, whiteSpace:'nowrap', position:'sticky', left:0, background:'white', zIndex:1, borderRight:'1px solid var(--color-border)' }}>
                                  {emp.nombre}
                                  {emp.par_id && empleadoMap[emp.par_id] && (
                                    <div style={{ fontSize:'0.62rem', color:'var(--color-text-muted)', fontWeight:400 }}>par: {empleadoMap[emp.par_id].nombre}</div>
                                  )}
                                </td>
                                {diasArr.map(d => {
                                  const fecha = `${mes}-${String(d).padStart(2,'0')}`;
                                  const t = turnoMap[`${emp.id}_${fecha}`];
                                  const isDom = dayOfWeek(mes, d) === 0;
                                  return (
                                    <td key={d} onClick={() => setTurnoEdit({ emp, fecha })}
                                      style={{ padding:'2px', textAlign:'center', cursor:'pointer', background: isDom ? '#fafafa' : 'white', borderLeft:'1px solid #f0f0f0' }}>
                                      {t && t.tipo !== 'DESCANSO' ? (
                                        <span style={{ display:'inline-block', background:turnoBg(t.tipo), color:turnoColor(t.tipo), borderRadius:4, padding:'2px 3px', fontSize:'0.65rem', fontWeight:700, lineHeight:1.3, minWidth:28 }}>
                                          {turnoLabel(t.tipo, t.hora_inicio, t.hora_fin)}
                                        </span>
                                      ) : t ? (
                                        <span style={{ color:'#94a3b8', fontSize:'0.65rem', fontWeight:600 }}>D</span>
                                      ) : null}
                                    </td>
                                  );
                                })}
                                <td style={{ padding:'0.35rem 0.5rem', textAlign:'center', fontWeight:700, whiteSpace:'nowrap', color: pasado ? '#dc2626' : '#15803d', background: pasado ? '#fef2f2' : '#f0fdf4', borderLeft:'1px solid var(--color-border)' }}>
                                  {horas}h
                                  {pasado && <div style={{ fontSize:'0.6rem', fontWeight:600 }}>+{Math.round(horas-MAX_HORAS)}h</div>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leyenda */}
          <div style={{ display:'flex', gap:'1rem', alignItems:'center', flexWrap:'wrap', marginTop:'0.75rem' }}>
            {Object.entries(TURNO_CFG).map(([t, cfg]) => (
              <span key={t} style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', color:'var(--color-text-muted)' }}>
                <span style={{ background:cfg.bg, color:cfg.color, padding:'1px 6px', borderRadius:4, fontWeight:700, fontSize:'0.65rem' }}>{cfg.label}</span>
                {t === 'DIA' ? '6AM–6PM (12h)' : t === 'NOC' ? '6PM–6AM (12h)' : 'Descanso'}
              </span>
            ))}
            <span style={{ fontSize:'0.72rem', color:'#dc2626', fontWeight:600 }}>Rojo = supera {MAX_HORAS}h/mes</span>
          </div>
        </div>
      )}

      {/* ── TAB: EMPLEADOS ── */}
      {tab === 'empleados' && (
        <div>
          {empleados.filter(e => e.activo !== false).length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--color-text-muted)' }}>
              <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>👤</div>
              <p>No hay empleados registrados aún.</p>
            </div>
          ) : (
            <div style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', overflow:'hidden', overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                <thead>
                  <tr style={{ background:'var(--color-bg)', borderBottom:'1px solid var(--color-border)' }}>
                    {['Nombre','Grupo','Sede','Ingreso','Vac. acum.','Vac. usadas','Saldo','Pareja',''].map(h => (
                      <th key={h} style={{ padding:'0.55rem 0.75rem', textAlign:'left', fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...empleados].filter(e => e.activo !== false)
                    .sort((a,b) => GRUPO_ORDER.indexOf(a.grupo) - GRUPO_ORDER.indexOf(b.grupo))
                    .map((e, i, arr) => {
                      const acum     = calcVacAcumulados(e.fecha_ingreso, e['vacaciones_dias_año']);
                      const usados   = vacConsumidasPorEmp[e.id] || 0;
                      const saldo    = Math.round((acum - usados) * 10) / 10;
                      const par      = e.par_id ? empleadoMap[e.par_id] : null;
                      return (
                        <tr key={e.id} style={{ borderBottom: i < arr.length-1 ? '1px solid var(--color-border)' : 'none' }}>
                          <td style={{ padding:'0.55rem 0.75rem', fontWeight:600 }}>
                            {e.nombre}
                            {e.rol && <div style={{ fontSize:'0.68rem', color:'var(--color-text-muted)', fontWeight:400 }}>{e.rol}</div>}
                          </td>
                          <td style={{ padding:'0.55rem 0.75rem', color:'var(--color-text-muted)' }}>{GRUPO_LABELS[e.grupo] || e.grupo}</td>
                          <td style={{ padding:'0.55rem 0.75rem', color:'var(--color-text-muted)' }}>{SEDES.find(s => s.id === e.sede_id)?.nombre || '—'}</td>
                          <td style={{ padding:'0.55rem 0.75rem', color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>{e.fecha_ingreso || '—'}</td>
                          <td style={{ padding:'0.55rem 0.75rem', fontWeight:600, color:'#2e5cbf' }}>{acum}d</td>
                          <td style={{ padding:'0.55rem 0.75rem', color:'var(--color-text-muted)' }}>{usados}d</td>
                          <td style={{ padding:'0.55rem 0.75rem', fontWeight:700, color: saldo >= 0 ? '#15803d' : '#dc2626' }}>{saldo}d</td>
                          <td style={{ padding:'0.55rem 0.75rem', color:'var(--color-text-muted)', fontSize:'0.75rem' }}>{par?.nombre || '—'}</td>
                          <td style={{ padding:'0.55rem 0.65rem' }}>
                            <button onClick={() => { setEditingEmp(e); setEmpModal(true); }}
                              style={{ padding:'0.25rem 0.65rem', background:'white', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.72rem', color:'var(--color-text-muted)' }}>✏️</button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PERMISOS ── */}
      {tab === 'permisos' && (
        <div>
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
            {['todos','pendiente','aprobado','rechazado'].map(e => (
              <button key={e} onClick={() => setFiltroEstado(e)}
                style={{ padding:'0.35rem 0.85rem', borderRadius:999, border:'1px solid var(--color-border)', background: filtroEstado===e ? '#2e5cbf' : 'white', color: filtroEstado===e ? 'white' : 'var(--color-text-muted)', fontWeight: filtroEstado===e ? 700 : 400, fontSize:'0.78rem', cursor:'pointer', fontFamily:'var(--font-body)', textTransform:'capitalize' }}>
                {e === 'todos' ? 'Todos' : e.charAt(0).toUpperCase() + e.slice(1)}
              </button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:'0.78rem', color:'var(--color-text-muted)' }}>{permisosVis.length} registro{permisosVis.length!==1?'s':''}</span>
          </div>

          {permisosVis.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--color-text-muted)' }}>
              <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📋</div>
              <p>No hay solicitudes{filtroEstado !== 'todos' ? ` ${filtroEstado}s` : ''} registradas.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
              {permisosVis.map(p => {
                const emp     = empleadoMap[p.empleado_id];
                const tipoCfg = TIPOS_PERMISO.find(t => t.value === p.tipo);
                const isRes   = resolving?.id === p.id;
                const estadoColor = p.estado === 'aprobado' ? '#15803d' : p.estado === 'rechazado' ? '#dc2626' : '#b8860b';
                const estadoBg    = p.estado === 'aprobado' ? '#f0fdf4' : p.estado === 'rechazado' ? '#fef2f2' : '#fef9c3';
                return (
                  <div key={p.id} style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', padding:'0.85rem 1rem', background: estadoBg }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.5rem' }}>
                      <div>
                        <span style={{ fontWeight:700, fontSize:'0.9rem' }}>{emp?.nombre || '?'}</span>
                        <span style={{ marginLeft:'0.6rem', fontSize:'0.72rem', fontWeight:600, color: tipoCfg?.color || 'var(--color-text)', background:'white', border:`1px solid ${tipoCfg?.color || 'var(--color-border)'}`, borderRadius:999, padding:'1px 8px' }}>{tipoCfg?.label || p.tipo}</span>
                        <span style={{ marginLeft:'0.5rem', fontSize:'0.72rem', fontWeight:700, color: estadoColor, background:'white', borderRadius:999, padding:'1px 8px', border:`1px solid ${estadoColor}` }}>{p.estado}</span>
                      </div>
                      <div style={{ fontSize:'0.78rem', color:'var(--color-text-muted)' }}>
                        {p.fecha_inicio} → {p.fecha_fin} · <strong>{p.dias}d</strong>
                      </div>
                    </div>
                    {p.motivo && <p style={{ margin:'0.4rem 0 0', fontSize:'0.78rem', color:'var(--color-text-muted)' }}>📝 {p.motivo}</p>}
                    {p.comentario_admin && <p style={{ margin:'0.3rem 0 0', fontSize:'0.78rem', color: estadoColor }}>💬 {p.comentario_admin}</p>}
                    <div style={{ fontSize:'0.68rem', color:'var(--color-text-muted)', marginTop:'0.3rem' }}>
                      Solicitado por {p.solicitado_por || 'N/A'} · {p.fecha_solicitud}
                      {p.aprobado_por && ` · Resuelto por ${p.aprobado_por}`}
                    </div>

                    {p.estado === 'pendiente' && (
                      <div style={{ marginTop:'0.65rem' }}>
                        {!isRes ? (
                          <div style={{ display:'flex', gap:'0.4rem' }}>
                            <button onClick={() => { setResolving(p); setComentario(''); }}
                              style={{ padding:'0.3rem 0.85rem', background:'#15803d', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.75rem', fontWeight:600, fontFamily:'var(--font-body)' }}>✓ Aprobar</button>
                            <button onClick={() => { setResolving(p); setComentario(''); }}
                              style={{ padding:'0.3rem 0.85rem', background:'#dc2626', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.75rem', fontWeight:600, fontFamily:'var(--font-body)' }}>✕ Rechazar</button>
                          </div>
                        ) : (
                          <div style={{ background:'white', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', padding:'0.65rem', marginTop:'0.4rem' }}>
                            <textarea value={comentario} onChange={e=>setComentario(e.target.value)} rows={2}
                              placeholder="Comentario (opcional)..."
                              style={{ width:'100%', padding:'0.4rem', fontSize:'0.8rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', resize:'vertical', boxSizing:'border-box', marginBottom:'0.5rem' }} />
                            <div style={{ display:'flex', gap:'0.4rem' }}>
                              <button onClick={() => handleResolver(p, 'aprobado')}
                                style={{ padding:'0.3rem 0.85rem', background:'#15803d', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.75rem', fontWeight:700, fontFamily:'var(--font-body)' }}>✓ Confirmar aprobación</button>
                              <button onClick={() => handleResolver(p, 'rechazado')}
                                style={{ padding:'0.3rem 0.85rem', background:'#dc2626', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.75rem', fontWeight:700, fontFamily:'var(--font-body)' }}>✕ Confirmar rechazo</button>
                              <button onClick={() => setResolving(null)}
                                style={{ padding:'0.3rem 0.75rem', background:'white', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.75rem', color:'var(--color-text-muted)', fontFamily:'var(--font-body)' }}>Cancelar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <EmpleadoModal
        isOpen={empModal}
        onClose={() => { setEmpModal(false); setEditingEmp(null); }}
        onSave={handleSaveEmpleado}
        empleados={empleados}
        initialData={editingEmp}
      />
      {turnoEdit && (
        <TurnoPopover
          emp={turnoEdit.emp}
          fecha={turnoEdit.fecha}
          turnoActual={turnoMap[`${turnoEdit.emp.id}_${turnoEdit.fecha}`]}
          onSave={handleSaveTurno}
          onClose={() => setTurnoEdit(null)}
        />
      )}
      <PermisoModal
        isOpen={permisoModal}
        onClose={() => setPermisoModal(false)}
        onSave={handleSavePermiso}
        empleados={empleados}
        session={session}
      />
    </div>
  );
}
