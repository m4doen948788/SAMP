const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('--- VPS ENV CONFIG ---');
console.log('PORT:', process.env.PORT);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
