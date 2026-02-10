"""
Admin Authentication Views - Transporti V1
Separate admin auth endpoints with strict rate limiting.
"""
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.exceptions import ValidationError, PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiResponse

from transporti_core.throttling import AdminLoginThrottle
from users.permissions import RequireRole
from .services_admin_auth import (
    admin_login, 
    admin_logout,
    get_active_admin_session,
)

logger = logging.getLogger('transporti.security')


def get_client_ip(request) -> str:
    """Extract client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


class AdminLoginView(APIView):
    """
    POST /api/admin/auth/login/
    
    Admin-only login with strict rate limiting.
    Returns admin-specific JWT with short expiry.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AdminLoginThrottle]
    
    @extend_schema(
        request={
            'type': 'object',
            'properties': {
                'email': {'type': 'string'},
                'password': {'type': 'string'},
            },
            'required': ['email', 'password']
        },
        responses={
            200: OpenApiResponse(description='Login successful'),
            400: OpenApiResponse(description='Invalid credentials or locked'),
            403: OpenApiResponse(description='Not an admin'),
            429: OpenApiResponse(description='Too many attempts'),
        }
    )
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        ip_address = get_client_ip(request)
        
        if not email or not password:
            return Response(
                {'error': 'Email and password required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            result = admin_login(email, password, ip_address)
            return Response(result, status=status.HTTP_200_OK)
        
        except ValidationError as e:
            return Response(
                {'error': str(e.message if hasattr(e, 'message') else e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )


class AdminLogoutView(APIView):
    """
    POST /api/admin/auth/logout/
    
    Logout admin and revoke session.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    
    @extend_schema(
        responses={
            200: OpenApiResponse(description='Logged out'),
            403: OpenApiResponse(description='Not authenticated as admin'),
        }
    )
    def post(self, request):
        result = admin_logout(request.user)
        return Response(result, status=status.HTTP_200_OK)


class AdminSessionStatusView(APIView):
    """
    GET /api/admin/auth/session/
    
    Check current admin session status.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    
    @extend_schema(
        responses={
            200: OpenApiResponse(description='Session info'),
            404: OpenApiResponse(description='No active session'),
        }
    )
    def get(self, request):
        session = get_active_admin_session(request.user.id)
        
        if not session:
            return Response(
                {'error': 'No active session found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'session_id': session['session_id'],
            'created_at': session['created_at'],
            'ip_address': session['ip_address'],
            'user': {
                'id': request.user.id,
                'email': request.user.email,
                'role': request.user.role,
            }
        })
