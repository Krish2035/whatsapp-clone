# Production Deployment Guide: WhatsApp Clone

This guide provides complete, step-by-step instructions to deploy your **WhatsApp Web Clone** to production with:
- **Frontend**: Deployed on **Vercel**
- **Backend**: Deployed on **Render**
- **Database**: Deployed on **Neon PostgreSQL** (`neon.tech`)

---

## 🏗️ Architecture Stack

```text
  ┌────────────────────────────────────────────────────────┐
  │                   Vercel (Frontend)                    │
  │               https://your-app.vercel.app              │
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

## Step 1: Create Neon PostgreSQL Database (`neon.tech`)

1. Go to [Neon Console](https://console.neon.tech/) and create a project named `whatsapp-clone`.
2. Select your closest region (e.g. AWS US East / EU Central / Asia Pacific).
3. Copy your Connection String (`DATABASE_URL`):
   ```text
   postgresql://alex:AbC123Xyz@ep-cool-cloud-123456.us-east-2.aws.neon.tech/whatsapp_clone?sslmode=require
   ```
4. *Note*: The backend database module automatically runs `schema.sql` and `seed.sql` on startup when connecting to Neon, so tables and initial demo users (`alice@example.com`, `bob@example.com`, `charlie@example.com`) are initialized automatically!

---

## Step 2: Deploy Backend to Render (`render.com`)

1. Push your project codebase to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) ──► Click **New +** ──► **Web Service**.
3. Connect your GitHub repository.
4. Select the `backend` directory (Root Directory: `backend`).
5. Configure the build & start commands:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`

6. Add Environment Variables in Render:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Set environment mode to production |
| `PORT` | `10000` | Port assigned by Render (automatically handled) |
| `DATABASE_URL` | `postgresql://user:pass@ep-xyz.neon.tech/whatsapp_clone?sslmode=require` | Your Neon PostgreSQL connection string |
| `JWT_SECRET` | `generate_a_random_64_char_secret_key_here` | Secret key for signing authentication tokens |
| `CLIENT_URL` | `https://your-frontend.vercel.app` | Your Vercel production frontend URL |
| `GROQ_API_KEY` | `gsk_your_groq_api_key_here` | Optional: Key for Meta AI chatbot capabilities |

7. Click **Create Web Service**. Note down your backend URL (e.g. `https://whatsapp-backend.onrender.com`).

---

## Step 3: Deploy Frontend to Vercel (`vercel.com`)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) ──► Click **Add New...** ──► **Project**.
2. Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Add Environment Variables in Vercel:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://whatsapp-backend.onrender.com` | Your Render backend URL |
| `VITE_SOCKET_URL` | `https://whatsapp-backend.onrender.com` | Your Render backend Socket.IO URL |
| `VITE_STUN_SERVER` | `stun:stun.l.google.com:19302,stun:global.stun.twilio.com:3478` | Free public STUN servers |
| `VITE_TURN_SERVER` | `turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443,turn:openrelay.metered.ca:443?transport=tcp` | Free OpenRelay TURN servers |
| `VITE_TURN_USERNAME` | `openrelayproject` | TURN username |
| `VITE_TURN_CREDENTIAL` | `openrelayproject` | TURN password |

5. Click **Deploy**. Vercel will build your static assets and deploy to `https://your-frontend.vercel.app`.

---

## Step 4: Verification Checklist

1. **Database Tables & Auto-Schema Verification**:
   - Access `https://whatsapp-backend.onrender.com/api/health` in your browser.
   - It will return `{"status":"OK","message":"WhatsApp Clone Backend Server is running successfully","dbTime":"..."}` confirming connection to Neon PostgreSQL!

2. **Frontend Authentication Test**:
   - Open your Vercel URL (`https://your-frontend.vercel.app`).
   - Log in with seed account: `alice@example.com` / `password123`.
   - Or click **Register** to create a new user account.

3. **Real-Time Messaging Test**:
   - Open your Vercel URL in two different browser windows.
   - Send a message from Alice to Bob and verify instantaneous real-time delivery and read receipts over WebSockets.

4. **Cross-Network Voice & Video Call Test**:
   - Initiate a voice or video call.
   - OpenRelay TURN fallback ensures media streams connect across different networks and firewalls.
