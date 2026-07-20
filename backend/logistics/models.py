from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _

class TransportJob(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'
        MATCHED = 'MATCHED', 'Matched'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        DISPUTED = 'DISPUTED', 'Disputed'

    class JobType(models.TextChoices):
        TRANSPORT = 'TRANSPORT', 'Transport'
        MOVING = 'MOVING', 'Moving (Déménagement)'
        DELIVERY = 'DELIVERY', 'Delivery (Livraison)'

    # Ownership
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='jobs')
    
    # Core Data
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    job_type = models.CharField(max_length=20, choices=JobType.choices)
    
    # Logistics
    pickup_address = models.CharField(max_length=255)
    pickup_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    pickup_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    
    dropoff_address = models.CharField(max_length=255)
    dropoff_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    dropoff_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    
    scheduled_time = models.DateTimeField(db_index=True)
    
    # Specifications (JSONB for flexibility between Transport vs Moving)
    specifications = models.JSONField(default=dict)
    
    # Budget hint (Blueprint §2.3)
    price_tnd_min = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Client's minimum budget hint (TND)"
    )
    price_tnd_max = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Client's maximum budget hint (TND)"
    )
    
    # Description and photos
    description = models.TextField(blank=True, help_text="What needs transporting")
    photos = models.JSONField(default=list, blank=True, help_text="List of photo URLs for job items")
    
    # Regional filtering
    pickup_governorate = models.CharField(max_length=50, blank=True, db_index=True)
    dropoff_governorate = models.CharField(max_length=50, blank=True, db_index=True)

    # Location hints (visible to transporter for precise delivery)
    pickup_hint = models.TextField(blank=True, help_text="Location tip for pickup (floor, door code, landmark...)")
    dropoff_hint = models.TextField(blank=True, help_text="Location tip for dropoff (floor, door code, landmark...)")

    # Return Trip (transporter-created availability)
    is_return_trip = models.BooleanField(default=False, db_index=True,
        help_text="True if created by a transporter indicating return trip availability")
    available_capacity = models.CharField(max_length=255, blank=True,
        help_text="Available capacity description for return trips (e.g. '2 tonnes, camion bâché')")
    instant_booking = models.BooleanField(default=False,
        help_text="D11: return trips only — allow direct booking without a structured request (off by default)")

    # NSM instrumentation (vision v1.0): road distance estimate, computed once
    # server-side at creation (haversine × 1.25 — T4), never client-side.
    distance_km = models.DecimalField(max_digits=7, decimal_places=1, null=True, blank=True,
        help_text="Estimated road distance in km (haversine × 1.25), set at creation")

    # Analytics
    view_count = models.PositiveIntegerField(default=0, help_text="Number of times the job detail page was viewed by non-owners")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['status', 'scheduled_time']),
        ]

    def __str__(self):
        return f"Job #{self.id} - {self.job_type} ({self.status})"

    @property
    def accepted_offer(self):
        """Returns the ACCEPTED offer for this job, or None.
        Optimized: uses prefetch cache if offers were prefetched.
        """
        # Use prefetch cache if available (avoids N+1 queries in list views)
        if 'offers' in getattr(self, '_prefetched_objects_cache', {}):
            for offer in self.offers.all():
                if offer.status == 'ACCEPTED':
                    return offer
            return None
        # Fallback: direct DB query (single-object views)
        return self.offers.filter(status='ACCEPTED').first()


class Offer(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'
        EXPIRED = 'EXPIRED', 'Expired'
        WITHDRAWN = 'WITHDRAWN', 'Withdrawn'

    job = models.ForeignKey(TransportJob, on_delete=models.CASCADE, related_name='offers')
    transporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='offers')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    
    # Financials with validation
    price_net = models.DecimalField(
        max_digits=10, decimal_places=2, 
        validators=[MinValueValidator(0)],
        help_text="Amount Transporter receives"
    )
    commission_amount = models.DecimalField(
        max_digits=10, decimal_places=2, 
        validators=[MinValueValidator(0)],
        help_text="Platform fee"
    )
    total_price = models.DecimalField(
        max_digits=10, decimal_places=2, 
        validators=[MinValueValidator(0)],
        help_text="Price Client pays"
    )
    
    message = models.TextField(blank=True)
    valid_until = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['transporter', 'status']),
            models.Index(fields=['job', 'status']),
        ]
        constraints = [
            # Price integrity: total = net + commission
            models.CheckConstraint(
                check=models.Q(total_price__gte=models.F('price_net')),
                name='offer_total_gte_net'
            ),
            models.CheckConstraint(
                check=models.Q(price_net__gte=0),
                name='offer_price_net_positive'
            ),
            models.CheckConstraint(
                check=models.Q(commission_amount__gte=0),
                name='offer_commission_positive'
            ),
        ]

    def __str__(self):
        return f"Offer #{self.id} for Job #{self.job_id} ({self.status})"


class PricingGrid(models.Model):
    """
    Configurable pricing grid for automatic price estimation.
    Managed via Django admin — no code change needed to adjust tariffs.
    
    FORMULA: base_rate + (distance_km × per_km_rate)
    RANGE:   [max(min_price, base*0.8), base * max_multiplier]
    """
    job_type = models.CharField(
        max_length=20, choices=TransportJob.JobType.choices,
        unique=True, db_index=True,
        help_text="Type de job (TRANSPORT ou MOVING)"
    )
    base_rate = models.DecimalField(
        max_digits=8, decimal_places=2, default=10,
        validators=[MinValueValidator(0)],
        help_text="Tarif de base fixe (TND)"
    )
    per_km_rate = models.DecimalField(
        max_digits=6, decimal_places=3, default=0.350,
        validators=[MinValueValidator(0)],
        help_text="Tarif par km (TND/km)"
    )
    min_price = models.DecimalField(
        max_digits=8, decimal_places=2, default=25,
        validators=[MinValueValidator(0)],
        help_text="Prix minimum garanti (TND)"
    )
    max_multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=1.50,
        validators=[MinValueValidator(1)],
        help_text="Multiplicateur pour borne haute (ex: 1.5 = +50%)"
    )
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='pricing_updates'
    )

    class Meta:
        verbose_name = "Grille tarifaire"
        verbose_name_plural = "Grilles tarifaires"
        ordering = ['job_type']

    def __str__(self):
        return f"Tarif {self.job_type}: {self.base_rate} TND + {self.per_km_rate}/km"


