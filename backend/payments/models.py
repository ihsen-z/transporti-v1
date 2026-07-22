import secrets

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


def generate_delivery_pin() -> str:
    """D7 (Sprint 6) — 4-digit proof-of-delivery code held by the client."""
    return f"{secrets.randbelow(10000):04d}"


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


class Booking(models.Model):
    """
    Booking contract created when client accepts an offer (Blueprint §2.4).
    Links job + accepted offer with payment terms.
    """
    class PaymentMethod(models.TextChoices):
        DIGITAL = 'DIGITAL', 'Digital Payment (Escrow)'
        COD = 'COD', 'Cash on Delivery'

    job = models.OneToOneField(
        'logistics.TransportJob',
        on_delete=models.PROTECT,
        related_name='booking'
    )
    accepted_offer = models.OneToOneField(
        'logistics.Offer',
        on_delete=models.PROTECT,
        related_name='booking'
    )
    
    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=4,
        help_text="Commission rate applied (e.g., 0.1500 for 15%)"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.DIGITAL
    )
    
    # COD threshold (from functional_decomposition: >300 TND = mandatory escrow)
    cod_allowed = models.BooleanField(
        default=True,
        help_text="Whether COD was allowed for this booking amount"
    )

    # D7 (Sprint 6) — proof of delivery: the CLIENT holds this code and gives
    # it to the transporter at reception; completion requires it.
    delivery_pin = models.CharField(
        max_length=4, default=generate_delivery_pin,
        help_text="4-digit code the client gives at delivery (POD)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['payment_method', 'created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(final_price__gte=0),
                name='booking_price_positive'
            ),
        ]

    def __str__(self):
        return f"Booking #{self.id} - Job #{self.job_id} ({self.payment_method})"


class WithdrawalRequest(models.Model):
    """
    D4 (Sprint 0): transporter payout request, processed manually back-office
    (bank transfer) during Phase 1. Statuses: REQUESTED → PROCESSING → PAID,
    or REJECTED.
    """
    class Status(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Requested'
        PROCESSING = 'PROCESSING', 'Processing'
        PAID = 'PAID', 'Paid'
        REJECTED = 'REJECTED', 'Rejected'

    transporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='withdrawal_requests'
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    bank_details = models.CharField(
        max_length=255,
        help_text="RIB / payout destination as provided by the transporter"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REQUESTED,
        db_index=True
    )
    admin_note = models.CharField(max_length=255, blank=True, default='')

    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['transporter', 'status']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gt=0),
                name='withdrawal_amount_positive'
            ),
        ]

    def __str__(self):
        return f"Withdrawal #{self.id} - {self.transporter} - {self.amount} TND ({self.status})"


class RefundRequest(models.Model):
    """
    K2 (chantier financier): back-office tracking of a client refund owed after
    a cancellation or a pro-client dispute resolution.

    Mirrors WithdrawalRequest (REQUESTED → PROCESSING → PAID, or REJECTED).
    Konnect refunds are manual by design (KonnectGateway.refund() returns False),
    so this queue is the single source of truth for "money still to be sent back".

    When the active gateway executes the refund automatically (SANDBOX), the row
    is created already PAID with auto_executed=True. In production (KONNECT) it is
    created REQUESTED and processed by hand in the Django admin, matched against
    Konnect via gateway_reference.

    A single row can also represent the TRANSPORTER's share of a SPLIT outcome
    (beneficiary_type=TRANSPORTER) — a manual bank payout, like a withdrawal.
    """
    class Status(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Requested'
        PROCESSING = 'PROCESSING', 'Processing'
        PAID = 'PAID', 'Paid'
        REJECTED = 'REJECTED', 'Rejected'

    class Beneficiary(models.TextChoices):
        CLIENT = 'CLIENT', 'Client (refund)'
        TRANSPORTER = 'TRANSPORTER', 'Transporter (split share)'

    beneficiary = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='refund_requests',
        help_text="User who must receive the money",
    )
    beneficiary_type = models.CharField(
        max_length=20,
        choices=Beneficiary.choices,
        default=Beneficiary.CLIENT,
        db_index=True,
    )
    job = models.ForeignKey(
        'logistics.TransportJob',
        on_delete=models.PROTECT,
        related_name='refund_requests',
    )
    escrow = models.ForeignKey(
        EscrowTransaction,
        on_delete=models.PROTECT,
        related_name='refund_requests',
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    # Copied from the escrow so back-office can match the payout in Konnect
    # even after the escrow row changes.
    gateway_reference = models.CharField(max_length=100, blank=True)
    # True when the active gateway refunded automatically (SANDBOX) — no manual
    # back-office action needed. False means a human must execute it (KONNECT).
    auto_executed = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REQUESTED,
        db_index=True,
    )
    reason = models.CharField(max_length=255, blank=True, default='')
    admin_note = models.CharField(max_length=255, blank=True, default='')

    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['beneficiary', 'status']),
            models.Index(fields=['status', 'requested_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gt=0),
                name='refund_amount_positive'
            ),
        ]

    def __str__(self):
        return (
            f"Refund #{self.id} - {self.beneficiary} - {self.amount} TND "
            f"({self.beneficiary_type}/{self.status})"
        )
