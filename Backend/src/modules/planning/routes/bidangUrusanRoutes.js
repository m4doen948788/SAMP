const express = require('express');
const router = express.Router();
const bidangUrusanController = require('../controllers/bidangUrusanController');

router.get('/', bidangUrusanController.getAll);
router.get('/:id', bidangUrusanController.getById);
router.post('/', bidangUrusanController.create);
router.put('/:id', bidangUrusanController.update);
router.delete('/:id', bidangUrusanController.remove);

module.exports = router;
