"""
Mode « espèces seules » (payments/online.py, PAYMENT_GATEWAY='DISABLED').

Ce que ces tests protègent : au lancement, aucun compte marchand n'existe.
Si un paiement en ligne passait quand même, le client croirait avoir payé
alors qu'aucun dinar n'a bougé. Le serveur doit donc refuser chaque porte
d'entrée du paiement en ligne, choisir les espèces quand le client ne dit
rien, et ne jamais retomber sur la passerelle de test.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import Offer, TransportJob
from payments.gateway import get_payment_gateway
from payments.models import Booking
from payments.online import PAIEMENT_EN_LIGNE_INDISPONIBLE, PaiementEnLigneCoupe
from payments.tests_dette import SANS_LIMITEUR, V1, un_trajet, un_transporteur

User = get_user_model()


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR, PAYMENT_GATEWAY='DISABLED')
class EspecesSeulesTests(APITestCase):

    def setUp(self):
        self.transporteur = un_transporteur('especes')
        self.client_user = User.objects.create_user(
            username='client-especes@test.tn', email='client-especes@test.tn',
            password='SecurePass123!', role='CLIENT',
        )

    # --- Accepter l'offre d'un transporteur --------------------------------

    def _offre(self):
        job = TransportJob.objects.create(
            owner=self.client_user, status='PUBLISHED', job_type='TRANSPORT',
            pickup_address='Tunis', pickup_lat=Decimal('36.8'), pickup_lng=Decimal('10.1'),
            dropoff_address='Sfax', dropoff_lat=Decimal('34.7'), dropoff_lng=Decimal('10.7'),
            scheduled_time=timezone.now() + timedelta(days=2),
        )
        self.client.force_authenticate(self.transporteur)
        cree = self.client.post(f'{V1}/offers/', {
            'job': job.id, 'price_net': '100.00', 'message': 'Disponible',
            'valid_until': (timezone.now() + timedelta(days=3)).isoformat(),
        }, format='json')
        self.assertEqual(cree.status_code, 201, cree.data)
        return Offer.objects.get(job=job)

    def _accepter(self, offre, corps):
        self.client.force_authenticate(self.client_user)
        return self.client.post(f'{V1}/offers/{offre.id}/accept/', corps, format='json')

    def test_accepter_une_offre_en_ligne_est_refuse(self):
        offre = self._offre()

        reponse = self._accepter(offre, {'payment_method': 'DIGITAL'})

        self.assertEqual(reponse.status_code, 400)
        self.assertIn(PAIEMENT_EN_LIGNE_INDISPONIBLE, str(reponse.data))
        self.assertFalse(Booking.objects.filter(job=offre.job).exists())

    def test_sans_precision_l_offre_est_acceptee_en_especes(self):
        offre = self._offre()

        reponse = self._accepter(offre, {})

        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual(Booking.objects.get(job=offre.job).payment_method, 'COD')

    # --- Réserver un trajet retour -----------------------------------------

    def _reserver(self, corps):
        trajet = un_trajet(self.transporteur, instant_booking=True)
        self.client.force_authenticate(self.client_user)
        return trajet, self.client.post(f'{V1}/jobs/{trajet.id}/book-return/', corps, format='json')

    def test_reserver_un_retour_en_ligne_est_refuse(self):
        trajet, reponse = self._reserver({'proposed_price': '200.00', 'payment_method': 'DIGITAL'})

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.data['error'], PAIEMENT_EN_LIGNE_INDISPONIBLE)
        trajet.refresh_from_db()
        self.assertEqual(trajet.status, 'PUBLISHED')

    def test_sans_precision_le_retour_est_reserve_en_especes(self):
        trajet, reponse = self._reserver({'proposed_price': '200.00'})

        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(Booking.objects.get(job=trajet).payment_method, 'COD')

    # --- Envoyer une demande sur un trajet ---------------------------------

    def _demander(self, corps):
        trajet = un_trajet(self.transporteur)
        self.client.force_authenticate(self.client_user)
        return self.client.post(f'{V1}/jobs/{trajet.id}/requests/', {
            'description': 'Deux palettes', **corps,
        }, format='json')

    def test_une_demande_en_ligne_est_refusee_sur_le_champ_paiement(self):
        reponse = self._demander({'proposed_price': '200.00', 'payment_method': 'DIGITAL'})

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(str(reponse.data['payment_method'][0]), PAIEMENT_EN_LIGNE_INDISPONIBLE)

    def test_sans_precision_la_demande_part_en_especes(self):
        reponse = self._demander({'proposed_price': '200.00'})

        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(reponse.data['request']['payment_method'], 'COD')

    def test_au_dela_du_plafond_le_refus_ne_propose_pas_le_paiement_en_ligne(self):
        reponse = self._demander({'proposed_price': '450.00', 'payment_method': 'COD'})

        self.assertEqual(reponse.status_code, 400)
        message = str(reponse.data['payment_method'][0])
        self.assertTrue(message.startswith('Paiement à la livraison limité à 300 TND.'))
        self.assertNotIn('digital', message.lower())

    # --- Passerelle, lancement de paiement, webhook ------------------------

    def test_aucune_passerelle_n_est_construite(self):
        # Surtout pas la passerelle de test, qui déclare tout paiement réussi.
        with self.assertRaises(PaiementEnLigneCoupe):
            get_payment_gateway()

    def test_lancer_un_paiement_est_refuse(self):
        self.client.force_authenticate(self.client_user)
        reponse = self.client.post(f'{V1}/payments/initiate/', {'job_id': 1}, format='json')

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.data['error'], PAIEMENT_EN_LIGNE_INDISPONIBLE)

    def test_le_webhook_public_refuse_tout(self):
        reponse = self.client.post(
            f'{V1}/payments/webhook/', {'payment_ref': 'FAUX-123'}, format='json',
        )
        self.assertEqual(reponse.status_code, 404)

    # --- Ce que lisent les écrans ------------------------------------------

    def test_la_configuration_annonce_le_paiement_en_ligne_coupe(self):
        reponse = self.client.get(f'{V1}/payments/config/')
        self.assertFalse(reponse.data['online_payment_enabled'])

    @override_settings(PAYMENT_GATEWAY='KONNECT')
    def test_avec_konnect_le_paiement_en_ligne_est_annonce(self):
        reponse = self.client.get(f'{V1}/payments/config/')
        self.assertTrue(reponse.data['online_payment_enabled'])
