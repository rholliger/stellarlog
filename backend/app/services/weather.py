"""
Weather service using Open-Meteo API.
Free, no API key required, astronomy-specific data available.
https://open-meteo.com/
"""

from typing import Optional
import httpx
from datetime import date, datetime, timedelta

AESCH_LAT = 47.468
AESCH_LON = 8.066


async def get_weather_for_date(target_date: date) -> Optional[dict]:
    """
    Fetches current weather for Aesch ZH using Open-Meteo.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": AESCH_LAT,
        "longitude": AESCH_LON,
        "current": ["temperature_2m", "relative_humidity_2m", "cloud_cover", "wind_speed_10m", "dew_point_2m"],
        "timezone": "Europe/Zurich",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            current = data.get("current", {})
            
            return {
                "temperature": current.get("temperature_2m", 0),
                "feels_like": current.get("temperature_2m", 0),  # Open-Meteo doesn't have feels_like
                "description": _cloud_cover_to_description(current.get("cloud_cover", 0)),
                "cloud_cover": current.get("cloud_cover", 0),
                "humidity": current.get("relative_humidity_2m", 0),
                "wind_speed": current.get("wind_speed_10m", 0),
                "wind_deg": 0,  # Not in basic current endpoint
                "dew_point": current.get("dew_point_2m"),
                "icon": _cloud_cover_to_icon(current.get("cloud_cover", 0)),
                "source": "open-meteo",
            }
        except Exception as e:
            print(f"Weather fetch error: {e}")
            return _mock_weather()


async def get_7day_forecast() -> list[dict]:
    """
    Returns 7-day weather forecast for Aesch ZH using Open-Meteo.
    Includes daily min/max, cloud cover, humidity, wind, dew point.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": AESCH_LAT,
        "longitude": AESCH_LON,
        "daily": ["temperature_2m_min", "temperature_2m_max", "cloud_cover_mean", 
                  "wind_speed_10m_max", "relative_humidity_2m_mean", "dew_point_2m_mean"],
        "timezone": "Europe/Zurich",
        "forecast_days": 8,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            daily = data.get("daily", {})
            dates = daily.get("time", [])
            temp_mins = daily.get("temperature_2m_min", [])
            temp_maxs = daily.get("temperature_2m_max", [])
            cloud_covers = daily.get("cloud_cover_mean", [])
            wind_speeds = daily.get("wind_speed_10m_max", [])
            humidities = daily.get("relative_humidity_2m_mean", [])
            dew_points = daily.get("dew_point_2m_mean", [])
            
            today = date.today()
            result = []
            
            for i, day_str in enumerate(dates):
                day_date = datetime.strptime(day_str, "%Y-%m-%d").date()
                
                # Skip past dates
                if day_date < today:
                    continue
                
                result.append({
                    "date": day_str,
                    "temp_min": round(temp_mins[i], 1) if i < len(temp_mins) else 0,
                    "temp_max": round(temp_maxs[i], 1) if i < len(temp_maxs) else 0,
                    "description": _cloud_cover_to_description(cloud_covers[i] if i < len(cloud_covers) else 0),
                    "cloud_cover": round(cloud_covers[i]) if i < len(cloud_covers) else 0,
                    "wind_speed": round(wind_speeds[i], 1) if i < len(wind_speeds) else 0,
                    "humidity": round(humidities[i]) if i < len(humidities) else 0,
                    "dew_point": round(dew_points[i], 1) if i < len(dew_points) and dew_points[i] is not None else None,
                    "icon": _cloud_cover_to_icon(cloud_covers[i] if i < len(cloud_covers) else 0),
                })
            
            return result[:7]
        except Exception as e:
            print(f"Forecast fetch error: {e}")
            return _mock_forecast()


