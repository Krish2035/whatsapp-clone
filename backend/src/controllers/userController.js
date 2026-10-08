const pool = require('../config/db');
const cacheService = require('../services/cacheService');

exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      const result = await pool.readQuery(
        `SELECT id, username, email, avatar_url, status_message 
         FROM users 
         ORDER BY username ASC 
         LIMIT 100`
      );
      return res.json({ users: result.rows });
    }

    const searchQuery = `%${q.trim()}%`;
    const result = await pool.readQuery(
      `SELECT id, username, email, avatar_url, status_message 
       FROM users 
       WHERE username ILIKE $1 OR email ILIKE $1
       ORDER BY username ASC 
       LIMIT 50`,
      [searchQuery]
    );

    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const cacheKey = `user:profile:${currentUserId}`;

    const user = await cacheService.getOrSet(cacheKey, async () => {
      const result = await pool.readQuery(
        `SELECT id, username, email, avatar_url, status_message, is_admin, is_online, last_seen, created_at 
         FROM users WHERE id = $1`,
        [currentUserId]
      );
      return result.rows[0] || null;
    }, 180);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
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

    // Invalidate user profile cache
    await cacheService.del(`user:profile:${currentUserId}`);

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
