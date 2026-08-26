const express = require('express');
const router = express.Router();
const skpController = require('../controllers/skpController');

router.get('/pegawai', skpController.getPublicPegawai);
router.get('/bidang', skpController.getPublicBidang);
router.get('/mapping', skpController.getPublicMapping);
router.get('/monthly-links', skpController.getMonthlyLinks);
router.get('/public-documents', skpController.getPublicDocumentsByCell);
router.get('/custom-assignments', skpController.getCustomAssignments);

module.exports = router;
