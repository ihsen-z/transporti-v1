"""
Trust Admin Services - Transporti V1
Admin-controlled trust moderation with strict security and auditability.

RULES:
- All actions require ADMIN or MODERATOR role
- All operations are atomic
- All actions logged to TrustActionLog (immutable)
- Security events logged
- Business impact applied immediately
"""
import logging
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError, PermissionDenied

from .models import (
    TrustProfile, TrustActionLog, TrustActionType, 
    VerificationStatus, TrustVerificationRequest
)
from users.models import User

logger = logging.getLogger('transporti.security')


# =============================================================================
# RBAC HELPERS
# =============================================================================

def _require_admin_or_moderator(user) -> None:
    """Raise PermissionDenied if user is not ADMIN or MODERATOR."""
    if user.role not in ['ADMIN', 'MODERATOR']:
        logger.warning(
            f"TRUST_ADMIN_ACCESS_DENIED: user_id={user.id}, role={user.role}"
        )
        raise PermissionDenied("Only admins or moderators can perform trust actions.")


def _create_action_log(
    admin,
    target_user,
    action: str,
    previous_status: str,
    new_status: str,
    reason: str = '',
    metadata: dict = None,
    ip_address: str = None
) -> TrustActionLog:
    """Create immutable audit log entry."""
    return TrustActionLog.objects.create(
        admin=admin,
        admin_email=admin.email,
        user=target_user,
        user_email=target_user.email,
        action=action,
        previous_status=previous_status,
        new_status=new_status,
        reason=reason,
        metadata=metadata or {},
        ip_address=ip_address
    )


# =============================================================================
# ADMIN TRUST CONTROL FUNCTIONS
# =============================================================================

@transaction.atomic
def verify_user(
    admin,
    target_user: User,
    reason: str = '',
    ip_address: str = None
) -> TrustProfile:
    """
    Admin verifies a transporter.
    
    Args:
        admin: Admin/moderator user
        target_user: User to verify
        reason: Optional verification reason
        ip_address: Request IP for audit
    
    Returns:
        Updated TrustProfile
    
    Raises:
        PermissionDenied: If not admin/moderator
        ValidationError: If user is not a transporter or already verified
    """
    _require_admin_or_moderator(admin)
    
    if target_user.role != 'TRANSPORTER':
        raise ValidationError("Only transporters can be verified.")
    
    try:
        profile = TrustProfile.objects.select_for_update().get(user=target_user)
    except TrustProfile.DoesNotExist:
        # Create profile if missing
        profile = TrustProfile.objects.create(user=target_user)
    
    if profile.verification_status == VerificationStatus.VERIFIED:
        raise ValidationError("User is already verified.")
    
    previous_status = profile.verification_status
    
    # Update profile
    profile.verification_status = VerificationStatus.VERIFIED
    profile.verified_at = timezone.now()
    profile.rejection_reason = None
    profile.save()
    
    # Create audit log
    _create_action_log(
        admin=admin,
        target_user=target_user,
        action=TrustActionType.VERIFY,
        previous_status=previous_status,
        new_status=VerificationStatus.VERIFIED,
        reason=reason,
        ip_address=ip_address
    )
    
    # Sync trust score
    _sync_trust_score_safe(target_user)
    
    logger.info(
        f"TRUST_ADMIN_VERIFY: admin_id={admin.id}, user_id={target_user.id}, "
        f"previous_status={previous_status}"
    )
    
    return profile


