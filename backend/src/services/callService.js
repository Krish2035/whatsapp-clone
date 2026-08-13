const pool = require('../config/db');

const VALID_CALL_TYPES = ['voice', 'video', 'audio'];
const VALID_CALL_STATUSES = [
  'initiated',
  'calling',
  'ringing',
  'accepted',
  'connected',
  'rejected',
  'missed',
  'cancelled',
  'ended',
  'busy',
  'failed',
];

const TERMINAL_STATUSES = ['ended', 'rejected', 'missed', 'cancelled', 'busy', 'failed'];
const ACTIVE_STATUSES = ['initiated', 'calling', 'ringing', 'accepted', 'connected'];

async function hasActiveCall(userId) {
  const parsedUserId = parseInt(userId, 10);
  if (!parsedUserId || isNaN(parsedUserId)) return null;

  // Auto-clean any unclosed active calls older than 15 seconds
  await pool.query(`
    UPDATE calls
    SET status = 'ended', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE (caller_id = $1 OR receiver_id = $1)
      AND status IN ('initiated', 'calling', 'ringing', 'accepted', 'connected')
      AND updated_at < CURRENT_TIMESTAMP - INTERVAL '15 seconds'
  `).catch(() => {});

  const query = `
    SELECT * FROM calls
    WHERE (caller_id = $1 OR receiver_id = $1)
      AND status IN ('initiated', 'calling', 'ringing', 'accepted', 'connected')
    ORDER BY created_at DESC
    LIMIT 1;
  `;
  const result = await pool.query(query, [parsedUserId]);
  return result.rows[0] || null;
}

async function cleanupStaleCalls() {
  try {
    const query = `
      UPDATE calls
      SET status = 'failed',
          ended_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('initiated', 'calling', 'ringing', 'accepted', 'connected')
      RETURNING id, caller_id, receiver_id, status;
    `;
    const result = await pool.query(query);
    if (result.rows.length > 0) {
      console.log(`[Server Startup Cleanup] Cleaned up ${result.rows.length} stale active call records.`);
    }
    return result.rows;
  } catch (err) {
    console.error('[Server Startup Cleanup] Error updating stale call records:', err.message);
    return [];
  }
}

async function createCall({ callerId, receiverId, conversationId = null, callType = 'voice' }) {
  const parsedCaller = parseInt(callerId, 10);
  const parsedReceiver = parseInt(receiverId, 10);

  if (!parsedCaller || isNaN(parsedCaller)) {
    throw new Error('Valid callerId is required');
  }
  if (!parsedReceiver || isNaN(parsedReceiver)) {
    throw new Error('Valid receiverId is required');
  }
  if (parsedCaller === parsedReceiver) {
    throw new Error('Caller and receiver cannot be the same user');
  }

  const normalizedCallType = callType === 'audio' ? 'voice' : callType;
  if (!VALID_CALL_TYPES.includes(normalizedCallType)) {
    throw new Error(`Invalid callType. Allowed values: ${VALID_CALL_TYPES.join(', ')}`);
  }

  // Verify caller exists
  const callerCheck = await pool.query('SELECT id FROM users WHERE id = $1', [parsedCaller]);
  if (callerCheck.rows.length === 0) {
    throw new Error('Caller user does not exist');
  }

  // Verify receiver exists
  const receiverCheck = await pool.query('SELECT id FROM users WHERE id = $1', [parsedReceiver]);
  if (receiverCheck.rows.length === 0) {
    throw new Error('Receiver user does not exist');
  }

  // Verify caller does not already have an active call; auto-cleanup any existing calls for caller
  const callerActiveCall = await hasActiveCall(parsedCaller);
  if (callerActiveCall) {
    await pool.query("UPDATE calls SET status = 'cancelled', ended_at = CURRENT_TIMESTAMP WHERE id = $1", [callerActiveCall.id]);
  }

  // Verify receiver is not already in an active call
  const receiverActiveCall = await hasActiveCall(parsedReceiver);
  if (receiverActiveCall) {
    // Record busy call status directly in DB
    const busyInsert = `
      INSERT INTO calls (caller_id, receiver_id, conversation_id, call_type, status, started_at, ended_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'busy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, caller_id, receiver_id, conversation_id, call_type, status, started_at, created_at, updated_at;
    `;
    const busyResult = await pool.query(busyInsert, [parsedCaller, parsedReceiver, conversationId, normalizedCallType]);
    const busyCall = busyResult.rows[0];
    const err = new Error('Receiver user is currently on another call');
    err.code = 'BUSY';
    err.call = busyCall;
    throw err;
  }

  // Verify conversation exists if provided
  let parsedConversationId = null;
  if (conversationId) {
    parsedConversationId = parseInt(conversationId, 10);
    const convCheck = await pool.query('SELECT id FROM chats WHERE id = $1', [parsedConversationId]);
    if (convCheck.rows.length === 0) {
      parsedConversationId = null;
    }
  }

  const query = `
    INSERT INTO calls (caller_id, receiver_id, conversation_id, call_type, status, started_at, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'initiated', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id, caller_id, receiver_id, conversation_id, call_type, status, started_at, created_at, updated_at;
  `;
  const result = await pool.query(query, [parsedCaller, parsedReceiver, parsedConversationId, normalizedCallType]);
  return result.rows[0];
}

