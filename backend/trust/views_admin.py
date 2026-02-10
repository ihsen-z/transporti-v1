"""
Trust Admin Views - Transporti V1
Admin-only API endpoints for trust moderation.

SECURITY:
- RBAC enforced via RequireRole
- AdminLoginThrottle applied
- All actions logged
"""
import logging
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError, PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiResponse

from users.models import User
from users.permissions import RequireRole
from transporti_core.throttling import AdminLoginThrottle
from .models import TrustProfile, TrustActionLog
from .serializers_admin import (
    TrustProfileAdminSerializer,
    TrustActionLogSerializer,
    TrustProfileDetailAdminSerializer,
    TrustActionSerializer,
    TrustRestoreSerializer,
)
from .services_admin import (
    verify_user,
    reject_user,
    suspend_user,
    restore_user,
    get_users_with_trust_data,
    get_user_trust_history,
    get_trust_profile_detail,
)

logger = logging.getLogger('transporti.security')


def get_client_ip(request) -> str:
    """Extract client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


class AdminTrustListView(generics.ListAPIView):
    """
    GET /api/admin/trust/users/
    
    List users with trust data for admin moderation.
    Supports filtering by status.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    serializer_class = TrustProfileAdminSerializer
    
    @extend_schema(
        responses={
            200: TrustProfileAdminSerializer(many=True),
            403: OpenApiResponse(description='Not admin/moderator'),
        }
    )
    def get_queryset(self):
        status_filter = self.request.query_params.get('status', None)
        return get_users_with_trust_data(status_filter=status_filter, limit=100)


class AdminTrustDetailView(APIView):
    """
    GET /api/admin/trust/users/{user_id}/
    
    Get comprehensive trust detail for a user.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    
    @extend_schema(
        responses={
            200: TrustProfileDetailAdminSerializer,
            404: OpenApiResponse(description='User or profile not found'),
        }
    )
    def get(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        detail = get_trust_profile_detail(user)
        
        if not detail:
            return Response(
                {'error': 'User has no trust profile.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'profile': TrustProfileAdminSerializer(detail['profile']).data,
            'pending_request': (
                detail['pending_request'].__dict__ if detail['pending_request'] else None
            ),
            'history': TrustActionLogSerializer(detail['history'], many=True).data,
        })


class AdminTrustHistoryView(generics.ListAPIView):
    """
    GET /api/admin/trust/users/{user_id}/history/
    
    Get trust action history for a user.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    serializer_class = TrustActionLogSerializer
    
    def get_queryset(self):
        user_id = self.kwargs['user_id']
        user = get_object_or_404(User, id=user_id)
        return get_user_trust_history(user, limit=100)


class AdminTrustVerifyView(APIView):
    """
    POST /api/admin/trust/users/{user_id}/verify/
    
    Verify a transporter.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    throttle_classes = [AdminLoginThrottle]
    
    @extend_schema(
        request=TrustActionSerializer,
        responses={
            200: TrustProfileAdminSerializer,
            400: OpenApiResponse(description='Validation error'),
            403: OpenApiResponse(description='Permission denied'),
        }
    )
    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        serializer = TrustActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            profile = verify_user(
                admin=request.user,
                target_user=target_user,
                reason=serializer.validated_data.get('reason', ''),
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'message': 'User verified successfully.',
                'profile': TrustProfileAdminSerializer(profile).data
            })
        
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST if isinstance(e, ValidationError) 
                else status.HTTP_403_FORBIDDEN
            )


class AdminTrustRejectView(APIView):
    """
    POST /api/admin/trust/users/{user_id}/reject/
    
    Reject a transporter's verification.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    throttle_classes = [AdminLoginThrottle]
    
    @extend_schema(
        request=TrustActionSerializer,
        responses={
            200: TrustProfileAdminSerializer,
            400: OpenApiResponse(description='Validation error'),
        }
    )
    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        serializer = TrustActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reason = serializer.validated_data.get('reason', '')
        if not reason or len(reason.strip()) < 10:
            return Response(
                {'error': 'Rejection reason required (minimum 10 characters).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            profile = reject_user(
                admin=request.user,
                target_user=target_user,
                reason=reason,
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'message': 'User rejected.',
                'profile': TrustProfileAdminSerializer(profile).data
            })
        
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST if isinstance(e, ValidationError) 
                else status.HTTP_403_FORBIDDEN
            )


