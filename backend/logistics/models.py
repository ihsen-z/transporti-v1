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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['status', 'scheduled_time']),
        ]

    def __str__(self):
        return f"Job #{self.id} - {self.job_type} ({self.status})"


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
