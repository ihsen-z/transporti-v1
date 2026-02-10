"""
Analytics Services - Transporti V1
Production-grade presence tracking, session management, and engagement scoring.

HARDENING RULES:
- Presence updates throttled to 30s minimum between writes
- One active session per user enforced
- Engagement actions have daily caps to prevent inflation
- Score decay applied after inactivity
- All timestamps are timezone-aware
"""
from django.utils import timezone
from django.db.models import Count, Avg, Sum, F, Q, Max
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from datetime import timedelta, date
from typing import Optional
from decimal import Decimal

from users.models import User
from .models import UserSession, DailyEngagementScore


# =============================================================================
# CONFIGURATION
# =============================================================================

PRESENCE_THROTTLE_SECONDS = 30
SESSION_TIMEOUT_MINUTES = 30
ONLINE_THRESHOLD_SECONDS = 120

# Engagement score weights
ENGAGEMENT_WEIGHTS = {
    'login': 1,
    'job_view': 2,
    'job_create': 5,
    'offer_submit': 6,
    'offer_accepted': 8,
    'payment_completed': 10,
}

# Daily caps to prevent artificial inflation
ENGAGEMENT_DAILY_CAPS = {
    'job_view': 10,      # Max 10 job views/day count toward score
    'job_create': 3,     # Max 3 job creations/day
    'offer_submit': 5,   # Max 5 offers/day
    'login': 5,          # Max 5 logins/day
    'offer_accepted': 10,
    'payment_completed': 10,
}

# Decay: 20% reduction per 7 days of inactivity
DECAY_RATE = Decimal('0.20')
DECAY_INACTIVITY_DAYS = 7


# =============================================================================
# PRESENCE UTILITIES (THROTTLED)
# =============================================================================

def update_user_presence(user: User) -> bool:
    """
    Update user's last_seen_at with throttling.
    Only writes if:
    - last_seen_at is NULL, OR
    - now - last_seen_at >= 30 seconds
    
    Returns True if updated, False if throttled.
    """
    now = timezone.now()
    
    # Refresh user to get current last_seen_at (avoid stale data)
    current_last_seen = User.objects.filter(id=user.id).values_list('last_seen_at', flat=True).first()
    
    # Check if update needed
    if current_last_seen is None:
        User.objects.filter(id=user.id).update(last_seen_at=now)
        return True
    
    if now - current_last_seen >= timedelta(seconds=PRESENCE_THROTTLE_SECONDS):
        User.objects.filter(id=user.id).update(last_seen_at=now)
        return True
    
    return False  # Throttled


def is_user_online(user: User) -> bool:
    """Check if user is online (last seen within 120 seconds)."""
    if not user.last_seen_at:
        return False
    return timezone.now() - user.last_seen_at <= timedelta(seconds=ONLINE_THRESHOLD_SECONDS)


def get_online_users_count(role: Optional[str] = None) -> int:
    """Count online users, optionally filtered by role."""
    cutoff = timezone.now() - timedelta(seconds=ONLINE_THRESHOLD_SECONDS)
    qs = User.objects.filter(last_seen_at__gte=cutoff)
    if role:
        qs = qs.filter(role=role)
    return qs.count()


def get_online_users_by_role() -> dict:
    """Get online user count per role."""
    cutoff = timezone.now() - timedelta(seconds=ONLINE_THRESHOLD_SECONDS)
    result = User.objects.filter(
        last_seen_at__gte=cutoff
    ).values('role').annotate(count=Count('id'))
    
    return {item['role']: item['count'] for item in result}


# =============================================================================
# SESSION MANAGEMENT (ONE ACTIVE SESSION PER USER)
# =============================================================================

def get_or_create_session(user: User) -> UserSession:
    """
    Get active session or create new one.
    ENFORCES: One active session per user.
    - Closes ALL previous active sessions before creating new one.
    """
    cutoff = timezone.now() - timedelta(minutes=SESSION_TIMEOUT_MINUTES)
    now = timezone.now()
    
    # Try to get active session
    active_session = UserSession.objects.filter(
        user=user,
        ended_at__isnull=True,
        last_activity_at__gte=cutoff
    ).order_by('-last_activity_at').first()
    
    if active_session:
        # Update activity
        active_session.last_activity_at = now
        active_session.save(update_fields=['last_activity_at'])
        return active_session
    
    # Close ALL open sessions for this user (enforce one-active rule)
    stale_sessions = UserSession.objects.filter(
        user=user,
        ended_at__isnull=True
    )
    for session in stale_sessions:
        session.close_session()
    
    # Create new session
    return UserSession.objects.create(user=user)


