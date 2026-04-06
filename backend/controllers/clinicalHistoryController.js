let histories = [
  { id: 1, patient_id: 1, patient_name: 'Luna', date: '2026-03-01', vet: 'Dr. Andrés Mora', reason: 'Consulta de control', diagnosis: 'Paciente sano, en buen estado general', treatment: 'Vitaminas B-Complex', observations: 'Peso estable, pelaje brillante', weight: 28.5, temperature: 38.5 },
  { id: 2, patient_id: 2, patient_name: 'Michi', date: '2026-02-15', vet: 'Dra. Sofía Rivas', reason: 'Pérdida de apetito', diagnosis: 'Gastritis leve', treatment: 'Omeprazol 5mg/día por 7 días', observations: 'Mejoría esperada en 48h', weight: 4.0, temperature: 39.0 },
  { id: 3, patient_id: 3, patient_name: 'Rocky', date: '2026-03-15', vet: 'Dr. Andrés Mora', reason: 'Herida en pata delantera', diagnosis: 'Laceración superficial', treatment: 'Limpieza, antibiótico tópico, vendaje', observations: 'Revisar en 5 días', weight: 12.0, temperature: 38.8 },
  { id: 4, patient_id: 1, patient_name: 'Luna', date: '2025-12-10', vet: 'Dra. Sofía Rivas', reason: 'Vacunación anual', diagnosis: 'Saludable', treatment: 'Vacuna rabia + moquillo', observations: 'Sin reacciones adversas', weight: 27.8, temperature: 38.3 },
];
let nextId = 5;

const getAll = (req, res) => {
  const { patient_id } = req.query;
  let result = [...histories];
  if (patient_id) result = result.filter(h => h.patient_id === parseInt(patient_id));
  result.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ success: true, data: result, total: result.length });
};

const getById = (req, res) => {
  const item = histories.find(h => h.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Historial no encontrado' });
  res.json({ success: true, data: item });
};

const create = (req, res) => {
  const { patient_id, patient_name, date, vet, reason, diagnosis, treatment, observations, weight, temperature } = req.body;
  if (!patient_name || !date || !diagnosis) {
    return res.status(400).json({ success: false, message: 'Paciente, fecha y diagnóstico son requeridos' });
  }
  const newItem = { id: nextId++, patient_id, patient_name, date, vet, reason, diagnosis, treatment, observations, weight: parseFloat(weight) || 0, temperature: parseFloat(temperature) || 0 };
  histories.push(newItem);
  res.status(201).json({ success: true, data: newItem, message: 'Historial clínico creado' });
};

const update = (req, res) => {
  const idx = histories.findIndex(h => h.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Historial no encontrado' });
  histories[idx] = { ...histories[idx], ...req.body, id: histories[idx].id };
  res.json({ success: true, data: histories[idx], message: 'Historial actualizado' });
};

const remove = (req, res) => {
  const idx = histories.findIndex(h => h.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Historial no encontrado' });
  histories.splice(idx, 1);
  res.json({ success: true, message: 'Historial eliminado' });
};

module.exports = { getAll, getById, create, update, remove };
