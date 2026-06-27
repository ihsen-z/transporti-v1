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


# =============================================================================
# Device Token Management (Mobile Push Notifications)
# =============================================================================

class DeviceTokenRegisterView(APIView):
    """
    POST /api/v1/notifications/devices/register/
    
    Register or re-activate a device token for push notifications.
    Called by mobile clients on each app launch.
    
    Idempotent: if the token already exists for this user,
    it is reactivated (not duplicated).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .serializers import DeviceTokenRegisterSerializer
        from .models import DeviceToken

        serializer = DeviceTokenRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        platform = serializer.validated_data['platform']
        token = serializer.validated_data['token']
        device_name = serializer.validated_data.get('device_name', '')

        # Upsert: create or reactivate
        device, created = DeviceToken.objects.update_or_create(
            user=request.user,
            token=token,
            defaults={
                'platform': platform,
                'device_name': device_name,
                'is_active': True,
            },
        )

        logger.info(
            f"DEVICE_TOKEN_{'CREATED' if created else 'REACTIVATED'}: "
            f"user_id={request.user.id}, platform={platform}"
        )

        return Response(
            {
                'message': 'Device registered successfully.',
                'device_id': device.id,
                'created': created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DeviceTokenUnregisterView(APIView):
    """
    DELETE /api/v1/notifications/devices/{token}/
    
    Deactivate a device token (e.g., on logout).
    Soft-deletes by setting is_active=False.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, token):
        from .models import DeviceToken

        updated = DeviceToken.objects.filter(
            user=request.user,
            token=token,
            is_active=True,
        ).update(is_active=False)

        if updated == 0:
            return Response(
                {'error': 'Device token not found or already inactive.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        logger.info(f"DEVICE_TOKEN_UNREGISTERED: user_id={request.user.id}")

        return Response({'message': 'Device unregistered successfully.'})


class DeviceTokenListView(APIView):
    """
    GET /api/v1/notifications/devices/
    
    List the current user's registered devices.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .serializers import DeviceTokenListSerializer
        from .models import DeviceToken

        devices = DeviceToken.objects.filter(
            user=request.user,
            is_active=True,
        ).order_by('-created_at')

        serializer = DeviceTokenListSerializer(devices, many=True)
        return Response(serializer.data)
