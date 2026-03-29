from django.contrib import admin
from .models import Booking, CommissionLedger, EscrowTransaction

@admin.register(CommissionLedger)
class CommissionLedgerAdmin(admin.ModelAdmin):
    list_display = ('id', 'transporter', 'job_reference', 'amount', 'is_settled', 'created_at')
    list_filter = ('is_settled', 'created_at')
    search_fields = ('transporter__email', 'job_reference__id')

@admin.register(EscrowTransaction)
class EscrowTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking_reference', 'status', 'amount', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('booking_reference__id', 'gateway_reference')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'payment_method', 'final_price', 'created_at')
    list_filter = ('payment_method', 'cod_allowed', 'created_at')
    search_fields = ('job__id', 'accepted_offer__id')
