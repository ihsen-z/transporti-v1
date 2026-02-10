"""
Analytics Middleware - Transporti V1 (Production Hardened)
Automatically tracks user presence and sessions on authenticated requests.

HARDENING:
- Presence updates are throttled (30s minimum between writes)
- Session integrity enforced (one active session per user)
"""
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

from .services import update_user_presence, get_or_create_session, record_engagement_action


class PresenceMiddleware(MiddlewareMixin):
    """
    Updates user presence and session on every authenticated request.
    Production-optimized with throttling to reduce DB writes.
    """
    
    def process_request(self, request):
        # Only for authenticated users
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        user = request.user
        
        # Update presence (throttled - may not write to DB)
        presence_updated = update_user_presence(user)
        
        # Get or create session (enforces one-session-per-user)
        session = get_or_create_session(user)
        
        # Attach to request for use in views
        request.analytics_session = session
        request.presence_updated = presence_updated
        
        return None
    
    def process_response(self, request, response):
        # Track login action on successful auth (subject to daily cap)
        if (hasattr(request, 'user') and 
            request.user.is_authenticated and 
            response.status_code == 200 and
            request.path.endswith('/login/')):
            record_engagement_action(request.user, 'login')
        
        return response
