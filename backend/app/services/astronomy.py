"""
Astronomy service: moon phase, DSO visibility from Aesch ZH.
Location: Aesch ZH — lat=47.468°N, lon=8.066°E, elevation=432m
Uses skyfield for position calculations.
"""

from datetime import datetime, date, time as dt_time
from skyfield import api, almanac
from skyfield.api import Topos, Timescale
import math

# Aesch ZH coordinates
LAT = 47.468
LON = 8.066
ELEVATION_M = 432

# Load ephemeris — downloads and caches to ~/.skyfield/
# Using JPL NAIF server directly (most reliable source)
TS = api.load("https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de421.bsp")


def get_moon_phase(target_date: date) -> dict:
    """
    Returns moon illumination and phase name for a given date.
    """
    # Use pyephem-style calculation via skyfield
    try:
        from skyfield import almanac
    except ImportError:
        return _moon_phase_fallback(target_date)

    t = TS.utc(target_date.year, target_date.month, target_date.day, 12, 0, 0)
    sun = TS["sun"]
    moon = TS["moon"]
    earth = TS["earth"]

    # Get apparent positions
    astrometric = (earth + Topos(LAT, LON, elevation_m=ELEVATION_M)).at(t)
    sun_app = sun.at(t).observe(earth).apparent()
    moon_app = moon.at(t).observe(earth).apparent()

    # Phase angle (simplified)
    phase_angle = almanac.phase_angle(TS, t, body="moon")
    illumination = almanac.fraction_illuminated(TS, t, "sun", "moon")

    # Map phase angle to phase name
    pa_deg = math.degrees(phase_angle)
    if illumination < 0.02:
        phase_name = "New Moon"
    elif illumination < 0.25:
        phase_name = "Waxing Crescent"
    elif illumination < 0.45:
        phase_name = "First Quarter"
    elif illumination < 0.55:
        phase_name = "Waxing Gibbous"
    elif illumination < 0.75:
        phase_name = "Full Moon"
    elif illumination < 0.92:
        phase_name = "Waning Gibbous"
    elif illumination < 0.98:
        phase_name = "Last Quarter"
    else:
        phase_name = "Waning Crescent"

    return {
        "illumination": round(float(illumination), 3),
        "phase_name": phase_name,
        "phase_angle_deg": round(pa_deg, 1),
    }


def _moon_phase_fallback(target_date: date) -> dict:
    """
    Fallback using simplified synodic month calculation.
    Accurate to ~1 day in phase name.
    """
    # Days since known new moon (Jan 6 2000)
    known_new = date(2000, 1, 6)
    days = (target_date - known_new).days
    synodic_month = 29.53059
    phase = (days % synodic_month) / synodic_month
    illumination = abs(1 - abs(phase * 2 - 1))

    if illumination < 0.02:
        phase_name = "New Moon"
    elif illumination < 0.25:
        phase_name = "Waxing Crescent"
    elif illumination < 0.45:
        phase_name = "First Quarter"
    elif illumination < 0.55:
        phase_name = "Waxing Gibbous"
    elif illumination < 0.75:
        phase_name = "Full Moon"
    elif illumination < 0.92:
        phase_name = "Waning Gibbous"
    elif illumination < 0.98:
        phase_name = "Last Quarter"
    else:
        phase_name = "Waning Crescent"

    return {
        "illumination": round(illumination, 3),
        "phase_name": phase_name,
        "phase_angle_deg": round(phase * 360, 1),
    }


