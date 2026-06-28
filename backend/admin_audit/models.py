"""
Admin Audit Trail Models — Transporti V1
Sprint 2 R8: Persistent logging of all admin actions for compliance.
"""
from django.db import models
from django.conf import settings


class AdminAuditLog(models.Model):
    """
    Immutable audit log for admin actions.
    Each row represents a single action taken by an admin user.
    """

    class Action(models.TextChoices):
        # User management
        USER_SUSPENDED = 'USER_SUSPENDED', 'Utilisateur suspendu'
        USER_ACTIVATED = 'USER_ACTIVATED', 'Utilisateur réactivé'
        PASSWORD_RESET = 'PASSWORD_RESET', 'Mot de passe réinitialisé'

        # KYC / Verification
        DOCUMENT_APPROVED = 'DOCUMENT_APPROVED', 'Document approuvé'
        DOCUMENT_REJECTED = 'DOCUMENT_REJECTED', 'Document rejeté'
        PROFILE_VERIFIED = 'PROFILE_VERIFIED', 'Profil vérifié'
        PROFILE_REJECTED = 'PROFILE_REJECTED', 'Profil rejeté'

        # Disputes
        DISPUTE_INVESTIGATED = 'DISPUTE_INVESTIGATED', 'Litige en investigation'
        DISPUTE_RESOLVED = 'DISPUTE_RESOLVED', 'Litige résolu'
        DISPUTE_REJECTED = 'DISPUTE_REJECTED', 'Litige rejeté'

        # Reviews
        REVIEW_HIDDEN = 'REVIEW_HIDDEN', 'Avis masqué'
        REVIEW_SHOWN = 'REVIEW_SHOWN', 'Avis visible'
        USER_WARNED = 'USER_WARNED', 'Utilisateur averti'

        # Financial
        ESCROW_RELEASED = 'ESCROW_RELEASED', 'Escrow libéré'
        COMMISSION_SETTLED = 'COMMISSION_SETTLED', 'Commission réglée'

        # Jobs
        JOB_CANCELLED = 'JOB_CANCELLED', 'Job annulé par admin'
        JOB_STATUS_FORCED = 'JOB_STATUS_FORCED', 'Statut job forcé'

    admin_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='admin_audit_actions',
        verbose_name='Administrateur',
    )
    action = models.CharField(
        max_length=50,
        choices=Action.choices,
        verbose_name='Action',
        db_index=True,
    )
    target_type = models.CharField(
        max_length=50,
        verbose_name='Type cible',
        help_text='user, dispute, document, review, escrow, job',
    )
    target_id = models.IntegerField(
        verbose_name='ID cible',
    )
    target_label = models.CharField(
        max_length=200,
        blank=True,
        default='',
        verbose_name='Label cible',
        help_text='Human-readable label (e.g. user email, job title)',
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Détails',
        help_text='Additional context (reason, notes, etc.)',
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Adresse IP',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name='Date',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Log admin'
        verbose_name_plural = 'Logs admin'
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['admin_user', 'created_at']),
        ]

    def __str__(self):
        admin_name = self.admin_user.email if self.admin_user else 'System'
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {admin_name} → {self.get_action_display()}"
