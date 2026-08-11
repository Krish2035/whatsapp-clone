const pool = require('../config/db');

// GET /api/statuses - fetch all statuses visible to authenticated user (own + contacts with active statuses)
const getStatuses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all active statuses (not expired, within 24h) for all users
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = await pool.query(
      `SELECT 
        s.id, s.user_id, s.media_url, s.media_type, s.caption, s.bg_color, s.duration_ms, s.created_at,
        u.username, u.avatar_url,
        (SELECT COUNT(*) FROM status_views sv WHERE sv.status_id = s.id) as view_count,
        (SELECT COUNT(*) FROM status_views sv WHERE sv.status_id = s.id AND sv.viewer_id = $2) as viewed_by_me,
        (SELECT emoji FROM status_reactions sr WHERE sr.status_id = s.id AND sr.user_id = $2 LIMIT 1) as my_reaction
      FROM statuses s
      JOIN users u ON s.user_id = u.id
      WHERE s.created_at > $3
      ORDER BY s.created_at DESC`,
      [userId, userId, cutoff]
    );

    // Group by user
    const byUser = {};
    result.rows.forEach((row) => {
      const uid = row.user_id;
      if (!byUser[uid]) {
        byUser[uid] = {
          user_id: uid,
          username: row.username,
          avatar_url: row.avatar_url,
          statuses: [],
          is_mine: String(uid) === String(userId),
        };
      }
      byUser[uid].statuses.push({
        id: row.id,
        media_url: row.media_url,
        media_type: row.media_type,
        caption: row.caption,
        bg_color: row.bg_color,
        duration_ms: row.duration_ms,
        created_at: row.created_at,
        view_count: parseInt(row.view_count || 0),
        viewed_by_me: parseInt(row.viewed_by_me || 0) > 0,
        my_reaction: row.my_reaction || null,
      });
    });

    res.json({ statusGroups: Object.values(byUser) });
  } catch (err) {
    console.error('getStatuses error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/statuses - create a new status
const createStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { media_url, media_type, caption, bg_color, duration_ms } = req.body;

    if (!media_type) {
      return res.status(400).json({ error: 'media_type is required' });
    }

    // For text statuses, caption is required; for image/video, media_url is required
    if (media_type === 'text' && !caption) {
      return res.status(400).json({ error: 'caption is required for text status' });
    }
    if ((media_type === 'image' || media_type === 'video') && !media_url) {
      return res.status(400).json({ error: 'media_url is required for image/video status' });
    }

    const result = await pool.query(
      `INSERT INTO statuses (user_id, media_url, media_type, caption, bg_color, duration_ms, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        media_url || null,
        media_type,
        caption || '',
        bg_color || '#075e54',
        duration_ms || 5000,
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString(),
      ]
    );

    res.status(201).json({ status: result.rows[0] });
  } catch (err) {
    console.error('createStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/statuses/:id - delete own status
const deleteStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query('DELETE FROM statuses WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/statuses/:id/view - mark a status as viewed
const viewStatus = async (req, res) => {
  try {
    const viewerId = req.user.id;
    const { id: statusId } = req.params;

    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO status_views (status_id, viewer_id, viewed_at) VALUES ($1, $2, $3)
       ON CONFLICT (status_id, viewer_id) DO UPDATE SET viewed_at = $3`,
      [statusId, viewerId, now]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('viewStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/statuses/:id/viewers - get viewers list for own status
const getStatusViewers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: statusId } = req.params;

    // Verify ownership
    const statusCheck = await pool.query('SELECT user_id FROM statuses WHERE id = $1', [statusId]);
    if (!statusCheck.rows[0] || String(statusCheck.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Not authorized to view viewers of this status' });
    }

    const result = await pool.query(
      `SELECT sv.viewer_id, sv.viewed_at, u.username, u.avatar_url,
        (SELECT emoji FROM status_reactions sr WHERE sr.status_id = $1 AND sr.user_id = sv.viewer_id LIMIT 1) as reaction
       FROM status_views sv
       JOIN users u ON sv.viewer_id = u.id
       WHERE sv.status_id = $1
       ORDER BY sv.viewed_at DESC`,
      [statusId]
    );

    res.json({ viewers: result.rows });
  } catch (err) {
    console.error('getStatusViewers error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/statuses/:id/react - react to a status with emoji
const reactToStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: statusId } = req.params;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ error: 'emoji is required' });

    await pool.query(
      `INSERT INTO status_reactions (status_id, user_id, emoji) VALUES ($1, $2, $3)
       ON CONFLICT (status_id, user_id) DO UPDATE SET emoji = $3`,
      [statusId, userId, emoji]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('reactToStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStatuses, createStatus, deleteStatus, viewStatus, getStatusViewers, reactToStatus };
