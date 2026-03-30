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
        "forecast_days": 7,
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
    Fetches astronomy-specific data from Open-Meteo.
    Includes sun/moon rise/set, moon phase, moon altitude.
    """
    url = "https://api.open-meteo.com/v1/astronomy"
    params = {
        "latitude": AESCH_LAT,
        "longitude": AESCH_LON,
        "date": target_date.isoformat(),
        "timezone": "Europe/Zurich",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            # Get hourly moon altitude to determine if moon is up during night
            hourly_url = "https://api.open-meteo.com/v1/forecast"
            hourly_params = {
                "latitude": AESCH_LAT,
                "longitude": AESCH_LON,
                "hourly": ["moon_altitude", "moon_illumination"],
                "timezone": "Europe/Zurich",
                "start_date": target_date.isoformat(),
                "end_date": target_date.isoformat(),
            }
            hourly_resp = await client.get(hourly_url, params=hourly_params)
            hourly_resp.raise_for_status()
            hourly_data = hourly_resp.json()
            
            hourly = hourly_data.get("hourly", {})
            moon_altitudes = hourly.get("moon_altitude", [])
            moon_illuminations = hourly.get("moon_illumination", [])
            
            # Calculate average moon altitude during astronomical night (sun < -12°)
            # For simplicity, use 22:00-02:00 as proxy for darkest hours
            night_hours = [22, 23, 0, 1, 2]
            night_altitudes = []
            for h in night_hours:
                idx = h if h >= 22 else h + 24  # Handle midnight wrap
                if idx < len(moon_altitudes):
                    night_altitudes.append(moon_altitudes[idx if h >= 22 else h])
            
            avg_moon_alt = sum(night_altitudes) / len(night_altitudes) if night_altitudes else 0
            
            return {
                "sunrise": data.get("sunrise", ""),
                "sunset": data.get("sunset", ""),
                "moonrise": data.get("moonrise", ""),
                "moonset": data.get("moonset", ""),
                "moon_phase": data.get("moon_phase", 0),
                "moon_illumination": moon_illuminations[12] if len(moon_illuminations) > 12 else 0,  # Noon value
                "moon_altitude_night": avg_moon_alt,
            }
        except Exception as e:
            print(f"Astronomy fetch error: {e}")
            return None


def calculate_stargazing_score(weather: dict, moon_illumination: float, moon_altitude_night: float = 0) -> dict:
    """
    Calculate a comprehensive stargazing score (0-10) based on:
    - Cloud cover
    - Wind speed
    - Humidity (transparency)
    - Moon illumination
    - Moon altitude during night hours
    """
    score = 10
    reasons = []

    # Cloud cover (major factor)
    cloud_cover = weather.get("cloud_cover", 100)
    if cloud_cover < 10:
        score += 3
        reasons.append("Crystal clear")
    elif cloud_cover < 25:
        score += 2
        reasons.append("Clear skies")
    elif cloud_cover < 50:
        score += 0
        reasons.append("Patchy clouds")
    elif cloud_cover < 75:
        score -= 3
        reasons.append("Mostly cloudy")
    else:
        score -= 6
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
        # Moon is up - apply illumination penalty
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

    # Clamp score
    score = max(0, min(10, score))
    
    return {
        "score": score,
        "stars": max(1, min(5, round(score / 2))),
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