def close_all_user_sessions(user: User) -> int:
    """Close all active sessions for a user. Returns count closed."""
    sessions = UserSession.objects.filter(user=user, ended_at__isnull=True)
    count = 0
    for session in sessions:
        session.close_session()
        count += 1
    return count


# =============================================================================
# ANALYTICS METRICS
# =============================================================================

def get_dau(for_date: date = None, role: Optional[str] = None) -> int:
    """Daily Active Users - users with sessions on given date."""
    if not for_date:
        for_date = timezone.now().date()
    
    qs = UserSession.objects.filter(started_at__date=for_date)
    if role:
        qs = qs.filter(user__role=role)
    
    return qs.values('user').distinct().count()


def get_wau(for_date: date = None, role: Optional[str] = None) -> int:
    """Weekly Active Users - users with sessions in last 7 days."""
    if not for_date:
        for_date = timezone.now().date()
    
    start_date = for_date - timedelta(days=6)
    
    qs = UserSession.objects.filter(
        started_at__date__gte=start_date,
        started_at__date__lte=for_date
    )
    if role:
        qs = qs.filter(user__role=role)
    
    return qs.values('user').distinct().count()


def get_mau(for_date: date = None, role: Optional[str] = None) -> int:
    """Monthly Active Users - users with sessions in last 30 days."""
    if not for_date:
        for_date = timezone.now().date()
    
    start_date = for_date - timedelta(days=29)
    
    qs = UserSession.objects.filter(
        started_at__date__gte=start_date,
        started_at__date__lte=for_date
    )
    if role:
        qs = qs.filter(user__role=role)
    
    return qs.values('user').distinct().count()


def get_avg_session_duration(for_date: date = None, role: Optional[str] = None) -> float:
    """Average session duration in seconds for given date."""
    if not for_date:
        for_date = timezone.now().date()
    
    qs = UserSession.objects.filter(
        started_at__date=for_date,
        duration_seconds__isnull=False
    )
    if role:
        qs = qs.filter(user__role=role)
    
    result = qs.aggregate(avg_duration=Avg('duration_seconds'))
    return result['avg_duration'] or 0.0


def get_sessions_per_user(for_date: date = None, role: Optional[str] = None) -> float:
    """Average sessions per user for given date."""
    if not for_date:
        for_date = timezone.now().date()
    
    qs = UserSession.objects.filter(started_at__date=for_date)
    if role:
        qs = qs.filter(user__role=role)
    
    total_sessions = qs.count()
    unique_users = qs.values('user').distinct().count()
    
    if unique_users == 0:
        return 0.0
    return total_sessions / unique_users


def get_total_time_spent(user: User, start_date: date, end_date: date) -> int:
    """Total time spent by user in seconds between dates."""
    result = UserSession.objects.filter(
        user=user,
        started_at__date__gte=start_date,
        started_at__date__lte=end_date,
        duration_seconds__isnull=False
    ).aggregate(total=Sum('duration_seconds'))
    
    return result['total'] or 0


# =============================================================================
# ENGAGEMENT SCORING (WITH CAPS AND DECAY)
# =============================================================================

def _get_action_count_today(user: User, action: str, for_date: date) -> int:
    """Get how many times an action was recorded today (for capping)."""
    try:
        score_obj = DailyEngagementScore.objects.get(user=user, date=for_date)
        field_name = f"{action}_score"
        if hasattr(score_obj, field_name):
            current = getattr(score_obj, field_name)
            weight = ENGAGEMENT_WEIGHTS.get(action, 1)
            return current // weight if weight > 0 else current
        return 0
    except DailyEngagementScore.DoesNotExist:
        return 0


