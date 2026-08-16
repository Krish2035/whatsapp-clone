const adminService = require('../services/adminService');

const adminController = {
  async getStats(req, res) {
    try {
      const stats = await adminService.getStats();
      res.json({ stats });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getUsers(req, res) {
    try {
      const users = await adminService.getAllUsers();
      res.json({ users });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async toggleUserAdmin(req, res) {
    try {
      const { userId } = req.params;
      const user = await adminService.toggleUserAdmin(userId);
      res.json({ user, message: `Admin privileges updated for ${user.username}` });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async getConversations(req, res) {
    try {
      const conversations = await adminService.getConversations();
      res.json({ conversations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getConversationMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const messages = await adminService.getConversationMessages(conversationId);
      res.json({ messages });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async getActiveCalls(req, res) {
    try {
      const activeCalls = await adminService.getActiveCalls();
      res.json({ activeCalls });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = adminController;
