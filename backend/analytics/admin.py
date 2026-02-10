from django.contrib import admin
from .models import UserSession, DailyEngagementScore, DailyUserSnapshot


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'user', 'started_at', 'ended_at', 'duration_seconds']
    list_filter = ['user__role', 'ended_at']
    search_fields = ['user__email', 'session_id']
    readonly_fields = ['session_id', 'started_at', 'last_activity_at', 'ended_at', 'duration_seconds']


@admin.register(DailyEngagementScore)
class DailyEngagementScoreAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'total_score', 'login_score', 'job_create_score', 'offer_submit_score']
    list_filter = ['date', 'user__role']
    search_fields = ['user__email']
    date_hierarchy = 'date'


@admin.register(DailyUserSnapshot)
class DailyUserSnapshotAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'engagement_score', 'trust_score', 'revenue_generated']
    list_filter = ['date', 'user__role']
    search_fields = ['user__email']
    date_hierarchy = 'date'
    readonly_fields = ['segments']
