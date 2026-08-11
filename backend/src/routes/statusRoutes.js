const express = require('express');
const router = express.Router();
const { getStatuses, createStatus, deleteStatus, viewStatus, getStatusViewers, reactToStatus } = require('../controllers/statusController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/', getStatuses);
router.post('/', createStatus);
router.delete('/:id', deleteStatus);
router.post('/:id/view', viewStatus);
router.get('/:id/viewers', getStatusViewers);
router.post('/:id/react', reactToStatus);

module.exports = router;
