/**
 * ecosystem.config.cjs
 * PM2 Process Management configuration for 24/7 Discord bot deployment.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'hcc-autoengage',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      restart_delay: 5000,
      max_restarts: 50,
      min_uptime: '10s',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Kolkata',
      },
    },
  ],
};
