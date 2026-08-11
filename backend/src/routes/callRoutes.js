const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const callController = require('../controllers/callController');

router.use(authenticateToken);

// Call History & Retrieval Endpoints
router.get('/', callController.getCalls);
router.get('/history/:userId', callController.getCallHistoryBetweenUsers);
router.get('/:callId', callController.getCallById);

// Call Creation & Status Lifecycle Endpoints
router.post('/', callController.createCall);
router.put('/:callId/status', callController.updateCallStatus);
router.put('/:callId', callController.updateCallStatus);

module.exports = router;
