from django.urls import path
from .views import (
    JobCreateView, JobMyListView, JobPublicListView, JobDetailView, JobOffersView,
    OfferCreateView, OfferMyListView, OfferAcceptView,
    JobUpdateView, JobPublishView, JobCancelView, JobCompleteView, TransporterCancelView,
    JobConfirmStartView, JobEventsView,
    OfferWithdrawView, TransporterProfileView, TransporterProfileEditView,
    TransporterJobListView, ReturnTripCreateView, PriceEstimateView,
    BookReturnTripView, ReturnTripManageView,
    JobTripRequestsView, MyTripRequestsView,
    TripRequestRespondView, TripRequestAcceptCounterView, TripRequestCancelView,
    ReturnTripMatchView, CorridorAlertListCreateView, CorridorAlertDeleteView,
    ClientProfileView, ClientProfileEditView,
    UserRoleView,
    FavoriteToggleView, FavoriteListView,
    CrossMetricsView, TransporterStatsView,
    CounterOfferCreateView, CounterOfferRespondView,
)
from .upload_views import PhotoUploadView
from payments.views import JobBookingDetailView, JobEscrowDetailView

urlpatterns = [
    # Photo upload
    path('upload/photo/', PhotoUploadView.as_view(), name='photo_upload'),

    # Job endpoints
    path('jobs/', JobCreateView.as_view(), name='job_create'),
    path('jobs/my/', JobMyListView.as_view(), name='job_my_list'),
    path('jobs/transporter/', TransporterJobListView.as_view(), name='transporter_job_list'),
    path('jobs/return-trip/', ReturnTripCreateView.as_view(), name='return_trip_create'),
    path('jobs/estimate-price/', PriceEstimateView.as_view(), name='price_estimate'),
    path('jobs/public/', JobPublicListView.as_view(), name='job_public_list'),
    path('jobs/<int:job_id>/', JobDetailView.as_view(), name='job_detail'),
    path('jobs/<int:pk>/update/', JobUpdateView.as_view(), name='job_update'), # Explicit update endpoint
    path('jobs/<int:job_id>/offers/', JobOffersView.as_view(), name='job_offers'),
    path('jobs/<int:job_id>/publish/', JobPublishView.as_view(), name='job_publish'),
    path('jobs/<int:job_id>/cancel/', JobCancelView.as_view(), name='job_cancel'),
    path('jobs/<int:job_id>/transporter-cancel/', TransporterCancelView.as_view(), name='transporter_cancel'),
    path('jobs/<int:job_id>/confirm-start/', JobConfirmStartView.as_view(), name='job_confirm_start'),
    path('jobs/<int:job_id>/events/', JobEventsView.as_view(), name='job_events'),
    path('jobs/<int:job_id>/complete/', JobCompleteView.as_view(), name='job_complete'),
    path('jobs/<int:job_id>/book-return/', BookReturnTripView.as_view(), name='book_return_trip'),
    path('jobs/<int:job_id>/return-trip/', ReturnTripManageView.as_view(), name='return_trip_manage'),
    path('jobs/<int:job_id>/requests/', JobTripRequestsView.as_view(), name='job_trip_requests'),
    path('trip-requests/my/', MyTripRequestsView.as_view(), name='my_trip_requests'),
    path('trip-requests/<int:request_id>/respond/', TripRequestRespondView.as_view(), name='trip_request_respond'),
    path('trip-requests/<int:request_id>/accept-counter/', TripRequestAcceptCounterView.as_view(), name='trip_request_accept_counter'),
    path('trip-requests/<int:request_id>/cancel/', TripRequestCancelView.as_view(), name='trip_request_cancel'),

    # Matching v1 & corridor alerts (Sprint 4 — pivot)
    path('return-trips/match/', ReturnTripMatchView.as_view(), name='return_trip_match'),
    path('corridor-alerts/', CorridorAlertListCreateView.as_view(), name='corridor_alerts'),
    path('corridor-alerts/<int:alert_id>/', CorridorAlertDeleteView.as_view(), name='corridor_alert_delete'),
    path('jobs/<int:job_id>/booking/', JobBookingDetailView.as_view(), name='job_booking_detail'),
    path('jobs/<int:job_id>/escrow/', JobEscrowDetailView.as_view(), name='job_escrow_detail'),
    
    # Offer endpoints
    path('offers/', OfferCreateView.as_view(), name='offer_create'),
    path('offers/my/', OfferMyListView.as_view(), name='offer_my_list'),
    path('offers/<int:offer_id>/accept/', OfferAcceptView.as_view(), name='offer_accept'),
    path('offers/<int:offer_id>/withdraw/', OfferWithdrawView.as_view(), name='offer_withdraw'),

    # Public Profiles
    path('transporter/profile/me/', TransporterProfileEditView.as_view(), name='transporter_profile_edit'),
    path('transporter/profile/<int:user_id>/', TransporterProfileView.as_view(), name='transporter_profile'),

    # Client Profiles
    path('client/profile/me/', ClientProfileEditView.as_view(), name='client_profile_edit'),
    path('client/profile/<int:user_id>/', ClientProfileView.as_view(), name='client_profile'),

    # User Role (lightweight — for profile routing)
    path('user/<int:user_id>/role/', UserRoleView.as_view(), name='user_role'),

    # Favorites (P2-09)
    path('favorites/', FavoriteListView.as_view(), name='favorite_list'),
    path('favorites/toggle/', FavoriteToggleView.as_view(), name='favorite_toggle'),

    # Cross Metrics (P2-01)
    path('metrics/dashboard/', CrossMetricsView.as_view(), name='cross_metrics'),

    # Canonical transporter KPIs (Sprint 2 — B2)
    path('transporter/stats/', TransporterStatsView.as_view(), name='transporter_stats'),

    # Counter-Offers (P2-05)
    path('offers/<int:offer_id>/counter/', CounterOfferCreateView.as_view(), name='counter_offer_create'),
    path('counter-offers/<int:counter_id>/respond/', CounterOfferRespondView.as_view(), name='counter_offer_respond'),
]
