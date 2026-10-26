"""
Dettes de commission, vues par transporteur — outil du back-office.

Pendant le pilote, la commission des courses payées en espèces est réglée à la
main : le transporteur paie (D17, Flouci, en main propre) et l'administrateur
le note. Seule une route par écriture existait (POST .../commission/<id>/settle/)
et aucun écran : avec le plafond de dette (payments/debt.py), un transporteur
bloqué ne pouvait être débloqué qu'à coups d'appels API.

Ces deux vues servent l'écran « Commissions » de l'admin :
- la liste des transporteurs qui doivent quelque chose, du plus endetté au
  moins endetté, avec leur état de blocage ;
- le règlement de tout ce que doit un transporteur, en une action.
Chaque écriture passe par settle_commission_debt : même validation, même
AuditLog que le règlement unitaire.
"""
from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
from users.permissions import RequireRole

from .debt import commission_debt_limit
from .models import CommissionLedger
from .serializers import CommissionSettleSerializer
from .services import settle_commission_debt


def _nom(user: User) -> str:
    nom = f'{user.first_name} {user.last_name}'.strip()
    return nom or user.email


class AdminDebtListView(APIView):
    """GET /api/admin/commission/debts/ — dettes non réglées, par transporteur."""
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]

    def get(self, request):
        plafond = commission_debt_limit()
        lignes = (
            CommissionLedger.objects.filter(is_settled=False)
            .select_related('transporter')
            .order_by('created_at')
        )

        par_transporteur: dict[int, dict] = {}
        totaux: dict[int, Decimal] = defaultdict(lambda: Decimal('0'))
        for ligne in lignes:
            t = ligne.transporter
            if t.id not in par_transporteur:
                par_transporteur[t.id] = {
                    'transporter_id': t.id,
                    'name': _nom(t),
                    'email': t.email,
                    'phone': t.phone,
                    # Ordre de created_at croissant : la première ligne vue est
                    # la plus ancienne, celle qui dit depuis quand il doit.
                    'oldest_at': ligne.created_at,
                    'entries': [],
                }
            totaux[t.id] += ligne.amount
            par_transporteur[t.id]['entries'].append({
                'id': ligne.id,
                'job_id': ligne.job_reference_id,
                'amount': float(ligne.amount),
                'created_at': ligne.created_at,
            })

        resultats = []
        for tid, donnees in par_transporteur.items():
            total = totaux[tid]
            donnees['total'] = float(total)
            donnees['count'] = len(donnees['entries'])
            # Même règle que payments.debt.is_blocked_for_debt : au-delà, pas égal.
            donnees['blocked'] = total > plafond
            resultats.append(donnees)
        resultats.sort(key=lambda d: d['total'], reverse=True)

        return Response({'limit': float(plafond), 'results': resultats})


class AdminDebtSettleView(APIView):
    """
    POST /api/admin/commission/transporters/<id>/settle/ — règle toute la dette.

    Corps : { "reason": "Règlement D17 du 26/10 (réf. …)" } — 10 caractères
    minimum, comme le règlement unitaire. Tout ou rien : si une ligne échoue,
    aucune n'est réglée.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]

    def post(self, request, transporter_id):
        serializer = CommissionSettleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        motif = serializer.validated_data['reason']

        ids = list(
            CommissionLedger.objects.filter(
                transporter_id=transporter_id, is_settled=False,
            ).values_list('id', flat=True)
        )
        if not ids:
            return Response(
                {'error': "Ce transporteur n'a aucune commission à régler."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total = Decimal('0')
        with transaction.atomic():
            for ledger_id in ids:
                total += settle_commission_debt(
                    ledger_id=ledger_id, admin_user=request.user, reason=motif,
                ).amount

        return Response({
            'message': 'Dette de commission réglée.',
            'settled_count': len(ids),
            'settled_total': float(total),
        })
