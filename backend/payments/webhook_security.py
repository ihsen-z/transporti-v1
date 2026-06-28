"""
Payment Webhook Security — Transporti V1
Sprint 2 R4: HMAC-SHA256 signature validation for payment gateway webhooks.

Prevents forged webhook calls by verifying the request body against
a shared secret using timing-safe comparison.
"""
import hmac
import hashlib
import logging

from django.conf import settings
from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger('transporti')


def verify_webhook_signature(request):
    """
    Verify HMAC-SHA256 signature from payment gateway webhook.
    
    Expected header: X-Signature-256: sha256=<hex_digest>
    
    If PAYMENT_WEBHOOK_SECRET is empty (dev/sandbox mode), 
    validation is skipped with a warning log.
    
    Raises PermissionDenied if signature is invalid.
    """
    secret = getattr(settings, 'PAYMENT_WEBHOOK_SECRET', '')
    
    # Skip validation in sandbox/dev mode (no secret configured)
    if not secret:
        logger.warning(
            "WEBHOOK_SECURITY: No PAYMENT_WEBHOOK_SECRET configured. "
            "Signature validation skipped. THIS IS UNSAFE IN PRODUCTION."
        )
        return
    
    signature_header = request.headers.get('X-Signature-256', '')
    
    if not signature_header:
        logger.warning(
            f"WEBHOOK_SECURITY: Missing X-Signature-256 header. "
            f"IP: {_get_client_ip(request)}"
        )
        raise PermissionDenied("Missing webhook signature.")
    
    # Compute expected signature
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        request.body,
        hashlib.sha256
    ).hexdigest()
    
    expected_full = f"sha256={expected_signature}"
    
    # Timing-safe comparison to prevent timing attacks
    if not hmac.compare_digest(expected_full, signature_header):
        logger.error(
            f"WEBHOOK_SECURITY: Invalid signature. "
            f"Expected: {expected_full[:20]}... "
            f"Received: {signature_header[:20]}... "
            f"IP: {_get_client_ip(request)}"
        )
        raise PermissionDenied("Invalid webhook signature.")
    
    logger.info(
        f"WEBHOOK_SECURITY: Valid signature verified. "
        f"IP: {_get_client_ip(request)}"
    )


def _get_client_ip(request):
    """Extract client IP from request, handling proxied requests."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')
