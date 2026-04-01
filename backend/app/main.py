"""
StellarLog — FastAPI backend
Run: uvicorn app.main:app --reload --port 8000
"""

import os
import json
from pathlib import Path
from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import sqlite3

from app.database import get_connection, get_cursor, dict_from_row, init_db
from app.schema import (
    ObservationCreate, ObservationUpdate, ObservationResponse,
    PhotoResponse, TargetCatalogItem, MoonResponse, VisibilityResponse,
    SkyCheckCreate, SkyCheckUpdate, SkyCheckResponse,
)
from app.services import astronomy, weather, transcription

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
PHOTOS_DIR = DATA_DIR / "photos"
VOICE_DIR = DATA_DIR / "voice"
PHOTOS_DIR.mkdir(exist_ok=True)
VOICE_DIR.mkdir(exist_ok=True)

app = FastAPI(title="StellarLog API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file serving for photos
app.mount("/photos", StaticFiles(directory=str(PHOTOS_DIR)), name="photos")
app.mount("/voice", StaticFiles(directory=str(VOICE_DIR)), name="voice")


@app.on_event("startup")
def startup():
    init_db()


# ---------------------------------------------------------------------------
# Observations
# ---------------------------------------------------------------------------

@app.get("/api/observations", response_model=list[ObservationResponse])
def list_observations(
    limit: int = Query(50, le=200),
    offset: int = 0,
    target: Optional[str] = None,
):
    with get_cursor() as cur:
        sql = "SELECT * FROM observations WHERE 1=1"
        params = []
        if target:
            sql += " AND (target_name LIKE ? OR target_catalog_id LIKE ?)"
            params.extend([f"%{target}%", f"%{target}%"])
        sql += " ORDER BY date DESC, time DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cur.execute(sql, params)
        rows = cur.fetchall()

    results = []
    for row in rows:
        obs = dict_from_row(row)
        obs["photos"] = _get_photos(obs["id"])
        results.append(ObservationResponse(**obs))

    return results


@app.post("/api/observations", response_model=ObservationResponse)
async def create_observation(obs: ObservationCreate):
    # Fetch moon phase for this date/time
    try:
        obs_date = datetime.strptime(obs.date, "%Y-%m-%d").date()
    except Exception:
        obs_date = date.today()

    moon = astronomy.get_moon_phase(obs_date)

    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO observations
               (date, time, target_name, target_catalog_id, notes_text,
                seeing_rating, location, gear, moon_phase, moon_phase_name)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                obs.date, obs.time, obs.target_name, obs.target_catalog_id,
                obs.notes_text, obs.seeing_rating, obs.location, obs.gear,
                moon["illumination"], moon["phase_name"],
            ),
        )
        obs_id = cur.lastrowid

    return get_observation(obs_id)


@app.get("/api/observations/{obs_id}", response_model=ObservationResponse)
def get_observation(obs_id: int):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM observations WHERE id = ?", (obs_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Observation not found")

    obs = dict_from_row(row)
    obs["photos"] = _get_photos(obs_id)
    return ObservationResponse(**obs)


@app.put("/api/observations/{obs_id}", response_model=ObservationResponse)
def update_observation(obs_id: int, obs: ObservationUpdate):
    existing = get_observation(obs_id)
    fields = obs.model_dump(exclude_unset=True)
    if not fields:
        return existing

    set_parts = [f"{k} = ?" for k in fields.keys()]
    values = list(fields.values()) + [obs_id]
    with get_cursor() as cur:
        cur.execute(f"UPDATE observations SET {', '.join(set_parts)} WHERE id = ?", values)

    return get_observation(obs_id)


@app.delete("/api/observations/{obs_id}")
def delete_observation(obs_id: int):
    with get_cursor() as cur:
        cur.execute("DELETE FROM observations WHERE id = ?", (obs_id,))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Sky Checks
# ---------------------------------------------------------------------------

