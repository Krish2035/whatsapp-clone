const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authService = {
  async register({ username, email, password }) {
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase().trim(), username.trim()]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email or username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, avatar_url, status_message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, avatar_url, status_message, is_online, last_seen, created_at`,
      [
        username.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
        'Hey there! I am using WhatsApp.'
      ]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'supersecretjwtkey_change_me_in_production',
      { expiresIn: '7d' }
    );

    return { user, token };
  },

  async login({ email, username, identifier, password }) {
    const loginId = (email || username || identifier || '').toLowerCase().trim();
    if (!loginId || !password) {
      throw new Error('Email or username, and password are required');
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1',
      [loginId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email/username or password');
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email/username or password');
    }

    delete user.password_hash;

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'supersecretjwtkey_change_me_in_production',
      { expiresIn: '7d' }
    );

    return { user, token };
  },

  async getUserById(userId) {
    const result = await pool.query(
      'SELECT id, username, email, avatar_url, status_message, is_online, last_seen, created_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }
};

module.exports = authService;
