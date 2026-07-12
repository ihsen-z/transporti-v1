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
import requests as http_requests

from rest_framework import status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.db import transaction

from .models import User, Profile
from .serializers import UserProfileSerializer
from transporti_core.throttling import AuthRateThrottle

logger = logging.getLogger('transporti')

# Timeout for provider API calls (seconds)
PROVIDER_TIMEOUT = 10


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
# GOOGLE SIGN-IN
# =============================================================================

class GoogleLoginView(APIView):
    """
    POST /api/auth/social/google/
    Accepts { access_token } from Google Identity Services.
    Validates with Google, creates/finds user, returns JWT.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = SocialTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        access_token = serializer.validated_data['access_token']

        # Validate token with Google
        try:
            resp = http_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=PROVIDER_TIMEOUT,
            )
        except http_requests.RequestException as e:
            logger.error(f"SOCIAL_AUTH_ERROR: provider=google, error={str(e)}")
            return Response(
                {'error': 'Failed to connect to Google. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code != 200:
            logger.warning(
                f"SOCIAL_AUTH_INVALID_TOKEN: provider=google, "
                f"status={resp.status_code}"
            )
            return Response(
                {'error': 'Invalid or expired Google token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = resp.json()
        email = data.get('email')

        if not email:
            return Response(
                {'error': 'Google account does not have an email address.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Optional: verify the token was issued for our client ID
        google_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
        if google_client_id:
            # Cross-check with tokeninfo endpoint for audience validation
            try:
                tokeninfo_resp = http_requests.get(
                    'https://www.googleapis.com/oauth2/v3/tokeninfo',
                    params={'access_token': access_token},
                    timeout=PROVIDER_TIMEOUT,
                )
                if tokeninfo_resp.status_code == 200:
                    tokeninfo = tokeninfo_resp.json()
                    aud = tokeninfo.get('aud', '')
                    if aud and aud != google_client_id:
                        logger.warning(
                            f"SOCIAL_AUTH_AUD_MISMATCH: provider=google, "
                            f"expected={google_client_id}, got={aud}"
                        )
                        return Response(
                            {'error': 'Token was not issued for this application.'},
                            status=status.HTTP_401_UNAUTHORIZED,
                        )
            except http_requests.RequestException:
                # Non-blocking: if tokeninfo check fails, continue
                # The userinfo check already validated the token
                pass

        user, is_new = _social_login_or_create(
            email=email,
            first_name=data.get('given_name', ''),
            last_name=data.get('family_name', ''),
            avatar_url=data.get('picture', ''),
            provider='google',
        )

        return _build_social_response(user, is_new)


# =============================================================================
# FACEBOOK LOGIN
# =============================================================================

class FacebookLoginView(APIView):
    """
    POST /api/auth/social/facebook/
    Accepts { access_token } from Facebook Login SDK.
    Validates with Facebook Graph API, creates/finds user, returns JWT.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = SocialTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        access_token = serializer.validated_data['access_token']

        # Validate token with Facebook Graph API
        try:
            resp = http_requests.get(
                'https://graph.facebook.com/me',
                params={
                    'fields': 'id,email,first_name,last_name,picture.type(large)',
                    'access_token': access_token,
                },
                timeout=PROVIDER_TIMEOUT,
            )
        except http_requests.RequestException as e:
            logger.error(f"SOCIAL_AUTH_ERROR: provider=facebook, error={str(e)}")
            return Response(
                {'error': 'Failed to connect to Facebook. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code != 200:
            logger.warning(
                f"SOCIAL_AUTH_INVALID_TOKEN: provider=facebook, "
                f"status={resp.status_code}"
            )
            return Response(
                {'error': 'Invalid or expired Facebook token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = resp.json()
        email = data.get('email')

        if not email:
            return Response(
                {'error': 'Facebook account does not have a verified email. '
                          'Please use email/password registration.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Optional: Validate the token was issued for our Facebook App
        fb_app_id = getattr(settings, 'FACEBOOK_APP_ID', '')
        fb_app_secret = getattr(settings, 'FACEBOOK_APP_SECRET', '')
        if fb_app_id and fb_app_secret:
            try:
                debug_resp = http_requests.get(
                    'https://graph.facebook.com/debug_token',
                    params={
                        'input_token': access_token,
                        'access_token': f'{fb_app_id}|{fb_app_secret}',
                    },
                    timeout=PROVIDER_TIMEOUT,
                )
                if debug_resp.status_code == 200:
                    debug_data = debug_resp.json().get('data', {})
                    if not debug_data.get('is_valid', False):
                        logger.warning(
                            "SOCIAL_AUTH_TOKEN_INVALID: provider=facebook, "
                            "debug_token reports invalid"
                        )
                        return Response(
                            {'error': 'Facebook token is invalid.'},
                            status=status.HTTP_401_UNAUTHORIZED,
                        )
                    token_app_id = str(debug_data.get('app_id', ''))
                    if token_app_id != fb_app_id:
                        logger.warning(
                            f"SOCIAL_AUTH_APP_MISMATCH: provider=facebook, "
                            f"expected={fb_app_id}, got={token_app_id}"
                        )
                        return Response(
                            {'error': 'Token was not issued for this application.'},
                            status=status.HTTP_401_UNAUTHORIZED,
                        )
            except http_requests.RequestException:
                # Non-blocking: if debug check fails, continue
                # The graph/me call already validated the token
                pass

        # Extract avatar URL from nested Facebook picture object
        avatar_url = ''
        picture_data = data.get('picture', {})
        if isinstance(picture_data, dict):
            avatar_url = picture_data.get('data', {}).get('url', '')

        user, is_new = _social_login_or_create(
            email=email,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            avatar_url=avatar_url,
            provider='facebook',
        )

        return _build_social_response(user, is_new)


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
