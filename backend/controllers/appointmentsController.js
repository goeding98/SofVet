let appointments = [
  { id: 1, patient_id: 1, patient_name: 'Luna', owner: 'María García', vet: 'Dr. Andrés Mora', service: 'Consulta General', date: '2026-03-28', time: '09:00', status: 'confirmada', notes: 'Control rutinario' },
  { id: 2, patient_id: 2, patient_name: 'Michi', owner: 'Carlos López', vet: 'Dra. Sofía Rivas', service: 'Vacunación', date: '2026-03-28', time: '10:30', status: 'pendiente', notes: 'Refuerzo anual' },
  { id: 3, patient_id: 3, patient_name: 'Rocky', owner: 'Ana Martínez', vet: 'Dr. Andrés Mora', service: 'Cirugía', date: '2026-03-29', time: '08:00', status: 'confirmada', notes: 'Esterilización' },
  { id: 4, patient_id: 4, patient_name: 'Kira', owner: 'Pedro Sánchez', vet: 'Dra. Sofía Rivas', service: 'Peluquería', date: '2026-03-29', time: '14:00', status: 'pendiente', notes: '' },
  { id: 5, patient_id: 5, patient_name: 'Toby', owner: 'Laura Rodríguez', vet: 'Dr. Andrés Mora', service: 'Consulta General', date: '2026-03-30', time: '11:00', status: 'cancelada', notes: 'Paciente enfermo' },
];
let nextId = 6;

const getAll = (req, res) => {
  const { date, status, vet } = req.query;
  let result = [...appointments];
  if (date) result = result.filter(a => a.date === date);
  if (status) result = result.filter(a => a.status === status);
  if (vet) result = result.filter(a => a.vet.toLowerCase().includes(vet.toLowerCase()));
  res.json({ success: true, data: result, total: result.length });
};

const getById = (req, res) => {
  const item = appointments.find(a => a.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Cita no encontrada' });
  res.json({ success: true, data: item });
};

const create = (req, res) => {
  const { patient_id, patient_name, owner, vet, service, date, time, notes } = req.body;
  if (!patient_name || !date || !time) {
    return res.status(400).json({ success: false, message: 'Paciente, fecha y hora son requeridos' });
  }
  const newItem = { id: nextId++, patient_id, patient_name, owner, vet, service, date, time, status: 'pendiente', notes: notes || '' };
  appointments.push(newItem);
  res.status(201).json({ success: true, data: newItem, message: 'Cita creada exitosamente' });
};

const update = (req, res) => {
  const idx = appointments.findIndex(a => a.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Cita no encontrada' });
  appointments[idx] = { ...appointments[idx], ...req.body, id: appointments[idx].id };
  res.json({ success: true, data: appointments[idx], message: 'Cita actualizada' });
};

const remove = (req, res) => {
  const idx = appointments.findIndex(a => a.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Cita no encontrada' });
  appointments.splice(idx, 1);
  res.json({ success: true, message: 'Cita eliminada' });
};

module.exports = { getAll, getById, create, update, remove };
