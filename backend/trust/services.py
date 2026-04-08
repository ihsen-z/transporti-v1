"""
Trust Services - Transporti V1
Business logic for trust profile management and verification.

RULES:
- All operations atomic where needed
- Trust score synced from analytics (read-only from analytics perspective)
- RBAC enforced at service layer
- Production-grade logging
"""
import logging
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache
from django.core.exceptions import ValidationError, PermissionDenied

from .models import TrustProfile, TrustVerificationRequest, VerificationStatus, RequestStatus, TrustPolicy, PolicyCategory

logger = logging.getLogger('transporti')


# =============================================================================
# TRUST POLICY RESOLUTION
# =============================================================================

POLICY_CACHE_PREFIX = 'trust_policy:'
POLICY_CACHE_TTL = 60  # seconds


class TrustPolicyConfigurationError(Exception):
    """Raised when no valid trust policy can be resolved."""
    pass


def _get_user_segment(user) -> str | None:
    """
    Determine user's policy segment from analytics or profile.
    
    Returns:
        PolicyCategory value (VIP, PARTNER) or None for default
    """
    try:
        from analytics.models import DailyUserSnapshot
        
        # Get latest snapshot with segments
        snapshot = DailyUserSnapshot.objects.filter(
            user=user
        ).order_by('-date').first()
        
        if snapshot and snapshot.segments:
            # Check for VIP or PARTNER segment flags
            if snapshot.segments.get('is_vip'):
                return PolicyCategory.VIP
            if snapshot.segments.get('is_partner'):
                return PolicyCategory.PARTNER
        
        return None
    except Exception as e:
        logger.warning(f"TRUST_SEGMENT_CHECK_FAILED: user_id={user.id}, error={str(e)}")
        return None


def get_applicable_trust_policy(user) -> TrustPolicy:
    """
    Resolve the applicable trust policy for a user.
    
    Rules:
    - If user has segment (VIP, PARTNER) → use matching active policy
    - Else fallback to DEFAULT
    - If none found → raise configuration error + log
    
    Caching: 60 second TTL
    
    Args:
        user: User instance
    
    Returns:
        TrustPolicy instance
    
    Raises:
        TrustPolicyConfigurationError: If no valid policy found
    """
    cache_key = f"{POLICY_CACHE_PREFIX}{user.id}"
    
    # Check cache first
    cached_policy_id = cache.get(cache_key)
    if cached_policy_id:
        try:
            policy = TrustPolicy.objects.get(id=cached_policy_id, is_active=True)
            logger.debug(f"TRUST_POLICY_CACHE_HIT: user_id={user.id}, policy_id={policy.id}")
            return policy
        except TrustPolicy.DoesNotExist:
            # Cache invalid, continue to resolve
            cache.delete(cache_key)
    
    # Determine user segment
    segment = _get_user_segment(user)
    
    # Try to get policy for segment
    if segment:
        try:
            policy = TrustPolicy.objects.get(applies_to=segment, is_active=True)
            cache.set(cache_key, policy.id, timeout=POLICY_CACHE_TTL)
            
            logger.info(
                f"TRUST_POLICY_RESOLVED: user_id={user.id}, segment={segment}, "
                f"policy_id={policy.id}, policy_name={policy.name}"
            )
            return policy
        except TrustPolicy.DoesNotExist:
            logger.info(
                f"TRUST_POLICY_FALLBACK_DEFAULT: user_id={user.id}, "
                f"requested_segment={segment}, reason=no_active_policy"
            )
    
    # Fallback to DEFAULT
    try:
        policy = TrustPolicy.get_active_policy(PolicyCategory.DEFAULT)
        cache.set(cache_key, policy.id, timeout=POLICY_CACHE_TTL)
        
        if segment:
            logger.info(
                f"TRUST_POLICY_FALLBACK_DEFAULT: user_id={user.id}, "
                f"original_segment={segment}"
            )
        else:
            logger.debug(
                f"TRUST_POLICY_RESOLVED: user_id={user.id}, segment=DEFAULT, "
                f"policy_id={policy.id}"
            )
        
        return policy
    except Exception as e:
        logger.error(
            f"TRUST_POLICY_CONFIGURATION_ERROR: user_id={user.id}, error={str(e)}"
        )
        raise TrustPolicyConfigurationError(
            "No valid trust policy configured. Contact system administrator."
        )


