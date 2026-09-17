const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/masterDataConfigController');

// Config CRUD
router.get('/', ctrl.getAllConfigs);
router.get('/:id', ctrl.getConfigById);
router.post('/', ctrl.createConfig);
router.put('/:id', ctrl.updateConfig);
router.delete('/:id', ctrl.deleteConfig);
router.get('/table/:tableName/data', ctrl.getDataByTable);
router.post('/table/:tableName/data', ctrl.createDataByTable);
router.put('/table/:tableName/data/:dataId', ctrl.updateDataByTable);
router.delete('/table/:tableName/data/:dataId', ctrl.deleteDataByTable);

// Dynamic table data CRUD
router.get('/:configId/data', ctrl.getData);
router.post('/:configId/data', ctrl.createData);
router.put('/:configId/data/:dataId', ctrl.updateData);
router.delete('/:configId/data/:dataId', ctrl.deleteData);

module.exports = router;
