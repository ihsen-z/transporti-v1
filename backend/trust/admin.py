"""
Trust Admin - Transporti V1
Admin interface for TrustProfile and TrustVerificationRequest.
"""
from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.contrib import messages

from .models import TrustProfile, VerificationDocument, TrustVerificationRequest


@admin.register(TrustProfile)
class TrustProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'verification_status', 'trust_score_badge', 
        'verified_at', 'created_at'
    ]
    list_filter = ['verification_status', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = [
        'user', 'trust_score', 'trust_score_updated_at',
        'verified_at', 'last_submitted_at', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Verification Status', {
            'fields': ('verification_status', 'rejection_reason', 'verified_at', 'last_submitted_at')
        }),
        ('Trust Score', {
            'fields': ('trust_score', 'trust_score_updated_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def trust_score_badge(self, obj):
        score = obj.trust_score
        if score >= 80:
            color = 'green'
        elif score >= 50:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, score
        )
    trust_score_badge.short_description = 'Trust Score'
    
    def has_add_permission(self, request):
        # Profiles are created via services
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(VerificationDocument)
class VerificationDocumentAdmin(admin.ModelAdmin):
    list_display = ['profile', 'document_type', 'is_valid', 'uploaded_at']
    list_filter = ['document_type', 'is_valid', 'uploaded_at']
    search_fields = ['profile__user__email']
    readonly_fields = ['profile', 's3_key', 'encryption_iv', 'file_hash', 'uploaded_at']
    
    def has_add_permission(self, request):
        return False


@admin.register(TrustVerificationRequest)
class TrustVerificationRequestAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'transporter_email', 'document_type', 'status_badge',
        'submitted_at', 'reviewed_by'
    ]
    list_filter = ['status', 'document_type', 'submitted_at']
    search_fields = ['trust_profile__user__email']
    readonly_fields = [
        'trust_profile', 'document_type', 'document_file',
        'submitted_at', 'reviewed_by', 'reviewed_at'
    ]
    actions = ['approve_selected', 'reject_selected']
    
    fieldsets = (
        ('Request Info', {
            'fields': ('trust_profile', 'document_type', 'document_file', 'submitted_at')
        }),
        ('Status', {
            'fields': ('status', 'review_notes')
        }),
        ('Review', {
            'fields': ('reviewed_by', 'reviewed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def transporter_email(self, obj):
        return obj.trust_profile.user.email
    transporter_email.short_description = 'Transporter'
    
    def status_badge(self, obj):
        colors = {
            'PENDING': 'orange',
            'APPROVED': 'green',
            'REJECTED': 'red',
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, 'black'), obj.status
        )
    status_badge.short_description = 'Status'
    
    def has_add_permission(self, request):
        return False
    
    @admin.action(description='Approve selected verification requests')
    def approve_selected(self, request, queryset):
        from .services import approve_verification_request
        
        approved = 0
        for req in queryset.filter(status='PENDING'):
            try:
                approve_verification_request(req.id, request.user, 'Approved via admin bulk action')
                approved += 1
            except Exception as e:
                self.message_user(request, f"Error approving {req.id}: {e}", messages.ERROR)
        
        if approved:
            self.message_user(request, f"Approved {approved} request(s).", messages.SUCCESS)
    
    @admin.action(description='Reject selected verification requests')
    def reject_selected(self, request, queryset):
        from .services import reject_verification_request
        
        rejected = 0
        for req in queryset.filter(status='PENDING'):
            try:
                reject_verification_request(req.id, request.user, 'Rejected via admin bulk action')
                rejected += 1
            except Exception as e:
                self.message_user(request, f"Error rejecting {req.id}: {e}", messages.ERROR)
        
        if rejected:
            self.message_user(request, f"Rejected {rejected} request(s).", messages.WARNING)
