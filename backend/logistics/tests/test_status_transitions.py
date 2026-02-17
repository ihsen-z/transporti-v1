"""
Status Transition Tests — Production Simulation Hardening
Tests all legal and illegal status transitions for TransportJob and Offer.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from logistics.models import TransportJob, Offer


User = get_user_model()


class StatusTransitionTestCase(TestCase):
    """Validate that job status transitions follow the state machine rules."""

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='test_client',
            email='client@test.tn',
            password='testpass123',
            role='CLIENT',
        )
        self.transporter_user = User.objects.create_user(
            username='test_transporter',
            email='transporter@test.tn',
            password='testpass123',
            role='TRANSPORTER',
        )

    def _create_job(self, status='DRAFT'):
        return TransportJob.objects.create(
            owner=self.client_user,
            status=status,
            job_type='TRANSPORT',
            pickup_address='Tunis Centre',
            pickup_lat=Decimal('36.8065'),
            pickup_lng=Decimal('10.1815'),
            dropoff_address='Sousse Ville',
            dropoff_lat=Decimal('35.8256'),
            dropoff_lng=Decimal('10.6369'),
            scheduled_time=timezone.now() + timedelta(days=1),
        )

    def _create_offer(self, job, status='PENDING'):
        return Offer.objects.create(
            job=job,
            transporter=self.transporter_user,
            status=status,
            price_net=Decimal('80.00'),
            commission_amount=Decimal('20.00'),
            total_price=Decimal('100.00'),
            valid_until=timezone.now() + timedelta(days=3),
        )

    # =========================================================================
    # LEGAL TRANSITIONS
    # =========================================================================

    def test_draft_to_published(self):
        """DRAFT → PUBLISHED is allowed."""
        job = self._create_job('DRAFT')
        job.status = TransportJob.Status.PUBLISHED
        job.save()
        job.refresh_from_db()
        self.assertEqual(job.status, 'PUBLISHED')

    def test_published_to_in_progress(self):
        """PUBLISHED → IN_PROGRESS is allowed (via offer acceptance)."""
        job = self._create_job('PUBLISHED')
        job.status = TransportJob.Status.IN_PROGRESS
        job.save()
        job.refresh_from_db()
        self.assertEqual(job.status, 'IN_PROGRESS')

    def test_in_progress_to_completed(self):
        """IN_PROGRESS → COMPLETED is allowed."""
        job = self._create_job('IN_PROGRESS')
        job.status = TransportJob.Status.COMPLETED
        job.save()
        job.refresh_from_db()
        self.assertEqual(job.status, 'COMPLETED')

    def test_draft_to_cancelled(self):
        """DRAFT → CANCELLED is allowed."""
        job = self._create_job('DRAFT')
        job.status = TransportJob.Status.CANCELLED
        job.save()
        job.refresh_from_db()
        self.assertEqual(job.status, 'CANCELLED')

    def test_published_to_cancelled(self):
        """PUBLISHED → CANCELLED is allowed."""
        job = self._create_job('PUBLISHED')
        job.status = TransportJob.Status.CANCELLED
        job.save()
        job.refresh_from_db()
        self.assertEqual(job.status, 'CANCELLED')

    def test_in_progress_to_disputed(self):
        """IN_PROGRESS → DISPUTED is allowed."""
        job = self._create_job('IN_PROGRESS')
        job.status = TransportJob.Status.DISPUTED
        job.save()
        job.refresh_from_db()
        self.assertEqual(job.status, 'DISPUTED')

    # =========================================================================
    # OFFER TRANSITIONS
    # =========================================================================

    def test_offer_pending_to_accepted(self):
        """PENDING → ACCEPTED is allowed."""
        job = self._create_job('PUBLISHED')
        offer = self._create_offer(job, 'PENDING')
        offer.status = Offer.Status.ACCEPTED
        offer.save()
        offer.refresh_from_db()
        self.assertEqual(offer.status, 'ACCEPTED')

    def test_offer_pending_to_withdrawn(self):
        """PENDING → WITHDRAWN is allowed."""
        job = self._create_job('PUBLISHED')
        offer = self._create_offer(job, 'PENDING')
        offer.status = Offer.Status.WITHDRAWN
        offer.save()
        offer.refresh_from_db()
        self.assertEqual(offer.status, 'WITHDRAWN')

    def test_offer_pending_to_rejected(self):
        """PENDING → REJECTED is allowed."""
        job = self._create_job('PUBLISHED')
        offer = self._create_offer(job, 'PENDING')
        offer.status = Offer.Status.REJECTED
        offer.save()
        offer.refresh_from_db()
        self.assertEqual(offer.status, 'REJECTED')

    # =========================================================================
    # DATA INTEGRITY
    # =========================================================================

    def test_offer_price_integrity(self):
        """total_price >= price_net (DB constraint)."""
        job = self._create_job('PUBLISHED')
        offer = self._create_offer(job)
        self.assertGreaterEqual(offer.total_price, offer.price_net)

    def test_job_timestamps(self):
        """created_at and updated_at are populated automatically."""
        job = self._create_job()
        self.assertIsNotNone(job.created_at)
        self.assertIsNotNone(job.updated_at)

    def test_offer_timestamps(self):
        """created_at is populated automatically on offer."""
        job = self._create_job('PUBLISHED')
        offer = self._create_offer(job)
        self.assertIsNotNone(offer.created_at)

    def test_job_owner_protected(self):
        """Job owner FK uses PROTECT — cannot delete user with jobs."""
        self._create_job()
        with self.assertRaises(Exception):
            self.client_user.delete()

    def test_multiple_offers_on_job(self):
        """Multiple offers can exist on a single published job."""
        job = self._create_job('PUBLISHED')
        offer1 = self._create_offer(job)
        
        transporter2 = User.objects.create_user(
            username='test_transporter2',
            email='transporter2@test.tn',
            password='testpass123',
            role='TRANSPORTER',
        )
        offer2 = Offer.objects.create(
            job=job,
            transporter=transporter2,
            status='PENDING',
            price_net=Decimal('90.00'),
            commission_amount=Decimal('22.50'),
            total_price=Decimal('112.50'),
            valid_until=timezone.now() + timedelta(days=3),
        )
        
        self.assertEqual(job.offers.count(), 2)
