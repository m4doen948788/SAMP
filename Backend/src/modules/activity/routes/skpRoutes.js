const express = require('express');
const router = express.Router();
const skpController = require('../controllers/skpController');
const skpConfigController = require('../../planning/controllers/subKegiatanSkpConfigController');

router.get('/records', skpController.getPegawaiRecords);
router.get('/history', skpController.getHistory);
router.get('/summary', skpController.getSummary);
router.post('/records', skpController.savePegawaiRecord);
router.get('/monthly-links', skpController.getMonthlyLinks);
router.post('/monthly-links', skpController.saveMonthlyLink);
router.post('/monthly-links/rename-butir', skpController.renameMonthlyButir);
router.get('/paririmbon-links', skpController.getParirimbonLinks);
router.post('/paririmbon-links', skpController.saveParirimbonLink);

router.get('/custom-items', skpController.getCustomItems);
router.post('/custom-items', skpController.addCustomItem);
router.post('/custom-items/delete', skpController.deleteCustomItem);

router.get('/custom-assignments', skpController.getCustomAssignments);
router.post('/custom-assignments', skpController.saveCustomAssignment);

// Sub-kegiatan SKP Config
router.get('/monthly-configs', skpConfigController.getBidangConfigs);
router.get('/sub-kegiatan/:id/config', skpConfigController.getConfig);
router.post('/sub-kegiatan/:id/config', skpConfigController.saveConfig);

module.exports = router;
