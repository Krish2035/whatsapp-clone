const pool = require('../config/db');
const conversationService = require('./conversationService');

const messageService = {
  /**
   * Save a new text or media message in PostgreSQL.
   */
  async createMessage({ conversationId, senderId, receiverId, content, mediaUrl, mediaType = 'text', replyToId = null }) {
    if (!conversationId || !senderId) {
      throw new Error('conversationId and senderId are required');
    }

    // Verify sender belongs to conversation
    await conversationService.getConversationById(conversationId, senderId);

    // If receiverId is not directly passed, derive it from other participants
    let targetReceiverId = receiverId;
    if (!targetReceiverId) {
      const otherParticipants = await conversationService.getOtherParticipants(conversationId, senderId);
      if (otherParticipants.length > 0) {
        targetReceiverId = otherParticipants[0];
      }
    }

    // Insert message into database
    const result = await pool.query(
      `INSERT INTO messages (chat_id, sender_id, receiver_id, content, media_url, media_type, status, reply_to_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, chat_id as "conversationId", sender_id as "senderId", receiver_id as "receiverId", content, media_url as "mediaUrl", media_type as "type", status, reply_to_id as "replyToId", created_at as "createdAt", updated_at as "updatedAt"`,
      [conversationId, senderId, targetReceiverId || null, content || '', mediaUrl || null, mediaType, replyToId]
    );

    const message = result.rows[0];

    // Update conversation timestamp
    await pool.query(
      'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    // Fetch sender info for real-time socket payload
    const senderRes = await pool.query(
      'SELECT id, username, avatar_url FROM users WHERE id = $1',
      [senderId]
    );
    message.sender = senderRes.rows[0];

    // Fetch reply_to snippet if replyToId is present
    if (replyToId) {
      const replyRes = await pool.query(
        `SELECT m.id, m.content, u.username as sender_name
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.id = $1`,
        [replyToId]
      );
      if (replyRes.rows.length > 0) {
        message.reply_to = replyRes.rows[0];
      }
    }

    return message;
  },

  /**
   * Fetch messages for a conversation with authorization check.
   */
  async getMessagesByConversation(conversationId, userId, limit = 100, offset = 0) {
    if (!conversationId || String(conversationId).startsWith('temp-')) {
      return [];
    }

    const numChatId = parseInt(conversationId, 10);
    const numUserId = parseInt(userId, 10);

    if (isNaN(numChatId) || isNaN(numUserId)) {
      return [];
    }

    // Validate membership
    await conversationService.getConversationById(numChatId, numUserId);

    const result = await pool.query(
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
          'avatar_url', u.avatar_url
        ) as sender,
        CASE 
          WHEN rm.id IS NOT NULL THEN json_build_object(
            'id', rm.id,
            'content', rm.content,
            'sender_name', ru.username
          )
          ELSE NULL 
        END as reply_to
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN messages rm ON m.reply_to_id = rm.id
       LEFT JOIN users ru ON rm.sender_id = ru.id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [numChatId, limit, offset]
    );

    return result.rows;
  },

  /**
   * Edit message content (only allowed by original sender)
   */
  async editMessage(messageId, userId, newContent) {
    const numMsgId = parseInt(messageId, 10);
    const numUserId = parseInt(userId, 10);

    const result = await pool.query(
      `UPDATE messages
       SET content = $1, is_edited = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND sender_id = $3
       RETURNING id, chat_id as "conversationId", sender_id as "senderId", receiver_id as "receiverId", content, is_edited as "isEdited", updated_at as "updatedAt"`,
      [newContent, numMsgId, numUserId]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found or you are not authorized to edit this message.');
    }
    return result.rows[0];
  },

  /**
   * Delete message (soft delete for everyone, only allowed by original sender)
   */
  async deleteMessage(messageId, userId) {
    const numMsgId = parseInt(messageId, 10);
    const numUserId = parseInt(userId, 10);

    const result = await pool.query(
      `UPDATE messages
       SET content = 'This message was deleted', is_deleted = TRUE, media_url = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND sender_id = $2
       RETURNING id, chat_id as "conversationId", sender_id as "senderId", receiver_id as "receiverId", content, is_deleted as "isDeleted", updated_at as "updatedAt"`,
      [numMsgId, numUserId]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found or you are not authorized to delete this message.');
    }
    return result.rows[0];
  },

  /**
   * Add or toggle emoji reaction on a message
   */
  async addReaction(messageId, userId, emoji) {
    const existing = await pool.query(
      'SELECT id, emoji FROM message_reactions WHERE message_id = $1 AND user_id = $2',
      [messageId, userId]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].emoji === emoji) {
        await pool.query('DELETE FROM message_reactions WHERE id = $1', [existing.rows[0].id]);
        return { messageId, userId, emoji: null, removed: true };
      } else {
        await pool.query('UPDATE message_reactions SET emoji = $1 WHERE id = $2', [emoji, existing.rows[0].id]);
        return { messageId, userId, emoji, removed: false };
      }
    } else {
      await pool.query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
        [messageId, userId, emoji]
      );
      return { messageId, userId, emoji, removed: false };
    }
  },

  /**
   * Update message status to 'delivered'
   */
  async markMessageDelivered(messageId, userId) {
    const result = await pool.query(
      `UPDATE messages 
       SET status = 'delivered', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND (receiver_id = $2 OR receiver_id IS NULL) AND status = 'sent'
       RETURNING id, chat_id as "conversationId", sender_id as "senderId", receiver_id as "receiverId", status`,
      [messageId, userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update message status to 'read' or mark all conversation messages as read
   */
  async markConversationMessagesRead(conversationId, userId) {
    // Verify membership
    await conversationService.getConversationById(conversationId, userId);

    const result = await pool.query(
      `UPDATE messages
       SET status = 'read', updated_at = CURRENT_TIMESTAMP
       WHERE chat_id = $1 AND sender_id != $2 AND status != 'read'
       RETURNING id, chat_id as "conversationId", sender_id as "senderId", receiver_id as "receiverId", status`,
      [conversationId, userId]
    );

    return result.rows;
  },

  /**
   * Batch update delivered status for offline user coming online
   */
  async updatePendingDeliveredStatusForUser(userId) {
    const result = await pool.query(
      `UPDATE messages
       SET status = 'delivered', updated_at = CURRENT_TIMESTAMP
       WHERE receiver_id = $1 AND status = 'sent'
       RETURNING id, chat_id as "conversationId", sender_id as "senderId", status`,
      [userId]
    );
    return result.rows;
  }
};

module.exports = messageService;
