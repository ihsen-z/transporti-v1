"""
Logistics Module API Tests — Sprint D Fondamentaux
Tests Job and Offer API endpoints via DRF APITestCase.
Strictly additive: new test file in existing tests/ package.
Complements model-level tests in test_status_transitions.py.
"""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from logistics.models import TransportJob, Offer

User = get_user_model()


class JobAPITestBase(APITestCase):
    """Shared setup for Job API tests."""

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='api_client',
            email='apiclient@test.tn',
            password='SecurePass123!',
            role='CLIENT',
            first_name='Client',
            last_name='Test',
        )
        self.transporter_user = User.objects.create_user(
            username='api_transporter',
            email='apitransporter@test.tn',
            password='SecurePass123!',
            role='TRANSPORTER',
            first_name='Transporter',
            last_name='Test',
        )

    def _login_as(self, email, password='SecurePass123!'):
        """Helper to login and set auth credentials."""
        resp = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': password},
            format='json',
        )
        token = resp.data['tokens']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return token

    def _create_job_in_db(self, owner=None, status_val='DRAFT'):
        """Helper to create a job directly in DB."""
        return TransportJob.objects.create(
            owner=owner or self.client_user,
            status=status_val,
            job_type='TRANSPORT',
            pickup_address='Tunis Centre',
            pickup_lat=Decimal('36.8065'),
            pickup_lng=Decimal('10.1815'),
            dropoff_address='Sousse Ville',
            dropoff_lat=Decimal('35.8256'),
            dropoff_lng=Decimal('10.6369'),
            scheduled_time=timezone.now() + timedelta(days=1),
        )


class JobCreateAPITests(JobAPITestBase):
    """Tests for POST /api/jobs/ (create a new job)."""

    JOBS_URL = '/api/jobs/'

    def test_create_job_authenticated_client(self):
        """Authenticated CLIENT can create a job."""
        self._login_as('apiclient@test.tn')
        resp = self.client.post(
            self.JOBS_URL,
            {
                'job_type': 'TRANSPORT',
                'pickup_address': 'Tunis',
                'pickup_lat': '36.8065',
                'pickup_lng': '10.1815',
                'dropoff_address': 'Sousse',
                'dropoff_lat': '35.8256',
                'dropoff_lng': '10.6369',
                'scheduled_time': (timezone.now() + timedelta(days=2)).isoformat(),
                'description': 'Cartons de déménagement',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'DRAFT')

    def test_create_job_unauthenticated(self):
        """Unauthenticated request to create job returns 401."""
        resp = self.client.post(
            self.JOBS_URL,
            {
                'job_type': 'TRANSPORT',
                'pickup_address': 'Tunis',
                'dropoff_address': 'Sousse',
                'scheduled_time': (timezone.now() + timedelta(days=2)).isoformat(),
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_job_missing_pickup(self):
        """Missing required pickup_address returns 400."""
        self._login_as('apiclient@test.tn')
        resp = self.client.post(
            self.JOBS_URL,
            {
                'job_type': 'TRANSPORT',
                'dropoff_address': 'Sousse',
                'scheduled_time': (timezone.now() + timedelta(days=2)).isoformat(),
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class JobPublicListAPITests(JobAPITestBase):
    """Tests for GET /api/jobs/public/ (browse public jobs)."""

    PUBLIC_JOBS_URL = '/api/jobs/public/'

    def test_public_jobs_accessible_without_auth(self):
        """Public jobs endpoint allows unauthenticated access (IsAuthenticatedOrReadOnly)."""
        self._create_job_in_db(status_val='PUBLISHED')
        resp = self.client.get(self.PUBLIC_JOBS_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_public_jobs_returns_published_only(self):
        """Public endpoint should only return PUBLISHED jobs."""
        self._create_job_in_db(status_val='PUBLISHED')
        self._create_job_in_db(status_val='DRAFT')  # Should not appear
        resp = self.client.get(self.PUBLIC_JOBS_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # All returned jobs should be PUBLISHED
        for job in resp.data.get('results', resp.data):
            self.assertEqual(job['status'], 'PUBLISHED')


class JobMyListAPITests(JobAPITestBase):
    """Tests for GET /api/jobs/my/ (list user's own jobs)."""

    MY_JOBS_URL = '/api/jobs/my/'

    def test_my_jobs_authenticated(self):
        """Authenticated user can list their own jobs."""
        self._create_job_in_db()
        self._login_as('apiclient@test.tn')
        resp = self.client.get(self.MY_JOBS_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_my_jobs_unauthenticated(self):
        """Unauthenticated request to 'my jobs' returns 401."""
        resp = self.client.get(self.MY_JOBS_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_my_jobs_only_returns_own(self):
        """User only sees their own jobs, not others'."""
        self._create_job_in_db(owner=self.client_user)
        self._create_job_in_db(owner=self.transporter_user)
        self._login_as('apiclient@test.tn')
        resp = self.client.get(self.MY_JOBS_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        jobs = resp.data.get('results', resp.data)
        # Client user should only see 1 job (their own)
        for job in jobs:
            self.assertEqual(job['owner'], self.client_user.id)


class JobDetailAPITests(JobAPITestBase):
    """Tests for GET /api/jobs/{id}/."""

    def test_job_detail_authenticated(self):
        """Authenticated user can view job detail."""
        job = self._create_job_in_db()
        self._login_as('apiclient@test.tn')
        resp = self.client.get(f'/api/jobs/{job.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], job.id)

    def test_job_detail_not_found(self):
        """Non-existent job returns 404."""
        self._login_as('apiclient@test.tn')
        resp = self.client.get('/api/jobs/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class OfferModelTests(TestCase):
    """Model-level tests for the Offer model (complement test_status_transitions.py)."""

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='offer_client',
            email='offerclient@test.tn',
            password='SecurePass123!',
            role='CLIENT',
        )
        self.transporter_user = User.objects.create_user(
            username='offer_transporter',
            email='offertransporter@test.tn',
            password='SecurePass123!',
            role='TRANSPORTER',
        )

    def _create_job(self, status_val='PUBLISHED'):
        return TransportJob.objects.create(
            owner=self.client_user,
            status=status_val,
            job_type='TRANSPORT',
            pickup_address='Tunis',
            pickup_lat=Decimal('36.8065'),
            pickup_lng=Decimal('10.1815'),
            dropoff_address='Sousse',
            dropoff_lat=Decimal('35.8256'),
            dropoff_lng=Decimal('10.6369'),
            scheduled_time=timezone.now() + timedelta(days=1),
        )

    def test_offer_default_status_pending(self):
        """New offer defaults to PENDING."""
        job = self._create_job()
        offer = Offer.objects.create(
            job=job,
            transporter=self.transporter_user,
            price_net=Decimal('80.00'),
            commission_amount=Decimal('20.00'),
            total_price=Decimal('100.00'),
            valid_until=timezone.now() + timedelta(days=3),
        )
        self.assertEqual(offer.status, 'PENDING')

    def test_offer_str_representation(self):
        """Offer __str__ includes job ID and status."""
        job = self._create_job()
        offer = Offer.objects.create(
            job=job,
            transporter=self.transporter_user,
            price_net=Decimal('80.00'),
            commission_amount=Decimal('20.00'),
            total_price=Decimal('100.00'),
            valid_until=timezone.now() + timedelta(days=3),
        )
        self.assertIn(str(job.id), str(offer))
        self.assertIn('PENDING', str(offer))
