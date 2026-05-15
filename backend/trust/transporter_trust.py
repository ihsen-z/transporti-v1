"""
Transporter Trust Score — Transporti V1
Calculates a dynamic trust/reputation score for TRANSPORTER users.
Uses pre-cached fields from TrustProfile where possible for performance.

Algorithm (0-100):
- Verified identity: +25 pts
- Jobs completed: +3 pts per job (max 25)
- Average rating >= 4.0: +15 pts
- Completion rate >= 90%: +10 pts
- Account age > 3 months: +10 pts
- Vehicle photo present: +5 pts
- Insurance valid: +5 pts
- No active disputes: +5 pts
"""
from django.utils import timezone
from datetime import timedelta


def compute_transporter_trust_score(trust_profile) -> dict:
    """
    Compute trust score for a transporter.

    Args:
        trust_profile: TrustProfile instance (reads cached fields for perf)

    Returns:
        dict with: score (int), breakdown (dict), label (str)
    """
    score = 0
    breakdown = {}
    user = trust_profile.user

    # 1. Verified identity (+25)
    verified_pts = 25 if trust_profile.is_verified else 0
    score += verified_pts
    breakdown['verified'] = verified_pts

    # 2. Jobs completed (+3 per job, max 25) — reads cached field
    completed = trust_profile.total_jobs_completed or 0
    job_pts = min(completed * 3, 25)
    score += job_pts
    breakdown['jobs_completed'] = job_pts

    # 3. Average rating >= 4.0 (+15) — annotation-aware
    avg_rating = getattr(trust_profile, '_avg_rating', None)
    if avg_rating is None:
        from reviews.models import Review
        from django.db.models import Avg
        avg_rating = Review.objects.filter(target=user).aggregate(
            avg=Avg('rating')
        )['avg']
    rating_pts = 15 if avg_rating and float(avg_rating) >= 4.0 else 0
    score += rating_pts
    breakdown['good_rating'] = rating_pts

    # 4. Completion rate >= 90% (+10) — reads cached field
    completion_rate = float(trust_profile.completion_rate or 0)
    completion_pts = 10 if completion_rate >= 90.0 else 0
    score += completion_pts
    breakdown['completion_rate'] = completion_pts

    # 5. Account age > 3 months (+10)
    account_age = timezone.now() - user.date_joined
    age_pts = 10 if account_age > timedelta(days=90) else 0
    score += age_pts
    breakdown['account_age'] = age_pts

    # 6. Vehicle photo present (+5) — reads cached field
    vehicle_pts = 5 if trust_profile.vehicle_photos and len(trust_profile.vehicle_photos) > 0 else 0
    score += vehicle_pts
    breakdown['vehicle_photo'] = vehicle_pts

    # 7. Insurance valid (+5) — reads cached field
    insurance_pts = 0
    if trust_profile.insurance_valid_until:
        from datetime import date
        if trust_profile.insurance_valid_until > date.today():
            insurance_pts = 5
    score += insurance_pts
    breakdown['insurance_valid'] = insurance_pts

    # 8. No active disputes (+5)
    dispute_pts = 5
    try:
        from payments.models import Dispute
        has_disputes = Dispute.objects.filter(
            raised_by=user, status__in=['OPEN', 'IN_REVIEW']
        ).exists()
        if has_disputes:
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
