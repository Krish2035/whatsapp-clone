# WhatsApp Clone (Full-Stack Next.js + Node.js + PostgreSQL + Docker)

Full-stack real-time messaging and voice/video calling application clone built with Next.js, React, Node.js Express, PostgreSQL, Redis, Socket.IO, and WebRTC.

---

## ⚡ Quick Start (Two Ways to Run)

### Option 1: Local Development (Single Command)
Run all website services (Frontend + Backend + Database) together with one simple command:
```bash
npm run dev
```
- **🌐 Frontend Web App**: [http://localhost:3000](http://localhost:3000)
- **⚙️ Backend API & Sockets**: [http://localhost:5000](http://localhost:5000)
- **📚 Interactive Swagger API Docs**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- *Note*: If PostgreSQL is running locally, it connects automatically. Otherwise, it seamlessly uses the embedded SQLite database with zero configuration needed.

---

### Option 2: Full Docker Stack (Docker Desktop)
When Docker Desktop is installed and running, wake up the complete multi-container production cluster with:
```bash
docker compose up -d
```
To stop all Docker services:
```bash
docker compose down
```

#### Services Orchestrated by Docker Compose:
| Service | Container Name | Port | Description |
| :--- | :--- | :--- | :--- |
| **Unified Gateway** | `whatsapp_loadbalancer` | `80`, `5000` | Nginx reverse proxy & load balancer with sticky sessions |
| **Frontend App** | `whatsapp_frontend` | `3000` | Next.js production web application |
| **Backend API #1** | `whatsapp_backend_1` | Internal | Primary Express & Socket.IO replica |
| **Backend API #2** | `whatsapp_backend_2` | Internal | Secondary scale-out Express replica |
| **PostgreSQL Master** | `whatsapp_postgres_primary` | `5432` | Primary PostgreSQL database with auto-seeds |
| **PostgreSQL Replica**| `whatsapp_postgres_replica` | `5433` | Read-only query replica database |
| **Redis Cache** | `whatsapp_redis` | `6379` | High-speed cache and Pub/Sub store |

---

## 📁 Project Structure

```
Whatsapp-clone/
├── package.json          # Root scripts (npm run dev, docker compose helpers)
├── docker-compose.yml    # Complete multi-service Docker configuration
├── scripts/
│   └── dev.js            # Unified service runner for npm run dev
├── frontend/             # Next.js / React Client App
│   ├── Dockerfile        # Production Dockerfile
│   ├── .dockerignore
│   ├── .env.local        # Local backend endpoints
│   ├── src/
│   │   ├── components/   # ChatArea, Sidebar, Calls, Modals
│   │   ├── services/     # API & Socket clients
│   │   └── app/          # Next.js App Router
│   └── package.json
│
├── backend/              # Node.js Express Backend Server
│   ├── Dockerfile        # Production Dockerfile
│   ├── src/
│   │   ├── config/       # PostgreSQL DB pool & SQLite fallback
│   │   ├── controllers/  # Auth, Chat, Message, Call logic
│   │   ├── db/           # PostgreSQL schema & seeds
│   │   └── server.js     # Express server & Socket.IO
│   └── package.json
│
└── loadbalancer/
    └── nginx.conf        # Nginx configuration for load balancing & proxying
```

---

## 🛠️ Available Root NPM Commands

```bash
npm run dev           # Start both Backend and Frontend concurrently
npm run docker:up     # Wake up all Docker services (docker compose up -d)
npm run docker:down   # Stop all Docker services (docker compose down)
npm run docker:build  # Rebuild all Docker images
npm run docker:logs   # View live logs from all Docker containers
npm run dev:backend   # Start only the backend in dev mode
npm run dev:frontend  # Start only the frontend in dev mode
npm run install:all   # Install dependencies for root, backend, and frontend
```
