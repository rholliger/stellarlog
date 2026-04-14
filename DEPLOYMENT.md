# StellarLog Deployment Guide

## Local Development (Laptop)

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8002
```

### Frontend
```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8002`.
Vite proxy handles API routing automatically.

---

## VPS Deployment (Tailscale)

### 1. Start Backend
```bash
cd /home/openclaw/apps/stellarlog/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8002
```

### 2. Serve Backend via Tailscale
```bash
tailscale serve --https=443 --set-path=/stellarlog-backend --bg=true http://localhost:8002
```

### 3. Frontend Options

**Option A: Dev Mode**
```bash
cd /home/openclaw/apps/stellarlog/frontend
npm run dev:vps
```
Then serve via Tailscale:
```bash
tailscale serve --https=443 --set-path=/stellarlog --bg=true http://localhost:5173
```

**Option B: Production Build (Recommended)**
```bash
cd /home/openclaw/apps/stellarlog/frontend
npm run build
tailscale serve --https=443 --set-path=/stellarlog --bg=true /home/openclaw/apps/stellarlog/frontend/dist
```

### 4. Access URLs
- Frontend: `https://roy-oc.tail0568ff.ts.net/stellarlog`
- Backend: `https://roy-oc.tail0568ff.ts.net/stellarlog-backend`

---

## Environment Files

| File | Purpose |
|------|---------|
| `.env.local` | Local dev (gitignored) |
| `.env.production` | VPS/production settings |

---

## Tailscale Serve Commands Reference

```bash
# View current serves
tailscale serve status

# Remove a serve
tailscale serve --https=443 --set-path=/stellarlog off
tailscale serve --https=443 --set-path=/stellarlog-backend off

# Reset all
tailscale serve reset
```

---

## Quick Start Script (VPS)

Save as `/home/openclaw/apps/stellarlog/start.sh`:

```bash
#!/bin/bash
cd /home/openclaw/apps/stellarlog

# Reset existing serves
tailscale serve reset

# Start backend
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8002 &

# Serve backend via Tailscale
tailscale serve --https=443 --set-path=/stellarlog-backend --bg=true http://localhost:8002

# Build and serve frontend
cd ../frontend
npm run build
tailscale serve --https=443 --set-path=/stellarlog --bg=true /home/openclaw/apps/stellarlog/frontend/dist

echo "StellarLog is running:"
echo "  Frontend: https://roy-oc.tail0568ff.ts.net/stellarlog"
echo "  Backend:  https://roy-oc.tail0568ff.ts.net/stellarlog-backend"
```

Make executable: `chmod +x /home/openclaw/apps/stellarlog/start.sh`