def get_target_visibility(
    target_ra_hours: float,
    target_dec_deg: float,
    target_date: date,
    target_name: str = "",
    catalog_id: str = "",
) -> dict:
    """
    Calculate altitude, azimuth, rise/set times for a target from Aesch ZH.
    """
    # Build timescale for the target date (start at midnight)
    year, month, day = target_date.year, target_date.month, target_date.day

    # Create time array for the full day (every 5 minutes)
    times = TS.utc(year, month, day, list(range(24)), [0] * 24, [0.0] * 24)
    observer = TS["earth"] + Topos(LAT, LON, elevation_m=ELEVATION_M)

    # Calculate positions throughout the day
    true_pos = observer.at(times).observe(TS["moon"]).apparent()
    alt, az, _ = true_pos.altaz()

    # Find max altitude and when it occurs
    alt_values = alt.degrees
    max_alt = max(alt_values)
    max_idx = alt_values.index(max_alt)
    max_time = times[max_idx]

    # Rise and set using skyfield search
    # Simplified: find when alt goes above/below 0 (local horizon)
    above_horizon = [a > 0 for a in alt_values]
    is_visible = any(above_horizon)

    # Find first rise and last set
    rise_str, set_str = None, None
    for i, above in enumerate(above_horizon):
        if above and i > 0 and not above_horizon[i - 1]:
            h, m = i, 0
            rise_str = f"{h:02d}:{m:02d}"
        if not above and i > 0 and above_horizon[i - 1]:
            h, m = i, 0
            set_str = f"{h:02d}:{m:02d}"

    # Transit (highest point)
    transit_h = int(str(max_time).split(" ")[1].split("h")[0]) if "h" in str(max_time) else max_idx
    transit_m = 0
    transit_alt = round(max_alt, 1)

    # Best observation window: when altitude > 30°
    good_alt_times = [i for i, a in enumerate(alt_values) if a > 30]
    if good_alt_times:
        start_h = good_alt_times[0]
        end_h = good_alt_times[-1]
        best_window = f"{start_h:02d}:00 - {end_h:02d}:00"
    else:
        best_window = None

    return {
        "target_name": target_name,
        "catalog_id": catalog_id,
        "date": str(target_date),
        "altitude": round(alt_values[12], 1),  # altitude at noon as reference
        "max_altitude": round(max_alt, 1),
        "transit_time": f"{transit_h:02d}:{transit_m:02d}",
        "transit_altitude": transit_alt,
        "rise_time": rise_str,
        "set_time": set_str,
        "is_visible": is_visible,
        "best_window": best_window,
        "constellation": _ra_dec_to_constellation(target_ra_hours, target_dec_deg),
    }


def _ra_dec_to_constellation(ra_hours: float, dec_deg: float) -> str:
    """
    Rough constellation estimate based on RA/Dec.
    """
    # Simple lookup table for major constellations
    constellations = [
        ("Orion", 5.5, -1),
        ("Taurus", 4.7, 19),
        ("Gemini", 7.1, 25),
        ("Canis Major", 6.8, -17),
        ("Scorpius", 17.4, -30),
        ("Sagittarius", 19.0, -25),
        ("Leo", 10.5, 13),
        ("Virgo", 12.5, 1),
        (" Andromeda", 1.0, 41),
        ("Cassiopeia", 1.0, 60),
        ("Cygnus", 20.5, 41),
        ("Perseus", 3.5, 48),
        ("Auriga", 6.0, 46),
        ("Lyra", 18.9, 36),
        ("Ursa Major", 11.0, 55),
    ]

    best_match = "Unknown"
    min_dist = 999
    for name, ra, dec in constellations:
        dist = abs(ra_hours - ra) * 15 + abs(dec_deg - dec)
        if dist < min_dist:
            min_dist = dist
            best_match = name

    return best_match


def get_best_targets_this_week(targets: list[dict]) -> list[dict]:
    """
    Given a list of target dicts with ra_hours and dec_deg, return them
    sorted by visibility quality for tonight.
    """
    today = date.today()
    scored = []
    for t in targets:
        vis = get_target_visibility(
            t.get("ra_hours", 0),
            t.get("dec_deg", 0),
            today,
            t.get("name", ""),
            t.get("catalog_id", ""),
        )
        score = vis["max_altitude"] if vis["is_visible"] else -999
        scored.append({**t, "visibility": vis, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored
