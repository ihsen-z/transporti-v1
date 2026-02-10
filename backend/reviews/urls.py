from django.urls import path
from .views import ReviewCreateView, ReviewListView, ReviewMyListView

urlpatterns = [
    path('reviews/', ReviewCreateView.as_view(), name='review_create'),
    path('reviews/user/<int:user_id>/', ReviewListView.as_view(), name='review_list_user'),
    path('reviews/my/', ReviewMyListView.as_view(), name='review_my_list'),
]
