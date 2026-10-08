const { drizzle } = require('drizzle-orm/node-postgres');
const pool = require('../../config/db');
const schema = require('./schema');

// Lazy initializer for Drizzle ORM client
let drizzleDb = null;

function getDrizzleDb() {
  if (!drizzleDb) {
    const rawPgPool = pool.getPrimaryPool();
    if (rawPgPool) {
      drizzleDb = drizzle(rawPgPool, { schema });
    } else {
      // In SQLite mode or before pg pool connects, wrap pool query
      drizzleDb = drizzle(pool, { schema });
    }
  }
  return drizzleDb;
}

module.exports = {
  getDrizzleDb,
  schema
};
