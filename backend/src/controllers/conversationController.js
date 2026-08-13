const conversationService = require('../services/conversationService');

const conversationController = {
  async getConversations(req, res) {
    try {
      const userId = req.user.id;
      const conversations = await conversationService.getUserConversations(userId);
      res.json({ conversations, chats: conversations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async createConversation(req, res) {
    try {
      const senderId = req.user.id;
      const { receiverId, participantId } = req.body;
      const targetUserId = receiverId || participantId;

      if (!targetUserId) {
        return res.status(400).json({ error: 'receiverId or participantId is required' });
      }

      const conversation = await conversationService.findOrCreateOneToOneConversation(senderId, targetUserId);
      res.status(201).json({ conversation, chat: conversation });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async getConversationById(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const conversation = await conversationService.getConversationById(conversationId, userId);
      res.json({ conversation });
    } catch (err) {
      res.status(403).json({ error: err.message });
    }
  },

  async clearConversation(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const result = await conversationService.clearConversation(conversationId, userId);
      const io = req.app.get('io');
      if (io) {
        io.to(`chat_${conversationId}`).emit('chat_cleared', { chatId: conversationId });
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async deleteConversation(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const result = await conversationService.deleteConversation(conversationId, userId);
      const io = req.app.get('io');
      if (io) {
        io.to(`chat_${conversationId}`).emit('chat_deleted', { chatId: conversationId });
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = conversationController;
