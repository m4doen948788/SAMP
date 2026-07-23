const { exec } = require('child_process');

exec('pm2 jlist', (err, stdout, stderr) => {
  if (err) {
    console.error('Error running pm2 jlist:', err);
    return;
  }
  try {
    const list = JSON.parse(stdout);
    console.log('--- PM2 PROCESS LIST ---');
    list.forEach(p => {
      console.log(`Name: ${p.name} | Status: ${p.pm2_env.status} | Script: ${p.pm2_env.pm_exec_path} | Cwd: ${p.pm2_env.pm_cwd}`);
    });
  } catch (e) {
    console.error('Error parsing pm2 output:', e.message);
    console.log('Raw output:', stdout.substring(0, 500));
  }
});
