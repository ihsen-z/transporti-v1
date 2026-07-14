"""
Sprint 1 (remédiation transporteur) — D1 net garanti.

Couvre :
- calcul serveur net garanti (commission = net × taux ; total = net + commission)
- rejet du contrat legacy `total_price`
- bornes de prix (A4)
- filtre ?status= sur /api/offers/my/ (C1')
- my_offer + commission_rate dans le détail mission (C2')
- dérivations inverses (contre-offre / book-return)
"""
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from logistics.models import TransportJob, Offer
from trust.models import TrustProfile, VerificationStatus
from payments.services import calculate_from_net, derive_net_from_total

User = get_user_model()


@override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': [], 'DEFAULT_THROTTLE_RATES': {}})
class OfferCommissionTestBase(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username='comm_client',
            email='commclient@test.tn',
            password='SecurePass123!',
            role='CLIENT',
            first_name='Client',
            last_name='Test',
        )
        self.transporter = User.objects.create_user(
            username='comm_transporter',
            email='commtransporter@test.tn',
            password='SecurePass123!',
            role='TRANSPORTER',
            first_name='Trans',
            last_name='Porter',
        )
        TrustProfile.objects.create(
            user=self.transporter,
            verification_status=VerificationStatus.VERIFIED,
            verified_at=timezone.now(),
        )

    def _login_as(self, email, password='SecurePass123!'):
        # force_authenticate: le endpoint /api/auth/login/ est throttlé et
        # fausserait les tests répétés.
        user = User.objects.get(email=email)
        self.client.force_authenticate(user=user)

    def _job(self, job_type='TRANSPORT', status_val='PUBLISHED', owner=None):
        return TransportJob.objects.create(
            owner=owner or self.client_user,
            status=status_val,
            job_type=job_type,
            pickup_address='Tunis Centre',
            pickup_lat=Decimal('36.8065'),
            pickup_lng=Decimal('10.1815'),
            dropoff_address='Sfax Ville',
            dropoff_lat=Decimal('34.7406'),
            dropoff_lng=Decimal('10.7603'),
            scheduled_time=timezone.now() + timedelta(days=2),
        )

    def _post_offer(self, job, price_net, **extra):
        payload = {
            'job': job.id,
            'price_net': price_net,
            'message': 'test',
            'valid_until': (timezone.now() + timedelta(days=3)).isoformat(),
        }
        payload.update(extra)
        return self.client.post('/api/offers/', payload, format='json')


class NetGuaranteedCalculationTests(OfferCommissionTestBase):
    """A1 — le net saisi est le net stocké ; commission ajoutée au-dessus."""

    def test_transport_12_percent(self):
        job = self._job('TRANSPORT')
        self._login_as(self.transporter.email)
        resp = self._post_offer(job, '150.00')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        offer = Offer.objects.get(job=job)
        self.assertEqual(offer.price_net, Decimal('150.00'))
        self.assertEqual(offer.commission_amount, Decimal('18.00'))
        self.assertEqual(offer.total_price, Decimal('168.00'))

    def test_moving_15_percent(self):
        job = self._job('MOVING')
        self._login_as(self.transporter.email)
        resp = self._post_offer(job, '150.00')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        offer = Offer.objects.get(job=job)
        self.assertEqual(offer.price_net, Decimal('150.00'))
        self.assertEqual(offer.commission_amount, Decimal('22.50'))
        self.assertEqual(offer.total_price, Decimal('172.50'))

    def test_rounding_half_up(self):
        commission, total = calculate_from_net('TRANSPORT', Decimal('99.99'))
        # 99.99 × 0.12 = 11.9988 → 12.00
        self.assertEqual(commission, Decimal('12.00'))
        self.assertEqual(total, Decimal('111.99'))

    def test_legacy_total_price_field_rejected(self):
        job = self._job()
        self._login_as(self.transporter.email)
        resp = self.client.post(
            '/api/offers/',
            {
                'job': job.id,
                'total_price': '168.00',
                'message': 'legacy',
                'valid_until': (timezone.now() + timedelta(days=3)).isoformat(),
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('total_price', resp.data)


class PriceBoundsTests(OfferCommissionTestBase):
    """A4 — bornes de prix."""

    def test_zero_rejected(self):
        job = self._job()
        self._login_as(self.transporter.email)
        resp = self._post_offer(job, '0')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price_net', resp.data)

    def test_negative_rejected(self):
        job = self._job()
        self._login_as(self.transporter.email)
        resp = self._post_offer(job, '-50')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price_net', resp.data)

    def test_above_max_rejected(self):
        job = self._job()
        self._login_as(self.transporter.email)
        resp = self._post_offer(job, '100001')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price_net', resp.data)

    def test_duplicate_offer_rejected(self):
        job = self._job()
        self._login_as(self.transporter.email)
        self.assertEqual(self._post_offer(job, '100').status_code, 201)
        resp = self._post_offer(job, '120')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('job', resp.data)

    def test_max_three_pending(self):
        self._login_as(self.transporter.email)
        for _ in range(3):
            resp = self._post_offer(self._job(), '100')
            self.assertEqual(resp.status_code, 201, resp.data)
        resp = self._post_offer(self._job(), '100')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', resp.data)


class MyOffersStatusFilterTests(OfferCommissionTestBase):
    """C1' — filtre ?status= sur /api/offers/my/."""

    def test_status_filter(self):
        self._login_as(self.transporter.email)
        job_a, job_b = self._job(), self._job()
        self._post_offer(job_a, '100')
        self._post_offer(job_b, '110')
        # Force one offer out of PENDING
        Offer.objects.filter(job=job_b).update(status='ACCEPTED')

        resp = self.client.get('/api/offers/my/?status=PENDING')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 1)

        resp_all = self.client.get('/api/offers/my/')
        self.assertEqual(resp_all.data['count'], 2)

    def test_invalid_status_ignored(self):
        self._login_as(self.transporter.email)
        self._post_offer(self._job(), '100')
        resp = self.client.get('/api/offers/my/?status=BOGUS')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 1)


