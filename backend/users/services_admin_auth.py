"""
Admin Authentication Services - Transporti V1
Production-level admin security with single session enforcement.

SECURITY RULES:
- Admin-only JWT with is_admin claim, short expiry (15 min)
- One active admin session at a time
- Session revocation on password change
- Comprehensive security logging
"""
import logging
import uuid
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User
from analytics.security_logs import (
    log_admin_login_success,
    log_admin_login_failed,
    log_admin_account_locked,
    log_admin_session_revoked,
    log_admin_password_changed,
    log_admin_session_created,
)

logger = logging.getLogger('transporti.security')


# =============================================================================
# CONFIGURATION
# =============================================================================

ADMIN_ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
ADMIN_REFRESH_TOKEN_LIFETIME = timedelta(hours=1)
ADMIN_SESSION_CACHE_PREFIX = 'admin_session:'
ADMIN_FAILED_LOGIN_CACHE_PREFIX = 'admin_failed:'
MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(minutes=30)


# =============================================================================
# ADMIN SESSION MANAGEMENT
# =============================================================================

def _get_session_cache_key(user_id: int) -> str:
    """Get cache key for admin session."""
    return f"{ADMIN_SESSION_CACHE_PREFIX}{user_id}"


def _get_failed_login_cache_key(email: str) -> str:
    """Get cache key for failed login attempts."""
    return f"{ADMIN_FAILED_LOGIN_CACHE_PREFIX}{email}"


def get_active_admin_session(user_id: int) -> dict | None:
    """Get active admin session if exists."""
    return cache.get(_get_session_cache_key(user_id))


def create_admin_session(user: User, ip_address: str) -> dict:
    """
    Create new admin session, revoking any existing session.
    
    Returns:
        Session dict with session_id, created_at, ip_address
    """
    # Revoke existing session if any
    existing = get_active_admin_session(user.id)
    if existing:
        log_admin_session_revoked(user.id, "new_login_replaced", None)
    
    session_id = str(uuid.uuid4())
    session_data = {
        'session_id': session_id,
        'user_id': user.id,
        'created_at': timezone.now().isoformat(),
        'ip_address': ip_address,
    }
    
    # Store in cache (expires with refresh token)
    cache.set(
        _get_session_cache_key(user.id),
        session_data,
        timeout=int(ADMIN_REFRESH_TOKEN_LIFETIME.total_seconds())
    )
    
    log_admin_session_created(user.id, session_id, ip_address)
    
    return session_data


def revoke_admin_session(user_id: int, reason: str = 'manual', revoker_id: int = None) -> bool:
    """Revoke admin session."""
    cache_key = _get_session_cache_key(user_id)
    if cache.get(cache_key):
        cache.delete(cache_key)
        log_admin_session_revoked(user_id, reason, revoker_id)
        return True
    return False


def revoke_all_admin_sessions_for_user(user_id: int, reason: str = 'password_change') -> None:
    """Revoke all sessions for an admin user (e.g., on password change)."""
    revoke_admin_session(user_id, reason)


def is_session_valid(user_id: int, session_id: str) -> bool:
    """Check if specific session is still valid."""
    session = get_active_admin_session(user_id)
    if not session:
        return False
    return session.get('session_id') == session_id


# =============================================================================
# FAILED LOGIN TRACKING
# =============================================================================

def get_failed_login_count(email: str) -> int:
    """Get number of failed login attempts."""
    return cache.get(_get_failed_login_cache_key(email), 0)


def increment_failed_login(email: str) -> int:
    """Increment and return failed login count."""
    cache_key = _get_failed_login_cache_key(email)
    count = cache.get(cache_key, 0) + 1
    cache.set(cache_key, count, timeout=int(LOCKOUT_DURATION.total_seconds()))
    return count


def clear_failed_logins(email: str) -> None:
    """Clear failed login attempts after successful login."""
    cache.delete(_get_failed_login_cache_key(email))


