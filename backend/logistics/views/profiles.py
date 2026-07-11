"""Public and self-service profile views (transporter, client) + role lookup."""
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from ..serializers import (
    TransporterProfileSerializer, TransporterProfileEditSerializer,
    ClientProfileSerializer, ClientProfileUpdateSerializer,
)


class TransporterProfileView(generics.RetrieveAPIView):
    """
    GET /api/transporter/profile/{user_id}/
    Public profile for transporters.
    Masks email/phone for non-owners (SEC-T2).
    Optimized with annotated query (PERF-T1).
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TransporterProfileSerializer

    def get(self, request, user_id):
        from trust.models import TrustProfile
        from django.db.models import Avg, Count
        from django.contrib.auth import get_user_model
        from django.core.cache import cache
        from django.conf import settings as conf_settings

        User = get_user_model()
        # Ensure user exists and is a transporter
        user_obj = User.objects.filter(id=user_id, role='TRANSPORTER').first()
        if not user_obj:
            return Response({'error': 'Profil introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        # Auto-create TrustProfile if missing
        trust_profile, _ = TrustProfile.objects.get_or_create(user=user_obj)

        # Cache annotated profile (Phase 2: avoid repeated Avg/Count queries)
        cache_key = f'transporter_profile_{user_id}'
        cached = cache.get(cache_key)
        if cached is None:
            # Re-fetch with annotations
            trust_profile = TrustProfile.objects.select_related(
                'user', 'user__profile'
            ).annotate(
                _avg_rating=Avg('user__reviews_received__rating'),
                _review_count=Count('user__reviews_received', distinct=True),
            ).filter(user_id=user_id).first()
            cache.set(cache_key, trust_profile, getattr(conf_settings, 'CACHE_TTL_PROFILE', 120))
        else:
            trust_profile = cached

        is_owner = request.user.id == trust_profile.user_id
        serializer = TransporterProfileSerializer(
            trust_profile,
            context={'request': request, 'is_owner': is_owner}
        )
        return Response(serializer.data)


class TransporterProfileEditView(APIView):
    """
    GET  /api/transporter/profile/me/  — Returns own profile data.
    PATCH /api/transporter/profile/me/ — Updates own profile.
    Only accessible to authenticated transporters.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'TRANSPORTER':
            return Response(
                {'error': 'Réservé aux transporteurs.'},
                status=status.HTTP_403_FORBIDDEN
            )
        from trust.models import TrustProfile
        trust_profile, _ = TrustProfile.objects.get_or_create(user=request.user)
        serializer = TransporterProfileSerializer(
            trust_profile,
            context={'request': request, 'is_owner': True}
        )
        return Response(serializer.data)

    def patch(self, request):
        if request.user.role != 'TRANSPORTER':
            return Response(
                {'error': 'Réservé aux transporteurs.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = TransporterProfileEditSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user = request.user

        # Update User fields (email excluded — SEC-T1)
        user_fields = ['first_name', 'last_name', 'phone']
        user_changed = False
        for field in user_fields:
            if field in data:
                setattr(user, field, data[field])
                user_changed = True
        if user_changed:
            user.save()

        # Update TrustProfile fields
        from trust.models import TrustProfile
        trust_profile, _ = TrustProfile.objects.get_or_create(user=user)
        profile_fields = ['vehicle_type', 'vehicle_capacity_kg', 'service_areas', 'specializations', 'vehicle_photos']
        for field in profile_fields:
            if field in data:
                setattr(trust_profile, field, data[field])
        trust_profile.save()

        # Update User Profile fields (bio)
        if 'bio' in data:
            try:
                profile = user.profile
                profile.bio = data['bio']
                profile.save(update_fields=['bio'])
            except Exception:
                pass  # Profile might not exist yet

        # Return updated profile
        return Response({
            'message': 'Profil mis à jour avec succès.',
            'profile': TransporterProfileSerializer(
                trust_profile,
                context={'request': request, 'is_owner': True}
            ).data
        })


class ClientProfileView(generics.RetrieveAPIView):
    """
    GET /api/client/profile/{user_id}/
    Public client profile (read-only).
    Masks email/phone for non-owners.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        from django.contrib.auth import get_user_model
        from django.db.models import Count, Q, Avg
        User = get_user_model()
        # Single annotated query — replaces 6 individual queries (BL3)
        user_obj = User.objects.filter(id=user_id, role='CLIENT').select_related('profile').annotate(
            _total_jobs_posted=Count('jobs', distinct=True),
            _completed_jobs=Count('jobs', filter=Q(jobs__status='COMPLETED'), distinct=True),
            _active_jobs=Count('jobs', filter=Q(jobs__status__in=['PUBLISHED', 'MATCHED', 'IN_PROGRESS']), distinct=True),
            _total_offers_received=Count('jobs__offers', distinct=True),
            _avg_rating=Avg('reviews_received__rating'),
            _review_count=Count('reviews_received', distinct=True),
        ).first()
        if not user_obj:
            return Response({'error': 'Profil introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = request.user.id == user_obj.id
        serializer = ClientProfileSerializer(
            user_obj,
            context={'request': request, 'is_owner': is_owner}
        )
        return Response(serializer.data)


class ClientProfileEditView(APIView):
    """
    GET  /api/client/profile/me/  — Returns own client profile data.
    PATCH /api/client/profile/me/ — Updates own client profile.
    Only accessible to authenticated clients.
    Email is NOT editable here — requires a separate verified flow.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CLIENT':
            return Response(
                {'error': 'Réservé aux clients.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = ClientProfileSerializer(
            request.user,
            context={'request': request, 'is_owner': True}
        )
        return Response(serializer.data)

    def patch(self, request):
        if request.user.role != 'CLIENT':
            return Response(
                {'error': 'Réservé aux clients.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate input with dedicated serializer (BL1/SEC3)
        update_serializer = ClientProfileUpdateSerializer(data=request.data)
        if not update_serializer.is_valid():
            return Response(
                {'errors': update_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        validated = update_serializer.validated_data
        user = request.user

        # Update User fields (email excluded — SEC1/BL2)
        user_fields = ['first_name', 'last_name', 'phone']
        user_changed = False
        for field in user_fields:
            if field in validated:
                setattr(user, field, validated[field])
                user_changed = True
        if user_changed:
            user.save()

        # Update Profile fields
        profile_fields = ['bio', 'address_summary']
        try:
            profile = user.profile
        except Exception:
            from users.models import Profile
            profile = Profile.objects.create(user=user)
        for field in profile_fields:
            if field in validated:
                setattr(profile, field, validated[field])
        profile.save()

        # Return updated profile
        return Response({
            'message': 'Profil mis à jour avec succès.',
            'profile': ClientProfileSerializer(
                user,
                context={'request': request, 'is_owner': True}
            ).data
        })


class UserRoleView(APIView):
    """
    GET /api/user/{user_id}/role/
    Lightweight endpoint to determine user role for profile routing (P3).
    Avoids double API calls (transporter 404 → client fallback).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user_obj = get_object_or_404(User, id=user_id)
        return Response({
            'id': user_obj.id,
            'role': user_obj.role,
        })
