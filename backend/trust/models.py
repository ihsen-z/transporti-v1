from django.db import models
from django.conf import settings

class VerificationStatus(models.TextChoices):
    UNVERIFIED = 'UNVERIFIED', 'Unverified'
    PENDING_REVIEW = 'PENDING_REVIEW', 'Pending Review'
    VERIFIED = 'VERIFIED', 'Verified'
    REJECTED = 'REJECTED', 'Rejected'
    SUSPENDED = 'SUSPENDED', 'Suspended'

class TrustProfile(models.Model):
    """
    Gatekeeper profile for Transporters.
    OWNS the verification state.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trust_profile')
    verification_status = models.CharField(
        max_length=20, 
        choices=VerificationStatus.choices, 
        default=VerificationStatus.UNVERIFIED
    )
    rejection_reason = models.TextField(blank=True, null=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    last_submitted_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.verification_status}"

class DocumentType(models.TextChoices):
    CIN_FRONT = 'CIN_FRONT', 'National ID (Front)'
    CIN_BACK = 'CIN_BACK', 'National ID (Back)'
    CARTE_GRISE = 'CARTE_GRISE', 'Vehicle Registration'
    INSURANCE = 'INSURANCE', 'Insurance Certificate'
    LICENSE = 'LICENSE', 'Business License'

class VerificationDocument(models.Model):
    """
    Secure storage reference for verification docs.
    """
    profile = models.ForeignKey(TrustProfile, on_delete=models.CASCADE, related_name='documents')
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
