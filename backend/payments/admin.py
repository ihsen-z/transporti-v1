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


from django.utils import timezone
from .models import WithdrawalRequest


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    """D4 — traitement manuel des retraits en back-office (Phase 1)."""
    list_display = ('id', 'transporter', 'amount', 'status', 'bank_details', 'requested_at', 'processed_at')
    list_filter = ('status', 'requested_at')
    search_fields = ('transporter__email', 'bank_details')
    actions = ['mark_processing', 'mark_paid', 'mark_rejected']

    @admin.action(description="Marquer en cours de traitement")
    def mark_processing(self, request, queryset):
        queryset.filter(status=WithdrawalRequest.Status.REQUESTED).update(
            status=WithdrawalRequest.Status.PROCESSING)

    @admin.action(description="Marquer payé (virement effectué)")
    def mark_paid(self, request, queryset):
        queryset.exclude(status=WithdrawalRequest.Status.REJECTED).update(
            status=WithdrawalRequest.Status.PAID, processed_at=timezone.now())

    @admin.action(description="Rejeter")
    def mark_rejected(self, request, queryset):
        queryset.exclude(status=WithdrawalRequest.Status.PAID).update(
            status=WithdrawalRequest.Status.REJECTED, processed_at=timezone.now())
