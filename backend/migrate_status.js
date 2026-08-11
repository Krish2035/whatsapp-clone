const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'whatsapp_clone.db'));

const stmts = [
  `CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT DEFAULT NULL,
    media_type VARCHAR(20) DEFAULT 'text',
    caption TEXT DEFAULT '',
    bg_color VARCHAR(30) DEFAULT '#075e54',
    duration_ms INTEGER DEFAULT 5000,
    expires_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS status_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_id INTEGER REFERENCES statuses(id) ON DELETE CASCADE,
    viewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(status_id, viewer_id)
  )`,
  `CREATE TABLE IF NOT EXISTS status_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_id INTEGER REFERENCES statuses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(20) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(status_id, user_id)
  )`,
];

for (const s of stmts) {
  try {
    db.exec(s);
    console.log('✅ Created:', s.trim().split('\n')[0]);
  } catch (e) {
    console.log('ℹ️ Skipped:', e.message);
  }
}
console.log('Status tables ready!');
db.close();
