"""
Astronomy service using ephem (no external downloads needed).
All planetary/lunar data is built into the library.
Location: Aesch ZH — lat=47.468°N, lon=8.066°E
"""

import ephem
import math
from datetime import date, datetime, timedelta

# Observer for Aesch ZH
OBSERVER_LAT = "47.468"
OBSERVER_LON = "8.066"
OBSERVER_ELEV = 432  # meters


def _observer_for(dt: datetime) -> ephem.Observer:
    o = ephem.Observer()
    o.lat = OBSERVER_LAT
    o.lon = OBSERVER_LON
    o.elevation = OBSERVER_ELEV
    o.date = dt
    o.pressure = 0  # disable refraction correction
    return o


def get_moon_phase(target_date: date) -> dict:
    """
    Returns moon illumination and phase name for a given date.
    Uses ephem's built-in phase calculation.
    """
    dt = datetime(target_date.year, target_date.month, target_date.day, 21, 0, 0)
    o = _observer_for(dt)
    moon = ephem.Moon(o)
    
    # Get illumination percentage (0-100)
    illumination_pct = moon.phase
    illumination = illumination_pct / 100.0
    
    # Get the next new moon and full moon to determine phase
    # This is more reliable than elongation for phase naming
    next_new = ephem.next_new_moon(o.date)
    next_full = ephem.next_full_moon(o.date)
    prev_new = ephem.previous_new_moon(o.date)
    prev_full = ephem.previous_full_moon(o.date)
    
    # Calculate days since last new moon and full moon
    days_since_new = o.date - prev_new
    days_since_full = o.date - prev_full
    days_to_new = next_new - o.date
    days_to_full = next_full - o.date
    
    # Determine phase based on proximity to new/full moon and illumination
    if days_since_new < 1 or days_to_new < 1:
        phase_name = "New Moon"
    elif days_since_new < 3.5:
        phase_name = "Waxing Crescent"
    elif days_since_new < 4.5:
        phase_name = "First Quarter"
    elif days_to_full > 3.5:
        phase_name = "Waxing Gibbous"
    elif days_to_full < 1.5 or days_since_full < 1.5:
        phase_name = "Full Moon"
    elif days_since_full < 4.5:
        phase_name = "Waning Gibbous"
    elif days_since_full < 5.5:
        phase_name = "Last Quarter"
    else:
        phase_name = "Waning Crescent"

    return {
        "illumination": round(illumination, 3),
        "phase_name": phase_name,
        "days_since_new": round(days_since_new, 1),
        "days_to_full": round(days_to_full, 1),
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
    Uses ephem's built-in star/planet positioning.
    """
    dt = datetime(target_date.year, target_date.month, target_date.day, 12, 0, 0)
    o = _observer_for(dt)

    # Build an ephem "star" with the given RA/Dec
    target = ephem.FixedBody()
    target._ra = str(target_ra_hours * 15)  # convert hours to degrees
    target._dec = str(target_dec_deg)
    target.compute(o)

    # Altitude and azimuth at noon as reference
    altitude = math.degrees(target.alt)
    azimuth = math.degrees(target.az) % 360

    # Find rise, transit, set times
    try:
        # `next_rising` returns an ephem.Date
        rise_dt = o.next_rising(target)
        transit_dt = o.next_transit(target)
        set_dt = o.next_setting(target)

        def dt_from_ephem(edate):
            # ephem.Date is days since 1899-12-31; convert to Python datetime
            tt = edate.tuple()
            return f"{tt[3]:02d}:{tt[4]:02d}"

        rise_str = dt_from_ephem(rise_dt)
        transit_str = dt_from_ephem(transit_dt)
        set_str = dt_from_ephem(set_dt)
    except Exception:
        rise_str = None
        transit_str = None
        set_str = None

    # Find best window (when altitude > 30°)
    best_window = None
    good_times = []
    for hour in range(18, 24):
        for minute in [0, 30]:
            dt_check = datetime(target_date.year, target_date.month, target_date.day, hour, minute, 0)
            o_check = _observer_for(dt_check)
            target.compute(o_check)
            if math.degrees(target.alt) > 30:
                good_times.append(f"{hour:02d}:{minute:02d}")
    if good_times:
        best_window = f"{good_times[0]} - {good_times[-1]}"

    # Max altitude: look at a few hours around transit
    max_alt = altitude
    for h in range(0, 24, 1):
        dt_check = datetime(target_date.year, target_date.month, target_date.day, h, 0, 0)
        o_check = _observer_for(dt_check)
        target.compute(o_check)
        alt = math.degrees(target.alt)
        if alt > max_alt:
            max_alt = alt

    return {
        "target_name": target_name,
        "catalog_id": catalog_id,
        "date": str(target_date),
        "altitude": round(altitude, 1),
        "max_altitude": round(max_alt, 1),
        "transit_time": transit_str,
        "transit_altitude": round(max_alt, 1),
        "rise_time": rise_str,
        "set_time": set_str,
        "is_visible": altitude > 0,
        "best_window": best_window,
        "constellation": _ra_dec_to_constellation(target_ra_hours, target_dec_deg),
    }


def _ra_dec_to_constellation(ra_hours: float, dec_deg: float) -> str:
    """
    Rough constellation estimate based on RA/Dec.
    """
    constellations = [
        ("Orion", 5.5, -1),
        ("Taurus", 4.7, 19),
        ("Gemini", 7.1, 25),
        ("Canis Major", 6.8, -17),
        ("Scorpius", 17.4, -30),
        ("Sagittarius", 19.0, -25),
        ("Leo", 10.5, 13),
        ("Virgo", 12.5, 1),
        ("Andromeda", 1.0, 41),
        ("Cassiopeia", 1.0, 60),
        ("Cygnus", 20.5, 41),
        ("Perseus", 3.5, 48),
        ("Auriga", 6.0, 46),
        ("Lyra", 18.9, 36),
        ("Ursa Major", 11.0, 55),
        ("Pisces", 0.5, 10),
        ("Cetus", 1.5, -10),
        ("Eridanus", 3.5, -20),
        ("Pegasus", 22.5, 20),
        ("Aquarius", 22.0, -10),
        ("Capricornus", 20.5, -20),
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
        if not t.get("ra_hours") or not t.get("dec_deg"):
            continue
        vis = get_target_visibility(
            t["ra_hours"],
            t["dec_deg"],
            today,
            t.get("name", ""),
            t.get("catalog_id", ""),
        )
        score = vis["max_altitude"] if vis["is_visible"] else -999
        scored.append({**t, "visibility": vis, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored
