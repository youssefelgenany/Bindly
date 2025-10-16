module.exports = {
  allowedHosts: 'all',
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
  host: 'localhost',
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
};
