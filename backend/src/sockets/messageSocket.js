const messageService = require('../services/messageService');

module.exports = function registerMessageHandlers(io, socket, onlineUsers) {
  // Real-Time Message Dispatch
  socket.on('send_message', async (data, callback) => {
    try {
      const senderId = socket.userId || data.senderId || data.sender_id;
      const targetChatId = data.conversationId || data.chatId || data.chat_id;

      let message;
      if (data.id) {
        // Message was already persisted in PostgreSQL via REST API
        message = data;
      } else {
        // Persist message in PostgreSQL database
        message = await messageService.createMessage({
          conversationId: targetChatId,
          senderId,
          receiverId: data.receiverId || data.receiver_id,
          content: data.content,
          mediaUrl: data.mediaUrl || data.media_url,
          mediaType: data.type || data.mediaType || data.media_type || 'text',
          replyToId: data.replyToId || data.reply_to_id
        });
      }

      const receiverId = message.receiverId || message.receiver_id;

      // 1. Emit to the conversation room (excluding sender socket to prevent duplicate render)
      socket.to(`chat_${targetChatId}`).emit('new_message', message);
      socket.to(`chat_${targetChatId}`).emit('receive_message', message);

      // 2. Direct emit to receiver's active sockets if online
      if (receiverId) {
        const receiverSockets = onlineUsers.get(parseInt(receiverId, 10));
        if (receiverSockets && receiverSockets.size > 0) {
          receiverSockets.forEach(sockId => {
            io.to(sockId).emit('new_message', message);
            io.to(sockId).emit('receive_message', message);
          });

          // Mark message as delivered automatically since receiver is online
          const deliveredMessage = await messageService.markMessageDelivered(message.id, receiverId);
          if (deliveredMessage) {
            io.to(`chat_${targetChatId}`).emit('message_delivered', deliveredMessage);
          }
        }
      }

      if (typeof callback === 'function') {
        callback({ status: 'ok', message });
      }
    } catch (err) {
      console.error('Socket send_message error:', err.message);
      if (typeof callback === 'function') {
        callback({ status: 'error', error: err.message });
      }
    }
  });

  // Message Delivered Status Update
  socket.on('mark_delivered', async ({ messageId }) => {
    try {
      const userId = socket.userId;
      const updated = await messageService.markMessageDelivered(messageId, userId);
      if (updated) {
        io.to(`chat_${updated.conversationId}`).emit('message_delivered', updated);
      }
    } catch (err) {
      console.error('Socket mark_delivered error:', err.message);
    }
  });

  // Message Read Receipt Event
  socket.on('mark_read', async ({ conversationId, chatId }) => {
    try {
      const userId = socket.userId;
      const targetId = conversationId || chatId;

      const updatedMessages = await messageService.markConversationMessagesRead(targetId, userId);
      if (updatedMessages.length > 0) {
        io.to(`chat_${targetId}`).emit('message_read', {
          conversationId: targetId,
          readBy: userId,
          messages: updatedMessages
        });
        io.to(`chat_${targetId}`).emit('messages_read_update', { chatId: targetId, userId });
      }
    } catch (err) {
      console.error('Socket mark_read error:', err.message);
    }
  });
};
