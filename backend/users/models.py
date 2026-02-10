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
