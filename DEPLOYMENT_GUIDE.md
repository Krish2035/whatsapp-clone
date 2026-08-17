# Production Deployment Guide: WhatsApp Clone

This guide provides complete, step-by-step instructions to deploy your **WhatsApp Web Clone** to production with:
- **Frontend**: Deployed on **Vercel** (`https://whatsapp-clone-nu-lyart.vercel.app`)
- **Backend**: Deployed on **Render** (`https://whatsapp-backend-ea92.onrender.com`)
- **Database**: Deployed on **Neon PostgreSQL** (`neon.tech`)

---

## 🏗️ Architecture Stack

```text
  ┌────────────────────────────────────────────────────────┐
  │              Vercel (Next.js App Router)               │
  │        https://whatsapp-clone-nu-lyart.vercel.app      │
  └───────────────────────────┬────────────────────────────┘
                              │ HTTPS REST / WSS WebSockets
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                    Render (Backend)                    │
  │          https://whatsapp-backend.onrender.com         │
  └───────────────────────────┬────────────────────────────┘
                              │ DATABASE_URL (SSL Required)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                Neon PostgreSQL (Database)              │
  │           postgresql://user:pass@ep-xyz.neon.tech      │
  └────────────────────────────────────────────────────────┘
```

---

## Step 1: Configure Neon PostgreSQL Database (`neon.tech`)

1. Open your project on [Neon Console](https://console.neon.tech/) (`Whstapp-web-clone`).
2. Copy your PostgreSQL Connection String (`DATABASE_URL`):
   ```text
   postgresql://krish_owner:Password123@ep-cool-cloud-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
3. *Note*: The backend automatically runs schema initialization and column auto-migrations on startup when connecting to Neon, so tables and initial demo users (`alice@example.com`, `bob@example.com`, `charlie@example.com`) are initialized automatically on first boot!

---

## Step 2: Deploy & Configure Backend on Render (`render.com`)

1. Open your service on [Render Dashboard](https://dashboard.render.com/) (`whatsapp-backend`).
2. Verify settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`

3. Add / Verify Environment Variables in Render:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations and strict port binding |
| `PORT` | `10000` | Dynamic port assigned by Render |
| `DATABASE_URL` | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` | Your Neon PostgreSQL connection string |
| `JWT_SECRET` | `super_secure_production_jwt_secret_key_change_me_12345` | Secret key for signing auth tokens |
| `CLIENT_URL` | `https://whatsapp-clone-nu-lyart.vercel.app,https://whatsapp-clone-26utiwfat-krish2035s-projects.vercel.app` | Allowed Vercel CORS origins |
| `GROQ_API_KEY` | `gsk_your_groq_api_key_here` | Key for Meta AI chatbot capabilities |

4. Save Environment Variables and trigger a redeploy on Render.

---

## Step 3: Deploy & Configure Frontend on Vercel (`vercel.com`)

1. Open your project on [Vercel Dashboard](https://vercel.com/dashboard) (`whatsapp-clone`).
2. Configure project settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

3. Add / Verify Environment Variables in Vercel:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://whatsapp-backend.onrender.com` | Render Backend API URL |
| `NEXT_PUBLIC_SOCKET_URL` | `https://whatsapp-backend.onrender.com` | Render Backend Socket.IO URL |
| `NEXT_PUBLIC_AGORA_APP_ID` | `4876b5d9bc3741ec9cb33b3dcfdbca91` | Agora App ID for Voice/Video Calls |
| `NEXT_PUBLIC_STUN_SERVER` | `stun:stun.l.google.com:19302,stun:global.stun.twilio.com:3478` | Public STUN servers |
| `NEXT_PUBLIC_TURN_SERVER` | `turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443` | OpenRelay TURN servers |
| `NEXT_PUBLIC_TURN_USERNAME` | `openrelayproject` | TURN username |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | `openrelayproject` | TURN password |

4. Trigger a new production deployment on Vercel.

---

## Step 4: Verification Checklist

1. **Backend & Database Health**:
   - Access `https://whatsapp-backend.onrender.com/api/health` in your browser.
   - Output: `{"status":"OK","message":"WhatsApp Clone Backend Server is running successfully","dbTime":"..."}` confirming connection to Neon PostgreSQL!

2. **Frontend Authentication Test**:
   - Open your Vercel URL (`https://whatsapp-clone-nu-lyart.vercel.app`).
   - Log in with seed account: `alice@example.com` / `password123`.

3. **Real-Time Messaging Test**:
   - Open your Vercel URL in two browser windows.
   - Send a message from Alice to Bob — verify instant WebSocket delivery and blue read ticks.

4. **Cross-Network Voice & Video Call Test**:
   - Initiate a voice or video call.
   - WebRTC signaling and STUN/TURN fallback connects audio/video streams across different networks.