def record_engagement_action(user: User, action: str, for_date: date = None) -> Optional[DailyEngagementScore]:
    """
    Record an engagement action with DAILY CAPS.
    Returns None if action was capped (not recorded).
    """
    if action not in ENGAGEMENT_WEIGHTS:
        raise ValueError(f"Unknown action: {action}")
    
    if not for_date:
        for_date = timezone.now().date()
    
    # Check daily cap
    cap = ENGAGEMENT_DAILY_CAPS.get(action, 999)
    current_count = _get_action_count_today(user, action, for_date)
    
    if current_count >= cap:
        return None  # Capped - don't record
    
    # Get or create daily score
    score_obj, _ = DailyEngagementScore.objects.get_or_create(
        user=user,
        date=for_date
    )
    
    # Update appropriate field
    field_name = f"{action}_score"
    if hasattr(score_obj, field_name):
        current = getattr(score_obj, field_name)
        setattr(score_obj, field_name, current + ENGAGEMENT_WEIGHTS[action])
    
    score_obj.recalculate_total()
    return score_obj


def apply_engagement_decay(user: User) -> int:
    """
    Apply decay to user's engagement score if inactive for 7+ days.
    Returns amount decayed (0 if no decay applied).
    """
    today = timezone.now().date()
    cutoff = today - timedelta(days=DECAY_INACTIVITY_DAYS)
    
    # Check if user has any recent sessions
    has_recent_activity = UserSession.objects.filter(
        user=user,
        started_at__date__gte=cutoff
    ).exists()
    
    if has_recent_activity:
        return 0
    
    # Get most recent engagement score
    recent_score = DailyEngagementScore.objects.filter(
        user=user
    ).order_by('-date').first()
    
    if not recent_score or recent_score.total_score == 0:
        return 0
    
    # Apply 20% decay
    decay_amount = int(recent_score.total_score * float(DECAY_RATE))
    
    if decay_amount > 0:
        # Create today's score with decayed value
        score_obj, created = DailyEngagementScore.objects.get_or_create(
            user=user,
            date=today
        )
        if created:
            decayed_total = max(0, recent_score.total_score - decay_amount)
            score_obj.total_score = decayed_total
            score_obj.save()
    
    return decay_amount


def get_user_engagement_score(user: User, for_date: date = None) -> int:
    """Get user's engagement score for a date."""
    if not for_date:
        for_date = timezone.now().date()
    
    try:
        score = DailyEngagementScore.objects.get(user=user, date=for_date)
        return score.total_score
    except DailyEngagementScore.DoesNotExist:
        return 0


def get_top_engaged_users(for_date: date = None, limit: int = 10, role: Optional[str] = None) -> list:
    """Get top engaged users for a date."""
    if not for_date:
        for_date = timezone.now().date()
    
    qs = DailyEngagementScore.objects.filter(date=for_date)
    if role:
        qs = qs.filter(user__role=role)
    
    return list(qs.select_related('user').order_by('-total_score')[:limit])


# =============================================================================
# BUSINESS SEGMENTATION FLAGS (ADMIN USE ONLY)
# =============================================================================

def is_power_user(user: User, for_date: date = None) -> bool:
    """
    User is in top 10% engagement score.
    """
    if not for_date:
        for_date = timezone.now().date()
    
    user_score = get_user_engagement_score(user, for_date)
    if user_score == 0:
        return False
    
    # Get 90th percentile threshold
    all_scores = DailyEngagementScore.objects.filter(
        date=for_date,
        total_score__gt=0
    ).values_list('total_score', flat=True)
    
    if not all_scores:
        return False
    
    sorted_scores = sorted(all_scores, reverse=True)
    threshold_index = max(0, int(len(sorted_scores) * 0.1) - 1)
    threshold = sorted_scores[threshold_index]
    
    return user_score >= threshold


def is_at_risk_churn(user: User) -> bool:
    """
    User is at risk of churn if inactive for 7+ days.
    """
    cutoff = timezone.now() - timedelta(days=7)
    
    if user.last_seen_at is None:
        return True
    
    return user.last_seen_at < cutoff


def is_inactive_30d(user: User) -> bool:
    """
    User has not been active in 30 days.
    """
    cutoff = timezone.now() - timedelta(days=30)
    
    if user.last_seen_at is None:
        return True
    
    return user.last_seen_at < cutoff


def is_high_value_transporter(user: User) -> bool:
    """
    Transporter with high acceptance rate and completions.
    Requirements:
    - At least 5 accepted offers
    - At least 80% completion rate (offers accepted vs jobs completed)
    """
    if user.role != 'TRANSPORTER':
        return False
    
    from logistics.models import Offer
    
    accepted_offers = Offer.objects.filter(
        transporter=user,
        status='ACCEPTED'
    ).count()
    
    if accepted_offers < 5:
        return False
    
    # Count completed jobs for this transporter
    completed_jobs = Offer.objects.filter(
        transporter=user,
        status='ACCEPTED',
        job__status='COMPLETED'
    ).count()
    
    completion_rate = completed_jobs / accepted_offers if accepted_offers > 0 else 0
    
    return completion_rate >= 0.8


