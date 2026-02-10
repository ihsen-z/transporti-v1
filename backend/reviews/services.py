"""
Reviews Services - Transporti V1
Business logic for review creation, trust binding, and abuse detection.

RULES:
- All reviews must pass validation before creation
- Reviews influence trust_score
- Abuse patterns are detected and logged
- No silent moderation
"""
import logging
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError, PermissionDenied
from decimal import Decimal

from .models import Review, ReviewRole, ReviewAbuseLog

logger = logging.getLogger('transporti')


# =============================================================================
# CONFIGURATION
# =============================================================================

# Review cooldown between reviews by same reviewer
REVIEW_COOLDOWN_HOURS = 1

# Minimum time after job completion before review allowed
MIN_WAIT_AFTER_COMPLETION_MINUTES = 5

# Maximum reviews per reviewer per day
MAX_REVIEWS_PER_DAY = 10

# Trust score weights
TRUST_WEIGHT_BY_RATING = {
    1: -10,  # Very negative impact
    2: -5,   # Negative impact
    3: 0,    # Neutral
    4: +3,   # Positive impact
    5: +5,   # Very positive impact
}

# Suspicious patterns thresholds
SUSPICIOUS_LOW_RATING_THRESHOLD = 3  # If reviewer gives 3+ low ratings in 24h


# =============================================================================
# EXCEPTIONS
# =============================================================================

class ReviewValidationError(Exception):
    """Review validation failed."""
    pass


class ReviewAbuseError(Exception):
    """Review blocked due to abuse detection."""
    pass


class ReviewCooldownError(Exception):
    """Review blocked due to cooldown."""
    pass


# =============================================================================
# REVIEW CREATION
# =============================================================================

@transaction.atomic
def create_review(
    job,
    reviewer,
    rating: int,
    comment: str = "",
    bypass_abuse_check: bool = False
) -> Review:
    """
    Create a review for a completed job.
    
    Args:
        job: TransportJob (must be COMPLETED)
        reviewer: User leaving the review
        rating: 1-5
        comment: Optional text
        bypass_abuse_check: Skip abuse detection (admin only)
    
    Returns:
        Created Review
    
    Raises:
        ReviewValidationError: Invalid review data
        ReviewAbuseError: Abuse pattern detected
        ReviewCooldownError: Cooldown not passed
    """
    from logistics.models import TransportJob
    
    # Determine role and target
    if reviewer == job.client:
        role = ReviewRole.CLIENT
        # Target is the transporter
        try:
            target = job.accepted_offer.transporter
        except AttributeError:
            raise ReviewValidationError("Job has no accepted offer")
    elif hasattr(job, 'accepted_offer') and reviewer == job.accepted_offer.transporter:
        role = ReviewRole.TRANSPORTER
        target = job.client
    else:
        raise ReviewValidationError("Reviewer must be job client or transporter")
    
    # Validate job status
    if job.status != TransportJob.Status.COMPLETED:
        raise ReviewValidationError(f"Cannot review job in status {job.status}")
    
    # Check if review already exists
    if Review.objects.filter(job=job, role=role).exists():
        raise ReviewValidationError(f"Review already submitted for this job as {role}")
    
    # Check cooldown
    check_review_cooldown(reviewer)
    
    # Abuse detection (unless bypassed)
    if not bypass_abuse_check:
        abuse_result = detect_review_abuse(reviewer, target, rating)
        if abuse_result['blocked']:
            raise ReviewAbuseError(abuse_result['reason'])
    
    # Create review
    review = Review.objects.create(
        job=job,
        reviewer=reviewer,
        target=target,
        role=role,
        rating=rating,
        comment=comment[:1000] if comment else ""
    )
    
    # Apply trust impact
    apply_review_to_trust(review)
    
    return review


def check_review_cooldown(reviewer) -> bool:
    """
    Check if reviewer has passed cooldown period.
    
    Raises:
        ReviewCooldownError: If cooldown not passed
    """
    cooldown_threshold = timezone.now() - timedelta(hours=REVIEW_COOLDOWN_HOURS)
    
    recent_review = Review.objects.filter(
        reviewer=reviewer,
        created_at__gt=cooldown_threshold
    ).first()
    
    if recent_review:
        wait_time = (recent_review.created_at + timedelta(hours=REVIEW_COOLDOWN_HOURS)) - timezone.now()
        logger.warning(
            f"REVIEW_COOLDOWN_BLOCKED: reviewer_id={reviewer.id}, "
            f"last_review_at={recent_review.created_at}, wait_minutes={wait_time.seconds // 60}"
        )
        raise ReviewCooldownError(
            f"Please wait {wait_time.seconds // 60} minutes before submitting another review"
        )
    
    # Check daily limit
    day_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_count = Review.objects.filter(
        reviewer=reviewer,
        created_at__gte=day_start
    ).count()
    
    if daily_count >= MAX_REVIEWS_PER_DAY:
        logger.warning(
            f"REVIEW_DAILY_LIMIT: reviewer_id={reviewer.id}, count={daily_count}"
        )
        raise ReviewCooldownError(
            f"Daily review limit ({MAX_REVIEWS_PER_DAY}) reached"
        )
    
    return True


# =============================================================================
# ABUSE DETECTION
# =============================================================================

