const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/', conversationController.getConversations);
router.post('/', conversationController.createConversation);
router.get('/:conversationId', conversationController.getConversationById);
router.delete('/:conversationId/clear', conversationController.clearConversation);
router.delete('/:conversationId/messages', conversationController.clearConversation);
router.delete('/:conversationId', conversationController.deleteConversation);

module.exports = router;
