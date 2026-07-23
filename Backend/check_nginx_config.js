const { exec } = require('child_process');

exec('cat /etc/nginx/sites-enabled/*', (err, stdout, stderr) => {
  if (err) {
    console.error('Error reading nginx configs:', err);
    return;
  }
  console.log('--- NGINX CONFIGS ON VPS ---');
  console.log(stdout);
});
