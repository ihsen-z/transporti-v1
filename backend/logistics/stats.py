"""
Transporter statistics — single source of truth (Sprint 2, WS-B B2).

Every figure shown to a transporter anywhere in the product MUST come from
`get_transporter_stats()` below, whose formulas are contractually defined in
`docs/DICTIONNAIRE_KPI.md` (K1–K11). Frontends must never recompute these.
"""
from decimal import Decimal

from django.db.models import Sum, Avg
from django.utils import timezone

from .models import TransportJob, Offer


def available_missions_queryset(user):
    """K1 — EXACTLY the default browse queryset for a transporter.

    PUBLISHED, pickup in the future, not a return trip, not owned by the user.
    Must stay in sync with JobPublicListView's transporter view.
    """
    return TransportJob.objects.filter(
        status=TransportJob.Status.PUBLISHED,
        scheduled_time__gte=timezone.now(),
        is_return_trip=False,
    ).exclude(owner=user)


def get_transporter_stats(user) -> dict:
    """All transporter KPIs (K1–K11) in one call."""
    now = timezone.now()

    my_offers = Offer.objects.filter(transporter=user)
    accepted = my_offers.filter(status='ACCEPTED')

    # K1 — missions disponibles (same queryset as the browse list)
    available_missions = available_missions_queryset(user).count()

    # K3 — offres en attente (règle métier max 3)
    pending_active = my_offers.filter(
        status='PENDING', valid_until__gt=now
    ).count()

    # K2 — offres actives = PENDING non expirées + ACCEPTED dont la mission
    # n'est pas terminée/annulée
    accepted_ongoing = accepted.exclude(
        job__status__in=[TransportJob.Status.COMPLETED, TransportJob.Status.CANCELLED]
    ).count()
    active_offers = pending_active + accepted_ongoing

    # K5 — gains potentiels (net des offres en attente non expirées)
    potential_net = my_offers.filter(
        status='PENDING', valid_until__gt=now
    ).aggregate(total=Sum('price_net'))['total'] or Decimal('0')

    # K6 — missions terminées
    completed = accepted.filter(job__status=TransportJob.Status.COMPLETED).count()

    # K4 / K10 / K11 — argent réellement acquis (escrow libéré) et en attente,
    # délégué au module wallet (une seule formule).
    from payments.services import get_wallet_summary
    wallet = get_wallet_summary(user)

    # K7 — taux de complétion = COMPLETED / (COMPLETED + annulées par le
    # transporteur). Annulations tracées durablement depuis le Sprint 6 (D4')
    # via JobEvent(CANCELLED_BY_TRANSPORTER). None quand aucune donnée
    # (affiché « — », jamais un faux 100 %).
    from .models import JobEvent
    cancelled_by_transporter = JobEvent.objects.filter(
        event='CANCELLED_BY_TRANSPORTER', actor=user
    ).count()
    denom = completed + cancelled_by_transporter
    completion_rate = round(completed / denom * 100, 1) if denom else None

    # K8 — note moyenne (None si aucun avis — affiché « — »)
    from reviews.models import Review
    rating_agg = Review.objects.filter(target=user).aggregate(
        avg=Avg('rating')
    )
    review_count = Review.objects.filter(target=user).count()
    average_rating = round(float(rating_agg['avg']), 1) if rating_agg['avg'] else None

    # K9 — complétude du profil (avatar, type véhicule, capacité, photo véhicule)
    filled = 0
    try:
        if getattr(user.profile, 'avatar', None):
            filled += 1
    except Exception:
        pass
    try:
        tp = user.trust_profile
        if tp.vehicle_type:
            filled += 1
        if tp.vehicle_capacity_kg:
            filled += 1
        if tp.vehicle_photos:
            filled += 1
    except Exception:
        pass
    profile_completion = round(filled / 4 * 100)

    # Statut de vérification
    verification_status = 'UNVERIFIED'
    try:
        verification_status = user.trust_profile.verification_status
    except Exception:
        pass

    return {
        'available_missions': available_missions,          # K1
        'active_offers': active_offers,                    # K2
        'pending_offers': pending_active,                  # K3
        'earnings_confirmed': float(wallet['released_net']),   # K4
        'earnings_pending': float(wallet['pending_net']),      # K11
        'potential_earnings': float(potential_net),         # K5
        'completed_missions': completed,                    # K6
        'completion_rate': completion_rate,                 # K7 (None → « — »)
        'average_rating': average_rating,                   # K8 (None → « — »)
        'review_count': review_count,
        'profile_completion': profile_completion,           # K9
        'wallet_available': float(wallet['available']),     # K10
        'verification_status': verification_status,
    }
