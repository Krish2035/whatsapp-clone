const pool = require('../config/db');

async function requireAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const resDb = await pool.query('SELECT id, username, email, is_admin FROM users WHERE id = $1', [req.user.id]);
    const user = resDb.rows[0];

    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
    }

    req.user.is_admin = true;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify admin status', details: err.message });
  }
}

module.exports = { requireAdmin };
