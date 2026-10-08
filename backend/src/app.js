const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./config/db');
const { swaggerUi, swaggerDocument, customCss } = require('./docs/swagger');
const { apiLimiter, authLimiter, uploadLimiter } = require('./middlewares/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const aiRoutes = require('./routes/aiRoutes');
const statusRoutes = require('./routes/statusRoutes');
const callRoutes = require('./routes/callRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  req.io = req.app.get('io');
  next();
});

// Static uploads directory for media files with CORS headers for direct blob downloads
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  }
}));

// Root Service Status Endpoint for Render / Uptime Checkers
app.get('/', (req, res) => {
  res.json({
    service: 'WhatsApp Clone Backend API',
    status: 'online',
    docs: '/api/docs',
    timestamp: new Date().toISOString()
  });
});

// Health Check Endpoint (Excluded from strict rate limits)
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

// Swagger UI Documentation Endpoints
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss,
  customSiteTitle: 'WhatsApp Clone API Documentation'
}));
app.get('/api/docs.json', (req, res) => {
  res.json(swaggerDocument);
});
app.get('/docs', (req, res) => res.redirect('/api/docs'));

// Rate Limiting Middlewares (DDoS & Brute-Force Protection)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/media/upload', uploadLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api', apiLimiter);

const mediaController = require('./controllers/mediaController');

// API Routes Setup
app.get('/api/download', (req, res) => mediaController.downloadFile(req, res));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/chats', conversationRoutes); // alias for backwards compatibility
app.use('/api/messages', messageRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/upload', mediaRoutes); // alias for backwards compatibility
app.use('/api/ai', aiRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
