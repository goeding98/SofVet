const express = require('express');
const router = express.Router();
const {
  getUsers, createUser, deleteUser, changePassword,
  authMiddleware, adminOnly,
} = require('../controllers/usersController');

// All routes require auth
router.use(authMiddleware);

router.get('/',     adminOnly, getUsers);
router.post('/',    adminOnly, createUser);
router.delete('/:id', adminOnly, deleteUser);
router.put('/:id/password', changePassword);

module.exports = router;
