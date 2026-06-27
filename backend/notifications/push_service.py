"""
Push Notification Service - Transporti V1
SANDBOX MODE: Logs push notifications without actually sending them.

ARCHITECTURE:
- Called after each DB notification is created
- Checks user's push preferences before sending
- In SANDBOX mode: logs the push payload (no external API call)
- In PRODUCTION mode: would use Firebase Admin SDK (future)

INTEGRATION POINT:
    Called from notifications/services.py → notify()
"""
import logging

from django.conf import settings

logger = logging.getLogger('transporti')


# =============================================================================
# PUSH MODE DETECTION
# =============================================================================

# SANDBOX = log only, PRODUCTION = send via Firebase (future)
PUSH_MODE = getattr(settings, 'PUSH_NOTIFICATION_MODE', 'SANDBOX')


# =============================================================================
# CORE PUSH FUNCTION
# =============================================================================

def send_push_notification(user, title: str, body: str, data: dict = None):
    """
    Send a push notification to a user's registered mobile devices.
    
    In SANDBOX mode: logs the notification without sending.
    In PRODUCTION mode: sends via Firebase Cloud Messaging (future).
    
    Args:
        user: User instance to send push to
        title: Notification title
        body: Notification body text
        data: Optional data payload (e.g., {'job_id': 123})
    
    Returns:
        dict with delivery results:
        {
            'sent': int,       # number of successful deliveries
            'failed': int,     # number of failed deliveries
            'skipped': int,    # number of skipped (inactive tokens)
            'mode': str,       # 'SANDBOX' or 'PRODUCTION'
        }
    """
    from .models import DeviceToken

    result = {
        'sent': 0,
        'failed': 0,
        'skipped': 0,
        'mode': PUSH_MODE,
    }

    # Check user's push preference
    if not _is_push_enabled(user):
        logger.debug(
            f"PUSH_SKIPPED: user_id={user.id}, reason=push_disabled"
        )
        return result

    # Get active device tokens
    tokens = DeviceToken.objects.filter(
        user=user,
        is_active=True,
    ).values_list('id', 'platform', 'token', 'device_name')

    if not tokens:
        logger.debug(
            f"PUSH_SKIPPED: user_id={user.id}, reason=no_active_devices"
        )
        return result

    for token_id, platform, token, device_name in tokens:
        try:
            if PUSH_MODE == 'SANDBOX':
                _send_sandbox(user.id, platform, token, device_name, title, body, data)
                result['sent'] += 1
            elif PUSH_MODE == 'PRODUCTION':
                # Future: Firebase Admin SDK integration
                _send_firebase(platform, token, title, body, data)
                result['sent'] += 1
            else:
                logger.warning(f"PUSH_UNKNOWN_MODE: {PUSH_MODE}")
                result['skipped'] += 1
        except Exception as e:
            result['failed'] += 1
            logger.error(
                f"PUSH_DELIVERY_FAILED: user_id={user.id}, "
                f"token_id={token_id}, platform={platform}, error={str(e)}"
            )
            # Deactivate invalid tokens (e.g., uninstalled app)
            if _is_token_invalid_error(e):
                DeviceToken.objects.filter(id=token_id).update(is_active=False)
                logger.info(
                    f"PUSH_TOKEN_DEACTIVATED: token_id={token_id}, reason=invalid"
                )

    logger.info(
        f"PUSH_DELIVERY_COMPLETE: user_id={user.id}, "
        f"sent={result['sent']}, failed={result['failed']}, mode={PUSH_MODE}"
    )

    return result


# =============================================================================
# SANDBOX MODE (Log Only)
# =============================================================================

def _send_sandbox(user_id, platform, token, device_name, title, body, data):
    """
    Simulates push delivery by logging the payload.
    No external API calls are made.
    """
    logger.info(
        f"PUSH_SANDBOX: user_id={user_id}, "
        f"platform={platform}, device={device_name or 'unnamed'}, "
        f"title=\"{title}\", body=\"{body[:100]}\", "
        f"data={data or {}}, "
        f"token={token[:20]}..."
    )


# =============================================================================
# PRODUCTION MODE (Firebase — Future)
# =============================================================================

def _send_firebase(platform, token, title, body, data):
    """
    Send push via Firebase Cloud Messaging.
    
    PLACEHOLDER: Will be implemented when Firebase project is configured.
    Requires: firebase-admin SDK + service account credentials.
    
    Expected implementation:
        import firebase_admin
        from firebase_admin import messaging
        
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=token,
        )
        messaging.send(message)
    """
    raise NotImplementedError(
        "Firebase push not configured. "
        "Set PUSH_NOTIFICATION_MODE='SANDBOX' or configure Firebase credentials."
    )


# =============================================================================
# HELPERS
# =============================================================================

def _is_push_enabled(user) -> bool:
    """
    Check if user has push notifications enabled in their preferences.
    Defaults to True if no preference exists (opt-out model).
    """
    try:
        from .models import NotificationPreference
        pref = NotificationPreference.objects.filter(user=user).first()
        if pref is None:
            return True  # Default: opt-in
        return pref.push_enabled
    except Exception:
        return True  # Fail-open: send if we can't check


def _is_token_invalid_error(error) -> bool:
    """
    Detect if a push delivery error indicates an invalid/expired token.
    In SANDBOX mode this never triggers (no real errors).
    
    Future: check Firebase error codes like:
    - messaging.UnregisteredError
    - messaging.InvalidArgumentError
    """
    error_str = str(error).lower()
    return any(keyword in error_str for keyword in [
        'unregistered',
        'invalid registration',
        'not registered',
        'invalid token',
    ])
