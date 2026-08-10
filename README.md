# WhatsApp Clone (React-Vite + Node.js + PostgreSQL)

Full-stack real-time messaging application clone built with React (Vite), Node.js, Express, PostgreSQL, and Socket.IO.

## Project Structure

```
Whatsapp-clone/
├── frontend/             # React + Vite Client App
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/   # ChatArea, Sidebar, UI components
│       ├── context/      # AuthContext
│       ├── hooks/        # Custom React hooks
│       ├── pages/        # Home, Login, Register
│       ├── services/     # API & Socket clients
│       ├── App.jsx
│       └── index.css     # WhatsApp Design System
│
├── backend/              # Node.js Express Backend Server
│   ├── src/
│   │   ├── config/       # PostgreSQL DB pool setup
│   │   ├── controllers/  # Auth, Chat, Message logic
│   │   ├── db/           # PostgreSQL schema (schema.sql)
│   │   ├── middlewares/  # JWT Auth & Error Handling
│   │   ├── routes/       # Auth, Chat, Message API endpoints
│   │   └── server.js     # Express server & Socket.IO
│   ├── .env.example
│   └── package.json
│
└── README.md
```

## Getting Started

### 1. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup PostgreSQL database:
   - Create a PostgreSQL database named `whatsapp_clone`.
   - Update `.env` with your PostgreSQL username, password, host, and port.
   - Run `schema.sql` inside your PostgreSQL database to create necessary tables.
4. Start the backend server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Tech Stack
- **Frontend**: React, Vite, CSS Variables (WhatsApp Dark Theme)
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: PostgreSQL (via `pg` pool driver)
- **Auth**: JWT & bcryptjs