@app.get("/api/sky-checks", response_model=list[SkyCheckResponse])
def list_sky_checks(
    limit: int = Query(30, le=100),
    offset: int = 0,
    date: Optional[str] = None,
):
    with get_cursor() as cur:
        sql = "SELECT * FROM sky_checks WHERE 1=1"
        params = []
        if date:
            sql += " AND date = ?"
            params.append(date)
        sql += " ORDER BY date DESC, time DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cur.execute(sql, params)
        rows = cur.fetchall()

    return [SkyCheckResponse(**dict_from_row(r)) for r in rows]


@app.post("/api/sky-checks", response_model=SkyCheckResponse)
def create_sky_check(sky_check: SkyCheckCreate):
    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO sky_checks
               (date, time, location, cloud_cover, transparency, seeing,
                temperature, humidity, wind_speed, moon_phase, moon_visible, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sky_check.date, sky_check.time, sky_check.location,
                sky_check.cloud_cover, sky_check.transparency, sky_check.seeing,
                sky_check.temperature, sky_check.humidity, sky_check.wind_speed,
                sky_check.moon_phase, 1 if sky_check.moon_visible else 0 if sky_check.moon_visible is not None else None,
                sky_check.notes,
            ),
        )
        sky_check_id = cur.lastrowid

    return get_sky_check(sky_check_id)


@app.get("/api/sky-checks/{sky_check_id}", response_model=SkyCheckResponse)
def get_sky_check(sky_check_id: int):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM sky_checks WHERE id = ?", (sky_check_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Sky check not found")

    d = dict_from_row(row)
    # Convert moon_visible from integer to boolean
    if "moon_visible" in d:
        d["moon_visible"] = bool(d["moon_visible"])
    return SkyCheckResponse(**d)


@app.put("/api/sky-checks/{sky_check_id}", response_model=SkyCheckResponse)
def update_sky_check(sky_check_id: int, sky_check: SkyCheckUpdate):
    existing = get_sky_check(sky_check_id)
    fields = sky_check.model_dump(exclude_unset=True)
    if not fields:
        return existing

    # Handle moon_visible boolean -> int conversion
    if "moon_visible" in fields:
        fields["moon_visible"] = 1 if fields["moon_visible"] else 0

    set_parts = [f"{k} = ?" for k in fields.keys()]
    values = list(fields.values()) + [sky_check_id]
    with get_cursor() as cur:
        cur.execute(f"UPDATE sky_checks SET {', '.join(set_parts)} WHERE id = ?", values)

    return get_sky_check(sky_check_id)


@app.delete("/api/sky-checks/{sky_check_id}")
def delete_sky_check(sky_check_id: int):
    with get_cursor() as cur:
        cur.execute("DELETE FROM sky_checks WHERE id = ?", (sky_check_id,))
    return {"ok": True}


