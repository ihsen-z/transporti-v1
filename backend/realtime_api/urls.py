from django.urls import path
from . import views

urlpatterns = [
    path('data/', views.DataListView.as_view(), name='data-list'),
]
