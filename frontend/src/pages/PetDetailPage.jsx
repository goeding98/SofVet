import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import { useSede, sedeBadge, SEDES } from '../utils/useSede';
import { useAuth } from '../utils/useAuth';
import { ageLabel } from '../utils/ageLabel';
import Card from '../components/Card';
import Button from '../components/Button';
import ConsultationModal from '../components/ConsultationModal';
import VetName from '../components/VetName';
import ControlModal from '../components/ControlModal';
import DocumentModal from '../components/DocumentModal';
import HospitalizationModal from '../components/HospitalizationModal';
import ImagingModal from '../components/ImagingModal';
import ProcedimientosModal from '../components/ProcedimientosModal';
import LaboratoriosModal from '../components/LaboratoriosModal';
import SolicitarLabModal from '../components/SolicitarLabModal';
import LaboratoriosSinReportarModal from '../components/LaboratoriosSinReportarModal';
import HospitalizationReportModal from '../components/HospitalizationReportModal';
import HospReviewModal from '../components/HospReviewModal';
import RemitirModal from '../components/RemitirModal';
import FormulasModal from '../components/FormulasModal';
import VacunaModal from '../components/VacunaModal';
import DesparasitarModal from '../components/DesparasitarModal';
import documents from '../data/documents.js';

const speciesIcon = s => ({ Perro: '🐶', Gato: '🐱', Conejo: '🐰', Ave: '🐦', Reptil: '🦎' }[s] || '🐾');