def get_user_segments(user: User) -> dict:
    """Get all segment flags for a user."""
    return {
        'is_power_user': is_power_user(user),
        'is_at_risk_churn': is_at_risk_churn(user),
        'is_inactive_30d': is_inactive_30d(user),
        'is_high_value_transporter': is_high_value_transporter(user) if user.role == 'TRANSPORTER' else None,
    }


# =============================================================================
# ADMIN DASHBOARD HELPERS
# =============================================================================

def get_analytics_summary(for_date: date = None) -> dict:
    """Get comprehensive analytics summary for admin dashboard."""
    if not for_date:
        for_date = timezone.now().date()
    
    return {
        'date': for_date.isoformat(),
        'presence': {
            'online_now': get_online_users_count(),
            'online_by_role': get_online_users_by_role(),
        },
        'activity': {
            'dau': get_dau(for_date),
            'dau_clients': get_dau(for_date, 'CLIENT'),
            'dau_transporters': get_dau(for_date, 'TRANSPORTER'),
            'wau': get_wau(for_date),
            'mau': get_mau(for_date),
        },
        'sessions': {
            'avg_duration_seconds': round(get_avg_session_duration(for_date), 1),
            'sessions_per_user': round(get_sessions_per_user(for_date), 2),
        },
        'churn_risk': {
            'at_risk_7d': User.objects.filter(
                last_seen_at__lt=timezone.now() - timedelta(days=7)
            ).exclude(last_seen_at__isnull=True).count(),
            'inactive_30d': User.objects.filter(
                last_seen_at__lt=timezone.now() - timedelta(days=30)
            ).exclude(last_seen_at__isnull=True).count(),
        },
    }


# =============================================================================
# TRUST & RELIABILITY SCORING (0-100)
# =============================================================================

"""
TrustScore Formula:
    completion_rate × 30     (Job completions / accepted offers)
  + dispute_penalty × 20     ((1 - dispute_ratio) × 20)
  + payment_reliability × 25 (Settled commissions / total commissions)
  + engagement_factor × 15   (Normalized engagement score 0-1)
  + recency_bonus × 10       (Active in last 7 days = 1.0, else decay)
  = Total (0-100)
"""


def get_user_trust_score(user: User) -> int:
    """
    Calculate trust score (0-100) for a user.
    Higher score = more reliable partner.
    """
    from logistics.models import Offer
    from payments.models import CommissionLedger
    from support.models import Dispute
    
    # 1. Completion Rate (30 pts max)
    accepted_offers = Offer.objects.filter(transporter=user, status='ACCEPTED').count()
    completed_jobs = Offer.objects.filter(
        transporter=user, status='ACCEPTED', job__status='COMPLETED'
    ).count()
    
    if accepted_offers > 0:
        completion_rate = completed_jobs / accepted_offers
    else:
        completion_rate = 0.5  # Neutral for new users
    
    completion_score = completion_rate * 30
    
    # 2. Dispute Penalty (20 pts max)
    total_jobs = Offer.objects.filter(transporter=user, status='ACCEPTED').count()
    dispute_count = Dispute.objects.filter(
        Q(job__offers__transporter=user, job__offers__status='ACCEPTED')
    ).distinct().count()
    
    if total_jobs > 0:
        dispute_ratio = dispute_count / total_jobs
    else:
        dispute_ratio = 0
    
    dispute_score = (1 - dispute_ratio) * 20
    
    # 3. Payment Reliability (25 pts max) - for transporters
    if user.role == 'TRANSPORTER':
        total_commissions = CommissionLedger.objects.filter(transporter=user).count()
        settled_commissions = CommissionLedger.objects.filter(
            transporter=user, is_settled=True
        ).count()
        
        if total_commissions > 0:
            payment_reliability = settled_commissions / total_commissions
        else:
            payment_reliability = 1.0  # No debt = reliable
    else:
        payment_reliability = 1.0  # Clients don't have commission debt
    
    payment_score = payment_reliability * 25
    
    # 4. Engagement Factor (15 pts max)
    recent_engagement = DailyEngagementScore.objects.filter(
        user=user,
        date__gte=timezone.now().date() - timedelta(days=7)
    ).aggregate(total=Sum('total_score'))['total'] or 0
    
    # Normalize: assume 100 pts/week is "good"
    engagement_factor = min(1.0, recent_engagement / 100)
    engagement_score = engagement_factor * 15
    
    # 5. Recency Bonus (10 pts max)
    if user.last_seen_at:
        days_inactive = (timezone.now() - user.last_seen_at).days
        if days_inactive <= 7:
            recency_factor = 1.0
        elif days_inactive <= 30:
            recency_factor = 0.5
        else:
            recency_factor = 0.2
    else:
        recency_factor = 0.1
    
    recency_score = recency_factor * 10
    
    # Total
    total = completion_score + dispute_score + payment_score + engagement_score + recency_score
    
    return min(100, max(0, int(total)))


