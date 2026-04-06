// Fake data store (reemplazar con DB real)
let patients = [
  { id: 1, name: 'Luna', species: 'Perro', breed: 'Golden Retriever', age: 3, weight: 28.5, owner: 'María García', owner_phone: '3001234567', owner_email: 'maria@email.com', status: 'activo', created_at: '2024-01-15' },
  { id: 2, name: 'Michi', species: 'Gato', breed: 'Persa', age: 5, weight: 4.2, owner: 'Carlos López', owner_phone: '3109876543', owner_email: 'carlos@email.com', status: 'activo', created_at: '2024-02-20' },
  { id: 3, name: 'Rocky', species: 'Perro', breed: 'Bulldog Francés', age: 2, weight: 12.0, owner: 'Ana Martínez', owner_phone: '3205551234', owner_email: 'ana@email.com', status: 'hospitalizado', created_at: '2024-03-10' },
  { id: 4, name: 'Kira', species: 'Perro', breed: 'Labrador', age: 7, weight: 32.0, owner: 'Pedro Sánchez', owner_phone: '3001112233', owner_email: 'pedro@email.com', status: 'activo', created_at: '2024-01-05' },
  { id: 5, name: 'Toby', species: 'Conejo', breed: 'Holland Lop', age: 1, weight: 1.8, owner: 'Laura Rodríguez', owner_phone: '3154445566', owner_email: 'laura@email.com', status: 'activo', created_at: '2024-04-01' },
];
let nextId = 6;

const getAll = (req, res) => {
  const { species, status, search } = req.query;
  let result = [...patients];
  if (species) result = result.filter(p => p.species.toLowerCase() === species.toLowerCase());
  if (status) result = result.filter(p => p.status === status);
  if (search) result = result.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.owner.toLowerCase().includes(search.toLowerCase())
  );
  res.json({ success: true, data: result, total: result.length });
};

const getById = (req, res) => {
  const patient = patients.find(p => p.id === parseInt(req.params.id));
  if (!patient) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
  res.json({ success: true, data: patient });
};

const create = (req, res) => {
  const { name, species, breed, age, weight, owner, owner_phone, owner_email } = req.body;
  if (!name || !species || !owner) {
    return res.status(400).json({ success: false, message: 'Nombre, especie y propietario son requeridos' });
  }
  const newPatient = {
    id: nextId++,
    name, species, breed, age: parseInt(age) || 0,
    weight: parseFloat(weight) || 0,
    owner, owner_phone, owner_email,
    status: 'activo',
    created_at: new Date().toISOString().split('T')[0]
  };
  patients.push(newPatient);
  res.status(201).json({ success: true, data: newPatient, message: 'Paciente creado exitosamente' });
};

const update = (req, res) => {
  const idx = patients.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
  patients[idx] = { ...patients[idx], ...req.body, id: patients[idx].id };
  res.json({ success: true, data: patients[idx], message: 'Paciente actualizado' });
};

const remove = (req, res) => {
  const idx = patients.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
  patients.splice(idx, 1);
  res.json({ success: true, message: 'Paciente eliminado' });
};

module.exports = { getAll, getById, create, update, remove };
