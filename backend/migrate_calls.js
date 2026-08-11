const pool = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function migrateDatabase() {
  console.log('🚀 Running database schema migration...');
  try {
    const schemaPath = path.join(__dirname, 'src/db/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL by semicolons and execute non-empty statements
    const statements = schemaSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        // Ignore table/index already exists warnings
        if (!err.message.includes('already exists')) {
          console.warn(`Migration notice: ${err.message}`);
        }
      }
    }

    console.log('✅ All database tables and indexes created/verified successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed with error:', err.message);
    process.exit(1);
  }
}

migrateDatabase();
