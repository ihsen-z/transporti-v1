"""
Admin Audit Trail Service — Transporti V1
Sprint 2 R8: Utility function to log admin actions from any view.
"""
import logging
from .models import AdminAuditLog

logger = logging.getLogger('transporti')


def get_client_ip(request):
    """Extract client IP, handling proxied requests."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


def log_admin_action(request, action, target_type, target_id, target_label='', details=None):
    """
    Log an admin action to the audit trail.
    
    Args:
        request: DRF request (must have authenticated user)
        action: AdminAuditLog.Action value (e.g. 'USER_SUSPENDED')
        target_type: Type of target ('user', 'dispute', 'document', etc.)
        target_id: ID of the target object
        target_label: Human-readable label (e.g. user email)
        details: Optional dict with additional context
    
    Returns:
        AdminAuditLog instance
    """
    try:
        log_entry = AdminAuditLog.objects.create(
            admin_user=request.user if request.user.is_authenticated else None,
            action=action,
            target_type=target_type,
            target_id=target_id,
            target_label=target_label,
            details=details or {},
            ip_address=get_client_ip(request),
        )

        logger.info(
            f"AUDIT_TRAIL: {action} | admin={request.user.email} "
            f"| target={target_type}:{target_id} ({target_label})"
        )

        return log_entry

    except Exception as e:
        # Audit logging must NEVER break the main action
        logger.error(f"AUDIT_TRAIL_ERROR: Failed to log {action}: {e}")
        return None
