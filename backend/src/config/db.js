const { Pool } = require('pg');
let Database = null;
const fs = require('fs');
const path = require('path');
const net = require('net');
require('dotenv').config();

let usePg = false;
let pgPool = null;
let pgReadPool = null;
let sqliteDb = null;
let initPromise = null;

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbReadHost = process.env.DB_READ_HOST || process.env.DB_HOST || 'localhost';
const dbReadPort = parseInt(process.env.DB_READ_PORT || process.env.DB_PORT || '5432', 10);

function checkPgPort(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: timeoutMs });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function ensurePgSchema(poolInstance) {
  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const seedPath = path.join(__dirname, '../db/seed.sql');

    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const statements = schemaSql.split(';').map((s) => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        try {
          await poolInstance.query(stmt);
        } catch (e) {}
      }

      // Auto-migrate missing columns for existing PostgreSQL tables (e.g. Neon cloud database)
      try {
        await poolInstance.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE');
        await poolInstance.query("UPDATE users SET is_admin = FALSE WHERE LOWER(email) != 'admin@example.com'");
        await poolInstance.query("UPDATE users SET is_admin = TRUE WHERE LOWER(email) = 'admin@example.com'");
        await poolInstance.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE');
        await poolInstance.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE');
        await poolInstance.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_user_ids TEXT DEFAULT '[]'");
        await poolInstance.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
        await poolInstance.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT NULL');
        await poolInstance.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type VARCHAR(50) DEFAULT 'text'");
        await poolInstance.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL');
        await poolInstance.query('ALTER TABLE chats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
        
        // Auto-update self-chat messages to 'read' status
        await poolInstance.query("UPDATE messages SET status = 'read' WHERE sender_id = receiver_id OR receiver_id IS NULL");

        // High Efficiency Search Indexing (Full-Text & Trigram)
        try {
          await poolInstance.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
          await poolInstance.query('CREATE INDEX IF NOT EXISTS idx_messages_content_trgm ON messages USING gin (content gin_trgm_ops)');
          await poolInstance.query('CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin (username gin_trgm_ops)');
          await poolInstance.query('CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops)');
          await poolInstance.query("CREATE INDEX IF NOT EXISTS idx_messages_fts ON messages USING gin (to_tsvector('english', content))");
        } catch (idxNotice) {
          // Extension might require superuser; standard B-Tree index from schema.sql is already active
        }
      } catch (colErr) {
        console.warn('PostgreSQL column auto-migration warning:', colErr.message);
      }

      console.log('✅ PostgreSQL Database schema verified/initialized automatically.');
    }

    if (fs.existsSync(seedPath)) {
      try {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        const statements = seedSql.split(';').map((s) => s.trim()).filter(Boolean);
        for (const stmt of statements) {
          try {
            await poolInstance.query(stmt);
          } catch (e) {}
        }
        console.log('✅ PostgreSQL Seed users (Alice, Bob, Charlie) initialized automatically.');
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Auto-schema verification notice:', err.message);
  }
}

function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      if (process.env.DATABASE_URL) {
        try {
          console.log('Connecting to Cloud PostgreSQL via DATABASE_URL...');
          pgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000,
          });
          const client = await pgPool.connect();
          client.release();
          usePg = true;
          console.log('✅ Connected to Cloud PostgreSQL Database successfully.');
          await ensurePgSchema(pgPool);
        } catch (err) {
          console.error('❌ Cloud PostgreSQL connection failed:', err.message);
        }
      }

      if (!usePg) {
        const isPgAvailable = await checkPgPort(dbHost, dbPort, 300);
        if (isPgAvailable) {
          try {
            pgPool = new Pool({
              host: dbHost,
              port: dbPort,
              user: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD || 'postgres',
              database: process.env.DB_NAME || 'whatsapp_clone',
              connectionTimeoutMillis: 2000,
            });
            const client = await pgPool.connect();
            client.release();
            usePg = true;
            console.log('✅ Connected to Local PostgreSQL Database successfully.');
            await ensurePgSchema(pgPool);
          } catch (err) {
            console.log('ℹ️ Local PostgreSQL connection attempt failed. Using embedded SQLite database.');
          }
        }
      }

      if (usePg) {
        // Initialize PostgreSQL Read Replica Pool (if configured)
        if (process.env.DATABASE_READ_URL) {
          try {
            pgReadPool = new Pool({
              connectionString: process.env.DATABASE_READ_URL,
              ssl: process.env.DATABASE_READ_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
              connectionTimeoutMillis: 5000,
            });
            const rClient = await pgReadPool.connect();
            rClient.release();
            console.log('✅ Connected to PostgreSQL Read Replica successfully.');
          } catch (rErr) {
            console.warn('⚠️ Read replica connection failed, falling back to primary pool:', rErr.message);
            pgReadPool = pgPool;
          }
        } else if (process.env.DB_READ_HOST && process.env.DB_READ_HOST !== dbHost) {
          try {
            pgReadPool = new Pool({
              host: dbReadHost,
              port: dbReadPort,
              user: process.env.DB_READ_USER || process.env.DB_USER || 'postgres',
              password: process.env.DB_READ_PASSWORD || process.env.DB_PASSWORD || 'postgres',
              database: process.env.DB_READ_NAME || process.env.DB_NAME || 'whatsapp_clone',
              connectionTimeoutMillis: 3000,
            });
            const rClient = await pgReadPool.connect();
            rClient.release();
            console.log('✅ Connected to PostgreSQL Read Replica successfully.');
          } catch (rErr) {
            console.warn('⚠️ Read replica connection failed, falling back to primary pool:', rErr.message);
            pgReadPool = pgPool;
          }
        } else {
          // No dedicated replica configured; read pool points to primary
          pgReadPool = pgPool;
        }
        return;
      }

      console.log('ℹ️ Local SQLite database active (whatsapp_clone.db).');
      initSqlite();
    })();
  }
  return initPromise;
}

