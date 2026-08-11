-- WhatsApp Clone PostgreSQL Schema Definition

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT DEFAULT '',
  status_message VARCHAR(255) DEFAULT 'Hey there! I am using WhatsApp.',
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  is_group BOOLEAN DEFAULT FALSE,
  group_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read'
  reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  media_url TEXT DEFAULT NULL,
  media_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'document'
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id)
);

-- Performance Indexes for Real-Time WhatsApp Queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_status ON messages(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- WhatsApp Status Feature Tables
CREATE TABLE IF NOT EXISTS statuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT DEFAULT NULL,
  media_type VARCHAR(20) DEFAULT 'text',
  caption TEXT DEFAULT '',
  bg_color VARCHAR(30) DEFAULT '#075e54',
  duration_ms INTEGER DEFAULT 5000,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS status_views (
  id SERIAL PRIMARY KEY,
  status_id INTEGER REFERENCES statuses(id) ON DELETE CASCADE,
  viewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(status_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS status_reactions (
  id SERIAL PRIMARY KEY,
  status_id INTEGER REFERENCES statuses(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(status_id, user_id)
);

-- WhatsApp Voice & Video Calls Feature Table
CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  caller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES chats(id) ON DELETE SET NULL,
  call_type VARCHAR(10) NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video', 'audio')),
  status VARCHAR(20) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'calling', 'ringing', 'accepted', 'connected', 'rejected', 'missed', 'cancelled', 'ended', 'busy', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  duration_seconds INTEGER DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_different_users CHECK (caller_id <> receiver_id)
);

-- Performance Indexes for Call Logs & Queries
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_conversation ON calls(conversation_id);


