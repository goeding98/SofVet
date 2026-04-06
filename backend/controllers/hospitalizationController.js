let hospitalizations = [
  { id: 1, patient_id: 3, patient_name: 'Rocky', client_name: 'Ana Martínez', client_phone: '', species: 'Perro', breed: '', weight: 0, age: 0, motivo: 'Cirugía de esterilización', diagnostico: 'Recuperación postquirúrgica', tratamiento: [], aplicaciones: [], ingreso_date: '2026-03-26', ingreso_time: '09:00', responsible_vet: 'Dr. Andrés Mora', status: 'activo' },
  { id: 2, patient_id: 2, patient_name: 'Michi',  client_name: 'Carlos López', client_phone: '', species: 'Gato',  breed: '', weight: 0, age: 0, motivo: 'Deshidratación severa',     diagnostico: 'Gastroenteritis',              tratamiento: [], aplicaciones: [], ingreso_date: '2026-03-20', ingreso_time: '11:00', responsible_vet: 'Dra. Sofía Rivas', status: 'cobrada', alta_date: '2026-03-23', alta_time: '10:00' },
];
let nextId = 3;

// ── helpers ────────────────────────────────────────────────────────────────
const calcDuration = (ingreso, alta) => {
  if (!ingreso || !alta) return null;
  const ms = new Date(alta) - new Date(ingreso);
  const days = Math.ceil(ms / 86400000);
  return days;
};

// ── CRUD ───────────────────────────────────────────────────────────────────
const getAll = (req, res) => {
  const { status } = req.query;
  let result = [...hospitalizations];
  if (status) result = result.filter(h => h.status === status);
  res.json({ success: true, data: result, total: result.length });
};

const getById = (req, res) => {
  const item = hospitalizations.find(h => h.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Hospitalización no encontrada' });
  res.json({ success: true, data: item });
};

const create = (req, res) => {
  const { patient_id, patient_name, client_name, client_phone, species, breed, weight, age, motivo, diagnostico, tratamiento, ingreso_date, ingreso_time, responsible_vet } = req.body;
  if (!patient_name || !ingreso_date || !motivo) {
    return res.status(400).json({ success: false, message: 'Paciente, fecha y motivo son requeridos' });
  }
  const newItem = {
    id: nextId++, patient_id, patient_name, client_name, client_phone,
    species, breed, weight, age, motivo, diagnostico,
    tratamiento: tratamiento || [], aplicaciones: [],
    ingreso_date, ingreso_time: ingreso_time || '',
    responsible_vet: responsible_vet || '', status: 'activo',
  };
  hospitalizations.push(newItem);
  res.status(201).json({ success: true, data: newItem, message: 'Hospitalización registrada' });
};

const update = (req, res) => {
  const idx = hospitalizations.findIndex(h => h.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Hospitalización no encontrada' });
  hospitalizations[idx] = { ...hospitalizations[idx], ...req.body, id: hospitalizations[idx].id };
  res.json({ success: true, data: hospitalizations[idx], message: 'Hospitalización actualizada' });
};

const remove = (req, res) => {
  const idx = hospitalizations.findIndex(h => h.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Hospitalización no encontrada' });
  hospitalizations.splice(idx, 1);
  res.json({ success: true, message: 'Hospitalización eliminada' });
};

// ── Applications ───────────────────────────────────────────────────────────
const getApplications = (req, res) => {
  const hosp = hospitalizations.find(h => h.id === parseInt(req.params.id));
  if (!hosp) return res.status(404).json({ success: false, message: 'Hospitalización no encontrada' });
  res.json({ success: true, data: hosp.aplicaciones || [], total: (hosp.aplicaciones || []).length });
};

const addApplication = (req, res) => {
  const idx = hospitalizations.findIndex(h => h.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Hospitalización no encontrada' });
  const { medicamentos, notas, aplicado_por, fecha, hora } = req.body;
  if (!medicamentos?.length) return res.status(400).json({ success: false, message: 'Se requiere al menos un medicamento' });
  const newApp = { medicamentos, notas: notas || '', aplicado_por, fecha, hora };
  hospitalizations[idx].aplicaciones = [...(hospitalizations[idx].aplicaciones || []), newApp];
  res.json({ success: true, data: newApp, message: 'Aplicación registrada' });
};

// ── Discharge ──────────────────────────────────────────────────────────────
const discharge = (req, res) => {
  const idx = hospitalizations.findIndex(h => h.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Hospitalización no encontrada' });
  const { billing_status, alta_date, alta_time } = req.body;
  if (!['cobrada', 'no_cobrada'].includes(billing_status)) {
    return res.status(400).json({ success: false, message: 'billing_status debe ser "cobrada" o "no_cobrada"' });
  }
  hospitalizations[idx] = {
    ...hospitalizations[idx],
    status: billing_status,
    alta_date: alta_date || new Date().toISOString().split('T')[0],
    alta_time: alta_time || new Date().toTimeString().slice(0, 5),
    duration_days: calcDuration(hospitalizations[idx].ingreso_date, alta_date),
  };
  res.json({ success: true, data: hospitalizations[idx], message: 'Alta registrada' });
};

// ── Pending (no_cobrada) ───────────────────────────────────────────────────
const getPending = (req, res) => {
  const pending = hospitalizations
    .filter(h => h.status === 'no_cobrada')
    .slice(-20)
    .reverse();
  res.json({ success: true, data: pending, total: pending.length });
};

// ── Mark paid ──────────────────────────────────────────────────────────────
const markPaid = (req, res) => {
  const idx = hospitalizations.findIndex(h => h.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Hospitalización no encontrada' });
  if (hospitalizations[idx].status !== 'no_cobrada') {
    return res.status(400).json({ success: false, message: 'Solo se pueden marcar como cobradas las hospitalizaciones pendientes' });
  }
  hospitalizations[idx].status = 'cobrada';
  res.json({ success: true, data: hospitalizations[idx], message: 'Marcada como cobrada' });
};

module.exports = { getAll, getById, create, update, remove, getApplications, addApplication, discharge, getPending, markPaid };
