"""
Textes d'acceptation en mode espèces : plus de « finalisez le paiement ».

Au lancement, tout se paie en espèces : la mission peut démarrer tout de suite
et le client paie à la livraison. Les textes du paiement en ligne restent pour
une réservation DIGITAL.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.acceptance_messages import client_next_step, transporter_next_step
from logistics.models import Offer, ReturnTripRequest, TransportJob
from notifications.models import Notification
from logistics.tests.aides_kyc import verify_transporter

User = get_user_model()
SANS_LIMITEUR = {'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}}


class TextesParModeTests(SimpleTestCase):
    def test_especes(self):
        self.assertIn('espèces à la livraison', client_next_step('COD'))
        self.assertNotIn('Finalisez', client_next_step('COD'))
        self.assertIn('espèces à la livraison', transporter_next_step('COD'))

    def test_paiement_en_ligne(self):
        self.assertIn('Finalisez le paiement', client_next_step('DIGITAL'))


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR, PAYMENT_GATEWAY='DISABLED')
class AcceptationEnEspecesTests(APITestCase):

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='esp_c', email='espc@test.tn', password='SecurePass123!', role='CLIENT')
        self.transporter = User.objects.create_user(
            username='esp_t', email='espt@test.tn', password='SecurePass123!', role='TRANSPORTER')
        verify_transporter(self.transporter)

    def test_demande_acceptee_en_especes(self):
        trajet = TransportJob.objects.create(
            owner=self.transporter, status='PUBLISHED', job_type='TRANSPORT',
            is_return_trip=True, pickup_address='Sfax', dropoff_address='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2))
        demande = ReturnTripRequest.objects.create(
            job=trajet, client=self.client_user, description='Deux palettes',
            proposed_price=Decimal('200.00'), payment_method='COD')
        self.client.force_authenticate(self.transporter)

        r = self.client.post(f'/api/trip-requests/{demande.id}/respond/', {'action': 'accept'}, format='json')

        self.assertEqual(r.status_code, 200, r.data)
        self.assertNotIn('finaliser le paiement', r.data['message'])
        self.assertIn('espèces', r.data['message'])
        notif = Notification.objects.get(user=self.client_user, type='TRIP_REQUEST_ACCEPTED')
        self.assertNotIn('Finalisez le paiement', notif.message)
        self.assertIn('espèces à la livraison', notif.message)

    def test_offre_acceptee_en_especes(self):
        besoin = TransportJob.objects.create(
            owner=self.client_user, status='PUBLISHED', job_type='TRANSPORT',
            pickup_address='Sfax', dropoff_address='Tunis',
            scheduled_time=timezone.now() + timedelta(days=2))
        offre = Offer.objects.create(
            job=besoin, transporter=self.transporter, status='PENDING',
            price_net=Decimal('100'), commission_amount=Decimal('12'),
            total_price=Decimal('112'), valid_until=timezone.now() + timedelta(days=1))
        self.client.force_authenticate(self.client_user)

        r = self.client.post(f'/api/offers/{offre.id}/accept/', {'payment_method': 'COD'}, format='json')

        self.assertEqual(r.status_code, 200, r.data)
        self.assertNotIn('awaiting payment', r.data['message'])
        self.assertIn('espèces à la livraison', r.data['message'])
