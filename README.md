# WhatsApp Web Vercel - Real-Time WhatsApp Web Clone

[![WhatsApp Web Vercel Demo](https://img.shields.io/badge/Live%20Demo-WhatsApp%20Web%20Vercel-00a884?style=for-the-badge&logo=vercel&logoColor=white)](https://whatsapp-clone-nu-lyart.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

> **🚀 Live Website on Vercel**: **[https://whatsapp-clone-nu-lyart.vercel.app](https://whatsapp-clone-nu-lyart.vercel.app)**  
> **WhatsApp Web Vercel** is a production-ready, full-stack real-time clone of WhatsApp Web deployed on Vercel. Features instant 1-on-1 and group messaging, Agora audio & video calling, voice notes, status stories, Meta AI assistant, and dark mode.

---

## 🌟 Live Demo on Vercel
Experience the live app immediately on Vercel:
👉 **[Open WhatsApp Web Vercel](https://whatsapp-clone-nu-lyart.vercel.app)**

---

## ✨ Features

- 💬 **Instant Real-Time Messaging**: Built with Socket.IO for zero-latency 1-on-1 and group chats.
- 📞 **Voice & Video Calling**: High-definition calls powered by Agora RTC.
- 🎙️ **Voice Notes**: In-browser audio recording and voice message playback.
- 📸 **Status Stories**: 24-hour disappearing multimedia status updates.
- 🤖 **Meta AI Integration**: Embedded conversational AI chatbot powered by Groq.
- 🌙 **Official Dark Theme**: Pixel-perfect WhatsApp Web UI and animations.
- 📱 **Progressive Web App (PWA)**: Installable on Desktop, iOS, and Android.
- ⚡ **Vercel Edge & CDN**: Optimized for ultra-fast loading, Core Web Vitals, and search engine indexation.

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
├── frontend/             # Next.js App Router (Deployed on Vercel)
│   ├── src/
│   │   ├── app/          # App router: layout, metadata, robots.js, sitemap.js
│   │   ├── components/   # ChatArea, Sidebar, Calls, Modals
│   │   ├── services/     # API & Socket clients
│   │   └── views/        # Home, AuthPage
│   ├── public/           # Manifest, icons, OpenGraph card
│   └── package.json
│
├── backend/              # Node.js Express Backend Server (Deployed on Render)
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

---

## 🌐 Production Deployments

- **Frontend (Vercel)**: [https://whatsapp-clone-nu-lyart.vercel.app](https://whatsapp-clone-nu-lyart.vercel.app)
- **Backend (Render)**: `https://whatsapp-backend-ea92.onrender.com`
- **Database (Neon PostgreSQL)**: Cloud Serverless Postgres
