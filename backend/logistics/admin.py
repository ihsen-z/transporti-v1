from django.contrib import admin
from .models import TransportJob, Offer, PricingGrid

@admin.register(TransportJob)
class TransportJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'job_type', 'status', 'owner', 'pickup_governorate', 'dropoff_governorate', 'scheduled_time')
    list_filter = ('status', 'job_type', 'pickup_governorate', 'dropoff_governorate')
    search_fields = ('owner__email', 'pickup_address', 'dropoff_address')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'transporter', 'status', 'total_price', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('transporter__email', 'job__id')


@admin.register(PricingGrid)
class PricingGridAdmin(admin.ModelAdmin):
    """Admin for configurable pricing grids (L5)."""
    list_display = ('job_type', 'base_rate', 'per_km_rate', 'min_price', 'max_multiplier', 'is_active', 'updated_at')
    list_editable = ('base_rate', 'per_km_rate', 'min_price', 'max_multiplier', 'is_active')
    list_filter = ('is_active', 'job_type')
    readonly_fields = ('updated_at',)
