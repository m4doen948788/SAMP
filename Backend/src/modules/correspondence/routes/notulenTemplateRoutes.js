const express = require('express');
const router = express.Router();
const notulenTemplateController = require('../controllers/notulenTemplateController');
const { verifyToken: auth } = require('../../../config/authMiddleware');

router.use(auth);

router.get('/', notulenTemplateController.getAll);
router.get('/global', notulenTemplateController.getGlobal);
router.put('/global', notulenTemplateController.updateGlobal);
router.get('/:id', notulenTemplateController.getById);
router.post('/', notulenTemplateController.create);
router.put('/:id', notulenTemplateController.update);
router.delete('/:id', notulenTemplateController.delete);

module.exports = router;
