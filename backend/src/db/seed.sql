-- Sample Seed Data for WhatsApp Clone
-- Default password for all seed users is 'password123'

INSERT INTO users (id, username, email, password_hash, status_message, is_admin)
VALUES 
  (1, 'Alice', 'alice@example.com', '$2a$10$BKklCaHd68Em5uBryWfb7OWAlZbNCKJhvOYsCWgkTRGguOVcYlzKO', 'Available | Coding with React & Node!', TRUE),
  (2, 'Bob', 'bob@example.com', '$2a$10$BKklCaHd68Em5uBryWfb7OWAlZbNCKJhvOYsCWgkTRGguOVcYlzKO', 'At work | Working on WhatsApp clone', FALSE),
  (3, 'Charlie', 'charlie@example.com', '$2a$10$BKklCaHd68Em5uBryWfb7OWAlZbNCKJhvOYsCWgkTRGguOVcYlzKO', 'Busy | Sleeping', FALSE),
  (4, 'Admin', 'admin@example.com', '$2a$10$BKklCaHd68Em5uBryWfb7OWAlZbNCKJhvOYsCWgkTRGguOVcYlzKO', 'System Administrator', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO chats (id, is_group, group_name)
VALUES (1, FALSE, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO chat_participants (chat_id, user_id)
VALUES (1, 1), (1, 2)
ON CONFLICT DO NOTHING;

INSERT INTO messages (id, chat_id, sender_id, receiver_id, content, status)
VALUES (1, 1, 2, 1, 'Hello Alice! Welcome to WhatsApp Web.', 'delivered')
ON CONFLICT DO NOTHING;
