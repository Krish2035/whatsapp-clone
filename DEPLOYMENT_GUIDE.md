# Production Deployment Guide: WhatsApp Web Clone (Voice & Video Calling)

This guide provides step-by-step instructions to deploy your WhatsApp Web clone with real-time text messaging, 1-to-1 voice calling, and 1-to-1 video calling to production.

---

## 🏗️ Production Architecture Overview

```text
                               ┌────────────────────────┐
                               │     Users (Browsers)   │
                               └───────────┬────────────┘
                                           │
                                  HTTPS (Port 443) / WSS
                                           │
                               ┌───────────▼────────────┐
                               │  Nginx Reverse Proxy   │
                               │   (SSL via Certbot)    │
                               └─────┬────────────┬─────┘
                                     │            │
                      /api & /socket.io           Static Assets
                             │                    │
                   ┌─────────▼────────┐     ┌─────▼──────────────┐
                   │  Node.js + PM2   │     │  Vite Build Output │
                   │   Backend API    │     │    (/dist folder)  │
                   └─────────┬────────┘     └────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
  ┌─────────▼─────────┐             ┌─────────▼─────────┐
  │ PostgreSQL Database│             │ COTURN TURN Server│
  │  (Port 5432)      │             │  (Port 3478/443)  │
  └───────────────────┘             └───────────────────┘
```

---

## 📋 Prerequisites

1. **Linux Server**: Ubuntu 22.04 LTS (recommended: 2 vCPU, 4GB RAM on DigitalOcean, AWS EC2, or Hetzner).
2. **Domain Name**: Registered domain (e.g. `yourdomain.com`).
   * `app.yourdomain.com` (Frontend React Client)
   * `api.yourdomain.com` (Backend Node.js API & Socket.IO)
   * `turn.yourdomain.com` (COTURN Relay Server for WebRTC calls across NATs/firewalls)

---

## Step 1: DNS Setup

In your Domain Registrar (Cloudflare, Namecheap, Route53), add the following `A` records:

| Record Type | Host / Name | Value / Target IP | Purpose |
| :--- | :--- | :--- | :--- |
| **A** | `app` | `YOUR_SERVER_PUBLIC_IP` | Frontend App URL |
| **A** | `api` | `YOUR_SERVER_PUBLIC_IP` | Backend API & Socket.IO URL |
| **A** | `turn` | `YOUR_SERVER_PUBLIC_IP` | WebRTC TURN Server URL |

---

## Step 2: Server System Packages & Node.js Installation

