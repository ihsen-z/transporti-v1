from django.contrib import admin
from .models import TransportJob, Offer

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
