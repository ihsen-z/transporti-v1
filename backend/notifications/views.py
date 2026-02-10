"""
Notifications Views - Transporti V1
User notification API endpoints.
"""
import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer, NotificationListSerializer, UnreadCountSerializer
from .services import mark_as_read, mark_all_read, get_unread_count

logger = logging.getLogger('transporti')


class MyNotificationsListView(generics.ListAPIView):
    """
    GET /api/notifications/my/
    
    List authenticated user's notifications.
    Most recent first, paginated.
    """
    serializer_class = NotificationListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).order_by('-created_at')


class MyNotificationsUnreadView(generics.ListAPIView):
    """
    GET /api/notifications/my/unread/
    
    List only unread notifications.
    """
    serializer_class = NotificationListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user,
            is_read=False
        ).order_by('-created_at')


class NotificationDetailView(generics.RetrieveAPIView):
    """
    GET /api/notifications/{id}/
    
    Get notification details.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationReadView(APIView):
    """
    POST /api/notifications/{id}/read/
    
    Mark a notification as read.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk=pk,
                user=request.user
            )
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        mark_as_read(notification)
        
        serializer = NotificationSerializer(notification)
        return Response(serializer.data)


class NotificationReadAllView(APIView):
    """
    POST /api/notifications/read-all/
    
    Mark all notifications as read.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        count = mark_all_read(request.user)
        
        return Response({
            "message": f"Marked {count} notifications as read",
            "count": count
        })


class UnreadCountView(APIView):
    """
    GET /api/notifications/unread-count/
    
    Get count of unread notifications.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        count = get_unread_count(request.user)
        serializer = UnreadCountSerializer({'unread_count': count})
        return Response(serializer.data)