@transaction.atomic
def reject_user(
    admin,
    target_user: User,
    reason: str,
    ip_address: str = None
) -> TrustProfile:
    """
    Admin rejects a transporter's verification.
    
    Args:
        admin: Admin/moderator user
        target_user: User to reject
        reason: Rejection reason (required)
        ip_address: Request IP for audit
    
    Returns:
        Updated TrustProfile
    """
    _require_admin_or_moderator(admin)
    
    if not reason or len(reason.strip()) < 10:
        raise ValidationError("Rejection reason required (minimum 10 characters).")
    
    if target_user.role != 'TRANSPORTER':
        raise ValidationError("Only transporters can be rejected.")
    
    try:
        profile = TrustProfile.objects.select_for_update().get(user=target_user)
    except TrustProfile.DoesNotExist:
        profile = TrustProfile.objects.create(user=target_user)
    
    previous_status = profile.verification_status
    
    # Update profile
    profile.verification_status = VerificationStatus.REJECTED
    profile.rejection_reason = reason
    profile.verified_at = None
    profile.save()
    
    # Create audit log
    _create_action_log(
        admin=admin,
        target_user=target_user,
        action=TrustActionType.REJECT,
        previous_status=previous_status,
        new_status=VerificationStatus.REJECTED,
        reason=reason,
        ip_address=ip_address
    )
    
    # Revoke sessions and block business actions
    _handle_trust_downgrade(target_user, reason)
    
    logger.info(
        f"TRUST_ADMIN_REJECT: admin_id={admin.id}, user_id={target_user.id}, "
        f"previous_status={previous_status}, reason={reason[:50]}"
    )
    
    return profile


@transaction.atomic
def suspend_user(
    admin,
    target_user: User,
    reason: str,
    ip_address: str = None
) -> TrustProfile:
    """
    Admin suspends a transporter.
    
    Args:
        admin: Admin/moderator user
        target_user: User to suspend
        reason: Suspension reason (required)
        ip_address: Request IP for audit
    
    Returns:
        Updated TrustProfile
    """
    _require_admin_or_moderator(admin)
    
    if not reason or len(reason.strip()) < 10:
        raise ValidationError("Suspension reason required (minimum 10 characters).")
    
    if target_user.role != 'TRANSPORTER':
        raise ValidationError("Only transporters can be suspended.")
    
    try:
        profile = TrustProfile.objects.select_for_update().get(user=target_user)
    except TrustProfile.DoesNotExist:
        raise ValidationError("User has no trust profile.")
    
    if profile.verification_status == VerificationStatus.SUSPENDED:
        raise ValidationError("User is already suspended.")
    
    previous_status = profile.verification_status
    
    # Update profile
    profile.verification_status = VerificationStatus.SUSPENDED
    profile.rejection_reason = reason
    profile.save()
    
    # Create audit log
    _create_action_log(
        admin=admin,
        target_user=target_user,
        action=TrustActionType.SUSPEND,
        previous_status=previous_status,
        new_status=VerificationStatus.SUSPENDED,
        reason=reason,
        ip_address=ip_address
    )
    
    # Revoke sessions and block business actions
    _handle_trust_downgrade(target_user, reason)
    
    logger.warning(
        f"TRUST_ADMIN_SUSPEND: admin_id={admin.id}, user_id={target_user.id}, "
        f"previous_status={previous_status}, reason={reason[:50]}"
    )
    
    return profile


@transaction.atomic
def restore_user(
    admin,
    target_user: User,
    reason: str = '',
    restore_to: str = VerificationStatus.VERIFIED,
    ip_address: str = None
) -> TrustProfile:
    """
    Admin restores a suspended/rejected transporter.
    
    Args:
        admin: Admin/moderator user
        target_user: User to restore
        reason: Optional restoration reason
        restore_to: Status to restore to (VERIFIED or UNVERIFIED)
        ip_address: Request IP for audit
    
    Returns:
        Updated TrustProfile
    """
    _require_admin_or_moderator(admin)
    
    if target_user.role != 'TRANSPORTER':
        raise ValidationError("Only transporters can be restored.")
    
    if restore_to not in [VerificationStatus.VERIFIED, VerificationStatus.UNVERIFIED]:
        raise ValidationError("Can only restore to VERIFIED or UNVERIFIED status.")
    
    try:
        profile = TrustProfile.objects.select_for_update().get(user=target_user)
    except TrustProfile.DoesNotExist:
        raise ValidationError("User has no trust profile.")
    
    if profile.verification_status not in [VerificationStatus.SUSPENDED, VerificationStatus.REJECTED]:
        raise ValidationError(
            f"Can only restore suspended or rejected users. Current status: {profile.verification_status}"
        )
    
    previous_status = profile.verification_status
    
    # Update profile
    profile.verification_status = restore_to
    profile.rejection_reason = None
    if restore_to == VerificationStatus.VERIFIED:
        profile.verified_at = timezone.now()
    profile.save()
    
    # Create audit log
    _create_action_log(
        admin=admin,
        target_user=target_user,
        action=TrustActionType.RESTORE,
        previous_status=previous_status,
        new_status=restore_to,
        reason=reason,
        ip_address=ip_address
    )
    
    # Sync trust score
    _sync_trust_score_safe(target_user)
    
    logger.info(
        f"TRUST_ADMIN_RESTORE: admin_id={admin.id}, user_id={target_user.id}, "
        f"previous_status={previous_status}, new_status={restore_to}"
    )
    
    return profile


