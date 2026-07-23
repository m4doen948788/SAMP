const { exec } = require('child_process');

exec('pm2 jlist', (err, stdout, stderr) => {
  if (err) {
    console.error('Error running pm2:', err);
    return;
  }
  try {
    const list = JSON.parse(stdout);
    console.log('=== LIVE PM2 PROCESSES ON VPS ===');
    list.forEach(p => {
      console.log(`Name: ${p.name}`);
      console.log(`  Status: ${p.pm2_env.status}`);
      console.log(`  Path: ${p.pm2_env.pm_exec_path}`);
      console.log(`  Cwd: ${p.pm2_env.pm_cwd}`);
    });
  } catch (e) {
    console.error('JSON Parse error:', e.message);
  }
});
