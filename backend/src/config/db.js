const { Pool } = require('pg');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const net = require('net');
require('dotenv').config();

let usePg = false;
let pgPool = null;
let sqliteDb = null;
let initPromise = null;

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

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
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const statements = schemaSql.split(';').map((s) => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        try {
          await poolInstance.query(stmt);
        } catch (e) {
          // Ignore duplicate table/index errors
        }
      }
      console.log('✅ PostgreSQL Database schema verified/initialized automatically.');
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
          return;
        } catch (err) {
          console.error('❌ Cloud PostgreSQL connection failed:', err.message);
        }
      }

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
          return;
        } catch (err) {
          console.log('ℹ️ Local PostgreSQL connection attempt failed. Using embedded SQLite database.');
        }
      } else {
        console.log('ℹ️ Local SQLite database active (whatsapp_clone.db).');
      }
      initSqlite();
    })();
  }
  return initPromise;
}

// Trigger initialization immediately
ensureInit();

function initSqlite() {
  if (sqliteDb) return;
  const dbPath = path.join(__dirname, '../../whatsapp_clone.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.function('NOW', () => new Date().toISOString());

  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const seedPath = path.join(__dirname, '../db/seed.sql');

  try {
    sqliteDb.exec('ALTER TABLE messages ADD COLUMN receiver_id INTEGER REFERENCES users(id)');
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
  .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');

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
  on(event, listener) {
    if (pgPool) pgPool.on(event, listener);
  }
};

module.exports = pool;