# =============================================================================
# BUSINESS IMPACT HANDLERS
# =============================================================================

def _handle_trust_downgrade(target_user: User, reason: str) -> None:
    """
    Handle trust downgrade (reject/suspend).
    - Revoke active sessions
    - Log security event
    """
    # Revoke sessions
    from analytics.models import UserSession
    
    active_sessions = UserSession.objects.filter(
        user=target_user,
        ended_at__isnull=True
    )
    
    for session in active_sessions:
        session.close_session()
    
    session_count = active_sessions.count()
    
    if session_count > 0:
        logger.warning(
            f"TRUST_SESSIONS_REVOKED: user_id={target_user.id}, "
            f"sessions_closed={session_count}, reason={reason[:50]}"
        )


def _sync_trust_score_safe(user: User) -> None:
    """Sync trust score from analytics, safe wrapper."""
    try:
        from trust.services import sync_trust_score
        sync_trust_score(user)
    except Exception as e:
        logger.error(f"TRUST_SCORE_SYNC_FAILED: user_id={user.id}, error={str(e)}")


# =============================================================================
# QUERY HELPERS (ADMIN)
# =============================================================================

def get_users_with_trust_data(
    status_filter: str = None,
    limit: int = 50
) -> list:
    """
    Get users with their trust data for admin listing.
    
    Args:
        status_filter: Optional filter by verification status
        limit: Max results
    
    Returns:
        List of TrustProfile with user data
    """
    queryset = TrustProfile.objects.select_related('user').order_by('-updated_at')
    
    if status_filter:
        queryset = queryset.filter(verification_status=status_filter)
    
    return list(queryset[:limit])


def get_user_trust_history(user: User, limit: int = 50) -> list:
    """Get trust action history for a user."""
    return list(
        TrustActionLog.objects.filter(
            user=user
        ).select_related('admin').order_by('-created_at')[:limit]
    )


def get_trust_profile_detail(user: User) -> dict:
    """Get comprehensive trust detail for a user."""
    try:
        profile = TrustProfile.objects.get(user=user)
    except TrustProfile.DoesNotExist:
        return None
    
    # Get pending verification request
    pending_request = TrustVerificationRequest.objects.filter(
        trust_profile=profile,
        status='PENDING'
    ).first()
    
    # Get history
    history = get_user_trust_history(user, limit=10)
    
    return {
        'profile': profile,
        'pending_request': pending_request,
        'history': history,
    }


# =============================================================================
# TRUST OVERRIDE SERVICES
# =============================================================================

