const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.post('/', authenticateToken, upload.single('file'), mediaController.uploadMedia);
router.post('/upload', authenticateToken, upload.single('file'), mediaController.uploadMedia);
router.get('/download', mediaController.downloadFile);

module.exports = router;
