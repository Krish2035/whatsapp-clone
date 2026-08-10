const http = require('http');
require('dotenv').config();

const app = require('./app');
const { initSockets } = require('./sockets');

const server = http.createServer(app);

// Initialize Modular Socket.IO Layer
const io = initSockets(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WhatsApp Clone Server running on http://0.0.0.0:${PORT}`);
});
