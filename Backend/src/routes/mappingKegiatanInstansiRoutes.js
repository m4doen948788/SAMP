const express = require('express');
const router = express.Router();
const controller = require('../controllers/mappingKegiatanInstansiController');

router.get('/', controller.getAll);
router.post('/sync', controller.syncInstansiBulk);
router.post('/kegiatan', controller.updateKegiatan);
router.post('/sub-kegiatan', controller.updateSubKegiatan);

module.exports = router;
