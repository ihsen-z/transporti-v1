"""
Custom Throttle Classes - Transporti V1
Rate limiting for specific endpoint categories.
"""
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class AuthRateThrottle(UserRateThrottle):
    """
    Throttle for authentication endpoints (login, register).
    Allows 10 requests per minute to prevent brute force attacks.
    """
    scope = 'auth'


class AdminLoginThrottle(AnonRateThrottle):
    """
    Strict throttle for admin login endpoint.
    5 attempts per 10 minutes to prevent brute force attacks.
    Uses AnonRateThrottle to track by IP, not by user.
    """
    scope = 'admin_auth'
    rate = '30/h'  # ~5 requests per 10 minutes (DRF only supports s/m/h/d)
    
    def get_cache_key(self, request, view):
        """Use IP address as cache key for admin login throttling."""
        ident = self.get_ident(request)
        return f"admin_throttle_{ident}"


class BookingRateThrottle(UserRateThrottle):
    """
    Throttle for booking actions (job creation, offer submission).
    Allows 20 requests per minute to prevent spam.
    """
    scope = 'booking'


class PaymentRateThrottle(UserRateThrottle):
    """
    Throttle for payment actions (escrow, settlement).
    Allows 10 requests per minute for security.
    """
    scope = 'payment'
