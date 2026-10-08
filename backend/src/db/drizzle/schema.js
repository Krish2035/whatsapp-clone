const { 
  pgTable, 
  serial, 
  text, 
  varchar, 
  boolean, 
  integer, 
  timestamp, 
  primaryKey, 
  unique 
} = require('drizzle-orm/pg-core');

// WhatsApp Users Table Schema
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url').default(''),
  statusMessage: varchar('status_message', { length: 255 }).default('Hey there! I am using WhatsApp.'),
  isOnline: boolean('is_online').default(false),
  isAdmin: boolean('is_admin').default(false),
  lastSeen: timestamp('last_seen', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// WhatsApp Conversations / Chats Table Schema
const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  isGroup: boolean('is_group').default(false),
  groupName: varchar('group_name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Chat Participants Junction Table Schema
const chatParticipants = pgTable('chat_participants', {
  chatId: integer('chat_id').references(() => chats.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.chatId, table.userId] })
}));

// Messages Table Schema
const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  chatId: integer('chat_id').references(() => chats.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id').references(() => users.id, { onDelete: 'cascade' }),
  receiverId: integer('receiver_id').references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').default(''),
  status: varchar('status', { length: 20 }).default('sent'), // sent, delivered, read
  replyToId: integer('reply_to_id').references(() => messages.id, { onDelete: 'set null' }),
  mediaUrl: text('media_url'),
  mediaType: varchar('media_type', { length: 50 }).default('text'),
  isEdited: boolean('is_edited').default(false),
  isDeleted: boolean('is_deleted').default(false),
  deletedForUserIds: text('deleted_for_user_ids').default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Message Reactions Table Schema
const messageReactions = pgTable('message_reactions', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  emoji: varchar('emoji', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  uniqMessageUser: unique().on(table.messageId, table.userId)
}));

// Status / Stories Table Schema
const statuses = pgTable('statuses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  mediaUrl: text('media_url'),
  mediaType: varchar('media_type', { length: 20 }).default('text'),
  caption: text('caption').default(''),
  bgColor: varchar('bg_color', { length: 30 }).default('#075e54'),
  durationMs: integer('duration_ms').default(5000),
  expiresAt: timestamp('expires_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Status Views Table Schema
const statusViews = pgTable('status_views', {
  id: serial('id').primaryKey(),
  statusId: integer('status_id').references(() => statuses.id, { onDelete: 'cascade' }),
  viewerId: integer('viewer_id').references(() => users.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  uniqStatusViewer: unique().on(table.statusId, table.viewerId)
}));

// Calls Table Schema
const calls = pgTable('calls', {
  id: serial('id').primaryKey(),
  callerId: integer('caller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: integer('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: integer('conversation_id').references(() => chats.id, { onDelete: 'set null' }),
  callType: varchar('call_type', { length: 10 }).default('voice').notNull(),
  status: varchar('status', { length: 20 }).default('initiated').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  answeredAt: timestamp('answered_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

module.exports = {
  users,
  chats,
  chatParticipants,
  messages,
  messageReactions,
  statuses,
  statusViews,
  calls
};
