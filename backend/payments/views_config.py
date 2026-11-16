"""
Réglages que les écrans affichent : argent et ouverture des canaux.

Le plafond d'une course payable en espèces était écrit « 300 » en dur dans
l'application mobile (libellé « À la livraison (≤ 300 TND) ») et dans trois
composants du site web. Le serveur, lui, lit settings.COD_MAX_AMOUNT : relever
le réglage aurait laissé les écrans annoncer 300 et refuser d'avance des
montants que le serveur acceptait. Les écrans lisent désormais ces valeurs ici.

Le champ classic_channel_enabled dit si les écrans doivent proposer le canal
« classique » (publier un besoin) ou seulement les trajets retour.

Lisible sans connexion : la page publique /aide annonce le plafond espèces, et
ces deux règles n'ont rien de confidentiel (elles sont dans les CGU).
"""
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from logistics.classic_channel import classic_channel_enabled

from .debt import cod_max_amount, commission_debt_limit
from .online import online_payment_enabled


class PaymentConfigView(APIView):
    """GET /api/v1/payments/config/ — plafonds et paiement en ligne ouvert ou non."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'cod_max_amount': float(cod_max_amount()),
            'commission_debt_limit': float(commission_debt_limit()),
            # Faux en mode « espèces seules » : les écrans masquent l'option.
            'online_payment_enabled': online_payment_enabled(),
            # Faux au lancement : seul le canal trajet retour est ouvert.
            'classic_channel_enabled': classic_channel_enabled(),
        })