async def get_astronomy_data(target_date: date) -> Optional[dict]:
    """
    Calculates sun/moon rise/set and moon altitude using Skyfield.
    """
    try:
        from skyfield.api import wgs84
        from skyfield import almanac
        
        topos = wgs84.latlon(AESCH_LAT, AESCH_LON, elevation_m=AESCH_ELEV)
        observer = earth + topos
        
        # Time range for the date
        dt_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=UTC)
        t0 = ts.from_datetime(dt_start)
        t1 = ts.from_datetime(dt_start + timedelta(days=1))
        
        # Find sun rise/set
        sun_times, sun_events = almanac.find_discrete(t0, t1, almanac.sunrise_sunset(planets, topos))
        
        sun_rise = None
        sun_set = None
        for t, e in zip(sun_times, sun_events):
            if e == 1:  # Sunrise
                sun_rise = t.utc_datetime()
            else:  # Sunset
                sun_set = t.utc_datetime()
        
        # Find moon rise/set
        moon_times, moon_events = almanac.find_discrete(t0, t1, almanac.moonrise_moonset(planets, topos))
        
        moon_rise = None
        moon_set = None
        for t, e in zip(moon_times, moon_events):
            if e == 1:  # Moonrise
                moon_rise = t.utc_datetime()
            else:  # Moonset
                moon_set = t.utc_datetime()
        
        # Calculate average moon altitude during night hours (22:00-02:00)
        night_altitudes = []
        for hour in [22, 23, 0, 1, 2]:
            dt = datetime(target_date.year, target_date.month, target_date.day, hour, 0, 0, tzinfo=UTC)
            if hour < 22:
                dt = dt + timedelta(days=1)
            t = ts.from_datetime(dt)
            
            astrometric = observer.at(t).observe(moon)
            alt, _, _ = astrometric.apparent().altaz()
            night_altitudes.append(alt.degrees)
        
        avg_moon_alt = sum(night_altitudes) / len(night_altitudes) if night_altitudes else 0
        
        def format_dt(dt):
            if dt is None:
                return None
            return f"{dt.hour:02d}:{dt.minute:02d}"
        
        return {
            "sun_rise": format_dt(sun_rise),
            "sun_set": format_dt(sun_set),
            "moon_rise": format_dt(moon_rise),
            "moon_set": format_dt(moon_set),
            "moon_altitude_night": avg_moon_alt,
        }
    except Exception as e:
        print(f"Astronomy calculation error: {e}")
        return None


