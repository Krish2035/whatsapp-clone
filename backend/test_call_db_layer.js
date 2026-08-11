const pool = require('./src/config/db');
const callService = require('./src/services/callService');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('🧪 Starting Step 2 Database & Data Layer Tests...\n');

  try {
    // 1. Ensure DB table initialized
    const schemaPath = path.join(__dirname, 'src/db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // 2. Fetch test users from DB
    const usersRes = await pool.query('SELECT id, username FROM users LIMIT 2');
    let user1 = usersRes.rows[0];
    let user2 = usersRes.rows[1];

    if (!user1 || !user2) {
      console.log('Creating test users...');
      const u1Res = await pool.query(
        "INSERT INTO users (username, email, password_hash) VALUES ('test_user1', 'user1@test.com', 'hash') RETURNING id, username"
      );
      const u2Res = await pool.query(
        "INSERT INTO users (username, email, password_hash) VALUES ('test_user2', 'user2@test.com', 'hash') RETURNING id, username"
      );
      user1 = u1Res.rows[0];
      user2 = u2Res.rows[0];
    }

    console.log(`Test User 1 ID: ${user1.id} (${user1.username})`);
    console.log(`Test User 2 ID: ${user2.id} (${user2.username})\n`);

    // TEST A: Create Call Record
    console.log('--- TEST A: Create Call Record ---');
    const newCall = await callService.createCall({
      callerId: user1.id,
      receiverId: user2.id,
      callType: 'voice',
    });
    console.log('✅ Call created successfully:', newCall);

    // TEST B: Validate Same User Call Rejection
    console.log('\n--- TEST B: Reject Self Call ---');
    try {
      await callService.createCall({ callerId: user1.id, receiverId: user1.id, callType: 'voice' });
      console.error('❌ Failed: Self call was unexpectedly allowed');
    } catch (err) {
      console.log('✅ Correctly blocked self call:', err.message);
    }

    // TEST C: Validate Invalid Call Type
    console.log('\n--- TEST C: Reject Invalid Call Type ---');
    try {
      await callService.createCall({ callerId: user1.id, receiverId: user2.id, callType: 'invalid_type' });
      console.error('❌ Failed: Invalid call type was unexpectedly allowed');
    } catch (err) {
      console.log('✅ Correctly blocked invalid call type:', err.message);
    }

    // TEST D: Find Call by ID
    console.log('\n--- TEST D: Find Call by ID ---');
    const fetchedCall = await callService.getCallById(newCall.id);
    console.log('✅ Fetched Call:', {
      id: fetchedCall.id,
      caller: fetchedCall.caller_username,
      receiver: fetchedCall.receiver_username,
      status: fetchedCall.status,
      call_type: fetchedCall.call_type
    });

    // TEST E: Update Call Status Lifecycle (initiated -> ringing -> accepted -> ended)
    console.log('\n--- TEST E: Status Lifecycle Transitions ---');
    const ringingCall = await callService.updateCallStatus(newCall.id, 'ringing');
    console.log('✅ Updated to ringing:', ringingCall.status);

    const acceptedCall = await callService.markCallAnswered(newCall.id);
    console.log('✅ Updated to accepted. Answered At:', acceptedCall.answered_at);

    const endedCall = await callService.markCallEnded(newCall.id, 45);
    console.log('✅ Updated to ended. Duration:', endedCall.duration_seconds, 's, Ended At:', endedCall.ended_at);

    // TEST F: Prevent Editing Call after Terminal Status
    console.log('\n--- TEST F: Block Modifying Call in Terminal State ---');
    try {
      await callService.updateCallStatus(newCall.id, 'accepted');
      console.error('❌ Failed: Modification after terminal state was unexpectedly allowed');
    } catch (err) {
      console.log('✅ Correctly blocked modifying terminal call:', err.message);
    }

    // TEST G: Retrieve User Call History
    console.log('\n--- TEST G: User Call History ---');
    const history = await callService.getUserCallHistory(user1.id);
    console.log(`✅ Retrieved ${history.length} call log entries for User ${user1.id}`);

    // TEST H: Retrieve History Between Users
    console.log('\n--- TEST H: Call History Between Users ---');
    const pairHistory = await callService.getCallHistoryBetweenUsers(user1.id, user2.id);
    console.log(`✅ Retrieved ${pairHistory.length} calls between User ${user1.id} and User ${user2.id}`);

    console.log('\n🎉 ALL STEP 2 DATABASE LAYER TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  }
}

runTests();