async function getCallById(callId) {
  const parsedId = parseInt(callId, 10);
  if (!parsedId || isNaN(parsedId)) {
    return null;
  }

  const query = `
    SELECT c.*,
           u_caller.username AS caller_username,
           u_caller.avatar_url AS caller_avatar,
           u_caller.email AS caller_email,
           u_receiver.username AS receiver_username,
           u_receiver.avatar_url AS receiver_avatar,
           u_receiver.email AS receiver_email
    FROM calls c
    JOIN users u_caller ON c.caller_id = u_caller.id
    JOIN users u_receiver ON c.receiver_id = u_receiver.id
    WHERE c.id = $1;
  `;
  const result = await pool.query(query, [parsedId]);
  return result.rows[0] || null;
}

async function updateCallStatus(callId, status, durationSeconds = 0) {
  const parsedId = parseInt(callId, 10);
  if (!parsedId || isNaN(parsedId)) {
    throw new Error('Valid callId is required');
  }

  if (!VALID_CALL_STATUSES.includes(status)) {
    throw new Error(`Invalid call status. Allowed values: ${VALID_CALL_STATUSES.join(', ')}`);
  }

  const existingCall = await getCallById(parsedId);
  if (!existingCall) {
    throw new Error('Call record not found');
  }

  // Prevent modifying call from a terminal state
  if (TERMINAL_STATUSES.includes(existingCall.status)) {
    throw new Error(`Cannot change status of a call that has already reached terminal status '${existingCall.status}'`);
  }

  const parsedDuration = Math.max(0, parseInt(durationSeconds || '0', 10));

  let query = '';
  let params = [];

  if (['accepted', 'connected'].includes(status)) {
    query = `
      UPDATE calls
      SET status = $1,
          answered_at = COALESCE(answered_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    params = [status, parsedId];
  } else if (TERMINAL_STATUSES.includes(status)) {
    query = `
      UPDATE calls
      SET status = $1,
          ended_at = CURRENT_TIMESTAMP,
          duration_seconds = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    params = [status, parsedDuration, parsedId];
  } else {
    query = `
      UPDATE calls
      SET status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    params = [status, parsedId];
  }

  const result = await pool.query(query, params);
  return result.rows[0];
}

async function markCallAnswered(callId) {
  return updateCallStatus(callId, 'accepted');
}

async function markCallEnded(callId, durationSeconds = 0) {
  return updateCallStatus(callId, 'ended', durationSeconds);
}

async function getUserCallHistory(userId, limit = 50, offset = 0) {
  const parsedUserId = parseInt(userId, 10);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || '50', 10)));
  const parsedOffset = Math.max(0, parseInt(offset || '0', 10));

  if (!parsedUserId || isNaN(parsedUserId)) {
    throw new Error('Valid userId is required');
  }

  const query = `
    SELECT c.*,
           u_caller.username AS caller_username,
           u_caller.avatar_url AS caller_avatar,
           u_receiver.username AS receiver_username,
           u_receiver.avatar_url AS receiver_avatar
    FROM calls c
    JOIN users u_caller ON c.caller_id = u_caller.id
    JOIN users u_receiver ON c.receiver_id = u_receiver.id
    WHERE c.caller_id = $1 OR c.receiver_id = $1
    ORDER BY c.created_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const result = await pool.query(query, [parsedUserId, parsedLimit, parsedOffset]);
  return result.rows;
}

async function getCallHistoryBetweenUsers(userId1, userId2, limit = 50, offset = 0) {
  const p1 = parseInt(userId1, 10);
  const p2 = parseInt(userId2, 10);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || '50', 10)));
  const parsedOffset = Math.max(0, parseInt(offset || '0', 10));

  if (!p1 || !p2 || isNaN(p1) || isNaN(p2)) {
    throw new Error('Valid user IDs are required');
  }

  const query = `
    SELECT c.*,
           u_caller.username AS caller_username,
           u_caller.avatar_url AS caller_avatar,
           u_receiver.username AS receiver_username,
           u_receiver.avatar_url AS receiver_avatar
    FROM calls c
    JOIN users u_caller ON c.caller_id = u_caller.id
    JOIN users u_receiver ON c.receiver_id = u_receiver.id
    WHERE (c.caller_id = $1 AND c.receiver_id = $2)
       OR (c.caller_id = $2 AND c.receiver_id = $1)
    ORDER BY c.created_at DESC
    LIMIT $3 OFFSET $4;
  `;
  const result = await pool.query(query, [p1, p2, parsedLimit, parsedOffset]);
  return result.rows;
}

module.exports = {
  createCall,
  getCallById,
  updateCallStatus,
  markCallAnswered,
  markCallEnded,
  getUserCallHistory,
  getCallHistoryBetweenUsers,
  hasActiveCall,
  cleanupStaleCalls,
  VALID_CALL_TYPES,
  VALID_CALL_STATUSES,
  TERMINAL_STATUSES,
  ACTIVE_STATUSES,
};
