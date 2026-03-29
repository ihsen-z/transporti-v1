from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from logistics.models import TransportJob
from users.models import User

class DataListView(APIView):
    """
    Read‑only endpoint returning real-time data for monitoring.
    For simplicity, requires admin/staff authentication.
    """
    def get(self, request, format=None):
        if not request.user.is_staff:
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
            
        jobs = list(TransportJob.objects.all().values(
            'id', 'status', 'job_type', 'pickup_governorate', 'dropoff_governorate', 'scheduled_time'
        ).order_by('-created_at')[:50])
        
        users = list(User.objects.all().values(
            'id', 'email', 'role', 'is_active', 'last_seen_at'
        ).order_by('-date_joined')[:50])
        
        return Response({
            "recent_jobs": jobs,
            "recent_users": users
        }, status=status.HTTP_200_OK)
