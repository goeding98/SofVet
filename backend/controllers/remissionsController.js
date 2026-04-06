let remissions = [
  { id: 1, patient_id: 3, patient_name: 'Rocky', owner: 'Ana Martínez', date: '2026-03-26', referred_to: 'Centro Especializado Veterinario', specialty: 'Neurología', reason: 'Evaluación de posible displasia', referring_vet: 'Dr. Andrés Mora', status: 'enviada', notes: 'Urgente, dolor en columna' },
  { id: 2, patient_id: 1, patient_name: 'Luna', owner: 'María García', date: '2026-03-10', referred_to: 'VetLab Diagnóstico', specialty: 'Dermatología', reason: 'Alergia crónica sin respuesta', referring_vet: 'Dra. Sofía Rivas', status: 'completada', notes: 'Mejoría tras tratamiento especializado' },
];
let nextId = 3;

const getAll = (req, res) => {
  const { status, patient_id } = req.query;
  let result = [...remissions];
  if (status) result = result.filter(r => r.status === status);
  if (patient_id) result = result.filter(r => r.patient_id === parseInt(patient_id));
  res.json({ success: true, data: result, total: result.length });
};

const getById = (req, res) => {
  const item = remissions.find(r => r.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Remisión no encontrada' });
  res.json({ success: true, data: item });
};

const create = (req, res) => {
  const { patient_id, patient_name, owner, date, referred_to, specialty, reason, referring_vet, notes } = req.body;
  if (!patient_name || !date || !referred_to) {
    return res.status(400).json({ success: false, message: 'Paciente, fecha y destino son requeridos' });
  }
  const newItem = { id: nextId++, patient_id, patient_name, owner, date, referred_to, specialty, reason, referring_vet, status: 'enviada', notes: notes || '' };
  remissions.push(newItem);
  res.status(201).json({ success: true, data: newItem, message: 'Remisión creada' });
};

const update = (req, res) => {
  const idx = remissions.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Remisión no encontrada' });
  remissions[idx] = { ...remissions[idx], ...req.body, id: remissions[idx].id };
  res.json({ success: true, data: remissions[idx], message: 'Remisión actualizada' });
};

const remove = (req, res) => {
  const idx = remissions.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Remisión no encontrada' });
  remissions.splice(idx, 1);
  res.json({ success: true, message: 'Remisión eliminada' });
};

module.exports = { getAll, getById, create, update, remove };
