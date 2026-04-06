const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/hospitalizationController');

router.get('/pending',            ctrl.getPending);           // GET  /api/hospitalization/pending
router.get('/',                   ctrl.getAll);               // GET  /api/hospitalization?status=activo
router.get('/:id',                ctrl.getById);              // GET  /api/hospitalization/:id
router.post('/',                  ctrl.create);               // POST /api/hospitalization
router.put('/:id',                ctrl.update);               // PUT  /api/hospitalization/:id
router.delete('/:id',             ctrl.remove);               // DEL  /api/hospitalization/:id
router.get('/:id/applications',   ctrl.getApplications);      // GET  /api/hospitalization/:id/applications
router.post('/:id/applications',  ctrl.addApplication);       // POST /api/hospitalization/:id/applications
router.post('/:id/discharge',     ctrl.discharge);            // POST /api/hospitalization/:id/discharge
router.put('/:id/mark-paid',      ctrl.markPaid);             // PUT  /api/hospitalization/:id/mark-paid

module.exports = router;
