const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const messageService = require('../services/messageService');
const registerMessageHandlers = require('./messageSocket');
const registerConversationHandlers = require('./conversationSocket');
const registerCallHandlers = require('./callSocket');

const onlineUsers = new Map(); // userId -> Set of socketIds

function initSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 1e7 // 10MB limit
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_change_me_in_production');
        socket.userId = decoded.id;
        socket.user = decoded;
      } catch (err) {
        // Allow unauthenticated connection for handshakes if needed
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    let currentUserId = socket.userId || null;

    // Handshake or explicit connection message
    socket.on('user_connected', async (userId) => {
      const activeUserId = parseInt(userId || currentUserId, 10);
      if (!activeUserId) return;

      currentUserId = activeUserId;
      socket.userId = activeUserId;

      if (!onlineUsers.has(activeUserId)) {
        onlineUsers.set(activeUserId, new Set());
      }
      onlineUsers.get(activeUserId).add(socket.id);

      console.log(`Socket Registry: User ${activeUserId} registered with socket ${socket.id}`);

      // Update user online status in database
      try {
        await pool.query('UPDATE users SET is_online = TRUE WHERE id = $1', [activeUserId]);

        // Deliver pending offline messages status update
        const deliveredList = await messageService.updatePendingDeliveredStatusForUser(activeUserId);
        deliveredList.forEach((msg) => {
          io.to(`chat_${msg.conversationId}`).emit('message_delivered', msg);
        });
      } catch (err) {
        console.error('Failed to update online status:', err.message);
      }

      // Broadcast online list to all connected clients
      io.emit('online_users_list', Array.from(onlineUsers.keys()));
    });

    // Register modular handlers
    registerMessageHandlers(io, socket, onlineUsers);
    registerConversationHandlers(io, socket, onlineUsers);
    registerCallHandlers(io, socket, onlineUsers);

    socket.on('disconnect', async () => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSockets = onlineUsers.get(currentUserId);
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);
          try {
            await pool.query('UPDATE users SET is_online = FALSE, last_seen = CURRENT_TIMESTAMP WHERE id = $1', [currentUserId]);
          } catch (err) {
            console.error('Failed to update offline status:', err.message);
          }
        }

        io.emit('online_users_list', Array.from(onlineUsers.keys()));
      }
    });
  });

  return io;
}

module.exports = { initSockets };
