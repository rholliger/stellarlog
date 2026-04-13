# StellarLog

Your astrophotography observation journal and sky planner.

## Features

- **Journal** — Log observation sessions: target, notes, photos, weather, moon phase, seeing rating
- **Tonight's Sky** — What to look for right now from Aesch ZH
- **Smart Target Selector** — Search Messier (110), Caldwell (109), and NGC flagship (~200) catalogs
- **Voice Notes** — Whisper-powered transcription for field notes
- **A/B Comparison** — Compare the same target across different sessions (coming soon)
- **Auto-captions** — Generate Instagram/blog captions from your session data

## Stack

**Backend:** FastAPI + SQLite (Drizzle-compatible schema) + Skyfield + OpenWeatherMap + Whisper
**Frontend:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui + React Query + React Router
**Deployment:** PM2 on Hetzner VPS

## Setup

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your API keys
python -m app.seed_data  # seed Messier + Caldwell + NGC catalogs
uvicorn app.main:app --reload --port 8002
```

API docs: http://localhost:8002/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173

### Deploy to Hetzner

```bash
# Backend
cd backend && pip install -r requirements.txt
cd .. && pm2 start ecosystem.config.js

# Frontend — build and serve with nginx
cd frontend && npm run build
# Point nginx to frontend/dist/ or serve with: npm run preview -- --port 3000
```

## API Keys

- **OpenWeatherMap** — https://openweathermap.org/api (free tier: 1M calls/month)
- **OpenAI** — https://platform.openai.com/ (for Whisper transcription)

## Project Structure

```
stellarlog/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + all endpoints
│   │   ├── schema.py        # DB schema + Pydantic models
│   │   ├── database.py      # SQLite connection
│   │   ├── seed_data.py     # Messier + Caldwell + NGC seed
│   │   └── services/
│   │       ├── astronomy.py  # Moon phase + DSO visibility
│   │       ├── weather.py    # OpenWeatherMap
│   │       └── transcription.py  # Whisper API
│   ├── data/                 # Photos + voice uploads (gitignored)
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Router + navbar
│   │   ├── lib/api.ts        # API client
│   │   └── pages/
│   │       ├── ObservationsList.tsx
│   │       ├── NewObservation.tsx
│   │       ├── ObservationDetail.tsx
│   │       └── TonightSky.tsx
│   ├── package.json
│   └── vite.config.ts
├── ecosystem.config.js       # PM2 config
├── README.md
└── .gitignore
```

## What's Working (Week 1 MVP)

- [x] CRUD for observation sessions
- [x] Target selector (Messier + Caldwell + NGC)
- [x] Text notes + voice input (Whisper)
- [x] Photo upload
- [x] Auto moon phase on save
- [x] Weather data (OpenWeatherMap)
- [x] Seeing rating (1-5 stars)
- [x] Tonight's Sky: best visible targets
- [x] Tonight's Sky: 7-day weather forecast
- [x] Caption generation (OpenAI)

## Roadmap

- Week 2: Visibility checker (7-day + which DSOs are best)
- Week 3: AI-generated Instagram captions + blog posts
- Week 4: A/B comparison (same target, two dates)

## License

Private — Roy Holliger
