"""
Astronomy service using Skyfield for accurate calculations.
Location: Aesch ZH — lat=47.468°N, lon=8.066°E
"""

import math
from datetime import date, datetime, timedelta, timezone
from skyfield.api import Loader, wgs84
from skyfield import almanac

# Load ephemeris (cached automatically)
load = Loader('/tmp/skyfield_data')
planets = load('de421.bsp')
earth = planets['earth']
moon = planets['moon']
sun = planets['sun']

# Observer for Aesch ZH
AESCH_LAT = 47.468
AESCH_LON = 8.066
AESCH_ELEV = 432  # meters

# Create timescale
ts = load.timescale()

# UTC timezone
UTC = timezone.utc


def get_observer(dt: datetime):
    """Get Skyfield observer for Aesch ZH."""
    t = ts.from_datetime(dt)
    observer = earth + wgs84.latlon(AESCH_LAT, AESCH_LON, elevation_m=AESCH_ELEV)
    return observer, t


def get_moon_phase(target_date: date) -> dict:
    """
    Returns accurate moon phase using Skyfield.
    """
    # Use noon UTC for the date
    dt = datetime(target_date.year, target_date.month, target_date.day, 12, 0, 0, tzinfo=UTC)
    t = ts.from_datetime(dt)
    
    # Calculate elongation (angle between sun and moon as seen from earth)
    # This is 0° at New Moon, 180° at Full Moon
    e = earth.at(t)
    s = e.observe(sun).apparent()
    m = e.observe(moon).apparent()
    
    # Elongation: angle sun-earth-moon (0-180 degrees)
    elongation = s.separation_from(m).degrees
    
    # Illuminated fraction: (1 + cos(elongation)) / 2
    # At elongation 0° (New): (1 + 1) / 2 = 1.0 = 100%? No wait...
    # Actually, illumination = (1 - cos(phase_angle)) / 2 where phase_angle = 180° - elongation
    # Or simpler: illumination = (1 + cos(elongation)) / 2 works if elongation is sun-moon separation
    # At New Moon: sun and moon together, elongation = 0, cos(0) = 1, illumination = (1+1)/2 = 1.0 = 100%? Wrong!
    # 
    # Correct formula: illumination = (1 - cos(phase_angle)) / 2
    # where phase_angle = 180° - elongation (angle at moon between sun and earth)
    # At New Moon: elongation = 0, phase_angle = 180°, cos(180°) = -1, illumination = (1-(-1))/2 = 0%
    # At Full Moon: elongation = 180°, phase_angle = 0°, cos(0°) = 1, illumination = (1-1)/2 = 0%? Wrong!
    #
    # Actually the correct formula is:
    # illumination = (1 + cos(elongation)) / 2
    # At New Moon: elongation = 0, illumination = 1.0 = 100% - this is wrong!
    # 
    # Let me use Skyfield's built-in fraction_illuminated method
    illumination = almanac.fraction_illuminated(planets, 'moon', t)
    
    # Determine phase name based on elongation
    # 0° = New Moon (sun and moon together)
    # 0-90° = Waxing (increasing illumination)
    # 90° = First Quarter
    # 90-180° = Waxing Gibbous
    # 180° = Full Moon (sun and moon opposite)
    # 180-90° = Waning (decreasing illumination)
    # 270° = Last Quarter
    # 270-360° = Waning Crescent
    #
    # But we need to determine waxing vs waning
    # Waxing: illumination increasing (before full)
    # Waning: illumination decreasing (after full)
    
    # Get illumination at previous and next day to determine trend
    t_prev = ts.from_datetime(dt - timedelta(days=1))
    t_next = ts.from_datetime(dt + timedelta(days=1))
    illum_prev = almanac.fraction_illuminated(planets, 'moon', t_prev)
    illum_next = almanac.fraction_illuminated(planets, 'moon', t_next)
    
    is_waxing = illum_next > illumination  # Illumination increasing
    
    # Determine phase based on illumination and trend
    if illumination < 0.02:
        phase_name = "New Moon"
    elif illumination < 0.25:
        phase_name = "Waxing Crescent" if is_waxing else "Waning Crescent"
    elif illumination < 0.30:
        phase_name = "First Quarter" if is_waxing else "Last Quarter"
    elif illumination < 0.50:
        phase_name = "Waxing Crescent" if is_waxing else "Waning Crescent"
    elif illumination < 0.75:
        phase_name = "Waxing Gibbous" if is_waxing else "Waning Gibbous"
    elif illumination < 0.98:
        phase_name = "Waxing Gibbous" if is_waxing else "Waning Gibbous"
    else:
        phase_name = "Full Moon"
    
    return {
        "illumination": round(illumination, 3),
        "phase_name": phase_name,
        "phase_angle_deg": round(phase_angle, 1),
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
    topos = wgs84.latlon(AESCH_LAT, AESCH_LON, elevation_m=AESCH_ELEV)
    observer = earth + topos
    
    # Create a fixed body at the given RA/Dec
    from skyfield.api import Star
    target = Star(ra_hours=target_ra_hours, dec_degrees=target_dec_deg)
    
    # Start of observation night (6 PM local = 4 PM UTC for Zurich)
    dt_start = datetime(target_date.year, target_date.month, target_date.day, 16, 0, 0, tzinfo=UTC)
    t0 = ts.from_datetime(dt_start)
    t1 = ts.from_datetime(dt_start + timedelta(hours=18))  # Next day noon
    
    # Calculate altitude at different times to find max
    max_alt = -90
    best_time = None
    rise_time = None
    set_time = None
    transit_time = None
    
    # Check altitude every 30 minutes
    for minutes in range(0, 18 * 60, 30):
        t = ts.from_datetime(dt_start + timedelta(minutes=minutes))
        astrometric = observer.at(t).observe(target)
        alt, az, dist = astrometric.apparent().altaz()
        
        if alt.degrees > max_alt:
            max_alt = alt.degrees
            best_time = t
        
        # Track when it crosses horizon
        if alt.degrees > 0 and rise_time is None:
            rise_time = t
        if alt.degrees < 0 and rise_time is not None and set_time is None:
            set_time = t
    
    # Format times
    def format_time(t):
        if t is None:
            return None
        dt = t.utc_datetime()
        return f"{dt.hour:02d}:{dt.minute:02d}"
    
    # Find transit time (when highest)
    if best_time:
        transit_time = format_time(best_time)
    
    # Current altitude at noon
    t_noon = ts.from_datetime(datetime(target_date.year, target_date.month, target_date.day, 12, 0, 0, tzinfo=UTC))
    astrometric = observer.at(t_noon).observe(target)
    alt, az, dist = astrometric.apparent().altaz()
    
    return {
        "target_name": target_name,
        "catalog_id": catalog_id,
        "date": str(target_date),
        "altitude": round(alt.degrees, 1),
        "max_altitude": round(max_alt, 1),
        "transit_time": transit_time,
        "transit_altitude": round(max_alt, 1),
        "rise_time": format_time(rise_time),
        "set_time": format_time(set_time),
        "is_visible": max_alt > 0,
        "best_window": None,  # Could calculate this from good_times
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
