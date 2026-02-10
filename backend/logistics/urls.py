from django.urls import path
from .views import (
    JobCreateView, JobMyListView, JobPublicListView, JobDetailView, JobOffersView,
    OfferCreateView, OfferMyListView, OfferAcceptView,
    JobUpdateView, JobPublishView, JobCancelView, JobCompleteView,
    OfferWithdrawView, TransporterProfileView
)

urlpatterns = [
    # Job endpoints
    path('jobs/', JobCreateView.as_view(), name='job_create'),
    path('jobs/my/', JobMyListView.as_view(), name='job_my_list'),
    path('jobs/public/', JobPublicListView.as_view(), name='job_public_list'),
    path('jobs/<int:job_id>/', JobDetailView.as_view(), name='job_detail'),
    path('jobs/<int:pk>/update/', JobUpdateView.as_view(), name='job_update'), # Explicit update endpoint
    path('jobs/<int:job_id>/offers/', JobOffersView.as_view(), name='job_offers'),
    path('jobs/<int:job_id>/publish/', JobPublishView.as_view(), name='job_publish'),
    path('jobs/<int:job_id>/cancel/', JobCancelView.as_view(), name='job_cancel'),
    path('jobs/<int:job_id>/complete/', JobCompleteView.as_view(), name='job_complete'),
    
    # Offer endpoints
    path('offers/', OfferCreateView.as_view(), name='offer_create'),
    path('offers/my/', OfferMyListView.as_view(), name='offer_my_list'),
    path('offers/<int:offer_id>/accept/', OfferAcceptView.as_view(), name='offer_accept'),
    path('offers/<int:offer_id>/withdraw/', OfferWithdrawView.as_view(), name='offer_withdraw'),

    # Public Profiles
    path('transporter/profile/<int:user_id>/', TransporterProfileView.as_view(), name='transporter_profile'),
]
