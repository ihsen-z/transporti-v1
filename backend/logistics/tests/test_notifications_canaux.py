"""
Notifications de mission : elles vont au VRAI client, sur les deux canaux.

Sur un trajet retour, job.owner est le TRANSPORTEUR. Notifier job.owner
privait le client de toute nouvelle de sa mission et doublait celles du
transporteur. Chaque test est joué sur les deux canaux :
- besoin client (job.owner = client, transporteur = offre acceptée) ;
- trajet retour (job.owner = transporteur, client = demande acceptée).
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from logistics.models import Offer, ReturnTripRequest, TransportJob
from notifications.models import Notification
from payments.models import Booking
from logistics.tests.aides_kyc import verify_transporter

User = get_user_model()


class CanauxMixin:
    """Fabrique une mission prête, sur l'un ou l'autre canal."""

    def _users(self):
        self.client_user = User.objects.create_user(
            username='nc_client', email='ncclient@test.tn', password='SecurePass123!',
            role='CLIENT', first_name='Cli', last_name='Ent')
        self.transporter = User.objects.create_user(
            username='nc_trans', email='nctrans@test.tn', password='SecurePass123!',
            role='TRANSPORTER', first_name='Tr', last_name='Ns')
        verify_transporter(self.transporter)

    def _mission(self, return_trip: bool, status: str, payment: str = 'COD') -> TransportJob:
        owner = self.transporter if return_trip else self.client_user
        job = TransportJob.objects.create(
            owner=owner, status=status, job_type='TRANSPORT', is_return_trip=return_trip,
            pickup_address='Sousse', dropoff_address='Tunis',
            scheduled_time=timezone.now() + timedelta(days=1))
        offer = Offer.objects.create(
            job=job, transporter=self.transporter, status='ACCEPTED',
            price_net=Decimal('100'), commission_amount=Decimal('8'),
            total_price=Decimal('108'), valid_until=timezone.now() + timedelta(days=1))
        if return_trip:
            ReturnTripRequest.objects.create(
                job=job, client=self.client_user, description='Un frigo',
                proposed_price=Decimal('108'), payment_method=payment,
                status=ReturnTripRequest.Status.ACCEPTED)
        Booking.objects.create(
            job=job, accepted_offer=offer, final_price=Decimal('108'),
            commission_rate=Decimal('0.08'), payment_method=payment, delivery_pin='1234')
        return job

    def _types_pour(self, user, job):
        return list(
            Notification.objects.filter(user=user, metadata__job_id=job.id)
            .values_list('type', flat=True)
        )


@override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}})
class NotificationsMissionDeuxCanauxTests(CanauxMixin, APITestCase):
    def setUp(self):
        self._users()
        self.client.force_authenticate(user=self.transporter)

    def _pour_les_deux_canaux(self, scenario):
        for return_trip in (False, True):
            with self.subTest(trajet_retour=return_trip):
                Notification.objects.all().delete()
                scenario(return_trip)

    def test_confirm_start_notifie_le_client(self):
        def scenario(return_trip):
            job = self._mission(return_trip, 'MATCHED')
            r = self.client.post(f'/api/jobs/{job.id}/confirm-start/', {}, format='json')
            self.assertEqual(r.status_code, 200, r.data)
            self.assertIn('JOB_STARTED', self._types_pour(self.client_user, job))
            self.assertEqual(self._types_pour(self.transporter, job), [])
        self._pour_les_deux_canaux(scenario)

    def test_etape_de_mission_notifie_le_client(self):
        def scenario(return_trip):
            job = self._mission(return_trip, 'IN_PROGRESS')
            r = self.client.post(f'/api/jobs/{job.id}/events/', {'event': 'ARRIVED_PICKUP'}, format='json')
            self.assertEqual(r.status_code, 201, r.data)
            self.assertIn('JOB_STARTED', self._types_pour(self.client_user, job))
            self.assertEqual(self._types_pour(self.transporter, job), [])
        self._pour_les_deux_canaux(scenario)

    def test_livraison_notifie_chacun_une_fois(self):
        def scenario(return_trip):
            job = self._mission(return_trip, 'IN_PROGRESS')
            r = self.client.post(f'/api/jobs/{job.id}/complete/', {'pin': '1234'}, format='json')
            self.assertEqual(r.status_code, 200, r.data)
            self.assertEqual(self._types_pour(self.client_user, job), ['JOB_COMPLETED'])
            self.assertEqual(self._types_pour(self.transporter, job), ['JOB_COMPLETED'])
        self._pour_les_deux_canaux(scenario)

    def test_annulation_transporteur_notifie_le_client(self):
        def scenario(return_trip):
            job = self._mission(return_trip, 'IN_PROGRESS')
            r = self.client.post(f'/api/jobs/{job.id}/transporter-cancel/',
                                 {'reason': 'Panne'}, format='json')
            self.assertEqual(r.status_code, 200, r.data)
            self.assertIn('JOB_CANCELLED', self._types_pour(self.client_user, job))
            self.assertEqual(self._types_pour(self.transporter, job), [])
        self._pour_les_deux_canaux(scenario)


class NotificationsServicesDeuxCanauxTests(CanauxMixin, TestCase):
    """Services appelés hors des vues : litige, remboursement, e-mail de fin."""

    def setUp(self):
        self._users()

    def test_email_de_fin_va_au_client(self):
        from notifications.emails import notify_job_completed
        for return_trip in (False, True):
            with self.subTest(trajet_retour=return_trip):
                mail.outbox = []
                job = self._mission(return_trip, 'COMPLETED')
                notify_job_completed(job)
                self.assertEqual([m.to for m in mail.outbox], [[self.client_user.email]])

    def test_litige_ouvert_par_le_client_previent_le_transporteur(self):
        from notifications.services import notify_dispute_opened

        class _Litige:  # le service ne lit que ces attributs
            id = 1
            category = 'DAMAGE'

        for return_trip in (False, True):
            with self.subTest(trajet_retour=return_trip):
                Notification.objects.all().delete()
                litige = _Litige()
                litige.job = self._mission(return_trip, 'COMPLETED')
                litige.opened_by_id = self.client_user.id
                notify_dispute_opened(litige)
                self.assertTrue(Notification.objects.filter(
                    user=self.transporter, type='DISPUTE_OPENED').exists())
                self.assertFalse(Notification.objects.filter(
                    user=self.client_user, type='DISPUTE_OPENED').exists())

    def test_remboursement_previent_le_client(self):
        from notifications.services import notify_escrow_refunded

        class _Sequestre:
            id = 1
            amount = Decimal('108')

        for return_trip in (False, True):
            with self.subTest(trajet_retour=return_trip):
                Notification.objects.all().delete()
                sequestre = _Sequestre()
                sequestre.booking_reference = self._mission(return_trip, 'MATCHED')
                notify_escrow_refunded(sequestre)
                self.assertTrue(Notification.objects.filter(
                    user=self.client_user, type='ESCROW_REFUNDED').exists())
                self.assertFalse(Notification.objects.filter(
                    user=self.transporter, type='ESCROW_REFUNDED').exists())
