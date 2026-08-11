const callService = require('../services/callService');
const pool = require('../config/db');

const RING_TIMEOUT_MS = parseInt(process.env.CALL_RING_TIMEOUT || '30', 10) * 1000;
const activeRingTimers = new Map(); // callId -> Timeout

/**
 * Socket.IO Call Signaling & WebRTC Transport Handler
 */
function registerCallHandlers(io, socket, onlineUsers) {
  // Helper to emit an event to all active socket connections of a specific user
  const emitToUser = (userId, eventName, data) => {
    const targetUserId = parseInt(userId, 10);
    if (isNaN(targetUserId)) return false;

    const socketIds = onlineUsers.get(targetUserId);
    if (socketIds && socketIds.size > 0) {
      socketIds.forEach((socketId) => {
        io.to(socketId).emit(eventName, data);
      });
      return true;
    }
    return false;
  };

  // Helper to fetch user basic profile info (username, avatar)
  const getUserProfile = async (userId) => {
    try {
      const res = await pool.query('SELECT id, username, avatar_url FROM users WHERE id = $1', [userId]);
      return res.rows[0] || null;
    } catch (e) {
      return null;
    }
  };

  // Clear active ring timer for a call
  const clearRingTimer = (callId) => {
    if (activeRingTimers.has(callId)) {
      clearTimeout(activeRingTimers.get(callId));
      activeRingTimers.delete(callId);
    }
  };

  // =========================================================================
  // 1. CALL_INITIATE (and legacy alias `call_user`)
  // =========================================================================
  const handleCallInitiate = async (data) => {
    const callerId = parseInt(socket.userId || data?.from, 10);
    const receiverId = parseInt(data?.receiverId || data?.userToCall, 10);
    const rawType = data?.callType || (data?.isVideo ? 'video' : 'voice');
    const callType = rawType === 'audio' ? 'voice' : rawType;
    const conversationId = data?.conversationId ? parseInt(data.conversationId, 10) : null;
    const channelName = data?.channelName || `room_${callerId}_${receiverId}_${Date.now()}`;
    const signalData = data?.signalData || data?.signal || null;

    console.log(`[Socket Signaling] CALL_INITIATE from User ${callerId} to User ${receiverId}`);

    if (!callerId || isNaN(callerId)) {
      return socket.emit('CALL_FAILED', { error: 'Authentication required' });
    }
    if (!receiverId || isNaN(receiverId) || callerId === receiverId) {
      return socket.emit('CALL_FAILED', { error: 'Invalid receiver ID' });
    }

    let dbCall = null;
    try {
      dbCall = await callService.createCall({
        callerId,
        receiverId,
        conversationId,
        callType,
      });
    } catch (err) {
      console.error('[Socket Signaling] Error creating call record:', err.message);
      if (err.code === 'BUSY') {
        const busyPayload = { callId: err.call?.id, callerId, receiverId, reason: 'busy', message: 'User is currently on another call' };
        socket.emit('CALL_REJECTED', busyPayload);
        socket.emit('call_rejected', busyPayload);
        return;
      }
      return socket.emit('CALL_FAILED', { error: err.message });
    }

    const callerProfile = await getUserProfile(callerId);

    const payload = {
      callId: dbCall.id,
      callerId,
      callerName: callerProfile?.username || 'WhatsApp Contact',
      callerAvatar: callerProfile?.avatar_url || '',
      receiverId,
      callType: dbCall.call_type,
      conversationId: dbCall.conversation_id,
      startedAt: dbCall.started_at,
      channelName,
      signal: signalData,
      signalData,
      // Legacy aliases
      userToCall: receiverId,
      from: callerId,
      fromName: callerProfile?.username || 'WhatsApp Contact',
      isVideo: dbCall.call_type === 'video',
    };

    const isDelivered = emitToUser(receiverId, 'CALL_INCOMING', payload);
    emitToUser(receiverId, 'call_user', payload); // Legacy alias

    if (!isDelivered) {
      console.log(`[Socket Signaling] Receiver User ${receiverId} is offline.`);
      try {
        await callService.updateCallStatus(dbCall.id, 'missed', 0);
      } catch (e) {}

      const offlinePayload = { callId: dbCall.id, callerId, receiverId, reason: 'offline' };
      socket.emit('CALL_MISSED', offlinePayload);
      socket.emit('call_rejected', { to: callerId, callId: dbCall.id, reason: 'offline' });
      return;
    }

    // Emitting CALL_RINGING back to caller
    socket.emit('CALL_RINGING', { callId: dbCall.id, receiverId });

    // Set Ring Timeout Timer (Default 30 seconds or CALL_RING_TIMEOUT env var)
    const ringTimer = setTimeout(async () => {
      activeRingTimers.delete(dbCall.id);
      try {
        const currentCall = await callService.getCallById(dbCall.id);
        if (currentCall && ['initiated', 'calling', 'ringing'].includes(currentCall.status)) {
          console.log(`[Socket Signaling] Call ${dbCall.id} ring timeout reached.`);
          await callService.updateCallStatus(dbCall.id, 'missed', 0);

          const timeoutPayload = { callId: dbCall.id, callerId, receiverId, reason: 'timeout' };
          emitToUser(callerId, 'CALL_MISSED', timeoutPayload);
          emitToUser(callerId, 'call_rejected', { to: callerId, callId: dbCall.id, reason: 'timeout' });
          emitToUser(receiverId, 'CALL_MISSED', timeoutPayload);
          emitToUser(receiverId, 'call_ended', { to: receiverId, callId: dbCall.id });
        }
      } catch (e) {
        console.error('[Socket Signaling] Error processing ring timeout:', e.message);
      }
    }, RING_TIMEOUT_MS);

    activeRingTimers.set(dbCall.id, ringTimer);
  };

  // =========================================================================
  // 2. CALL_ACCEPT (and legacy alias `answer_call`)
  // =========================================================================
  const handleCallAccept = async (data) => {
    const receiverId = parseInt(socket.userId, 10);
    const callId = parseInt(data?.callId, 10);
    const targetUserId = parseInt(data?.to || data?.callerId, 10);
    const signal = data?.signal || data;

    console.log(`[Socket Signaling] CALL_ACCEPT from User ${receiverId} for Call ${callId}`);

    if (!receiverId || isNaN(receiverId)) {
      return socket.emit('CALL_FAILED', { error: 'Authentication required' });
    }
    if (!callId || isNaN(callId)) {
      return socket.emit('CALL_FAILED', { error: 'Valid callId is required' });
    }

    const callRecord = await callService.getCallById(callId);
    if (!callRecord) {
      return socket.emit('CALL_FAILED', { error: 'Call record not found' });
    }

    // Verify authenticated user is the designated receiver
    if (parseInt(callRecord.receiver_id, 10) !== receiverId) {
      return socket.emit('CALL_FAILED', { error: 'Forbidden: You are not the receiver of this call' });
    }

    clearRingTimer(callId);

    let updatedCall = null;
    try {
      updatedCall = await callService.updateCallStatus(callId, 'accepted');
    } catch (err) {
      console.error('[Socket Signaling] Error updating call to accepted:', err.message);
      return socket.emit('CALL_FAILED', { error: err.message });
    }

    const callerId = parseInt(callRecord.caller_id, 10);
    const payload = {
      callId: callRecord.id,
      callerId,
      receiverId,
      signal,
      answeredAt: updatedCall.answered_at,
      to: callerId,
      from: receiverId,
    };

    emitToUser(callerId, 'CALL_ACCEPTED', payload);
    emitToUser(callerId, 'call_accepted', payload); // Legacy alias
  };

  // =========================================================================
  // 3. CALL_REJECT (and legacy alias `reject_call`)
  // =========================================================================
  const handleCallReject = async (data) => {
    const receiverId = parseInt(socket.userId, 10);
    const callId = parseInt(data?.callId, 10);
    const reason = data?.reason || 'rejected';

    console.log(`[Socket Signaling] CALL_REJECT from User ${receiverId} for Call ${callId}`);

    if (!receiverId || isNaN(receiverId)) return;

    if (!callId || isNaN(callId)) return;

    const callRecord = await callService.getCallById(callId);
    if (!callRecord) return;

    if (parseInt(callRecord.receiver_id, 10) !== receiverId) {
      return socket.emit('CALL_FAILED', { error: 'Forbidden: You are not the receiver of this call' });
    }

    clearRingTimer(callId);

    try {
      await callService.updateCallStatus(callId, 'rejected', 0);
    } catch (err) {
      console.error('[Socket Signaling] Error updating call to rejected:', err.message);
    }

    const callerId = parseInt(callRecord.caller_id, 10);
    const payload = {
      callId: callRecord.id,
      callerId,
      receiverId,
      reason,
      to: callerId,
      from: receiverId,
    };

    emitToUser(callerId, 'CALL_REJECTED', payload);
    emitToUser(callerId, 'call_rejected', payload); // Legacy alias
  };

  // =========================================================================
  // 4. CALL_CANCEL
  // =========================================================================
  const handleCallCancel = async (data) => {
    const callerId = parseInt(socket.userId, 10);
    const callId = parseInt(data?.callId, 10);
    const reason = data?.reason || 'cancelled';

    console.log(`[Socket Signaling] CALL_CANCEL from User ${callerId} for Call ${callId}`);

    if (!callerId || isNaN(callerId) || !callId || isNaN(callId)) return;

    const callRecord = await callService.getCallById(callId);
    if (!callRecord) return;

    if (parseInt(callRecord.caller_id, 10) !== callerId) {
      return socket.emit('CALL_FAILED', { error: 'Forbidden: You are not the caller of this call' });
    }

    // Only allow cancellation if call is not yet accepted or ended
    if (['accepted', 'connected', 'ended'].includes(callRecord.status)) {
      return socket.emit('CALL_FAILED', { error: 'Cannot cancel an accepted or ended call' });
    }

    clearRingTimer(callId);

    try {
      await callService.updateCallStatus(callId, 'cancelled', 0);
    } catch (err) {
      console.error('[Socket Signaling] Error updating call to cancelled:', err.message);
    }

    const receiverId = parseInt(callRecord.receiver_id, 10);
    const payload = {
      callId: callRecord.id,
      callerId,
      receiverId,
      reason,
      to: receiverId,
      from: callerId,
    };

    emitToUser(receiverId, 'CALL_CANCELLED', payload);
    emitToUser(receiverId, 'call_ended', payload); // Legacy alias
  };

  // =========================================================================
  // 5. CALL_END (and legacy alias `end_call`)
  // =========================================================================
  const handleCallEnd = async (data) => {
    const currentUserId = parseInt(socket.userId, 10);
    const callId = parseInt(data?.callId, 10);
    const durationSeconds = parseInt(data?.durationSeconds || data?.duration || '0', 10);

    console.log(`[Socket Signaling] CALL_END from User ${currentUserId} for Call ${callId}`);

    if (!currentUserId || isNaN(currentUserId) || !callId || isNaN(callId)) return;

    const callRecord = await callService.getCallById(callId);
    if (!callRecord) return;

    const callerId = parseInt(callRecord.caller_id, 10);
    const receiverId = parseInt(callRecord.receiver_id, 10);

    if (currentUserId !== callerId && currentUserId !== receiverId) {
      return socket.emit('CALL_FAILED', { error: 'Forbidden: You are not a participant in this call' });
    }

    clearRingTimer(callId);

    let endedCall = null;
    try {
      endedCall = await callService.updateCallStatus(callId, 'ended', durationSeconds);
    } catch (err) {
      // If already ended, ignore error gracefully
    }

    const targetUserId = currentUserId === callerId ? receiverId : callerId;
    const payload = {
      callId: callRecord.id,
      callerId,
      receiverId,
      endedBy: currentUserId,
      durationSeconds: endedCall?.duration_seconds || durationSeconds,
      endedAt: endedCall?.ended_at || new Date().toISOString(),
      to: targetUserId,
      from: currentUserId,
    };

    emitToUser(targetUserId, 'CALL_ENDED', payload);
    emitToUser(targetUserId, 'call_ended', payload); // Legacy alias
  };

  // =========================================================================
  // 6. WebRTC Signaling Transport: WEBRTC_OFFER, WEBRTC_ANSWER, WEBRTC_ICE_CANDIDATE
  // =========================================================================
  const handleWebRtcOffer = async (data) => {
    const currentUserId = parseInt(socket.userId, 10);
    const { callId, offer, targetUserId } = data || {};

    if (!currentUserId || !targetUserId || !offer) return;

    if (callId) {
      const callRecord = await callService.getCallById(callId);
      if (!callRecord) return;
      if (parseInt(callRecord.caller_id) !== currentUserId && parseInt(callRecord.receiver_id) !== currentUserId) {
        return socket.emit('CALL_FAILED', { error: 'Unauthorized WebRTC offer signaling' });
      }
    }

    const target = parseInt(targetUserId, 10);
    const payload = { callId, offer, from: currentUserId, to: target };
    emitToUser(target, 'WEBRTC_OFFER', payload);
  };

  const handleWebRtcAnswer = async (data) => {
    const currentUserId = parseInt(socket.userId, 10);
    const { callId, answer, targetUserId } = data || {};

    if (!currentUserId || !targetUserId || !answer) return;

    if (callId) {
      const callRecord = await callService.getCallById(callId);
      if (!callRecord) return;
      if (parseInt(callRecord.caller_id) !== currentUserId && parseInt(callRecord.receiver_id) !== currentUserId) {
        return socket.emit('CALL_FAILED', { error: 'Unauthorized WebRTC answer signaling' });
      }
    }

    const target = parseInt(targetUserId, 10);
    const payload = { callId, answer, from: currentUserId, to: target };
    emitToUser(target, 'WEBRTC_ANSWER', payload);
  };

  const handleWebRtcIceCandidate = async (data) => {
    const currentUserId = parseInt(socket.userId, 10);
    const { callId, candidate, targetUserId, to } = data || {};
    const target = parseInt(targetUserId || to, 10);

    if (!currentUserId || !target || !candidate) return;

    if (callId) {
      const callRecord = await callService.getCallById(callId);
      if (!callRecord) return;
      if (parseInt(callRecord.caller_id) !== currentUserId && parseInt(callRecord.receiver_id) !== currentUserId) {
        return socket.emit('CALL_FAILED', { error: 'Unauthorized WebRTC candidate signaling' });
      }
    }

    const payload = { callId, candidate, from: currentUserId, to: target };
    emitToUser(target, 'WEBRTC_ICE_CANDIDATE', payload);
    emitToUser(target, 'ice_candidate', payload); // Legacy alias
  };

  // Register Socket Event Listeners
  socket.on('CALL_INITIATE', handleCallInitiate);
  socket.on('call_user', handleCallInitiate); // Legacy alias

  socket.on('CALL_ACCEPT', handleCallAccept);
  socket.on('answer_call', handleCallAccept); // Legacy alias

  socket.on('CALL_REJECT', handleCallReject);
  socket.on('reject_call', handleCallReject); // Legacy alias

  socket.on('CALL_CANCEL', handleCallCancel);

  socket.on('CALL_END', handleCallEnd);
  socket.on('end_call', handleCallEnd); // Legacy alias

  socket.on('WEBRTC_OFFER', handleWebRtcOffer);
  socket.on('WEBRTC_ANSWER', handleWebRtcAnswer);
  socket.on('WEBRTC_ICE_CANDIDATE', handleWebRtcIceCandidate);
  socket.on('ice_candidate', handleWebRtcIceCandidate); // Legacy alias
}

module.exports = registerCallHandlers;
