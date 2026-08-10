const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/search', authenticateToken, userController.searchUsers);
router.get('/me', authenticateToken, userController.getMe);
router.put('/profile', authenticateToken, userController.updateProfile);

module.exports = router;
