const { exec } = require('child_process');

console.log('Searching for process on port 5001...');
exec('netstat -ano | findstr :5001', (err, stdout, stderr) => {
    if (err || !stdout) {
        console.log('No process found on port 5001 or error occurred.');
        // Try taskkill by image name as a fallback for node
         console.log('Attempting fallback: taskkill /F /IM node.exe...');
         // Note: This might kill other node processes, but it's a desperate measure for a crash
         // Actually, let's just try to find the PID first via a more robust way if netstat failed
        return;
    }

    const lines = stdout.trim().split('\n');
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
            console.log(`Found PID: ${pid}. Killing it...`);
            exec(`taskkill /F /PID ${pid}`, (killErr, killStdout, killStderr) => {
                if (killErr) {
                    console.error(`Failed to kill PID ${pid}: ${killStderr}`);
                } else {
                    console.log(`Successfully killed PID ${pid}.`);
                }
            });
        }
    });
});
