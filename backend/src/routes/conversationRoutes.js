const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/', conversationController.getConversations);
router.post('/', conversationController.createConversation);
router.get('/:conversationId', conversationController.getConversationById);

module.exports = router;
