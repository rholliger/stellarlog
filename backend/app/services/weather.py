"""
Weather service using OpenWeatherMap.
Free tier: 60 calls/min, 1,000,000 calls/month.
"""

from typing import Optional
import os
import httpx
from datetime import date

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
AESCH_LAT = 47.468
AESCH_LON = 8.066


async def get_weather_for_date(target_date: date) -> Optional[dict]:
    """
    Fetches current weather for Aesch ZH.
    Falls back to forecast if historical not available.
    """
    if not OPENWEATHER_API_KEY:
        return _mock_weather()

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": AESCH_LAT,
        "lon": AESCH_LON,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            return {
                "temperature": round(data["main"]["temp"], 1),
                "feels_like": round(data["main"]["feels_like"], 1),
                "description": data["weather"][0]["description"],
                "cloud_cover": data["clouds"]["all"],
                "humidity": data["main"]["humidity"],
                "wind_speed": round(data["wind"]["speed"] * 3.6, 1),  # m/s → km/h
                "wind_deg": data["wind"].get("deg", 0),
                "icon": data["weather"][0]["icon"],
                "source": "openweathermap",
            }
        except Exception:
            return _mock_weather()


async def get_7day_forecast() -> list[dict]:
    """
    Returns 7-day weather forecast for Aesch ZH.
    OpenWeatherMap 5-day/3-hour forecast — extract one entry per day.
    """
    if not OPENWEATHER_API_KEY:
        return _mock_forecast()

    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "lat": AESCH_LAT,
        "lon": AESCH_LON,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            # Group by date, pick the midday entry (12:00) as the day representative
            daily = {}
            today = date.today()
            for entry in data.get("list", []):
                parts = entry["dt_txt"].split(" ")
                day_str = parts[0]
                day_date = datetime.strptime(day_str, "%Y-%m-%d").date()

                # Only include today and future days
                if day_date < today:
                    continue

                # Prefer 12:00 entry, but take first available if not present
                time_str = parts[1]
                is_noon = time_str == "12:00:00"
                is_today = day_date == today

                if day_str not in daily or (is_noon and day_str in daily):
                    daily[day_str] = {
                        "date": day_str,
                        "temp_min": entry["main"]["temp_min"],
                        "temp_max": entry["main"]["temp_max"],
                        "description": entry["weather"][0]["description"],
                        "cloud_cover": entry["clouds"]["all"],
                        "wind_speed": round(entry["wind"]["speed"] * 3.6, 1),
                        "humidity": entry["main"]["humidity"],
                        "icon": entry["weather"][0]["icon"],
                        "dew_point": entry["main"].get("dew_point"),
                    }

            # Sort by date and return max 7 days starting from today
            result = sorted(daily.values(), key=lambda x: x["date"])[:7]
            return result
        except Exception:
            return _mock_forecast()


def is_good_night_for_stargazing(weather: dict) -> dict:
    """
    Score a night 1-10 for stargazing based on weather.
    """
    score = 10
    reasons = []

    cloud_cover = weather.get("cloud_cover", 100)
    if cloud_cover < 20:
        score += 2
        reasons.append("Clear skies")
    elif cloud_cover < 50:
        score += 0
        reasons.append("Patchy clouds")
    else:
        score -= 5
        reasons.append("Cloudy")

    wind = weather.get("wind_speed", 0)
    if wind > 30:
        score -= 2
        reasons.append("Windy")
    elif wind < 15:
        reasons.append("Calm")

    humidity = weather.get("humidity", 50)
    if humidity > 85:
        score -= 1
        reasons.append("High humidity")

    moon_illum = weather.get("moon_illumination", 0.5)
    if moon_illum < 0.25:
        reasons.append("Dark moon")
    elif moon_illum > 0.75:
        reasons.append("Bright moon")

    return {
        "score": max(0, min(10, score)),
        "reasons": reasons,
        "verdict": "Excellent" if score >= 9 else "Good" if score >= 7 else "Fair" if score >= 5 else "Poor",
    }


def _mock_weather() -> dict:
    return {
        "temperature": 12.0,
        "feels_like": 11.0,
        "description": "partly cloudy",
        "cloud_cover": 30,
        "humidity": 65,
        "wind_speed": 8.0,
        "wind_deg": 180,
        "icon": "02d",
        "source": "mock",
    }


def _mock_forecast() -> list[dict]:
    return [
        {"date": "2026-03-29", "temp_min": 4, "temp_max": 14, "description": "clear sky", "cloud_cover": 10, "wind_speed": 5.0, "icon": "01d"},
        {"date": "2026-03-30", "temp_min": 5, "temp_max": 15, "description": "few clouds", "cloud_cover": 20, "wind_speed": 7.0, "icon": "02d"},
        {"date": "2026-03-31", "temp_min": 7, "temp_max": 16, "description": "light rain", "cloud_cover": 80, "wind_speed": 15.0, "icon": "10d"},
    ]