class JobDetailExposureTests(OfferCommissionTestBase):
    """C2' — my_offer + commission_rate dans le détail mission."""

    def test_commission_rate_exposed(self):
        job = self._job('MOVING')
        self._login_as(self.transporter.email)
        resp = self.client.get(f'/api/jobs/{job.id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['commission_rate'], 0.15)

    def test_my_offer_for_transporter_with_offer(self):
        job = self._job()
        self._login_as(self.transporter.email)
        self._post_offer(job, '150.00')

        resp = self.client.get(f'/api/jobs/{job.id}/')
        my_offer = resp.data['my_offer']
        self.assertIsNotNone(my_offer)
        self.assertEqual(my_offer['status'], 'PENDING')
        self.assertEqual(my_offer['price_net'], 150.0)
        self.assertEqual(my_offer['total_price'], 168.0)

    def test_my_offer_null_without_offer(self):
        job = self._job()
        self._login_as(self.transporter.email)
        resp = self.client.get(f'/api/jobs/{job.id}/')
        self.assertIsNone(resp.data['my_offer'])

    def test_my_offer_null_for_owner_client(self):
        job = self._job()
        self._login_as(self.client_user.email)
        resp = self.client.get(f'/api/jobs/{job.id}/')
        self.assertIsNone(resp.data['my_offer'])


class DeriveNetFromTotalTests(OfferCommissionTestBase):
    """Contre-offre / book-return — dérivation inverse cohérente."""

    def test_derive_transport(self):
        commission, net = derive_net_from_total('TRANSPORT', Decimal('120.00'))
        # 120 / 1.12 = 107.142857 → 107.14 ; commission = 12.86
        self.assertEqual(net, Decimal('107.14'))
        self.assertEqual(commission, Decimal('12.86'))
        self.assertEqual(net + commission, Decimal('120.00'))

    def test_derive_moving(self):
        commission, net = derive_net_from_total('MOVING', Decimal('460.00'))
        # 460 / 1.15 = 400.00
        self.assertEqual(net, Decimal('400.00'))
        self.assertEqual(commission, Decimal('60.00'))

    def test_roundtrip_consistency(self):
        """calculate_from_net puis derive_net_from_total redonnent le net saisi."""
        for net_in in (Decimal('50.00'), Decimal('150.00'), Decimal('999.99')):
            _, total = calculate_from_net('TRANSPORT', net_in)
            _, net_out = derive_net_from_total('TRANSPORT', total)
            self.assertEqual(net_out, net_in)
