"""
Logistics Services - Transporti V1
Business logic for jobs and offers with trust guard enforcement.

RULES:
- All trust checks logged
- Explicit domain exceptions
- Production-grade logging
- Trust thresholds from TrustPolicy (not hardcoded)
"""
import logging
from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied

from .models import TransportJob, Offer
from trust.models import TrustProfile, VerificationStatus

logger = logging.getLogger('transporti')


# =============================================================================
# TRUST GUARD EXCEPTIONS
# =============================================================================

class TrustGuardError(Exception):
    """Base exception for trust guard violations."""
    pass


class TrustProfileMissingError(TrustGuardError):
    """Raised when transporter has no trust profile."""
    pass


class TrustVerificationRequiredError(TrustGuardError):
    """Raised when transporter is not verified."""
    pass


class TrustRejectededError(TrustGuardError):
    """Raised when transporter trust is rejected."""
    pass


class TrustScoreInsufficientError(TrustGuardError):
    """Raised when trust score is too low."""
    pass


# =============================================================================
# TRUST GUARDS
# =============================================================================

def check_transporter_trust(user, require_verified: bool = True, scope: str = None) -> TrustProfile:
    """
    Check transporter trust status.
    
    Args:
        user: Transporter user
        require_verified: If True, requires VERIFIED status
        scope: Optional scope for override check (ESCROW, COD, ACCEPT_OFFER)
    
    Returns:
        TrustProfile if checks pass
    
    Raises:
        TrustProfileMissingError: No trust profile
        TrustRejectedError: Profile is REJECTED
        TrustVerificationRequiredError: Not verified (when required)
    """
    from trust.services_admin import has_active_override
    
    try:
        profile = TrustProfile.objects.get(user=user)
    except TrustProfile.DoesNotExist:
        # Check for override even without profile
        if scope and has_active_override(user, scope):
            logger.info(
                f"TRUST_GUARD_OVERRIDE: user_id={user.id}, scope={scope}, reason=no_profile_but_override"
            )
            # Create minimal profile for override
            profile = TrustProfile.objects.create(user=user)
            return profile
        
        logger.warning(
            f"TRUST_GUARD_BLOCKED: user_id={user.id}, reason=no_profile"
        )
        raise TrustProfileMissingError(
            "Trust profile required. Please complete verification."
        )
    
    # Rejected transporters are fully blocked (NO override allowed for rejected)
    if profile.verification_status == VerificationStatus.REJECTED:
        logger.warning(
            f"TRUST_GUARD_BLOCKED: user_id={user.id}, reason=rejected, "
            f"rejection_reason={profile.rejection_reason[:50] if profile.rejection_reason else 'N/A'}"
        )
        raise TrustRejectededError(
            "Your account has been rejected. Contact support for assistance."
        )
    
    # Check verification requirement (with override support)
    if require_verified and profile.verification_status != VerificationStatus.VERIFIED:
        # Check for active override
        if scope and has_active_override(user, scope):
            logger.info(
                f"TRUST_GUARD_OVERRIDE: user_id={user.id}, scope={scope}, "
                f"status={profile.verification_status}"
            )
            return profile
        
        logger.warning(
            f"TRUST_GUARD_BLOCKED: user_id={user.id}, reason=not_verified, "
            f"current_status={profile.verification_status}"
        )
        raise TrustVerificationRequiredError(
            f"Verification required. Current status: {profile.verification_status}"
        )
    
    logger.debug(f"TRUST_GUARD_PASSED: user_id={user.id}, status={profile.verification_status}")
    
    return profile


def check_trust_for_escrow(user) -> TrustProfile:
    """
    Check if transporter can participate in escrow jobs.
    Uses TrustPolicy for thresholds (override supported).
    
    Returns:
        TrustProfile if eligible
    
    Raises:
        TrustScoreInsufficientError: If score below policy threshold
    """
    from trust.services import get_applicable_trust_policy
    from trust.services_admin import has_active_override
    
    profile = check_transporter_trust(user, require_verified=True, scope='ESCROW')
    
    # Get policy thresholds
    policy = get_applicable_trust_policy(user)
    min_score = policy.min_score_escrow
    
    if min_score > 0 and profile.trust_score < min_score:
        # Check for ESCROW override
        if has_active_override(user, 'ESCROW'):
            logger.info(
                f"TRUST_GUARD_OVERRIDE: user_id={user.id}, scope=ESCROW, "
                f"score={profile.trust_score}, required={min_score}"
            )
            return profile
        
        logger.warning(
            f"TRUST_POLICY_BLOCKED_ACTION: user_id={user.id}, action=escrow, "
            f"score={profile.trust_score}, required={min_score}, policy={policy.name}"
        )
        raise TrustScoreInsufficientError(
            f"Trust score of {min_score} required for escrow jobs (policy: {policy.name}). "
            f"Your current score: {profile.trust_score}"
        )
    
    logger.debug(
        f"TRUST_GUARD_PASSED: user_id={user.id}, type=escrow, score={profile.trust_score}"
    )
    
    return profile


