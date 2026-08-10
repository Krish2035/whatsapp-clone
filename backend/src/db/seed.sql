-- Sample Seed Data for WhatsApp Clone
-- Default password for all seed users is 'password123'

INSERT INTO users (username, email, password_hash, status_message)
VALUES 
  ('Alice', 'alice@example.com', '$2a$10$BKklCaHd68Em5uBryWfb7OWAlZbNCKJhvOYsCWgkTRGguOVcYlzKO', 'Available | Coding with React & Node!'),
  ('Bob', 'bob@example.com', '$2a$10$BKklCaHd68Em5uBryWfb7OWAlZbNCKJhvOYsCWgkTRGguOVcYlzKO', 'At work | Working on WhatsApp clone'),
  ('Charlie', 'charlie@example.com', '$2a$10$BKklCaHd68Em5uBryWfb7OWAlZbNCKJhvOYsCWgkTRGguOVcYlzKO', 'Busy | Sleeping')
ON CONFLICT (email) DO NOTHING;
