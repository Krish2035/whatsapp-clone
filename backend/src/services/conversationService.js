const pool = require('../config/db');

const conversationService = {
  /**
   * Find an existing 1-to-1 conversation between userA and userB, or create a new one.
   */
  async findOrCreateOneToOneConversation(userAId, userBId) {
    if (userAId === userBId) {
      throw new Error('Cannot create a conversation with yourself');
    }

    // Verify target user B exists
    const targetUser = await pool.query('SELECT id FROM users WHERE id = $1', [userBId]);
    if (targetUser.rows.length === 0) {
      throw new Error('Target user does not exist');
    }

    // Check for existing 1-to-1 chat containing both participants
    const existingChatResult = await pool.query(
      `SELECT c.id
       FROM chats c
       JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = $1
       JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = $2
       WHERE c.is_group = FALSE
       LIMIT 1`,
      [userAId, userBId]
    );

    if (existingChatResult.rows.length > 0) {
      const chatId = existingChatResult.rows[0].id;
      return await this.getConversationById(chatId, userAId);
    }

    // Create new chat row
    const newChatResult = await pool.query(
      `INSERT INTO chats (is_group, created_at, updated_at)
       VALUES (FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, is_group, created_at, updated_at`
    );

    const chatId = newChatResult.rows[0]?.id;
    if (!chatId) {
      throw new Error('Failed to create new conversation record');
    }

    // Insert participants
    await pool.query(
      `INSERT INTO chat_participants (chat_id, user_id)
       VALUES ($1, $2)`,
      [chatId, userAId]
    );
    await pool.query(
      `INSERT INTO chat_participants (chat_id, user_id)
       VALUES ($1, $2)`,
      [chatId, userBId]
    );

    return await this.getConversationById(chatId, userAId);
  },

  /**
   * Get all conversations for a specific user with participants and last message.
   */
  async getUserConversations(userId) {
    const chatsResult = await pool.query(
      `SELECT c.id, c.is_group, c.group_name, c.created_at, c.updated_at
       FROM chats c
       JOIN chat_participants cp ON c.id = cp.chat_id
       WHERE cp.user_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    const conversations = [];
    for (const chat of chatsResult.rows) {
      const fullConv = await this.getConversationById(chat.id, userId);
      conversations.push(fullConv);
    }

    return conversations;
  },

  /**
   * Get detailed conversation metadata and ensure user is a valid participant.
   */
  async getConversationById(chatId, userId) {
    const numChatId = parseInt(chatId, 10);
    const numUserId = parseInt(userId, 10);

    if (isNaN(numChatId) || isNaN(numUserId)) {
      throw new Error('Invalid conversation or user ID');
    }

    const participantCheck = await pool.query(
      'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
      [numChatId, numUserId]
    );

    if (participantCheck.rows.length === 0) {
      throw new Error('Access denied. You are not a member of this conversation.');
    }

    const chatRes = await pool.query(
      'SELECT id, is_group, group_name, created_at, updated_at FROM chats WHERE id = $1',
      [numChatId]
    );

    if (chatRes.rows.length === 0) {
      throw new Error('Conversation not found');
    }

    const conversation = chatRes.rows[0];

    // Fetch participants
    const partRes = await pool.query(
      `SELECT u.id, u.username, u.email, u.avatar_url, u.is_online, u.last_seen
       FROM chat_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.chat_id = $1`,
      [numChatId]
    );
    conversation.participants = partRes.rows;

    // Fetch last message
    const msgRes = await pool.query(
      `SELECT id, sender_id as "senderId", receiver_id as "receiverId", content, media_url as "mediaUrl", media_type as "type", status, created_at as "createdAt"
       FROM messages
       WHERE chat_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [numChatId]
    );
    conversation.last_message = msgRes.rows[0] || null;

    // Calculate unread messages count for this user
    const unreadRes = await pool.query(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE chat_id = $1 AND sender_id != $2 AND status != 'read'`,
      [numChatId, numUserId]
    );
    conversation.unread_count = parseInt(unreadRes.rows[0]?.count || '0', 10);

    return conversation;
  },

  /**
   * Helper to get all participant IDs for a chat except the sender.
   */
  async getOtherParticipants(chatId, senderId) {
    const result = await pool.query(
      'SELECT user_id FROM chat_participants WHERE chat_id = $1 AND user_id != $2',
      [chatId, senderId]
    );
    return result.rows.map(row => row.user_id);
  }
};

module.exports = conversationService;