# =============================================================================
# ECONOMIC PERFORMANCE ANALYTICS
# =============================================================================

def get_transporter_commission_generated(user: User, start_date: date = None, end_date: date = None) -> Decimal:
    """
    Get total commission generated by a transporter for the platform.
    """
    from payments.models import CommissionLedger
    
    if user.role != 'TRANSPORTER':
        return Decimal('0')
    
    qs = CommissionLedger.objects.filter(transporter=user)
    
    if start_date:
        qs = qs.filter(created_at__date__gte=start_date)
    if end_date:
        qs = qs.filter(created_at__date__lte=end_date)
    
    result = qs.aggregate(total=Sum('amount'))
    return result['total'] or Decimal('0')


def get_avg_revenue_per_transporter(start_date: date = None, end_date: date = None) -> Decimal:
    """
    Average commission revenue per active transporter.
    """
    from payments.models import CommissionLedger
    
    qs = CommissionLedger.objects.all()
    
    if start_date:
        qs = qs.filter(created_at__date__gte=start_date)
    if end_date:
        qs = qs.filter(created_at__date__lte=end_date)
    
    total_revenue = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    unique_transporters = qs.values('transporter').distinct().count()
    
    if unique_transporters == 0:
        return Decimal('0')
    
    return total_revenue / unique_transporters


