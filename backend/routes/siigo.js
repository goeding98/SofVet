const router = require('express').Router();
const ctrl   = require('../controllers/siigoController');

router.get('/customers/:identification', ctrl.searchCustomer);
router.post('/customers',               ctrl.createCustomer);
router.get('/products',                 ctrl.getProducts);
router.get('/document-types',           ctrl.getDocumentTypes);
router.get('/payment-types',            ctrl.getPaymentTypes);
router.post('/invoices',                ctrl.createInvoice);

module.exports = router;
