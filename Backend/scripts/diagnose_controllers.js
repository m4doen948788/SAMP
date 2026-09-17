const pool = require('./src/config/db');
const muiController = require('./src/controllers/mappingUrusanInstansiController');
const mbpController = require('./src/controllers/mappingBidangPengampuController');

const mockRes = {
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        console.log('--- RESPONSE ---');
        console.log('Status Code:', this.statusCode || 200);
        console.log('Data:', JSON.stringify(data, null, 2));
    }
};

const mockReq = {};

const diagnose = async () => {
    console.log('Testing Mapping Urusan Instansi (MUI) Controller...');
    try {
        await muiController.getAll(mockReq, mockRes);
    } catch (err) {
        console.error('MUI Controller Crash:', err);
    }

    console.log('\nTesting Mapping Bidang Pengampu (MBP) Controller...');
    try {
        await mbpController.getAll(mockReq, mockRes);
    } catch (err) {
        console.error('MBP Controller Crash:', err);
    }

    process.exit(0);
};

diagnose();
