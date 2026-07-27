const express = require('express');
const router = express.Router();
const controller = require('../controllers/mappingKegiatanInstansiController');
const skpConfigController = require('../controllers/subKegiatanSkpConfigController');

router.get('/', controller.getAll);
router.post('/sync', controller.syncInstansiBulk);
router.post('/kegiatan', controller.updateKegiatan);
router.post('/sub-kegiatan', controller.updateSubKegiatan);

// Sub-kegiatan SKP Monthly & Target Type Config routes
router.get('/sub-kegiatan/:id/skp-config', skpConfigController.getConfig);
router.post('/sub-kegiatan/:id/skp-config', skpConfigController.saveConfig);

module.exports = router;
