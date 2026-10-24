const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { verifyToken } = require('../../../config/authMiddleware');

// Optional token verification middleware so req.user is set when token is present
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return verifyToken(req, res, next);
  }
  next();
};

router.get('/', optionalAuth, menuController.getAll);
router.get('/:id', menuController.getById);
router.post('/', optionalAuth, menuController.create);
router.put('/:id', optionalAuth, menuController.update);
router.post('/reorder', optionalAuth, menuController.reorder);
router.post('/:id/toggle-qa', optionalAuth, menuController.toggleQuickAccess);
router.delete('/:id', optionalAuth, menuController.remove);

module.exports = router;
