const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');

// Protect all admin routes with JWT Auth + Admin Check
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.post('/users/:userId/toggle-admin', adminController.toggleUserAdmin);
router.get('/conversations', adminController.getConversations);
router.get('/conversations/:conversationId/messages', adminController.getConversationMessages);
router.get('/calls/active', adminController.getActiveCalls);

module.exports = router;
