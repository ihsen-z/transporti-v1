"""
Client Trust Score — Transporti V1
Calculates a trust/reputation score for CLIENT users.
Visible by both client and transporters (per business decision).

Algorithm (0-100):
- Complete profile: +20 pts
- Jobs completed: +5 pts per job (max 30)
- Average rating >= 4.0: +20 pts
- Account age > 3 months: +10 pts
- Phone verified (phone present): +10 pts
- No active disputes: +10 pts
"""
from django.utils import timezone
from datetime import timedelta


def compute_client_trust_score(user) -> dict:
    """
    Compute trust score for a client user.

    Args:
        user: User instance (pre-annotated preferred)

    Returns:
        dict with: score (int), breakdown (dict), label (str)
    """
    score = 0
    breakdown = {}

    # 1. Profile completeness (+20 max)
    has_avatar = False
    has_bio = False
    has_address = False
    try:
        profile = user.profile
        has_avatar = bool(profile.avatar or profile.avatar_url)
        has_bio = bool(profile.bio and len(profile.bio) > 10)
        has_address = bool(profile.address_summary)
    except Exception:
        pass

    profile_pts = 0
    if has_avatar:
        profile_pts += 7
    if has_bio:
        profile_pts += 7
    if has_address:
        profile_pts += 6
    score += profile_pts
    breakdown['profile_complete'] = profile_pts

    # 2. Jobs completed (+5 per job, max 30)
    completed = getattr(user, '_completed_jobs', None)
    if completed is None:
        from logistics.models import TransportJob
        completed = TransportJob.objects.filter(owner=user, status='COMPLETED').count()
    job_pts = min(completed * 5, 30)
    score += job_pts
    breakdown['jobs_completed'] = job_pts

    # 3. Average rating >= 4.0 (+20)
    avg_rating = getattr(user, '_avg_rating', None)
    if avg_rating is None:
        from reviews.models import Review
        from django.db.models import Avg
        avg_rating = Review.objects.filter(target=user).aggregate(
            avg=Avg('rating')
        )['avg']
    rating_pts = 20 if avg_rating and float(avg_rating) >= 4.0 else 0
    score += rating_pts
    breakdown['good_rating'] = rating_pts

    # 4. Account age > 3 months (+10)
    account_age = timezone.now() - user.date_joined
    age_pts = 10 if account_age > timedelta(days=90) else 0
    score += age_pts
    breakdown['account_age'] = age_pts

    # 5. Phone present (+10)
    phone_pts = 10 if user.phone else 0
    score += phone_pts
    breakdown['phone_verified'] = phone_pts

    # 6. No active disputes (+10)
    dispute_pts = 10
    try:
        from payments.models import Dispute
        active_disputes = Dispute.objects.filter(
            raised_by=user, status__in=['OPEN', 'IN_REVIEW']
        ).exists()
        if active_disputes:
            dispute_pts = 0
    except Exception:
        pass  # If Dispute model doesn't exist, give full points
    score += dispute_pts
    breakdown['no_disputes'] = dispute_pts

    # Clamp to 0-100
    score = max(0, min(100, score))

    # Label
    if score >= 80:
        label = 'excellent'
    elif score >= 60:
        label = 'good'
    elif score >= 40:
        label = 'average'
    else:
        label = 'new'

    return {
        'score': score,
        'label': label,
        'breakdown': breakdown,
    }
