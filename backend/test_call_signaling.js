const { io } = require('../frontend/node_modules/socket.io-client');
const jwt = require('jsonwebtoken');
const pool = require('./src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_change_me_in_production';
const SOCKET_URL = 'http://localhost:5001';

function createAuthToken(user) {
  return jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
}

async function runSignalingTests() {
  console.log('🧪 Starting Step 3 Real-Time Call Signaling Tests...\n');

  // Fetch test users
  const usersRes = await pool.query('SELECT id, username, email FROM users LIMIT 3');
  const userA = usersRes.rows[0] || { id: 1, username: 'Alice', email: 'alice@test.com' };
  const userB = usersRes.rows[1] || { id: 2, username: 'Bob', email: 'bob@test.com' };
  const userC = usersRes.rows[2] || { id: 3, username: 'Charlie', email: 'charlie@test.com' };

  console.log(`User A (Caller): ID ${userA.id} (${userA.username})`);
  console.log(`User B (Receiver): ID ${userB.id} (${userB.username})`);
  console.log(`User C (Attacker): ID ${userC.id} (${userC.username})\n`);

  const tokenA = createAuthToken(userA);
  const tokenB = createAuthToken(userB);
  const tokenC = createAuthToken(userC);

  // Connect socket clients
  const socketA = io(SOCKET_URL, { auth: { token: tokenA }, transports: ['websocket'] });
  const socketB = io(SOCKET_URL, { auth: { token: tokenB }, transports: ['websocket'] });
  const socketC = io(SOCKET_URL, { auth: { token: tokenC }, transports: ['websocket'] });

  await new Promise((resolve) => setTimeout(resolve, 500));

  socketA.emit('user_connected', userA.id);
  socketB.emit('user_connected', userB.id);
  socketC.emit('user_connected', userC.id);

  await new Promise((resolve) => setTimeout(resolve, 500));

  let activeCallId = null;

  // TEST 1: Outgoing Call (CALL_INITIATE -> CALL_INCOMING & CALL_RINGING)
  console.log('--- TEST 1: Outgoing Call & Incoming Event ---');
  await new Promise((resolve) => {
    socketB.once('CALL_INCOMING', (data) => {
      console.log('✅ User B received CALL_INCOMING:', { callId: data.callId, callerName: data.callerName, callType: data.callType });
      activeCallId = data.callId;
      resolve();
    });

    socketA.once('CALL_RINGING', (data) => {
      console.log('✅ User A received CALL_RINGING:', data);
    });

    socketA.emit('CALL_INITIATE', { receiverId: userB.id, callType: 'voice' });
  });

  // TEST 2: WebRTC Offer/Answer/Candidate Transport Validation
  console.log('\n--- TEST 2: WebRTC Transport Forwarding ---');
  await new Promise((resolve) => {
    socketB.once('WEBRTC_OFFER', (data) => {
      console.log('✅ User B received WEBRTC_OFFER transport:', { callId: data.callId, offer: data.offer });
      
      socketA.once('WEBRTC_ANSWER', (ansData) => {
        console.log('✅ User A received WEBRTC_ANSWER transport:', { callId: ansData.callId, answer: ansData.answer });
        resolve();
      });

      socketB.emit('WEBRTC_ANSWER', { callId: activeCallId, targetUserId: userA.id, answer: 'mock_sdp_answer' });
    });

    socketA.emit('WEBRTC_OFFER', { callId: activeCallId, targetUserId: userB.id, offer: 'mock_sdp_offer' });
  });

  // TEST 3: Call Acceptance (CALL_ACCEPT -> CALL_ACCEPTED)
  console.log('\n--- TEST 3: Call Acceptance ---');
  await new Promise((resolve) => {
    socketA.once('CALL_ACCEPTED', (data) => {
      console.log('✅ User A received CALL_ACCEPTED:', { callId: data.callId, receiverId: data.receiverId });
      resolve();
    });

    socketB.emit('CALL_ACCEPT', { callId: activeCallId, callerId: userA.id });
  });

  // TEST 4: Call End (CALL_END -> CALL_ENDED)
  console.log('\n--- TEST 4: Call Ending ---');
  await new Promise((resolve) => {
    socketB.once('CALL_ENDED', (data) => {
      console.log('✅ User B received CALL_ENDED:', { callId: data.callId, durationSeconds: data.durationSeconds });
      resolve();
    });

    socketA.emit('CALL_END', { callId: activeCallId, durationSeconds: 25 });
  });

  // TEST 5: Unauthorized Manipulation Attempt (User C tries to accept/end A-B call)
  console.log('\n--- TEST 5: Block Unauthorized User Manipulation ---');
  await new Promise((resolve) => {
    socketC.once('CALL_FAILED', (data) => {
      console.log('✅ User C attempt correctly rejected with CALL_FAILED:', data.error);
      resolve();
    });

    socketC.emit('CALL_END', { callId: activeCallId, durationSeconds: 100 });
  });

  // TEST 6: Call Rejection Flow (CALL_INITIATE -> CALL_REJECT -> CALL_REJECTED)
  console.log('\n--- TEST 6: Call Rejection Flow ---');
  await new Promise((resolve) => {
    let callToRejectId = null;

    socketB.once('CALL_INCOMING', (data) => {
      callToRejectId = data.callId;
      socketB.emit('CALL_REJECT', { callId: callToRejectId, callerId: userA.id });
    });

    socketA.once('CALL_REJECTED', (data) => {
      console.log('✅ User A received CALL_REJECTED:', { callId: data.callId, reason: data.reason });
      resolve();
    });

    socketA.emit('CALL_INITIATE', { receiverId: userB.id, callType: 'video' });
  });

  // TEST 7: Call Cancellation Flow (CALL_INITIATE -> CALL_CANCEL -> CALL_CANCELLED)
  console.log('\n--- TEST 7: Call Cancellation Flow ---');
  await new Promise((resolve) => {
    let callToCancelId = null;

    socketB.once('CALL_INCOMING', (data) => {
      callToCancelId = data.callId;
      socketA.emit('CALL_CANCEL', { callId: callToCancelId, receiverId: userB.id });
    });

    socketB.once('CALL_CANCELLED', (data) => {
      console.log('✅ User B received CALL_CANCELLED:', { callId: data.callId, reason: data.reason });
      resolve();
    });

    socketA.emit('CALL_INITIATE', { receiverId: userB.id, callType: 'voice' });
  });

  // TEST 8: Offline Receiver Handling (Call to non-existent or offline user)
  console.log('\n--- TEST 8: Offline / Non-existent Receiver Handling ---');
  await new Promise((resolve) => {
    socketA.once('CALL_FAILED', (data) => {
      console.log('✅ User A received CALL_FAILED for invalid receiver:', data.error);
      resolve();
    });

    socketA.emit('CALL_INITIATE', { receiverId: 99999, callType: 'voice' });
  });

  console.log('\n🎉 ALL STEP 3 CALL SIGNALING TESTS PASSED SUCCESSFULLY!');

  socketA.disconnect();
  socketB.disconnect();
  socketC.disconnect();
  process.exit(0);
}

runSignalingTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