class AdminTrustSuspendView(APIView):
    """
    POST /api/admin/trust/users/{user_id}/suspend/
    
    Suspend a transporter.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    throttle_classes = [AdminLoginThrottle]
    
    @extend_schema(
        request=TrustActionSerializer,
        responses={
            200: TrustProfileAdminSerializer,
            400: OpenApiResponse(description='Validation error'),
        }
    )
    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        serializer = TrustActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reason = serializer.validated_data.get('reason', '')
        if not reason or len(reason.strip()) < 10:
            return Response(
                {'error': 'Suspension reason required (minimum 10 characters).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            profile = suspend_user(
                admin=request.user,
                target_user=target_user,
                reason=reason,
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'message': 'User suspended.',
                'profile': TrustProfileAdminSerializer(profile).data
            })
        
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST if isinstance(e, ValidationError) 
                else status.HTTP_403_FORBIDDEN
            )


class AdminTrustRestoreView(APIView):
    """
    POST /api/admin/trust/users/{user_id}/restore/
    
    Restore a suspended/rejected transporter.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]
    throttle_classes = [AdminLoginThrottle]
    
    @extend_schema(
        request=TrustRestoreSerializer,
        responses={
            200: TrustProfileAdminSerializer,
            400: OpenApiResponse(description='Validation error'),
        }
    )
    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        serializer = TrustRestoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            profile = restore_user(
                admin=request.user,
                target_user=target_user,
                reason=serializer.validated_data.get('reason', ''),
                restore_to=serializer.validated_data.get('restore_to', 'VERIFIED'),
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'message': 'User restored.',
                'profile': TrustProfileAdminSerializer(profile).data
            })
        
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST if isinstance(e, ValidationError) 
                else status.HTTP_403_FORBIDDEN
            )


# =============================================================================
# TRUST POLICY ADMIN VIEWS
# =============================================================================

class AdminTrustPolicyListCreateView(APIView):
    """
    GET /api/admin/trust/policies/
    POST /api/admin/trust/policies/
    
    List all policies or create a new one.
    Only ADMIN role (not MODERATOR).
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    
    def get(self, request):
        from .models import TrustPolicy
        from .serializers_admin import TrustPolicySerializer
        
        policies = TrustPolicy.objects.all().order_by('-is_active', 'applies_to', '-updated_at')
        serializer = TrustPolicySerializer(policies, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        from .models import TrustPolicy
        from .serializers_admin import TrustPolicySerializer, TrustPolicyCreateSerializer
        
        serializer = TrustPolicyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        policy = TrustPolicy.objects.create(**serializer.validated_data)
        
        logger.info(
            f"TRUST_POLICY_CREATED: policy_id={policy.id}, name={policy.name}, "
            f"applies_to={policy.applies_to}, admin_id={request.user.id}"
        )
        
        return Response(
            TrustPolicySerializer(policy).data,
            status=status.HTTP_201_CREATED
        )


class AdminTrustPolicyDetailView(APIView):
    """
    PATCH /api/admin/trust/policies/{id}/
    
    Update an existing policy.
    Only ADMIN role.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    
    def patch(self, request, policy_id):
        from .models import TrustPolicy
        from .serializers_admin import TrustPolicySerializer, TrustPolicyUpdateSerializer
        
        policy = get_object_or_404(TrustPolicy, id=policy_id)
        
        # Capture before state
        before_state = {
            'name': policy.name,
            'min_score_escrow': policy.min_score_escrow,
            'min_score_cod': policy.min_score_cod,
            'min_score_visibility': policy.min_score_visibility,
        }
        
        serializer = TrustPolicyUpdateSerializer(policy, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Capture after state
        policy.refresh_from_db()
        after_state = {
            'name': policy.name,
            'min_score_escrow': policy.min_score_escrow,
            'min_score_cod': policy.min_score_cod,
            'min_score_visibility': policy.min_score_visibility,
        }
        
        logger.info(
            f"TRUST_POLICY_UPDATED: policy_id={policy.id}, admin_id={request.user.id}, "
            f"before={before_state}, after={after_state}"
        )
        
        return Response(TrustPolicySerializer(policy).data)


class AdminTrustPolicyActivateView(APIView):
    """
    POST /api/admin/trust/policies/{id}/activate/
    
    Activate a policy (auto-deactivates previous for same applies_to).
    Only ADMIN role.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    
    def post(self, request, policy_id):
        from .models import TrustPolicy
        from .serializers_admin import TrustPolicySerializer
        
        policy = get_object_or_404(TrustPolicy, id=policy_id)
        
        if policy.is_active:
            return Response(
                {'message': 'Policy is already active.', 'policy': TrustPolicySerializer(policy).data}
            )
        
        # Find current active policy for same category
        previous_policy = TrustPolicy.objects.filter(
            applies_to=policy.applies_to,
            is_active=True
        ).first()
        
        previous_name = previous_policy.name if previous_policy else None
        
        # Activate (model save() handles deactivation of previous)
        policy.is_active = True
        policy.save()
        
        logger.info(
            f"TRUST_POLICY_ACTIVATED: policy_id={policy.id}, name={policy.name}, "
            f"applies_to={policy.applies_to}, previous_policy={previous_name}, "
            f"admin_id={request.user.id}"
        )
        
        return Response({
            'message': f'Policy "{policy.name}" activated.',
            'previous_deactivated': previous_name,
            'policy': TrustPolicySerializer(policy).data
        })
