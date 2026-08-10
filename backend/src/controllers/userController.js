const pool = require('../config/db');

exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || q.trim() === '') {
      return res.json({ users: [] });
    }

    const searchQuery = `%${q.trim()}%`;
    const result = await pool.query(
      `SELECT id, username, email, avatar_url, status_message 
       FROM users 
       WHERE id != $1 AND (username ILIKE $2 OR email ILIKE $2)
       LIMIT 20`,
      [currentUserId, searchQuery]
    );

    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const result = await pool.query(
      `SELECT id, username, email, avatar_url, status_message, created_at 
       FROM users WHERE id = $1`,
      [currentUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { status_message, avatar_url } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET status_message = COALESCE($1, status_message),
           avatar_url = COALESCE($2, avatar_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, username, email, avatar_url, status_message`,
      [status_message, avatar_url, currentUserId]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
