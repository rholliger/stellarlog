# StellarLog — Backend

FastAPI + SQLite. Python 3.11+.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Seed the Messier + Caldwell + NGC catalogs
python -m app.seed_data

# Run
uvicorn app.main:app --reload --port 8002
```

## Environment

Copy `.env.example` to `.env` and add your API keys:
- `OPENWEATHER_API_KEY` — [OpenWeatherMap](https://openweathermap.org/api) (free tier)
- `OPENAI_API_KEY` — [OpenAI](https://platform.openai.com/) (for Whisper transcription)

## API Docs

Once running: http://localhost:8002/docs (Swagger UI)

## Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/observations` | List/create observations |
| GET/PUT/DELETE | `/api/observations/{id}` | Get/update/delete one |
| POST | `/api/observations/{id}/photos` | Upload photo |
| GET | `/api/targets/all` | All Messier + Caldwell + NGC |
| GET | `/api/astronomy/moon?date=YYYY-MM-DD` | Moon phase |
| GET | `/api/astronomy/visibility?catalog_id=M42` | DSO visibility |
| GET | `/api/weather` | Current weather |
| POST | `/api/transcribe` | Whisper transcription |

## PM2 Deployment

```bash
pip install -r requirements.txt
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8002" --name stellarlog
pm2 save
```

Or use the provided `ecosystem.config.js`:
```bash
pm2 start ecosystem.config.js
```