def get_monthly_revenue_contribution(year: int, month: int) -> dict:
    """
    Get revenue contribution breakdown for a specific month.
    """
    from payments.models import CommissionLedger, EscrowTransaction
    
    # Commission from COD jobs
    cod_revenue = CommissionLedger.objects.filter(
        created_at__year=year,
        created_at__month=month
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # Escrow revenue (commission deducted from digital payments)
    # Note: commission is already tracked in offers, escrow just confirms payment
    
    return {
        'year': year,
        'month': month,
        'cod_commission': cod_revenue,
        'total_revenue': cod_revenue,  # Can add more revenue streams
    }


def get_platform_revenue_summary(days: int = 30) -> dict:
    """
    Platform-wide revenue summary for investor dashboards.
    """
    from payments.models import CommissionLedger, EscrowTransaction
    from logistics.models import Offer
    
    cutoff = timezone.now().date() - timedelta(days=days)
    
    # Total commission generated
    total_commission = CommissionLedger.objects.filter(
        created_at__date__gte=cutoff
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # Settled vs outstanding
    settled = CommissionLedger.objects.filter(
        created_at__date__gte=cutoff, is_settled=True
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    outstanding = CommissionLedger.objects.filter(
        created_at__date__gte=cutoff, is_settled=False
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # Total escrow processed
    escrow_volume = EscrowTransaction.objects.filter(
        created_at__date__gte=cutoff, status='RELEASED'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # Job volume
    jobs_completed = Offer.objects.filter(
        status='ACCEPTED', job__status='COMPLETED',
        created_at__date__gte=cutoff
    ).count()
    
    return {
        'period_days': days,
        'total_commission': float(total_commission),
        'settled_commission': float(settled),
        'outstanding_commission': float(outstanding),
        'escrow_volume_released': float(escrow_volume),
        'jobs_completed': jobs_completed,
        'avg_revenue_per_transporter': float(get_avg_revenue_per_transporter(cutoff)),
    }


# =============================================================================
# DATA SNAPSHOT SYSTEM
# =============================================================================

def generate_daily_snapshot(user: User, for_date: date = None) -> 'DailyUserSnapshot':
    """
    Generate a daily snapshot for a single user.
    Idempotent: updates existing snapshot if already exists.
    """
    from .models import DailyUserSnapshot
    
    if not for_date:
        for_date = timezone.now().date()
    
    # Calculate metrics
    engagement = get_user_engagement_score(user, for_date)
    trust = get_user_trust_score(user)
    segments = get_user_segments(user)
    revenue = get_transporter_commission_generated(user, for_date, for_date) if user.role == 'TRANSPORTER' else Decimal('0')
    
    # Create or update snapshot
    snapshot, created = DailyUserSnapshot.objects.update_or_create(
        user=user,
        date=for_date,
        defaults={
            'engagement_score': engagement,
            'trust_score': trust,
            'segments': segments,
            'revenue_generated': revenue,
        }
    )
    
    return snapshot


def generate_daily_snapshots(for_date: date = None) -> int:
    """
    Generate daily snapshots for ALL active users.
    Run via cron. Idempotent. Returns count of snapshots generated.
    """
    if not for_date:
        for_date = timezone.now().date()
    
    # Only snapshot users active in last 30 days
    cutoff = timezone.now() - timedelta(days=30)
    active_users = User.objects.filter(
        last_seen_at__gte=cutoff
    ).exclude(role__in=['ADMIN', 'MODERATOR'])
    
    count = 0
    for user in active_users:
        generate_daily_snapshot(user, for_date)
        count += 1
    
    return count


# =============================================================================
# COHORT & RETENTION HELPERS
# =============================================================================

def get_signup_cohort(week_start: date) -> list:
    """
    Get users who signed up in a specific week.
    Returns list of user IDs.
    """
    week_end = week_start + timedelta(days=6)
    
    users = User.objects.filter(
        date_joined__date__gte=week_start,
        date_joined__date__lte=week_end
    ).exclude(role__in=['ADMIN', 'MODERATOR']).values_list('id', flat=True)
    
    return list(users)


def get_cohort_retention_d7(cohort_week_start: date) -> float:
    """
    Calculate D7 retention for a signup cohort.
    Returns percentage (0-100) of users who returned 7 days after signup.
    """
    cohort_users = get_signup_cohort(cohort_week_start)
    
    if not cohort_users:
        return 0.0
    
    # Check for sessions 7-14 days after signup
    d7_start = cohort_week_start + timedelta(days=7)
    d7_end = cohort_week_start + timedelta(days=13)
    
    retained_users = UserSession.objects.filter(
        user_id__in=cohort_users,
        started_at__date__gte=d7_start,
        started_at__date__lte=d7_end
    ).values('user').distinct().count()
    
    return (retained_users / len(cohort_users)) * 100


def get_cohort_retention_d30(cohort_week_start: date) -> float:
    """
    Calculate D30 retention for a signup cohort.
    Returns percentage (0-100) of users who returned 30 days after signup.
    """
    cohort_users = get_signup_cohort(cohort_week_start)
    
    if not cohort_users:
        return 0.0
    
    # Check for sessions 30-37 days after signup
    d30_start = cohort_week_start + timedelta(days=30)
    d30_end = cohort_week_start + timedelta(days=36)
    
    retained_users = UserSession.objects.filter(
        user_id__in=cohort_users,
        started_at__date__gte=d30_start,
        started_at__date__lte=d30_end
    ).values('user').distinct().count()
    
    return (retained_users / len(cohort_users)) * 100


def get_retention_report(weeks_back: int = 8) -> list:
    """
    Generate retention report for recent cohorts.
    Returns list of cohort data with D7 and D30 retention.
    """
    today = timezone.now().date()
    report = []
    
    for i in range(weeks_back):
        # Get Monday of that week
        week_start = today - timedelta(days=today.weekday()) - timedelta(weeks=i)
        
        cohort_size = len(get_signup_cohort(week_start))
        
        # Only calculate retention if enough time has passed
        days_since = (today - week_start).days
        
        d7 = get_cohort_retention_d7(week_start) if days_since >= 14 else None
        d30 = get_cohort_retention_d30(week_start) if days_since >= 37 else None
        
        report.append({
            'week_start': week_start.isoformat(),
            'cohort_size': cohort_size,
            'retention_d7': round(d7, 1) if d7 is not None else None,
            'retention_d30': round(d30, 1) if d30 is not None else None,
        })
    
    return report


# =============================================================================
# EVENT HOOKS (DISPUTES & MESSAGING)
# =============================================================================

import logging

event_logger = logging.getLogger('transporti')


def record_dispute_opened(user: User, dispute_id: int, job_id: int, reason: str) -> None:
    """Record analytics event when a dispute is opened."""
    event_logger.info(
        f"ANALYTICS_EVENT: type=dispute_opened, user_id={user.id}, "
        f"dispute_id={dispute_id}, job_id={job_id}, reason={reason}"
    )


def record_dispute_resolved(dispute_id: int, job_id: int, outcome: str, resolver_id: int) -> None:
    """Record analytics event when a dispute is resolved."""
    event_logger.info(
        f"ANALYTICS_EVENT: type=dispute_resolved, dispute_id={dispute_id}, "
        f"job_id={job_id}, outcome={outcome}, resolver_id={resolver_id}"
    )


def record_message_sent(user: User, job_id: int, is_system: bool = False) -> None:
    """Record analytics event when a message is sent."""
    event_logger.info(
        f"ANALYTICS_EVENT: type=message_sent, user_id={user.id}, "
        f"job_id={job_id}, is_system={is_system}"
    )


def record_anti_bypass_triggered(user: User, job_id: int, pattern: str) -> None:
    """Record analytics event when anti-bypass filter is triggered."""
    event_logger.warning(
        f"ANALYTICS_EVENT: type=anti_bypass_triggered, user_id={user.id}, "
        f"job_id={job_id}, pattern={pattern}"
    )


# =============================================================================
# TRUST HELPER UTILITIES (READ-ONLY)
# =============================================================================

def get_user_dispute_ratio(user: User) -> dict:
    """
    Calculate dispute ratio for a user (trust metric).
    Returns ratio of disputes filed/received vs completed jobs.
    
    Returns:
        dict with filed_count, received_count, total_jobs, filed_ratio, received_ratio
    """
    from support.models import Dispute
    from logistics.models import Offer
    
    # Disputes filed by this user
    filed_count = Dispute.objects.filter(opened_by=user).count()
    
    # Disputes on jobs where user is transporter
    received_count = Dispute.objects.filter(
        job__offers__transporter=user,
        job__offers__status='ACCEPTED'
    ).exclude(opened_by=user).distinct().count()
    
    # Total jobs (as client or transporter)
    if user.role == 'TRANSPORTER':
        total_jobs = Offer.objects.filter(
            transporter=user,
            status='ACCEPTED'
        ).count()
    else:
        from logistics.models import TransportJob
        total_jobs = TransportJob.objects.filter(owner=user).count()
    
    # Calculate ratios
    filed_ratio = (filed_count / total_jobs) if total_jobs > 0 else 0.0
    received_ratio = (received_count / total_jobs) if total_jobs > 0 else 0.0
    
    return {
        'filed_count': filed_count,
        'received_count': received_count,
        'total_jobs': total_jobs,
        'filed_ratio': round(filed_ratio, 3),
        'received_ratio': round(received_ratio, 3),
    }


def get_user_completion_rate(user: User) -> float:
    """
    Get job completion rate for a transporter.
    Returns percentage (0-100).
    """
    from logistics.models import Offer
    
    if user.role != 'TRANSPORTER':
        return 0.0
    
    accepted_offers = Offer.objects.filter(
        transporter=user,
        status='ACCEPTED'
    ).count()
    
    if accepted_offers == 0:
        return 0.0
    
    completed_jobs = Offer.objects.filter(
        transporter=user,
        status='ACCEPTED',
        job__status='COMPLETED'
    ).count()
    
    return round((completed_jobs / accepted_offers) * 100, 1)


def get_user_trust_metrics(user: User) -> dict:
    """
    Get comprehensive trust metrics for a user.
    Read-only, no scoring changes.
    """
    dispute_data = get_user_dispute_ratio(user)
    
    return {
        'trust_score': get_user_trust_score(user),
        'completion_rate': get_user_completion_rate(user) if user.role == 'TRANSPORTER' else None,
        'dispute_filed_count': dispute_data['filed_count'],
        'dispute_received_count': dispute_data['received_count'],
        'dispute_filed_ratio': dispute_data['filed_ratio'],
        'dispute_received_ratio': dispute_data['received_ratio'],
        'is_high_value_transporter': is_high_value_transporter(user) if user.role == 'TRANSPORTER' else None,
        'segments': get_user_segments(user),
    }
