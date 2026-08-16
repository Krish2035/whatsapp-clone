const pool = require('../config/db');

const adminService = {
  /**
   * System-wide statistics for Admin Dashboard Overview
   */
  async getStats() {
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const messagesCount = await pool.query('SELECT COUNT(*) as count FROM messages');
    const deletedCount = await pool.query('SELECT COUNT(*) as count FROM messages WHERE is_deleted = TRUE');
    const chatsCount = await pool.query('SELECT COUNT(*) as count FROM chats');
    const activeCallsCount = await pool.query(
      "SELECT COUNT(*) as count FROM calls WHERE status IN ('initiated', 'calling', 'ringing', 'accepted', 'connected')"
    );

    return {
      totalUsers: parseInt(usersCount.rows[0]?.count || '0', 10),
      totalMessages: parseInt(messagesCount.rows[0]?.count || '0', 10),
      totalDeletedMessages: parseInt(deletedCount.rows[0]?.count || '0', 10),
      totalConversations: parseInt(chatsCount.rows[0]?.count || '0', 10),
      activeCallsCount: parseInt(activeCallsCount.rows[0]?.count || '0', 10),
    };
  },

  /**
   * Fetch all users with admin status, online state, and message activity
   */
  async getAllUsers() {
    const res = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.avatar_url, 
        u.status_message, 
        u.is_online, 
        u.is_admin, 
        u.last_seen, 
        u.created_at,
        COUNT(m.id) as message_count
       FROM users u
       LEFT JOIN messages m ON m.sender_id = u.id
       GROUP BY u.id, u.username, u.email, u.avatar_url, u.status_message, u.is_online, u.is_admin, u.last_seen, u.created_at
       ORDER BY u.id ASC`
    );

    return res.rows.map((user) => ({
      ...user,
      is_admin: Boolean(user.is_admin),
      is_online: Boolean(user.is_online),
      message_count: parseInt(user.message_count || '0', 10),
    }));
  },

  /**
   * Toggle admin privileges for a user
   */
  async toggleUserAdmin(targetUserId) {
    const numUserId = parseInt(targetUserId, 10);
    const existing = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [numUserId]);
    if (existing.rows.length === 0) {
      throw new Error('User not found');
    }

    const currentAdmin = Boolean(existing.rows[0].is_admin);
    const newAdmin = !currentAdmin;

    const res = await pool.query(
      'UPDATE users SET is_admin = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, is_admin',
      [newAdmin, numUserId]
    );

    return res.rows[0];
  },

  /**
   * Get all conversations across the system with participant profiles
   */
  async getConversations() {
    const res = await pool.query(
      `SELECT 
        c.id, 
        c.is_group, 
        c.group_name, 
        c.created_at, 
        c.updated_at,
        COUNT(m.id) as total_messages,
        COUNT(CASE WHEN m.is_deleted = TRUE THEN 1 END) as deleted_messages_count,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', u.id,
                'username', u.username,
                'email', u.email,
                'avatar_url', u.avatar_url,
                'is_online', u.is_online
              )
            )
            FROM chat_participants cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.chat_id = c.id
          ),
          '[]'
        ) as participants
       FROM chats c
       LEFT JOIN messages m ON m.chat_id = c.id
       GROUP BY c.id, c.is_group, c.group_name, c.created_at, c.updated_at
       ORDER BY c.updated_at DESC`
    );

    return res.rows.map((chat) => ({
      ...chat,
      is_group: Boolean(chat.is_group),
      total_messages: parseInt(chat.total_messages || '0', 10),
      deleted_messages_count: parseInt(chat.deleted_messages_count || '0', 10),
    }));
  },

  /**
   * Admin Vault: Fetch full conversation message history INCLUDING DELETED MESSAGES
   */
  async getConversationMessages(conversationId) {
    const numChatId = parseInt(conversationId, 10);
    if (isNaN(numChatId)) {
      throw new Error('Invalid conversationId');
    }

    const res = await pool.query(
      `SELECT 
        m.id, 
        m.chat_id as "conversationId", 
        m.sender_id as "senderId", 
        m.receiver_id as "receiverId", 
        m.content, 
        m.media_url as "mediaUrl", 
        m.media_type as "type", 
        m.status, 
        m.reply_to_id as "replyToId", 
        m.is_edited as "isEdited",
        m.is_deleted as "isDeleted",
        m.created_at as "createdAt", 
        m.updated_at as "updatedAt",
        json_build_object(
          'id', u.id,
          'username', u.username,
          'email', u.email,
          'avatar_url', u.avatar_url
        ) as sender
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC`,
      [numChatId]
    );

    return res.rows.map((msg) => ({
      ...msg,
      isEdited: Boolean(msg.isEdited),
      isDeleted: Boolean(msg.isDeleted),
    }));
  },

  /**
   * Active Live Calls Monitor: Fetch all currently active/ongoing calls
   */
  async getActiveCalls() {
    const res = await pool.query(
      `SELECT 
        c.id, 
        c.caller_id, 
        c.receiver_id, 
        c.conversation_id, 
        c.call_type, 
        c.status, 
        c.started_at, 
        c.created_at,
        u1.username as caller_name,
        u1.avatar_url as caller_avatar,
        u2.username as receiver_name,
        u2.avatar_url as receiver_avatar
       FROM calls c
       JOIN users u1 ON c.caller_id = u1.id
       JOIN users u2 ON c.receiver_id = u2.id
       WHERE c.status IN ('initiated', 'calling', 'ringing', 'accepted', 'connected')
       ORDER BY c.created_at DESC`
    );

    return res.rows;
  }
};

module.exports = adminService;
