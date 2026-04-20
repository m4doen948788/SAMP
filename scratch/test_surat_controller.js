const path = require('path');
try {
    console.log('Attempting to require suratController...');
    const ctrl = require('../Backend/src/controllers/suratController');
    console.log('Successfully required suratController!');
    console.log('Exported methods:', Object.keys(ctrl));
} catch (err) {
    console.error('FAILED to require suratController:');
    console.error(err.stack || err);
    process.exit(1);
}
