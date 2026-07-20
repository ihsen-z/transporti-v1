"""
Sprint 6 — exécution pro : timeline (D2'/D6), preuve de livraison PIN (D3'/D7),
annulations tracées (D4' → K7).
"""
from django.test import override_settings
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from logistics.models import TransportJob, Offer, JobEvent
from trust.models import TrustProfile, VerificationStatus
from payments.models import Booking

User = get_user_model()


@override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}})
class ExecutionTestBase(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username='ex_client', email='exclient@test.tn',
            password='SecurePass123!', role='CLIENT', first_name='Cli', last_name='Ent')
        self.transporter = User.objects.create_user(
            username='ex_trans', email='extrans@test.tn',
            password='SecurePass123!', role='TRANSPORTER', first_name='Tr', last_name='Ns')
        TrustProfile.objects.create(
            user=self.transporter, verification_status=VerificationStatus.VERIFIED,
            verified_at=timezone.now())

    def _auth(self, u):
        self.client.force_authenticate(user=u)

    def _in_progress_job(self, with_booking=True, pin='1234'):
        job = TransportJob.objects.create(
            owner=self.client_user, status='IN_PROGRESS', job_type='TRANSPORT',
            pickup_address='Tunis', dropoff_address='Sfax',
            scheduled_time=timezone.now() + timedelta(days=1))
        offer = Offer.objects.create(
            job=job, transporter=self.transporter, status='ACCEPTED',
            price_net=Decimal('100'), commission_amount=Decimal('12'),
            total_price=Decimal('112'), valid_until=timezone.now() + timedelta(days=1))
        if with_booking:
            Booking.objects.create(
                job=job, accepted_offer=offer, final_price=Decimal('112'),
                commission_rate=Decimal('0.12'), payment_method='DIGITAL',
                delivery_pin=pin)
        return job


class TimelineTests(ExecutionTestBase):
    def test_milestone_sequence(self):
        job = self._in_progress_job()
        self._auth(self.transporter)
        r = self.client.post(f'/api/jobs/{job.id}/events/', {'event': 'ARRIVED_PICKUP'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        r = self.client.post(f'/api/jobs/{job.id}/events/', {'event': 'LOADED'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(job.events.count(), 2)

    def test_loaded_needs_arrived_first(self):
        job = self._in_progress_job()
        self._auth(self.transporter)
        r = self.client.post(f'/api/jobs/{job.id}/events/', {'event': 'LOADED'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_milestone_no_duplicate(self):
        job = self._in_progress_job()
        self._auth(self.transporter)
        self.client.post(f'/api/jobs/{job.id}/events/', {'event': 'ARRIVED_PICKUP'}, format='json')
        r = self.client.post(f'/api/jobs/{job.id}/events/', {'event': 'ARRIVED_PICKUP'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_only_assignee(self):
        job = self._in_progress_job()
        self._auth(self.client_user)
        r = self.client.post(f'/api/jobs/{job.id}/events/', {'event': 'ARRIVED_PICKUP'}, format='json')
        self.assertEqual(r.status_code, 403)


class DeliveryPinTests(ExecutionTestBase):
    def test_complete_requires_pin(self):
        job = self._in_progress_job(pin='4321')
        self._auth(self.transporter)
        r = self.client.post(f'/api/jobs/{job.id}/complete/', {}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data.get('code'), 'PIN_REQUIRED')

    def test_complete_wrong_pin(self):
        job = self._in_progress_job(pin='4321')
        self._auth(self.transporter)
        r = self.client.post(f'/api/jobs/{job.id}/complete/', {'pin': '0000'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data.get('code'), 'PIN_INVALID')

    def test_complete_valid_pin(self):
        job = self._in_progress_job(pin='4321')
        self._auth(self.transporter)
        r = self.client.post(f'/api/jobs/{job.id}/complete/',
                             {'pin': '4321', 'pod_photo_url': 'http://x/p.jpg'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        job.refresh_from_db()
        self.assertEqual(job.status, 'COMPLETED')
        ev = job.events.filter(event='DELIVERED').first()
        self.assertIsNotNone(ev)
        self.assertEqual(ev.metadata.get('pod_photo_url'), 'http://x/p.jpg')

    def test_complete_no_booking_no_pin(self):
        job = self._in_progress_job(with_booking=False)
        self._auth(self.transporter)
        r = self.client.post(f'/api/jobs/{job.id}/complete/', {}, format='json')
        self.assertEqual(r.status_code, 200, r.data)

    def test_pin_visible_to_client_only(self):
        job = self._in_progress_job(pin='7788')
        self._auth(self.client_user)
        r = self.client.get(f'/api/jobs/{job.id}/')
        self.assertEqual(r.data['delivery_pin'], '7788')
        self._auth(self.transporter)
        r = self.client.get(f'/api/jobs/{job.id}/')
        self.assertIsNone(r.data['delivery_pin'])


class CancellationTraceTests(ExecutionTestBase):
    def test_transporter_cancel_traced_and_hits_k7(self):
        job = self._in_progress_job()
        self._auth(self.transporter)
        r = self.client.post(f'/api/jobs/{job.id}/transporter-cancel/',
                             {'reason': 'panne moteur'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(JobEvent.objects.filter(
            event='CANCELLED_BY_TRANSPORTER', actor=self.transporter).exists())
        # K7 : completion_rate = 0 completed / (0 + 1 cancelled) = 0.0
        from logistics.stats import get_transporter_stats
        stats = get_transporter_stats(self.transporter)
        self.assertEqual(stats['completion_rate'], 0.0)