def check_trust_for_cod(user) -> TrustProfile:
    """
    Check if transporter can participate in COD jobs.
    Uses TrustPolicy for thresholds (override supported).
    
    Returns:
        TrustProfile if eligible
    
    Raises:
        TrustScoreInsufficientError: Score below policy threshold
    """
    from trust.services import get_applicable_trust_policy
    from trust.services_admin import has_active_override
    
    profile = check_transporter_trust(user, require_verified=True, scope='COD')
    
    # Get policy thresholds
    policy = get_applicable_trust_policy(user)
    min_score = policy.min_score_cod
    
    if profile.trust_score < min_score:
        # Check for COD override
        if has_active_override(user, 'COD'):
            logger.info(
                f"TRUST_GUARD_OVERRIDE: user_id={user.id}, scope=COD, "
                f"score={profile.trust_score}, required={min_score}"
            )
            return profile
        
        logger.warning(
            f"TRUST_POLICY_BLOCKED_ACTION: user_id={user.id}, action=cod, "
            f"score={profile.trust_score}, required={min_score}, policy={policy.name}"
        )
        raise TrustScoreInsufficientError(
            f"Trust score of {min_score} required for COD jobs (policy: {policy.name}). "
            f"Your current score: {profile.trust_score}"
        )
    
    logger.debug(
        f"TRUST_GUARD_PASSED: user_id={user.id}, type=cod, score={profile.trust_score}"
    )
    
    return profile


def check_trust_for_visibility(user) -> tuple[TrustProfile, bool]:
    """
    Check if transporter meets visibility threshold.
    Uses TrustPolicy for thresholds.
    
    Returns:
        Tuple of (TrustProfile, is_visible)
    """
    from trust.services import get_applicable_trust_policy
    
    try:
        profile = TrustProfile.objects.get(user=user)
    except TrustProfile.DoesNotExist:
        return None, False
    
    # Get policy thresholds
    policy = get_applicable_trust_policy(user)
    min_score = policy.min_score_visibility
    
    is_visible = (
        profile.verification_status == VerificationStatus.VERIFIED and
        profile.trust_score >= min_score
    )
    
    if not is_visible:
        logger.debug(
            f"TRUST_VISIBILITY_BLOCKED: user_id={user.id}, "
            f"score={profile.trust_score}, required={min_score}"
        )
    
    return profile, is_visible


# =============================================================================
# JOB ACCEPTANCE LOGIC
# =============================================================================

@transaction.atomic
def accept_offer(offer: Offer, client_user) -> tuple[TransportJob, Offer]:
    """
    Accept an offer with trust guard enforcement.
    
    Args:
        offer: The offer to accept
        client_user: The client accepting the offer
    
    Returns:
        Tuple of (updated job, accepted offer)
    
    Raises:
        PermissionDenied: If client doesn't own job
        ValidationError: If job/offer state invalid
        TrustGuardError: If transporter trust check fails
    """
    job = offer.job
    transporter = offer.transporter
    
    # Ownership check
    if job.owner != client_user:
        raise PermissionDenied("You do not own this job.")
    
    # State checks
    if job.status != TransportJob.Status.PUBLISHED:
        raise ValidationError(f"Job is not available. Current status: {job.status}")
    
    if offer.status != Offer.Status.PENDING:
        raise ValidationError(f"Offer is not available. Current status: {offer.status}")
    
    # === TRUST GUARD (with override support) ===
    # Check transporter trust before accepting
    try:
        trust_profile = check_transporter_trust(transporter, require_verified=True, scope='ACCEPT_OFFER')
        logger.info(
            f"TRUST_GUARD_PASSED: offer_acceptance, user_id={transporter.id}, "
            f"job_id={job.id}, score={trust_profile.trust_score}"
        )
    except TrustGuardError as e:
        logger.error(
            f"TRUST_GUARD_BLOCKED: offer_acceptance, user_id={transporter.id}, "
            f"job_id={job.id}, error={str(e)}"
        )
        raise
    
    # Accept offer
    offer.status = Offer.Status.ACCEPTED
    offer.save()
    
    # Reject other offers
    Offer.objects.filter(job=job).exclude(id=offer.id).update(
        status=Offer.Status.REJECTED
    )
    
    # Update job status
    job.status = TransportJob.Status.IN_PROGRESS
    job.save()
    
    logger.info(
        f"OFFER_ACCEPTED: offer_id={offer.id}, job_id={job.id}, "
        f"transporter_id={transporter.id}"
    )
    
    return job, offer


def can_transporter_submit_offer(user, job: TransportJob) -> tuple[bool, str]:
    """
    Check if transporter can submit an offer for a job.
    
    Returns:
        Tuple of (can_submit, reason_if_blocked)
    """
    # Check trust profile
    try:
        profile = check_transporter_trust(user, require_verified=True)
    except TrustGuardError as e:
        return False, str(e)
    
    # Check active offer limit
    active_offers = Offer.objects.filter(
        transporter=user,
        status='PENDING'
    ).count()
    
    if active_offers >= 3:
        return False, "Maximum 3 active offers allowed."
    
    # Check existing offer on this job
    if Offer.objects.filter(job=job, transporter=user).exists():
        return False, "You already submitted an offer for this job."
    
    return True, ""


def get_transporter_trust_badge(user) -> dict:
    """
    Get trust badge data for client-facing offer listings.
    
    Returns:
        Dict with verification_status, trust_score, is_verified
    """
    try:
        profile = TrustProfile.objects.get(user=user)
        return {
            'verification_status': profile.verification_status,
            'trust_score': profile.trust_score,
            'is_verified': profile.is_verified,
        }
    except TrustProfile.DoesNotExist:
        return {
            'verification_status': 'NO_PROFILE',
            'trust_score': 0,
            'is_verified': False,
        }
