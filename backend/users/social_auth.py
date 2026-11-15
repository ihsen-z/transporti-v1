"""
Social Authentication Views — Transporti V1
Google Sign-In and Facebook Login via token validation.

Flow:
1. Frontend obtains OAuth access_token from provider (Google/Facebook SDK)
2. Frontend POSTs token to these endpoints
3. Backend validates token with provider API
4. Backend creates or finds user, returns Transporti JWT tokens

RULES:
- No heavy dependencies (no django-allauth)
- Fail-safe: never crash on provider API errors
- Consistent with existing JWT auth flow (same response shape)
- New users default to CLIENT role
"""
import logging

from rest_framework import status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction

from .models import User, Profile
from .serializers import UserProfileSerializer
from .social_verification import (
    SocialAuthError, SocialIdentity,
    facebook_is_configured, google_is_configured,
    verify_facebook_token, verify_google_token,
)
from transporti_core.throttling import AuthRateThrottle

logger = logging.getLogger('transporti')

# Comptes à privilèges : jamais connectables par Google/Facebook (une boîte
# e-mail compromise ne doit pas ouvrir le back-office).
PRIVILEGED_ROLES = ('ADMIN', 'MODERATOR')


# =============================================================================
# SHARED HELPERS
# =============================================================================

def _generate_jwt_tokens(user):
    """Generate JWT tokens with custom claims (consistent with LoginView)."""
    refresh = RefreshToken.for_user(user)

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
            refresh['trust_status'] = 'UNVERIFIED'

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@transaction.atomic
def _social_login_or_create(email, first_name, last_name, avatar_url, provider):
    """
    Find existing user by email or create a new one.

    Returns:
        (user, is_new) tuple
    """
    email = email.lower().strip()

    try:
        user = User.objects.get(email=email)
        if user.role in PRIVILEGED_ROLES or user.is_staff or user.is_superuser:
            logger.warning(
                f"SOCIAL_LOGIN_REFUSED_PRIVILEGED: provider={provider}, user_id={user.id}"
            )
            raise SocialAuthError(
                'Social login is not available for this account. '
                'Please sign in with your email and password.',
                status.HTTP_403_FORBIDDEN,
            )
        logger.info(
            f"SOCIAL_LOGIN: provider={provider}, user_id={user.id}, "
            f"email={email}, action=LOGIN"
        )
        return user, False
    except User.DoesNotExist:
        pass

    # Create new user — default role is CLIENT
    username = email.split('@')[0]
    # Ensure username uniqueness
    base_username = username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    user = User(
        email=email,
        username=username,
        first_name=first_name or '',
        last_name=last_name or '',
        role='CLIENT',
    )
    # Set unusable password — social users don't have a password
    user.set_unusable_password()
    user.save()

    # Auto-create Profile with avatar URL from provider
    Profile.objects.create(
        user=user,
        full_name=f"{first_name or ''} {last_name or ''}".strip(),
        avatar_url=avatar_url or '',
    )

    logger.info(
        f"SOCIAL_LOGIN: provider={provider}, user_id={user.id}, "
        f"email={email}, action=REGISTER"
    )

    return user, True


def _build_social_response(user, is_new):
    """Build response consistent with LoginView / RegisterView."""
    tokens = _generate_jwt_tokens(user)
    message = 'Registration successful.' if is_new else 'Login successful.'
    status_code = status.HTTP_201_CREATED if is_new else status.HTTP_200_OK

    return Response({
        'message': message,
        'user': UserProfileSerializer(user).data,
        'tokens': tokens,
        'is_new_user': is_new,
    }, status=status_code)


# =============================================================================
# SERIALIZERS
# =============================================================================

class SocialTokenSerializer(serializers.Serializer):
    """Validates that an access_token is provided."""
    access_token = serializers.CharField(required=True, min_length=10)


class RoleChoiceSerializer(serializers.Serializer):
    """Validates role selection for new social users."""
    role = serializers.ChoiceField(
        choices=[('CLIENT', 'Client'), ('TRANSPORTER', 'Transporter')],
        required=True,
    )


# =============================================================================
# GOOGLE / FACEBOOK
# =============================================================================

class _SocialLoginView(APIView):
    """
    Base commune : la route n'existe (404) que si le fournisseur est configuré,
    puis le jeton est vérifié (social_verification.py), puis on connecte.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]
    provider = ''

    def is_configured(self) -> bool:
        raise NotImplementedError

    def verify(self, access_token: str) -> SocialIdentity:
        raise NotImplementedError

    def post(self, request):
        # Fournisseur non configuré : on se comporte comme une route absente,
        # avant même de lire la requête.
        if not self.is_configured():
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SocialTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            identity = self.verify(serializer.validated_data['access_token'])
            user, is_new = _social_login_or_create(
                email=identity.email,
                first_name=identity.first_name,
                last_name=identity.last_name,
                avatar_url=identity.avatar_url,
                provider=self.provider,
            )
        except SocialAuthError as exc:
            return Response({'error': exc.message}, status=exc.http_status)

        return _build_social_response(user, is_new)


class GoogleLoginView(_SocialLoginView):
    """
    POST /api/auth/social/google/
    Accepts { access_token } from Google Identity Services.
    """
    provider = 'google'

    def is_configured(self) -> bool:
        return google_is_configured()

    def verify(self, access_token: str) -> SocialIdentity:
        return verify_google_token(access_token)


class FacebookLoginView(_SocialLoginView):
    """
    POST /api/auth/social/facebook/
    Accepts { access_token } from Facebook Login SDK.
    """
    provider = 'facebook'

    def is_configured(self) -> bool:
        return facebook_is_configured()

    def verify(self, access_token: str) -> SocialIdentity:
        return verify_facebook_token(access_token)


# =============================================================================
# ROLE SELECTION (for new social users)
# =============================================================================

class SocialUserSetRoleView(APIView):
    """
    POST /api/auth/social/set-role/
    Allows a newly created social user to select their role.
    Only works once — if the user already has a non-CLIENT role or
    has been active, this is rejected.

    Accepts { role: 'CLIENT' | 'TRANSPORTER' }
    Returns updated user data + refreshed JWT tokens.
    """
    # Requires authentication — user must have JWT from social login

    def post(self, request):
        # Sans fournisseur social configuré, aucun « nouveau compte social »
        # ne peut exister : la route se comporte comme absente (comme
        # _SocialLoginView), au lieu de servir de porte de changement de rôle.
        if not (google_is_configured() or facebook_is_configured()):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RoleChoiceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_role = serializer.validated_data['role']
        user = request.user

        # Safety: only allow role change for social users who still have
        # the default CLIENT role
        if not user.has_usable_password() or user.role == 'CLIENT':
            old_role = user.role
            user.role = new_role
            user.save(update_fields=['role'])

            # Auto-create TrustProfile for transporters (same as registration)
            if new_role == 'TRANSPORTER':
                from trust.models import TrustProfile
                TrustProfile.objects.get_or_create(user=user)

            logger.info(
                f"SOCIAL_ROLE_SET: user_id={user.id}, "
                f"old_role={old_role}, new_role={new_role}"
            )

            # Re-generate tokens with updated role claim
            tokens = _generate_jwt_tokens(user)

            return Response({
                'message': 'Role updated successfully.',
                'user': UserProfileSerializer(user).data,
                'tokens': tokens,
            })

        return Response(
            {'error': 'Role has already been set and cannot be changed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
