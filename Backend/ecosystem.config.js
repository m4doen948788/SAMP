module.exports = {
  apps: [
    // --- DASHBOARD BACKEND SERVICES ---
    {
      name: 'ppm-auth',
      script: 'src/services/auth/server.js',
      cwd: 'd:/copy-dashboard/Backend',
      env: { NODE_ENV: 'development', PORT: 5001 }
    },
    {
      name: 'ppm-surat',
      script: 'src/services/smart-office/server.js',
      cwd: 'd:/copy-dashboard/Backend',
      env: { NODE_ENV: 'development', PORT: 5002 }
    },
    {
      name: 'ppm-performance',
      script: 'src/services/performance/server.js',
      cwd: 'd:/copy-dashboard/Backend',
      env: { NODE_ENV: 'development', PORT: 5003 }
    },
    {
      name: 'ppm-planning',
      script: 'src/services/planning/server.js',
      cwd: 'd:/copy-dashboard/Backend',
      env: { NODE_ENV: 'development', PORT: 5004 }
    },
    {
      name: 'ppm-system',
      script: 'src/services/system/server.js',
      cwd: 'd:/copy-dashboard/Backend',
      env: { NODE_ENV: 'development', PORT: 5005 }
    },

    // --- FRONTEND DASHBOARD ---
    {
      name: 'ppm-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: 'd:/copy-dashboard/Frontend'
    },

    // --- NAYAXA ENGINE (AI) ---
    {
      name: 'nayaxa-backend',
      script: 'src/index.js',
      cwd: 'd:/nayaxa-engine/Backend',
      env: { NODE_ENV: 'development', PORT: 6001 }
    },
    {
      name: 'nayaxa-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: 'd:/nayaxa-engine/Frontend'
    }
  ]
};
