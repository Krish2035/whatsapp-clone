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
      const { receiverId, participantId, participant_ids, is_group, isGroup, group_name, groupName } = req.body;

      let conversation;
      if (is_group || isGroup) {
        const pIds = participant_ids || (receiverId ? [receiverId] : []);
        const gName = group_name || groupName || 'New Group';
        conversation = await conversationService.createGroupConversation(senderId, pIds, gName);
      } else {
        const targetUserId = receiverId || participantId || (Array.isArray(participant_ids) ? participant_ids[0] : null);
        if (!targetUserId) {
          return res.status(400).json({ error: 'receiverId, participantId, or participant_ids is required' });
        }
        conversation = await conversationService.findOrCreateOneToOneConversation(senderId, targetUserId);
      }

      const chatId = conversation.id;
      res.status(201).json({ conversation, chat: conversation, chat_id: chatId, id: chatId });
    } catch (err) {
      console.error('createConversation error:', err);
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
