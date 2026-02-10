"""
Admin JWT Authentication - Transporti V1
Custom JWT authentication for admin endpoints.

SECURITY:
- Validates is_admin claim
- Validates session_id against active session
- Short token lifetime (15 min)
"""
import logging
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication

from users.services_admin_auth import is_session_valid

logger = logging.getLogger('transporti.security')


class AdminJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication for admin endpoints.
    
    Validates:
    - is_admin claim must be True
    - role must be ADMIN or MODERATOR
    - session_id must match active session
    """
    
    def authenticate(self, request):
        """Authenticate and validate admin claims."""
        # First, do standard JWT authentication
        result = super().authenticate(request)
        
        if result is None:
            return None
        
        user, validated_token = result
        
        # Validate admin claims
        is_admin = validated_token.get('is_admin', False)
        role = validated_token.get('role', '')
        session_id = validated_token.get('session_id', '')
        
        # Must have is_admin claim
        if not is_admin:
            logger.warning(
                f"ADMIN_AUTH_REJECTED: user_id={user.id}, reason=missing_is_admin_claim"
            )
            raise exceptions.AuthenticationFailed(
                'This token is not authorized for admin access.'
            )
        
        # Role must be ADMIN or MODERATOR
        if role not in ['ADMIN', 'MODERATOR']:
            logger.warning(
                f"ADMIN_AUTH_REJECTED: user_id={user.id}, reason=invalid_role, role={role}"
            )
            raise exceptions.AuthenticationFailed(
                'Invalid role for admin access.'
            )
        
        # Verify user still has admin role (in case role was revoked)
        if user.role not in ['ADMIN', 'MODERATOR']:
            logger.warning(
                f"ADMIN_AUTH_REJECTED: user_id={user.id}, reason=role_revoked, "
                f"token_role={role}, current_role={user.role}"
            )
            raise exceptions.AuthenticationFailed(
                'Your admin access has been revoked.'
            )
        
        # Validate session is still active
        if session_id and not is_session_valid(user.id, session_id):
            logger.warning(
                f"ADMIN_AUTH_REJECTED: user_id={user.id}, reason=session_invalid, "
                f"session_id={session_id}"
            )
            raise exceptions.AuthenticationFailed(
                'Your admin session has expired or been revoked.'
            )
        
        logger.debug(f"ADMIN_AUTH_SUCCESS: user_id={user.id}, session_id={session_id}")
        
        return (user, validated_token)
