let epsRecords = [
  { id: 1, patient_id: 1, patient_name: 'Luna', owner: 'María García', insurance_company: 'PetSalud EPS', policy_number: 'PS-2024-001', coverage: 'Consultas + Cirugías + Hospitalización', deductible: 150000, validity_from: '2026-01-01', validity_to: '2026-12-31', status: 'activo', notes: 'Cobertura hasta $10.000.000 anuales' },
  { id: 2, patient_id: 4, patient_name: 'Kira', owner: 'Pedro Sánchez', insurance_company: 'MascotaSegura', policy_number: 'MS-2024-045', coverage: 'Consultas + Vacunación', deductible: 80000, validity_from: '2026-02-01', validity_to: '2027-01-31', status: 'activo', notes: 'Plan básico' },
  { id: 3, patient_id: 2, patient_name: 'Michi', owner: 'Carlos López', insurance_company: 'PetSalud EPS', policy_number: 'PS-2024-089', coverage: 'Consultas + Emergencias', deductible: 100000, validity_from: '2025-06-01', validity_to: '2026-05-31', status: 'por vencer', notes: 'Renovar próximo mes' },
];
let nextId = 4;

const getAll = (req, res) => {
  const { status, patient_id } = req.query;
  let result = [...epsRecords];
  if (status) result = result.filter(e => e.status === status);
  if (patient_id) result = result.filter(e => e.patient_id === parseInt(patient_id));
  res.json({ success: true, data: result, total: result.length });
};

const getById = (req, res) => {
  const item = epsRecords.find(e => e.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Registro EPS no encontrado' });
  res.json({ success: true, data: item });
};

const create = (req, res) => {
  const { patient_id, patient_name, owner, insurance_company, policy_number, coverage, deductible, validity_from, validity_to, notes } = req.body;
  if (!patient_name || !insurance_company || !policy_number) {
    return res.status(400).json({ success: false, message: 'Paciente, aseguradora y póliza son requeridos' });
  }
  const newItem = { id: nextId++, patient_id, patient_name, owner, insurance_company, policy_number, coverage, deductible: parseFloat(deductible) || 0, validity_from, validity_to, status: 'activo', notes: notes || '' };
  epsRecords.push(newItem);
  res.status(201).json({ success: true, data: newItem, message: 'EPS registrada' });
};

const update = (req, res) => {
  const idx = epsRecords.findIndex(e => e.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Registro EPS no encontrado' });
  epsRecords[idx] = { ...epsRecords[idx], ...req.body, id: epsRecords[idx].id };
  res.json({ success: true, data: epsRecords[idx], message: 'EPS actualizada' });
};

const remove = (req, res) => {
  const idx = epsRecords.findIndex(e => e.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Registro EPS no encontrado' });
  epsRecords.splice(idx, 1);
  res.json({ success: true, message: 'EPS eliminada' });
};

module.exports = { getAll, getById, create, update, remove };
