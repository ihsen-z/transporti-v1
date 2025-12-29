from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


class CommissionLedger(models.Model):
    """
    Internal Ledger for tracking COD Debt.
    Positive Balance = Transporter owes Platform.
    """
    transporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        related_name='commission_ledger'
    )
    job_reference = models.OneToOneField(
        'logistics.TransportJob', 
        on_delete=models.PROTECT, 
        related_name='commission_entry'
    )
    
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    is_settled = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['transporter', 'is_settled']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gte=0),
                name='commission_amount_positive'
            ),
        ]

    def __str__(self):
        return f"{self.transporter} owes {self.amount} (Job #{self.job_reference_id})"


class EscrowTransaction(models.Model):
    """
    Tracks funds held for Digital Payments.
    State Machine: INITIATED -> HELD -> RELEASED/REFUNDED
    """
    class Status(models.TextChoices):
        INITIATED = 'INITIATED', 'Initiated'
        HELD = 'HELD', 'Held (Escrow)'
        RELEASED = 'RELEASED', 'Released to Transporter'
        REFUNDED = 'REFUNDED', 'Refunded to Client'
        FAILED = 'FAILED', 'Failed'

    booking_reference = models.ForeignKey(
        'logistics.TransportJob', 
        on_delete=models.PROTECT, 
        related_name='escrow_transactions'
    )
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.INITIATED, 
        db_index=True
    )
    
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    gateway_reference = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['booking_reference', 'status']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gte=0),
                name='escrow_amount_positive'
            ),
        ]

    def __str__(self):
        return f"Escrow #{self.id} - {self.status} ({self.amount} TND)"
