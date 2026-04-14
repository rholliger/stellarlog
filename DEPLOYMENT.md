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
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8002
```

### 2. Serve Backend via Tailscale
```bash
tailscale serve --https=443 --set-path=/stellarlog-backend http://localhost:8002
```

### 3. Frontend Options

**Option A: Dev Mode**
```bash
cd frontend
npm run dev:vps
```
Then serve via Tailscale:
```bash
tailscale serve --https=443 --set-path=/stellarlog http://localhost:5173
```

**Option B: Production Build (Recommended)**
```bash
cd frontend
npm run build
tailscale serve --https=443 --set-path=/stellarlog /path/to/frontend/dist
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