def invalidate_policy_cache(user_id: int = None) -> None:
    """Invalidate policy cache for user or all users."""
    if user_id:
        cache.delete(f"{POLICY_CACHE_PREFIX}{user_id}")
    # Note: For full cache invalidation, would need cache.clear() or pattern delete


# =============================================================================
# TRUST PROFILE MANAGEMENT
# =============================================================================


def get_or_create_trust_profile(user) -> TrustProfile:
    """
    Get or create TrustProfile for a transporter.
    
    Args:
        user: User instance (must be TRANSPORTER role)
    
    Returns:
        TrustProfile instance
    
    Raises:
        ValidationError: If user is not a transporter
    """
    if user.role != 'TRANSPORTER':
        raise ValidationError("Trust profiles are only for transporters.")
    
    profile, created = TrustProfile.objects.get_or_create(user=user)
    
    if created:
        logger.info(f"TRUST_PROFILE_CREATED: user_id={user.id}")
    
    return profile


def sync_trust_score(user) -> int:
    """
    Sync trust score from analytics module.
    Updates the cached trust_score on TrustProfile.
    
    Args:
        user: User instance
    
    Returns:
        Updated trust score (0-100)
    """
    from analytics.services import get_user_trust_score
    
    profile = get_or_create_trust_profile(user)
    
    # Pull score from analytics
    score = get_user_trust_score(user)
    
    # Update cached value
    profile.trust_score = score
    profile.trust_score_updated_at = timezone.now()
    profile.save(update_fields=['trust_score', 'trust_score_updated_at'])
    
    logger.debug(f"TRUST_SCORE_SYNCED: user_id={user.id}, score={score}")
    
    return score


def can_transporter_accept_job(user) -> bool:
    """
    Check if transporter can accept jobs.
    Must be verified to accept jobs.
    
    Args:
        user: User instance
    
    Returns:
        True if transporter can accept jobs
    """
    if user.role != 'TRANSPORTER':
        return False
    
    try:
        profile = TrustProfile.objects.get(user=user)
        return profile.can_accept_jobs
    except TrustProfile.DoesNotExist:
        return False


def get_transporter_trust_status(user) -> dict:
    """
    Get comprehensive trust status for a transporter.
    
    Returns dict with:
        - verification_status
        - trust_score
        - is_verified
        - can_accept_jobs
        - pending_request
    """
    try:
        profile = TrustProfile.objects.get(user=user)
    except TrustProfile.DoesNotExist:
        return {
            'verification_status': 'NO_PROFILE',
            'trust_score': 0,
            'is_verified': False,
            'can_accept_jobs': False,
            'pending_request': False,
        }
    
    pending_request = TrustVerificationRequest.objects.filter(
        trust_profile=profile,
        status=RequestStatus.PENDING
    ).exists()
    
    return {
        'verification_status': profile.verification_status,
        'trust_score': profile.trust_score,
        'is_verified': profile.is_verified,
        'can_accept_jobs': profile.can_accept_jobs,
        'verified_at': profile.verified_at,
        'pending_request': pending_request,
    }


@transaction.atomic
def submit_verification_request(user, document_type: str, document_file) -> TrustVerificationRequest:
    """
    Submit a verification request.
    
    Args:
        user: Transporter user
        document_type: Type of document being submitted
        document_file: Uploaded file
    
    Returns:
        Created TrustVerificationRequest
    
    Raises:
        ValidationError: If already has pending request or invalid
    """
    profile = get_or_create_trust_profile(user)
    
    # Check for existing pending request
    existing = TrustVerificationRequest.objects.filter(
        trust_profile=profile,
        status=RequestStatus.PENDING
    ).exists()
    
    if existing:
        raise ValidationError("You already have a pending verification request.")
    
    # Create request
    request = TrustVerificationRequest.objects.create(
        trust_profile=profile,
        document_type=document_type,
        document_file=document_file

    )
    
    # Update profile status
    profile.mark_pending()
    
    logger.info(
        f"TRUST_VERIFICATION_SUBMITTED: request_id={request.id}, "
        f"user_id={user.id}, document_type={document_type}"
    )
    
    return request


def _require_admin(user) -> None:
    """Raise PermissionDenied if user is not admin."""
    if user.role != 'ADMIN':
        logger.warning(f"TRUST_ADMIN_ACCESS_DENIED: user_id={user.id}, role={user.role}")
        raise PermissionDenied("Only admins can perform this action.")


