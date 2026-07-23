const fs = require('fs');
const path = require('path');

const paths = [
  '/var/www/dashboard-ppm/Frontend/dist',
  '/var/www/dashboard-ppm/dist',
  '/var/www/dashboard-ppm/build',
  '/var/www/dashboard-ppm/Frontend/build'
];

console.log('--- SCANNING POTENTIAL FRONTEND ROOT PATHS ON VPS ---');
paths.forEach(p => {
  if (fs.existsSync(p)) {
    const stats = fs.statSync(p);
    console.log(`Path: ${p} | Exists: Yes | Modified: ${stats.mtime}`);
    const indexHtml = path.join(p, 'index.html');
    if (fs.existsSync(indexHtml)) {
      const indexStats = fs.statSync(indexHtml);
      console.log(`  index.html | Exists: Yes | Modified: ${indexStats.mtime}`);
    } else {
      console.log(`  index.html | Exists: No`);
    }
  } else {
    console.log(`Path: ${p} | Exists: No`);
  }
});
