const express = require('express');
const router = express.Router();
const notulenController = require('../controllers/notulenController');
const { verifyToken: auth } = require('../../../config/authMiddleware');

router.use(auth);

router.get('/', notulenController.getAll);
router.get('/:id', notulenController.getById);
router.post('/', notulenController.create);

module.exports = router;
