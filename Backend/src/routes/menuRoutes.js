const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

router.get('/', menuController.getAll);
router.get('/:id', menuController.getById);
router.post('/', menuController.create);
router.put('/:id', menuController.update);
router.post('/reorder', menuController.reorder);
router.delete('/:id', menuController.remove);

module.exports = router;
