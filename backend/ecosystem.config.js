module.exports = {
  apps: [{
    name: 'butlr-api',
    cwd: '/root/butlr-backend',
    script: 'venv/bin/uvicorn',
    args: 'main:app --host 127.0.0.1 --port 8000',
    interpreter: 'none',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/root/butlr-backend/logs/error.log',
    out_file: '/root/butlr-backend/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
};