const statusColors = {
  activo:        { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  hospitalizado: { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)'  },
  inactivo:      { bg: '#f5f5f5',                 color: '#666'                 },
};

export default function PetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items: patients, loading: loadingPatients } = useStore('patients');
  const { items: clients }     = useStore('clients');
  const { items: prepagada }   = useStore('prepagada');
  const { add: addConsultation, edit: editConsultation, remove: removeConsultation } = useStore('consultations');
  const [patientConsults, setPatientConsults] = useState([]);
  const { items: vaccines, add: addVaccine, edit: editVaccine, remove: removeVaccine } = useStore('vaccines');
  const { items: imagingRecords, add: addImaging, edit: editImaging } = useStore('imaging');
  const { items: formulas, add: addFormula, edit: editFormula } = useStore('formulas_medicas');
  const { items: procedimientos, add: addProcedimiento, edit: editProcedimiento } = useStore('procedimientos');
  const { items: laboratorios, add: addLaboratorio, edit: editLaboratorio } = useStore('laboratorios');
  const { items: hospReports, add: addHospReport, edit: editHospReport, remove: removeHospReport } = useStore('hospitalization_reports');
  const { items: hospitalization }                     = useStore('hospitalization');
  const { items: signedDocs }  = useStore('signedDocuments');
  const { items: labPedidos, edit: editLabPedido, add: addLabPedido } = useStore('laboratorios_pedidos');
  const { items: notasClincias, add: addNota, edit: editNota } = useStore('notas_clinicas');
  const { items: controles, add: addControl, edit: editControl, remove: removeControl } = useStore('controles');
  const { items: aliados }                  = useStore('aliados');
  const { items: remisionesVis, add: addRemision } = useStore('remisionesVis');

  const { sedeActual, isAdmin: isAdminUser } = useSede();
  const { session } = useAuth();

  const [consultModal,   setConsultModal]   = useState(false);
  const [editingConsult, setEditingConsult] = useState(null); // consultation being edited
  const [hospModal,      setHospModal]      = useState(false);
  const [imagingModal,   setImagingModal]   = useState(false);
  const [editingImaging, setEditingImaging] = useState(null);
  const [procedModal,    setProcedModal]    = useState(false);
  const [labModal,       setLabModal]       = useState(false);
  const [labSolModal,    setLabSolModal]    = useState(false);
  const [labChoiceOpen,  setLabChoiceOpen]  = useState(false);
  const [editingLab,     setEditingLab]     = useState(null); // { lab record } being edited
  const [labSRModal,     setLabSRModal]     = useState(false);
  const [hospRepModal,   setHospRepModal]   = useState(false);
  const [editingReport,  setEditingReport]  = useState(null);
  const [reviewHosp,     setReviewHosp]     = useState(null);
  const [formulasModal,  setFormulasModal]  = useState(false);
  const [editHCConfirm,  setEditHCConfirm]  = useState(false);
  const [vacunaModal,      setVacunaModal]      = useState(false);
  const [desparasitarModal,setDesparasitarModal] = useState(false);
  const [editingVacuna,    setEditingVacuna]    = useState(null);
  const [editingDesparasitar, setEditingDesparasitar] = useState(null);
  const [editingProced,    setEditingProced]    = useState(null);
  const [editingHosp,      setEditingHosp]      = useState(null);
  const [activeDoc,      setActiveDoc]      = useState(null);
  const [docTab,         setDocTab]         = useState('generar');
  const [sedeFilter,     setSedeFilter]     = useState(null);
  const [notaModal,      setNotaModal]      = useState(false);
  const [notaForm,       setNotaForm]       = useState({ titulo: '', observaciones: '' });
  const [notaFile,       setNotaFile]       = useState(null);
  const [notaUploading,  setNotaUploading]  = useState(false);
  const [notaImageView,  setNotaImageView]  = useState(null);
  const [editingNota,    setEditingNota]    = useState(null);
  const [controlModal,   setControlModal]   = useState(false);
  const [editingControl, setEditingControl] = useState(null);
  const [remitirModal,   setRemitirModal]   = useState(null); // { recordType, recordId, servicio }

  const canRemit = isAdminUser || session?.sede_id === 4;

  const petId  = parseInt(id);
  const pet    = patients.find(p => p.id === petId);

  // ── Listen for HC save from edit window ───────────────────────────────────
  useEffect(() => {
    const handler = async (e) => {
      if (e.data?.type !== 'HC_SAVE' || e.data.patientId !== petId) return;
      await supabase.from('hc_overrides').upsert(
        { patient_id: petId, html_content: e.data.html, updated_at: new Date().toISOString() },
        { onConflict: 'patient_id' }
      );
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [petId]);

  // Fast targeted fetch — only this patient's consultations, no need to wait for global store
  useEffect(() => {
    supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', petId)
      .order('date', { ascending: false })
      .then(({ data }) => { if (data) setPatientConsults(data); });
  }, [petId]);

  const client = pet ? clients.find(c => c.id === pet.client_id) : null;

  const petConsults = patientConsults
    .filter(c => sedeFilter === null || c.sede_id === sedeFilter)
    .sort((a, b) => `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`));

  const recentConsults = petConsults.slice(0, 5);

  const petSignedDocs  = signedDocs.filter(s => s.patient_id === petId);
  const petImaging     = imagingRecords
    .filter(r => r.patient_id === petId)
    .sort((a, b) => b.date?.localeCompare(a.date));

  const petProcedimientos = procedimientos
    .filter(p => p.patient_id === petId)
    .sort((a, b) => b.fecha?.localeCompare(a.fecha));

  const petLaboratorios = laboratorios
    .filter(l => l.patient_id === petId)
    .sort((a, b) => b.fecha?.localeCompare(a.fecha));

  const petLabPedidos = labPedidos
    .filter(p => p.patient_id === petId && p.estado !== 'Solicitado')
    .sort((a, b) => b.fecha_solicitado?.localeCompare(a.fecha_solicitado));

  const petNotas = notasClincias
    .filter(n => n.patient_id === petId)
    .sort((a, b) => b.created_at?.localeCompare(a.created_at));

  const petControles = controles
    .filter(c => c.patient_id === petId)
    .sort((a, b) => `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`));

  const activeHosp = hospitalization.find(h => h.patient_id === petId && h.status === 'activo');
  const petHospitals = hospitalization
    .filter(h => h.patient_id === petId)
    .sort((a, b) => (b.ingreso_date || '').localeCompare(a.ingreso_date || ''));

  // Labs sin reportar para toda la sede (global badge)
  const labsSinReportar = useMemo(() =>
    labPedidos.filter(p =>
      p.estado === 'Subido SIN REPORTAR' &&
      (isAdminUser || p.sede_id === sedeActual)
    ), [labPedidos, sedeActual, isAdminUser]);

  if (loadingPatients) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
        <p style={{ fontSize: '0.875rem' }}>Cargando datos...</p>
      </div>
    );
  }

  if (!pet) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Mascota no encontrada.</p>
        <Button onClick={() => navigate('/patients')}>← Volver a Pacientes</Button>
      </div>
    );
  }

  const sc = statusColors[pet.status] || statusColors.inactivo;

  const prepagadaEntry = prepagada.find(i => i.patient_id === pet.id && i.status !== 'baja');
  const prepagadaStatus = prepagadaEntry
    ? (new Date(prepagadaEntry.paid_until + 'T23:59:59') >= new Date() ? 'activo' : 'mora')
    : null;

  const isHospitalized = pet.status === 'hospitalizado' || !!activeHosp;

  const quickActions = [
    { label: 'Nueva Consulta',   icon: '🩺', action: () => { setEditingConsult(null); setConsultModal(true); },                                                 color: 'var(--color-primary)', primary: true  },
    { label: 'Control',          icon: '📋', action: () => { setEditingControl(null); setControlModal(true); }, color: '#316d74' },
    { label: isHospitalized ? 'Rep. Hospitaliz.' : 'Hospitalizar', icon: '🏥', action: () => isHospitalized ? setHospRepModal(true) : setHospModal(true), color: 'var(--color-danger)' },
    { label: 'Vacunar',          icon: '💉', action: () => setVacunaModal(true),       color: 'var(--color-secondary)'               },
    { label: 'Desparasitar',     icon: '🪱', action: () => setDesparasitarModal(true), color: '#7c5cbf'                               },
    { label: 'Imagenología',     icon: '🔬', action: () => setImagingModal(true),                                                  color: '#1565c0'                               },
    { label: 'Procedimientos',   icon: '⚕️', action: () => setProcedModal(true),    color: '#c0392b'  },
    { label: 'Laboratorio',      icon: '🧪', action: () => setLabChoiceOpen(true),   color: '#2e7d50'  },
    { label: 'Fórmula Médica',   icon: '💊', action: () => setFormulasModal(true),   color: '#a6785b'  },
    { label: 'Citas',            icon: '📅', action: () => navigate('/appointments', { state: { patient_name: pet.name, owner: client?.name || '' } }), color: '#316d74' },
    { label: 'Peluquería',       icon: '✂️', action: () => navigate('/grooming'),    color: '#7c5cbf'  },
    ...(isHospitalized ? [{ label: 'Reporte Hosp.', icon: '🏥', action: () => setHospRepModal(true), color: '#c0392b' }] : []),
  ];

  const handleSaveVacuna = async (data) => {
    if (Array.isArray(data)) {
      for (const vac of data) {
        let err = null;
        await addVaccine({ ...vac, patient_id: petId, patient_name: pet.name }, { onError: m => { err = m; } });
        if (err) { alert('⚠️ Error al guardar vacuna:\n\n' + err); break; }
      }
    } else if (data.id) {
      const { id, ...rest } = data;
      await editVaccine(id, rest);
    } else {
      let err = null;
      await addVaccine({ ...data, patient_id: petId, patient_name: pet.name }, { onError: m => { err = m; } });
      if (err) return alert('⚠️ Error al guardar vacuna:\n\n' + err);
    }
    setVacunaModal(false);
    setEditingVacuna(null);
  };

  const handleSaveDesparasitar = async (data) => {
    if (data.id) {
      const { id, ...rest } = data;
      await editVaccine(id, rest);
    } else {
      let err = null;
      await addVaccine({ ...data, patient_id: petId, patient_name: pet.name }, { onError: m => { err = m; } });
      if (err) return alert('⚠️ Error al guardar desparasitación:\n\n' + err);
    }
    setDesparasitarModal(false);
    setEditingDesparasitar(null);
  };

  const closeConsultModal = () => { setConsultModal(false); setEditingConsult(null); };

  const _createFormulaAndLabs = async (data, petId, pet) => {
    const { formula_productos, labs_pedidos } = data;
    const hasFormula = (formula_productos && formula_productos.length > 0) || data.observaciones?.trim();
    if (hasFormula) {
      let fxError = null;
      const fxResult = await addFormula(
        { patient_id: petId, patient_name: pet.name, fecha: data.date || new Date().toISOString().split('T')[0], productos: formula_productos || [], estado: 'Pendiente', veterinario: session?.nombre || null, observaciones: data.observaciones || null },
        { onError: (msg) => { fxError = msg; } }
      );
      if (!fxResult) alert('⚠️ Error al guardar fórmula médica:\n\n' + fxError);
    }
    for (const lab of (labs_pedidos || [])) {
      await addLabPedido({
        patient_id: petId, patient_name: pet.name, sede_id: data.sede_id,
        tipo_examen: lab.tipo_examen === 'Otro' ? (lab.otro_tipo?.trim() || 'Otro') : lab.tipo_examen,
        procesamiento: lab.procesamiento || 'Interno',
        estado: 'Solicitado',
        fecha_solicitado: data.date || new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleSaveConsultation = async (data) => {
    const { formula_productos, labs_pedidos, ...consultData } = data;
    const cleaned = Object.fromEntries(Object.entries(consultData).map(([k, v]) => [k, v === '' ? null : v]));

    if (editingConsult) {
      // Editing existing consultation
      const changes = { ...cleaned, estado: 'completada' };
      editConsultation(editingConsult.id, changes);
      setPatientConsults(prev => prev.map(c => c.id === editingConsult.id ? { ...c, ...changes } : c));
      // Always handle formula when editing: create if new, update if already exists
      const hasFormulaData = formula_productos.length > 0 || data.observaciones?.trim();
      if (hasFormulaData) {
        const existingFormula = formulas.find(f => f.patient_id === petId && f.fecha === data.date);
        if (existingFormula) {
          editFormula(existingFormula.id, { productos: formula_productos, observaciones: data.observaciones || null, veterinario: existingFormula.veterinario || session?.nombre || null });
        } else {
          await _createFormulaAndLabs({ ...data, formula_productos, labs_pedidos: [] }, petId, pet);
        }
      }
      // If completing an incomplete consult, also create labs
      if (editingConsult.estado === 'incompleta') {
        await _createFormulaAndLabs({ ...data, formula_productos: [], labs_pedidos }, petId, pet);
      }
    } else {
      // New consultation
      let saveError = null;
      const result = await addConsultation(
        { ...cleaned, patient_id: petId, patient_name: pet.name, estado: 'completada', created_at: new Date().toISOString().split('T')[0] },
        { onError: (msg) => { saveError = msg; } }
      );
      if (!result) { alert('❌ Error al guardar consulta:\n\n' + saveError); return; }
      setPatientConsults(prev => [result, ...prev]);
      await _createFormulaAndLabs({ ...data, formula_productos, labs_pedidos }, petId, pet);
    }
    closeConsultModal();
  };

  const handleSaveDraft = async (data) => {
    const { formula_productos: _fx, labs_pedidos: _lb, ...consultData } = data;
    const cleaned = Object.fromEntries(Object.entries(consultData).map(([k, v]) => [k, v === '' ? null : v]));
    if (editingConsult) {
      const changes = { ...cleaned, estado: 'incompleta' };
      editConsultation(editingConsult.id, changes);
      setPatientConsults(prev => prev.map(c => c.id === editingConsult.id ? { ...c, ...changes } : c));
    } else {
      let saveError = null;
      const result = await addConsultation(
        { ...cleaned, patient_id: petId, patient_name: pet.name, estado: 'incompleta', created_at: new Date().toISOString().split('T')[0] },
        { onError: (msg) => { saveError = msg; } }
      );
      if (!result) { alert('❌ Error al guardar borrador:\n\n' + saveError); return; }
      setPatientConsults(prev => [result, ...prev]);
    }
    closeConsultModal();
  };

  const handleSolicitarLab = async (data) => {
    await addLabPedido({ ...data, patient_id: petId });
    setLabSolModal(false);
  };

  const handleSaveControl = async (data) => {
    const cleaned = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]));
    if (editingControl) {
      editControl(editingControl.id, cleaned);
    } else {
      const now = new Date();
      const hoy = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      let saveError = null;
      const result = await addControl(
        { ...cleaned, patient_id: petId, patient_name: pet.name, created_at: hoy },
        { onError: (msg) => { saveError = msg; } }
      );
      if (!result) { alert('❌ Error al guardar control:\n\n' + saveError); return; }
    }
    setControlModal(false);
    setEditingControl(null);
  };

  const handleSaveNota = async () => {
    if (!notaForm.titulo.trim()) return alert('El título es requerido.');
    setNotaUploading(true);
    const now = new Date();
    const hoy = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const horaAhora = now.toTimeString().slice(0, 5);

    if (editingNota) {
      const editPayload = {
        titulo:        notaForm.titulo.trim(),
        observaciones: notaForm.observaciones.trim() || null,
        editado_por:   session?.nombre || null,
        fecha_edicion: hoy,
        hora_edicion:  horaAhora,
      };
      if (isAdminUser && notaForm.fecha_creacion) editPayload.created_at    = notaForm.fecha_creacion;
      if (isAdminUser && notaForm.hora_creacion)  editPayload.hora_creacion = notaForm.hora_creacion;
      await editNota(editingNota.id, editPayload);
      setNotaUploading(false);
    } else {
      let imagen_url = null;
      if (notaFile) {
        imagen_url = await new Promise((resolve) => {
          const img = new Image();
          const blobUrl = URL.createObjectURL(notaFile);
          img.onload = () => {
            URL.revokeObjectURL(blobUrl);
            const MAX = 1024;
            let { width: w, height: h } = img;
            if (w > MAX || h > MAX) { if (w >= h) { h = Math.round(h * MAX / w); w = MAX; } else { w = Math.round(w * MAX / h); h = MAX; } }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
          };
          img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(null); };
          img.src = blobUrl;
        });
      }
      let err = null;
      const result = await addNota({
        patient_id:    petId,
        titulo:        notaForm.titulo.trim(),
        observaciones: notaForm.observaciones.trim() || null,
        imagen_url,
        autor:         session?.nombre || null,
        created_at:    hoy,
        hora_creacion: horaAhora,
      }, { onError: (m) => { err = m; } });
      setNotaUploading(false);
      if (!result) return alert('❌ Error al guardar nota:\n\n' + err);
    }
    setNotaModal(false);
    setNotaForm({ titulo: '', observaciones: '' });
    setNotaFile(null);
    setEditingNota(null);
  };

  const handleSaveProcedimiento = async (data) => {
    if (data.id) {
      const { id, ...rest } = data;
      await editProcedimiento(id, rest);
    } else {
      let err = null;
      const result = await addProcedimiento(
        { ...data, patient_id: petId },
        { onError: (msg) => { err = msg; } }
      );
      if (!result) { alert('❌ Error al guardar procedimiento:\n\n' + err); return; }
    }
    setProcedModal(false);
    setEditingProced(null);
  };

  const handleSaveLaboratorio = async (data) => {
    let saveErr = null;
    const result = await addLaboratorio(
      { ...data, patient_id: petId, patient_name: pet.name },
      { onError: (m) => { saveErr = m; } }
    );
    if (!result) {
      alert('❌ Error al guardar resultado:\n\n' + saveErr);
      return;
    }
    // Auto-link: if there's a 'Solicitado' pedido for this patient+tipo, advance to 'Subido SIN REPORTAR'
    const pedido = labPedidos.find(p =>
      p.patient_id === petId &&
      p.tipo_examen === data.tipo &&
      (p.estado === 'Solicitado' || p.estado === 'Subido SIN REPORTAR')
    );
    if (pedido) {
      editLabPedido(pedido.id, {
        estado:        'Subido SIN REPORTAR',
        fecha_subido:  new Date().toISOString().split('T')[0],
      });
    }
    setLabModal(false);
  };

  const handleEditLaboratorio = async (labId, changes) => {
    await editLaboratorio(labId, changes);
    setEditingLab(null);
    setLabModal(false);
  };

  const handleSaveHospReport = (data) => {
    if (data.id) {
      const { id, ...changes } = data;
      editHospReport(id, changes);
    } else {
      addHospReport({ ...data, patient_id: petId });
    }
    setEditingReport(null);
    setHospRepModal(false);
  };

  const handleSaveImaging = (data) => {
    addImaging({ ...data, patient_id: petId, patient_name: pet.name, created_at: new Date().toISOString().split('T')[0] });
  };

  const handleEditImaging = (id, changes) => {
    editImaging(id, changes);
  };

  const handleDownloadPDF = async () => {
    const sn = (sid) => SEDES.find(s => s.id === sid)?.nombre || '—';

    const allEvents = [];
    patientConsults.forEach(c => {
      const meds = Array.isArray(c.medicamentos_aplicados) ? c.medicamentos_aplicados.filter(m => m.medicamento) : [];
      const formula = formulas.find(fx => fx.patient_id === petId && fx.fecha === c.date);
      const fxProds = formula && Array.isArray(formula.productos) ? formula.productos.filter(p => p.producto) : [];
      allEvents.push({ sortKey: `${c.date || '0000'}T${c.time || '00:00'}`, type: 'consulta', c, meds, fxProds });
    });
    vaccines.filter(v => v.patient_id === petId).forEach(v => {
      const vDate = v.date_applied || v.date || '0000';
      allEvents.push({ sortKey: `${vDate}T00:00`, type: 'vacuna', v });
    });
    petImaging.forEach(r => {
      allEvents.push({ sortKey: `${r.date || '0000'}T00:00`, type: 'imagen', r });
    });
    petProcedimientos.forEach(p => {
      allEvents.push({ sortKey: `${p.fecha || '0000'}T00:00`, type: 'proced', p });
    });
    petLabPedidos.forEach(l => {
      allEvents.push({ sortKey: `${l.fecha_subido || l.fecha_solicitado || '0000'}T00:00`, type: 'lab', l });
    });
    hospitalization.filter(h => h.patient_id === petId).forEach(h => {
      const meds = Array.isArray(h.tratamiento) ? h.tratamiento.filter(m => m.medicamento) : [];
      const reps = hospReports.filter(r => r.hospitalization_id === h.id).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      const sortKey = h.alta_date ? `${h.alta_date}T${h.alta_time || '00:00'}` : `${h.ingreso_date || '0000'}T${h.ingreso_time || '00:00'}`;
      allEvents.push({ sortKey, type: 'hosp', h, meds, reps });
    });
    petControles.forEach(c => {
      allEvents.push({ sortKey: `${c.date || '0000'}T${c.time || '00:00'}`, type: 'control', c });
    });
    petNotas.forEach(n => {
      const d = n.created_at ? n.created_at.split('T')[0] : '0000';
      const t = n.created_at ? n.created_at.split('T')[1]?.slice(0, 5) : '00:00';
      allEvents.push({ sortKey: `${d}T${t || '00:00'}`, type: 'nota', n });
    });
    allEvents.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    const fld = (label, value) => {
      if (!value || value.toString().trim() === '') return '';
      return `<div style="display:flex;gap:8px;margin-bottom:5px;font-size:11px;line-height:1.5"><span style="font-weight:700;color:#444;min-width:170px;flex-shrink:0">${label}:</span><span style="color:#222;white-space:pre-wrap">${value.toString().replace(/\n/g,'<br>')}</span></div>`;
    };

    const renderEvent = (ev) => {
      if (ev.type === 'consulta') {
        const { c, meds, fxProds } = ev;
        const efCells = [
          ['Temp (°C)', c.temperatura], ['FC (bpm)', c.frecuencia_cardiaca], ['FR (rpm)', c.frecuencia_respiratoria],
          ['Pulso (ppm)', c.pulso], ['Peso (kg)', c.peso], ['CC (1-9)', c.condicion_corporal],
          ['Mucosas', c.mucosas], ['TLC (seg)', c.tiempo_llenado_capilar], ['Glicemia', c.glicemia], ['Presión', c.presion_arterial],
        ].filter(([, val]) => val);
        return `<div style="margin-bottom:20px;border-left:4px solid #2e5cbf"><div style="background:#dbeafe;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#1d4ed8;font-size:12px">🩺 CONSULTA — ${c.date || '—'}${c.time ? ' · ' + c.time : ''}</div><div style="font-size:10px;color:#555">${sn(c.sede_id)}${c.veterinario ? ' · Vet: ' + c.veterinario : ''}</div></div><div style="padding:10px 14px">${fld('Anamnesis / Antecedentes', c.antecedentes)}${fld('Hallazgos clínicos', c.hallazgos)}${efCells.length > 0 ? `<div style="background:#f0f8ff;border:1px solid #bfdbfe;border-radius:4px;padding:8px;margin:8px 0"><div style="font-size:9px;font-weight:700;color:#2e5cbf;text-transform:uppercase;margin-bottom:6px;text-align:center">Examen Físico</div><div style="display:flex;flex-wrap:wrap;gap:4px">${efCells.map(([lbl, val]) => `<div style="flex:1;min-width:80px;text-align:center;background:white;border-radius:3px;padding:4px 6px;border:1px solid #dbeafe"><div style="font-size:8px;color:#888;font-weight:700;text-transform:uppercase">${lbl}</div><div style="font-size:12px;font-weight:600;color:#1e3a8a">${val}</div></div>`).join('')}</div></div>` : ''}${meds.length > 0 ? `<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#316d74;text-transform:uppercase;margin-bottom:4px">Medicamentos aplicados en consulta</div><table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #99d6d6"><thead><tr style="background:#e0f5f5"><th style="padding:3px 6px;text-align:left">Producto</th><th style="padding:3px 6px;text-align:left;width:100px">Dosis</th><th style="padding:3px 6px;text-align:left;width:70px">Vía</th></tr></thead><tbody>${meds.map(m => `<tr style="border-top:1px solid #c8ecec"><td style="padding:2px 6px">${m.medicamento}</td><td style="padding:2px 6px">${m.dosis || '—'}</td><td style="padding:2px 6px">${m.via || '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}${fxProds.length > 0 ? `<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#a6785b;text-transform:uppercase;margin-bottom:4px">Fórmula médica (para casa)</div><table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #e5c4aa"><thead><tr style="background:#fdf3ec"><th style="padding:3px 6px;text-align:left">Producto</th><th style="padding:3px 6px;text-align:left;width:110px">Cantidad</th><th style="padding:3px 6px;text-align:left">Instrucciones</th></tr></thead><tbody>${fxProds.map(p => `<tr style="border-top:1px solid #f5e0cc"><td style="padding:2px 6px">${p.producto}</td><td style="padding:2px 6px">${p.cantidad || '—'}</td><td style="padding:2px 6px">${p.instrucciones || '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}${fld('Diagnóstico diferencial', c.diagnostico_diferencial)}${c.diagnostico_final ? `<div style="margin:8px 0;padding:6px 10px;background:#dcfce7;border-left:3px solid #16a34a;font-size:11px"><span style="font-weight:700;color:#15803d">Diagnóstico final: </span><span style="font-weight:600;color:#14532d">${c.diagnostico_final}</span></div>` : ''}${fld('Plan diagnóstico / terapéutico', c.plan_diagnostico)}${fld('Observaciones', c.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'vacuna') {
        const { v } = ev;
        const vDate = v.date_applied || v.date || '—';
        const vName = v.vaccine_name || v.vaccine || v.nombre || '—';
        const vLote = v.batch || v.lote || null;
        const vNext = v.next_dose || v.next_date || v.proxima_vacuna || null;
        const vVet  = v.vet || v.veterinario || null;
        return `<div style="margin-bottom:20px;border-left:4px solid #15803d"><div style="background:#dcfce7;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#15803d;font-size:12px">💉 VACUNA — ${vDate}</div><div style="font-size:10px;color:#555">${vVet || ''}</div></div><div style="padding:10px 14px">${fld('Vacuna / Producto', vName)}${vLote ? fld('Lote', vLote) : ''}${v.dose ? fld('Dosis', v.dose) : ''}${vNext ? fld('Próxima dosis', vNext) : ''}${v.notes ? fld('Observaciones', v.notes) : ''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'imagen') {
        const { r } = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #1565c0"><div style="background:#e8f0ff;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#1565c0;font-size:12px">🔬 IMAGENOLOGÍA — ${r.date || '—'}</div><div style="font-size:10px;color:#555">${sn(r.sede_id)}${r.created_by ? ' · ' + r.created_by : ''}</div></div><div style="padding:10px 14px">${fld('Tipo', r.tipo)}${fld('Resultado / Interpretación', r.resultado)}${r.archivos?.length > 0 ? fld('Archivos', r.archivos.map(a => a.name).join(', ')) : ''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'proced') {
        const { p } = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #b91c1c"><div style="background:#fee2e2;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#b91c1c;font-size:12px">⚕️ PROCEDIMIENTO — ${p.fecha || '—'}${p.hora_creacion ? ' ' + p.hora_creacion : ''}</div><div style="font-size:10px;color:#555">${sn(p.sede_id)}${p.veterinario ? ' · Vet: ' + p.veterinario : ''}</div></div><div style="padding:10px 14px">${p.motivo ? `<div style="font-size:13px;font-weight:700;color:#b91c1c;margin-bottom:6px">${p.motivo}</div>` : ''}${fld('Tipo', p.tipo)}${fld('Descripción', p.descripcion)}${fld('Anestesia', p.anestesia)}${fld('Observaciones', p.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'lab') {
        const { l } = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #065f46"><div style="background:#d1fae5;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#065f46;font-size:12px">🧪 LABORATORIO — ${l.fecha_solicitado || '—'}</div><div style="font-size:10px;color:#555">${sn(l.sede_id)}</div></div><div style="padding:10px 14px">${fld('Tipo de examen', l.tipo_examen)}${fld('Procesamiento', l.procesamiento)}${fld('Estado', l.estado)}${l.fecha_subido ? fld('Fecha subido PDF', l.fecha_subido) : ''}${l.fecha_reportado ? fld('Fecha reportado', l.fecha_reportado) : ''}${l.reportado_por ? fld('Reportado por', l.reportado_por) : ''}${l.razon_no_reporte ? fld('Razón no reporte', l.razon_no_reporte) : ''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'hosp') {
        const { h, meds, reps } = ev;
        const dias = h.duration_days || (h.ingreso_date && h.alta_date ? Math.round((new Date(h.alta_date) - new Date(h.ingreso_date)) / 86400000) : '—');
        return `<div style="margin-bottom:20px;border-left:4px solid #991b1b"><div style="background:#fee2e2;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#991b1b;font-size:12px">${h.status === 'deslinde' ? '🏥 HOSPITALIZACIÓN — Deslinde informado: ' + h.alta_date : h.status === 'fallecido' ? '🏥 HOSPITALIZACIÓN — Fallecido: ' + h.alta_date : h.alta_date ? '🏥 HOSPITALIZACIÓN — Alta: ' + h.alta_date : '🏥 HOSPITALIZACIÓN — En curso'}</div><div style="font-size:10px;color:#555">${sn(h.sede_id)}${h.responsible_vet ? ' · Vet: ' + h.responsible_vet : ''}</div></div><div style="padding:10px 14px">${fld('Motivo de hospitalización', h.motivo)}${fld('Diagnóstico', h.diagnostico)}${fld('Ingreso', `${h.ingreso_date || '—'}${h.ingreso_time ? ' a las ' + h.ingreso_time : ''}`)}${h.alta_date ? fld(h.status === 'deslinde' ? 'Deslinde informado' : h.status === 'fallecido' ? 'Fallecimiento' : 'Alta', `${h.alta_date}${h.alta_time ? ' a las ' + h.alta_time : ''} · ${dias} día(s) hospitalizado`) : ''}${meds.length > 0 ? `<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase;margin-bottom:4px">Plan de tratamiento</div><table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #fca5a5"><thead><tr style="background:#fee2e2"><th style="padding:3px 6px;text-align:left">Medicamento</th><th style="padding:3px 6px;text-align:left;width:80px">Dosis</th><th style="padding:3px 6px;text-align:left;width:70px">Unidad</th><th style="padding:3px 6px;text-align:left">Frecuencia</th></tr></thead><tbody>${meds.map(m => `<tr style="border-top:1px solid #fecaca"><td style="padding:2px 6px">${m.medicamento}</td><td style="padding:2px 6px">${m.dosis || '—'}</td><td style="padding:2px 6px">${m.unidad || '—'}</td><td style="padding:2px 6px">${m.frecuencia || '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}${reps?.length > 0 ? `<div style="margin:10px 0 0;border-top:1px dashed #fca5a5;padding-top:8px"><div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase;margin-bottom:6px">Reportes de evolución (${reps.length})</div>${reps.map(r => `<div style="border:1px solid #fca5a5;border-radius:4px;padding:6px 10px;margin-bottom:6px;background:white"><div style="font-size:9px;color:#991b1b;font-weight:700;margin-bottom:3px">📅 ${r.fecha}${r.hora ? ' a las ' + r.hora : ''}${r.veterinario ? ' · ' + r.veterinario : ''}${r.editado_por ? ' · ✏️ ' + r.editado_por : ''}</div><div style="font-size:11px;color:#333;white-space:pre-wrap;line-height:1.5">${r.contenido}</div>${r.fotos?.filter(f=>f.url).length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${r.fotos.filter(f=>f.url).map(f=>`<img src="${f.url}" style="width:130px;height:130px;object-fit:cover;border-radius:4px;border:1px solid #fca5a5;" />`).join('')}</div>` : ''}</div>`).join('')}</div>` : ''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'control') {
        const { c } = ev;
        const meds = Array.isArray(c.medicamentos_aplicados) ? c.medicamentos_aplicados.filter(m => m.medicamento) : [];
        return `<div style="margin-bottom:20px;border-left:4px solid #316d74"><div style="background:#e0f5f5;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#316d74;font-size:12px">📋 CONTROL — ${c.date || '—'}${c.time ? ' · ' + c.time : ''}</div><div style="font-size:10px;color:#555">${sn(c.sede_id)}${c.veterinario ? ' · Vet: ' + c.veterinario : ''}</div></div><div style="padding:10px 14px">${fld('Motivo de control', c.motivo_control)}${fld('Hallazgos', c.hallazgos)}${meds.length > 0 ? `<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#316d74;text-transform:uppercase;margin-bottom:4px">Medicamentos aplicados</div><table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #99d6d6"><thead><tr style="background:#e0f5f5"><th style="padding:3px 6px;text-align:left">Producto</th><th style="padding:3px 6px;text-align:left;width:100px">Dosis</th><th style="padding:3px 6px;text-align:left;width:70px">Vía</th></tr></thead><tbody>${meds.map(m => `<tr style="border-top:1px solid #c8ecec"><td style="padding:2px 6px">${m.medicamento}</td><td style="padding:2px 6px">${m.dosis || '—'}</td><td style="padding:2px 6px">${m.via || '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}${fld('Observaciones', c.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'nota') {
        const { n } = ev;
        const d = n.created_at ? n.created_at.split('T')[0] : '—';
        return `<div style="margin-bottom:20px;border-left:4px solid #b8860b"><div style="background:#fff8e1;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#b8860b;font-size:12px">📝 NOTA CLÍNICA — ${d}</div><div style="font-size:10px;color:#555">${n.created_by || ''}</div></div><div style="padding:10px 14px">${n.titulo ? `<div style="font-size:12px;font-weight:700;color:#b8860b;margin-bottom:6px">${n.titulo}</div>` : ''}${fld('Observaciones', n.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      return '';
    };

    const bodyContent = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;border-bottom:3px solid #2e5cbf;padding-bottom:14px"><div><div style="font-size:20px;font-weight:bold;color:#2e5cbf">🐾 Pets&amp;Pets Veterinaria</div><div style="font-size:11px;color:#666;margin-top:3px">Historia Clínica Completa · Generada el ${new Date().toLocaleDateString('es-CO')}</div></div><div style="text-align:right"><div style="font-weight:bold;font-size:16px">${pet.name}</div><div style="font-size:11px;color:#666">${pet.species}${pet.breed ? ` · ${pet.breed}` : ''} · ${pet.sex || ''} · ${pet.esterilizado || ''}</div>${client ? `<div style="font-size:11px;color:#666">👤 ${client.name}${client.phone ? ' · ' + client.phone : ''}</div>` : ''}<div style="font-size:10px;color:#999">Historia Clínica #${pet.no_historia || pet.id}</div></div></div><div style="display:flex;gap:6px;margin-bottom:20px;background:#f5f8ff;padding:10px 14px;border-radius:6px">${[['Edad', ageLabel(pet.birth_date || pet.fecha_nacimiento, pet.age)], ['Peso actual', `${pet.weight} kg`], ['Sexo', pet.sex || '—'], ['Esterilizado', pet.esterilizado || '—'], ['Carácter', pet.caracter || '—']].map(([lbl, val]) => `<div style="flex:1;min-width:90px"><div style="font-size:9px;text-transform:uppercase;color:#888;font-weight:700">${lbl}</div><div style="font-size:12px;font-weight:600">${val}</div></div>`).join('')}</div><div style="font-size:13px;font-weight:700;color:#2e5cbf;border-bottom:2px solid #2e5cbf;padding-bottom:4px;margin:0 0 18px;text-transform:uppercase;letter-spacing:0.05em">Historia Clínica — ${allEvents.length} eventos</div>${allEvents.length === 0 ? '<p style="text-align:center;color:#999;padding:30px">Sin eventos registrados.</p>' : allEvents.map(renderEvent).join('')}<div style="margin-top:32px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#aaa;text-align:center">Historia Clínica generada automáticamente por SofVet · Pets&amp;Pets Veterinaria · Cali, Colombia</div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Historia Clínica — ${pet.name}</title><style>*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#333;margin:0;padding:24px 28px}@media print{body{padding:10px 14px}}</style></head><body>${bodyContent}<script>window.onload=()=>{window.print()}</script></body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  // ── Editable HC ──────────────────────────────────────────────────────────
  const handleEditHC = () => {
    setEditHCConfirm(false);
    const sn = (sid) => SEDES.find(s => s.id === sid)?.nombre || '—';

    const allEvents = [];
    patientConsults.forEach(c => {
      const meds = Array.isArray(c.medicamentos_aplicados) ? c.medicamentos_aplicados.filter(m => m.medicamento) : [];
      const formula = formulas.find(fx => fx.patient_id === petId && fx.fecha === c.date);
      const fxProds = formula && Array.isArray(formula.productos) ? formula.productos.filter(p => p.producto) : [];
      allEvents.push({ sortKey: `${c.date || '0000'}T${c.time || '00:00'}`, type: 'consulta', c, meds, fxProds });
    });
    vaccines.filter(v => v.patient_id === petId).forEach(v => {
      const vDate = v.date_applied || v.date || '0000';
      allEvents.push({ sortKey: `${vDate}T00:00`, type: 'vacuna', v });
    });
    petImaging.forEach(r => {
      allEvents.push({ sortKey: `${r.date || '0000'}T00:00`, type: 'imagen', r });
    });
    petProcedimientos.forEach(p => {
      allEvents.push({ sortKey: `${p.fecha || '0000'}T00:00`, type: 'proced', p });
    });
    petLabPedidos.forEach(l => {
      allEvents.push({ sortKey: `${l.fecha_subido || l.fecha_solicitado || '0000'}T00:00`, type: 'lab', l });
    });
    hospitalization.filter(h => h.patient_id === petId).forEach(h => {
      const meds = Array.isArray(h.tratamiento) ? h.tratamiento.filter(m => m.medicamento) : [];
      const reps = hospReports.filter(r => r.hospitalization_id === h.id).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      const sortKey = h.alta_date ? `${h.alta_date}T${h.alta_time || '00:00'}` : `${h.ingreso_date || '0000'}T${h.ingreso_time || '00:00'}`;
      allEvents.push({ sortKey, type: 'hosp', h, meds, reps });
    });
    petControles.forEach(c => {
      allEvents.push({ sortKey: `${c.date || '0000'}T${c.time || '00:00'}`, type: 'control', c });
    });
    petNotas.forEach(n => {
      const d = n.created_at ? n.created_at.split('T')[0] : '0000';
      const t = n.created_at ? n.created_at.split('T')[1]?.slice(0, 5) : '00:00';
      allEvents.push({ sortKey: `${d}T${t || '00:00'}`, type: 'nota', n });
    });
    allEvents.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    const fld = (label, value) => {
      if (!value || value.toString().trim() === '') return '';
      return `<div style="display:flex;gap:8px;margin-bottom:5px;font-size:11px;line-height:1.5"><span style="font-weight:700;color:#444;min-width:170px;flex-shrink:0">${label}:</span><span contenteditable="true" style="color:#222;flex:1">${value}</span></div>`;
    };

    const renderEvent = (ev) => {
      if (ev.type === 'consulta') {
        const { c, meds, fxProds } = ev;
        const efCells = [
          ['Temp (°C)', c.temperatura], ['FC (bpm)', c.frecuencia_cardiaca], ['FR (rpm)', c.frecuencia_respiratoria],
          ['Pulso (ppm)', c.pulso], ['Peso (kg)', c.peso], ['CC (1-9)', c.condicion_corporal],
          ['Mucosas', c.mucosas], ['TLC (seg)', c.tiempo_llenado_capilar], ['Glicemia', c.glicemia], ['Presión', c.presion_arterial],
        ].filter(([, val]) => val);
        return `<div style="margin-bottom:20px;border-left:4px solid #2e5cbf"><div contenteditable="true" style="background:#dbeafe;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#1d4ed8;font-size:12px">🩺 CONSULTA — ${c.date || '—'}${c.time ? ' · ' + c.time : ''}</div><div style="font-size:10px;color:#555">${sn(c.sede_id)}${c.veterinario ? ' · Vet: ' + c.veterinario : ''}</div></div><div style="padding:10px 14px">${fld('Anamnesis / Antecedentes', c.antecedentes)}${fld('Hallazgos clínicos', c.hallazgos)}${efCells.length > 0 ? `<div contenteditable="true" style="background:#f0f8ff;border:1px solid #bfdbfe;border-radius:4px;padding:8px;margin:8px 0"><div style="font-size:9px;font-weight:700;color:#2e5cbf;text-transform:uppercase;margin-bottom:6px;text-align:center">Examen Físico</div><div style="display:flex;flex-wrap:wrap;gap:4px">${efCells.map(([lbl, val]) => `<div style="flex:1;min-width:80px;text-align:center;background:white;border-radius:3px;padding:4px 6px;border:1px solid #dbeafe"><div style="font-size:8px;color:#888;font-weight:700;text-transform:uppercase">${lbl}</div><div style="font-size:12px;font-weight:600;color:#1e3a8a">${val}</div></div>`).join('')}</div></div>` : ''}${meds.length > 0 ? `<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#316d74;text-transform:uppercase;margin-bottom:4px">Medicamentos aplicados en consulta</div><table contenteditable="true" style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #99d6d6"><thead><tr style="background:#e0f5f5"><th style="padding:3px 6px;text-align:left">Producto</th><th style="padding:3px 6px;text-align:left;width:100px">Dosis</th><th style="padding:3px 6px;text-align:left;width:70px">Vía</th></tr></thead><tbody>${meds.map(m => `<tr style="border-top:1px solid #c8ecec"><td style="padding:2px 6px">${m.medicamento}</td><td style="padding:2px 6px">${m.dosis || '—'}</td><td style="padding:2px 6px">${m.via || '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}${fxProds.length > 0 ? `<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#a6785b;text-transform:uppercase;margin-bottom:4px">Fórmula médica (para casa)</div><table contenteditable="true" style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #e5c4aa"><thead><tr style="background:#fdf3ec"><th style="padding:3px 6px;text-align:left">Producto</th><th style="padding:3px 6px;text-align:left;width:110px">Cantidad</th><th style="padding:3px 6px;text-align:left">Instrucciones</th></tr></thead><tbody>${fxProds.map(p => `<tr style="border-top:1px solid #f5e0cc"><td style="padding:2px 6px">${p.producto}</td><td style="padding:2px 6px">${p.cantidad || '—'}</td><td style="padding:2px 6px">${p.instrucciones || '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}${fld('Diagnóstico diferencial', c.diagnostico_diferencial)}${c.diagnostico_final ? `<div contenteditable="true" style="margin:8px 0;padding:6px 10px;background:#dcfce7;border-left:3px solid #16a34a;font-size:11px"><span style="font-weight:700;color:#15803d">Diagnóstico final: </span><span style="font-weight:600;color:#14532d">${c.diagnostico_final}</span></div>` : ''}${fld('Plan diagnóstico / terapéutico', c.plan_diagnostico)}${fld('Observaciones', c.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'vacuna') {
        const { v } = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #15803d"><div contenteditable="true" style="background:#dcfce7;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#15803d;font-size:12px">💉 VACUNA — ${v.date || '—'}</div><div style="font-size:10px;color:#555">${v.veterinario || v.vet || ''}</div></div><div style="padding:10px 14px">${fld('Vacuna / Producto', v.vaccine_name || v.nombre)}${fld('Lote', v.lote)}${fld('Dosis', v.dosis)}${fld('Vía', v.via)}${fld('Próxima dosis', v.next_dose || v.proxima_dosis)}${fld('Observaciones', v.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'imagen') {
        const { r } = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #1565c0"><div contenteditable="true" style="background:#e8f0ff;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#1565c0;font-size:12px">🔬 IMAGENOLOGÍA — ${r.date || '—'}</div><div style="font-size:10px;color:#555">${sn(r.sede_id)}${r.created_by ? ' · ' + r.created_by : ''}</div></div><div style="padding:10px 14px">${fld('Tipo', r.tipo)}${fld('Resultado / Interpretación', r.resultado)}${r.archivos?.length > 0 ? fld('Archivos', r.archivos.map(a => a.name).join(', ')) : ''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'proced') {
        const { p } = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #b91c1c"><div contenteditable="true" style="background:#fee2e2;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#b91c1c;font-size:12px">⚕️ PROCEDIMIENTO — ${p.fecha || '—'}${p.hora_creacion ? ' ' + p.hora_creacion : ''}</div><div style="font-size:10px;color:#555">${sn(p.sede_id)}${p.veterinario ? ' · Vet: ' + p.veterinario : ''}</div></div><div style="padding:10px 14px">${p.motivo ? `<div contenteditable="true" style="font-size:13px;font-weight:700;color:#b91c1c;margin-bottom:6px">${p.motivo}</div>` : ''}${fld('Tipo', p.tipo)}${fld('Descripción', p.descripcion)}${fld('Anestesia', p.anestesia)}${fld('Observaciones', p.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'lab') {
        const { l } = ev;
        return `<div style="margin-bottom:20px;border-left:4px solid #065f46"><div contenteditable="true" style="background:#d1fae5;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#065f46;font-size:12px">🧪 LABORATORIO — ${l.fecha_solicitado || '—'}</div><div style="font-size:10px;color:#555">${sn(l.sede_id)}</div></div><div style="padding:10px 14px">${fld('Tipo de examen', l.tipo_examen)}${fld('Procesamiento', l.procesamiento)}${fld('Estado', l.estado)}${l.fecha_subido ? fld('Fecha subido PDF', l.fecha_subido) : ''}${l.fecha_reportado ? fld('Fecha reportado', l.fecha_reportado) : ''}${l.reportado_por ? fld('Reportado por', l.reportado_por) : ''}${l.razon_no_reporte ? fld('Razón no reporte', l.razon_no_reporte) : ''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'hosp') {
        const { h, meds, reps } = ev;
        const dias = h.duration_days || (h.ingreso_date && h.alta_date ? Math.round((new Date(h.alta_date) - new Date(h.ingreso_date)) / 86400000) : '—');
        return `<div style="margin-bottom:20px;border-left:4px solid #991b1b"><div contenteditable="true" style="background:#fee2e2;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#991b1b;font-size:12px">${h.status === 'deslinde' ? '🏥 HOSPITALIZACIÓN — Deslinde informado: ' + h.alta_date : h.status === 'fallecido' ? '🏥 HOSPITALIZACIÓN — Fallecido: ' + h.alta_date : h.alta_date ? '🏥 HOSPITALIZACIÓN — Alta: ' + h.alta_date : '🏥 HOSPITALIZACIÓN — En curso'}</div><div style="font-size:10px;color:#555">${sn(h.sede_id)}${h.responsible_vet ? ' · Vet: ' + h.responsible_vet : ''}</div></div><div style="padding:10px 14px">${fld('Motivo de hospitalización', h.motivo)}${fld('Diagnóstico', h.diagnostico)}${fld('Ingreso', `${h.ingreso_date || '—'}${h.ingreso_time ? ' a las ' + h.ingreso_time : ''}`)}${h.alta_date ? fld(h.status === 'deslinde' ? 'Deslinde informado' : h.status === 'fallecido' ? 'Fallecimiento' : 'Alta', `${h.alta_date}${h.alta_time ? ' a las ' + h.alta_time : ''} · ${dias} día(s) hospitalizado`) : ''}${meds.length > 0 ? `<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase;margin-bottom:4px">Plan de tratamiento</div><table contenteditable="true" style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #fca5a5"><thead><tr style="background:#fee2e2"><th style="padding:3px 6px;text-align:left">Medicamento</th><th style="padding:3px 6px;text-align:left;width:80px">Dosis</th><th style="padding:3px 6px;text-align:left;width:70px">Unidad</th><th style="padding:3px 6px;text-align:left">Frecuencia</th></tr></thead><tbody>${meds.map(m => `<tr style="border-top:1px solid #fecaca"><td style="padding:2px 6px">${m.medicamento}</td><td style="padding:2px 6px">${m.dosis || '—'}</td><td style="padding:2px 6px">${m.unidad || '—'}</td><td style="padding:2px 6px">${m.frecuencia || '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}${reps?.length > 0 ? `<div style="margin:10px 0 0;border-top:1px dashed #fca5a5;padding-top:8px"><div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase;margin-bottom:6px">Reportes de evolución (${reps.length})</div>${reps.map(r => `<div style="border:1px solid #fca5a5;border-radius:4px;padding:6px 10px;margin-bottom:6px;background:white"><div style="font-size:9px;color:#991b1b;font-weight:700;margin-bottom:3px">📅 ${r.fecha}${r.hora ? ' a las ' + r.hora : ''}${r.veterinario ? ' · ' + r.veterinario : ''}${r.editado_por ? ' · ✏️ ' + r.editado_por : ''}</div><div style="font-size:11px;color:#333;white-space:pre-wrap;line-height:1.5">${r.contenido}</div>${r.fotos?.filter(f=>f.url).length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${r.fotos.filter(f=>f.url).map(f=>`<img src="${f.url}" style="width:130px;height:130px;object-fit:cover;border-radius:4px;border:1px solid #fca5a5;" />`).join('')}</div>` : ''}</div>`).join('')}</div>` : ''}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'control') {
        const { c } = ev;
        const meds = Array.isArray(c.medicamentos_aplicados) ? c.medicamentos_aplicados.filter(m => m.medicamento) : [];
        return `<div style="margin-bottom:20px;border-left:4px solid #316d74"><div contenteditable="true" style="background:#e0f5f5;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#316d74;font-size:12px">📋 CONTROL — ${c.date || '—'}${c.time ? ' · ' + c.time : ''}</div><div style="font-size:10px;color:#555">${sn(c.sede_id)}${c.veterinario ? ' · Vet: ' + c.veterinario : ''}</div></div><div style="padding:10px 14px">${fld('Motivo de control', c.motivo_control)}${fld('Hallazgos', c.hallazgos)}${meds.length > 0 ? `<div style="margin:8px 0"><div style="font-size:9px;font-weight:700;color:#316d74;text-transform:uppercase;margin-bottom:4px">Medicamentos aplicados</div><table contenteditable="true" style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #99d6d6"><thead><tr style="background:#e0f5f5"><th style="padding:3px 6px;text-align:left">Producto</th><th style="padding:3px 6px;text-align:left;width:100px">Dosis</th><th style="padding:3px 6px;text-align:left;width:70px">Vía</th></tr></thead><tbody>${meds.map(m => `<tr style="border-top:1px solid #c8ecec"><td style="padding:2px 6px">${m.medicamento}</td><td style="padding:2px 6px">${m.dosis || '—'}</td><td style="padding:2px 6px">${m.via || '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}${fld('Observaciones', c.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      if (ev.type === 'nota') {
        const { n } = ev;
        const d = n.created_at ? n.created_at.split('T')[0] : '—';
        return `<div style="margin-bottom:20px;border-left:4px solid #b8860b"><div contenteditable="true" style="background:#fff8e1;padding:8px 12px;display:flex;justify-content:space-between"><div style="font-weight:700;color:#b8860b;font-size:12px">📝 NOTA CLÍNICA — ${d}</div><div style="font-size:10px;color:#555">${n.created_by || ''}</div></div><div style="padding:10px 14px">${n.titulo ? `<div contenteditable="true" style="font-size:12px;font-weight:700;color:#b8860b;margin-bottom:6px">${n.titulo}</div>` : ''}${fld('Observaciones', n.observaciones)}</div></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">`;
      }
      return '';
    };

    const bodyContent = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;border-bottom:3px solid #2e5cbf;padding-bottom:14px"><div contenteditable="true"><div style="font-size:20px;font-weight:bold;color:#2e5cbf">🐾 Pets&amp;Pets Veterinaria</div><div style="font-size:11px;color:#666;margin-top:3px">Historia Clínica Completa · Generada el ${new Date().toLocaleDateString('es-CO')}</div></div><div contenteditable="true" style="text-align:right"><div style="font-weight:bold;font-size:16px">${pet.name}</div><div style="font-size:11px;color:#666">${pet.species}${pet.breed ? ` · ${pet.breed}` : ''} · ${pet.sex || ''} · ${pet.esterilizado || ''}</div>${client ? `<div style="font-size:11px;color:#666">👤 ${client.name}${client.phone ? ' · ' + client.phone : ''}</div>` : ''}<div style="font-size:10px;color:#999">Historia Clínica #${pet.no_historia || pet.id}</div></div></div><div contenteditable="true" style="display:flex;gap:6px;margin-bottom:20px;background:#f5f8ff;padding:10px 14px;border-radius:6px">${[['Edad', ageLabel(pet.birth_date || pet.fecha_nacimiento, pet.age)], ['Peso actual', `${pet.weight} kg`], ['Sexo', pet.sex || '—'], ['Esterilizado', pet.esterilizado || '—'], ['Carácter', pet.caracter || '—']].map(([lbl, val]) => `<div style="flex:1;min-width:90px"><div style="font-size:9px;text-transform:uppercase;color:#888;font-weight:700">${lbl}</div><div style="font-size:12px;font-weight:600">${val}</div></div>`).join('')}</div><div contenteditable="true" style="font-size:13px;font-weight:700;color:#2e5cbf;border-bottom:2px solid #2e5cbf;padding-bottom:4px;margin:0 0 18px;text-transform:uppercase;letter-spacing:0.05em">Historia Clínica — ${allEvents.length} eventos</div>${allEvents.length === 0 ? '<p style="text-align:center;color:#999;padding:30px">Sin eventos registrados.</p>' : allEvents.map(renderEvent).join('')}<div contenteditable="true" style="margin-top:32px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#aaa;text-align:center">Historia Clínica generada automáticamente por SofVet · Pets&amp;Pets Veterinaria · Cali, Colombia</div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Editando HC — ${pet.name}</title><style>*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#333;margin:0;background:#f0f0f0}#toolbar{position:fixed;top:0;left:0;right:0;background:#1d4ed8;color:white;padding:10px 20px;display:flex;align-items:center;gap:12px;z-index:999;font-size:13px}#toolbar button{padding:6px 16px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}#btn-save{background:#16a34a;color:white}#btn-print{background:white;color:#1d4ed8}#btn-close{background:rgba(255,255,255,0.2);color:white}#save-msg{font-size:12px;color:#86efac;display:none}#page{background:white;max-width:900px;margin:60px auto 40px;padding:24px 28px;box-shadow:0 2px 16px rgba(0,0,0,0.12)}[contenteditable]:focus{outline:2px solid #93c5fd;border-radius:2px;outline-offset:1px}@media print{#toolbar{display:none!important}body{background:white}#page{box-shadow:none;margin:0;padding:10px 14px}}</style></head><body><div id="toolbar"><span>✏️ <strong>Editando HC — ${pet.name}</strong> — clic en cualquier texto para editar</span><button id="btn-save">💾 Guardar cambios</button><button id="btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button><button id="btn-close" onclick="window.close()">✕ Cerrar</button><span id="save-msg">✅ Guardado</span></div><div id="page">${bodyContent}</div><script>document.getElementById('btn-save').onclick=function(){var html=document.getElementById('page').innerHTML;window.opener&&window.opener.postMessage({type:'HC_SAVE',patientId:${petId},html:html},'*');var m=document.getElementById('save-msg');m.style.display='inline';setTimeout(function(){m.style.display='none';},2500);};</script></body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  return (
    <div>
      {/* Back nav */}
      <button
        onClick={() => client ? navigate(`/clients/${client.id}`) : navigate('/patients')}
        style={{ background:'none', border:'none', color:'var(--color-primary)', cursor:'pointer', fontSize:'0.875rem', fontFamily:'var(--font-body)', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.35rem', padding:0 }}
      >
        ← {client ? `Volver a ${client.name}` : 'Volver a Pacientes'}
      </button>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'1.5rem', alignItems:'start' }}>

        {/* Pet info card */}
        <Card>
          <div style={{ display:'flex', gap:'1.25rem', alignItems:'flex-start' }}>
            <div style={{ width:80, height:80, borderRadius:'var(--radius-lg)', background:'var(--color-cream)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', flexShrink:0 }}>
              {speciesIcon(pet.species)}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.35rem', flexWrap:'wrap' }}>
                <h2 style={{ fontFamily:'var(--font-title)', color:'var(--color-primary)', fontSize:'1.5rem', lineHeight:1 }}>{pet.name}</h2>
                <span style={{ background:sc.bg, color:sc.color, padding:'3px 10px', borderRadius:999, fontSize:'0.7rem', fontWeight:500 }}>{pet.status}</span>
                {prepagadaStatus === 'activo' && <span style={{ background:'#e8f0ff', color:'#2e5cbf', padding:'3px 10px', borderRadius:999, fontSize:'0.7rem', fontWeight:600 }}>💳 Afiliado</span>}
                {prepagadaStatus === 'mora'   && <span style={{ background:'#fff8e1', color:'#b8860b', padding:'3px 10px', borderRadius:999, fontSize:'0.7rem', fontWeight:600 }}>⚠️ En Mora</span>}
              </div>
              <p style={{ fontSize:'0.875rem', color:'var(--color-text-muted)', marginBottom:'1rem' }}>
                {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
              </p>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>
                <DataChip label="Edad"        value={ageLabel(pet.birth_date || pet.fecha_nacimiento, pet.age)} />
                <DataChip label="Peso"        value={`${pet.weight} kg`}        />
                <DataChip label="Sexo"        value={pet.sex || '—'}            />
                <DataChip label="Esterilizado"value={pet.esterilizado || '—'}   />
                <DataChip label="Carácter"    value={pet.caracter || '—'}       />
                <DataChip label="HC Nº"       value={pet.no_historia ? `#${pet.no_historia}` : `#${pet.id}`} />
              </div>
            </div>
          </div>

          {/* Owner */}
          {client && (
            <div
              onClick={() => navigate(`/clients/${client.id}`)}
              style={{ marginTop:'1.25rem', padding:'0.75rem 1rem', background:'var(--color-info-bg)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer' }}
            >
              <div style={{ fontSize:'0.7rem', color:'var(--color-text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.2rem' }}>Propietario</div>
              <div style={{ fontWeight:600, color:'var(--color-primary)', fontSize:'0.875rem' }}>👤 {client.name}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', marginTop:'0.1rem' }}>{client.phone} · {client.email}</div>
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <Card title="Acciones rápidas">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            {quickActions.map(({ label, icon, action, color, primary, disabled, badge }) => (
              <button key={label} onClick={action} disabled={disabled} style={{ position:'relative', padding:'1rem 0.75rem', border:`1px solid ${primary ? color : disabled ? 'var(--color-border)' : 'var(--color-border)'}`, borderRadius:'var(--radius-md)', background: primary ? color : disabled ? 'var(--color-bg)' : 'var(--color-white)', color: primary ? 'white' : disabled ? 'var(--color-text-muted)' : 'var(--color-text)', cursor: disabled ? 'not-allowed' : 'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem', fontFamily:'var(--font-body)', fontSize:'0.8rem', fontWeight:500, transition:'var(--transition)', opacity: disabled ? 0.6 : 1 }}
                onMouseEnter={e => { if (!primary && !disabled) { e.currentTarget.style.background='var(--color-bg)'; e.currentTarget.style.borderColor=color; e.currentTarget.style.color=color; }}}
                onMouseLeave={e => { if (!primary && !disabled) { e.currentTarget.style.background='var(--color-white)'; e.currentTarget.style.borderColor='var(--color-border)'; e.currentTarget.style.color='var(--color-text)'; }}}
              >
                {badge != null && badge > 0 && (
                  <span style={{ position:'absolute', top:6, right:6, background:'#c0392b', color:'white', borderRadius:999, fontSize:'0.6rem', fontWeight:800, minWidth:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', lineHeight:1 }}>
                    {badge}
                  </span>
                )}
                <span style={{ fontSize:'1.5rem' }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Historia Clínica */}
      <Card
        title={`Historia Clínica (${petConsults.length} consultas · ${petControles.length} controles · ${petImaging.length} imág · ${petProcedimientos.length} proced · ${petLabPedidos.length} labs · ${petNotas.length} notas)`}
        action={
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button onClick={handleDownloadPDF} style={{ padding:'0.4rem 0.85rem', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.78rem', fontWeight:600, color:'var(--color-text-muted)', display:'flex', alignItems:'center', gap:'0.35rem' }}>
              📄 Descargar PDF
            </button>
            <button onClick={() => { setNotaForm({ titulo:'', observaciones:'' }); setNotaFile(null); setNotaModal(true); }} style={{ padding:'0.4rem 0.85rem', background:'var(--color-white)', border:'1px solid #b8860b', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.78rem', fontWeight:600, color:'#b8860b', display:'flex', alignItems:'center', gap:'0.35rem' }}>
              📝 Agregar nota
            </button>
            <Button size="sm" variant="secondary" onClick={() => { setEditingControl(null); setControlModal(true); }}>📋 Nuevo control</Button>
            <Button size="sm" variant="primary" onClick={() => { setEditingConsult(null); setConsultModal(true); }}>+ Nueva consulta</Button>
          </div>
        }
        style={{ marginBottom:'1.5rem' }}
      >
        {/* Sede filter pills */}
        {(() => {
          const sedesUsadas = [...new Set(patientConsults.map(c => c.sede_id).filter(Boolean))];
          if (sedesUsadas.length > 1) return (
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
              <button
                onClick={() => setSedeFilter(null)}
                style={{ padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', border:'1px solid', borderColor: sedeFilter === null ? 'var(--color-primary)' : 'var(--color-border)', background: sedeFilter === null ? 'var(--color-primary)' : 'var(--color-white)', color: sedeFilter === null ? 'white' : 'var(--color-text-muted)', transition:'var(--transition)' }}
              >
                Todas las sedes
              </button>
              {sedesUsadas.map(sid => {
                const s = SEDES.find(x => x.id === sid);
                if (!s) return null;
                const active = sedeFilter === sid;
                return (
                  <button
                    key={sid}
                    onClick={() => setSedeFilter(active ? null : sid)}
                    style={{ padding:'0.3rem 0.85rem', borderRadius:999, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', border:`1px solid ${s.color}`, background: active ? s.color : s.bg, color: active ? 'white' : s.color, transition:'var(--transition)' }}
                  >
                    📍 {s.nombre}
                  </button>
                );
              })}
            </div>
          );
          return null;
        })()}

        {recentConsults.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'var(--color-text-muted)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>📋</div>
            <p style={{ fontSize:'0.875rem' }}>Sin consultas registradas aún.</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'2px solid var(--color-border)' }}>
                  {['Fecha','Hora','Sede','Motivo','Diagnóstico final','Plan diagnóstico','Meds','Veterinario',''].map(h => (
                    <th key={h} style={{ padding:'0.65rem 1rem', textAlign:'left', fontSize:'0.72rem', fontWeight:600, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentConsults.map((c, idx) => {
                  const isIncomplete = c.estado === 'incompleta';
                  return (
                    <tr
                      key={c.id}
                      onClick={() => { setEditingConsult(c); setConsultModal(true); }}
                      style={{ borderBottom:'1px solid var(--color-border)', background: isIncomplete ? '#fffbeb' : idx%2===0 ? 'transparent' : 'rgba(49,109,116,0.02)', cursor:'pointer' }}
                      title="Haz clic para editar esta consulta"
                    >
                      <td style={{ padding:'0.85rem 1rem', fontSize:'0.875rem', whiteSpace:'nowrap', fontWeight:500 }}>{c.date}</td>
                      <td style={{ padding:'0.85rem 1rem', fontSize:'0.875rem', color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>{c.time || '—'}</td>
                      <td style={{ padding:'0.85rem 1rem', fontSize:'0.875rem', whiteSpace:'nowrap' }}>{sedeBadge(c.sede_id)}</td>
                      <td style={{ padding:'0.85rem 1rem', fontSize:'0.875rem', maxWidth:180 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--color-text-muted)' }}>{c.motivo_consulta || '—'}</div>
                      </td>
                      <td style={{ padding:'0.85rem 1rem', fontSize:'0.875rem', maxWidth:240 }}>
                        {isIncomplete
                          ? <span style={{ background:'#fff3cd', color:'#856404', padding:'2px 10px', borderRadius:999, fontSize:'0.72rem', fontWeight:700 }}>⏸ Incompleta</span>
                          : <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.diagnostico_final || '—'}</div>
                        }
                      </td>
                      <td style={{ padding:'0.85rem 1rem', fontSize:'0.875rem', maxWidth:200 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--color-text-muted)' }}>{c.plan_diagnostico || '—'}</div>
                      </td>
                      <td style={{ padding:'0.85rem 1rem', fontSize:'0.875rem', textAlign:'center' }}>
                        {c.medicamentos_aplicados?.length > 0
                          ? <span style={{ background:'var(--color-info-bg)', color:'var(--color-primary)', padding:'2px 8px', borderRadius:999, fontSize:'0.72rem', fontWeight:600 }}>{c.medicamentos_aplicados.length}</span>
                          : <span style={{ color:'var(--color-text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding:'0.85rem 1rem', maxWidth:160 }}>
                        <div style={{ fontSize:'0.75rem', color:'var(--color-text)', overflow:'hidden' }}><VetName name={c.veterinario} /></div>
                        {c.editado_por && (
                          <div style={{ fontSize:'0.68rem', color:'#b45309', marginTop:'0.1rem', whiteSpace:'nowrap' }}>✏️ {c.editado_por}{c.hora_edicion ? ` ${c.hora_edicion}` : ''}</div>
                        )}
                      </td>
                      <td style={{ padding:'0.85rem 1rem' }}>
                        <div style={{ display:'flex', gap:'0.35rem', alignItems:'center', flexWrap:'wrap' }}>
                          <span style={{ fontSize:'0.72rem', color:'var(--color-primary)', fontWeight:600 }}>✏️ Editar</span>
                          {canRemit && (
                            remisionesVis.some(r => r.record_type === 'consulta' && r.record_id === c.id)
                              ? <span style={{ fontSize:'0.68rem', background:'#e8f0fd', color:'#2e5cbf', borderRadius:999, padding:'1px 6px', fontWeight:700 }}>🔗</span>
                              : <button onClick={e => { e.stopPropagation(); setRemitirModal({ recordType:'consulta', recordId:c.id, servicio: c.motivo_consulta || 'Consulta' }); }}
                                  style={{ padding:'1px 6px', background:'white', border:'1px solid #2e5cbf', color:'#2e5cbf', borderRadius:999, cursor:'pointer', fontSize:'0.68rem', fontWeight:700, fontFamily:'var(--font-body)' }}>
                                  🔗
                                </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {petConsults.length > 5 && (
              <p style={{ textAlign:'center', fontSize:'0.78rem', color:'var(--color-text-muted)', padding:'0.75rem', borderTop:'1px solid var(--color-border)' }}>
                Mostrando las últimas 5 de {petConsults.length} consultas.
              </p>
            )}
          </div>
        )}

        {/* Controles */}
        {petControles.length > 0 && (
          <div style={{ marginTop:'1.5rem', borderTop:'2px solid #d1f0eb', paddingTop:'1.25rem' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#316d74', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.85rem' }}>
              📋 Controles ({petControles.length})
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid var(--color-border)' }}>
                    {['Fecha','Hora','Sede','Motivo de control','Hallazgos','Meds','Veterinario',''].map(h => (
                      <th key={h} style={{ padding:'0.55rem 0.85rem', textAlign:'left', fontSize:'0.72rem', fontWeight:600, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {petControles.map((c, idx) => (
                    <tr
                      key={c.id}
                      onClick={() => { setEditingControl(c); setControlModal(true); }}
                      style={{ borderBottom:'1px solid var(--color-border)', background: idx%2===0 ? 'transparent' : 'rgba(49,109,116,0.02)', cursor:'pointer' }}
                      title="Haz clic para editar este control"
                    >
                      <td style={{ padding:'0.75rem 0.85rem', fontSize:'0.875rem', whiteSpace:'nowrap', fontWeight:500 }}>{c.date}</td>
                      <td style={{ padding:'0.75rem 0.85rem', fontSize:'0.875rem', color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>{c.time || '—'}</td>
                      <td style={{ padding:'0.75rem 0.85rem', fontSize:'0.875rem', whiteSpace:'nowrap' }}>{sedeBadge(c.sede_id)}</td>
                      <td style={{ padding:'0.75rem 0.85rem', fontSize:'0.875rem', maxWidth:200 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.motivo_control || '—'}</div>
                      </td>
                      <td style={{ padding:'0.75rem 0.85rem', fontSize:'0.875rem', maxWidth:200 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--color-text-muted)' }}>{c.hallazgos || '—'}</div>
                      </td>
                      <td style={{ padding:'0.75rem 0.85rem', fontSize:'0.875rem', textAlign:'center' }}>
                        {c.medicamentos_aplicados?.length > 0
                          ? <span style={{ background:'var(--color-info-bg)', color:'var(--color-primary)', padding:'2px 8px', borderRadius:999, fontSize:'0.72rem', fontWeight:600 }}>{c.medicamentos_aplicados.length}</span>
                          : <span style={{ color:'var(--color-text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding:'0.75rem 0.85rem', maxWidth:140 }}>
                        <div style={{ fontSize:'0.75rem', color:'var(--color-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.veterinario || '—'}</div>
                        {c.editado_por && (
                          <div style={{ fontSize:'0.68rem', color:'#b45309', marginTop:'0.1rem', whiteSpace:'nowrap' }}>✏️ {c.editado_por}{c.hora_edicion ? ` ${c.hora_edicion}` : ''}</div>
                        )}
                      </td>
                      <td style={{ padding:'0.75rem 0.85rem' }}>
                        <span style={{ fontSize:'0.72rem', color:'#316d74', fontWeight:600 }}>✏️ Editar</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notas clínicas */}
        {petNotas.length > 0 && (
          <div style={{ marginTop:'1.5rem', borderTop:'2px solid #f5c842', paddingTop:'1.25rem' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#b8860b', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.85rem' }}>
              📝 Notas clínicas ({petNotas.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {petNotas.map(n => {
                const mismoAutor = n.editado_por && n.autor && n.editado_por === n.autor;
                return (
                <div key={n.id} style={{ border:'1px solid #f5c842', borderRadius:'var(--radius-md)', padding:'0.85rem 1rem', background:'#fffdf0' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.3rem', gap:'0.5rem' }}>
                    <span style={{ fontWeight:700, color:'#8a6200', fontSize:'0.9rem' }}>{n.titulo}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', flexShrink:0 }}>
                      <span style={{ fontSize:'0.68rem', color:'#b8860b', textAlign:'right' }}>
                        {n.created_at}{n.hora_creacion ? ` ${n.hora_creacion}` : ''}{n.autor ? ` · ${n.autor}` : ''}
                        {n.editado_por && (mismoAutor
                          ? ` · Editado${n.hora_edicion ? ` ${n.hora_edicion}` : ''}`
                          : ` · Editado por ${n.editado_por}${n.hora_edicion ? ` ${n.hora_edicion}` : ''}`
                        )}
                      </span>
                      <button
                        onClick={() => { setEditingNota(n); setNotaForm({ titulo: n.titulo, observaciones: n.observaciones || '', fecha_creacion: n.created_at || '', hora_creacion: n.hora_creacion || '' }); setNotaModal(true); }}
                        style={{ padding:'2px 7px', background:'#fffbe6', border:'1px solid #f5c842', borderRadius:4, cursor:'pointer', fontSize:'0.72rem', color:'#8a6200', fontWeight:600 }}
                      >✏️</button>
                    </div>
                  </div>
                  {n.observaciones && (
                    <p style={{ margin:'0 0 0.6rem', fontSize:'0.82rem', color:'var(--color-text)', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{n.observaciones}</p>
                  )}
                  {n.imagen_url && (
                    <img
                      src={n.imagen_url}
                      alt={n.titulo}
                      onClick={() => setNotaImageView(n.imagen_url)}
                      style={{ maxWidth:'100%', maxHeight:220, objectFit:'contain', borderRadius:'var(--radius-sm)', cursor:'zoom-in', border:'1px solid #f5c842' }}
                    />
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Procedimientos */}
        {petProcedimientos.length > 0 && (
          <div style={{ marginTop:'1.5rem', borderTop:'2px solid #fce4e4', paddingTop:'1.25rem' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#c0392b', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.85rem' }}>
              ⚕️ Procedimientos ({petProcedimientos.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {petProcedimientos.map(p => {
                const tipoBg = p.tipo === 'Cirugía' ? '#fce4e4' : p.tipo === 'Profilaxis' ? '#e8f5ee' : '#e8f0ff';
                const tipoCl = p.tipo === 'Cirugía' ? '#c0392b' : p.tipo === 'Profilaxis' ? '#2e7d50' : '#2e5cbf';
                return (
                  <div key={p.id} style={{ border:`1px solid ${tipoBg}`, borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', background: p.tipo === 'Cirugía' ? '#fff8f8' : p.tipo === 'Profilaxis' ? '#f0fdf4' : '#f5f0ff' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.3rem' }}>
                      <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                        <span style={{ background:tipoBg, color:tipoCl, padding:'2px 9px', borderRadius:999, fontSize:'0.7rem', fontWeight:700 }}>{p.tipo}</span>
                        {p.sede_id && sedeBadge(p.sede_id)}
                      </div>
                      <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                        <span style={{ fontSize:'0.72rem', color:'var(--color-text-muted)' }}>
                          {p.fecha}{p.hora_creacion ? ` ${p.hora_creacion}` : ''}
                          {(p.veterinario || p.created_by) && <span> · <VetName name={p.veterinario || p.created_by} muted /></span>}
                          {p.editado_por && <span style={{ color:'#b45309' }}> · ✏️ {p.editado_por}{p.hora_edicion ? ` ${p.hora_edicion}` : ''}</span>}
                        </span>
                        <button
                          onClick={() => { setEditingProced(p); setProcedModal(true); }}
                          style={{ padding:'2px 8px', background:'white', border:`1px solid ${tipoCl}`, color:tipoCl, borderRadius:6, cursor:'pointer', fontSize:'0.7rem', fontWeight:600, fontFamily:'var(--font-body)' }}
                        >✏️ Editar</button>
                        {canRemit && (
                          remisionesVis.some(r => r.record_type === 'procedimiento' && r.record_id === p.id)
                            ? <span style={{ padding:'2px 8px', background:'#e8f0fd', color:'#2e5cbf', borderRadius:6, fontSize:'0.7rem', fontWeight:700 }}>🔗 Remitido</span>
                            : <button onClick={() => setRemitirModal({ recordType:'procedimiento', recordId:p.id, servicio: p.motivo || p.tipo || 'Procedimiento' })}
                                style={{ padding:'2px 8px', background:'white', border:'1px solid #2e5cbf', color:'#2e5cbf', borderRadius:6, cursor:'pointer', fontSize:'0.7rem', fontWeight:600, fontFamily:'var(--font-body)' }}>
                                🔗 Remitir
                              </button>
                        )}
                      </div>
                    </div>
                    {p.motivo && <p style={{ fontSize:'0.9rem', color:'var(--color-text)', margin:'0 0 0.35rem', fontWeight:700 }}>{p.motivo}</p>}
                    <p style={{ fontSize:'0.82rem', color:'var(--color-text)', margin:'0 0 0.2rem', fontWeight:400, whiteSpace:'pre-wrap' }}>{p.descripcion}</p>
                    {p.anestesia && <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', margin:0 }}>💉 Anestesia: {p.anestesia}</p>}
                    {p.observaciones && <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', margin:'0.2rem 0 0', whiteSpace:'pre-wrap' }}>{p.observaciones}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Laboratorios */}
        {petLabPedidos.length > 0 && (
          <div style={{ marginTop:'1.5rem', borderTop:'2px solid #e8f5ee', paddingTop:'1.25rem' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#2e7d50', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.85rem' }}>
              🧪 Laboratorios ({petLabPedidos.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {petLabPedidos.map(p => {
                const labResult = laboratorios.find(l => String(l.pedido_id) === String(p.id));
                const estadoCfg = {
                  'Solicitado':          { bg:'#e8f0ff', color:'#2e5cbf', label:'Solicitado' },
                  'Subido SIN REPORTAR': { bg:'#fff8e1', color:'#b8860b', label:'PDF subido — sin reportar' },
                  'Reportado':           { bg:'#e8f5ee', color:'#2e7d50', label:'Reportado' },
                }[p.estado] || { bg:'#f5f5f5', color:'#666', label: p.estado };
                return (
                  <div key={p.id} style={{ border:'1px solid #c3e8d0', borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', background:'#f0fdf4' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.5rem' }}>
                      <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, fontSize:'0.875rem', color:'#2e7d50' }}>{p.tipo_examen}</span>
                        <span style={{ background: p.procesamiento === 'Externo' ? '#e8f0ff' : '#d8f0e0', color: p.procesamiento === 'Externo' ? '#2e5cbf' : '#2e7d50', padding:'1px 7px', borderRadius:999, fontSize:'0.68rem', fontWeight:600 }}>
                          {p.procesamiento || 'Interno'}
                        </span>
                        <span style={{ background:estadoCfg.bg, color:estadoCfg.color, padding:'1px 8px', borderRadius:999, fontSize:'0.68rem', fontWeight:700 }}>
                          {estadoCfg.label}
                        </span>
                      </div>
                      <span style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>
                        Solicitado: {p.fecha_solicitado || '—'}{p.hora_solicitado ? ` a las ${p.hora_solicitado}` : ''}
                        {p.fecha_reportado && ` · Reportado: ${p.fecha_reportado}`}
                        {p.reportado_por && ` por ${p.reportado_por}`}
                      </span>
                    </div>
                    {/* PDF result if available */}
                    {labResult && (
                      <div style={{ marginTop:'0.5rem', paddingTop:'0.5rem', borderTop:'1px solid #c3e8d0' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem', flexWrap:'wrap' }}>
                          <div style={{ flex:1 }}>
                            {labResult.resultados && (
                              <p style={{ fontSize:'0.8rem', color:'var(--color-text)', margin:'0 0 0.3rem', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{labResult.resultados}</p>
                            )}
                            {(labResult.archivos?.length > 0 ? labResult.archivos : labResult.file_url ? [{ name: 'Ver PDF adjunto', url: labResult.file_url }] : []).map((f, fi) => (
                              <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer"
                                style={{ display:'inline-block', marginRight:'0.5rem', fontSize:'0.78rem', color:'#2e7d50', fontWeight:600, textDecoration:'none' }}>
                                📄 {f.name}
                              </a>
                            ))}
                            {(labResult.fecha || labResult.hora_subida || labResult.created_by) && (
                              <p style={{ fontSize:'0.7rem', color:'var(--color-text-muted)', margin:'0.25rem 0 0' }}>
                                Subido: {labResult.fecha || '—'}{labResult.hora_subida ? ` a las ${labResult.hora_subida}` : ''}{labResult.created_by ? ` · ${labResult.created_by}` : ''}
                                {labResult.editado_por && <span style={{ color:'#b45309' }}> · ✏️ Editado por {labResult.editado_por}{labResult.hora_edicion ? ` a las ${labResult.hora_edicion}` : ''}</span>}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => { setEditingLab(labResult); setLabModal(true); }}
                            style={{ padding:'0.25rem 0.7rem', background:'white', border:'1px solid #b45309', color:'#b45309', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.72rem', fontWeight:600, fontFamily:'var(--font-body)', flexShrink:0 }}
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Imaging records */}
        {petImaging.length > 0 && (
          <div style={{ marginTop:'1.5rem', borderTop:'2px solid #e8f0ff', paddingTop:'1.25rem' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#1565c0', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.85rem' }}>
              🔬 Imagenología ({petImaging.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {petImaging.map(r => (
                <div key={r.id} style={{ border:'1px solid #d0deff', borderRadius:'var(--radius-md)', padding:'0.85rem 1rem', background:'#f5f8ff' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.5rem', marginBottom:'0.5rem' }}>
                    <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                      <span style={{ fontSize:'1rem' }}>{r.tipo === 'Radiografía' ? '🩻' : r.tipo === 'Ecografía' ? '📡' : '🧠'}</span>
                      <span style={{ fontWeight:700, fontSize:'0.875rem', color:'#1565c0' }}>{r.tipo}</span>
                      {r.sede_id && sedeBadge(r.sede_id)}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <span style={{ fontSize:'0.72rem', color:'var(--color-text-muted)' }}>
                        {r.date}{r.hora_creacion ? ` ${r.hora_creacion}` : ''}
                        {r.created_by && <span> · <VetName name={r.created_by} muted /></span>}
                        {r.editado_por && <span style={{ color:'#b45309' }}> · ✏️ {r.editado_por}{r.hora_edicion ? ` ${r.hora_edicion}` : ''}</span>}
                      </span>
                      <button
                        onClick={() => { setEditingImaging(r); setImagingModal(true); }}
                        style={{ padding:'2px 8px', background:'white', border:'1px solid #1565c0', color:'#1565c0', borderRadius:6, cursor:'pointer', fontSize:'0.7rem', fontWeight:600, fontFamily:'var(--font-body)' }}
                      >✏️ Editar</button>
                    </div>
                  </div>
                  <p style={{ fontSize:'0.82rem', color:'var(--color-text)', margin:'0 0 0.4rem', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{r.resultado}</p>
                  {r.archivos?.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem', marginTop:'0.3rem' }}>
                      {r.archivos.map((a, i) => (
                        a.url
                          ? <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ background:'#d0e4ff', color:'#1565c0', padding:'2px 8px', borderRadius:999, fontSize:'0.72rem', fontWeight:500, textDecoration:'none' }}>📎 {a.name}</a>
                          : <span key={i} style={{ background:'#e8e8e8', color:'#666', padding:'2px 8px', borderRadius:999, fontSize:'0.72rem', fontWeight:500 }}>📎 {a.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vacunas */}
        {vaccines.filter(v => v.patient_id === petId).length > 0 && (() => {
          const petVaccines = vaccines
            .filter(v => v.patient_id === petId)
            .sort((a, b) => (b.date_applied || b.date || '').localeCompare(a.date_applied || a.date || ''));
          return (
            <div style={{ marginTop:'1.5rem', borderTop:'2px solid #dcfce7', paddingTop:'1.25rem' }}>
              <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.85rem' }}>
                💉 Vacunas ({petVaccines.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                {petVaccines.map(v => {
                  const vDate = v.date_applied || v.date || '—';
                  const vName = v.vaccine_name || v.vaccine || v.nombre || '—';
                  const vNext = v.next_dose || v.next_date || v.proxima_vacuna || null;
                  const vVet  = v.vet || v.veterinario || null;
                  const vLote = v.batch || v.lote || null;
                  const isDesp = vName?.toLowerCase().includes('desparasit');
                  return (
                    <div key={v.id} style={{ border:'1px solid #bbf7d0', borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', background:'#f0fdf4' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.4rem' }}>
                        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                          <span style={{ fontWeight:700, fontSize:'0.875rem', color:'#15803d' }}>{isDesp ? '🪱' : '💉'} {vName}</span>
                          {vLote && <span style={{ background:'#dcfce7', color:'#166534', padding:'1px 7px', borderRadius:999, fontSize:'0.68rem', fontWeight:600 }}>Lote: {vLote}</span>}
                        </div>
                        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                          <span style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>
                            {vDate}{v.hora_creacion ? ` ${v.hora_creacion}` : ''}{vVet ? ` · ${vVet}` : ''}
                            {v.editado_por && <span style={{ color:'#b45309' }}> · ✏️ {v.editado_por}{v.hora_edicion ? ` ${v.hora_edicion}` : ''}</span>}
                          </span>
                          <button
                            onClick={() => {
                              if (isDesp) { setEditingDesparasitar(v); setDesparasitarModal(true); }
                              else        { setEditingVacuna(v);       setVacunaModal(true); }
                            }}
                            style={{ padding:'2px 8px', background:'white', border:'1px solid #15803d', color:'#15803d', borderRadius:6, cursor:'pointer', fontSize:'0.7rem', fontWeight:600, fontFamily:'var(--font-body)' }}
                          >✏️ Editar</button>
                          <button
                            onClick={() => { if (confirm(`¿Eliminar ${isDesp ? 'desparasitación' : 'vacuna'} "${vName}"?`)) removeVaccine(v.id); }}
                            style={{ padding:'2px 8px', background:'white', border:'1px solid var(--color-danger)', color:'var(--color-danger)', borderRadius:6, cursor:'pointer', fontSize:'0.7rem', fontWeight:600, fontFamily:'var(--font-body)' }}
                          >🗑️</button>
                        </div>
                      </div>
                      {vNext && (
                        <p style={{ fontSize:'0.78rem', color:'#2e7d50', margin:'0.3rem 0 0', fontWeight:500 }}>
                          📅 Próxima dosis: {vNext}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Hospitalizaciones */}
        {petHospitals.length > 0 && (
          <div style={{ marginTop:'1.5rem', borderTop:'2px solid #fce4e4', paddingTop:'1.25rem' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--color-danger)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.85rem' }}>
              🏥 Hospitalizaciones ({petHospitals.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {petHospitals.map(h => {
                const isActive = h.status === 'activo';
                return (
                  <div key={h.id} style={{ border:`1px solid ${isActive ? '#fca5a5' : 'var(--color-border)'}`, borderRadius:'var(--radius-md)', padding:'0.75rem 1rem', background: isActive ? '#fff5f5' : 'var(--color-white)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem', flexWrap:'wrap' }}>
                      <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ background: isActive ? '#fce4e4' : '#f3f4f6', color: isActive ? 'var(--color-danger)' : '#6b7280', padding:'2px 9px', borderRadius:999, fontSize:'0.7rem', fontWeight:700 }}>
                          {isActive ? '🔴 Activo' : '✅ Alta'}
                        </span>
                        {h.sede_id && sedeBadge(h.sede_id)}
                        <span style={{ fontSize:'0.75rem', color:'var(--color-text-muted)' }}>
                          Ingreso: {h.ingreso_date} {h.ingreso_time || ''}
                          {h.alta_date && ` · Alta: ${h.alta_date}`}
                        </span>
                      </div>
                      <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap' }}>
                        {canRemit && (
                          remisionesVis.some(r => r.record_type === 'hospitalizacion' && r.record_id === h.id)
                            ? <span style={{ padding:'2px 8px', background:'#e8f0fd', color:'#2e5cbf', borderRadius:6, fontSize:'0.7rem', fontWeight:700, flexShrink:0 }}>🔗 Remitido</span>
                            : <button onClick={() => setRemitirModal({ recordType:'hospitalizacion', recordId:h.id, servicio: h.motivo || 'Hospitalización' })}
                                style={{ padding:'2px 8px', background:'white', border:'1px solid #2e5cbf', color:'#2e5cbf', borderRadius:6, cursor:'pointer', fontSize:'0.7rem', fontWeight:600, fontFamily:'var(--font-body)', flexShrink:0 }}>
                                🔗 Remitir
                              </button>
                        )}
                        <button
                          onClick={() => setReviewHosp(h)}
                          style={{ padding:'2px 8px', background:'white', border:'1px solid #e67e22', color:'#e67e22', borderRadius:6, cursor:'pointer', fontSize:'0.7rem', fontWeight:600, fontFamily:'var(--font-body)', flexShrink:0 }}
                        >📊 Revisar</button>
                        <button
                          onClick={() => { setEditingHosp(h); setHospModal(true); }}
                          style={{ padding:'2px 8px', background:'white', border:'1px solid var(--color-danger)', color:'var(--color-danger)', borderRadius:6, cursor:'pointer', fontSize:'0.7rem', fontWeight:600, fontFamily:'var(--font-body)', flexShrink:0 }}
                        >✏️ Editar</button>
                      </div>
                    </div>
                    <p style={{ fontSize:'0.82rem', color:'var(--color-text)', margin:'0.4rem 0 0.15rem', fontWeight:600 }}>
                      {h.motivo}
                    </p>
                    {h.diagnostico && <p style={{ fontSize:'0.78rem', color:'var(--color-text-muted)', margin:0 }}>Dx: {h.diagnostico}</p>}
                    {h.responsible_vet && <p style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', margin:'0.2rem 0 0' }}>👨‍⚕️ <VetName name={h.responsible_vet} muted /></p>}
                    {h.editado_por && <p style={{ fontSize:'0.7rem', color:'#b45309', margin:'0.1rem 0 0' }}>✏️ Editado por {h.editado_por}{h.hora_edicion ? ` a las ${h.hora_edicion}` : ''}</p>}

                    {/* Reportes de esta hospitalización */}
                    {(() => {
                      const reps = hospReports
                        .filter(r => r.hospitalization_id === h.id)
                        .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
                      if (!reps.length) return null;
                      return (
                        <div style={{ marginTop:'0.75rem', borderTop:`1px dashed ${isActive ? '#fca5a5' : 'var(--color-border)'}`, paddingTop:'0.65rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                          <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color: isActive ? '#c0392b' : 'var(--color-text-muted)', marginBottom:'0.1rem' }}>
                            📋 Reportes ({reps.length})
                          </div>
                          {reps.map(r => (
                            <div key={r.id} style={{ background: isActive ? 'white' : 'var(--color-bg)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', padding:'0.6rem 0.75rem', position:'relative' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem', marginBottom:'0.3rem' }}>
                                <div style={{ fontSize:'0.68rem', color:'var(--color-text-muted)', fontWeight:600, display:'flex', flexDirection:'column', gap:'0.1rem' }}>
                                  <span>📅 {r.fecha}{r.hora ? ` a las ${r.hora}` : ''}{r.veterinario && <span> · 👨‍⚕️ <VetName name={r.veterinario} muted /></span>}</span>
                                  {r.editado_por && (
                                    <span style={{ fontWeight:500, color:'#b45309' }}>
                                      ✏️ Editado por {r.editado_por}{r.fecha_edicion ? ` · ${r.fecha_edicion}` : ''}{r.hora_edicion ? ` a las ${r.hora_edicion}` : ''}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => { setEditingReport(r); setHospRepModal(true); }}
                                  style={{ padding:'1px 7px', background:'white', border:'1px solid var(--color-border)', color:'var(--color-text-muted)', borderRadius:5, cursor:'pointer', fontSize:'0.65rem', fontWeight:600, fontFamily:'var(--font-body)', flexShrink:0 }}
                                >✏️ Editar</button>
                              </div>
                              <p style={{ fontSize:'0.8rem', color:'var(--color-text)', margin:0, whiteSpace:'pre-wrap', lineHeight:1.5 }}>{r.contenido}</p>
                              {r.fotos?.length > 0 && (
                                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginTop:'0.4rem' }}>
                                  {r.fotos.map((f, fi) => f.url && (
                                    <a key={fi} href={f.url} target="_blank" rel="noreferrer">
                                      <img src={f.url} alt={f.name} style={{ width:54, height:54, objectFit:'cover', borderRadius:4, border:'1px solid var(--color-border)' }} />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ── Documents section ── */}
      {(() => {
        const SEDES_DOC = { 1:'Santa Mónica', 2:'Colseguros', 3:'Ciudad Jardín', 4:'Domicilio' };
        const historial = [...petSignedDocs].sort((a, b) => b.id - a.id);
        const tabStyle = (active) => ({
          padding:'0.55rem 1.1rem', border:'none', borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
          background:'none', color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontFamily:'var(--font-body)', fontSize:'0.85rem', fontWeight: active ? 600 : 400, cursor:'pointer', whiteSpace:'nowrap',
        });
        return (
          <Card title="Consentimientos y Documentos">
            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--color-border)', marginBottom:'1.25rem', gap:0 }}>
              <button style={tabStyle(docTab === 'generar')} onClick={() => setDocTab('generar')}>
                📄 Generar documento
              </button>
              <button style={tabStyle(docTab === 'historial')} onClick={() => setDocTab('historial')}>
                📋 Documentos guardados {historial.length > 0 && <span style={{ marginLeft:'0.35rem', background:'var(--color-primary)', color:'white', borderRadius:999, fontSize:'0.68rem', padding:'0.05rem 0.45rem', fontWeight:700 }}>{historial.length}</span>}
              </button>
            </div>

            {/* Tab: Generar */}
            {docTab === 'generar' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'1rem' }}>
                {documents.map(doc => {
                  const sig = petSignedDocs.filter(s => s.document_id === doc.id && (s.tipo === 'firma' || s.tipo === 'impresion')).slice(-1)[0];
                  const esFirma = sig?.tipo === 'firma';
                  return (
                    <div
                      key={doc.id}
                      style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', padding:'1rem', display:'flex', flexDirection:'column', gap:'0.6rem', transition:'var(--transition)' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                        <div style={{ width:40, height:40, borderRadius:'var(--radius-sm)', background:'var(--color-info-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
                          {doc.icono}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:'0.82rem', color:'var(--color-text)', lineHeight:1.3 }}>{doc.nombre}</div>
                          {sig
                            ? <div style={{ fontSize:'0.7rem', color: esFirma ? 'var(--color-success)' : 'var(--color-primary)', fontWeight:600, marginTop:'0.15rem' }}>
                                {esFirma ? `✅ Firmado el ${sig.signed_at}` : `📄 Generado el ${sig.signed_at}`}
                              </div>
                            : <div style={{ fontSize:'0.7rem', color:'var(--color-text-muted)', marginTop:'0.15rem' }}>Sin generar</div>
                          }
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveDoc(doc)}
                        style={{ padding:'0.4rem 0.75rem', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.78rem', fontWeight:600, transition:'var(--transition)' }}
                      >
                        📄 Generar documento
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab: Historial */}
            {docTab === 'historial' && (
              historial.length === 0 ? (
                <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'var(--color-text-muted)' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>📂</div>
                  <p style={{ fontSize:'0.875rem' }}>No se han generado documentos para este paciente aún.</p>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                    <thead>
                      <tr style={{ background:'var(--color-bg)' }}>
                        {['Fecha','Documento','Tipo','Sede','Generado por'].map(h => (
                          <th key={h} style={{ padding:'0.55rem 0.85rem', textAlign:'left', fontWeight:600, color:'var(--color-text-muted)', borderBottom:'2px solid var(--color-border)', whiteSpace:'nowrap', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((r, i) => (
                        <tr key={r.id || i} style={{ borderBottom:'1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-bg)' }}>
                          <td style={{ padding:'0.6rem 0.85rem', whiteSpace:'nowrap', color:'var(--color-text-muted)' }}>{r.signed_at || '—'}</td>
                          <td style={{ padding:'0.6rem 0.85rem', fontWeight:600, color:'var(--color-text)' }}>{r.document_nombre || '—'}</td>
                          <td style={{ padding:'0.6rem 0.85rem' }}>
                            {r.tipo === 'firma'
                              ? <span style={{ background:'var(--color-success-bg)', color:'var(--color-success)', borderRadius:999, padding:'0.15rem 0.6rem', fontSize:'0.72rem', fontWeight:600 }}>✍️ Firma digital</span>
                              : <span style={{ background:'var(--color-info-bg)', color:'var(--color-primary)', borderRadius:999, padding:'0.15rem 0.6rem', fontSize:'0.72rem', fontWeight:600 }}>🖨️ Impreso</span>
                            }
                          </td>
                          <td style={{ padding:'0.6rem 0.85rem', color:'var(--color-text-muted)' }}>{r.sede_id ? SEDES_DOC[r.sede_id] : '—'}</td>
                          <td style={{ padding:'0.6rem 0.85rem', color:'var(--color-text-muted)' }}>{r.veterinario || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </Card>
        );
      })()}


      {/* ── Modal: Agregar / Editar nota clínica ── */}
      {notaModal && (
        <div onClick={() => { setNotaModal(false); setEditingNota(null); setNotaForm({ titulo: '', observaciones: '' }); setNotaFile(null); }} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:500, overflow:'hidden' }}>
            <div style={{ padding:'1.1rem 1.5rem', borderBottom:'1px solid var(--color-border)', background:'#fffdf0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, fontFamily:'var(--font-title)', color:'#8a6200', fontSize:'1rem' }}>{editingNota ? '✏️ Editar nota clínica' : '📝 Agregar nota clínica'}</h3>
              <button onClick={() => { setNotaModal(false); setEditingNota(null); setNotaForm({ titulo: '', observaciones: '' }); setNotaFile(null); }} style={{ background:'none', border:'none', fontSize:'1.1rem', cursor:'pointer', color:'var(--color-text-muted)' }}>×</button>
            </div>
            <div style={{ padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'0.9rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', marginBottom:'0.3rem', color:'var(--color-text)' }}>Título *</label>
                <input
                  type="text"
                  value={notaForm.titulo}
                  onChange={e => setNotaForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Parvo positivo, Lesión cutánea, Rx tórax..."
                  style={{ width:'100%', padding:'0.6rem 0.75rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.875rem', boxSizing:'border-box' }}
                />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', marginBottom:'0.3rem', color:'var(--color-text)' }}>Observaciones</label>
                <textarea
                  value={notaForm.observaciones}
                  onChange={e => setNotaForm(f => ({ ...f, observaciones: e.target.value }))}
                  rows={3}
                  placeholder="Descripción, hallazgos, seguimiento..."
                  style={{ width:'100%', padding:'0.6rem 0.75rem', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.875rem', resize:'vertical', boxSizing:'border-box' }}
                />
              </div>
              {editingNota && isAdminUser && (
                <div style={{ background:'#fef3c7', border:'1px solid #f59e0b', borderRadius:'var(--radius-sm)', padding:'0.75rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#92400e', textTransform:'uppercase', letterSpacing:'0.05em' }}>🔧 Corrección de fecha/hora (solo admin)</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                    <div>
                      <label style={{ display:'block', fontSize:'0.7rem', fontWeight:600, color:'#92400e', marginBottom:'0.25rem' }}>Fecha de creación</label>
                      <input type="date" value={notaForm.fecha_creacion || ''} onChange={e => setNotaForm(f => ({ ...f, fecha_creacion: e.target.value }))}
                        style={{ width:'100%', padding:'0.45rem 0.6rem', border:'1px solid #f59e0b', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.82rem', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'0.7rem', fontWeight:600, color:'#92400e', marginBottom:'0.25rem' }}>Hora de creación</label>
                      <input type="time" value={notaForm.hora_creacion || ''} onChange={e => setNotaForm(f => ({ ...f, hora_creacion: e.target.value }))}
                        style={{ width:'100%', padding:'0.45rem 0.6rem', border:'1px solid #f59e0b', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-body)', fontSize:'0.82rem', boxSizing:'border-box' }} />
                    </div>
                  </div>
                </div>
              )}
              {!editingNota && (
              <div>
                <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', marginBottom:'0.3rem', color:'var(--color-text)' }}>Imagen (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setNotaFile(e.target.files[0] || null)}
                  style={{ width:'100%', fontSize:'0.82rem' }}
                />
                {notaFile && (
                  <div style={{ marginTop:'0.4rem', fontSize:'0.75rem', color:'#b8860b' }}>
                    📎 {notaFile.name} ({(notaFile.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem', paddingTop:'0.25rem' }}>
                <button onClick={() => { setNotaModal(false); setEditingNota(null); setNotaForm({ titulo: '', observaciones: '' }); setNotaFile(null); }} style={{ padding:'0.55rem 1.1rem', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>Cancelar</button>
                <button
                  onClick={handleSaveNota}
                  disabled={notaUploading}
                  style={{ padding:'0.55rem 1.4rem', background: notaUploading ? '#aaa' : '#b8860b', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor: notaUploading ? 'not-allowed' : 'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:700 }}
                >
                  {notaUploading ? '⏳ Guardando...' : editingNota ? '💾 Guardar cambios' : '💾 Guardar nota'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox imagen nota ── */}
      {notaImageView && (
        <div onClick={() => setNotaImageView(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out', padding:'1rem' }}>
          <img src={notaImageView} alt="Nota" style={{ maxWidth:'95vw', maxHeight:'90vh', objectFit:'contain', borderRadius:'var(--radius-md)' }} />
        </div>
      )}

      {/* Modals */}
      <VacunaModal isOpen={vacunaModal} onClose={() => { setVacunaModal(false); setEditingVacuna(null); }} onSave={handleSaveVacuna} pet={pet} initialData={editingVacuna} />
      <DesparasitarModal isOpen={desparasitarModal} onClose={() => { setDesparasitarModal(false); setEditingDesparasitar(null); }} onSave={handleSaveDesparasitar} pet={pet} initialData={editingDesparasitar} />
      <ConsultationModal
        isOpen={consultModal}
        onClose={closeConsultModal}
        onSave={handleSaveConsultation}
        onSaveDraft={handleSaveDraft}
        onDelete={(id) => { removeConsultation(id); setPatientConsults(prev => prev.filter(c => c.id !== id)); setConsultModal(false); setEditingConsult(null); }}
        pet={pet}
        initialData={editingConsult ? {
          ...editingConsult,
          formula_productos: formulas.find(f => f.patient_id === petId && f.fecha === editingConsult.date)?.productos || editingConsult.formula_productos || [],
        } : null}
        mode={editingConsult ? (editingConsult.estado === 'incompleta' ? 'incomplete' : 'edit') : 'new'}
      />

      <ControlModal
        isOpen={controlModal}
        onClose={() => { setControlModal(false); setEditingControl(null); }}
        onSave={handleSaveControl}
        onDelete={(id) => { removeControl(id); setControlModal(false); setEditingControl(null); }}
        pet={pet}
        initialData={editingControl}
        mode={editingControl ? 'edit' : 'new'}
      />

      <HospitalizationModal isOpen={hospModal} onClose={() => { setHospModal(false); setEditingHosp(null); }} pet={pet} client={client} initialData={editingHosp} />

      <ImagingModal isOpen={imagingModal} onClose={() => { setImagingModal(false); setEditingImaging(null); }} onSave={handleSaveImaging} onEdit={handleEditImaging} pet={pet} initialData={editingImaging} />

      <ProcedimientosModal isOpen={procedModal} onClose={() => { setProcedModal(false); setEditingProced(null); }} onSave={handleSaveProcedimiento} pet={pet} initialData={editingProced} />

      <LaboratoriosModal
        isOpen={labModal}
        onClose={() => { setLabModal(false); setEditingLab(null); }}
        onSave={handleSaveLaboratorio}
        onEdit={handleEditLaboratorio}
        pet={pet}
        pedidos={labPedidos.filter(p => p.patient_id === petId)}
        initialData={editingLab}
        labId={editingLab?.id || null}
      />

      <SolicitarLabModal isOpen={labSolModal} onClose={() => setLabSolModal(false)} onSave={handleSolicitarLab} pet={pet} />

      {/* Lab choice mini-modal */}
      {labChoiceOpen && (
        <div onClick={() => setLabChoiceOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', padding:'1.5rem', width:340, display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <div style={{ fontFamily:'var(--font-title)', color:'#2e7d50', fontSize:'1rem', fontWeight:700, marginBottom:'0.25rem' }}>🧪 Laboratorio — {pet.name}</div>
            <button
              onClick={() => { setLabChoiceOpen(false); setLabSolModal(true); }}
              style={{ padding:'0.9rem 1rem', background:'#f0fdf4', border:'2px solid #2e7d50', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:600, color:'#2e7d50', textAlign:'left', display:'flex', alignItems:'center', gap:'0.75rem' }}
            >
              <span style={{ fontSize:'1.4rem' }}>📝</span>
              <div>
                <div>Solicitar laboratorio</div>
                <div style={{ fontSize:'0.72rem', fontWeight:400, color:'var(--color-text-muted)', marginTop:'0.1rem' }}>Crea un pedido · el lab sube el PDF después</div>
              </div>
            </button>
            <button
              onClick={() => { setLabChoiceOpen(false); setLabModal(true); }}
              style={{ padding:'0.9rem 1rem', background:'#f5f8ff', border:'2px solid #2e5cbf', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:600, color:'#2e5cbf', textAlign:'left', display:'flex', alignItems:'center', gap:'0.75rem' }}
            >
              <span style={{ fontSize:'1.4rem' }}>📁</span>
              <div>
                <div>Subir resultado (PDF)</div>
                <div style={{ fontSize:'0.72rem', fontWeight:400, color:'var(--color-text-muted)', marginTop:'0.1rem' }}>Tienes el PDF del resultado listo para subir</div>
              </div>
            </button>
          </div>
        </div>
      )}

      <LaboratoriosSinReportarModal
        isOpen={labSRModal}
        onClose={() => setLabSRModal(false)}
        pedidos={labPedidos}
        editPedido={editLabPedido}
        session={session}
        sedeActual={sedeActual}
        isAdmin={isAdminUser}
      />

      <HospitalizationReportModal isOpen={hospRepModal} onClose={() => { setHospRepModal(false); setEditingReport(null); }} onSave={handleSaveHospReport} onDelete={(id) => { removeHospReport(id); setHospRepModal(false); setEditingReport(null); }} pet={pet} hospitalizationId={editingReport?.hospitalization_id || activeHosp?.id} initialData={editingReport} />

      <HospReviewModal hosp={reviewHosp} onClose={() => setReviewHosp(null)} />

      {remitirModal && (
        <RemitirModal
          aliados={aliados}
          pet={pet}
          servicio={remitirModal.servicio}
          recordType={remitirModal.recordType}
          recordId={remitirModal.recordId}
          onClose={() => setRemitirModal(null)}
          onSave={async (data) => { await addRemision(data); setRemitirModal(null); }}
          session={session}
        />
      )}

      <FormulasModal isOpen={formulasModal} onClose={() => setFormulasModal(false)} pet={pet} client={client} formulas={formulas} />

      <DocumentModal
        isOpen={activeDoc !== null}
        onClose={() => setActiveDoc(null)}
        document={activeDoc}
        preselectedClientId={pet.client_id}
        preselectedPatientId={pet.id}
        session={session}
        sedeActual={sedeActual}
      />

      {/* Editar HC confirmation */}
      {editHCConfirm && (
        <div onClick={() => setEditHCConfirm(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--color-white)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)', padding:'2rem', width:420, textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>✏️</div>
            <h3 style={{ fontFamily:'var(--font-title)', color:'var(--color-text)', fontSize:'1.1rem', marginBottom:'0.5rem' }}>¿Editar Historia Clínica?</h3>
            <p style={{ fontSize:'0.875rem', color:'var(--color-text-muted)', marginBottom:'1.5rem', lineHeight:1.5 }}>
              Se abrirá una vista editable de la HC. Los cambios que hagas ahí son <strong>solo para esa impresión</strong> y no se guardan en el sistema.
            </p>
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center' }}>
              <button onClick={() => setEditHCConfirm(false)} style={{ padding:'0.6rem 1.25rem', background:'var(--color-white)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
                Cancelar
              </button>
              <button onClick={handleEditHC} style={{ padding:'0.6rem 1.5rem', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'0.875rem', fontWeight:600 }}>
                ✏️ Abrir editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataChip({ label, value }) {
  return (
    <div style={{ background:'var(--color-bg)', borderRadius:'var(--radius-sm)', padding:'0.5rem 0.75rem' }}>
      <div style={{ fontSize:'0.65rem', color:'var(--color-text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
      <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--color-text)', marginTop:'0.1rem' }}>{value}</div>
    </div>
  );
}