@app.get("/api/sky-checks/latest")
def get_latest_sky_check():
    """Get the most recent sky check for today."""
    with get_cursor() as cur:
        cur.execute(
            "SELECT * FROM sky_checks ORDER BY date DESC, time DESC LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "No sky checks found")

    d = dict_from_row(row)
    if "moon_visible" in d:
        d["moon_visible"] = bool(d["moon_visible"])
    return SkyCheckResponse(**d)


# ---------------------------------------------------------------------------
# Photos
# ---------------------------------------------------------------------------

def _get_photos(obs_id: int) -> list[PhotoResponse]:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM photos WHERE observation_id = ?", (obs_id,))
        rows = cur.fetchall()
    return [
        PhotoResponse(
            **dict_from_row(r),
            url=f"/photos/{obs_id}/{r['filename']}",
        )
        for r in rows
    ]


@app.post("/api/observations/{obs_id}/photos", response_model=PhotoResponse)
async def upload_photo(obs_id: int, file: UploadFile = File(...)):
    # Verify observation exists
    get_observation(obs_id)

    obs_photo_dir = PHOTOS_DIR / str(obs_id)
    obs_photo_dir.mkdir(exist_ok=True)

    import uuid
    ext = Path(file.filename or "photo.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = obs_photo_dir / filename

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Extract basic EXIF if possible
    exif_json = None
    try:
        from PIL import Image
        img = Image.open(filepath)
        exif = img._getexif() if hasattr(img, "_getexif") else {}
        if exif:
            exif_json = json.dumps({k: str(v) for k, v in (exif or {}).items()})
    except Exception:
        pass

    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO photos (observation_id, filename, original_name, file_size, mime_type, exif_json)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (obs_id, filename, file.filename, len(content), file.content_type, exif_json),
        )
        photo_id = cur.lastrowid

    return PhotoResponse(
        id=photo_id,
        observation_id=obs_id,
        filename=filename,
        original_name=file.filename,
        caption=None,
        file_size=len(content),
        mime_type=file.content_type,
        url=f"/photos/{obs_id}/{filename}",
    )


# ---------------------------------------------------------------------------
# Voice / Transcription
# ---------------------------------------------------------------------------

@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    voice_dir = VOICE_DIR / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    voice_dir.parent.mkdir(exist_ok=True)
    content = await file.read()
    with open(voice_dir, "wb") as f:
        f.write(content)

    transcript = await transcription.transcribe_audio(str(voice_dir))
    return {"transcript": transcript, "filename": str(voice_dir)}


# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------

@app.get("/api/targets/messier", response_model=list[TargetCatalogItem])
def get_messier_catalog(constellation: Optional[str] = None):
    with get_cursor() as cur:
        if constellation:
            cur.execute(
                "SELECT * FROM messier WHERE constellation LIKE ? ORDER BY catalog_id",
                (f"%{constellation}%",),
            )
        else:
            cur.execute("SELECT * FROM messier ORDER BY catalog_id")
        rows = cur.fetchall()
    return [_target_row_to_model(r) for r in rows]


@app.get("/api/targets/caldwell", response_model=list[TargetCatalogItem])
def get_caldwell_catalog(constellation: Optional[str] = None):
    with get_cursor() as cur:
        if constellation:
            cur.execute(
                "SELECT * FROM caldwell WHERE constellation LIKE ? ORDER BY catalog_id",
                (f"%{constellation}%",),
            )
        else:
            cur.execute("SELECT * FROM caldwell ORDER BY catalog_id")
        rows = cur.fetchall()
    return [_target_row_to_model(r) for r in rows]


@app.get("/api/targets/ngc", response_model=list[TargetCatalogItem])
def get_ngc_catalog(constellation: Optional[str] = None):
    with get_cursor() as cur:
        if constellation:
            cur.execute(
                "SELECT * FROM ngc_flags WHERE constellation LIKE ? ORDER BY catalog_id",
                (f"%{constellation}%",),
            )
        else:
            cur.execute("SELECT * FROM ngc_flags ORDER BY catalog_id")
        rows = cur.fetchall()
    return [_target_row_to_model(r) for r in rows]


@app.get("/api/targets/search")
def search_targets(q: str = Query(..., min_length=1)):
    """
    Search all three catalogs. Returns combined results.
    """
    pattern = f"%{q}%"
    results = []
    with get_cursor() as cur:
        # Messier: no common_name column
        cur.execute(
            "SELECT *, 'messier' as source FROM messier WHERE catalog_id LIKE ? OR name LIKE ? OR constellation LIKE ? LIMIT 20",
            (pattern, pattern, pattern),
        )
        for row in cur.fetchall():
            results.append(_target_row_to_model(row))

        # Caldwell: has common_name column
        cur.execute(
            "SELECT *, 'caldwell' as source FROM caldwell WHERE catalog_id LIKE ? OR name LIKE ? OR common_name LIKE ? OR constellation LIKE ? LIMIT 20",
            (pattern, pattern, pattern, pattern),
        )
        for row in cur.fetchall():
            results.append(_target_row_to_model(row))

        # NGC: no common_name column
        cur.execute(
            "SELECT *, 'ngc' as source FROM ngc_flags WHERE catalog_id LIKE ? OR name LIKE ? OR constellation LIKE ? LIMIT 20",
            (pattern, pattern, pattern),
        )
        for row in cur.fetchall():
            results.append(_target_row_to_model(row))

    return results


@app.get("/api/targets/all", response_model=list[TargetCatalogItem])
def get_all_targets():
    """All catalogs combined for the selector."""
    targets = []
    with get_cursor() as cur:
        for table, source in [("messier", "M"), ("caldwell", "C"), ("ngc_flags", "NGC")]:
            cur.execute(f"SELECT *, '{source}' as source_catalog FROM {table}")
            for row in cur.fetchall():
                targets.append(_target_row_to_model(row))
    return targets


@app.post("/api/targets/custom", response_model=TargetCatalogItem)
def add_custom_target(target: TargetCatalogItem):
    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO custom_targets (name, catalog_id, type, ra_hours, dec_deg, constellation, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (target.name, target.catalog_id, target.type, target.ra_hours,
             target.dec_deg, target.constellation, None),
        )
        target_id = cur.lastrowid
    return {**target.model_dump(), "id": target_id}


def _target_row_to_model(row: sqlite3.Row) -> TargetCatalogItem:
    d = dict_from_row(row)
    return TargetCatalogItem(
        catalog_id=d.get("catalog_id", ""),
        name=d.get("name"),
        common_name=d.get("common_name"),
        type=d.get("type"),
        ra_hours=d.get("ra_hours"),
        dec_deg=d.get("dec_deg"),
        constellation=d.get("constellation"),
        magnitude=d.get("magnitude"),
        size_arcmin=d.get("size_arcmin"),
        description=d.get("description"),
    )


# ---------------------------------------------------------------------------
# Astronomy
# ---------------------------------------------------------------------------

@app.get("/api/astronomy/moon", response_model=MoonResponse)
def get_moon(date: str = Query(default=str(date.today()))):
    try:
        d = datetime.strptime(date, "%Y-%m-%d").date()
    except Exception:
        d = date.today()
    moon = astronomy.get_moon_phase(d)
    return MoonResponse(date=date, **moon)


@app.get("/api/astronomy/tonight")
async def get_tonight_astronomy():
    """
    Get comprehensive astronomy data for tonight including:
    - Moon phase and illumination
    - Moon altitude during night hours
    - Sun rise/set times
    - Stargazing score based on weather + moon
    """
    from datetime import date
    today = date.today()
    
    # Get moon data
    moon = astronomy.get_moon_phase(today)
    
    # Get astronomy data from Open-Meteo
    astro_data = await weather.get_astronomy_data(today)
    
    # Get current weather
    current_weather = await weather.get_weather_for_date(today)
    
    # Calculate stargazing score
    moon_illum = moon.get("illumination", 0)
    moon_alt_night = astro_data.get("moon_altitude_night", 0) if astro_data else 0
    moon_phase_name = moon.get("phase_name")
    score_data = weather.calculate_stargazing_score(current_weather or {}, moon_illum, moon_alt_night, moon_phase_name)
    
    return {
        "date": today.isoformat(),
        "moon": moon,
        "astronomy": astro_data,
        "weather": current_weather,
        "stargazing_score": score_data,
    }


@app.get("/api/astronomy/visibility", response_model=VisibilityResponse)
def get_visibility(
    catalog_id: str = Query(..., description="e.g. M42 or NGC 224"),
    date: str = Query(default=str(date.today())),
):
    # Look up the target in catalogs
    with get_cursor() as cur:
        for table in ["messier", "caldwell", "ngc_flags"]:
            cur.execute(
                f"SELECT * FROM {table} WHERE catalog_id = ?",
                (catalog_id,),
            )
            row = cur.fetchone()
            if row:
                break
        else:
            cur.execute(
                "SELECT * FROM custom_targets WHERE catalog_id = ? OR name = ?",
                (catalog_id, catalog_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, f"Target '{catalog_id}' not found")

    d = dict_from_row(row)
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except Exception:
        target_date = date.today()

    vis = astronomy.get_target_visibility(
        ra_hours=d["ra_hours"],
        dec_deg=d["dec_deg"],
        target_date=target_date,
        target_name=d.get("name", ""),
        catalog_id=catalog_id,
    )
    return VisibilityResponse(**vis)


@app.get("/api/astronomy/best-tonight")
def get_best_targets_tonight(
    limit: int = Query(10, le=30),
    min_altitude: float = Query(20.0, description="Minimum altitude in degrees to be considered visible"),
    visible_only: bool = Query(True, description="Only return targets currently above horizon")
):
    """
    Returns the best DSO targets visible tonight from Aesch ZH.
    Filters to targets that are actually observable (above horizon, decent altitude).
    Uses parallel processing for faster calculations.
    """
    from datetime import date
    from concurrent.futures import ThreadPoolExecutor, as_completed
    today = date.today()
    
    with get_cursor() as cur:
        targets = []
        for table in ["messier", "caldwell", "ngc_flags"]:
            cur.execute(f"SELECT * FROM {table} WHERE ra_hours IS NOT NULL AND dec_deg IS NOT NULL")
            for row in cur.fetchall():
                targets.append(dict_from_row(row))

    def calc_visibility(t):
        """Calculate visibility for a single target."""
        if not t.get("ra_hours") or not t.get("dec_deg"):
            return None
            
        vis = astronomy.get_target_visibility(
            t["ra_hours"],
            t["dec_deg"],
            today,
            t.get("name", ""),
            t.get("catalog_id", ""),
        )
        
        # Only return if target meets minimum altitude
        if vis["max_altitude"] >= min_altitude:
            t["visibility"] = vis
            t["score"] = vis["max_altitude"] if vis["is_visible"] else vis["max_altitude"] * 0.5
            return t
        return None

    # Calculate visibility in parallel using thread pool
    visible_targets = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        # Submit all tasks
        future_to_target = {executor.submit(calc_visibility, t): t for t in targets}
        
        # Collect results as they complete
        for future in as_completed(future_to_target):
            result = future.result()
            if result:
                visible_targets.append(result)
                # Early exit if we have enough targets
                if len(visible_targets) >= limit * 2:  # Get 2x limit for better sorting
                    executor.shutdown(wait=False)
                    break

    # Sort by score (highest altitude = best)
    visible_targets.sort(key=lambda x: x["score"], reverse=True)
    return visible_targets[:limit]


# ---------------------------------------------------------------------------
# Weather
# ---------------------------------------------------------------------------

@app.get("/api/weather")
async def get_current_weather():
    return await weather.get_weather_for_date(date.today())


@app.get("/api/weather/forecast")
async def get_forecast():
    """
    Returns 7-day weather forecast with stargazing scores and moon data.
    """
    from datetime import date, timedelta
    
    forecast_data = await weather.get_7day_forecast()
    
    # Calculate stargazing score and add moon data for each day
    for day in forecast_data:
        day_date = date.fromisoformat(day["date"])
        
        # Get moon data for this day
        moon = astronomy.get_moon_phase(day_date)
        
        # Calculate score using weather + moon
        score_data = weather.calculate_stargazing_score(
            day, 
            moon.get("illumination", 0.5),
            moon_altitude_night=0,  # We don't calculate this for forecast
            moon_phase_name=moon.get("phase_name")
        )
        
        day["stargazing_score"] = score_data
        day["moon"] = moon
    
    return forecast_data


# ---------------------------------------------------------------------------
# Content generation (Instagram/blog captions)
# ---------------------------------------------------------------------------

@app.post("/api/generate/caption")
def generate_caption(
    target_name: str = Query(...),
    notes: str = Query(""),
    conditions: str = Query(""),
):
    """
    Generates an Instagram caption using the configured LLM.
    Uses MiniMax or Claude depending on what's available.
    """
    prompt = f"""Write a catchy Instagram caption for an astrophotography session.
Target: {target_name}
Observing notes: {notes}
Conditions: {conditions}

Requirements:
- Under 200 characters (Instagram limit)
- Include 3-5 relevant hashtags
- Make it sound authentic and exciting
- Include a fact about the target

Output ONLY the caption, nothing else."""

    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
        )
        return {"caption": resp.choices[0].message.content.strip()}
    except Exception as e:
        return {"caption": f"📸 {target_name} — {notes[:100]}. #Astrophotography #StellarLog", "error": str(e)}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
