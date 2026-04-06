const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const PAYLOAD_PATH = path.join(__dirname, '../data/sofvet_payload.json');

// GET /api/import/meta — estadísticas sin descargar todo el JSON
router.get('/meta', (req, res) => {
  if (!fs.existsSync(PAYLOAD_PATH)) {
    return res.status(404).json({ success: false, message: 'Payload no generado. Ejecuta: node backend/scripts/generateStoragePayload.js' });
  }
  try {
    const raw  = fs.readFileSync(PAYLOAD_PATH, 'utf-8');
    const data = JSON.parse(raw);
    res.json({ success: true, meta: data._meta, sizeMB: (Buffer.byteLength(raw, 'utf-8') / 1024 / 1024).toFixed(2) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error leyendo payload: ' + e.message });
  }
});

// GET /api/import/payload — devuelve el payload completo
router.get('/payload', (req, res) => {
  if (!fs.existsSync(PAYLOAD_PATH)) {
    return res.status(404).json({ success: false, message: 'Payload no generado.' });
  }
  try {
    const raw = fs.readFileSync(PAYLOAD_PATH, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.send(raw);
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error: ' + e.message });
  }
});

module.exports = router;