// Trigger initialization immediately
ensureInit();

function initSqlite() {
  if (sqliteDb) return;
  if (!Database) Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, '../../whatsapp_clone.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.function('NOW', () => new Date().toISOString());

  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const seedPath = path.join(__dirname, '../db/seed.sql');

  try {
    sqliteDb.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
  } catch (e) {}

  try {
    sqliteDb.exec("UPDATE users SET is_admin = 0 WHERE LOWER(email) != 'admin@example.com'");
    sqliteDb.exec("UPDATE users SET is_admin = 1 WHERE LOWER(email) = 'admin@example.com'");
  } catch (e) {}

  try {
    sqliteDb.exec('ALTER TABLE messages ADD COLUMN receiver_id INTEGER REFERENCES users(id)');
  } catch (e) {}

  try {
    sqliteDb.exec('ALTER TABLE messages ADD COLUMN is_edited INTEGER DEFAULT 0');
  } catch (e) {}

  try {
    sqliteDb.exec('ALTER TABLE messages ADD COLUMN is_deleted INTEGER DEFAULT 0');
  } catch (e) {}

  try {
    sqliteDb.exec("ALTER TABLE messages ADD COLUMN deleted_for_user_ids TEXT DEFAULT '[]'");
  } catch (e) {}

  try {
    sqliteDb.exec('ALTER TABLE messages ADD COLUMN reply_to_id INTEGER REFERENCES messages(id)');
  } catch (e) {}

  try {
    sqliteDb.exec('ALTER TABLE messages ADD COLUMN media_url TEXT');
  } catch (e) {}

  try {
    sqliteDb.exec("ALTER TABLE messages ADD COLUMN media_type TEXT DEFAULT 'text'");
  } catch (e) {}

  try {
    sqliteDb.exec('ALTER TABLE chats ADD COLUMN updated_at DATETIME');
  } catch (e) {}

  try {
    sqliteDb.exec('ALTER TABLE messages ADD COLUMN updated_at DATETIME');
  } catch (e) {}

  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
      .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/TIMESTAMP WITH TIME ZONE/gi, 'DATETIME');

    const statements = schemaSql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try {
        sqliteDb.exec(stmt);
      } catch (err) {}
    }
  }

  if (fs.existsSync(seedPath)) {
    try {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      sqliteDb.exec(seedSql);
    } catch (e) {}
  }

  // SQLite Search & Performance Indexes
  try {
    sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_sqlite_messages_content ON messages(content)');
    sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_sqlite_users_username ON users(username)');
    sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_sqlite_users_email ON users(email)');
  } catch (e) {}
}

