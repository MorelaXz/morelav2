module.exports = {
  apps: [
    
    {
      name: 'morela',
      script: 'dist/utama.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,

      
      
      max_memory_restart: '512M',

      
      
      node_args: '--expose-gc --max-old-space-size=400',

      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: { NODE_ENV: 'production', DEBUG: false },
      env_development: { NODE_ENV: 'development', DEBUG: true },

      
      
      min_uptime: '120s',

      max_restarts: 15,
      restart_delay: 5000,
      kill_timeout: 8000,
      listen_timeout: 5000,

      
      
      
      

      exp_backoff_restart_delay: 100,
    },
    
    
    
    
    {
      name: 'morela-dev',
      script: 'utama.ts',
      interpreter: 'tsx',
      interpreter_args: '',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      node_args: '--expose-gc --max-old-space-size=400',
      error_file: './logs/error-dev.log',
      out_file: './logs/out-dev.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: { NODE_ENV: 'development', DEBUG: true },
      min_uptime: '120s',
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
    }
  ]
};

