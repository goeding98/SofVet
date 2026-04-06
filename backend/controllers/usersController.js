const crypto = require('crypto');
const { users, hashPassword, getNextId } = require('../data/users');

// ── In-memory token store ──────────────────────────────────────────────────
const tokens = new Map(); // token → { userId, expires }

function generateToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, { userId, expires: Date.now() + 24 * 60 * 60 * 1000 }); // 24 h
  return token;
}

function verifyToken(token) {
  const entry = tokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expires) { tokens.delete(token); return null; }
  return entry.userId;
}

// ── Middleware ─────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Token requerido.' });
  }
  const userId = verifyToken(auth.slice(7));
  if (!userId) return res.status(401).json({ error: 'Token inválido o expirado.' });
  const user = users.find(u => u.id === userId && u.estado === 'activo');
  if (!user) return res.status(401).json({ error: 'Usuario inactivo.' });
  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.rol !== 'Administrador') {
    return res.status(403).json({ error: 'Acceso restringido a administradores.' });
  }
  next();
}

// ── Auth controllers ───────────────────────────────────────────────────────
const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }
  const user = users.find(u => u.email === email && u.estado === 'activo');
  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }
  const token = generateToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      must_change_password: user.must_change_password,
    },
  });
};

// ── Users CRUD (Admin only) ────────────────────────────────────────────────
const getUsers = (req, res) => {
  const list = users.map(({ password_hash, ...u }) => u);
  res.json(list);
};

const createUser = (req, res) => {
  const { nombre, email, rol, temp_password } = req.body;
  if (!nombre || !email || !rol || !temp_password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos.' });
  }
  if (!['Médico', 'Auxiliar', 'Administrador'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido.' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'El email ya está registrado.' });
  }
  const newUser = {
    id: getNextId(),
    nombre,
    email,
    password_hash: hashPassword(temp_password),
    rol,
    estado: 'activo',
    must_change_password: true,
    fecha_creacion: new Date().toISOString().split('T')[0],
  };
  users.push(newUser);
  const { password_hash, ...safe } = newUser;
  res.status(201).json({ message: 'Usuario creado exitosamente.', user: safe });
};

const deleteUser = (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' });
  }
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });
  users.splice(idx, 1);
  res.json({ message: 'Usuario eliminado.' });
};

const changePassword = (req, res) => {
  const id = parseInt(req.params.id);
  if (id !== req.user.id) {
    return res.status(403).json({ error: 'Solo puedes cambiar tu propia contraseña.' });
  }
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Contraseña anterior y nueva son requeridas.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres.' });
  }
  const user = users.find(u => u.id === id);
  if (user.password_hash !== hashPassword(old_password)) {
    return res.status(401).json({ error: 'La contraseña anterior no es correcta.' });
  }
  user.password_hash = hashPassword(new_password);
  user.must_change_password = false;
  res.json({ message: 'Contraseña cambiada exitosamente.' });
};

module.exports = { login, getUsers, createUser, deleteUser, changePassword, authMiddleware, adminOnly };
