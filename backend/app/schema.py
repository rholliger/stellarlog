from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Database schema (using Drizzle + SQLite)
# ---------------------------------------------------------------------------

# Observations table: one row per observation session
OBSERVATIONS = """
CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    target_name TEXT NOT NULL,
    target_catalog_id TEXT,          -- e.g. 'M42', 'NGC 224', 'Caldwell 1'
    notes_text TEXT,
    notes_voice_path TEXT,
    weather_json TEXT,               -- JSON blob from OpenWeatherMap
    moon_phase REAL,                -- illumination fraction (0.0 - 1.0)
    moon_phase_name TEXT,           -- 'New Moon', 'Waxing Crescent', etc.
    seeing_rating INTEGER CHECK(seeing_rating BETWEEN 1 AND 5),
    location TEXT DEFAULT 'Aesch ZH',
    gear TEXT,                       -- free-text gear notes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

# Photos attached to an observation
PHOTOS = """
CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    observation_id INTEGER NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT,
    caption TEXT,
    file_size INTEGER,
    mime_type TEXT,
    exif_json TEXT,                  -- extracted EXIF as JSON
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

# Messier catalog (110 objects)
MESSIER = """
CREATE TABLE IF NOT EXISTS messier (
    id INTEGER PRIMARY KEY,
    catalog_id TEXT UNIQUE NOT NULL,  -- 'M1', 'M42', etc.
    name TEXT,
    type TEXT,                        -- 'Galaxy', 'Nebula', 'Cluster', etc.
    ra_hours REAL,                   -- Right Ascension in hours (0-24)
    dec_deg REAL,                    -- Declination in degrees (-90 to +90)
    constellation TEXT,
    magnitude REAL,
    surface_brightness REAL,
    size_arcmin REAL,
    description TEXT
);
"""

# Caldwell catalog (109 objects)
CALDWELL = """
CREATE TABLE IF NOT EXISTS caldwell (
    id INTEGER PRIMARY KEY,
    catalog_id TEXT UNIQUE NOT NULL,  -- 'C1', 'C43', etc.
    name TEXT,
    common_name TEXT,
    type TEXT,
    ra_hours REAL,
    dec_deg REAL,
    constellation TEXT,
    magnitude REAL,
    description TEXT
);
"""

# NGC flagship subset (~300 notable objects)
NGC_FLAGS = """
CREATE TABLE IF NOT EXISTS ngc_flags (
    id INTEGER PRIMARY KEY,
    catalog_id TEXT UNIQUE NOT NULL,  -- 'NGC 224', 'NGC 7000', etc.
    name TEXT,
    type TEXT,
    ra_hours REAL,
    dec_deg REAL,
    constellation TEXT,
    magnitude REAL,
    size_arcmin REAL,
    description TEXT
);
"""

# Custom user-added targets
CUSTOM_TARGETS = """
CREATE TABLE IF NOT EXISTS custom_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    catalog_id TEXT,
    type TEXT,
    ra_hours REAL,
    dec_deg REAL,
    constellation TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

# Sky checks: quick daily visibility logging
SKY_CHECKS = """
CREATE TABLE IF NOT EXISTS sky_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location TEXT DEFAULT 'Aesch ZH',
    cloud_cover INTEGER CHECK(cloud_cover >= 0 AND cloud_cover <= 100),
    transparency INTEGER CHECK(transparency >= 1 AND transparency <= 5),
    seeing INTEGER CHECK(seeing >= 1 AND seeing <= 5),
    temperature REAL,
    humidity INTEGER CHECK(humidity >= 0 AND humidity <= 100),
    wind_speed REAL,
    moon_phase TEXT,
    moon_visible INTEGER CHECK(moon_visible IN (0, 1)),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

ALL_TABLES = [
    OBSERVATIONS,
    PHOTOS,
    MESSIER,
    CALDWELL,
    NGC_FLAGS,
    CUSTOM_TARGETS,
    SKY_CHECKS,
]


