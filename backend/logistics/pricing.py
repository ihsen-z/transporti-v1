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
