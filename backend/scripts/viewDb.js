const pool = require('../src/config/db');

async function viewDatabase() {
  console.log('\n==================================================');
  console.log('       📱 WHATSAPP CLONE DATABASE INSPECTOR       ');
  console.log('==================================================\n');

  try {
    // 1. Users Table
    const users = await pool.query('SELECT id, username, email, is_admin, is_online, status_message FROM users ORDER BY id ASC');
    console.log('👥 USERS TABLE:');
    console.table(users.rows);

    // 2. Chats Table
    const chats = await pool.query('SELECT id, is_group, group_name, updated_at FROM chats ORDER BY id ASC');
    console.log('\n💬 CHATS / CONVERSATIONS TABLE:');
    console.table(chats.rows);

    // 3. Messages Table
    const messages = await pool.query(
      'SELECT id, chat_id as conversationId, sender_id as senderId, receiver_id as receiverId, content, status, is_deleted as isDeleted, created_at FROM messages ORDER BY id DESC LIMIT 10'
    );
    console.log('\n✉️ RECENT MESSAGES TABLE (Last 10):');
    console.table(messages.rows);

    // 4. Calls Table
    const calls = await pool.query('SELECT id, caller_id, receiver_id, call_type, status, duration_seconds, started_at FROM calls ORDER BY id DESC LIMIT 10');
    console.log('\n📞 CALL LOGS TABLE:');
    console.table(calls.rows);

    console.log('\n==================================================');
    console.log('✅ Inspection Complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('Error inspecting database:', err.message);
    process.exit(1);
  }
}

viewDatabase();