# ---------------------------------------------------------------------------
# Pydantic models (API request/response)
# ---------------------------------------------------------------------------

class ObservationBase(BaseModel):
    date: str
    time: str
    target_name: str
    target_catalog_id: Optional[str] = None
    notes_text: Optional[str] = None
    seeing_rating: Optional[int] = Field(None, ge=1, le=5)
    location: str = "Aesch ZH"
    gear: Optional[str] = None


class ObservationCreate(ObservationBase):
    pass


class ObservationUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    target_name: Optional[str] = None
    target_catalog_id: Optional[str] = None
    notes_text: Optional[str] = None
    seeing_rating: Optional[int] = Field(None, ge=1, le=5)
    location: Optional[str] = None
    gear: Optional[str] = None


class WeatherData(BaseModel):
    temperature: float
    description: str
    cloud_cover: int        # percentage
    humidity: int           # percentage
    wind_speed: float       # km/h
    icon: str


class PhotoResponse(BaseModel):
    id: int
    observation_id: int
    filename: str
    original_name: Optional[str]
    caption: Optional[str]
    file_size: Optional[int]
    mime_type: Optional[str]
    url: str                # URL to access the photo

    class Config:
        from_attributes = True


class ObservationResponse(ObservationBase):
    id: int
    moon_phase: Optional[float]
    moon_phase_name: Optional[str]
    weather_json: Optional[str]
    photos: list[PhotoResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TargetCatalogItem(BaseModel):
    catalog_id: str
    name: Optional[str]
    common_name: Optional[str] = None
    type: Optional[str]
    ra_hours: Optional[float]
    dec_deg: Optional[float]
    constellation: Optional[str]
    magnitude: Optional[float]
    size_arcmin: Optional[float]
    description: Optional[str]


class MoonResponse(BaseModel):
    date: str
    illumination: float       # 0.0 - 1.0
    phase_name: str          # 'New Moon', 'Waxing Crescent', etc.
    phase_angle_deg: Optional[float] = None
    rise: Optional[str] = None     # HH:MM
    set: Optional[str] = None       # HH:MM


class VisibilityResponse(BaseModel):
    target_name: str
    catalog_id: Optional[str]
    date: str
    constellation: Optional[str]
    altitude: float          # degrees above horizon
    azimuth: float           # degrees (0=N, 90=E, etc.)
    rise_time: Optional[str]
    set_time: Optional[str]
    transit_time: Optional[str]  # when it's highest
    transit_altitude: float
    is_visible: bool
    best_window: Optional[str]  # e.g. "22:30 - 03:45"


# ---------------------------------------------------------------------------
# Sky Check models
# ---------------------------------------------------------------------------

class SkyCheckBase(BaseModel):
    date: str
    time: str
    location: str = "Aesch ZH"
    cloud_cover: Optional[int] = Field(None, ge=0, le=100)
    transparency: Optional[int] = Field(None, ge=1, le=5)
    seeing: Optional[int] = Field(None, ge=1, le=5)
    temperature: Optional[float] = None
    humidity: Optional[int] = Field(None, ge=0, le=100)
    wind_speed: Optional[float] = None
    moon_phase: Optional[str] = None
    moon_visible: Optional[bool] = None
    notes: Optional[str] = None


class SkyCheckCreate(SkyCheckBase):
    pass


class SkyCheckUpdate(BaseModel):
    cloud_cover: Optional[int] = Field(None, ge=0, le=100)
    transparency: Optional[int] = Field(None, ge=1, le=5)
    seeing: Optional[int] = Field(None, ge=1, le=5)
    temperature: Optional[float] = None
    humidity: Optional[int] = Field(None, ge=0, le=100)
    wind_speed: Optional[float] = None
    moon_visible: Optional[bool] = None
    notes: Optional[str] = None


class SkyCheckResponse(SkyCheckBase):
    id: int
    moon_visible: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True
