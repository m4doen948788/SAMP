const pool = require('./src/config/db');
const muiController = require('./src/controllers/mappingUrusanInstansiController');
const mbpController = require('./src/controllers/mappingBidangPengampuController');

const mockRes = (label) => ({
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        console.log(`\n--- RESPONSE: ${label} ---`);
        console.log('Success:', data.success);
        if (!data.success) {
            console.log('Message:', data.message);
        } else {
            console.log('Row count:', data.data ? data.data.length : 'N/A');
            if (data.data && data.data.length > 0) {
                console.log('Sample row:', JSON.stringify(data.data[0]));
            }
        }
    }
});

const mockReq = {};

const diagnose = async () => {
    console.log('Testing Mapping Urusan Instansi (MUI) Controller...');
    await muiController.getAll(mockReq, mockRes('MUI'));

    console.log('\nTesting Mapping Bidang Pengampu (MBP) Controller...');
    await mbpController.getAll(mockReq, mockRes('MBP'));

    process.exit(0);
};

diagnose();
