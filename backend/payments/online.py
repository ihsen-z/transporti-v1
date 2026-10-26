"""
Mode « espèces seules » : le paiement en ligne est coupé.

Décision du fondateur du 26/10/2026 : au lancement, Transporti n'encaisse
qu'en espèces, jusqu'à l'ouverture d'un compte marchand Konnect (il faut
d'abord l'entité juridique). On l'active avec PAYMENT_GATEWAY='DISABLED'.

Dans ce mode :
- le serveur refuse tout paiement en ligne (acceptation d'offre, réservation
  d'un trajet retour, demande sur un trajet, lancement d'un paiement) ;
- un client qui ne précise rien paie en espèces par défaut ;
- aucune passerelle n'est construite (get_payment_gateway lève une erreur au
  lieu de retomber sur la passerelle de test, qui déclare tout paiement réussi) ;
- les écrans lisent online_payment_enabled sur GET /payments/config/ et
  masquent l'option.

Pour rouvrir le paiement en ligne : PAYMENT_GATEWAY='KONNECT' (+ ses clés).
"""
from decimal import Decimal

from django.conf import settings

PASSERELLE_COUPEE = 'DISABLED'

PAIEMENT_EN_LIGNE_INDISPONIBLE = (
    "Le paiement en ligne n'est pas encore disponible. "
    "Choisissez le paiement en espèces à la livraison."
)


class PaiementEnLigneCoupe(RuntimeError):
    """Une passerelle de paiement a été demandée en mode « espèces seules »."""


def online_payment_enabled() -> bool:
    """Faux en mode « espèces seules » (PAYMENT_GATEWAY='DISABLED')."""
    return getattr(settings, 'PAYMENT_GATEWAY', 'SANDBOX') != PASSERELLE_COUPEE


def default_payment_method() -> str:
    """Mode de paiement retenu quand le client n'en précise pas."""
    return 'DIGITAL' if online_payment_enabled() else 'COD'


def message_plafond_especes(plafond: Decimal) -> str:
    """
    Refus d'un montant au-delà du plafond espèces.

    Le début de la phrase ne change pas : l'application mobile affiche ce
    texte tel quel. La fin ne propose le paiement en ligne que s'il existe.
    """
    debut = f'Paiement à la livraison limité à {plafond} TND.'
    if online_payment_enabled():
        return f'{debut} Choisissez le paiement digital.'
    return f"{debut} Le paiement en ligne n'est pas encore disponible : proposez un montant inférieur."
