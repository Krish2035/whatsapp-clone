const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const aiRoutes = require('./routes/aiRoutes');
const statusRoutes = require('./routes/statusRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory for media files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({
      status: 'OK',
      message: 'WhatsApp Clone Backend Server is running successfully',
      dbTime: dbRes.rows[0]?.now || new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection check failed',
      error: err.message,
    });
  }
});

// API Routes Setup
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/chats', conversationRoutes); // alias for backwards compatibility
app.use('/api/messages', messageRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/upload', mediaRoutes); // alias for backwards compatibility
app.use('/api/ai', aiRoutes);
app.use('/api/statuses', statusRoutes);

// Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
