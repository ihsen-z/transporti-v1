"""
Pricing Service - Transporti V1
Automatic price estimation based on distance and configurable grids.

RULES:
- Reads pricing grids from DB (PricingGrid model, managed via admin)
- Falls back to hardcoded defaults if no DB grid exists
- Uses Haversine formula for geodesic distance
- Returns a price range (min, max) + distance
"""
import math
import logging
from decimal import Decimal

logger = logging.getLogger('transporti')

# Fallback pricing grids (used when no PricingGrid in DB)
DEFAULT_GRIDS = {
    'TRANSPORT': {
        'base_rate': 10.0,
        'per_km_rate': 0.35,
        'min_price': 25.0,
        'max_multiplier': 1.5,
    },
    'MOVING': {
        'base_rate': 30.0,
        'per_km_rate': 0.50,
        'min_price': 80.0,
        'max_multiplier': 2.0,
    },
}


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great-circle distance between two GPS points.
    
    Args:
        lat1, lng1: Origin coordinates
        lat2, lng2: Destination coordinates
    
    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


ROAD_FACTOR = 1.25  # T4: haversine → estimation routière (coefficient routier)

# Chefs-lieux des 24 gouvernorats — repli du calcul de distance quand un job
# n'a pas de coordonnées précises (ex. trajets retour saisis par gouvernorat).
GOVERNORATE_CENTROIDS = {
    'tunis': (36.8065, 10.1815), 'ariana': (36.8625, 10.1956),
    'ben arous': (36.7545, 10.2487), 'manouba': (36.8101, 10.0956),
    'nabeul': (36.4561, 10.7376), 'zaghouan': (36.4029, 10.1429),
    'bizerte': (37.2744, 9.8739), 'béja': (36.7256, 9.1817),
    'jendouba': (36.5011, 8.7802), 'kef': (36.1826, 8.7148),
    'siliana': (36.0849, 9.3708), 'sousse': (35.8256, 10.6084),
    'monastir': (35.7643, 10.8113), 'mahdia': (35.5047, 11.0622),
    'sfax': (34.7406, 10.7603), 'kairouan': (35.6781, 10.0963),
    'kasserine': (35.1676, 8.8365), 'sidi bouzid': (35.0382, 9.4849),
    'gabès': (33.8815, 10.0982), 'medenine': (33.3549, 10.5055),
    'médenine': (33.3549, 10.5055), 'tataouine': (32.9297, 10.4518),
    'gafsa': (34.4250, 8.7842), 'tozeur': (33.9197, 8.1335),
    'kebili': (33.7044, 8.9690), 'kébili': (33.7044, 8.9690),
}


def estimate_distance_for_job(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
                              pickup_governorate=None, dropoff_governorate=None):
    """
    NSM: best-effort distance — precise coordinates first, governorate
    centroids as fallback (return trips are corridor-based). Returns None
    only when neither is available.
    """
    km = estimate_road_distance_km(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
    if km is not None:
        return km
    p = GOVERNORATE_CENTROIDS.get((pickup_governorate or '').strip().lower())
    d = GOVERNORATE_CENTROIDS.get((dropoff_governorate or '').strip().lower())
    if p and d:
        return estimate_road_distance_km(p[0], p[1], d[0], d[1])
    return None


def estimate_road_distance_km(lat1, lng1, lat2, lng2):
    """
    NSM instrumentation (vision v1.0): road distance estimate in km,
    haversine × ROAD_FACTOR, rounded to 1 decimal. Returns None when any
    coordinate is missing — never raises (creation must not fail on this).
    """
    try:
        if None in (lat1, lng1, lat2, lng2):
            return None
        km = haversine_distance(float(lat1), float(lng1), float(lat2), float(lng2))
        return round(km * ROAD_FACTOR, 1)
    except (TypeError, ValueError):
        return None


def get_pricing_grid(job_type: str) -> dict:
    """
    Get pricing parameters from DB, fallback to defaults.
    
    Returns:
        Dict with base_rate, per_km_rate, min_price, max_multiplier, source
    """
    from .models import PricingGrid

    try:
        grid = PricingGrid.objects.get(job_type=job_type, is_active=True)
        return {
            'base_rate': float(grid.base_rate),
            'per_km_rate': float(grid.per_km_rate),
            'min_price': float(grid.min_price),
            'max_multiplier': float(grid.max_multiplier),
            'source': 'db',
        }
    except PricingGrid.DoesNotExist:
        fallback = DEFAULT_GRIDS.get(job_type, DEFAULT_GRIDS['TRANSPORT'])
        return {**fallback, 'source': 'default'}


def estimate_price(
    pickup_lat: float,
    pickup_lng: float,
    dropoff_lat: float,
    dropoff_lng: float,
    job_type: str = 'TRANSPORT',
) -> dict:
    """
    Estimate a price range for a job based on distance and type.
    
    Args:
        pickup_lat, pickup_lng: Origin GPS coordinates
        dropoff_lat, dropoff_lng: Destination GPS coordinates
        job_type: 'TRANSPORT' or 'MOVING'
    
    Returns:
        {
            'min': 45.0,          # Estimated minimum (TND)
            'max': 67.5,          # Estimated maximum (TND)
            'distance_km': 120.5, # Straight-line distance
            'grid_source': 'db',  # 'db' or 'default'
            'base_calculated': 52.0,  # Raw base amount
        }
    """
    # Validate coordinates
    try:
        lat1 = float(pickup_lat)
        lng1 = float(pickup_lng)
        lat2 = float(dropoff_lat)
        lng2 = float(dropoff_lng)
    except (ValueError, TypeError) as e:
        logger.warning(f"PRICING_INVALID_COORDS: error={e}")
        return {
            'min': 0, 'max': 0, 'distance_km': 0,
            'grid_source': 'error', 'error': 'Invalid coordinates'
        }

    # Calculate distance
    distance = haversine_distance(lat1, lng1, lat2, lng2)

    # Get grid
    grid = get_pricing_grid(job_type)

    # Calculate price
    base = grid['base_rate'] + (distance * grid['per_km_rate'])
    min_price = max(grid['min_price'], base * 0.8)
    max_price = base * grid['max_multiplier']

    result = {
        'min': round(min_price, 2),
        'max': round(max_price, 2),
        'distance_km': round(distance, 1),
        'grid_source': grid['source'],
        'base_calculated': round(base, 2),
    }

    logger.debug(
        f"PRICE_ESTIMATE: job_type={job_type}, distance={result['distance_km']}km, "
        f"range={result['min']}-{result['max']} TND, source={grid['source']}"
    )

    return result
