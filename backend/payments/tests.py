"""
Payments Module Tests — Sprint D Fondamentaux
Model-level tests for CommissionLedger, EscrowTransaction, and Booking.
Strictly additive: fills the empty tests.py stub.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import IntegrityError
from datetime import timedelta
from decimal import Decimal

from payments.models import CommissionLedger, EscrowTransaction, Booking
from logistics.models import TransportJob, Offer

User = get_user_model()


class PaymentsTestBase(TestCase):
    """Shared setup for payment tests."""

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='pay_client',
            email='payclient@test.tn',
            password='SecurePass123!',
            role='CLIENT',
        )
        self.transporter_user = User.objects.create_user(
            username='pay_transporter',
            email='paytransporter@test.tn',
            password='SecurePass123!',
            role='TRANSPORTER',
        )
        self.job = TransportJob.objects.create(
            owner=self.client_user,
            status='PUBLISHED',
            job_type='TRANSPORT',
            pickup_address='Tunis Centre',
            pickup_lat=Decimal('36.8065'),
            pickup_lng=Decimal('10.1815'),
            dropoff_address='Sousse Ville',
            dropoff_lat=Decimal('35.8256'),
            dropoff_lng=Decimal('10.6369'),
            scheduled_time=timezone.now() + timedelta(days=1),
        )
        self.offer = Offer.objects.create(
            job=self.job,
            transporter=self.transporter_user,
            status='ACCEPTED',
            price_net=Decimal('80.00'),
            commission_amount=Decimal('20.00'),
            total_price=Decimal('100.00'),
            valid_until=timezone.now() + timedelta(days=3),
        )


class CommissionLedgerTests(PaymentsTestBase):
    """Tests for the CommissionLedger model."""

    def test_create_commission_entry(self):
        """Can create a commission ledger entry."""
        entry = CommissionLedger.objects.create(
            transporter=self.transporter_user,
            job_reference=self.job,
            amount=Decimal('20.00'),
        )
        self.assertFalse(entry.is_settled)
        self.assertEqual(entry.amount, Decimal('20.00'))
        self.assertIsNotNone(entry.created_at)
        self.assertIsNone(entry.settled_at)

    def test_commission_str(self):
        """CommissionLedger __str__ includes transporter and amount."""
        entry = CommissionLedger.objects.create(
            transporter=self.transporter_user,
            job_reference=self.job,
            amount=Decimal('15.50'),
        )
        self.assertIn('15.50', str(entry))

    def test_commission_settlement(self):
        """Can mark a commission as settled."""
        entry = CommissionLedger.objects.create(
            transporter=self.transporter_user,
            job_reference=self.job,
            amount=Decimal('20.00'),
        )
        entry.is_settled = True
        entry.settled_at = timezone.now()
        entry.save()
        entry.refresh_from_db()
        self.assertTrue(entry.is_settled)
        self.assertIsNotNone(entry.settled_at)

    def test_commission_one_per_job(self):
        """OneToOneField prevents duplicate commission per job."""
        CommissionLedger.objects.create(
            transporter=self.transporter_user,
            job_reference=self.job,
            amount=Decimal('20.00'),
        )
        with self.assertRaises(IntegrityError):
            CommissionLedger.objects.create(
                transporter=self.transporter_user,
                job_reference=self.job,
                amount=Decimal('10.00'),
            )


class EscrowTransactionTests(PaymentsTestBase):
    """Tests for the EscrowTransaction model state machine."""

    def test_create_escrow_default_initiated(self):
        """New escrow transaction defaults to INITIATED."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            amount=Decimal('100.00'),
        )
        self.assertEqual(escrow.status, 'INITIATED')
        self.assertIsNotNone(escrow.created_at)

    def test_escrow_initiated_to_held(self):
        """INITIATED → HELD is a valid transition."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            amount=Decimal('100.00'),
        )
        escrow.status = EscrowTransaction.Status.HELD
        escrow.save()
        escrow.refresh_from_db()
        self.assertEqual(escrow.status, 'HELD')

    def test_escrow_held_to_released(self):
        """HELD → RELEASED is a valid transition."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            status='HELD',
            amount=Decimal('100.00'),
        )
        escrow.status = EscrowTransaction.Status.RELEASED
        escrow.save()
        escrow.refresh_from_db()
        self.assertEqual(escrow.status, 'RELEASED')

    def test_escrow_held_to_refunded(self):
        """HELD → REFUNDED is a valid transition."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            status='HELD',
            amount=Decimal('100.00'),
        )
        escrow.status = EscrowTransaction.Status.REFUNDED
        escrow.save()
        escrow.refresh_from_db()
        self.assertEqual(escrow.status, 'REFUNDED')

    def test_escrow_str_includes_status_amount(self):
        """EscrowTransaction __str__ includes status and amount."""
        escrow = EscrowTransaction.objects.create(
            booking_reference=self.job,
            amount=Decimal('250.00'),
        )
        s = str(escrow)
        self.assertIn('INITIATED', s)
        self.assertIn('250.00', s)


class BookingTests(PaymentsTestBase):
    """Tests for the Booking model."""

    def test_create_booking_digital(self):
        """Can create a digital payment booking."""
        booking = Booking.objects.create(
            job=self.job,
            accepted_offer=self.offer,
            final_price=Decimal('100.00'),
            commission_rate=Decimal('0.1500'),
            payment_method='DIGITAL',
        )
        self.assertEqual(booking.payment_method, 'DIGITAL')
        self.assertEqual(booking.final_price, Decimal('100.00'))
        self.assertIsNotNone(booking.created_at)

    def test_create_booking_cod(self):
        """Can create a COD payment booking."""
        booking = Booking.objects.create(
            job=self.job,
            accepted_offer=self.offer,
            final_price=Decimal('80.00'),
            commission_rate=Decimal('0.2000'),
            payment_method='COD',
            cod_allowed=True,
        )
        self.assertEqual(booking.payment_method, 'COD')
        self.assertTrue(booking.cod_allowed)

    def test_booking_one_per_job(self):
        """OneToOneField prevents duplicate bookings per job."""
        Booking.objects.create(
            job=self.job,
            accepted_offer=self.offer,
            final_price=Decimal('100.00'),
            commission_rate=Decimal('0.1500'),
        )
        # Need a different offer for the second booking attempt
        offer2 = Offer.objects.create(
            job=self.job,
            transporter=self.transporter_user,
            status='PENDING',
            price_net=Decimal('90.00'),
            commission_amount=Decimal('10.00'),
            total_price=Decimal('100.00'),
            valid_until=timezone.now() + timedelta(days=3),
        )
        with self.assertRaises(IntegrityError):
            Booking.objects.create(
                job=self.job,
                accepted_offer=offer2,
                final_price=Decimal('100.00'),
                commission_rate=Decimal('0.1500'),
            )