def is_account_locked(email: str) -> bool:
    """Check if account is locked due to too many failed attempts."""
    return get_failed_login_count(email) >= MAX_FAILED_LOGIN_ATTEMPTS


# =============================================================================
# ADMIN JWT TOKENS
# =============================================================================

def create_admin_tokens(user: User, session_id: str) -> dict:
    """
    Create admin-specific JWT tokens with is_admin claim.
    
    Returns:
        Dict with access_token, refresh_token, expires_in
    """
    refresh = RefreshToken.for_user(user)
    
    # Add admin-specific claims
    refresh['is_admin'] = True
    refresh['role'] = user.role
    refresh['session_id'] = session_id
    
    # Set custom expiry
    refresh.set_exp(lifetime=ADMIN_REFRESH_TOKEN_LIFETIME)
    access = refresh.access_token
    access.set_exp(lifetime=ADMIN_ACCESS_TOKEN_LIFETIME)
    
    return {
        'access_token': str(access),
        'refresh_token': str(refresh),
        'expires_in': int(ADMIN_ACCESS_TOKEN_LIFETIME.total_seconds()),
        'token_type': 'Bearer',
    }


# =============================================================================
# ADMIN LOGIN SERVICE
# =============================================================================

@transaction.atomic
def admin_login(email: str, password: str, ip_address: str) -> dict:
    """
    Admin login with security checks.
    
    Args:
        email: Admin email
        password: Password
        ip_address: Request IP address
    
    Returns:
        Dict with user info, tokens, and session
    
    Raises:
        ValidationError: If credentials invalid or account locked
        PermissionDenied: If user is not admin
    """
    # Check if account is locked
    if is_account_locked(email):
        log_admin_login_failed(email, ip_address, "account_locked")
        raise ValidationError(
            "Account temporarily locked due to too many failed attempts. "
            "Please try again in 30 minutes."
        )
    
    # Authenticate
    user = authenticate(username=email, password=password)
    
    if not user:
        failed_count = increment_failed_login(email)
        
        if failed_count >= MAX_FAILED_LOGIN_ATTEMPTS:
            log_admin_account_locked(email, ip_address, failed_count)
            raise ValidationError(
                "Account temporarily locked due to too many failed attempts."
            )
        
        remaining = MAX_FAILED_LOGIN_ATTEMPTS - failed_count
        log_admin_login_failed(email, ip_address, f"invalid_credentials, {remaining} attempts remaining")
        raise ValidationError(f"Invalid credentials. {remaining} attempts remaining.")
    
    # Verify admin role
    if user.role not in ['ADMIN', 'MODERATOR']:
        log_admin_login_failed(email, ip_address, f"not_admin, role={user.role}")
        raise PermissionDenied("Admin access required.")
    
    if not user.is_active:
        log_admin_login_failed(email, ip_address, "account_inactive")
        raise ValidationError("Account is inactive.")
    
    # Clear failed login attempts
    clear_failed_logins(email)
    
    # Create session (revokes any existing)
    session = create_admin_session(user, ip_address)
    
    # Create tokens
    tokens = create_admin_tokens(user, session['session_id'])
    
    # Log success
    log_admin_login_success(user.id, email, ip_address)
    
    return {
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'first_name': user.first_name,
            'last_name': user.last_name,
        },
        'tokens': tokens,
        'session': {
            'session_id': session['session_id'],
            'expires_at': (timezone.now() + ADMIN_REFRESH_TOKEN_LIFETIME).isoformat(),
        }
    }


def admin_logout(user: User) -> dict:
    """Logout admin and revoke session."""
    revoked = revoke_admin_session(user.id, 'logout')
    return {'success': revoked, 'message': 'Logged out successfully.'}


def on_admin_password_change(user: User, ip_address: str) -> None:
    """Handle admin password change - revoke all sessions."""
    revoke_all_admin_sessions_for_user(user.id, 'password_change')
    log_admin_password_changed(user.id, ip_address)
