"""
Émission de la paire de jetons d'un utilisateur — même contenu que la
connexion (POST /api/auth/login/), partagée par la connexion et le
changement de mot de passe.
"""
import logging

from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger('transporti')


def issue_user_tokens(user) -> dict:
    """
    Renvoie {'refresh': ..., 'access': ...} avec les claims de la connexion :
    role (ADMIN pour un compte staff), is_verified, trust_status (transporteur).
    """
    refresh = RefreshToken.for_user(user)

    effective_role = user.role
    if user.is_superuser or user.is_staff:
        effective_role = 'ADMIN'
    refresh['role'] = effective_role
    refresh['is_verified'] = user.is_phone_verified

    if user.role == 'TRANSPORTER':
        try:
            refresh['trust_status'] = user.trust_profile.verification_status
        except AttributeError:
            logger.warning(f"USER_TOKENS: transporter {user.id} missing trust_profile")
            refresh['trust_status'] = 'UNVERIFIED'

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }
