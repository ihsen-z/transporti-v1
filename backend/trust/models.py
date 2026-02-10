"""
Trust Models - Transporti V1
Trust profiles and verification workflow for transporters.

RULES:
- TrustProfile is OneToOne with User (transporter only)
- trust_score is cached from analytics (synced periodically)
- Only one PENDING verification request per profile
- Admin-only approval/rejection of requests
"""
import logging
from django.db import models
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('transporti')


class VerificationStatus(models.TextChoices):
    UNVERIFIED = 'UNVERIFIED', 'Unverified'
    PENDING = 'PENDING', 'Pending Review'
    VERIFIED = 'VERIFIED', 'Verified'
    REJECTED = 'REJECTED', 'Rejected'
    SUSPENDED = 'SUSPENDED', 'Suspended'


class PolicyCategory(models.TextChoices):
    """Categories for trust policies."""
    DEFAULT = 'DEFAULT', 'Default Policy'
    VIP = 'VIP', 'VIP Partners'
    PARTNER = 'PARTNER', 'Strategic Partners'


class TrustPolicy(models.Model):
    """
    Single source of truth for trust thresholds.
    
    RULES:
    - Only one active policy per applies_to category
    - DEFAULT policy must always exist
    - Used to configure minimum trust scores for different operations
    
    SAFETY:
    - Scores must be 0-100
    - Cannot set scores that would block all users
    - DEFAULT policy cannot be deleted
    """
    # Maximum allowed score (prevents blocking everyone)
    MAX_SAFE_SCORE = 95
    
    name = models.CharField(max_length=100, unique=True)
    
    # Minimum trust scores for different operations
    min_score_escrow = models.PositiveIntegerField(
        default=0,
        help_text="Minimum trust score required for escrow jobs (0-100)"
    )
    min_score_cod = models.PositiveIntegerField(
        default=50,
        help_text="Minimum trust score required for COD jobs (0-100)"
    )
    min_score_visibility = models.PositiveIntegerField(
        default=0,
        help_text="Minimum trust score for visibility in listings (0-100)"
    )
    
    # Which category this policy applies to
    applies_to = models.CharField(
        max_length=20,
        choices=PolicyCategory.choices,
        default=PolicyCategory.DEFAULT,
        db_index=True
    )
    
    is_active = models.BooleanField(default=False, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Trust Policies"
        constraints = [
            # Only one active policy per category
            models.UniqueConstraint(
                fields=['applies_to'],
                condition=models.Q(is_active=True),
                name='unique_active_policy_per_category'
            ),
        ]
        indexes = [
            models.Index(fields=['applies_to', 'is_active']),
        ]
    
    def __str__(self):
        status = "ACTIVE" if self.is_active else "inactive"
        return f"{self.name} ({self.applies_to}) [{status}]"
    
    def clean(self):
        """Validate policy values."""
        from django.core.exceptions import ValidationError
        
        errors = {}
        
        # Validate score ranges (0-100)
        for field in ['min_score_escrow', 'min_score_cod', 'min_score_visibility']:
            value = getattr(self, field, 0) or 0
            if value < 0 or value > 100:
                errors[field] = f"Score must be between 0 and 100 (got {value})"
                logger.warning(
                    f"TRUST_POLICY_INVALID: policy={self.name}, field={field}, "
                    f"value={value}, reason=out_of_range"
                )
        
        # Check for dangerous values that would block most/all users
        if self.is_active and self.applies_to == PolicyCategory.DEFAULT:
            dangerous_fields = []
            
            if (self.min_score_escrow or 0) > self.MAX_SAFE_SCORE:
                dangerous_fields.append(f"min_score_escrow={self.min_score_escrow}")
            if (self.min_score_cod or 0) > self.MAX_SAFE_SCORE:
                dangerous_fields.append(f"min_score_cod={self.min_score_cod}")
            if (self.min_score_visibility or 0) > self.MAX_SAFE_SCORE:
                dangerous_fields.append(f"min_score_visibility={self.min_score_visibility}")
            
            if dangerous_fields:
                logger.error(
                    f"TRUST_POLICY_DANGEROUS_CHANGE: policy={self.name}, "
                    f"dangerous_values={dangerous_fields}"
                )
                raise ValidationError(
                    f"Dangerous policy values would block most users: {', '.join(dangerous_fields)}. "
                    f"Maximum safe score is {self.MAX_SAFE_SCORE}."
                )
        
        if errors:
            raise ValidationError(errors)
    
    def save(self, *args, **kwargs):
        """Validate and save, ensuring DEFAULT policy integrity."""
        # Run validation
        self.clean()
        
        # If activating this policy, deactivate others in same category
        if self.is_active:
            TrustPolicy.objects.filter(
                applies_to=self.applies_to,
                is_active=True
            ).exclude(pk=self.pk).update(is_active=False)
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Prevent deletion of the only active DEFAULT policy."""
        if self.is_active and self.applies_to == PolicyCategory.DEFAULT:
            # Check if there's another policy that can take over
            other_default = TrustPolicy.objects.filter(
                applies_to=PolicyCategory.DEFAULT
            ).exclude(pk=self.pk).first()
            
            if not other_default:
                logger.error(
                    f"TRUST_POLICY_DELETE_BLOCKED: policy={self.name}, "
                    f"reason=last_default_policy"
                )
                raise ValueError(
                    "Cannot delete the only DEFAULT policy. "
                    "Create another DEFAULT policy first."
                )
        
        super().delete(*args, **kwargs)
    
    @classmethod
    def get_active_policy(cls, category: str = PolicyCategory.DEFAULT) -> 'TrustPolicy':
        """Get current active policy for category, falls back to DEFAULT."""
        try:
            return cls.objects.get(applies_to=category, is_active=True)
        except cls.DoesNotExist:
            # Fall back to DEFAULT
            if category != PolicyCategory.DEFAULT:
                return cls.get_active_policy(PolicyCategory.DEFAULT)
            # Create DEFAULT if missing
            return cls.objects.create(
                name='Default Trust Policy',
                applies_to=PolicyCategory.DEFAULT,
                is_active=True,
                min_score_escrow=0,
                min_score_cod=50,
                min_score_visibility=0
            )
    
    @classmethod
    def ensure_default_exists(cls) -> 'TrustPolicy':
        """Ensure DEFAULT policy exists (can be called at startup)."""
        return cls.get_active_policy(PolicyCategory.DEFAULT)


class TrustProfile(models.Model):
    """
    Gatekeeper profile for Transporters.
    OWNS the verification state and cached trust score.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='trust_profile'
    )
    verification_status = models.CharField(
        max_length=20, 
        choices=VerificationStatus.choices, 
        default=VerificationStatus.UNVERIFIED,
        db_index=True
    )
    
    # Cached trust score from analytics (0-100)
    trust_score = models.PositiveIntegerField(default=0, db_index=True)
    trust_score_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Verification timestamps
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    last_submitted_at = models.DateTimeField(null=True, blank=True)
    
    # Vehicle details (Blueprint §4 - Product Vision: transporter profile)
    vehicle_type = models.CharField(
        max_length=50, blank=True,
        help_text="e.g. Pickup, Van, Truck, Camion"
    )
    vehicle_capacity_kg = models.DecimalField(
        max_digits=8, decimal_places=1, null=True, blank=True,
        help_text="Max load capacity in kg"
    )
    vehicle_plate = models.CharField(max_length=20, blank=True)
    vehicle_photos = models.JSONField(
        default=list, blank=True,
        help_text="List of vehicle photo URLs"
    )
    insurance_valid_until = models.DateField(null=True, blank=True)
    
    # Service coverage
    service_areas = models.JSONField(
        default=list, blank=True,
        help_text="List of governorates served e.g. ['Tunis', 'Sousse', 'Sfax']"
    )
    specializations = models.JSONField(
        default=list, blank=True,
        help_text="e.g. ['furniture', 'electronics', 'fragile', 'construction']"
    )
    
    # Performance metrics (cached from analytics)
    response_time_avg_minutes = models.IntegerField(
        null=True, blank=True,
        help_text="Average response time to offers in minutes"
    )
    total_jobs_completed = models.IntegerField(default=0)
    completion_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.00,
        help_text="Percentage of accepted jobs completed successfully"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['verification_status', 'trust_score']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.verification_status} (Score: {self.trust_score})"
    
    @property
    def is_verified(self) -> bool:
        return self.verification_status == VerificationStatus.VERIFIED
    
    @property
    def can_accept_jobs(self) -> bool:
        """Transporter can accept jobs only if verified."""
        return self.verification_status == VerificationStatus.VERIFIED
    
    def mark_verified(self) -> None:
        """Mark profile as verified."""
        self.verification_status = VerificationStatus.VERIFIED
        self.verified_at = timezone.now()
        self.rejection_reason = None
        self.save()
        
        logger.info(f"TRUST_PROFILE_VERIFIED: user_id={self.user_id}")
    
    def mark_rejected(self, reason: str) -> None:
        """Mark profile as rejected with reason."""
        self.verification_status = VerificationStatus.REJECTED
        self.rejection_reason = reason
        self.verified_at = None
        self.save()
        
        logger.info(f"TRUST_PROFILE_REJECTED: user_id={self.user_id}, reason={reason[:100]}")
    
    def mark_pending(self) -> None:
        """Mark profile as pending review."""
        self.verification_status = VerificationStatus.PENDING
        self.last_submitted_at = timezone.now()
        self.save()
        
        logger.info(f"TRUST_PROFILE_PENDING: user_id={self.user_id}")


