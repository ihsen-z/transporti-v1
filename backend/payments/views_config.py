"""
Réglages d'argent que les écrans affichent.

Le plafond d'une course payable en espèces était écrit « 300 » en dur dans
l'application mobile (libellé « À la livraison (≤ 300 TND) ») et dans trois
composants du site web. Le serveur, lui, lit settings.COD_MAX_AMOUNT : relever
le réglage aurait laissé les écrans annoncer 300 et refuser d'avance des
montants que le serveur acceptait. Les écrans lisent désormais ces valeurs ici.
"""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .debt import cod_max_amount, commission_debt_limit


class PaymentConfigView(APIView):
    """GET /api/v1/payments/config/ — plafond espèces et plafond de dette."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'cod_max_amount': float(cod_max_amount()),
            'commission_debt_limit': float(commission_debt_limit()),
        })
