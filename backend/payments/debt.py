"""
Dette de commission sur les courses payées en espèces : plafond et blocage.

Le client paie le transporteur en espèces (indispensable sur le marché
tunisien) : l'argent ne passe jamais par la plateforme, et chaque course
livrée inscrit la commission en dette (CommissionLedger). Jusqu'ici rien ne
limitait cette dette : un transporteur pouvait accumuler des courses sans
jamais reverser la commission.

La règle (décision du fondateur, 25/10/2026), sur le modèle de Bolt et Uber
dans les marchés où l'on paie en espèces :
- au-delà de COMMISSION_DEBT_LIMIT (60 DT par défaut, réglable sans toucher
  au code), le transporteur ne peut plus rien engager de NOUVEAU : publier un
  retour, faire une offre, accepter ou contre-proposer une demande ;
- les courses déjà engagées continuent, et refuser une demande reste permis ;
- le déblocage est automatique : la dette est recalculée à chaque appel, donc
  dès qu'un règlement la ramène sous le plafond, tout se rouvre. Un règlement
  partiel suffit s'il repasse sous le seuil.
"""
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response

from .models import CommissionLedger

# Code d'erreur stable : l'application peut s'en servir pour proposer
# « Régler ma commission » plutôt qu'afficher un simple message.
DEBT_LIMIT_CODE = 'COMMISSION_DEBT_LIMIT'
TRANSPORTER_UNAVAILABLE_CODE = 'TRANSPORTER_UNAVAILABLE'


def cod_max_amount() -> Decimal:
    """Plafond d'une course payable en espèces (settings.COD_MAX_AMOUNT)."""
    return Decimal(settings.COD_MAX_AMOUNT)


def commission_debt_limit() -> Decimal:
    """Dette de commission au-delà de laquelle le transporteur est bloqué."""
    return Decimal(settings.COMMISSION_DEBT_LIMIT)


def outstanding_commission_debt(transporter) -> Decimal:
    """Somme des commissions non réglées du transporteur."""
    total = CommissionLedger.objects.filter(
        transporter=transporter, is_settled=False,
    ).aggregate(total=Sum('amount'))['total']
    return total or Decimal('0')


def is_blocked_for_debt(transporter) -> bool:
    """Vrai quand la dette dépasse le plafond (égale au plafond : pas bloqué)."""
    return outstanding_commission_debt(transporter) > commission_debt_limit()


def _message_dette(dette: Decimal) -> str:
    return (
        f'Votre commission à régler atteint {dette:.2f} TND, au-delà du plafond de '
        f'{commission_debt_limit():.2f} TND. Réglez-la pour publier ou accepter de '
        f'nouvelles courses : vos courses en cours ne sont pas touchées.'
    )


class CommissionDebtLimitReached(APIException):
    """Levée quand un transporteur bloqué tente d'engager une nouvelle course."""
    status_code = status.HTTP_403_FORBIDDEN
    default_code = DEBT_LIMIT_CODE

    def __init__(self, dette: Decimal):
        # Même forme que les autres refus métier ({'error', 'code'}) : le
        # mobile lit `error` en premier (core/api/serverMessage.ts).
        super().__init__(detail={'error': _message_dette(dette), 'code': DEBT_LIMIT_CODE})


def ensure_transporter_can_engage(transporter) -> None:
    """À appeler avant toute action par laquelle le transporteur s'engage."""
    dette = outstanding_commission_debt(transporter)
    if dette > commission_debt_limit():
        raise CommissionDebtLimitReached(dette)


def transporter_unavailable_response() -> Response:
    """
    Réponse au CLIENT qui tente de réserver chez un transporteur bloqué.

    Volontairement neutre : la dette d'un transporteur ne regarde pas ses
    clients.
    """
    return Response(
        {
            'error': "Ce transporteur ne peut pas confirmer de nouvelle réservation "
                     "pour le moment. Essayez un autre trajet.",
            'code': TRANSPORTER_UNAVAILABLE_CODE,
        },
        status=status.HTTP_409_CONFLICT,
    )