class DocumentType(models.TextChoices):
    CIN_FRONT = 'CIN_FRONT', 'National ID (Front)'
    CIN_BACK = 'CIN_BACK', 'National ID (Back)'
    CARTE_GRISE = 'CARTE_GRISE', 'Vehicle Registration'
    INSURANCE = 'INSURANCE', 'Insurance Certificate'
    LICENSE = 'LICENSE', 'Business License'
    SELFIE = 'SELFIE', 'Selfie with ID'


class VerificationDocument(models.Model):
    """
    Secure storage reference for verification docs.
    """
    profile = models.ForeignKey(
        TrustProfile, 
        on_delete=models.CASCADE, 
        related_name='documents'
    )
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    
    # Security: Encrypted storage references
    s3_key = models.CharField(max_length=255)  # Path in secure bucket
    encryption_iv = models.CharField(max_length=64)  # Initialization Vector for AES
    file_hash = models.CharField(max_length=64)  # SHA-256 for integrity check
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField(default=False)  # Marked by Admin

    class Meta:
        indexes = [
            models.Index(fields=['profile', 'document_type']),
        ]
    
    def __str__(self):
        return f"{self.profile.user.email} - {self.document_type}"


class RequestStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Review'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'


class TrustVerificationRequest(models.Model):
    """
    Verification request submitted by transporter.
    Only one PENDING request per profile allowed.
    
    Workflow:
    1. Transporter submits request with documents
    2. Admin reviews and approves/rejects
    3. TrustProfile updated accordingly
    """
    trust_profile = models.ForeignKey(
        TrustProfile,
        on_delete=models.CASCADE,
        related_name='verification_requests'
    )
    
    # Document(s) submitted - can reference multiple
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    document_file = models.FileField(
        upload_to='verification_docs/%Y/%m/',
        help_text="Upload verification document"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING,
        db_index=True
    )
    
    # Admin review
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_verifications'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Timestamps
    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['trust_profile', 'status']),
            models.Index(fields=['status', 'submitted_at']),
        ]
        constraints = [
            # Only one PENDING request per profile
            models.UniqueConstraint(
                fields=['trust_profile'],
                condition=models.Q(status='PENDING'),
                name='unique_pending_verification_per_profile'
            ),
        ]
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"Request #{self.id} - {self.trust_profile.user.email} ({self.status})"
    
    def approve(self, admin_user, notes: str = '') -> None:
        """Admin approves the request."""
        self.status = RequestStatus.APPROVED
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()
        
        # Update trust profile
        self.trust_profile.mark_verified()
        
        logger.info(
            f"TRUST_VERIFICATION_APPROVED: request_id={self.id}, "
            f"user_id={self.trust_profile.user_id}, admin_id={admin_user.id}"
        )
    
    def reject(self, admin_user, reason: str) -> None:
        """Admin rejects the request."""
        self.status = RequestStatus.REJECTED
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.review_notes = reason
        self.save()
        
        # Update trust profile
        self.trust_profile.mark_rejected(reason)
        
        logger.info(
            f"TRUST_VERIFICATION_REJECTED: request_id={self.id}, "
            f"user_id={self.trust_profile.user_id}, admin_id={admin_user.id}"
        )


