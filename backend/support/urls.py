from django.urls import path
from .views import (
    DisputeCreateView, DisputeMyListView,
    AdminDisputeListView, AdminDisputeDetailView,
    AdminDisputeInvestigateView, AdminDisputeResolveView, AdminDisputeRejectView
)

urlpatterns = [
    # Client / Transporter endpoints
    path('disputes/', DisputeCreateView.as_view(), name='dispute_create'),
    path('disputes/my/', DisputeMyListView.as_view(), name='dispute_my_list'),
    
    # Moderator / Admin endpoints
    path('admin/disputes/', AdminDisputeListView.as_view(), name='admin_dispute_list'),
    path('admin/disputes/<int:dispute_id>/', AdminDisputeDetailView.as_view(), name='admin_dispute_detail'),
    path('admin/disputes/<int:dispute_id>/investigate/', AdminDisputeInvestigateView.as_view(), name='admin_dispute_investigate'),
    path('admin/disputes/<int:dispute_id>/resolve/', AdminDisputeResolveView.as_view(), name='admin_dispute_resolve'),
    path('admin/disputes/<int:dispute_id>/reject/', AdminDisputeRejectView.as_view(), name='admin_dispute_reject'),
]
