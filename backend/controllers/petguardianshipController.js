let guardianships = [
  { id: 1, patient_id: 1, patient_name: 'Luna', owner: 'María García', check_in: '2026-03-25', check_out: '2026-03-30', room: 'Suite A', daily_rate: 80000, status: 'activo', special_care: 'Dieta especial sin gluten', responsible_vet: 'Dr. Andrés Mora' },
  { id: 2, patient_id: 4, patient_name: 'Kira', owner: 'Pedro Sánchez', check_in: '2026-03-27', check_out: '2026-04-02', room: 'Estándar 2', daily_rate: 60000, status: 'activo', special_care: 'Medicación cada 12h', responsible_vet: 'Dra. Sofía Rivas' },
  { id: 3, patient_id: 5, patient_name: 'Toby', owner: 'Laura Rodríguez', check_in: '2026-03-20', check_out: '2026-03-24', room: 'Pequeños 1', daily_rate: 45000, status: 'completado', special_care: 'Ninguno', responsible_vet: 'Dr. Andrés Mora' },
];
let nextId = 4;

const getAll = (req, res) => {
  const { status } = req.query;
  let result = [...guardianships];
  if (status) result = result.filter(g => g.status === status);
  res.json({ success: true, data: result, total: result.length });
};

const getById = (req, res) => {
  const item = guardianships.find(g => g.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Guardería no encontrada' });
  res.json({ success: true, data: item });
};

const create = (req, res) => {
  const { patient_id, patient_name, owner, check_in, check_out, room, daily_rate, special_care, responsible_vet } = req.body;
  if (!patient_name || !check_in) {
    return res.status(400).json({ success: false, message: 'Paciente y fecha de ingreso son requeridos' });
  }
  const newItem = { id: nextId++, patient_id, patient_name, owner, check_in, check_out, room, daily_rate: parseFloat(daily_rate) || 0, status: 'activo', special_care, responsible_vet };
  guardianships.push(newItem);
  res.status(201).json({ success: true, data: newItem, message: 'Guardería registrada' });
};

const update = (req, res) => {
  const idx = guardianships.findIndex(g => g.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Guardería no encontrada' });
  guardianships[idx] = { ...guardianships[idx], ...req.body, id: guardianships[idx].id };
  res.json({ success: true, data: guardianships[idx], message: 'Guardería actualizada' });
};

const remove = (req, res) => {
  const idx = guardianships.findIndex(g => g.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Guardería no encontrada' });
  guardianships.splice(idx, 1);
  res.json({ success: true, message: 'Guardería eliminada' });
};

module.exports = { getAll, getById, create, update, remove };
