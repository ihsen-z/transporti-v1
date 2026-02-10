from django.urls import path
from .views import (
    JobCreateView, JobMyListView, JobPublicListView, 
    JobDetailView, JobOffersView,
    OfferCreateView, OfferMyListView, OfferAcceptView
)

urlpatterns = [
    # Job endpoints
    path('jobs/', JobCreateView.as_view(), name='job_create'),
    path('jobs/my/', JobMyListView.as_view(), name='job_my_list'),
    path('jobs/public/', JobPublicListView.as_view(), name='job_public_list'),
    path('jobs/<int:job_id>/', JobDetailView.as_view(), name='job_detail'),
    path('jobs/<int:job_id>/offers/', JobOffersView.as_view(), name='job_offers'),
    
    # Offer endpoints
    path('offers/', OfferCreateView.as_view(), name='offer_create'),
    path('offers/my/', OfferMyListView.as_view(), name='offer_my_list'),
    path('offers/<int:offer_id>/accept/', OfferAcceptView.as_view(), name='offer_accept'),
]
