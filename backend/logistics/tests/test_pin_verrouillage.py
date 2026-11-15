"""
Code de livraison : 5 codes faux → saisie bloquée 15 minutes (423 PIN_LOCKED).

Un code à 4 chiffres sans compteur se devine en 10 000 essais. Le client est
prévenu du blocage ; un code juste remet le compteur à zéro.
"""
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import Offer, ReturnTripRequest, TransportJob
from notifications.models import Notification
from payments.models import Booking
from logistics.tests.aides_kyc import verify_transporter

User = get_user_model()
SANS_LIMITEUR = {'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}}


@override_settings(REST_FRAMEWORK=SANS_LIMITEUR)
class VerrouillageCodeLivraisonTests(APITestCase):

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='pin_c', email='pinc@test.tn', password='SecurePass123!', role='CLIENT')
        self.transporter = User.objects.create_user(
            username='pin_t', email='pint@test.tn', password='SecurePass123!', role='TRANSPORTER')
        verify_transporter(self.transporter)
        # Trajet retour : le client n'est PAS job.owner, la notification doit
        # quand même lui parvenir.
        self.job = TransportJob.objects.create(
            owner=self.transporter, status='IN_PROGRESS', job_type='TRANSPORT',
            is_return_trip=True, pickup_address='Sousse', dropoff_address='Tunis',
            scheduled_time=timezone.now() + timedelta(days=1))
        offer = Offer.objects.create(
            job=self.job, transporter=self.transporter, status='ACCEPTED',
            price_net=Decimal('100'), commission_amount=Decimal('8'),
            total_price=Decimal('108'), valid_until=timezone.now() + timedelta(days=1))
        ReturnTripRequest.objects.create(
            job=self.job, client=self.client_user, description='Un frigo',
            proposed_price=Decimal('108'), payment_method='COD', status='ACCEPTED')
        self.booking = Booking.objects.create(
            job=self.job, accepted_offer=offer, final_price=Decimal('108'),
            commission_rate=Decimal('0.08'), payment_method='COD', delivery_pin='4321')
        self.client.force_authenticate(self.transporter)
        self.url = f'/api/jobs/{self.job.id}/complete/'

    def _essai(self, pin):
        return self.client.post(self.url, {'pin': pin}, format='json')

    def test_quatre_codes_faux_restent_de_simples_refus(self):
        for restant in (4, 3, 2, 1):
            r = self._essai('0000')
            self.assertEqual(r.status_code, 400)
            self.assertEqual(r.data['code'], 'PIN_INVALID')
            self.assertEqual(r.data['remaining_attempts'], restant)

    def test_le_cinquieme_code_faux_bloque_et_previent_le_client(self):
        for _ in range(4):
            self._essai('0000')
        r = self._essai('0000')
        self.assertEqual(r.status_code, 423, r.data)
        self.assertEqual(r.data['code'], 'PIN_LOCKED')
        self.assertGreater(r.data['retry_after_seconds'], 14 * 60)
        self.assertIn('Retry-After', r)

        alerte = Notification.objects.filter(user=self.client_user, metadata__event='PIN_LOCKED')
        self.assertEqual(alerte.count(), 1)
        self.assertFalse(Notification.objects.filter(
            user=self.transporter, metadata__event='PIN_LOCKED').exists())

        # Bloqué : même le bon code est refusé, la mission n'est pas livrée.
        r = self._essai('4321')
        self.assertEqual(r.status_code, 423)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, 'IN_PROGRESS')

    def test_apres_quinze_minutes_le_bon_code_passe(self):
        for _ in range(5):
            self._essai('0000')
        plus_tard = timezone.now() + timedelta(minutes=16)
        with mock.patch('django.utils.timezone.now', return_value=plus_tard):
            r = self._essai('4321')
        self.assertEqual(r.status_code, 200, r.data)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.pin_failed_attempts, 0)
        self.assertIsNone(self.booking.pin_locked_until)

    def test_un_code_juste_remet_le_compteur_a_zero(self):
        from payments.delivery_pin import check_delivery_pin
        for _ in range(3):
            check_delivery_pin(self.booking, '0000')
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.pin_failed_attempts, 3)

        self.assertEqual(check_delivery_pin(self.booking, '4321').status, 'OK')
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.pin_failed_attempts, 0)

    def test_trois_blocages_ferment_la_saisie_jusqu_a_intervention(self):
        # 3 séries de 5 codes faux, chacune après la fin du blocage précédent.
        maintenant = timezone.now()
        for serie in range(3):
            moment = maintenant + timedelta(minutes=20 * serie)
            with mock.patch('django.utils.timezone.now', return_value=moment):
                for _ in range(5):
                    r = self._essai('0000')
            self.assertEqual(r.status_code, 423)

        # Dernier blocage : définitif, sans délai, message « support ».
        self.assertEqual(r.data['code'], 'PIN_LOCKED')
        self.assertFalse(r.data.get('retry_after_seconds'))
        self.assertIn('support', r.data['error'])

        # Une heure plus tard, même le bon code reste refusé.
        with mock.patch('django.utils.timezone.now', return_value=maintenant + timedelta(hours=5)):
            r = self._essai('4321')
        self.assertEqual(r.status_code, 423)
        self.assertNotIn('Retry-After', r)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, 'IN_PROGRESS')

        # Le client est prévenu du blocage définitif.
        self.assertTrue(Notification.objects.filter(
            user=self.client_user, metadata__event='PIN_LOCKED', metadata__permanent=True).exists())

        # Intervention du support : compteur remis à zéro → le bon code passe.
        Booking.objects.filter(pk=self.booking.pk).update(
            pin_lock_count=0, pin_failed_attempts=0, pin_locked_until=None)
        self.assertEqual(self._essai('4321').status_code, 200)
