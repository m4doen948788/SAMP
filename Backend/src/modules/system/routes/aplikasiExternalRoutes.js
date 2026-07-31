const express = require('express');
const router = express.Router();
const aplikasiExternalController = require('../controllers/aplikasiExternalController');
const { verifyToken } = require('../../../config/authMiddleware');

// Optional token verification middleware so req.user is set when token is present
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return verifyToken(req, res, next);
  }
  next();
};

router.get('/', aplikasiExternalController.getAll);
router.get('/:id', aplikasiExternalController.getById);
router.put('/reorder', optionalAuth, aplikasiExternalController.reorder);
router.post('/', optionalAuth, aplikasiExternalController.create);
router.put('/:id', optionalAuth, aplikasiExternalController.update);
router.delete('/:id', optionalAuth, aplikasiExternalController.remove);

module.exports = router;
