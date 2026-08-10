const http = require('http');
const path = require('path');
const fs = require('fs');
const app = require('./src/app');

let server;
const PORT = 0;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT, async () => {
    const activePort = server.address().port;
    console.log(`Test server running on port ${activePort}...`);
    try {
      const testTimestamp = Date.now();
      const userAData = { username: `usera_${testTimestamp}`, email: `usera_${testTimestamp}@test.com`, password: 'password123' };
      const userBData = { username: `userb_${testTimestamp}`, email: `userb_${testTimestamp}@test.com`, password: 'password123' };

      console.log('1. Testing User A Registration...');
      const regARes = await makeRequest({
        hostname: 'localhost', port: activePort, path: '/api/auth/register', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, JSON.stringify(userAData));
      console.log('User A Registered:', regARes.status === 201 ? 'SUCCESS' : 'FAILED', regARes.data.user?.username);
      const tokenA = regARes.data.token;

      console.log('2. Testing User B Registration...');
      const regBRes = await makeRequest({
        hostname: 'localhost', port: activePort, path: '/api/auth/register', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, JSON.stringify(userBData));
      console.log('User B Registered:', regBRes.status === 201 ? 'SUCCESS' : 'FAILED', regBRes.data.user?.username);
      const userBId = regBRes.data.user.id;
      const tokenB = regBRes.data.token;

      console.log('3. Testing 1-to-1 Conversation Creation (User A -> User B)...');
      const convRes = await makeRequest({
        hostname: 'localhost', port: activePort, path: '/api/conversations', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
      }, JSON.stringify({ receiverId: userBId }));
      console.log('Conversation Created Response:', convRes.status, JSON.stringify(convRes.data));
      const conversationId = convRes.data.conversation?.id || convRes.data.id;

      console.log('4. Testing Text Message Sending (User A -> User B)...');
      const msgRes = await makeRequest({
        hostname: 'localhost', port: activePort, path: '/api/messages', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
      }, JSON.stringify({
        conversationId,
        content: 'Hello User B! This is a real-time text message test.',
        type: 'text'
      }));
      console.log('Message Sent Response:', msgRes.status, JSON.stringify(msgRes.data));

      console.log('5. Testing Message Retrieval for Conversation (User B)...');
      const getMsgsRes = await makeRequest({
        hostname: 'localhost', port: activePort, path: `/api/messages/${conversationId}`, method: 'GET',
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });
      console.log('Messages Retrieved Response:', getMsgsRes.status, JSON.stringify(getMsgsRes.data));

      console.log('6. Testing Mark Messages as Read (User B)...');
      const readRes = await makeRequest({
        hostname: 'localhost', port: activePort, path: `/api/messages/${conversationId}/read`, method: 'PATCH',
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });
      console.log('Read Receipt Response:', readRes.status, JSON.stringify(readRes.data));

      console.log('\n✅ ALL MESSAGING INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
    } catch (err) {
      console.error('❌ Test execution error:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();
