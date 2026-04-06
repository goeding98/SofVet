let groomings = [
  { id: 1, patient_id: 1, patient_name: 'Luna', owner: 'María García', date: '2026-03-28', time: '10:00', services: ['Baño', 'Corte', 'Limpieza de oídos'], groomer: 'Ana Peluquera', price: 120000, status: 'en proceso', notes: 'Sensible en patas' },
  { id: 2, patient_id: 4, patient_name: 'Kira', owner: 'Pedro Sánchez', date: '2026-03-29', time: '14:00', services: ['Baño', 'Deslanado'], groomer: 'Ana Peluquera', price: 90000, status: 'pendiente', notes: '' },
  { id: 3, patient_id: 2, patient_name: 'Michi', owner: 'Carlos López', date: '2026-03-25', time: '11:30', services: ['Baño', 'Corte uñas'], groomer: 'Carlos Estilista', price: 70000, status: 'completado', notes: 'Muy tranquilo' },
];
let nextId = 4;

const getAll = (req, res) => {
  const { date, status } = req.query;
  let result = [...groomings];
  if (date) result = result.filter(g => g.date === date);
  if (status) result = result.filter(g => g.status === status);
  res.json({ success: true, data: result, total: result.length });
};

const getById = (req, res) => {
  const item = groomings.find(g => g.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Servicio de peluquería no encontrado' });
  res.json({ success: true, data: item });
};

const create = (req, res) => {
  const { patient_id, patient_name, owner, date, time, services, groomer, price, notes } = req.body;
  if (!patient_name || !date) {
    return res.status(400).json({ success: false, message: 'Paciente y fecha son requeridos' });
  }
  const newItem = { id: nextId++, patient_id, patient_name, owner, date, time, services: services || [], groomer, price: parseFloat(price) || 0, status: 'pendiente', notes: notes || '' };
  groomings.push(newItem);
  res.status(201).json({ success: true, data: newItem, message: 'Servicio de peluquería registrado' });
};

const update = (req, res) => {
  const idx = groomings.findIndex(g => g.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
  groomings[idx] = { ...groomings[idx], ...req.body, id: groomings[idx].id };
  res.json({ success: true, data: groomings[idx], message: 'Servicio actualizado' });
};

const remove = (req, res) => {
  const idx = groomings.findIndex(g => g.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
  groomings.splice(idx, 1);
  res.json({ success: true, message: 'Servicio eliminado' });
};

module.exports = { getAll, getById, create, update, remove };
