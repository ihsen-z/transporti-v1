from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Profile, AuthAudit

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'role', 'phone', 'is_active', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active', 'groups')
    search_fields = ('email', 'username', 'phone')
    ordering = ('-date_joined',)
    
    # Exclude or add custom fields to fieldsets as necessary
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone', 'is_phone_verified', 'last_seen_at')}),
    )

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name', 'language_pref')
    search_fields = ('user__email', 'full_name')

@admin.register(AuthAudit)
class AuthAuditAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'ip_address', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__email', 'ip_address')
    readonly_fields = ('user', 'ip_address', 'action', 'user_agent', 'timestamp')
