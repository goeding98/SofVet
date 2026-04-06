let vaccines = [
  { id: 1, patient_id: 1, patient_name: 'Luna', vaccine_name: 'Parvovirus', dose: '1ra dosis', date_applied: '2026-01-10', next_dose: '2026-04-10', vet: 'Dr. Andrés Mora', batch: 'LOT-2024-001', status: 'vigente' },
  { id: 2, patient_id: 1, patient_name: 'Luna', vaccine_name: 'Rabia', dose: 'Anual', date_applied: '2026-01-10', next_dose: '2027-01-10', vet: 'Dr. Andrés Mora', batch: 'LOT-2024-002', status: 'vigente' },
  { id: 3, patient_id: 2, patient_name: 'Michi', vaccine_name: 'Triple Felina', dose: 'Refuerzo', date_applied: '2025-12-05', next_dose: '2026-12-05', vet: 'Dra. Sofía Rivas', batch: 'LOT-2024-003', status: 'vigente' },
  { id: 4, patient_id: 3, patient_name: 'Rocky', vaccine_name: 'Moquillo', dose: '1ra dosis', date_applied: '2025-10-20', next_dose: '2026-04-20', vet: 'Dr. Andrés Mora', batch: 'LOT-2024-004', status: 'próximo' },
  { id: 5, patient_id: 4, patient_name: 'Kira', vaccine_name: 'Bordetella', dose: 'Anual', date_applied: '2025-06-15', next_dose: '2026-06-15', vet: 'Dra. Sofía Rivas', batch: 'LOT-2024-005', status: 'vigente' },
];
let nextId = 6;

const getAll = (req, res) => {
  const { patient_id, status } = req.query;
  let result = [...vaccines];
  if (patient_id) result = result.filter(v => v.patient_id === parseInt(patient_id));
  if (status) result = result.filter(v => v.status === status);
  res.json({ success: true, data: result, total: result.length });
};

const getById = (req, res) => {
  const item = vaccines.find(v => v.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Vacuna no encontrada' });
  res.json({ success: true, data: item });
};

const create = (req, res) => {
  const { patient_id, patient_name, vaccine_name, dose, date_applied, next_dose, vet, batch } = req.body;
  if (!patient_name || !vaccine_name || !date_applied) {
    return res.status(400).json({ success: false, message: 'Paciente, vacuna y fecha son requeridos' });
  }
  const newItem = { id: nextId++, patient_id, patient_name, vaccine_name, dose, date_applied, next_dose, vet, batch, status: 'vigente' };
  vaccines.push(newItem);
  res.status(201).json({ success: true, data: newItem, message: 'Vacuna registrada exitosamente' });
};

const update = (req, res) => {
  const idx = vaccines.findIndex(v => v.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Vacuna no encontrada' });
  vaccines[idx] = { ...vaccines[idx], ...req.body, id: vaccines[idx].id };
  res.json({ success: true, data: vaccines[idx], message: 'Vacuna actualizada' });
};

const remove = (req, res) => {
  const idx = vaccines.findIndex(v => v.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Vacuna no encontrada' });
  vaccines.splice(idx, 1);
  res.json({ success: true, message: 'Vacuna eliminada' });
};

module.exports = { getAll, getById, create, update, remove };
