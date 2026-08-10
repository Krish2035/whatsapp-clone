module.exports = function registerConversationHandlers(io, socket, onlineUsers) {
  // Join Conversation Room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`chat_${conversationId}`);
  });

  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
  });

  // Leave Conversation Room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`chat_${conversationId}`);
  });

  // Typing Indicators
  socket.on('typing_start', ({ conversationId, chatId, username }) => {
    const targetId = conversationId || chatId;
    socket.to(`chat_${targetId}`).emit('typing_start', {
      conversationId: targetId,
      chatId: targetId,
      userId: socket.userId,
      username
    });
  });

  socket.on('typing_stop', ({ conversationId, chatId }) => {
    const targetId = conversationId || chatId;
    socket.to(`chat_${targetId}`).emit('typing_stop', {
      conversationId: targetId,
      chatId: targetId,
      userId: socket.userId
    });
  });
};
