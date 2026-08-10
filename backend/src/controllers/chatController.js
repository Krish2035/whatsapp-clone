const conversationController = require('./conversationController');

module.exports = {
  getUserChats: conversationController.getConversations,
  createChat: conversationController.createConversation,
  getChatById: conversationController.getConversationById
};