SSH into your server and run:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Git, Curl, Nginx, PostgreSQL, Certbot
sudo apt install -y git curl nginx postgresql postgresql-contrib certbot python3-certbot-nginx coturn

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally for Node process management
sudo npm install -y -g pm2
```

---

## Step 3: PostgreSQL Production Database Setup

```bash
# Switch to postgres user and enter psql shell
sudo -u postgres psql
```

In the `psql` shell, execute:

```sql
CREATE DATABASE whatsapp_clone;
CREATE USER whatsapp_user WITH PASSWORD 'your_strong_db_password_here';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_clone TO whatsapp_user;
\c whatsapp_clone;
GRANT ALL ON SCHEMA public TO whatsapp_user;
\q
```

---

## Step 4: COTURN TURN/STUN Server Setup (Essential for WebRTC Video Calls)

WebRTC requires a TURN server to relay media streams when users are behind strict NATs, cellular networks, or corporate firewalls.

1. Enable Coturn daemon:
   ```bash
   sudo nano /etc/default/coturn
   ```
   Uncomment or set:
   ```text
   TURNSERVER_ENABLED=1
   ```

2. Configure Coturn:
   ```bash
   sudo nano /etc/turnserver.conf
   ```
   Add/Replace configuration with:
   ```text
   listening-port=3478
   tls-listening-port=5349
   fingerprint
   lt-cred-mech
   user=turnuser:turnpassword123
   realm=turn.yourdomain.com
   log-file=/var/log/turnserver.log
   simple-log
   no-cli
   ```

3. Restart and enable Coturn:
   ```bash
   sudo systemctl restart coturn
   sudo systemctl enable coturn
   ```

---

## Step 5: Backend Deployment

1. Clone your project code to `/var/www/whatsapp-clone`:
   ```bash
   sudo mkdir -p /var/www
   cd /var/www
   sudo git clone https://github.com/your-username/whatsapp-clone.git
   sudo chown -R $USER:$USER /var/www/whatsapp-clone
   ```

2. Configure Backend `.env`:
   ```bash
   cd /var/www/whatsapp-clone/backend
   npm install --production
   nano .env
   ```
   Set production variables:
   ```env
   PORT=5001
   NODE_ENV=production
   DATABASE_URL=postgresql://whatsapp_user:your_strong_db_password_here@localhost:5432/whatsapp_clone
   JWT_SECRET=your_super_secret_jwt_key_random_string_64_chars
   CLIENT_URL=https://app.yourdomain.com
   CALL_RING_TIMEOUT=30
   ```

3. Run Database Migrations:
   ```bash
   node migrate_calls.js
   ```

4. Start Backend with PM2:
   ```bash
   pm2 start src/server.js --name "whatsapp-backend"
   pm2 save
   pm2 startup
   ```

---

## Step 6: Frontend Build

1. Configure Frontend `.env.production`:
   ```bash
   cd /var/www/whatsapp-clone/frontend
   nano .env.production
   ```
   Set:
   ```env
   VITE_API_URL=https://api.yourdomain.com
   VITE_SOCKET_URL=https://api.yourdomain.com
   VITE_STUN_SERVER=stun:stun.l.google.com:19302
   VITE_TURN_SERVER=turn:turn.yourdomain.com:3478
   VITE_TURN_USERNAME=turnuser
   VITE_TURN_CREDENTIAL=turnpassword123
   ```

2. Build production assets:
   ```bash
   npm install
   npm run build
   ```
   *(This creates the static bundle inside `/var/www/whatsapp-clone/frontend/dist`)*.

---

## Step 7: Nginx & SSL Certificate Setup

1. Create Nginx Configuration for Frontend & Backend:
   ```bash
   sudo nano /etc/nginx/sites-available/whatsapp
   ```
   Add the configuration:
   ```nginx
   # 1. Frontend Client Server Block
   server {
       server_name app.yourdomain.com;
       root /var/www/whatsapp-clone/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /uploads/ {
           alias /var/www/whatsapp-clone/backend/uploads/;
       }
   }

   # 2. Backend API & Socket.IO Server Block
   server {
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:5001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

2. Enable Nginx Config:
   ```bash
   sudo ln -s /etc/nginx/sites-available/whatsapp /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. Obtain Free HTTPS Certificates via Let's Encrypt (Certbot):
   ```bash
   sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
   ```

---

## Step 8: Firewall Configuration

Allow required HTTP, HTTPS, SSH, and TURN media relay ports:

```bash
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP (Certbot redirect)
sudo ufw allow 443/tcp      # HTTPS & WSS
sudo ufw allow 3478/tcp     # COTURN STUN/TURN
sudo ufw allow 3478/udp     # COTURN STUN/TURN
sudo ufw allow 49152:65535/udp # WebRTC Media Port Range
sudo ufw enable
```

---

## ✅ Step 9: Final Production Verification Checklist

1. **HTTPS Security**: Access `https://app.yourdomain.com` in your browser and check for valid SSL padlock.
2. **Real-Time WebSockets**: Verify messaging and online user indicators work over `wss://api.yourdomain.com/socket.io`.
3. **Voice Calls**: Test 1-to-1 voice call between two users across mobile and desktop.
4. **Video Calls**: Test 1-to-1 video call between two users across cellular/different WiFi networks (verifying COTURN relay).
5. **Call History**: Verify call records persist in PostgreSQL.
6. **Media Cleanup**: Confirm camera and microphone indicators turn off immediately upon call termination.
