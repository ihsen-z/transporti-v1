from django.urls import path
from .views import (
    InitiatePaymentView, PaymentWebhookView, PaymentStatusView,
    VerifyPaymentView, ConfirmCompletionView,
    TransporterWalletView, WithdrawalRequestCreateView,
    AdminEscrowReleaseView, AdminCommissionSettleView,
    AdminEscrowListView, AdminCommissionListView
)

urlpatterns = [
    # Payment gateway endpoints
    path('payments/initiate/', InitiatePaymentView.as_view(), name='payment_initiate'),
    path('payments/webhook/', PaymentWebhookView.as_view(), name='payment_webhook'),
    path('payments/verify/', VerifyPaymentView.as_view(), name='payment_verify'),
    path('payments/<str:reference>/status/', PaymentStatusView.as_view(), name='payment_status'),

    # Client endpoints
    path('payments/confirm-completion/', ConfirmCompletionView.as_view(), name='confirm_completion'),

    # Transporter wallet (Sprint 2 — A2)
    path('wallet/', TransporterWalletView.as_view(), name='transporter_wallet'),
    path('wallet/withdrawals/', WithdrawalRequestCreateView.as_view(), name='wallet_withdrawal_create'),
    
    # Admin endpoints
    path('admin/escrow/', AdminEscrowListView.as_view(), name='admin_escrow_list'),
    path('admin/escrow/<int:escrow_id>/release/', AdminEscrowReleaseView.as_view(), name='admin_escrow_release'),
    path('admin/commission/', AdminCommissionListView.as_view(), name='admin_commission_list'),
    path('admin/commission/<int:ledger_id>/settle/', AdminCommissionSettleView.as_view(), name='admin_commission_settle'),
]