def detect_review_abuse(reviewer, target, rating: int) -> dict:
    """
    Detect suspicious review patterns.
    
    Returns:
        Dict with 'blocked' (bool) and 'reason' (str)
    """
    result = {'blocked': False, 'reason': '', 'severity': 'LOW'}
    
    # Pattern 1: Multiple low ratings in 24h
    if rating <= 2:
        last_24h = timezone.now() - timedelta(hours=24)
        recent_low_ratings = Review.objects.filter(
            reviewer=reviewer,
            rating__lte=2,
            created_at__gt=last_24h
        ).count()
        
        if recent_low_ratings >= SUSPICIOUS_LOW_RATING_THRESHOLD:
            result = {
                'blocked': True,
                'reason': f"Suspicious pattern: {recent_low_ratings + 1} low ratings in 24 hours",
                'severity': 'HIGH',
                'detector': 'low_rating_spam'
            }
            _log_abuse(None, result['detector'], result['reason'], reviewer.id, target.id, result['severity'])
            return result
    
    # Pattern 2: Reviewer previously flagged
    previous_flags = ReviewAbuseLog.objects.filter(
        reviewer_id=reviewer.id,
        severity__in=['HIGH', 'CRITICAL'],
        created_at__gt=timezone.now() - timedelta(days=7)
    ).count()
    
    if previous_flags >= 2:
        result = {
            'blocked': True,
            'reason': f"Reviewer has {previous_flags} recent abuse flags",
            'severity': 'CRITICAL',
            'detector': 'repeat_offender'
        }
        _log_abuse(None, result['detector'], result['reason'], reviewer.id, target.id, result['severity'])
        return result
    
    # Pattern 3: Revenge reviews (low rating immediately after receiving low rating)
    last_week = timezone.now() - timedelta(days=7)
    received_low = Review.objects.filter(
        target=reviewer,
        reviewer=target,
        rating__lte=2,
        created_at__gt=last_week
    ).exists()
    
    if received_low and rating <= 2:
        result = {
            'blocked': False,  # Don't block, but flag
            'reason': "Possible revenge review detected",
            'severity': 'MEDIUM',
            'detector': 'revenge_pattern'
        }
        _log_abuse(None, result['detector'], result['reason'], reviewer.id, target.id, result['severity'])
        # Don't return blocked, just log
    
    return result


def _log_abuse(review, detector: str, reason: str, reviewer_id: int, target_id: int, severity: str):
    """Create abuse log entry."""
    ReviewAbuseLog.objects.create(
        review=review,
        detector=detector,
        reason=reason,
        reviewer_id=reviewer_id,
        target_id=target_id,
        severity=severity
    )


# =============================================================================
# TRUST SCORE BINDING
# =============================================================================

def apply_review_to_trust(review: Review) -> int:
    """
    Apply review impact to target's trust score.
    
    Returns:
        New trust score
    """
    from trust.models import TrustProfile
    
    if review.trust_impact_applied:
        logger.warning(f"REVIEW_TRUST_ALREADY_APPLIED: review_id={review.id}")
        return None
    
    if review.is_flagged:
        logger.info(f"REVIEW_TRUST_SKIPPED: review_id={review.id}, reason=flagged")
        return None
    
    try:
        profile = TrustProfile.objects.get(user=review.target)
    except TrustProfile.DoesNotExist:
        logger.warning(f"REVIEW_TRUST_NO_PROFILE: review_id={review.id}, target_id={review.target_id}")
        return None
    
    # Calculate impact
    impact = TRUST_WEIGHT_BY_RATING.get(review.rating, 0)
    old_score = profile.trust_score
    
    # Apply with bounds
    new_score = max(0, min(100, old_score + impact))
    profile.trust_score = new_score
    profile.trust_score_updated_at = timezone.now()
    profile.save(update_fields=['trust_score', 'trust_score_updated_at'])
    
    # Mark review as applied
    review.trust_impact_applied = True
    review.save(update_fields=['trust_impact_applied'])
    
    logger.info(
        f"TRUST_SCORE_UPDATED_FROM_REVIEW: review_id={review.id}, target_id={review.target_id}, "
        f"rating={review.rating}, old_score={old_score}, new_score={new_score}, impact={impact}"
    )
    
    # Check for visibility reduction
    check_trust_visibility_reduction(profile)
    
    return new_score


def check_trust_visibility_reduction(profile) -> bool:
    """
    Check if trust score warrants visibility reduction.
    """
    from trust.services import get_applicable_trust_policy
    
    try:
        policy = get_applicable_trust_policy(profile.user)
        min_visibility = policy.min_score_visibility
        
        if profile.trust_score < min_visibility:
            logger.warning(
                f"TRUST_VISIBILITY_REDUCED: user_id={profile.user_id}, "
                f"score={profile.trust_score}, required={min_visibility}, "
                f"explanation=Low trust score due to recent activity"
            )
            return True
    except Exception as e:
        logger.error(f"TRUST_VISIBILITY_CHECK_FAILED: user_id={profile.user_id}, error={str(e)}")
    
    return False


# =============================================================================
# REVIEW QUERIES
# =============================================================================

def get_user_rating_summary(user) -> dict:
    """
    Get rating summary for a user.
    
    Returns:
        Dict with average_rating, total_reviews, rating_distribution
    """
    from django.db.models import Avg, Count
    
    reviews = Review.objects.filter(target=user, is_flagged=False)
    
    aggregates = reviews.aggregate(
        average=Avg('rating'),
        total=Count('id')
    )
    
    distribution = {i: 0 for i in range(1, 6)}
    for item in reviews.values('rating').annotate(count=Count('id')):
        distribution[item['rating']] = item['count']
    
    return {
        'average_rating': round(aggregates['average'] or 0, 1),
        'total_reviews': aggregates['total'] or 0,
        'rating_distribution': distribution
    }


def get_visibility_explanation(user) -> str | None:
    """
    Get client-facing explanation for reduced visibility.
    """
    from trust.models import TrustProfile
    from trust.services import get_applicable_trust_policy
    
    try:
        profile = TrustProfile.objects.get(user=user)
        policy = get_applicable_trust_policy(user)
        
        if profile.trust_score < policy.min_score_visibility:
            return "Low trust score due to recent activity"
    except:
        pass
    
    return None
