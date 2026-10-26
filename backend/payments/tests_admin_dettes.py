"""
Écran « Commissions » de l'admin (payments/views_admin_debts.py).

Ce que ces tests protègent : pendant le pilote, c'est cet écran qui débloque
un transporteur après son paiement. S'il se trompe de total, de tri ou d'état
de blocage, l'administrateur débloque la mauvaise personne ou laisse bloqué
quelqu'un qui a payé.
"""
from decimal import Decimal

from django.test import override_settings
from rest_framework.test import APITestCase

from payments.debt import is_blocked_for_debt
from payments.models import CommissionLedger
from payments.tests_dette import SANS_LIMITEUR, V1, un_transporteur, une_dette
from support.models import AuditLog
from users.models import User


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class EcranCommissionsTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin-dettes@test.tn', email='admin-dettes@test.tn',
            password='SecurePass123!', role='ADMIN',
        )
        self.slim = un_transporteur('slim')
        self.nizar = un_transporteur('nizar')
        une_dette(self.slim, '40.00')
        une_dette(self.slim, '35.00')
        une_dette(self.slim, '20.00', reglee=True)
        une_dette(self.nizar, '16.00')
        self.client.force_authenticate(self.admin)

    def test_liste_par_transporteur_du_plus_endette_au_moins_endette(self):
        reponse = self.client.get(f'{V1}/admin/commission/debts/')

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data['limit'], 60.0)
        resultats = reponse.data['results']
        self.assertEqual([r['transporter_id'] for r in resultats], [self.slim.id, self.nizar.id])
        slim = resultats[0]
        # Les commissions déjà réglées ne comptent pas.
        self.assertEqual(slim['total'], 75.0)
        self.assertEqual(slim['count'], 2)
        self.assertTrue(slim['blocked'])
        self.assertFalse(resultats[1]['blocked'])

    def test_regle_toute_la_dette_et_debloque(self):
        self.assertTrue(is_blocked_for_debt(self.slim))

        reponse = self.client.post(
            f'{V1}/admin/commission/transporters/{self.slim.id}/settle/',
            {'reason': 'Règlement D17 du 26/10'}, format='json',
        )

        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual(reponse.data['settled_count'], 2)
        self.assertEqual(reponse.data['settled_total'], 75.0)
        self.assertFalse(is_blocked_for_debt(self.slim))
        # Chaque ligne laisse sa trace d'audit, comme un règlement unitaire.
        self.assertEqual(AuditLog.objects.filter(action='COMMISSION_DEBT_SETTLED').count(), 2)
        # La dette de l'autre transporteur n'est pas touchée.
        self.assertTrue(
            CommissionLedger.objects.filter(transporter=self.nizar, is_settled=False).exists()
        )

    def test_exige_un_motif(self):
        reponse = self.client.post(
            f'{V1}/admin/commission/transporters/{self.slim.id}/settle/',
            {'reason': 'payé'}, format='json',
        )
        self.assertEqual(reponse.status_code, 400)
        self.assertTrue(is_blocked_for_debt(self.slim))

    def test_refuse_un_transporteur_sans_dette(self):
        sans_dette = un_transporteur('rien')
        reponse = self.client.post(
            f'{V1}/admin/commission/transporters/{sans_dette.id}/settle/',
            {'reason': 'Règlement D17 du 26/10'}, format='json',
        )
        self.assertEqual(reponse.status_code, 400)

    def test_reserve_aux_administrateurs(self):
        self.client.force_authenticate(self.slim)
        self.assertEqual(self.client.get(f'{V1}/admin/commission/debts/').status_code, 403)
        reponse = self.client.post(
            f'{V1}/admin/commission/transporters/{self.slim.id}/settle/',
            {'reason': 'Je me règle moi-même'}, format='json',
        )
        self.assertEqual(reponse.status_code, 403)
        self.assertEqual(
            CommissionLedger.objects.filter(transporter=self.slim, is_settled=False).count(), 2,
        )

    def test_une_liste_vide_quand_personne_ne_doit_rien(self):
        CommissionLedger.objects.update(is_settled=True)
        reponse = self.client.get(f'{V1}/admin/commission/debts/')
        self.assertEqual(reponse.data['results'], [])

    def test_le_total_suit_les_centimes(self):
        une_dette(self.nizar, '0.50')
        reponse = self.client.get(f'{V1}/admin/commission/debts/')
        nizar = next(r for r in reponse.data['results'] if r['transporter_id'] == self.nizar.id)
        self.assertEqual(Decimal(str(nizar['total'])), Decimal('16.50'))
