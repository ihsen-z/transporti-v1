"""
Logistics Services - Transporti V1
Trust guard used before a transporter engages (see logistics/kyc.py).

RULES:
- All trust checks logged
- Explicit domain exceptions
- Production-grade logging
- Trust thresholds from TrustPolicy (not hardcoded)
"""
import logging

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
    
    # Rejected AND suspended transporters are fully blocked: an admin
    # override (ALL / ACCEPT_OFFER) lifts a missing verification, never a
    # sanction.
    if profile.verification_status in (VerificationStatus.REJECTED, VerificationStatus.SUSPENDED):
        logger.warning(
            f"TRUST_GUARD_BLOCKED: user_id={user.id}, reason={profile.verification_status.lower()}, "
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


# check_trust_for_escrow / check_trust_for_cod / check_trust_for_visibility,
# accept_offer et can_transporter_submit_offer ont été supprimées : personne ne
# les appelait. Le contrôle KYC réellement appliqué passe par
# logistics/kyc.ensure_transporter_verified, qui réutilise check_transporter_trust.


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