class TrustActionType(models.TextChoices):
    """Admin trust control actions."""
    VERIFY = 'VERIFY', 'Verify User'
    REJECT = 'REJECT', 'Reject User'
    SUSPEND = 'SUSPEND', 'Suspend User'
    RESTORE = 'RESTORE', 'Restore User'
    SCORE_UPDATE = 'SCORE_UPDATE', 'Score Updated'
    AUTO_VERIFY = 'AUTO_VERIFY', 'Auto-Verified'


class TrustActionLog(models.Model):
    """
    Immutable audit log for admin trust control actions.
    NO UPDATE OR DELETE ALLOWED.
    
    Tracks:
    - Admin actions (verify, reject, suspend, restore)
    - Trust score changes
    - Status transitions with reasons
    """
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='trust_admin_actions'
    )
    admin_email = models.EmailField(
        blank=True,
        help_text="Preserved email for audit even if admin deleted"
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='trust_action_logs'
    )
    user_email = models.EmailField(
        blank=True,
        help_text="Preserved email for audit even if user deleted"
    )
    
    action = models.CharField(
        max_length=20,
        choices=TrustActionType.choices,
        db_index=True
    )
    
    # Status transition
    previous_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        blank=True
    )
    new_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        blank=True
    )
    
    # Context
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    
    # Request info (optional)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Immutable timestamp
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['admin', 'created_at']),
            models.Index(fields=['action', 'created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action}: {self.user_email} by {self.admin_email} @ {self.created_at}"
    
    def save(self, *args, **kwargs):
        """Prevent updates to existing records."""
        if self.pk:
            raise ValueError("TrustActionLog entries cannot be modified.")
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Prevent deletion."""
        raise ValueError("TrustActionLog entries cannot be deleted.")


class OverrideScope(models.TextChoices):
    """Scopes for trust overrides."""
    ESCROW = 'ESCROW', 'Allow Escrow Jobs'
    COD = 'COD', 'Allow COD Jobs'
    ACCEPT_OFFER = 'ACCEPT_OFFER', 'Allow Accepting Offers'
    ALL = 'ALL', 'Full Override (All Scopes)'


class TrustOverride(models.Model):
    """
    Admin-granted temporary trust override.
    Allows bypassing normal trust requirements for specific scopes.
    
    RULES:
    - Overrides are always logged
    - Expired overrides are auto-invalid (is_active computed)
    - Overrides can be revoked early
    - All business logic must check for active overrides
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trust_overrides'
    )
    
    scope = models.CharField(
        max_length=20,
        choices=OverrideScope.choices,
        db_index=True
    )
    
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='granted_overrides'
    )
    granted_by_email = models.EmailField(
        blank=True,
        help_text="Preserved admin email for audit"
    )
    
    reason = models.TextField()
    
    # Validity period
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    
    # Revocation
    revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revoked_overrides'
    )
    revoke_reason = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'scope', 'expires_at']),
            models.Index(fields=['user', 'revoked', 'expires_at']),
        ]
        ordering = ['-granted_at']
    
    def __str__(self):
        status = "ACTIVE" if self.is_active else "EXPIRED/REVOKED"
        return f"Override {self.scope} for {self.user.email} [{status}]"
    
    @property
    def is_active(self) -> bool:
        """Override is active if not revoked and not expired."""
        if self.revoked:
            return False
        return timezone.now() < self.expires_at
    
    @property
    def is_expired(self) -> bool:
        """Check if override has expired."""
        return timezone.now() >= self.expires_at
    
    def revoke(self, admin, reason: str) -> None:
        """Revoke this override."""
        self.revoked = True
        self.revoked_at = timezone.now()
        self.revoked_by = admin
        self.revoke_reason = reason
        self.save()
        
        logger.info(
            f"TRUST_OVERRIDE_REVOKED: override_id={self.id}, user_id={self.user_id}, "
            f"scope={self.scope}, admin_id={admin.id}, reason={reason[:50]}"
        )
