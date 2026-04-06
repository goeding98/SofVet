const crypto = require('crypto');

function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain + 'sofvet_s4lt_2026').digest('hex');
}

// Usuario administrador por defecto
const defaultUsers = [
  {
    id: 1,
    nombre: 'Administrador',
    email: 'guillermo@petspets.co',
    password_hash: hashPassword('petspets123'),
    rol: 'Administrador',
    estado: 'activo',
    must_change_password: false,
    fecha_creacion: '2026-01-01',
  },
];

// En producción esto vendría de la base de datos
// Aquí usamos un array en memoria inicializado con los defaults
let users = [...defaultUsers];
let nextId = 2;

module.exports = { users, hashPassword, getNextId: () => nextId++, reset: () => { users = [...defaultUsers]; } };
