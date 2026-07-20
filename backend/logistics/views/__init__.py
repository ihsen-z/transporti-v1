"""
Logistics views package.

Split from the former single-file logistics/views.py (1400+ lines) into
thematic modules. All view classes are re-exported here so importers
(`from logistics.views import X` / `from .views import X`) are unchanged.
"""
from .jobs import (
    JobCreateView, JobMyListView, TransporterJobListView, JobPublicListView,
    JobDetailView, JobUpdateView, JobPublishView, TransporterCancelView,
    JobCancelView, JobCompleteView, JobConfirmStartView, JobEventsView,
)
from .offers import (
    JobOffersView, OfferCreateView, OfferMyListView, OfferAcceptView,
    OfferWithdrawView, CounterOfferCreateView, CounterOfferRespondView,
)
from .return_trips import ReturnTripCreateView, BookReturnTripView, ReturnTripManageView
from .trip_requests import (
    JobTripRequestsView, MyTripRequestsView,
    TripRequestRespondView, TripRequestAcceptCounterView, TripRequestCancelView,
)
from .profiles import (
    TransporterProfileView, TransporterProfileEditView,
    ClientProfileView, ClientProfileEditView, UserRoleView,
)
from .misc import (
    PriceEstimateView, FavoriteToggleView, FavoriteListView, CrossMetricsView,
    TransporterStatsView,
)
from .corridors import (
    ReturnTripMatchView, CorridorAlertListCreateView, CorridorAlertDeleteView,
)

__all__ = [
    # jobs
    'JobCreateView', 'JobMyListView', 'TransporterJobListView', 'JobPublicListView',
    'JobDetailView', 'JobUpdateView', 'JobPublishView', 'TransporterCancelView',
    'JobCancelView', 'JobCompleteView', 'JobConfirmStartView', 'JobEventsView',
    # offers
    'JobOffersView', 'OfferCreateView', 'OfferMyListView', 'OfferAcceptView',
    'OfferWithdrawView', 'CounterOfferCreateView', 'CounterOfferRespondView',
    # return trips
    'ReturnTripCreateView', 'BookReturnTripView', 'ReturnTripManageView',
    'JobTripRequestsView', 'MyTripRequestsView',
    'TripRequestRespondView', 'TripRequestAcceptCounterView', 'TripRequestCancelView',
    # profiles
    'TransporterProfileView', 'TransporterProfileEditView',
    'ClientProfileView', 'ClientProfileEditView', 'UserRoleView',
    # misc
    'PriceEstimateView', 'FavoriteToggleView', 'FavoriteListView', 'CrossMetricsView',
    'TransporterStatsView',
    # corridors (Sprint 4)
    'ReturnTripMatchView', 'CorridorAlertListCreateView', 'CorridorAlertDeleteView',
]
