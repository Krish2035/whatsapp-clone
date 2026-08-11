const callService = require('../services/callService');

const callController = {
  // GET /api/calls - Fetch authenticated user's call history
  async getCalls(req, res, next) {
    try {
      const currentUserId = req.user.id;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const calls = await callService.getUserCallHistory(currentUserId, limit, offset);
      res.json({ success: true, calls });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/calls/:callId - Fetch specific call details with security authorization
  async getCallById(req, res, next) {
    try {
      const currentUserId = req.user.id;
      const { callId } = req.params;

      const call = await callService.getCallById(callId);

      if (!call) {
        return res.status(404).json({ error: 'Call record not found' });
      }

      // Security check: User must be caller or receiver
      if (parseInt(call.caller_id, 10) !== parseInt(currentUserId, 10) &&
          parseInt(call.receiver_id, 10) !== parseInt(currentUserId, 10)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to access this call record' });
      }

      res.json({ success: true, call });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/calls/history/:userId - Fetch call history between current user and target user
  async getCallHistoryBetweenUsers(req, res, next) {
    try {
      const currentUserId = req.user.id;
      const targetUserId = parseInt(req.params.userId, 10);

      if (!targetUserId || isNaN(targetUserId)) {
        return res.status(400).json({ error: 'Invalid userId parameter' });
      }

      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const calls = await callService.getCallHistoryBetweenUsers(currentUserId, targetUserId, limit, offset);
      res.json({ success: true, calls });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/calls - Create a new call record (caller_id derived strictly from authenticated user)
  async createCall(req, res, next) {
    try {
      const callerId = req.user.id; // Strictly from authenticated token
      const { receiverId, conversationId, callType } = req.body;

      if (!receiverId) {
        return res.status(400).json({ error: 'receiverId is required' });
      }

      const call = await callService.createCall({
        callerId,
        receiverId,
        conversationId,
        callType: callType || 'voice',
      });

      res.status(201).json({ success: true, call });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // PUT /api/calls/:callId/status (or /:callId) - Update call status/answered/ended
  async updateCallStatus(req, res, next) {
    try {
      const currentUserId = req.user.id;
      const { callId } = req.params;
      const { status, duration_seconds, duration } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'status field is required' });
      }

      const existingCall = await callService.getCallById(callId);
      if (!existingCall) {
        return res.status(404).json({ error: 'Call record not found' });
      }

      // Security authorization check: User must be caller or receiver
      if (parseInt(existingCall.caller_id, 10) !== parseInt(currentUserId, 10) &&
          parseInt(existingCall.receiver_id, 10) !== parseInt(currentUserId, 10)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to modify this call record' });
      }

      const durationToUse = duration_seconds !== undefined ? duration_seconds : (duration !== undefined ? duration : 0);
      const updatedCall = await callService.updateCallStatus(callId, status, durationToUse);

      res.json({ success: true, call: updatedCall });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
};

module.exports = callController;
