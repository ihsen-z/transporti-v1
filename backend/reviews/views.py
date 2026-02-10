from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Review
from .serializers import ReviewCreateSerializer, ReviewListSerializer
from users.permissions import IsOwnerOrReadOnly

User = get_user_model()

class ReviewCreateView(generics.CreateAPIView):
    """
    POST /api/reviews/
    Create a review for a completed job.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReviewCreateSerializer

    def perform_create(self, serializer):
        # validation logic is in serializer.validate()
        serializer.save()


class ReviewListView(generics.ListAPIView):
    """
    GET /api/reviews/user/{user_id}/
    List reviews received by a specific user.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ReviewListSerializer

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        get_object_or_404(User, pk=user_id) # Ensure user exists
        return Review.objects.filter(target_id=user_id).order_by('-created_at')


class ReviewMyListView(generics.ListAPIView):
    """
    GET /api/reviews/my/
    List reviews received by the current user.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReviewListSerializer

    def get_queryset(self):
        return Review.objects.filter(target=self.request.user).order_by('-created_at')
