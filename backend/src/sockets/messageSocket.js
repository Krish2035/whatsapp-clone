const messageService = require('../services/messageService');

module.exports = function registerMessageHandlers(io, socket, onlineUsers) {
  // Real-Time Message Dispatch
  socket.on('send_message', async (data, callback) => {
    try {
      const senderId = socket.userId || data.senderId || data.sender_id;
      const targetChatId = data.conversationId || data.chatId || data.chat_id;

      let message;
      if (data.id) {
        message = data;
      } else {
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

      socket.to(`chat_${targetChatId}`).emit('new_message', message);
      socket.to(`chat_${targetChatId}`).emit('receive_message', message);

      if (receiverId) {
        const receiverSockets = onlineUsers.get(parseInt(receiverId, 10));
        if (receiverSockets && receiverSockets.size > 0) {
          receiverSockets.forEach(sockId => {
            io.to(sockId).emit('new_message', message);
            io.to(sockId).emit('receive_message', message);
          });

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

  // Edit Message Real-Time Dispatch
  socket.on('edit_message', async ({ messageId, chatId, content }, callback) => {
    try {
      const userId = socket.userId || socket.user?.id;
      const updated = await messageService.editMessage(messageId, userId, content);
      
      io.to(`chat_${chatId}`).emit('message_edited', updated);

      const senderId = updated.senderId || updated.sender_id;
      const receiverId = updated.receiverId || updated.receiver_id;

      if (senderId && onlineUsers.has(parseInt(senderId, 10))) {
        onlineUsers.get(parseInt(senderId, 10)).forEach((sId) => io.to(sId).emit('message_edited', updated));
      }
      if (receiverId && onlineUsers.has(parseInt(receiverId, 10))) {
        onlineUsers.get(parseInt(receiverId, 10)).forEach((sId) => io.to(sId).emit('message_edited', updated));
      }

      if (typeof callback === 'function') callback({ status: 'ok', message: updated });
    } catch (err) {
      console.error('Socket edit_message error:', err.message);
      if (typeof callback === 'function') callback({ status: 'error', error: err.message });
    }
  });

  // Delete Message Real-Time Dispatch
  socket.on('delete_message', async ({ messageId, chatId }, callback) => {
    try {
      const userId = socket.userId || socket.user?.id;
      const deleted = await messageService.deleteMessage(messageId, userId);
      const payload = { messageId, chatId, content: deleted.content };
      
      io.to(`chat_${chatId}`).emit('message_deleted', payload);

      const senderId = deleted.senderId || deleted.sender_id;
      const receiverId = deleted.receiverId || deleted.receiver_id;

      if (senderId && onlineUsers.has(parseInt(senderId, 10))) {
        onlineUsers.get(parseInt(senderId, 10)).forEach((sId) => io.to(sId).emit('message_deleted', payload));
      }
      if (receiverId && onlineUsers.has(parseInt(receiverId, 10))) {
        onlineUsers.get(parseInt(receiverId, 10)).forEach((sId) => io.to(sId).emit('message_deleted', payload));
      }

      if (typeof callback === 'function') callback({ status: 'ok', message: deleted });
    } catch (err) {
      console.error('Socket delete_message error:', err.message);
      if (typeof callback === 'function') callback({ status: 'error', error: err.message });
    }
  });

  // Reaction Dispatch Handler
  socket.on('send_reaction', async ({ messageId, chatId, emoji }, callback) => {
    try {
      const userId = socket.userId || socket.user?.id;
      const res = await messageService.addReaction(messageId, userId, emoji);
      io.to(`chat_${chatId}`).emit('reaction_updated', {
        messageId,
        chatId,
        userId,
        emoji: res.emoji,
        removed: res.removed
      });
      if (typeof callback === 'function') callback({ status: 'ok', reaction: res });
    } catch (err) {
      console.error('Socket send_reaction error:', err.message);
      if (typeof callback === 'function') callback({ status: 'error', error: err.message });
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
