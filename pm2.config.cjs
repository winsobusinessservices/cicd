module.exports = {
  apps: [
    {
      name: 'varex-cicd',
      script: './server/dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3040,
      },
    },
  ],
};
