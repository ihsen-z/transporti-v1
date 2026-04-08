from django.urls import path
from .views import (
    ReviewCreateView,
    ReviewListView,
    ReviewMyListView,
    AdminReviewListView,
    AdminReviewToggleVisibilityView,
)

urlpatterns = [
    # User endpoints
    path('reviews/', ReviewCreateView.as_view(), name='review_create'),
    path('reviews/user/<int:user_id>/', ReviewListView.as_view(), name='review_list_user'),
    path('reviews/my/', ReviewMyListView.as_view(), name='review_my_list'),

    # Admin endpoints
    path('admin/reviews/', AdminReviewListView.as_view(), name='admin-reviews-list'),
    path('admin/reviews/<int:pk>/visibility/', AdminReviewToggleVisibilityView.as_view(), name='admin-review-visibility'),
]
