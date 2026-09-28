const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todoController');

router.get('/', todoController.getAll);
router.get('/summary', todoController.getSummary);
router.post('/', todoController.create);
router.put('/reorder', todoController.reorder);
router.put('/:id', todoController.update);
router.patch('/:id/toggle', todoController.toggle);
router.delete('/:id', todoController.delete);

module.exports = router;
