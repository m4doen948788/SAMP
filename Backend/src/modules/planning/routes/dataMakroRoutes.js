const express = require('express');
const router = express.Router();
const dataMakroController = require('../controllers/dataMakroController');
const { verifyToken } = require('../../../config/authMiddleware');

const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return verifyToken(req, res, next);
  }
  next();
};

router.get('/', dataMakroController.getAll);
router.get('/with-nilai', dataMakroController.getWithNilai);
router.get('/user-selection', optionalAuth, dataMakroController.getUserChartSelection);
router.post('/user-selection', verifyToken, dataMakroController.saveUserChartSelection);
router.post('/', verifyToken, dataMakroController.create);
router.put('/:id', verifyToken, dataMakroController.update);
router.delete('/:id', verifyToken, dataMakroController.remove);

router.post('/nilai', verifyToken, dataMakroController.upsertNilai);

router.get('/:id/pegawai', dataMakroController.getPegawai);
router.post('/:id/pegawai', verifyToken, dataMakroController.setPegawai);

router.get('/otoritas/list', dataMakroController.getOtoritas);
router.post('/otoritas/list', verifyToken, dataMakroController.setOtoritas);

module.exports = router;