@transaction.atomic
def grant_override(
    admin,
    target_user: User,
    scope: str,
    duration_hours: int,
    reason: str,
    ip_address: str = None
) -> 'TrustOverride':
    """
    Grant a trust override to a user.
    
    Args:
        admin: Admin/moderator user
        target_user: User to grant override
        scope: Override scope (ESCROW, COD, ACCEPT_OFFER, ALL)
        duration_hours: How long the override is valid
        reason: Reason for override (required)
        ip_address: Request IP for audit
    
    Returns:
        Created TrustOverride
    """
    from .models import TrustOverride, OverrideScope
    
    _require_admin_or_moderator(admin)
    
    if target_user.role != 'TRANSPORTER':
        raise ValidationError("Overrides can only be granted to transporters.")
    
    if not reason or len(reason.strip()) < 10:
        raise ValidationError("Override reason required (minimum 10 characters).")
    
    if scope not in [s.value for s in OverrideScope]:
        raise ValidationError(f"Invalid scope. Must be one of: {', '.join([s.value for s in OverrideScope])}")
    
    if duration_hours < 1 or duration_hours > 720:  # Max 30 days
        raise ValidationError("Duration must be between 1 and 720 hours (30 days).")
    
    # Calculate expiry
    expires_at = timezone.now() + timezone.timedelta(hours=duration_hours)
    
    # Create override
    override = TrustOverride.objects.create(
        user=target_user,
        scope=scope,
        granted_by=admin,
        granted_by_email=admin.email,
        reason=reason,
        expires_at=expires_at
    )
    
    logger.info(
        f"TRUST_OVERRIDE_GRANTED: override_id={override.id}, user_id={target_user.id}, "
        f"scope={scope}, duration_hours={duration_hours}, admin_id={admin.id}"
    )
    
    return override


@transaction.atomic
def revoke_override(
    admin,
    override_id: int,
    reason: str,
    ip_address: str = None
) -> 'TrustOverride':
    """
    Revoke an active trust override.
    
    Args:
        admin: Admin/moderator user
        override_id: ID of override to revoke
        reason: Revocation reason
        ip_address: Request IP for audit
    
    Returns:
        Revoked TrustOverride
    """
    from .models import TrustOverride
    
    _require_admin_or_moderator(admin)
    
    if not reason or len(reason.strip()) < 10:
        raise ValidationError("Revocation reason required (minimum 10 characters).")
    
    try:
        override = TrustOverride.objects.select_for_update().get(id=override_id)
    except TrustOverride.DoesNotExist:
        raise ValidationError(f"Override {override_id} not found.")
    
    if override.revoked:
        raise ValidationError("Override has already been revoked.")
    
    if override.is_expired:
        raise ValidationError("Override has already expired.")
    
    # Revoke using model method
    override.revoke(admin, reason)
    
    return override


def has_active_override(user: User, scope: str) -> bool:
    """
    Check if user has an active override for given scope.
    
    Args:
        user: User to check
        scope: Scope to check (ESCROW, COD, ACCEPT_OFFER)
    
    Returns:
        True if active override exists
    """
    from .models import TrustOverride, OverrideScope
    
    now = timezone.now()
    
    # Check for specific scope or ALL override
    active_override = TrustOverride.objects.filter(
        user=user,
        revoked=False,
        expires_at__gt=now
    ).filter(
        models.Q(scope=scope) | models.Q(scope=OverrideScope.ALL)
    ).exists()
    
    return active_override


def get_active_override(user: User, scope: str) -> 'TrustOverride | None':
    """
    Get active override for user and scope.
    
    Returns:
        TrustOverride if exists, None otherwise
    """
    from .models import TrustOverride, OverrideScope
    
    now = timezone.now()
    
    return TrustOverride.objects.filter(
        user=user,
        revoked=False,
        expires_at__gt=now
    ).filter(
        models.Q(scope=scope) | models.Q(scope=OverrideScope.ALL)
    ).first()


def get_user_overrides(user: User, include_expired: bool = False) -> list:
    """Get all overrides for a user."""
    from .models import TrustOverride
    
    queryset = TrustOverride.objects.filter(user=user).order_by('-granted_at')
    
    if not include_expired:
        queryset = queryset.filter(
            revoked=False,
            expires_at__gt=timezone.now()
        )
    
    return list(queryset[:50])
