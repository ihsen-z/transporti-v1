from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Review
from .serializers import ReviewCreateSerializer, ReviewListSerializer, AdminReviewSerializer
from users.permissions import IsOwnerOrReadOnly, RequireRole

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


# =============================================================================
# Admin Review Endpoints
# =============================================================================

class AdminReviewListView(APIView):
    """
    GET /api/admin/reviews/
    List all reviews for admin moderation.
    Returns ALL reviews (not just flagged) so admin can see the full picture.
    """
    permission_classes = [permissions.IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request):
        qs = Review.objects.select_related(
            'reviewer', 'target', 'job'
        ).prefetch_related('abuse_logs').order_by('-created_at')

        # Optional filters
        flagged_only = request.query_params.get('flagged')
        if flagged_only == 'true':
            qs = qs.filter(is_flagged=True)

        serializer = AdminReviewSerializer(qs, many=True)
        return Response(serializer.data)


class AdminReviewToggleVisibilityView(APIView):
    """
    PATCH /api/admin/reviews/{id}/visibility/
    Toggle the is_flagged (hidden) status of a review.
    """
    permission_classes = [permissions.IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def patch(self, request, pk):
        review = get_object_or_404(Review, pk=pk)
        review.is_flagged = not review.is_flagged
        if review.is_flagged and not review.flag_reason:
            review.flag_reason = request.data.get('reason', 'Masqué par admin')
        review.save(update_fields=['is_flagged', 'flag_reason', 'updated_at'])

        return Response({
            'message': f"Avis #{pk} {'masqué' if review.is_flagged else 'visible'}.",
            'review': AdminReviewSerializer(review).data,
        })