@transaction.atomic
def approve_verification_request(request_id: int, admin_user, notes: str = '') -> TrustVerificationRequest:
    """
    Admin approves a verification request.
    
    Args:
        request_id: TrustVerificationRequest ID
        admin_user: Admin user
        notes: Optional approval notes
    
    Returns:
        Updated request
    """
    _require_admin(admin_user)
    
    try:
        request = TrustVerificationRequest.objects.select_for_update().get(id=request_id)
    except TrustVerificationRequest.DoesNotExist:
        raise ValidationError(f"Verification request {request_id} not found.")
    
    if request.status != RequestStatus.PENDING:
        raise ValidationError(f"Request is not in PENDING status (current: {request.status})")
    
    request.approve(admin_user, notes)
    
    return request


@transaction.atomic
def reject_verification_request(request_id: int, admin_user, reason: str) -> TrustVerificationRequest:
    """
    Admin rejects a verification request.
    
    Args:
        request_id: TrustVerificationRequest ID
        admin_user: Admin user
        reason: Rejection reason (required)
    
    Returns:
        Updated request
    """
    _require_admin(admin_user)
    
    if not reason or len(reason.strip()) < 10:
        raise ValidationError("Rejection reason required (minimum 10 characters).")
    
    try:
        request = TrustVerificationRequest.objects.select_for_update().get(id=request_id)
    except TrustVerificationRequest.DoesNotExist:
        raise ValidationError(f"Verification request {request_id} not found.")
    
    if request.status != RequestStatus.PENDING:
        raise ValidationError(f"Request is not in PENDING status (current: {request.status})")
    
    request.reject(admin_user, reason)
    
    return request


def get_pending_verification_requests() -> list:
    """Get all pending verification requests for admin review."""
    return list(
        TrustVerificationRequest.objects.filter(
            status=RequestStatus.PENDING
        ).select_related('trust_profile__user').order_by('submitted_at')
    )


def get_user_verification_history(user) -> list:
    """Get verification request history for a user."""
    try:
        profile = TrustProfile.objects.get(user=user)
    except TrustProfile.DoesNotExist:
        return []
    
    return list(
        TrustVerificationRequest.objects.filter(
            trust_profile=profile
        ).order_by('-submitted_at')
    )


# =============================================================================
# PER-DOCUMENT VERIFICATION RECALCULATION
# =============================================================================

def recalculate_profile_status(trust_profile) -> str:
    """
    Recalculate TrustProfile.verification_status based on individual document states.

    Rules:
    - All docs is_valid=True                         → VERIFIED
    - Any doc with non-empty rejection_reason         → REJECTED
    - Some docs reviewed (mix valid/pending)          → PARTIALLY_REVIEWED
    - No docs or none reviewed yet                    → keep current status

    NON-DESTRUCTIVE: Uses existing TrustProfile methods (mark_verified, mark_rejected).
    Returns the new status string.
    """
    from .models import VerificationDocument, VerificationStatus

    docs = VerificationDocument.objects.filter(profile=trust_profile)
    total = docs.count()

    if total == 0:
        return trust_profile.verification_status

    approved_count = docs.filter(is_valid=True).count()
    rejected = docs.filter(is_valid=False).exclude(rejection_reason='')
    rejected_count = rejected.count()
    pending_count = total - approved_count - rejected_count

    # Rule 1: Any rejection → REJECTED
    if rejected_count > 0:
        reason = rejected.first().rejection_reason
        trust_profile.mark_rejected(reason)
        logger.info(
            f"DOC_REVIEW_RECALC: user_id={trust_profile.user_id}, "
            f"result=REJECTED, approved={approved_count}, rejected={rejected_count}, pending={pending_count}"
        )
        return 'REJECTED'

    # Rule 2: All approved → VERIFIED
    if approved_count == total:
        trust_profile.mark_verified()
        logger.info(
            f"DOC_REVIEW_RECALC: user_id={trust_profile.user_id}, "
            f"result=VERIFIED, all {total} documents approved"
        )
        return 'VERIFIED'

    # Rule 3: Some approved but not all → PARTIALLY_REVIEWED
    if approved_count > 0 and pending_count > 0:
        trust_profile.verification_status = VerificationStatus.PARTIALLY_REVIEWED
        trust_profile.save(update_fields=['verification_status', 'updated_at'])
        logger.info(
            f"DOC_REVIEW_RECALC: user_id={trust_profile.user_id}, "
            f"result=PARTIALLY_REVIEWED, approved={approved_count}, pending={pending_count}"
        )
        return 'PARTIALLY_REVIEWED'

    # Rule 4: None reviewed yet → keep current
    return trust_profile.verification_status