def calculate_stargazing_score(weather: dict, moon_illumination: float, moon_altitude_night: float = 0, moon_phase_name: str = None) -> dict:
    """
    Calculate a comprehensive stargazing score (0-10) based on:
    - Cloud cover (hard gate - caps max score)
    - Wind speed
    - Humidity (transparency)
    - Moon illumination
    - Moon altitude during night hours
    - Moon phase name (for accurate description)
    """
    score = 10
    reasons = []

    # Cloud cover - HARD GATE: caps the maximum possible score
    cloud_cover = weather.get("cloud_cover", 100)
    cloud_max_score = 10  # Default max
    
    if cloud_cover < 10:
        score += 3
        cloud_max_score = 10
        reasons.append("Crystal clear")
    elif cloud_cover < 25:
        score += 2
        cloud_max_score = 10
        reasons.append("Clear skies")
    elif cloud_cover < 50:
        score += 0
        cloud_max_score = 8
        reasons.append("Patchy clouds")
    elif cloud_cover < 75:
        score -= 3
        cloud_max_score = 5
        reasons.append("Mostly cloudy")
    else:
        score -= 6
        cloud_max_score = 3
        reasons.append("Overcast")

    # Wind (stability of atmosphere)
    wind = weather.get("wind_speed", 0)
    if wind > 40:
        score -= 3
        reasons.append("Very windy")
    elif wind > 25:
        score -= 1
        reasons.append("Breezy")
    elif wind < 10:
        score += 1
        reasons.append("Calm")

    # Humidity (atmospheric transparency)
    humidity = weather.get("humidity", 50)
    if humidity > 90:
        score -= 2
        reasons.append("Poor transparency")
    elif humidity > 75:
        score -= 1
        reasons.append("Hazy")
    elif humidity < 40:
        score += 1
        reasons.append("Excellent transparency")

    # Moon factor (weighted by altitude)
    # If moon is below horizon during night, no penalty regardless of phase
    if moon_altitude_night < 0:
        reasons.append("Moon below horizon")
    else:
        # Moon is up - use phase name if available, otherwise fall back to illumination
        if moon_phase_name:
            # Use the actual phase name from astronomy service with emoji
            phase_lower = moon_phase_name.lower()
            phase_emoji = {
                'new': '🌑',
                'crescent': '🌒',
                'quarter': '🌓',
                'gibbous': '🌔',
                'full': '🌕',
            }
            # Find matching emoji
            emoji = ''
            for key, em in phase_emoji.items():
                if key in phase_lower:
                    emoji = em
                    break
            
            if 'new' in phase_lower:
                score += 2
                reasons.append(f"{emoji} New moon" if emoji else "New moon")
            elif 'crescent' in phase_lower:
                score += 1
                reasons.append(f"{emoji} {moon_phase_name}" if emoji else moon_phase_name)
            elif 'quarter' in phase_lower:
                score += 0
                reasons.append(f"{emoji} {moon_phase_name}" if emoji else moon_phase_name)
            elif 'gibbous' in phase_lower:
                score -= 1
                reasons.append(f"{emoji} {moon_phase_name}" if emoji else moon_phase_name)
            elif 'full' in phase_lower:
                score -= 3
                reasons.append(f"{emoji} Full moon" if emoji else "Full moon")
            else:
                reasons.append(moon_phase_name)
        else:
            # Fall back to illumination-based scoring
            if moon_illumination < 0.1:
                score += 2
                reasons.append("New moon")
            elif moon_illumination < 0.25:
                score += 1
                reasons.append("Dark moon")
            elif moon_illumination < 0.5:
                score -= 1
                reasons.append("Moderate moon")
            elif moon_illumination < 0.75:
                score -= 2
                reasons.append("Bright moon")
            else:
                score -= 3
                reasons.append("Full moon")

    # Clamp score and apply cloud cover hard gate
    score = max(0, min(cloud_max_score, score))
    
    # Calculate stars to match verdicts exactly
    if score >= 9:
        stars = 5  # Excellent
    elif score >= 7:
        stars = 4  # Good
    elif score >= 5:
        stars = 3  # Fair
    elif score >= 3:
        stars = 2  # Poor
    else:
        stars = 1  # Very Poor
    
    return {
        "score": score,
        "stars": stars,
        "reasons": reasons,
        "verdict": "Excellent" if score >= 9 else "Good" if score >= 7 else "Fair" if score >= 5 else "Poor" if score >= 3 else "Very Poor",
        "color": "text-green-400" if score >= 7 else "text-yellow-400" if score >= 5 else "text-orange-400" if score >= 3 else "text-red-400",
    }


def _cloud_cover_to_description(cloud_cover: float) -> str:
    """Convert cloud cover percentage to description."""
    if cloud_cover < 10:
        return "clear sky"
    elif cloud_cover < 25:
        return "mostly clear"
    elif cloud_cover < 50:
        return "partly cloudy"
    elif cloud_cover < 75:
        return "mostly cloudy"
    else:
        return "overcast"


def _cloud_cover_to_icon(cloud_cover: float) -> str:
    """Convert cloud cover to icon code (OpenWeatherMap style)."""
    if cloud_cover < 10:
        return "01d"
    elif cloud_cover < 25:
        return "02d"
    elif cloud_cover < 50:
        return "03d"
    elif cloud_cover < 75:
        return "04d"
    else:
        return "09d"


def _mock_weather() -> dict:
    return {
        "temperature": 12.0,
        "feels_like": 11.0,
        "description": "partly cloudy",
        "cloud_cover": 30,
        "humidity": 65,
        "wind_speed": 8.0,
        "wind_deg": 180,
        "dew_point": 8.0,
        "icon": "03d",
        "source": "mock",
    }


def _mock_forecast() -> list[dict]:
    today = date.today()
    return [
        {"date": (today + timedelta(days=i)).isoformat(), "temp_min": 5, "temp_max": 15, "description": "clear sky", "cloud_cover": 10, "wind_speed": 5.0, "humidity": 60, "dew_point": 4.0, "icon": "01d"}
        for i in range(7)
    ]
