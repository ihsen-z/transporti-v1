"""
Push Notification Service - Transporti V1
SANDBOX MODE: Logs push notifications without actually sending them.

ARCHITECTURE:
- Called after each DB notification is created
- Checks user's push preferences before sending
- In SANDBOX mode: logs the push payload (no external API call)
- In PRODUCTION mode: sends via the Expo Push API (Lot 4.1 decision — no
  google-services.json / firebase-admin needed, works with the project's
  Continuous Native Generation setup; devices register an Expo push token,
  not a raw FCM/APNS one, so ANDROID and IOS are sent through the exact same
  HTTP call).

INTEGRATION POINT:
    Called from notifications/services.py → notify()
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger('transporti')

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


# =============================================================================
# PUSH MODE DETECTION
# =============================================================================

# SANDBOX = log only, PRODUCTION = send via the Expo Push API
PUSH_MODE = getattr(settings, 'PUSH_NOTIFICATION_MODE', 'SANDBOX')


# =============================================================================
# CORE PUSH FUNCTION
# =============================================================================

def send_push_notification(user, title: str, body: str, data: dict = None):
    """
    Send a push notification to a user's registered mobile devices.

    In SANDBOX mode: logs the notification without sending.
    In PRODUCTION mode: sends via the Expo Push API.

    Args:
        user: User instance to send push to
        title: Notification title
        body: Notification body text
        data: Optional data payload (e.g., {'job_id': 123})

    Returns:
        dict with delivery results:
        {
            'sent': int,       # number of REAL deliveries handed to Expo (PRODUCTION only)
            'logged': int,     # number of deliveries only logged, not sent (SANDBOX only)
            'failed': int,     # number of failed deliveries
            'skipped': int,    # number of skipped (inactive tokens)
            'mode': str,       # 'SANDBOX' or 'PRODUCTION'
        }
    """
    from .models import DeviceToken

    result = {
        'sent': 0,
        'logged': 0,
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
                # Ne compte JAMAIS comme 'sent' : personne n'a reçu quoi que ce
                # soit, et un tableau de bord de délivrabilité lisant 'sent'
                # afficherait 100% alors qu'aucun appareil n'a été contacté.
                _send_sandbox(user.id, platform, token, device_name, title, body, data)
                result['logged'] += 1
            elif PUSH_MODE == 'PRODUCTION':
                _send_expo(token, title, body, data)
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
        f"PUSH_DELIVERY_COMPLETE: user_id={user.id}, mode={PUSH_MODE}, "
        f"sent={result['sent']}, logged={result['logged']}, failed={result['failed']}"
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
# PRODUCTION MODE (Expo Push API)
# =============================================================================

class ExpoPushError(Exception):
    """Raised when Expo's relay rejects or fails to queue a push ticket."""


def _send_expo(token: str, title: str, body: str, data: dict = None):
    """
    Send a single push notification through the Expo Push API.

    No API key / service account is required for basic sending — Expo's relay
    resolves the token to the right platform (FCM/APNs) on its own, which is
    exactly why 4.1 picked it over Firebase: one HTTP call, no
    google-services.json, no native credentials to manage.

    Raises ExpoPushError on any failure — including a same-request "ticket"
    error (Expo returns HTTP 200 with a per-ticket error status for a stale
    token, it does not raise an HTTP error), so the caller's generic
    except/deactivate-token logic in send_push_notification() keeps working.
    """
    payload = {
        'to': token,
        'title': title,
        'body': body,
        'data': data or {},
        'sound': 'default',
    }

    response = requests.post(
        EXPO_PUSH_URL,
        json=payload,
        headers={
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        timeout=10,
    )
    response.raise_for_status()
    ticket = response.json().get('data', {})

    if ticket.get('status') == 'error':
        error_code = (ticket.get('details') or {}).get('error', 'unknown')
        # DeviceNotRegistered is Expo's code for an uninstalled app / stale
        # token — the message must contain "not registered" verbatim so
        # _is_token_invalid_error() deactivates it, exactly as a Firebase
        # UnregisteredError would have.
        if error_code == 'DeviceNotRegistered':
            raise ExpoPushError(f"Expo push token not registered: {token[:20]}...")
        raise ExpoPushError(f"Expo push ticket error: {error_code} — {ticket.get('message', '')}")


# =============================================================================
# HELPERS
# =============================================================================

def _is_push_enabled(user) -> bool:
    """
    Check if user has push notifications enabled in their preferences.
    Defaults to True if no preference exists (opt-out model).
    """
    try:
        # E1 fix (audit Sprint 0, bug latent n°4): NotificationPreference lives
        # in users.models — the old `.models` import raised ImportError and the
        # fail-open swallowed it, so the preference was NEVER honored.
        from users.models import NotificationPreference
        pref = NotificationPreference.objects.filter(user=user).first()
        if pref is None:
            return True  # Default: opt-in
        return pref.push_enabled
    except Exception:
        return True  # Fail-open: send if we can't check


def _is_token_invalid_error(error) -> bool:
    """
    Detect if a push delivery error indicates an invalid/expired token.
    In SANDBOX mode this never triggers (no real errors). In PRODUCTION,
    _send_expo() raises ExpoPushError with 'not registered' verbatim in the
    message for Expo's DeviceNotRegistered ticket error — matched below.
    """
    error_str = str(error).lower()
    return any(keyword in error_str for keyword in [
        'unregistered',
        'invalid registration',
        'not registered',
        'invalid token',
    ])