function prepareSqliteQuery(sql, params = []) {
  const newParams = [];
  const translatedSql = sql.replace(/\$(\d+)/g, (_, number) => {
    const idx = parseInt(number, 10) - 1;
    const val = params[idx];
    newParams.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
    return '?';
  })
  .replace(/\bILIKE\b/gi, 'LIKE')
  .replace(/json_build_object/gi, 'json_object')
  .replace(/json_agg/gi, 'json_group_array')
  .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP')
  .replace(/::[a-z_]+/gi, '');

  return { sql: translatedSql, params: newParams };
}

function parseJsonFields(row) {
  if (!row) return row;
  const newRow = { ...row };
  const jsonKeys = ['last_message', 'participants', 'reply_to', 'reactions'];
  for (const key of jsonKeys) {
    if (newRow[key] && typeof newRow[key] === 'string') {
      try {
        newRow[key] = JSON.parse(newRow[key]);
      } catch (e) {}
    }
  }
  if (typeof newRow.is_group === 'number') newRow.is_group = Boolean(newRow.is_group);
  if (typeof newRow.is_online === 'number') newRow.is_online = Boolean(newRow.is_online);
  if (typeof newRow.is_admin === 'number') newRow.is_admin = Boolean(newRow.is_admin);
  if (typeof newRow.is_admin === 'boolean') newRow.is_admin = Boolean(newRow.is_admin);
  return newRow;
}

const pool = {
  async query(text, params = []) {
    await ensureInit();

    if (usePg) {
      return await pgPool.query(text, params);
    }

    if (!sqliteDb) {
      initSqlite();
    }

    const { sql, params: newParams } = prepareSqliteQuery(text, params);
    const trimmedSql = sql.trim().toUpperCase();

    if (trimmedSql.startsWith('SELECT')) {
      const stmt = sqliteDb.prepare(sql);
      const rows = stmt.all(...newParams).map(parseJsonFields);
      return { rows };
    } else {
      const matchTable = trimmedSql.match(/INTO\s+([a-zA-Z0-9_]+)|UPDATE\s+([a-zA-Z0-9_]+)/i);
      const tableName = matchTable ? (matchTable[1] || matchTable[2]) : null;

      if (trimmedSql.includes('RETURNING')) {
        try {
          const stmt = sqliteDb.prepare(sql);
          let result = stmt.all(...newParams);
          if (Array.isArray(result) && result.length > 0) {
            return { rows: result.map(parseJsonFields) };
          }
        } catch (e) {}

        const cleanSql = sql.replace(/\s*RETURNING\s+.*$/i, '');
        const stmt = sqliteDb.prepare(cleanSql);
        const info = stmt.run(...newParams);
        if (tableName && info.lastInsertRowid) {
          const fetched = sqliteDb.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(Number(info.lastInsertRowid));
          return { rows: fetched ? [parseJsonFields(fetched)] : [] };
        }
        return { rows: [], rowCount: info.changes };
      } else {
        const stmt = sqliteDb.prepare(sql);
        const info = stmt.run(...newParams);
        return { rows: [], rowCount: info.changes };
      }
    }
  },
  /**
   * Routes read-only queries (SELECTs) to PostgreSQL read replica if configured.
   * Gracefully fails over to primary pool or SQLite if replica is unavailable.
   */
  async readQuery(text, params = []) {
    await ensureInit();

    if (usePg && pgReadPool) {
      try {
        return await pgReadPool.query(text, params);
      } catch (readErr) {
        console.warn('⚠️ Read replica query error (failing over to primary):', readErr.message);
        return await pgPool.query(text, params);
      }
    }

    return await this.query(text, params);
  },
  on(event, listener) {
    if (pgPool) pgPool.on(event, listener);
  },
  getPrimaryPool: () => pgPool,
  getReadPool: () => pgReadPool || pgPool
};

module.exports = pool;
