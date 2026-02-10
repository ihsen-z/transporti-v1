"""
Security Logs - Transporti V1
Structured security event logging for admin and sensitive operations.
Persists to SecurityLog model AND standard logging.
"""
import logging
from typing import Optional

from django.utils import timezone

logger = logging.getLogger('transporti.security')


def _create_security_log(
    event_type: str,
    ip_address: str,
    user_agent: str = '',
    actor=None,
    actor_email: str = '',
    metadata: dict = None
) -> None:
    """
    Create SecurityLog entry in database.
    Also logs to standard logger for immediate visibility.
    """
    from analytics.models import SecurityLog
    
    try:
        SecurityLog.objects.create(
            event_type=event_type,
            actor=actor,
            actor_email=actor_email or (actor.email if actor else ''),
            ip_address=ip_address or '0.0.0.0',
            user_agent=user_agent[:500] if user_agent else '',
            metadata=metadata or {}
        )
    except Exception as e:
        # Log error but don't fail the operation
        logger.error(f"SECURITY_LOG_WRITE_FAILED: event_type={event_type}, error={str(e)}")


def log_admin_login_success(
    user_id: int, 
    email: str, 
    ip_address: str,
    user_agent: str = '',
    session_id: str = ''
) -> None:
    """Log successful admin login."""
    from users.models import User
    
    logger.info(
        f"ADMIN_LOGIN_SUCCESS: user_id={user_id}, email={email}, "
        f"ip={ip_address}, timestamp={timezone.now().isoformat()}"
    )
    
    try:
        actor = User.objects.get(id=user_id)
    except User.DoesNotExist:
        actor = None
    
    _create_security_log(
        event_type='ADMIN_LOGIN_SUCCESS',
        ip_address=ip_address,
        user_agent=user_agent,
        actor=actor,
        actor_email=email,
        metadata={'session_id': session_id}
    )


def log_admin_login_failed(
    email: str, 
    ip_address: str, 
    reason: str,
    user_agent: str = ''
) -> None:
    """Log failed admin login attempt."""
    logger.warning(
        f"ADMIN_LOGIN_FAILED: email={email}, ip={ip_address}, "
        f"reason={reason}, timestamp={timezone.now().isoformat()}"
    )
    
    _create_security_log(
        event_type='ADMIN_LOGIN_FAILED',
        ip_address=ip_address,
        user_agent=user_agent,
        actor=None,
        actor_email=email,
        metadata={'reason': reason}
    )


def log_admin_account_locked(
    email: str, 
    ip_address: str, 
    attempts: int,
    user_agent: str = ''
) -> None:
    """Log admin account locked due to too many failed attempts."""
    logger.error(
        f"ADMIN_ACCOUNT_LOCKED: email={email}, ip={ip_address}, "
        f"attempts={attempts}, timestamp={timezone.now().isoformat()}"
    )
    
    _create_security_log(
        event_type='ADMIN_ACCOUNT_LOCKED',
        ip_address=ip_address,
        user_agent=user_agent,
        actor=None,
        actor_email=email,
        metadata={'attempts': attempts}
    )


def log_admin_session_revoked(
    user_id: int, 
    reason: str, 
    revoker_id: Optional[int] = None,
    ip_address: str = '0.0.0.0'
) -> None:
    """Log admin session revocation."""
    from users.models import User
    
    logger.warning(
        f"ADMIN_SESSION_REVOKED: user_id={user_id}, reason={reason}, "
        f"revoker_id={revoker_id or 'system'}, timestamp={timezone.now().isoformat()}"
    )
    
    try:
        actor = User.objects.get(id=user_id)
    except User.DoesNotExist:
        actor = None
    
    _create_security_log(
        event_type='ADMIN_SESSION_REVOKED',
        ip_address=ip_address,
        actor=actor,
        actor_email=actor.email if actor else '',
        metadata={'reason': reason, 'revoker_id': revoker_id}
    )


def log_admin_password_changed(
    user_id: int, 
    ip_address: str,
    user_agent: str = ''
) -> None:
    """Log admin password change."""
    from users.models import User
    
    logger.info(
        f"ADMIN_PASSWORD_CHANGED: user_id={user_id}, ip={ip_address}, "
        f"timestamp={timezone.now().isoformat()}"
    )
    
    try:
        actor = User.objects.get(id=user_id)
    except User.DoesNotExist:
        actor = None
    
    _create_security_log(
        event_type='ADMIN_PASSWORD_CHANGED',
        ip_address=ip_address,
        user_agent=user_agent,
        actor=actor,
        actor_email=actor.email if actor else '',
        metadata={}
    )


def log_admin_session_created(
    user_id: int, 
    session_id: str, 
    ip_address: str,
    user_agent: str = ''
) -> None:
    """Log new admin session creation."""
    from users.models import User
    
    logger.info(
        f"ADMIN_SESSION_CREATED: user_id={user_id}, session_id={session_id}, "
        f"ip={ip_address}, timestamp={timezone.now().isoformat()}"
    )
    
    try:
        actor = User.objects.get(id=user_id)
    except User.DoesNotExist:
        actor = None
    
    _create_security_log(
        event_type='ADMIN_SESSION_CREATED',
        ip_address=ip_address,
        user_agent=user_agent,
        actor=actor,
        actor_email=actor.email if actor else '',
        metadata={'session_id': session_id}
    )


def log_admin_logout(
    user_id: int,
    ip_address: str,
    user_agent: str = ''
) -> None:
    """Log admin logout."""
    from users.models import User
    
    logger.info(
        f"ADMIN_LOGOUT: user_id={user_id}, ip={ip_address}, "
        f"timestamp={timezone.now().isoformat()}"
    )
    
    try:
        actor = User.objects.get(id=user_id)
    except User.DoesNotExist:
        actor = None
    
    _create_security_log(
        event_type='ADMIN_LOGOUT',
        ip_address=ip_address,
        user_agent=user_agent,
        actor=actor,
        actor_email=actor.email if actor else '',
        metadata={}
    )


def log_security_event(
    event_type: str, 
    user_id: Optional[int], 
    details: dict,
    ip_address: str = '0.0.0.0'
) -> None:
    """Generic security event logger."""
    from users.models import User
    
    logger.info(
        f"SECURITY_EVENT: type={event_type}, user_id={user_id or 'anonymous'}, "
        f"details={details}, timestamp={timezone.now().isoformat()}"
    )
    
    actor = None
    if user_id:
        try:
            actor = User.objects.get(id=user_id)
        except User.DoesNotExist:
            pass
    
    _create_security_log(
        event_type='SECURITY_EVENT',
        ip_address=ip_address,
        actor=actor,
        actor_email=actor.email if actor else '',
        metadata={'original_type': event_type, **details}
    )
