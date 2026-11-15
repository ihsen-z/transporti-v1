"""
Vérification des jetons Google / Facebook — Transporti V1.

Règle de sécurité : tout ce qui n'est pas une preuve positive est un refus.
Une erreur réseau, un code HTTP autre que 200, une audience absente ou
différente, un e-mail non vérifié : la connexion est refusée, jamais
« laissée passer ».

Les vues (social_auth.py) appellent `verify_google_token` /
`verify_facebook_token` et transforment `SocialAuthError` en réponse HTTP.
"""
import logging
from dataclasses import dataclass

import requests as http_requests
from django.conf import settings
from rest_framework import status

logger = logging.getLogger('transporti')

# Délai maximal d'un appel au fournisseur (secondes)
PROVIDER_TIMEOUT = 10


class SocialAuthError(Exception):
    """Refus de connexion sociale, avec le message et le code HTTP à renvoyer."""

    def __init__(self, message: str, http_status: int) -> None:
        super().__init__(message)
        self.message = message
        self.http_status = http_status


@dataclass
class SocialIdentity:
    """Identité confirmée par le fournisseur."""
    email: str
    first_name: str
    last_name: str
    avatar_url: str


def google_is_configured() -> bool:
    return bool(getattr(settings, 'GOOGLE_CLIENT_ID', ''))


def facebook_is_configured() -> bool:
    return bool(getattr(settings, 'FACEBOOK_APP_ID', '')) and bool(
        getattr(settings, 'FACEBOOK_APP_SECRET', '')
    )


def _provider_get(provider: str, url: str, **kwargs) -> dict:
    """GET vers le fournisseur : renvoie le JSON si 200, sinon SocialAuthError."""
    try:
        resp = http_requests.get(url, timeout=PROVIDER_TIMEOUT, **kwargs)
    except http_requests.RequestException as exc:
        logger.error(f"SOCIAL_AUTH_ERROR: provider={provider}, error={exc.__class__.__name__}")
        raise SocialAuthError(
            f'Failed to connect to {provider.capitalize()}. Please try again.',
            status.HTTP_502_BAD_GATEWAY,
        )
    if resp.status_code != 200:
        logger.warning(f"SOCIAL_AUTH_INVALID_TOKEN: provider={provider}, status={resp.status_code}")
        raise SocialAuthError(
            f'Invalid or expired {provider.capitalize()} token.',
            status.HTTP_401_UNAUTHORIZED,
        )
    try:
        payload = resp.json()
    except ValueError:
        raise SocialAuthError(
            f'Invalid or expired {provider.capitalize()} token.',
            status.HTTP_401_UNAUTHORIZED,
        )
    if not isinstance(payload, dict):
        raise SocialAuthError(
            f'Invalid or expired {provider.capitalize()} token.',
            status.HTTP_401_UNAUTHORIZED,
        )
    return payload


def _is_true(value: object) -> bool:
    # tokeninfo renvoie la chaîne "true", userinfo le booléen True.
    return value is True or value == 'true'


def verify_google_token(access_token: str) -> SocialIdentity:
    client_id = settings.GOOGLE_CLIENT_ID

    # 1. Audience : le jeton doit avoir été émis pour NOTRE application.
    tokeninfo = _provider_get(
        'google', 'https://www.googleapis.com/oauth2/v3/tokeninfo',
        params={'access_token': access_token},
    )
    audiences = {tokeninfo.get('aud'), tokeninfo.get('azp')}
    if client_id not in audiences:
        logger.warning("SOCIAL_AUTH_AUD_MISMATCH: provider=google")
        raise SocialAuthError(
            'Token was not issued for this application.', status.HTTP_401_UNAUTHORIZED,
        )

    # 2. Profil : e-mail présent ET vérifié par Google.
    data = _provider_get(
        'google', 'https://www.googleapis.com/oauth2/v3/userinfo',
        headers={'Authorization': f'Bearer {access_token}'},
    )
    email = data.get('email')
    if not email:
        raise SocialAuthError(
            'Google account does not have an email address.', status.HTTP_400_BAD_REQUEST,
        )
    if not _is_true(data.get('email_verified')):
        logger.warning("SOCIAL_AUTH_EMAIL_UNVERIFIED: provider=google")
        raise SocialAuthError(
            'Google email address is not verified.', status.HTTP_401_UNAUTHORIZED,
        )

    return SocialIdentity(
        email=email,
        first_name=data.get('given_name', '') or '',
        last_name=data.get('family_name', '') or '',
        avatar_url=data.get('picture', '') or '',
    )


def verify_facebook_token(access_token: str) -> SocialIdentity:
    app_id = str(settings.FACEBOOK_APP_ID)
    app_secret = settings.FACEBOOK_APP_SECRET

    # 1. debug_token : jeton valide ET émis pour notre application.
    debug = _provider_get(
        'facebook', 'https://graph.facebook.com/debug_token',
        params={'input_token': access_token, 'access_token': f'{app_id}|{app_secret}'},
    )
    debug_data = debug.get('data') or {}
    if not debug_data.get('is_valid', False) or str(debug_data.get('app_id', '')) != app_id:
        logger.warning("SOCIAL_AUTH_APP_MISMATCH: provider=facebook")
        raise SocialAuthError(
            'Token was not issued for this application.', status.HTTP_401_UNAUTHORIZED,
        )

    # 2. Profil. Facebook ne renvoie `email` que s'il est confirmé.
    data = _provider_get(
        'facebook', 'https://graph.facebook.com/me',
        params={
            'fields': 'id,email,first_name,last_name,picture.type(large)',
            'access_token': access_token,
        },
    )
    email = data.get('email')
    if not email:
        raise SocialAuthError(
            'Facebook account does not have a verified email. '
            'Please use email/password registration.',
            status.HTTP_400_BAD_REQUEST,
        )

    avatar_url = ''
    picture_data = data.get('picture', {})
    if isinstance(picture_data, dict):
        avatar_url = (picture_data.get('data') or {}).get('url', '') or ''

    return SocialIdentity(
        email=email,
        first_name=data.get('first_name', '') or '',
        last_name=data.get('last_name', '') or '',
        avatar_url=avatar_url,
    )
