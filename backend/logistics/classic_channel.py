"""
Interrupteur du canal « classique » (le client publie un besoin, les
transporteurs font des offres, le client en accepte une).

Décision produit : ce canal est différé après le lancement. Seul le canal
« trajet retour » (le transporteur publie, le client demande) est ouvert.
Aucun code n'est supprimé : le réglage CLASSIC_CHANNEL_ENABLED ferme les
ENTRÉES du canal, et seulement elles :
- créer une demande classique (POST /api/jobs/) ;
- publier un brouillon classique (POST /api/jobs/<id>/publish/) ;
- déposer une offre sur une demande classique (POST /api/offers/).

Les missions classiques déjà engagées vont jusqu'au bout, et le canal
trajet retour n'est jamais concerné. La liste publique ne montre plus de
demande classique (liste vide, pas d'erreur).

Le refus a la même forme que KYC_REQUIRED (logistics/kyc.py) : 403 et un code
stable que les écrans peuvent lire.
"""
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException

CLASSIC_CHANNEL_DISABLED_CODE = 'CLASSIC_CHANNEL_DISABLED'

CLASSIC_CHANNEL_DISABLED_MESSAGE = (
    "La publication de demandes n'est pas encore ouverte. "
    "Cherchez un trajet retour sur votre itinéraire."
)


def classic_channel_enabled() -> bool:
    """Vrai si le canal classique accepte de nouvelles demandes et offres."""
    return bool(getattr(settings, 'CLASSIC_CHANNEL_ENABLED', True))


class ClassicChannelDisabled(APIException):
    """Levée quand on tente d'entrer dans le canal classique alors qu'il est fermé."""
    status_code = status.HTTP_403_FORBIDDEN
    default_code = CLASSIC_CHANNEL_DISABLED_CODE

    def __init__(self):
        super().__init__(detail={
            'error': CLASSIC_CHANNEL_DISABLED_MESSAGE,
            'detail': CLASSIC_CHANNEL_DISABLED_MESSAGE,
            'code': CLASSIC_CHANNEL_DISABLED_CODE,
        })


def ensure_classic_channel_open() -> None:
    """À appeler en tête de toute entrée du canal classique."""
    if not classic_channel_enabled():
        raise ClassicChannelDisabled()
