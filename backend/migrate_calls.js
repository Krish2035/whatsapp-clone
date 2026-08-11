const pool = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function migrateCalls() {
  console.log('Running migration for calls table...');
  try {
    const schemaPath = path.join(__dirname, 'src/db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Extract calls table creation and indexes statements
    const createTableStmt = `
      CREATE TABLE IF NOT EXISTS calls (
        id SERIAL PRIMARY KEY,
        caller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES chats(id) ON DELETE SET NULL,
        call_type VARCHAR(10) NOT NULL DEFAULT 'voice',
        status VARCHAR(20) NOT NULL DEFAULT 'initiated',
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        answered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        ended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        duration_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableStmt);
    console.log('✅ Calls table created/verified successfully.');

    const indexStmts = [
      'CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id)',
      'CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON calls(receiver_id)',
      'CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(receiver_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_calls_conversation ON calls(conversation_id)',
    ];

    for (const idxStmt of indexStmts) {
      try {
        await pool.query(idxStmt);
      } catch (e) {
        // Index may exist
      }
    }
    console.log('✅ Call indexes created/verified successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  }
}

migrateCalls();
