from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    class Role(models.TextChoices):
        CLIENT = 'CLIENT', 'Client'
        TRANSPORTER = 'TRANSPORTER', 'Transporter'
        ADMIN = 'ADMIN', 'Admin'
        MODERATOR = 'MODERATOR', 'Moderator'

    # Identity & Access Only
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CLIENT)
    email = models.EmailField(_('email address'), unique=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    is_phone_verified = models.BooleanField(default=False)
    
    # Presence tracking
    last_seen_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'phone']

    def __str__(self):
        return self.email
    
    @property
    def is_online(self) -> bool:
        """User is online if last seen within 120 seconds."""
        if not self.last_seen_at:
            return False
        return timezone.now() - self.last_seen_at <= timedelta(seconds=120)


class Profile(models.Model):
    """
    Extended profile data for all users (Blueprint §2.1).
    Separated from User to keep auth model lean.
    Auto-created when User is created.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=200, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, help_text="Profile photo file")
    avatar_url = models.URLField(blank=True, help_text="Profile photo URL (legacy or external)")
    language_pref = models.CharField(
        max_length=5, default='fr',
        choices=[('fr', 'Français'), ('ar', 'العربية')]
    )
    address_summary = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True, max_length=500)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile: {self.user.email}"


class AuthAudit(models.Model):
    """
    Immutable audit log for authentication events (Blueprint §2.1).
    Tracks logins, failures, password resets for security monitoring.
    """
    class Action(models.TextChoices):
        LOGIN = 'LOGIN', 'Login'
        LOGIN_FAIL = 'LOGIN_FAIL', 'Login Failed'
        PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'
        LOGOUT = 'LOGOUT', 'Logout'

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='auth_audits'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    user_agent = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action}: {self.user_id} @ {self.timestamp}"

    def save(self, *args, **kwargs):
        """Prevent updates — audit logs are append-only."""
        if self.pk:
            raise ValueError("AuthAudit entries cannot be modified.")
        super().save(*args, **kwargs)
