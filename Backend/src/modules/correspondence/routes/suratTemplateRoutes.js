const express = require('express');
const router = express.Router();
const suratTemplateController = require('../controllers/suratTemplateController');
const suratGlobalSettingsController = require('../controllers/suratGlobalSettingsController');
const { verifyToken } = require('../../../config/authMiddleware');

router.use(verifyToken);

router.get('/global', suratGlobalSettingsController.getGlobalSettings);
router.post('/global', suratGlobalSettingsController.updateGlobalSettings);

router.get('/', suratTemplateController.getAll);
router.get('/:id', suratTemplateController.getById);
router.post('/', suratTemplateController.create);
router.put('/:id', suratTemplateController.update);
router.delete('/:id', suratTemplateController.delete);

module.exports = router;
