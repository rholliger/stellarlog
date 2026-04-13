module.exports = {
  apps: [
    {
      name: 'stellarlog-backend',
      cwd: './backend',
      script: './venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        PYTHONUNBUFFERED: '1',
      },
      // Ensure venv exists before starting
      exec_mode: 'fork',
    },
    {
      name: 'stellarlog-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}
