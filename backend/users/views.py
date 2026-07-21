import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings as django_settings

from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer
from transporti_core.throttling import AuthRateThrottle

logger = logging.getLogger('transporti')

def seed_db_view(request):
    import io
    import traceback
    from django.core.management import call_command
    from django.http import HttpResponse
    # SECURITY: 404 (et non 403) si non activé — ne révèle pas l'existence de la route.
    if not getattr(django_settings, 'ENABLE_SEED_ENDPOINT', False):
        return HttpResponse(status=404)
    try:
        out = io.StringIO()
        call_command('seed_test_data', stdout=out, stderr=out)
        return HttpResponse("SUCCESS:\n" + out.getvalue(), content_type="text/plain")
    except Exception as e:
        return HttpResponse("ERROR:\n" + traceback.format_exc(), content_type="text/plain", status=500)



class RegisterView(APIView):
    """
    POST /api/auth/register/
    Handles user registration for CLIENT and TRANSPORTER roles.
    Returns JWT tokens on success (auto-login).
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            logger.info(f"USER_REGISTERED: user_id={user.id}, email={user.email}, role={user.role}")
            
            # Send welcome email (async-safe: never blocks registration)
            try:
                from notifications.emails import notify_welcome
                notify_welcome(user)
            except Exception:
                pass
            
            # Generate JWT tokens (auto-login)
            refresh = RefreshToken.for_user(user)
            
            # Add custom claims to token
            refresh['role'] = user.role
            refresh['is_verified'] = user.is_phone_verified
            
            return Response({
                'message': 'Registration successful.',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    POST /api/auth/login/
    Validates credentials and returns JWT tokens.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            logger.info(f"USER_LOGIN: user_id={user.id}, email={user.email}")
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Add custom claims
            effective_role = user.role
            if user.is_superuser or user.is_staff:
                effective_role = 'ADMIN'
                
            refresh['role'] = effective_role
            refresh['is_verified'] = user.is_phone_verified
            
            # Add trust status for transporters
            if user.role == 'TRANSPORTER':
                try:
                    refresh['trust_status'] = user.trust_profile.verification_status
                except AttributeError:
                    logger.warning(f"USER_LOGIN: transporter {user.id} missing trust_profile")
                    refresh['trust_status'] = 'UNVERIFIED'
            
            return Response({
                'message': 'Login successful.',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    """
    GET /api/auth/profile/ - Returns current user profile.
    PUT /api/auth/profile/ - Updates user profile (partial).
    """
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user_data = UserProfileSerializer(request.user).data
        # Include avatar URL from profile
        avatar_url = None
        try:
            profile = request.user.profile
            if profile.avatar:
                avatar_url = request.build_absolute_uri(profile.avatar.url)
            elif profile.avatar_url:
                avatar_url = profile.avatar_url
        except Exception:
            pass
        user_data['avatar_url'] = avatar_url
        # Include profile fields for frontend settings page
        try:
            prof = request.user.profile
            user_data['address_summary'] = prof.address_summary or ''
            user_data['language_pref'] = prof.language_pref or 'fr'
        except Exception:
            user_data['address_summary'] = ''
            user_data['language_pref'] = 'fr'
        return Response({
            'user': user_data
        })

    def put(self, request):
        from .serializers import UserProfileUpdateSerializer
        
        serializer = UserProfileUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            
            logger.info(f"USER_PROFILE_UPDATED: user_id={request.user.id}")
            
            return Response({
                'message': 'Profile updated successfully.',
                'user': UserProfileSerializer(request.user).data
            })
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationPreferenceView(APIView):
    """
    GET  /api/auth/notification-preferences/ - Returns current notification preferences.
    PUT  /api/auth/notification-preferences/ - Updates notification preferences (partial).
    """
    def get(self, request):
        from .models import NotificationPreference
        from .serializers import NotificationPreferenceSerializer
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response({
            'data': NotificationPreferenceSerializer(prefs).data
        })

    def put(self, request):
        from .models import NotificationPreference
        from .serializers import NotificationPreferenceSerializer
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"NOTIFICATION_PREFS_UPDATED: user_id={request.user.id}")
            return Response({
                'message': 'Préférences mises à jour.',
                'data': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Allows authenticated users to change their password.
    """
    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not current_password or not new_password:
            return Response(
                {'error': 'Les champs mot de passe actuel et nouveau sont requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(current_password):
            return Response(
                {'current_password': 'Le mot de passe actuel est incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(new_password, request.user)
        except ValidationError as e:
            return Response(
                {'new_password': list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save()

        logger.info(f"PASSWORD_CHANGED: user_id={request.user.id}")

        return Response({'message': 'Mot de passe modifié avec succès.'})


class DashboardStatsView(APIView):
    """
    GET /api/auth/dashboard/
    Returns role-aware dashboard stats from real data.
    """
    def get(self, request):
        user = request.user

        if user.role == 'CLIENT':
            from logistics.models import TransportJob, Offer
            jobs = TransportJob.objects.filter(owner=user)
            active_statuses = ['PUBLISHED', 'MATCHED', 'IN_PROGRESS']

            active_jobs = jobs.filter(status__in=active_statuses).count()
            completed_jobs = jobs.filter(status='COMPLETED').count()
            total_offers = Offer.objects.filter(job__owner=user).count()
            pending_offers = Offer.objects.filter(
                job__owner=user, status='PENDING'
            ).count()

            recent_jobs = list(jobs.order_by('-created_at')[:5].values(
                'id', 'job_type', 'status', 'pickup_address',
                'dropoff_address', 'scheduled_time'
            ))
            # Add offer_count
            for rj in recent_jobs:
                rj['offer_count'] = Offer.objects.filter(job_id=rj['id']).count()

            return Response({
                'role': 'CLIENT',
                'stats': {
                    'active_jobs': active_jobs,
                    'total_offers_received': total_offers,
                    'completed_jobs': completed_jobs,
                    'pending_offers': pending_offers,
                },
                'recent_jobs': recent_jobs,
            })

        elif user.role == 'TRANSPORTER':
            from logistics.models import TransportJob
            # B2 — single source of truth: every figure comes from
            # logistics.stats (formulas in docs/DICTIONNAIRE_KPI.md).
            from logistics.stats import get_transporter_stats
            stats = get_transporter_stats(user)

            assigned_jobs = TransportJob.objects.filter(
                offers__transporter=user,
                offers__status='ACCEPTED'
            ).distinct()
            recent_missions = list(assigned_jobs.order_by('-created_at')[:5].values(
                'id', 'job_type', 'status', 'pickup_address',
                'dropoff_address', 'scheduled_time'
            ))

            return Response({
                'role': 'TRANSPORTER',
                'stats': {
                    'available_missions': stats['available_missions'],
                    'active_offers': stats['active_offers'],
                    'completed_jobs': stats['completed_missions'],
                    # K4: money actually secured (escrow released), no longer
                    # the sum of every accepted offer.
                    'total_earnings': stats['earnings_confirmed'],
                    'earnings_pending': stats['earnings_pending'],
                    'wallet_available': stats['wallet_available'],
                    'verification_status': stats['verification_status'],
                    'average_rating': stats['average_rating'],
                    'completion_rate': stats['completion_rate'],
                    'profile_completion': stats['profile_completion'],
                    # K12 (pivot) — remplissage des trajets retour
                    'return_trips_published': stats['return_trips_published'],
                    'return_trips_filled': stats['return_trips_filled'],
                    'fill_rate': stats['fill_rate'],
                    'km_transformed': stats['km_transformed'],
                },
                'recent_jobs': recent_missions,
            })

        return Response({
            'role': user.role,
            'stats': {},
            'recent_jobs': [],
        })


class AvatarUploadView(APIView):
    """
    POST /api/auth/avatar/
    Upload or replace the user's profile avatar.
    Accepts multipart/form-data with an 'avatar' file field.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        avatar_file = request.FILES.get('avatar')

        if not avatar_file:
            return Response(
                {'error': 'Aucun fichier fourni. Envoyez un champ "avatar".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if avatar_file.content_type not in allowed_types:
            return Response(
                {'error': 'Format non supporté. Utilisez JPG, PNG ou WebP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (2 MB max)
        max_size = 2 * 1024 * 1024
        if avatar_file.size > max_size:
            return Response(
                {'error': 'Le fichier est trop volumineux. Maximum 2 Mo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create profile
        from .models import Profile
        profile, created = Profile.objects.get_or_create(user=request.user)

        # Delete old avatar file if it exists
        if profile.avatar:
            try:
                profile.avatar.delete(save=False)
            except Exception:
                pass

        # Save new avatar
        profile.avatar = avatar_file
        profile.save()

        # Build the full URL
        avatar_url = request.build_absolute_uri(profile.avatar.url)

        logger.info(f"AVATAR_UPLOADED: user_id={request.user.id}, size={avatar_file.size}")

        return Response({
            'avatar_url': avatar_url,
            'message': 'Photo de profil mise à jour avec succès.',
        })

    def delete(self, request):
        """DELETE /api/auth/avatar/ — Remove avatar."""
        from .models import Profile
        try:
            profile = request.user.profile
            if profile.avatar:
                profile.avatar.delete(save=False)
                profile.avatar = None
                profile.save()
            return Response({'message': 'Photo supprimée.'})
        except Profile.DoesNotExist:
            return Response({'error': 'Profil introuvable.'}, status=status.HTTP_404_NOT_FOUND)


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/
    Accepts { email } and generates a password reset token.
    V1: logs the reset link to console (no real email sending).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        User = get_user_model()
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response(
                {'error': 'Email requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Always return 200 to prevent email enumeration
        try:
            user = User.objects.get(email=email)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            # Use configurable FRONTEND_URL (defaults to localhost:3000 in dev)
            frontend_url = getattr(django_settings, 'FRONTEND_URL', 'http://localhost:3000')
            reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"
            
            # Deep Link Support for Mobile
            mobile_enabled = getattr(django_settings, 'MOBILE_DEEP_LINK_ENABLED', False)
            if mobile_enabled:
                mobile_scheme = getattr(django_settings, 'MOBILE_APP_SCHEME', 'transporti')
                mobile_link = f"{mobile_scheme}://reset-password?uid={uid}&token={token}"
                logger.info(f"PASSWORD_RESET_REQUESTED: email={email}, link={reset_link}, mobile_link={mobile_link}")
            else:
                logger.info(f"PASSWORD_RESET_REQUESTED: email={email}, link={reset_link}")
        except User.DoesNotExist:
            # Silent — no information leak
            logger.info(f"PASSWORD_RESET_REQUESTED: email={email} (not found)")

        return Response({
            'message': 'Si un compte existe avec cette adresse, un lien de réinitialisation a été envoyé.'
        })


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Accepts { uid, token, new_password } and resets the password.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str

        User = get_user_model()
        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        new_password = request.data.get('new_password', '')

        if not uid or not token or not new_password:
            return Response(
                {'error': 'Tous les champs sont requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'Le mot de passe doit contenir au moins 8 caractères.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {'error': 'Lien invalide ou expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {'error': 'Lien expiré. Veuillez refaire la demande.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        logger.info(f"PASSWORD_RESET_CONFIRMED: user_id={user.id}")

        return Response({
            'message': 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
        })
