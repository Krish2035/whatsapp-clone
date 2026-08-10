const messageService = require('../services/messageService');

const messageController = {
  async getMessages(req, res) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.conversationId || req.params.chatId;
      const limit = parseInt(req.query.limit || '100', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const messages = await messageService.getMessagesByConversation(conversationId, userId, limit, offset);
      res.json({ messages });
    } catch (err) {
      res.status(403).json({ error: err.message });
    }
  },

  async sendMessage(req, res) {
    try {
      const senderId = req.user.id;
      const { conversationId, chatId, receiverId, content, mediaUrl, type, mediaType, replyToId } = req.body;
      const targetConversationId = conversationId || chatId;

      const message = await messageService.createMessage({
        conversationId: targetConversationId,
        senderId,
        receiverId,
        content,
        mediaUrl,
        mediaType: type || mediaType || 'text',
        replyToId
      });

      res.status(201).json({ message });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async markDelivered(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const updated = await messageService.markMessageDelivered(messageId, userId);
      res.json({ message: updated });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async markRead(req, res) {
    try {
      const userId = req.user.id;
      const conversationId = req.params.conversationId || req.params.chatId || req.body.conversationId || req.body.chatId;

      const updatedMessages = await messageService.markConversationMessagesRead(conversationId, userId);
      res.json({ updatedMessages });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = messageController;
