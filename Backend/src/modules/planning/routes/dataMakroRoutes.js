const express = require('express');
const router = express.Router();
const dataMakroController = require('../controllers/dataMakroController');

router.get('/', dataMakroController.getAll);
router.get('/with-nilai', dataMakroController.getWithNilai);
router.post('/', dataMakroController.create);
router.put('/:id', dataMakroController.update);
router.delete('/:id', dataMakroController.remove);

router.post('/nilai', dataMakroController.upsertNilai);

router.get('/:id/pegawai', dataMakroController.getPegawai);
router.post('/:id/pegawai', dataMakroController.setPegawai);

router.get('/otoritas/list', dataMakroController.getOtoritas);
router.post('/otoritas/list', dataMakroController.setOtoritas);

module.exports = router;
