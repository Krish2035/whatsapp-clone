const http = require('http');
require('dotenv').config();

const app = require('./app');
const { initSockets } = require('./sockets');
const callService = require('./services/callService');
const pool = require('./config/db');

const server = http.createServer(app);

// Initialize Modular Socket.IO Layer
const io = initSockets(server);

let PORT = parseInt(process.env.PORT || '5000', 10);

function startServer(portToTry) {
  server.listen(portToTry, '0.0.0.0', async () => {
    console.log(`🚀 WhatsApp Clone Server running on http://0.0.0.0:${portToTry}`);
    await callService.cleanupStaleCalls();
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${PORT} is in use. Retrying on port ${PORT + 1}...`);
    PORT = PORT + 1;
    startServer(PORT);
  } else {
    console.error('Server error:', err);
  }
});

// Graceful process shutdown handler
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[Server Process] Received ${signal}. Starting graceful shutdown...`);
  try {
    // 1. Clean up active call states in PostgreSQL
    await callService.cleanupStaleCalls();

    // 2. Close Socket.IO server
    if (io) {
      io.close();
      console.log('[Server Process] Socket.IO server closed.');
    }

    // 3. Close HTTP server
    server.close(() => {
      console.log('[Server Process] HTTP server closed.');
      process.exit(0);
    });
  } catch (err) {
    console.error('[Server Process] Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

startServer(PORT);
