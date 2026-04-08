"""
Reviews Models - Transporti V1
Review system for trust perception and feedback.

RULES:
- One review per job per role (client reviews transporter, transporter reviews client)
- Only after job COMPLETED
- Rating required (1-5), comment optional
- Reviews influence trust_score
"""
import logging
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

logger = logging.getLogger('transporti')


class ReviewRole(models.TextChoices):
    """Who is leaving the review."""
    CLIENT = 'CLIENT', 'Client reviewing Transporter'
    TRANSPORTER = 'TRANSPORTER', 'Transporter reviewing Client'


class Review(models.Model):
    """
    Review left after job completion.
    
    CONSTRAINTS:
    - One review per job per role
    - Only for COMPLETED jobs
    - Rating 1-5 required
    """
    job = models.ForeignKey(
        'logistics.TransportJob',
        on_delete=models.PROTECT,
        related_name='reviews'
    )
    
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='reviews_given'
    )
    
    target = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='reviews_received'
    )
    
    role = models.CharField(
        max_length=20,
        choices=ReviewRole.choices,
        db_index=True
    )
    
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 (poor) to 5 (excellent)"
    )
    
    comment = models.TextField(
        blank=True,
        max_length=1000,
        help_text="Optional review comment"
    )
    
    # Structured aspect ratings (Blueprint §2.5)
    aspects = models.JSONField(
        default=dict, blank=True,
        help_text="Aspect ratings e.g. {'punctuality': 5, 'care': 4, 'professionalism': 5}"
    )
    
    # Abuse detection fields
    is_flagged = models.BooleanField(
        default=False,
        help_text="Review flagged for potential abuse"
    )
    flag_reason = models.CharField(max_length=200, blank=True)
    
    # Trust integration
    trust_impact_applied = models.BooleanField(
        default=False,
        help_text="Whether this review has been applied to trust score"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # One review per job per role
        constraints = [
            models.UniqueConstraint(
                fields=['job', 'role'],
                name='one_review_per_job_per_role'
            ),
            models.CheckConstraint(
                check=models.Q(rating__gte=1, rating__lte=5),
                name='rating_1_to_5'
            ),
        ]
        indexes = [
            models.Index(fields=['target', 'created_at']),
            models.Index(fields=['reviewer', 'created_at']),
            models.Index(fields=['is_flagged']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Review #{self.id}: {self.role} → {self.rating}★ for Job #{self.job_id}"
    
    def clean(self):
        """Validate review constraints."""
        from logistics.models import TransportJob
        
        # Job must be COMPLETED
        if self.job and self.job.status != TransportJob.Status.COMPLETED:
            raise ValidationError(
                f"Cannot review job in status {self.job.status}. Only COMPLETED jobs can be reviewed."
            )
        
        # Reviewer must be participant
        if self.reviewer:
            if self.role == ReviewRole.CLIENT:
                if self.job and self.reviewer != self.job.client:
                    raise ValidationError("Only the job client can leave a CLIENT review.")
            elif self.role == ReviewRole.TRANSPORTER:
                if self.job and hasattr(self.job, 'accepted_offer'):
                    if self.reviewer != self.job.accepted_offer.transporter:
                        raise ValidationError("Only the job transporter can leave a TRANSPORTER review.")
        
        # Reviewer cannot review themselves
        if self.reviewer and self.target and self.reviewer == self.target:
            raise ValidationError("Cannot review yourself.")
    
    def save(self, *args, **kwargs):
        self.clean()
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Log review creation
        if not kwargs.get('update_fields'):
            logger.info(
                f"REVIEW_CREATED: review_id={self.id}, job_id={self.job_id}, "
                f"role={self.role}, rating={self.rating}, reviewer_id={self.reviewer_id}, "
                f"target_id={self.target_id}"
            )
        
        # Update target's trust score based on review average
        if is_new and not self.trust_impact_applied:
            self._apply_trust_impact()

    def _apply_trust_impact(self):
        """Recalculate target's trust score from all their reviews."""
        from django.db.models import Avg
        try:
            from trust.models import TrustProfile
            profile = TrustProfile.objects.filter(user=self.target).first()
            if not profile:
                return
            
            avg_rating = Review.objects.filter(
                target=self.target
            ).aggregate(avg=Avg('rating'))['avg']
            
            if avg_rating:
                # Formula: avg_rating * 20 (5.0 → 100, 3.0 → 60, 1.0 → 20)
                new_score = min(100, max(0, int(avg_rating * 20)))
                profile.trust_score = new_score
                profile.save(update_fields=['trust_score', 'updated_at'])
                
                self.trust_impact_applied = True
                self.save(update_fields=['trust_impact_applied'])
                
                logger.info(
                    f"TRUST_SCORE_UPDATED: target_id={self.target_id}, "
                    f"avg_rating={avg_rating:.2f}, new_score={new_score}"
                )
        except Exception as e:
            logger.error(f"TRUST_IMPACT_FAILED: review_id={self.id}, error={str(e)}")


class ReviewAbuseLog(models.Model):
    """
    Immutable log of detected review abuse patterns.
    """
    review = models.ForeignKey(
        Review,
        on_delete=models.SET_NULL,
        null=True,
        related_name='abuse_logs'
    )
    
    detector = models.CharField(
        max_length=50,
        help_text="Name of abuse detector that triggered"
    )
    
    reason = models.TextField()
    
    reviewer_id = models.IntegerField()
    target_id = models.IntegerField()
    
    severity = models.CharField(
        max_length=20,
        choices=[
            ('LOW', 'Low'),
            ('MEDIUM', 'Medium'),
            ('HIGH', 'High'),
            ('CRITICAL', 'Critical'),
        ],
        default='MEDIUM'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"AbuseLog: {self.detector} - {self.severity}"
    
    def save(self, *args, **kwargs):
        # Prevent updates
        if self.pk:
            raise ValueError("ReviewAbuseLog entries cannot be modified.")
        super().save(*args, **kwargs)
        
        logger.warning(
            f"REVIEW_ABUSE_DETECTED: review_id={self.review_id}, detector={self.detector}, "
            f"severity={self.severity}, reason={self.reason}"
        )
