"""
Vérification d'identité (KYC) obligatoire pour qu'un transporteur s'engage.

Décision du fondateur : un transporteur doit être VERIFIED pour
- publier un trajet retour ;
- faire une offre sur une demande client ;
- accepter ou contre-proposer sur une demande (et accepter une contre-offre).

Les courses déjà engagées continuent : démarrer, suivre et livrer une mission
ne passent PAS par ce contrôle.

Le refus a la même forme que COMMISSION_DEBT_LIMIT (payments/debt.py) pour que
l'application le traite de la même façon : 403 et un code stable. Le mobile
lit `error` en premier (core/api/serverMessage.ts) ; `detail` porte le même
texte, et `trust_status` le statut actuel pour choisir l'écran à proposer.

Ce contrôle passe AVANT celui de la dette : un compte non vérifié n'a de
toute façon aucune dette à régler.
"""
from rest_framework import status
from rest_framework.exceptions import APIException

from trust.models import TrustProfile

from .services import TrustGuardError, check_transporter_trust

KYC_REQUIRED_CODE = 'KYC_REQUIRED'

# Statut renvoyé quand le transporteur n'a encore aucun dossier de confiance.
NO_PROFILE_STATUS = 'NO_PROFILE'

# Portée d'une dérogation admin (TrustOverride) qui lève ce contrôle :
# « ACCEPT_OFFER » ou « ALL » (trust/services_admin.has_active_override).
OVERRIDE_SCOPE = 'ACCEPT_OFFER'


def _message_kyc(trust_status: str) -> str:
    """Message en français adapté au statut du dossier."""
    if trust_status == 'REJECTED':
        return ("Votre vérification d'identité a été refusée : vous ne pouvez pas "
                "publier ni accepter de courses. Contactez le support.")
    if trust_status in ('PENDING', 'PARTIALLY_REVIEWED'):
        return ("Vos documents sont en cours de vérification. Vous pourrez publier "
                "et accepter des courses dès que votre compte sera vérifié.")
    if trust_status == 'SUSPENDED':
        return ("Votre compte est suspendu : vous ne pouvez pas publier ni accepter "
                "de courses. Contactez le support.")
    return ("Faites vérifier votre identité (documents KYC) pour publier ou "
            "accepter des courses.")


def current_trust_status(user) -> str:
    """Statut KYC actuel, ou NO_PROFILE si aucun dossier n'existe."""
    profile = TrustProfile.objects.filter(user=user).only('verification_status').first()
    if profile is None:
        return NO_PROFILE_STATUS
    return profile.verification_status


class KycRequired(APIException):
    """Levée quand un transporteur non vérifié tente d'engager une course."""
    status_code = status.HTTP_403_FORBIDDEN
    default_code = KYC_REQUIRED_CODE

    def __init__(self, trust_status: str):
        message = _message_kyc(trust_status)
        super().__init__(detail={
            'error': message,
            'detail': message,
            'code': KYC_REQUIRED_CODE,
            'trust_status': trust_status,
        })


def ensure_transporter_verified(user) -> None:
    """
    À appeler avant toute action par laquelle le transporteur s'engage.

    Réutilise le garde-fou historique check_transporter_trust (avec la
    dérogation admin) et traduit son refus en réponse API stable.
    """
    try:
        check_transporter_trust(user, require_verified=True, scope=OVERRIDE_SCOPE)
    except TrustGuardError:
        raise KycRequired(current_trust_status(user))


def is_transporter_verified(user) -> bool:
    """Vrai si le transporteur peut être engagé (même règle, sans exception)."""
    try:
        check_transporter_trust(user, require_verified=True, scope=OVERRIDE_SCOPE)
    except TrustGuardError:
        return False
    return True


def transporter_can_be_booked(transporter) -> bool:
    """
    Contrôle côté CLIENT : le transporteur de l'offre ou du trajet est-il
    vérifié (KYC) et sous le plafond de dette ? Faux → le client reçoit la
    réponse neutre 409 TRANSPORTER_UNAVAILABLE (payments/debt.py), qui ne
    révèle pas la raison.
    """
    from payments.debt import is_blocked_for_debt
    return is_transporter_verified(transporter) and not is_blocked_for_debt(transporter)
