"""
Révocation des sessions (refresh tokens) — Transporti V1.

S'appuie sur l'app `rest_framework_simplejwt.token_blacklist` : chaque refresh
token émis est enregistré comme `OutstandingToken` ; le mettre sur liste noire
(`BlacklistedToken`) empêche tout nouveau rafraîchissement.

Limite connue : un access token déjà émis reste valable jusqu'à son expiration
(30 min, SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']).
"""
import logging

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger('transporti')


def blacklist_refresh_token(raw_token: str) -> bool:
    """
    Met un refresh token sur liste noire. Idempotent : un jeton déjà sur
    liste noire, expiré ou illisible n'est pas une erreur (renvoie False).
    """
    try:
        RefreshToken(raw_token).blacklist()
        return True
    except TokenError:
        # Déjà blacklisté, expiré, mal formé : la session est de toute façon morte.
        return False


def revoke_all_refresh_tokens(user, reason: str) -> int:
    """
    Met sur liste noire tous les refresh tokens connus de l'utilisateur
    (changement ou réinitialisation du mot de passe). Renvoie le nombre
    de jetons nouvellement révoqués.
    """
    revoked = 0
    for outstanding in OutstandingToken.objects.filter(user=user):
        _, created = BlacklistedToken.objects.get_or_create(token=outstanding)
        if created:
            revoked += 1
    logger.info(f"SESSIONS_REVOKED: user_id={user.id}, reason={reason}, count={revoked}")
    return revoked
