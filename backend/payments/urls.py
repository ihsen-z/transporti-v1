from django.urls import path
from .views import (
    ConfirmCompletionView,
    AdminEscrowReleaseView, AdminCommissionSettleView,
    AdminEscrowListView, AdminCommissionListView
)

urlpatterns = [
    # Client endpoints
    path('payments/confirm-completion/', ConfirmCompletionView.as_view(), name='confirm_completion'),
    
    # Admin endpoints
    path('admin/escrow/', AdminEscrowListView.as_view(), name='admin_escrow_list'),
    path('admin/escrow/<int:escrow_id>/release/', AdminEscrowReleaseView.as_view(), name='admin_escrow_release'),
    path('admin/commission/', AdminCommissionListView.as_view(), name='admin_commission_list'),
    path('admin/commission/<int:ledger_id>/settle/', AdminCommissionSettleView.as_view(), name='admin_commission_settle'),
]
