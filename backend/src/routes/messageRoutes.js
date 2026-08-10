const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/:conversationId', messageController.getMessages);
router.post('/', messageController.sendMessage);
router.patch('/:messageId/delivered', messageController.markDelivered);
router.patch('/:conversationId/read', messageController.markRead);
router.post('/:conversationId/read', messageController.markRead);
router.post('/mark-read', messageController.markRead);

module.exports = router;