class FavoriteTransporter(models.Model):
    """
    P2-09: Client can favorite transporters for quick access.
    Simple junction table — one record per (client, transporter) pair.
    """
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='favorite_transporters',
        limit_choices_to={'role': 'CLIENT'}
    )
    transporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='favorited_by',
        limit_choices_to={'role': 'TRANSPORTER'}
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('client', 'transporter')
        verbose_name = "Transporteur favori"
        verbose_name_plural = "Transporteurs favoris"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.client} ♥ {self.transporter}"


class CounterOffer(models.Model):
    """
    P2-05: Structured counter-offer from client to transporter.
    Client proposes a new price on a PENDING offer.
    Transporter can ACCEPT (updates original offer price) or REJECT.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'En attente'
        ACCEPTED = 'ACCEPTED', 'Acceptée'
        REJECTED = 'REJECTED', 'Refusée'
        EXPIRED = 'EXPIRED', 'Expirée'

    offer = models.ForeignKey(
        Offer, on_delete=models.CASCADE, related_name='counter_offers'
    )
    proposed_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="New total price proposed by client"
    )
    message = models.TextField(blank=True, help_text="Optional justification from client")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Contre-offre"
        verbose_name_plural = "Contre-offres"

    def __str__(self):
        return f"CounterOffer #{self.id} on Offer #{self.offer_id}: {self.proposed_price} TND ({self.status})"


class ReturnTripRequest(models.Model):
    """
    D5 (pivot) — structured request from a client on a published return trip.
    The client proposes goods + a client-facing total price; the transporter
    accepts, rejects or counters. Acceptance closes the trip (D12 unitaire)
    and enters the D3 payment flow at the RETURN_TRIP commission rate (D13).
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'
        COUNTERED = 'COUNTERED', 'Countered'
        CANCELLED = 'CANCELLED', 'Cancelled'
        EXPIRED = 'EXPIRED', 'Expired'

    class PaymentMethod(models.TextChoices):
        DIGITAL = 'DIGITAL', 'Digital Payment (Escrow)'
        COD = 'COD', 'Cash on Delivery'

    job = models.ForeignKey(
        TransportJob, on_delete=models.CASCADE, related_name='trip_requests',
        limit_choices_to={'is_return_trip': True},
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='trip_requests',
    )

    description = models.TextField(
        max_length=1000,
        help_text="What the client wants to ship (goods, weight estimate...)")
    photos = models.JSONField(default=list, blank=True,
        help_text="List of photo URLs (PhotoUploadView)")
    proposed_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text="Client-facing total price proposed by the client (TND)")
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices,
        default=PaymentMethod.DIGITAL)

    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.PENDING, db_index=True)
    counter_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Transporter's counter-proposal (client-facing total, TND)")
    response_message = models.CharField(max_length=500, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['job', 'status']),
            models.Index(fields=['client', 'status']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(proposed_price__gt=0),
                name='trip_request_price_positive'
            ),
        ]

    def __str__(self):
        return f"TripRequest #{self.id} - Job #{self.job_id} - {self.status}"


class CorridorAlert(models.Model):
    """
    Sprint 4 (pivot, D14 — clients) : abonnement d'un client à un corridor.
    À la publication d'un trajet retour compatible, le client est notifié
    (« nouveau trajet sur votre corridor »).
    """
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='corridor_alerts',
    )
    pickup_governorate = models.CharField(max_length=50, db_index=True)
    dropoff_governorate = models.CharField(max_length=50, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['client', 'pickup_governorate', 'dropoff_governorate'],
                name='unique_corridor_alert_per_client',
            ),
        ]

    def __str__(self):
        return f"Alert #{self.id} {self.client_id}: {self.pickup_governorate} → {self.dropoff_governorate}"


class JobEvent(models.Model):
    """
    Sprint 6 (D2'/D6) — mission timeline: horodated milestones between
    assignment and delivery, visible to both parties. The DELIVERED event
    carries the proof of delivery (D3'/D7: photo + PIN check) in metadata.
    """
    class EventType(models.TextChoices):
        ARRIVED_PICKUP = 'ARRIVED_PICKUP', 'Arrived at pickup'
        LOADED = 'LOADED', 'Loaded / en route'
        DELIVERED = 'DELIVERED', 'Delivered (with proof)'
        CANCELLED_BY_TRANSPORTER = 'CANCELLED_BY_TRANSPORTER', 'Cancelled by transporter'
        CANCELLED_BY_CLIENT = 'CANCELLED_BY_CLIENT', 'Cancelled by client'

    job = models.ForeignKey(
        TransportJob, on_delete=models.CASCADE, related_name='events')
    event = models.CharField(max_length=30, choices=EventType.choices, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='job_events')
    metadata = models.JSONField(default=dict, blank=True,
        help_text="Context (pod_photo_url, reason, ...)")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['job', 'event'])]

    def __str__(self):
        return f"JobEvent #{self.id} job={self.job_id} {self.event}"
